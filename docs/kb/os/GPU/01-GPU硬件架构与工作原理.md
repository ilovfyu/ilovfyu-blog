---
title: "GPU硬件架构与工作原理"
permalink: /kb/os/GPU/01-GPU硬件架构与工作原理/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU学习路线总览", link: /kb/os/GPU/00-GPU学习路线总览/ }
next: { text: "GPU内存体系与访存原理", link: /kb/os/GPU/02-GPU内存体系与访存原理/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
本章回答一个问题：**GPU 芯片上到底有什么？它和 CPU 为什么长得完全不一样？** 从"延迟优先 vs 吞吐优先"的设计哲学讲起，梳理 GPU 二十年发展史，拆解 GPC/TPC/SM 三级芯片结构和 SM 内部部件，追踪一条 Kernel 从 CPU 发起到 SM 执行的数据流，最后学会读一张规格表（FLOPS、带宽、功耗）。学完你能解释"为什么 GPU 是吞吐机器"、"A100 的 19.5 TFLOPS 是怎么算出来的"、"Tensor Core 和 CUDA Core 有什么区别"。
:::

## 1. GPU 与 CPU：两种设计哲学

### 1.1 一个根本分歧：延迟 vs 吞吐

CPU 的设计目标是**让单条指令尽量快**——为此不惜堆分支预测器、乱序执行、多级缓存，把一条访存指令的延迟压到 100ns 以内。GPU 的处境完全不同：它的假设是"同时有成千上万个线程在跑"，单条指令慢一点没关系，**只要整体吞吐高**。所以 GPU 把晶体管预算花在"更多更简单的计算单元"上，而不是"把单个单元做得更快"。

::: important 一句话记住
CPU 是"延迟优化"：单线程越快越好；GPU 是"吞吐优化"：单位时间完成的操作数越多越好。GPU 不怕单条指令慢，怕的是**算力和带宽喂不饱**。
:::

### 1.2 量级对比

| 维度 | CPU（桌面/服务器） | GPU（A100/H100 级别） |
|---|---|---|
| 计算核心 | 8~64 个复杂核心 | 数千~数万（A100 有 6912 个 FP32 单元，RTX 4090 有 16384 个） |
| 频率 | 3~5 GHz | 1.0~2.5 GHz（核心多，频率低） |
| 控制逻辑 | 分支预测、乱序执行、大缓存 | 几乎不做分支预测，靠并行掩盖延迟 |
| 缓存 | 每核私有 L1/L2 + 大 L3（数十 MB） | 每 SM 小 L1 + 全片共享 L2（A100 40MB / H100 50MB） |
| 内存带宽 | 双通道~8 通道 DDR5：50~460 GB/s | HBM/GDDR：1~8 TB/s |
| 内存延迟 | ~80~100 ns | 全局访存数百周期（~300~800 cycles），更高 |
| 功耗 | 65~350 W | 250~1000 W（H100 SXM 700W） |
| 擅长 | 控制流密集、单线程性能敏感 | 数据并行、矩阵/张量密集 |

::: tip 带宽差距是 GPU 的本质特征
一台 8 通道服务器的内存带宽（~400 GB/s）不到 H100（3.35 TB/s）的八分之一。深度学习里"权重矩阵 × 激活"这类操作每字节数据的计算量固定，**带宽直接决定算力能否发挥**，这就是为什么 GPU 要配 HBM——见 [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)。
:::

## 2. GPU 发展简史：从图形加速卡到通用计算

### 2.1 关键里程碑

- **1999 GeForce 256**：集成 T&L（Transform & Lighting，几何变换与光照），首次把图形流水线里最重的固定功能硬件化，NVIDIA 借此提出 "GPU" 一词。
- **2006 G80（GeForce 8800 GTX）**：**统一着色器架构**——顶点着色器和像素着色器不再分家，同一个标量流水线处理两类任务，这是 GPU 走向通用计算的关键一步。
- **2007 Tesla**：G80 的计算版本，配 CUDA 1.0，"GPU 编程"由此进入工程领域。
- **2017 Volta（V100）**：首次引入 **Tensor Core**，把矩阵乘做成硬件指令，深度学习训练速度陡增。
- **2024 Blackwell（B200）**：双 die 封装、FP4 张量算力约 10 PFLOPS（稠密），单卡 HBM3e 192GB、8 TB/s。

### 2.2 代际特性表（数据中心/旗舰线）

| 架构 | 年份 | 代表产品 | 关键特性 |
|---|---|---|---|
| Tesla | 2007 | 早期 Tesla / C870 | CUDA 1.0 首发 |
| Fermi | 2010 | C2050 | 首个完整计算架构：ECC、统一 L2、并发内核执行 |
| Kepler | 2012 | K20X | SMX 大 SM、Hyper-Q（多硬件队列） |
| Maxwell | 2014 | M40 | 能效大幅提升，SM 精简 |
| Pascal | 2016 | P100 | 16nm、NVLink 1.0、统一内存、原生 FP16 |
| Volta | 2017 | V100 | **首个 Tensor Core**、独立线程调度、独立 INT32 单元 |
| Turing | 2018 | RTX 20 系列 / Quadro RTX | **首个 RT Core**（光线追踪）、INT8/INT4 张量指令 |
| Ampere | 2020 | A100 | 第三代 Tensor Core（TF32/BF16）、**MIG 切分**、NVLink 3.0 |
| Hopper | 2022 | H100 | 第四代 Tensor Core（**FP8**）、Transformer Engine、NVLink 4.0、DPX 指令 |
| Blackwell | 2024 | B200 / GB200 | 第五代 Tensor Core（FP4）、第二代 Transformer Engine、NVLink 5.0 |

::: note AMD 与 Intel 的定位
AMD 数据中心走 **CDNA** 系列（MI100 → MI250X → MI300X），主打高显存带宽与 ROCm/HIP 软件栈，兼容 CUDA 生态；Intel 以 **Xe HPC**（Ponte Vecchio）和 Gaudi 加速器切入数据中心 AI。它们的架构思想与 NVIDIA 一致（多计算单元 + 高带宽内存），软件生态差异见 [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/)。
:::

## 3. 芯片结构：从 Die 到 SM

### 3.1 三级层次：GPC / TPC / SM

一块现代 NVIDIA GPU 芯片按"簇"组织，方便复制与布线：

```text
                        GPU Die（以 H100 为例）
┌──────────────────────────────────────────────────┐
│ 8 × GPC（Graphics Processing Cluster，图形处理簇）│
│        │                                          │
│        ├─ 每 GPC 含若干 TPC（Texture Processing   │
│        │    Cluster，纹理处理簇）                 │
│        │     └─ 每个 TPC 含 2 × SM                │
│                                                   │
│ 合计：132 × SM（H100 SXM）   50MB L2（全片共享）   │
│ 周围：HBM3 控制器、NVLink/PCIe 接口、命令前端      │
└──────────────────────────────────────────────────┘
```

- **GPC**：最大的功能簇，包含光栅化等图形单元与若干 TPC。
- **TPC**：纹理处理簇，内含 2 个 SM 和纹理单元。
- **SM（Streaming Multiprocessor，流式多处理器）**：基本计算单元，一个 SM 就是一台"小 GPU"，能独立调度和执行线程。

::: note 数字只是参考
具体数量代际不同：A100 有 108 个 SM（7 个 GPC），H100 SXM 有 132 个 SM（8 个 GPC），满血 die 通常比量产版多几个 SM（如 GH100 满血 144 个）。看规格表认准"启用多少个 SM"即可。
:::

### 3.2 SM 内部组成（以 A100 为例）

```text
                    SM（A100）
┌─────────────────────────────────────────────────────┐
│  4 × Warp Scheduler（线程调度器，每个关联一组执行单元）│
│        │ 每周期可各发射 1 条指令给一个 Warp（32 线程） │
│        ▼                                              │
│  ┌──────────────────────────────────────────────┐    │
│  │ 执行单元分区（4 组）                          │    │
│  │   FP32 单元 ×64（CUDA Core 主体）             │    │
│  │   INT32 单元 ×64                              │    │
│  │   SFU ×32（特殊函数：rsqrt/sin/log 等）       │    │
│  │   LD/ST ×32（访存）                           │    │
│  │   Tensor Core ×4（第 3 代，矩阵乘专用）       │    │
│  └──────────────────────────────────────────────┘    │
│  寄存器堆：256KB（65536 个 32-bit 寄存器）           │
│  共享内存/L1：192KB（可配置，共享最大 164KB）        │
└─────────────────────────────────────────────────────┘
```

每个 SM 的部件分工：

- **CUDA Core（FP32/INT32 单元）**：执行普通标量运算（加减乘、比较、整数运算）。A100 每个 SM 有 64 个 FP32 + 64 个 INT32，官方口径"128 个 CUDA Core"；H100 提升到 128 个 FP32（+64 INT32）。
- **SFU（Special Function Unit）**：执行 `rsqrt`、`sin`、`exp` 等特殊函数，数量少、吞吐约为标量单元的 1/4。
- **Tensor Core**：矩阵乘专用硬件，一条指令完成 4×4 乃至 16×8×16 的矩阵块乘加，精度可配（见第 5 节）。
- **Warp Scheduler**：SM 的"交通警察"，决定下个周期让哪个 Warp 上执行单元（详见 [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)）。
- **寄存器堆 + 共享内存**：SM 上最贵、最快的两级存储，容量直接决定能同时驻留多少线程（占用率，见 [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)）。

## 4. 一条 Kernel 的旅程：数据流

一次 `kernel<<<grid, block>>>(...)` 调用，硬件层面经历：

```text
CPU 端                                    GPU 端
┌──────────────────┐   PCIe/NVLink-C2C   ┌────────────────────────────┐
│ 应用程序          │                     │ GPU 前端（Front-end）       │
│  CUDA API         │───命令缓冲/队列───► │  ├─ 命令处理器（复制/解包） │
│  UMD 驱动 ioctl   │                     │  ├─ GigaThread 引擎        │
│  （见 [[06 GPU驱动与CUDA运行时栈]]）     │  │   （把 Grid 的 Block     │
└──────────────────┘                     │  │    分配给各 SM）         │
                                         │  └─► 各 GPC/SM              │
                                         │        SM 内部：            │
                                         │  取指→译码→发射→执行（Warp）│
                                         └────────────────────────────┘
```

1. **主机侧提交**：CUDA 运行时把 Kernel 及其参数编码成命令，写进与驱动共享的命令缓冲，通过 `ioctl` 通知内核态驱动，再经 PCIe/NVLink 把命令推给 GPU（详见 [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)）。
2. **GPU 前端**：GPU 上的命令处理器（Front-end）取出命令，交给 **GigaThread 引擎**——它是硬件级的"Block 调度器"，负责把 Grid 里的 Block 分配到空闲的 SM 上，并做负载均衡。
3. **SM 执行**：Block 进驻 SM 后被切成 Warp（32 线程一组），Warp Scheduler 轮流发射指令到执行单元。寄存器、共享内存等资源在这一步被占用（资源不够就排不进去，见 [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)）。

::: tip 两个"调度"别混淆
**GigaThread 引擎**在"块级别"分配（哪个 SM 跑哪个 Block）；**Warp Scheduler** 在"指令级别"调度（SM 内部下周期发射哪条 Warp 指令）。前者做负载均衡，后者做延迟隐藏。
:::

## 5. 关键部件详解

### 5.1 Tensor Core：为矩阵乘而生

矩阵乘是神经网络的核心运算。传统做法是若干条 FMA（乘加）指令累加，一条 FP32 FMA 每周期只算 2 次浮点运算；Tensor Core 则用**一条指令算一个矩阵块**（如 H100 的 m16n8k16），配合硬件流水把吞吐拉到 FP32 的十几倍。

| 精度 | A100（稠密） | H100（稠密） | 用途 |
|---|---|---|---|
| TF32 | 156 TFLOPS | 494.5 TFLOPS | 训练（FP32 精度折中） |
| FP16 | 312 TFLOPS | 989.5 TFLOPS | 训练/推理 |
| BF16 | 312 TFLOPS | 989.5 TFLOPS | 训练（宽指数） |
| FP8 | — | 1979 TFLOPS | 推理/混合精度训练 |
| FP4 | — | — | Blackwell 新增（B200 约 10 PFLOPS 稠密） |

::: warning 注意"稀疏"陷阱
NVIDIA 规格表常标 "with sparsity"（2:4 结构化稀疏），数值是稠密的两倍。对比时务必统一口径：A100 的 FP16 是 312（稠密）/ 624（稀疏）。
:::

### 5.2 RT Core：光线追踪专用

RT Core 在 Turing 首次引入，硬件加速"射线与三角形求交、BVH 遍历"，让实时光线追踪成为可能。它与通用计算无关，游戏/渲染场景才用得上；数据中心卡（A100/H100/B200）不启用。

### 5.3 NVLink 与 PCIe：GPU 之间的高速公路

| 互连 | 单向带宽（每链路） | 典型配置 | 用途 |
|---|---|---|---|
| PCIe Gen4 ×16 | 16 GB/s | A100 | 主机-设备传输 |
| PCIe Gen5 ×16 | 32 GB/s | 部分 H100/消费卡 | 主机-设备传输 |
| NVLink 3.0 | 50 GB/s | A100 12 链路 = 600 GB/s | GPU-GPU |
| NVLink 4.0 | 50 GB/s | H100 18 链路 = 900 GB/s | GPU-GPU |
| NVLink 5.0 | 100 GB/s | Blackwell 18 链路 = 1.8 TB/s | GPU-GPU |

多卡训练时梯度交换走 NVLink（高带宽、低延迟），CPU 与 GPU 之间走 PCIe。NVLink 的拓扑与集合通信（NCCL）见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)。

