---
title: "大模型训练推理GPU实践"
permalink: /kb/os/GPU/13-大模型训练推理GPU实践/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU性能分析与Profiling工具", link: /kb/os/GPU/12-GPU性能分析与Profiling工具/ }
next: { text: "GPU故障排查与问题定位", link: /kb/os/GPU/14-GPU故障排查与问题定位/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
本章回答：**一个 LLM 到底吃多少显存？怎么在 N 张卡上把它训起来、部署出去？** 学完你会：用手算公式估算任意模型的训练/推理显存需求，看懂并配置数据并行/张量并行/流水线并行/ZeRO/FSDP，理解 NCCL 集合通信与 Ring AllReduce 的带宽模型，能讲清 vLLM 的 PagedAttention 与 continuous batching，并独立完成"选卡 → 量化 → 多卡切分 → 部署压测"的完整落地流程。
:::

前置基础：[GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/)、[GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)、[GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)、[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)。性能剖析工具见 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)。

## 1. LLM 为什么"吃"显存：五类开销

训练一个大模型时，显存里同时住着五类东西；推理时只剩两类（权重 + KV Cache）。

| 开销项 | 训练 | 推理 | 说明 |
|---|---|---|---|
| 参数（权重） | ✅ | ✅ | 模型本体，训练时还要保留 FP32 主副本 |
| 梯度 | ✅ | ❌ | 反向传播产生，与权重同尺寸 |
| 优化器状态 | ✅ | ❌ | Adam 的两份动量 m/v + FP32 主权重 |
| 激活值 | ✅ | ❌（无反向） | 前向中间结果，反向要重算依赖 |
| KV Cache | ❌ | ✅ | 自回归解码缓存的 K/V 矩阵，随序列增长 |

::: important 训练 vs 推理的显存结构完全不同
训练是"权重+梯度+优化器"三件套主导（**静态、与参数量成正比**）；推理是"权重 + KV Cache"主导（**动态、与 batch×序列长度成正比**）。所以训练拼的是"装得下参数"，推理拼的是"塞得进并发请求"——这决定了二者完全不同的选卡逻辑。
:::

### 1.1 五类开销逐一解释

- **参数（权重）**：模型的可学习参数。FP16 存储下每参数 2 字节，7B 模型权重 = 14GB。
- **梯度**：反向传播算出、与权重形状一致，同样每参数 2 字节（混合精度下）。逐层算完、用于更新后即释放，但峰值时必须与权重共存。
- **优化器状态（Adam）**：Adam 需要保存 FP32 主权重（4B）、一阶动量 m（4B）、二阶动量 v（4B），**每参数 12 字节**，是训练显存的"大头"。
- **激活值**：前向传播每层算出的中间张量。与 batch×序列长度×hidden 成正比，长序列大 batch 下极其可观，是"吃掉剩余显存"的变量。
- **KV Cache**：解码时把历史 token 的 K、V 投影缓存下来，避免每步重算。**每 token 每层 2×hidden×字节数**，随序列长度线性增长，是推理显存的"大头"。

::: tip 记一个比例
混合精度训练 7B 模型，权重:梯度:优化器 ≈ 2:2:12（单位：字节/参数）——**优化器状态占了 75%**。这就是为什么 ZeRO 系列先拿优化器状态开刀（见 §4.7）。
:::

## 2. 显存估算：会算才能选卡

### 2.1 经验法则

- **1B 参数 ≈ 2GB（FP16/BF16）**；FP32 翻倍（4GB）。
- 量化因子：**INT8 每参数 1B（1B 参数 ≈ 1GB）**，**INT4 每参数 0.5B（1B 参数 ≈ 0.5GB）**。

### 2.2 训练显存公式

```
训练显存 ≈ 权重 + 梯度 + 优化器状态 + 激活值
混合精度(AMP)：每参数 2 + 2 + 12 = 16 字节   （权重 FP16 + 梯度 FP16 + Adam 的 FP32 主权重/m/v）
纯 FP32     ：每参数 4 + 4 + 8  = 16 字节   （4 权重 + 4 梯度 + 8 动量）
```