## 6. 算力指标：怎么读一张规格表

### 6.1 FLOPS 是怎么算出来的

FLOPS（每秒浮点运算次数）= **单元数 × 频率 × 每次运算的操作数**。FMA（乘加）一次算 2 次浮点运算，所以：

```text
A100 FP32 = 6912 个 FP32 单元 × 1.41 GHz × 2（FMA）
          ≈ 19.5 TFLOPS ✓
H100 FP32 = 16896 个 FP32 单元 × 1.98 GHz × 2 ≈ 67 TFLOPS ✓
```

Tensor Core 的算力由"每条矩阵指令的 FLOP 数 × 频率 × 单元数"决定，NVIDIA 直接给出数值。

### 6.2 三张卡的算力对比（稠密）

| 精度 | A100 SXM | H100 SXM | RTX 4090 |
|---|---|---|---|
| FP64 | 9.7 TFLOPS | 34 TFLOPS | 1.29 TFLOPS |
| FP32 | 19.5 TFLOPS | 67 TFLOPS | 82.6 TFLOPS |
| TF32（Tensor） | 156 TFLOPS | 494.5 TFLOPS | — |
| FP16（Tensor） | 312 TFLOPS | 989.5 TFLOPS | 330.3 TFLOPS |
| FP8（Tensor） | — | 1979 TFLOPS | 660.6 TFLOPS |
| INT8（Tensor） | 624 TOPS | 1979 TOPS | 1321 TOPS |
| 显存/带宽 | 80GB HBM2e / 2.0 TB/s | 80GB HBM3 / 3.35 TB/s | 24GB GDDR6X / 1.008 TB/s |
| TDP | 400W | 700W | 450W |