**手算 7B**：7B × 16B = **112GB**，还没算激活值 → 单张 A100 80G 放不下，必须 ZeRO/FSDP 或多卡。
**手算 70B**：70B × 16B = **1120GB** + 激活 → 1120/80 ≈ **14 张 A100 80G 打底**，实战（考虑激活与冗余）要 16~24 卡。

### 2.3 推理显存公式

```
推理显存 ≈ 权重（FP16 或量化后）+ KV Cache + 少量计算缓冲
KV Cache = 2 × layers × hidden_size × batch × seq_len × bytes_per_element
```

**KV Cache 手算**（Llama-2-7B：32 层、hidden 4096、FP16）：

```
每 token 每序列：2 × 32 × 4096 × 2B = 512KB
batch=1,  seq=2048  → 1GB
batch=32, seq=4096  → 512KB × 32 × 4096 = 64GB   ← 一个 batch 就吃掉 64GB！
```

**70B 更夸张**（80 层、hidden 8192）：每 token 每序列 2.5MB；batch=32、seq=4096 时 **KV Cache 约 320GB**，超过权重本身（140GB）。KV Cache 正是 PagedAttention 要解决的问题（§7.2）。

### 2.4 综合实例：7B / 70B 部署要多少卡

| 模型 | 精度 | 权重 | 典型 KV Cache | 合计 | 结论 |
|---|---|---|---|---|---|
| 7B | FP16 | 14GB | ~1GB（bs1/seq2k） | ~15GB | 单张 A10/L4（24GB）可跑 |
| 7B | INT4 | 3.5GB | ~1GB | ~5GB | 笔记本/边缘卡都能跑 |
| 70B | FP16 | 140GB | ~5GB | ~145GB | 2×A100 80G（TP2）或 8×A10 |
| 70B | INT4 | 35GB | ~5GB | ~40GB | 1 张 A100 80G / 2×L40S 可跑 |
| 70B 训练 | BF16 | — | — | 1120GB+ | ≥16×A100/H100 + ZeRO-3 |

::: warning 估算永远留余量
上面的公式是"裸模型"下限。真实部署还有 CUDA context、PyTorch 缓存池、计算图临时缓冲等开销，**请按估算值的 1.2~1.5 倍选卡**，并配合 `--gpu-memory-utilization 0.9`（vLLM）预留显存。
:::

## 3. 混合精度训练：FP16 / BF16 / TF32

训练用 FP32 太慢且占显存，纯 FP16 又容易溢出/下溢，于是有了混合精度（AMP, Automatic Mixed Precision）：**权重和计算用低精度，优化器状态和主权重保留 FP32**。

| 格式 | 指数位 | 尾数位 | 特点 |
|---|---|---|---|
| FP32 | 8 | 23 | 精度基准，速度慢、显存大 |
| FP16 | 5 | 10 | 范围小（±65504），易溢出；**需 loss scaling** |
| BF16 | 8 | 7 | 与 FP32 同指数范围，不易溢出；**训练更稳**，主流新卡首选 |
| TF32 | 8 | 10 | A100+ 用于"假装 FP32"的加速模式，精度略降 |

- **loss scaling**：FP16 下梯度容易下溢到 0（小于最小正规数）。做法是把 loss 乘一个大数（如 65536）再 backward，更新前再除回来，由 `GradScaler` 自动完成（检测到 inf/NaN 会跳过该步并降低 scale）。
- **为什么 BF16 更稳**：FP16 只有 5 位指数，一旦数值超过 ±65504 就变 inf；BF16 有 8 位指数（和 FP32 一样），动态范围相同，只是尾数少 3 位——而训练对尾数精度不敏感，对范围敏感，所以 BF16 几乎不需要 loss scaling。代价是 BF16 乘法精度略低，但 LLM 训练实践已证明完全够用。