::: note 有趣的反差
消费级 RTX 4090 的 FP32 算力（82.6 TFLOPS）比 A100（19.5）还高，但带宽（1.008 vs 2.0 TB/s）、显存（24 vs 80GB）、NVLink、ECC、驱动特性都差一截——**数据中心卡贵在带宽、容量、可靠性，而不是纸面峰值算力**。
:::

### 6.3 三个指标的关系

- **算力（TFLOPS）**：单位时间最多算多少浮点运算——理论上限。
- **带宽（GB/s）**：单位时间能搬多少数据——大多数 Kernel 的真正瓶颈（Roofline 模型见 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/)）。
- **功耗（TDP）**：散热与供电的标尺，H100 的 700W 意味着数据中心要上液冷（见 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)）。

## 7. GPU 如何连接到系统

现代 GPU 是**独立设备**（device）：有自己的内存、自己的地址空间，CPU（host）通过互连总线与它通信。

```text
                    PCIe Gen4/Gen5（双向 32~64 GB/s）
 CPU + 主机内存  ◄═══════════════════════════►  GPU（HBM 显存）
                    NVLink（GPU-GPU，600~1800 GB/s）
 GPU0 ◄═════════════════════════════════════► GPU1
```

- **主机-设备模型**：数据要先用 `cudaMemcpy` 搬到显存，Kernel 才能在设备上跑；地址空间是否统一（UVA/UVM）见 [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)。
- **PCIe**：主机与设备间默认通道，Gen5 ×16 单向 32 GB/s，仍远低于显存带宽，所以**避免频繁的 CPU-GPU 数据搬运**是优化的第一课。
- **NVLink/C2C**：GPU 之间（NVLink）与 CPU-GPU 之间（如 Grace-Hopper 的 C2C，900 GB/s 一致性接口）的高速直连。

## 8. 为什么 GPU 是"吞吐优先、延迟隐藏"的设计

把前面所有内容收拢成一个结论：

1. **吞吐优先**：把晶体管花在"更多弱核"而非"更强单核"，峰值算力靠并行度堆出来。
2. **延迟隐藏**：单条访存/指令延迟高达数百周期，GPU 不靠缓存压延迟，而是靠**同时驻留大量 Warp，一个 Warp 等内存时立刻切换另一个**，让执行单元永远不空转（见 [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/) 的延迟隐藏公式）。
3. **代价**：分支预测、乱序、大缓存这些"延迟优化"部件被砍掉，换来的是单线程性能极差——**GPU 对单线程不友好，对"成千上万个线程"极度友好**。

::: important 本章核心心法
评估一个 GPU Kernel 是否高效，永远问两个问题：**算力喂饱了吗？带宽喂饱了吗？** 前者靠并行度（占用率），后者靠访存模式（合并访存），这正是接下来两章的主题。
:::

## 9. 本章小结

- CPU 延迟优先、GPU 吞吐优先：核心数差 2~3 个数量级，带宽差一个数量级，控制逻辑完全相反。
- 发展史：GeForce 256（T&L）→ G80（统一着色器）→ Tesla → Fermi → Kepler → Maxwell → Pascal → Volta（Tensor Core）→ Turing（RT Core）→ Ampere（MIG/TF32）→ Hopper（FP8）→ Blackwell（FP4）。
- 芯片层级：GPC → TPC → SM；SM = CUDA Core + SFU + Tensor Core + Warp Scheduler + 寄存器堆 + 共享内存/L1。
- 数据流：CPU 提交命令 → GPU 前端 → GigaThread 引擎分 Block → SM 的 Warp Scheduler 发射指令。
- 算力公式：FLOPS = 单元数 × 频率 × 2（FMA）；带宽 = 位宽÷8 × 有效速率；TDP 决定散热方案。