```python
import torch
# PyTorch 2.x 推荐写法（torch.cuda.amp 是旧名，功能一致）
scaler = torch.amp.GradScaler("cuda")
for x, y in loader:
    optimizer.zero_grad()
    with torch.amp.autocast("cuda"):      # FP16/BF16 自动选择，BF16 需设备支持
        loss = model(x, y)
    scaler.scale(loss).backward()
    scaler.step(optimizer)                 # 内部处理 unscaling + 跳过 inf
    scaler.update()
```

::: note TF32 的适用场景
不需要 BF16 的新卡（或必须跑 FP32 语义）时，可用 TF32 加速矩阵乘：`torch.backends.cuda.matmul.allow_tf32 = True`。精度介于 FP32 与 FP16 之间，A100 及以后 Tensor Core 原生支持，训练收敛影响通常可接受。
:::

## 4. 分布式训练并行策略（重点）

并行策略的本质是回答两个问题：**显存不够往哪儿摊？通信量多大能接受？**

### 4.1 数据并行 DP / DDP

每卡一份完整模型副本，喂不同的数据，各自算梯度后 **allreduce 平均梯度**再同步更新。

- 特点：实现最简单，通信量 = 每步全量梯度 allreduce（7B ≈ 14GB/步）。
- 局限：**单卡放不下模型就没法用**（每卡都要完整权重+优化器）。
- DDP（`torch.nn.parallel.DistributedDataParallel`）是现代标准实现，比老式 DP 快（梯度在 backward 中异步 allreduce）。

### 4.2 张量并行 TP（Megatron-LM 式）

把**单层内部**的矩阵按维度切开，分到多卡同时算：

```text
        输入 X (b, s, h)
              │
   ┌──────────┼──────────┐
   │ QKV 投影按 head 切    │       每卡负责一部分 head
   ├──────────┼──────────┤
   │ MLP: 第一层按列切(W1) │       列并行：每卡算部分列
   │      第二层按行切(W2) │       行并行：结果 allreduce 合并
   └──────────┼──────────┘
              ▼
         输出 = 各卡部分和（allreduce）
```

- 特点：**显存按 TP 规模线性摊薄**，但每层都有多次 allreduce（高频小消息），**必须走 NVLink/NVSwitch**，跨机 TP 性能很差。
- 典型用法：单机 8 卡 TP8 或 TP4；Megatron-LM / vLLM / DeepSpeed 都支持。

### 4.3 流水线并行 PP

把模型**按层切成 P 段**，每段放一张卡，数据切成 micro-batch 依次流过各段：

```text
micro-batch: m0 m1 m2 m3 m4 m5 m6 m7
Stage 0:  f0 f1 f2 f3 f4 f5 f6 f7
Stage 1:     f0 f1 f2 f3 f4 f5 f6 f7
Stage 2:        f0 f1 f2 f3 f4 f5 f6 f7
                  ↑
           气泡(bubble)：切流水线时后面卡的等待空隙
```

- 通信：只在相邻段边界传递激活/梯度（p2p），**跨机友好**。
- **气泡比例 ≈ (P-1)/(M+P-1)**（P 段、M 个 micro-batch）：段数越多、micro-batch 越少，气泡越大；micro-batch 越多气泡越小但显存越大。
- 进阶：**1F1B（one-forward-one-backward）调度**交错前向/后向，只保留当前 micro-batch 的激活，激活显存可降约 1/P，是 Megatron/DeepSpeed 的默认调度。

### 4.4 专家并行（MoE）

混合专家模型中，把不同专家（FFN）分到不同卡，token 通过 **all-to-all** 路由到专家所在的卡，算完再路由回来。显存随专家数扩展，但 all-to-all 通信量大，且存在负载不均（热门专家拥塞）问题。

### 4.5 序列并行 SP