::: tip 引出下一章
芯片结构和算力指标都清楚了，但"数据存在哪、怎么访问才快"还没讲——显存怎么组织、带宽为什么是命根子、合并访存和 Bank 冲突是什么，全部在 [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)。
:::

## 自测题

**1. CPU 与 GPU 的设计哲学本质区别是什么？分别体现在哪些硬件决策上？**
答：CPU 延迟优先，单线程越快越好，堆分支预测、乱序执行、大缓存；GPU 吞吐优先，单指令可以慢，靠海量并行把吞吐堆上去，因此砍掉复杂控制逻辑、用更多简单 ALU、配高带宽内存（HBM/GDDR）。

**2. 为什么 GPU 需要远超 CPU 的内存带宽？**
答：GPU 同时有成千上万线程在访问显存，算力 = 带宽 × 计算强度。深度学习等数据并行负载里每字节数据的运算次数固定，若带宽不足，再高的峰值算力也发挥不出来。

**3. GPC、TPC、SM 是什么关系？A100 与 H100 各有多少 SM、多少 FP32 单元？**
答：GPC（图形处理簇）→ TPC（纹理处理簇，含 2 个 SM）→ SM（流式多处理器）。A100：108 SM × 64 FP32 = 6912；H100：132 SM × 128 FP32 = 16896。