把序列维度切开。Megatron 的序列并行把 LayerNorm/Dropout 等"非矩阵运算"部分按序列切分，配合 TP 进一步压激活显存；长上下文训练（如 128K）基本必开。

### 4.6 并行策略对比表

| 策略 | 显存摊薄对象 | 通信频率/量 | 跨机友好 | 一句话 |
|---|---|---|---|---|
| DP/DDP | 无（每卡整份） | 低频、大量（全梯度） | ✅ | 最简单，但吃不下模型就没戏 |
| TP | 权重/激活（层内切） | 高频、小消息 | ❌ | 必须 NVLink，单机内首选 |
| PP | 权重/激活（按层切） | 低频、边界传输 | ✅ | 跨机友好，有气泡 |
| SP | 激活（序列切） | 与 TP 配套 | ❌ | 省激活显存 |
| MoE EP | 专家 | all-to-all 大流量 | ✅ | 只适用 MoE 模型 |

### 4.7 ZeRO 系列与 FSDP：不做切分也能省

ZeRO（DeepSpeed）的洞察：DDP 每卡都存了完整的优化器状态+梯度+参数，但**每一步其实只用得上自己那份**。于是按 DP 维度把三者分片：

| 阶段 | 分片内容 | 相对 DDP 显存 | 通信量 |
|---|---|---|---|
| ZeRO-1 | 优化器状态 | 约 1/4（省 12B/参数中的 9B） | 与 DDP 相当 |
| ZeRO-2 | 优化器状态 + 梯度 | 约 1/8 | 与 DDP 相当 |
| ZeRO-3 | 优化器状态 + 梯度 + 参数 | 随卡数线性下降 | **增加**（每层参数要 allgather） |

::: tip ZeRO 省钱但不免费
ZeRO-3 每层前向都要把该层参数 allgather 回来、算完即弃，通信量比 DDP 高一个量级，所以 ZeRO-3 通常配合"梯度累积 + 通信计算重叠"使用。**省钱顺序永远是：优化器 → 梯度 → 参数**（ZeRO-1/2/3）。
:::

**FSDP（Fully Sharded Data Parallel）**是 PyTorch 原生实现，等价 ZeRO：

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP
from torch.distributed.fsdp import ShardingStrategy
model = FSDP(model, sharding_strategy=ShardingStrategy.FULL_SHARD,   # ZeRO-3
             cpu_offload=CPUOffload(offload_params=True))
# 其他策略：SHARD_GRAD_OP(≈ZeRO-2)、NO_SHARD(≈DDP)
```

**DeepSpeed** 是微软的优化引擎，`--deepspeed ds_config.json` 一行接入：

```json
{
  "zero_optimization": { "stage": 3, "offload_optimizer": { "device": "cpu" } },
  "train_batch_size": 256, "gradient_accumulation_steps": 8
}
```

### 4.8 组合示例：TP4 × PP2 × DP4 的 3D 并行

32 卡（4 机 × 8 卡）上：

```text
     DP4 副本（4 份）
┌─────────┬─────────┬─────────┬─────────┐
│ PP2 段0 │ PP2 段0 │ PP2 段0 │ PP2 段0 │   ← 每份内：8 卡
│ TP4     │ TP4     │ TP4     │ TP4     │      段0: 卡0-3, 段1: 卡4-7
│ PP2 段1 │ PP2 段1 │ PP2 段1 │ PP2 段1 │
└─────────┴─────────┴─────────┴─────────┘
```

- **TP=4**：单机内 4 卡走 NVLink（每层多次小 allreduce）；
- **PP=2**：两个流水段之间只传边界激活（p2p，跨机可接受）；
- **DP=4**：4 份副本之间每步一次大 allreduce（梯度），跨机走 IB/RoCE。
- 这是 Megatron 3D 并行（也叫 4D，含 SP）的标准拼法：**"TP 锁单机、PP 跨机、DP 兜底"**。

## 5. NCCL 集合通信（重点）

### 5.1 NCCL 是什么

NCCL（NVIDIA Collective Communications Library）是多卡/多机**集合通信**库，PyTorch DDP、Megatron、DeepSpeed、vLLM TP 全部建立在它之上。常用集合操作：

| 操作 | 语义 | 典型用途 |
|---|---|---|
| allreduce | 所有卡数据求和后**广播给所有人** | DDP 梯度平均 |
| allgather | 每卡的私有数据**汇总分发**给所有人 | ZeRO-3 参数收集、TP 结果合并 |
| reduce-scatter | 先归约再**按卡分片** | ZeRO-2/3 梯度分片 |
| p2p (send/recv) | 点对点传输 | PP 的段间激活传递 |
| broadcast / reduce | 单源广播 / 单目标归约 | 初始化、checkpoint 同步 |

### 5.2 Ring AllReduce 原理与带宽公式

Ring AllReduce 把 N 张卡连成环，分两阶段：**reduce-scatter**（每卡收齐自己负责的 1/N 分片和）→ **allgather**（每卡把分片广播给所有人）。每一步每卡只与左右邻居通信一次：

```text
        卡0 ──── 卡1
         │  ↑      │
         ↓  │      ↓
        卡3 ──── 卡2
   (数据沿环单向流动，每卡同时收发)
```

**有效带宽公式**：`allreduce 有效带宽 ≈ 2(N-1)/N × 单链路带宽`

- N 越大越接近 2 倍单链路带宽（收发同时进行）；N=8、NVLink 单链路 50GB/s → 有效 ≈ 87.5GB/s。
- allgather / reduce-scatter 单独为 `(N-1)/N × B`。
- 结论：**Ring 的带宽与卡数基本无关（弱缩放），但延迟随卡数增加**；小消息场景会用 Tree 算法（log 深度）替代。

### 5.3 通信拓扑

| 层级 | 硬件 | 特征 |
|---|---|---|
| 节点内 | NVLink（环/全互联） | 900GB/s 级聚合（H100），P2P 直通显存 |
| 节点内 | NVSwitch（DGX/HGX） | 8 卡全互联，任意两卡全带宽 |
| 跨节点 | InfiniBand（HDR 200G / NDR 400G） | RDMA，训练集群标配 |
| 跨节点 | RoCE（以太网 RDMA） | 25/100/200G 以太网上的 RDMA，性价比方案 |
| 跨节点 | 普通 TCP 以太网 | 只能跑小规模/容错兜底 |

**GPUDirect RDMA**：IB 网卡直接读写 GPU 显存（peer mapping），绕过 CPU 内存中转，是跨节点通信带宽达标的前提。

### 5.4 关键环境变量

```bash
export NCCL_DEBUG=INFO            # 建连/拓扑调试，出问题先开它
export NCCL_SOCKET_IFNAME=eth0    # 指定 TCP 通信网卡（多网卡机器必配）
export NCCL_IB_DISABLE=0          # 1=禁用 InfiniBand，走 TCP
export NCCL_P2P_LEVEL=NVL          # P2P 允许级别：PHB(PCIe)/SYS/NVL(NVLink)/NET
export NCCL_IB_GID_INDEX=3         # RoCE 环境下常见必配项
```

### 5.5 验证带宽：nccl-tests

```bash
git clone https://github.com/NVIDIA/nccl-tests && cd nccl-tests
make CUDA_HOME=/usr/local/cuda
./build/all_reduce_perf -b 128M -e 8G -f 2 -g 8
# 输出关注 busbw 列：8 卡 H100 单机应 >700GB/s 量级（接近理论）
```

::: important 训练集群网络红线
千兆以太网（1Gbps≈125MB/s）无法训练大模型：7B 每步梯度约 14GB，一次 allreduce 就要 112 秒。**多机训练至少 25/40/100G 以太网或 IB/RoCE**，并且必须实测 nccl-tests 通过后再上训练任务。
:::

## 6. 训练优化技巧：显存不够时的组合拳

| 技巧 | 原理 | 代价 | 用法 |
|---|---|---|---|
| 梯度累积 | 小 batch 多步累加梯度，等效大 batch | 训练步数变多、速度略降 | `gradient_accumulation_steps=8` |
| 激活重计算（checkpointing） | 前向不存全部激活，反向重算 | 多约 30% 计算 | `model.gradient_checkpointing_enable()` |
| CPU offload | 优化器状态/参数放 CPU 内存 | 大量 CPU↔GPU 传输，速度大降 | DeepSpeed `offload_optimizer/offload_param` |
| 序列并行 SP | 激活按序列切分（见 §4.5） | 需 TP 配合 | Megatron/DeepSpeed 配置 |
| FlashAttention | 见下 | 无（更快更省） | 换模型实现即可 |

**FlashAttention 原理（一句话版）**：它是 **IO 感知**的 attention——把 QKV 切成小块读进 SRAM，用**分块 softmax（online softmax，带重缩放）**在不落盘完整 N×N 中间矩阵的情况下算出结果。效果：**显存从 O(N²) 降到 O(N)，同时更快**（HBM 读写大幅减少）。V2 精简了非矩阵运算，V3 针对 Hopper 用 TMA/wgmma 优化，已是 Llama/DeepSeek 等模型的标配。

## 7. 推理优化

### 7.1 Batching：吞吐与延迟的权衡

- 静态 batching：固定 batch 等最慢的请求，GPU 空转浪费。
- **Continuous / Dynamic batching**：每个 iteration 级动态调度——一个请求完成立即释放 slot、插入新请求，GPU 永远满负荷。**batch 越大吞吐越高，但单请求延迟（尤其 TTFT）越高**，服务要按 SLO 找平衡点。

### 7.2 KV Cache 管理：PagedAttention 与 vLLM

KV Cache 是变长内存（随序列增长），传统方案要预分配最大长度 → **内部碎片 + 浪费**。**PagedAttention**（vLLM 提出）借鉴操作系统分页：把 KV Cache 切成固定大小 block（如 16 token/块），用**页表**管理，虚拟连续、物理离散、按需分配，还支持 copy-on-write（beam search / 前缀共享）。

```text
传统：|======= 预分配最大长度 =======|   ← 大部分空闲浪费
PagedAttention：
 逻辑序列: [t0..t15][t16..t31][t32..t47]...
 物理块:   块7   块3   块19   ← 页表映射，物理不连续，按需分配