**4. 一条 Kernel 从 CPU 发起到 SM 执行，经过哪些环节？**
答：CUDA 运行时把 Kernel 编码为命令 → 驱动 ioctl 提交 → 经 PCIe/NVLink 送到 GPU 前端 → GigaThread 引擎把 Block 分配给 SM → SM 内 Warp Scheduler 把 Warp 指令发射到执行单元。

**5. A100 的 19.5 TFLOPS FP32 算力是怎么来的？**
答：6912 个 FP32 单元 × 1.41 GHz × 2（FMA 每次算乘加两次浮点运算）≈ 19.5 TFLOPS。

**6. Tensor Core 与 CUDA Core 有什么区别？为什么 FP16 张量算力能到 FP32 的十几倍？**
答：CUDA Core 执行标量 FMA（一次 2 次浮点运算）；Tensor Core 一条指令完成一个矩阵块乘加（如 m16n8k16），每条指令的浮点运算数是标量的几十倍，且 FP16/BF16/FP8 数据位宽减半或减四分之一，带宽吞吐更高。

**7. PCIe Gen5 ×16 与 NVLink 4.0 的总带宽各是多少？为什么多卡训练必须用 NVLink？**
答：PCIe Gen5 ×16 双向 64 GB/s（单向 32）；NVLink 4.0 在 H100 上 18 链路共 900 GB/s。梯度同步等 GPU-GPU 通信量巨大，PCIe 带宽差一个数量级且延迟更高，会成为瓶颈。

**8. 为什么说 GPU"不需要"大缓存和复杂分支预测？**
答：因为 GPU 用"延迟隐藏"替代"延迟降低"：同时驻留几十个 Warp，一个 Warp 等待访存时调度器切换其他 Warp 执行，执行单元不空转即可。缓存和分支预测是 CPU 在单线程内隐藏延迟的手段，GPU 选择在"线程之间"隐藏延迟。

**9. 一块卡 FP32 算力 40 TFLOPS、带宽 1.5 TB/s，一个每字节 8 次运算的 Kernel 是算力瓶颈还是带宽瓶颈？**
答：Roofline 模型：该 Kernel 的计算强度 = 8 FLOP/B，转折点 = 40 TFLOPS ÷ 1.5 TB/s ≈ 26.7 FLOP/B。8 < 26.7，处于带宽受限区，属于带宽瓶颈（详见 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/)）。

::: note 自测提示
第 9 题只是热身：Roofline 的完整推导、如何用 Nsight Compute 实测瓶颈，见 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)。
:::