```

vLLM 同时实现 continuous batching + PagedAttention，是当前**吞吐量**最强的开源推理引擎。

### 7.3 TensorRT-LLM

NVIDIA 官方推理引擎：把模型**编译成 TensorRT engine**（算子融合、内核自动选择、FP8 KV Cache、in-flight batching），延迟最优、显存效率高；代价是构建 engine 耗时、只支持 NVIDIA 卡、新模型适配周期长。适合延迟敏感的高端场景。

### 7.4 量化：用精度换显存与速度

| 格式 | 每参数 | 7B 权重 | 70B 权重 | 精度影响 |
|---|---|---|---|---|
| FP16/BF16 | 2B | 14GB | 140GB | 基准 |
| FP8 | 1B | 7GB | 70GB | 很小（需校准） |
| INT8 | 1B | 7GB | 70GB | 较小（GPTQ/AWQ） |
| INT4 | 0.5B | 3.5GB | 35GB | 可感知，多数任务可用 |

- **GPTQ（一句话）**：逐层、基于近似二阶信息（Hessian）最小化量化误差的**训练后量化**（PTQ），无需微调。
- **AWQ（一句话）**：根据**激活值幅度**识别"重要通道"，给重要通道保留高精度、其余量化，同样无需重训练。
- 量化收益：显存减半/减四、吞吐提升、还能用更小的卡；风险：长上下文/推理链路（如数学、代码）质量下降，**上线前必须用评测集验证**。

**投机解码（一句话）**：小模型（draft）先快速猜出 N 个 token，大模型一次并行验证，接受则一步吐出多个 token——单请求延迟显著下降，常用于延迟敏感服务。

### 7.5 推理框架对比

| 框架 | 核心卖点 | 适用场景 |
|---|---|---|
| vLLM | PagedAttention + continuous batching，吞吐之王 | **在线服务首选** |
| TensorRT-LLM | 编译引擎，延迟最低 | 延迟敏感、NVIDIA 专栈 |
| SGLang | RadixAttention 前缀复用、结构化输出 | 多轮对话 / agent / 前缀长复用 |
| TGI | HuggingFace 出品、生态整合好 | 快速接入 HF 生态 |
| llama.cpp | GGUF 量化、CPU/边缘可跑 | 本地 / 边缘 / 个人部署 |

## 8. 部署落地流程

```text
模型选型(精度) → 显存估算(权重+KV) → 单卡能否装下?
   ├─ 能 → 直接 vLLM 启动
   └─ 不能 → TP 切分(--tensor-parallel-size N) → vLLM 启动 → 压测 → 调参
```

```bash
# 以 70B INT4 部署在 2 卡为例
vllm serve Qwen/Qwen2.5-70B-Instruct-GPTQ-Int4 \
  --tensor-parallel-size 2 \
  --gpu-memory-utilization 0.9 \
  --max-model-len 8192 \
  --dtype float16

# 压测（吞吐与延迟）
python vllm/benchmarks/benchmark_serving.py \
  --backend vllm --model Qwen/Qwen2.5-70B-Instruct-GPTQ-Int4 \
  --num-prompts 1000 --request-rate 20
```

关键参数含义：`--tensor-parallel-size`（TP 卡数，需同机 NVLink）；`--gpu-memory-utilization`（给 KV Cache 预留的显存比例，0.9 表示 90% 给模型+缓存）；`--max-model-len`（上下文上限，越大 KV 越占显存）；`--dtype`（模型权重精度，须与量化格式匹配）。

压测必看指标：**总吞吐（output tokens/s）**、**TTFT（首 token 延迟）**、**TPOT / inter-token latency（每 token 延迟）**。调参顺序：先测单卡最大 batch（`--max-num-seqs`）→ 再调 `--gpu-memory-utilization` 与 `--max-model-len` 的平衡。

## 9. 选卡指南

| 维度 | 训练 | 推理 |
|---|---|---|
| 核心需求 | 显存容量 + **带宽** + 算力 + **互联** | 性价比 + 吞吐/延迟 + 显存容量 |
| 主力卡 | H100 SXM（80GB HBM3、3.35TB/s、BF16 ~989 TFLOPS）| A10/L4（24GB）、L40S（48GB），配 INT4/INT8 量化 |
| 次选 | A100 80G（2.0TB/s、BF16 312 TFLOPS） | A100/H100（高并发在线）、消费卡（本地实验） |
| 决定因素 | 每步通信量（NVLink/IB）、训练吞吐 | **$/token**、显存能否装下权重+KV |
| 一句话 | 带宽和互联决定训练快慢 | 显存决定能开多大 batch，量化决定能上多小的卡 |

::: tip 练习建议
自己动手：拿一个开源模型（如 Qwen2.5-7B），用 §2 公式估算训练/推理显存 → 在 A10/L4 上用 vLLM 部署 → 跑 benchmark_serving 记录吞吐，再量化成 INT4 对比数字。部署环境搭建参考 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)，性能瓶颈分析参考 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)。
:::

## 10. 自测题

**1.（手算）一个 7B 模型用混合精度（AMP）训练，权重+梯度+优化器至少多少显存？用 70B 呢？**
答：AMP 下每参数 16B（2 权重 + 2 梯度 + 12 Adam 状态）。7B → 112GB，单张 A100 80G 放不下；70B → 1120GB，约 14 张 80G 打底（含激活与冗余需 16+ 卡），必须 ZeRO/FSDP。

**2.（手算）某 8B 模型 32 层、hidden 4096、FP16，batch=16、seq=2048 时 KV Cache 多大？**
答：每 token 每序列 2×32×4096×2B = 512KB；16×2048 = 32768 token → 512KB × 32768 = **16GB**。公式：2 × layers × hidden × batch × seq × bytes。

**3. Ring AllReduce 的有效带宽公式是什么？8 卡、单链路 50GB/s 时 allreduce 有效带宽多少？**
答：`2(N-1)/N × B`（N 卡、单链路带宽 B）。8 卡：2×7/8×50 = **87.5GB/s**。allgather/reduce-scatter 单独为 (N-1)/N × B。

**4. 为什么 BF16 比 FP16 更适合大模型训练？**
答：BF16 指数位 8（与 FP32 相同），动态范围大、不易溢出，几乎不需要 loss scaling；FP16 只有 5 位指数，超过 ±65504 即 inf，梯度下溢需 GradScaler。训练对尾数精度不敏感、对范围敏感，所以 BF16 更稳。

**5. ZeRO-1/2/3 分别分片什么？FSDP 的 FULL_SHARD 对应哪个阶段？**
答：ZeRO-1 分片优化器状态，ZeRO-2 加梯度，ZeRO-3 再加参数（通信量显著增加）。FSDP `FULL_SHARD` = ZeRO-3；`SHARD_GRAD_OP` = ZeRO-2；`NO_SHARD` = DDP。

**6.（选择）TP 切分时，QKV 投影按什么维度切？MLP 两层分别怎么切？**
答：QKV 按 **head 维度**切（每卡若干 head）；MLP 第一层按**列**切（列并行）、第二层按**行**切（行并行），输出用 allreduce 合并。答案：B（head 维度 + 列/行）。

**7. 流水线并行气泡比例公式？p=4 段、m=8 个 micro-batch 时气泡多大？**
答：气泡 ≈ (P-1)/(M+P-1)。p=4、m=8 → 3/11 ≈ **27%**。micro-batch 越多气泡越小（但激活显存越大），1F1B 调度可显著省激活显存。

**8. PagedAttention 解决了什么问题？原理是什么？**
答：解决 KV Cache 的**预分配碎片浪费**与**无法按需增长**。原理：KV Cache 切成固定 block，用页表映射（虚拟连续、物理离散），按需分配、支持 copy-on-write 共享；配合 continuous batching 提升吞吐。

**9. 70B 模型 FP16 与 INT4 部署各需多少显存、怎么选卡？**
答：FP16 权重 140GB + KV → 需 2×A100 80G（TP2）或 8×A10；INT4 权重 35GB + KV → 1 张 A100 80G 或 2×L40S 即可。选卡权衡：显存余量 vs 量化精度损失（上线前评测验证）。

**10. vLLM 的 `--tensor-parallel-size`、`--gpu-memory-utilization`、`--max-model-len` 分别影响什么？**
答：TP 卡数（决定显存摊薄与通信量，需同机 NVLink）；显存利用率（0.9 = 90% 显存给模型+KV Cache，比例越高能开越大 batch，但留余量防 OOM）；最大上下文长度（直接决定 KV Cache 上限与单请求可处理长度）。

::: note 第 6 题提示
想直观理解 TP 切分，可以把一个矩阵乘法 A×B 画出来：按列切 B 就是列并行（结果要 allreduce 拼接），按行切 A 就是行并行。对照 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 的 tiling 思想一起看。
:::

::: tip 引出相关笔记
训练推理跑起来之后，接着学 GPU 出问题怎么排查（[GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)）、多卡集群怎么监控（[GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)）；如果卡是国产的（昇腾/寒武纪/海光），看 [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/)。路线总览回到 [GPU学习路线总览](/kb/os/GPU/00-GPU学习路线总览/)。
:::
