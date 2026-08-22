---
title: "GPU监控与运维实践"
permalink: /kb/os/GPU/11-GPU监控与运维实践/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU容器化与Kubernetes调度", link: /kb/os/GPU/10-GPU容器化与Kubernetes调度/ }
next: { text: "GPU性能分析与Profiling工具", link: /kb/os/GPU/12-GPU性能分析与Profiling工具/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
本章回答：**GPU 到底怎么监控？利用率高/低分别意味着什么？** 学完你能：读懂 `nvidia-smi` 每一个字段、熟练用 `--query-gpu`/`-q` 等子命令查任意指标，部署 DCGM + dcgm-exporter 接入 Prometheus/Grafana 并设计告警规则，系统排查"利用率低"问题，做显存与功耗容量规划，并照着巡检清单维护 GPU 集群健康。
:::

上一章 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/) 把 GPU 发给了容器，本章回答"**发出去之后怎么管**"。监控的核心不是"看数字"，而是把每个数字翻译成行动：利用率低是空转还是瓶颈？温度高是散热问题还是降频前兆？Xid 出现意味着什么？（Xid 的完整解读在 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)。）

## 1. 监控指标体系

先建立"指标 → 含义 → 行动"的映射：

| 指标 | 来源字段 | 含义 | 高意味着 | 低意味着 |
|---|---|---|---|---|
| GPU 利用率 | `utilization.gpu` | 采样周期内 SM 上有 kernel 在执行的时间占比 | 算力吃紧，可能有争抢 | 空闲 / 等数据 / CPU 瓶颈（**不一定是故障**） |
| 显存拷贝利用率 | `utilization.memory` | 显存带宽忙碌的时间占比 | 数据搬运密集 | 计算型负载的正常形态 |
| SM 占用率 | DCGM `DCGM_FI_PROF_SM_OCCUPANCY` | 实际占用 warp 槽位比例 | 并行度充足 | 并行度不足、kernel 太小 |
| 显存用量 | `memory.used/total` | 显存占用 | 接近满 → OOM 风险 | 显存没吃满（可能卡数规划过足） |
| 功耗 | `power.draw` | 实时功耗 | 贴近上限 → 撞功耗墙降频 | 空闲/轻载 |
| 温度 | `temperature.gpu` | GPU 温度 | >85°C 持续 → 降频/寿命风险 | — |
| 时钟 | `clocks.sm` / `clocks.mem` | 当前频率 | 满频 = 没降频 | 降频 = 撞功耗/温度墙或省电模式 |
| PCIe 吞吐 | `pcie.tx/rx` | PCIe 链路带宽 | 数据搬运多 | — |
| ECC 错误 | `ecc.errors` | 显存纠错计数 | 持续增长 → 显存故障先兆 | 0 |
| 进程 | `--query-compute-apps` | 谁在占用 GPU | — | — |

::: important 两个容易误读的指标
① **GPU-Util ≠ SM 满载率**：它只统计"有没有 kernel 在跑"的时间占比，小 kernel 连发也能显示 100%，大 kernel 中等待共享内存也算"在跑"。要看真实利用率请用 DCGM 的 `DCGM_FI_PROF_SM_OCCUPANCY` 或 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/) 里的 ncu。② **功耗/温度是"墙"**：撞墙就降频，性能断崖，所以监控功耗与温度比盯着利用率更能提前发现性能劣化。
:::

## 2. nvidia-smi 全参数实战（重点）

### 2.1 默认视图逐字段解读

```text
Tue May 14 10:00:00 2025
+-----------------------------------------------------------------------------------------+
| NVIDIA-SMI 550.54.15              Driver Version: 550.54.15      CUDA Version: 12.4     |
|-----------------------------------------+------------------------+----------------------+
| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf          Pwr:Usage/Cap  |         Memory-Usage   | GPU-Util  Compute M. |
|                                         |                        |                      |
|   0  NVIDIA A100-SXM4-40GB         On   | 00000000:3B:00.0  Off |                    0 |
| N/A   42C    P0              265W / 400W |   32768MiB / 40960MiB |    98%      Default   |
|                                         |                        |                      |
+-----------------------------------------+------------------------+----------------------+

+-----------------------------------------------------------------------------------------+
| Processes:                                                                              |
|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |
|        ID   ID                                                               Usage      |
|=========================================================================================|
|    0   N/A  N/A    123456      C   python3                                        31744MiB |
+-----------------------------------------------------------------------------------------+
```

| 字段 | 含义 |
|---|---|
| `NVIDIA-SMI 550.54.15` / `Driver Version` | 驱动版本 |
| `CUDA Version: 12.4` | **驱动支持的最高 CUDA 版本**（不是机器上装的 toolkit 版本，别混淆） |
| `GPU 0` / `Name` | 卡索引与型号 |
| `Persistence-M: On` | 持久化模式。Off 时驱动在无进程时卸载，下次调用要重新加载（慢且可能报错） |
| `Bus-Id` | PCI 地址（`00000000:3B:00.0`） |
| `Disp.A: Off` | 是否接显示器（数据中心卡恒 Off） |
| `Volatile Uncorr. ECC` | 自上次清零以来的**不可纠正** ECC 错误数（可纠正的要用 `-q -d ECC` 看） |
| `Fan` / `Temp` / `Perf` | 风扇转速、温度、性能状态 P0–P12（**P0 最高频**，数字越大越省电） |
| `Pwr:Usage/Cap` | 实时功耗 / 功耗上限（撞 Cap 即降频） |
| `Memory-Usage` | 显存占用 / 总量（含所有上下文） |
| `GPU-Util` | 见第 1 节（时间占比，非 SM 满载率） |
| `Compute M.` | 计算模式：Default / Exclusive / Prohibited 等 |
| Processes 表 | `Type`：`C`=计算进程、`G`=图形进程、`X`/`M`=其他；`GPU Memory Usage`=该进程占用显存 |

### 2.2 `-q` 详细查询（按块过滤）

```bash
nvidia-smi -q                     # 全部详细信息
nvidia-smi -q -d TEMPERATURE      # 只看温度块
nvidia-smi -q -d POWER            # 功耗（含上限与当前）
nvidia-smi -q -d CLOCK            # 时钟（SM/显存/图形，含最大与当前）
nvidia-smi -q -d ECC              # ECC 计数（SBE 可纠正 / DBE 不可纠正）
nvidia-smi -q -d MEMORY           # 显存（总量/已用/剩余）
nvidia-smi -q -d HEALTH           # 健康状态（GPU 检查器结果）
nvidia-smi -q -d COMPUTE          # 计算模式与 MIG 状态
```

### 2.3 `--query-gpu`：CSV 输出与循环采样

```bash
# 一次性查询指定字段
nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw \
  --format=csv,noheader

# 每秒循环采样（-l 1 等价 --loop=1）
nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader -l 1

# 采样写文件（巡检/压测留档用）
nvidia-smi -l 5 -f /var/log/gpu_monitor.log

# 只查第 0 号卡
nvidia-smi -i 0 --query-gpu=name,utilization.gpu --format=csv,noheader
```

::: tip 可用字段列表
`nvidia-smi --help-query-gpu` 输出全部可用字段名（如 `clocks.sm`、`power.limit`、`ecc.errors.uncorrected.volatile.total`、`pcie.link.gen.current`），写脚本前先查一遍。
:::

### 2.4 进程查询

```bash
# 谁在占用 GPU、占了多少显存
nvidia-smi --query-compute-apps=pid,used_memory,process_name --format=csv

# 默认视图底部也有 Processes 表；配合 ps 看 CPU 占用
nvidia-smi --query-compute-apps=pid --format=csv,noheader | xargs -I{} ps -o pid,pcpu,pmem,cmd -p {}
```

::: note 显存占用对不上的坑
Processes 表只列**计算进程**，但显存还可能被图形进程、其他用户上下文、以及残留僵尸上下文占用。`Memory-Usage` 的 used 往往大于各进程之和，属于正常现象；想清掉残留上下文只能等进程退出或重启驱动。
:::

### 2.5 其他常用子命令

```bash
nvidia-smi -L                       # 列出全部卡：索引 + 型号 + UUID（UUID 用于 K8s/容器指定卡）
nvidia-smi topo -m                  # NVLink/PCIe 拓扑矩阵（见 [[10 GPU容器化与Kubernetes调度]] 第 9 节）

# —— 以下均需 root，且影响所有使用该卡的用户，生产环境先 drain ——
nvidia-smi -pm 1                    # 开启持久化模式（数据中心推荐常开）
nvidia-smi -pl 250                  # 设置功耗上限 250W（A100 默认 400W 可下调）
nvidia-smi -lgc 1000,1500           # 锁定 SM 时钟范围 1000–1500 MHz（压测定频用）
nvidia-smi -lmc 5000                # 锁定显存时钟
nvidia-smi -e 0                     # 关闭 ECC（A100/H100 等，需重启 GPU 生效）
nvidia-smi -r                       # 复位 GPU（杀死所有进程、清空状态，生产慎用！）
```

::: warning `-r` 是核弹级操作
`nvidia-smi -r` 会强制复位 GPU，**所有在跑的进程直接被杀**、上下文与显存全部清空。只允许在维护窗口、且确认该卡无业务后使用；多卡机器上配合 `-i` 只复位指定卡。`-pl`/`-lgc`/`-e` 同理，改动全局生效。
:::

## 3. NVML 编程接口

`libnvidia-ml.so` 提供 **NVML（NVIDIA Management Library）** C API，`nvidia-smi`、DCGM、Grafana 插件底层都是它。需要自定义监控脚本时直接调 NVML，或装 Python 封装 `nvidia-ml-py`（pynvml）：

```python
import pynvml

pynvml.nvmlInit()
handle = pynvml.nvmlDeviceGetHandleByIndex(0)          # 第 0 张卡
print(pynvml.nvmlDeviceGetName(handle))                # 型号

util = pynvml.nvmlDeviceGetUtilizationRates(handle)    # 一次性拿利用率
print(f"GPU-Util: {util.gpu}%, Mem-Util: {util.memory}%")

pynvml.nvmlShutdown()
```

::: tip pynvml 与 DCGM 怎么选
pynvml：单机、轻量、实时查询，适合快速脚本与巡检；DCGM：多机聚合、有 profiling 级指标（SM 占用率、Tensor Core 活跃度）、有历史/事件能力，适合正式监控平台。
:::

## 4. DCGM（Data Center GPU Manager）

**DCGM** 是 NVIDIA 面向数据中心 GPU 的管理组件：指标采集、健康监控、诊断、配置管理一体，指标粒度比 nvidia-smi 细（多了 `DCGM_FI_PROF_*` profiling 族），且有 Go/Python bindings 可编程。

### 4.1 dcgm-exporter：Prometheus 出口

dcgm-exporter 把 DCGM 指标暴露成 Prometheus 格式（默认端口 **9400**，路径 `/metrics`），通常以 DaemonSet 每节点跑一个：

```bash
# Helm 安装
helm repo add nvidia https://nvidia.github.io/dcgm-exporter
helm install dcgm-exporter nvidia/dcgm-exporter

# 验证
curl -s localhost:9400/metrics | grep DCGM_FI_DEV_GPU_UTIL
```

输出示例：

```text
# HELP DCGM_FI_DEV_GPU_UTIL GPU utilization (in %).
# TYPE DCGM_FI_DEV_GPU_UTIL gauge
DCGM_FI_DEV_GPU_UTIL{gpu="0",UUID="GPU-5f6f5f5f-...",device="nvidia0"} 98
DCGM_FI_DEV_TEMPERATURE_GPU{gpu="0",UUID="GPU-5f6f5f5f-...",device="nvidia0"} 42
DCGM_FI_DEV_POWER_USAGE{gpu="0",UUID="GPU-5f6f5f5f-...",device="nvidia0"} 265
```

### 4.2 dcgmi 命令行

```bash
dcgmi diag -r 1        # 快速/运行时诊断：检查驱动、设备枚举、SM 状态等（秒级）
dcgmi diag -r 2        # 扩展诊断：含压力测试，耗时数分钟到几十分钟
dcgmi info -v          # DCGM 版本信息
dcgmi discovery -l     # 列出所有 GPU 与 UUID
dcgmi health -s -a     # 开启全部健康监控（温度/功耗/ECC/Xid 等事件）
dcgmi stats -v         # 查看统计（需先 enable）
```

::: important 故障前先跑诊断
怀疑卡有问题时**先 `dcgmi diag -r 1` 再 `dcgmi diag -r 2`**：Level 1 快、适合日常巡检；Level 2 有压力测试，能暴露隐性问题（如 ECC 持续增长、时钟异常）。两者结合 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/) 的 Xid 排查流程使用。
:::

### 4.3 常用 DCGM 指标名

| 指标 | 含义 |
|---|---|
| `DCGM_FI_DEV_GPU_UTIL` | GPU 利用率（SM 忙碌时间占比） |
| `DCGM_FI_DEV_MEM_COPY_UTIL` | 显存拷贝利用率 |
| `DCGM_FI_PROF_SM_OCCUPANCY` | SM 占用率（profiling 级，需权限） |
| `DCGM_FI_PROF_PIPE_TENSOR_ACTIVE` | Tensor Core 活跃度（AI 负载关键指标） |
| `DCGM_FI_DEV_SM_CLOCK` / `DCGM_FI_DEV_MEM_CLOCK` | SM / 显存时钟 |
| `DCGM_FI_DEV_POWER_USAGE` | 实时功耗（W） |
| `DCGM_FI_DEV_TEMPERATURE_GPU` | GPU 温度（°C） |
| `DCGM_FI_DEV_FB_USED` / `DCGM_FI_DEV_FB_TOTAL` | 显存已用 / 总量（MiB） |
| `DCGM_FI_DEV_ECC_SBE_VOL_TOTAL` | 可纠正（单比特）ECC 错误总数 |
| `DCGM_FI_DEV_XID_ERRORS` | Xid 错误计数（出现即报警） |

### 4.4 事件

DCGM 还能上报事件（配合 `dcgmi health` / dcgm-exporter 的事件模式）：Xid 错误、温度超阈值、功耗超阈值、ECC 错误超阈值。Xid 是驱动/硬件级错误码，`dmesg` 里也能看到，具体错误码含义见 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)。

## 5. Prometheus + Grafana 接入

### 5.1 抓取配置

```yaml
# prometheus.yml
scrape_configs:
  - job_name: dcgm-exporter
    static_configs:
      - targets: ["gpu-node-01:9400", "gpu-node-02:9400", "gpu-node-03:9400"]
    scrape_interval: 15s
```

### 5.2 常用告警规则

```yaml
groups:
  - name: gpu-alerts
    rules:
      # 温度过高：GPU 结温持续 > 85°C 超过 5 分钟
      - alert: GPUHighTemperature
        expr: DCGM_FI_DEV_TEMPERATURE_GPU > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GPU {{ $labels.gpu }} 温度 {{ $value }}°C 持续过高"

      # 利用率长期过低：过去 1 小时平均 < 10%（排查空转/业务异常）
      - alert: GPUUnderutilized
        expr: avg_over_time(DCGM_FI_DEV_GPU_UTIL[1h]) < 10
        labels:
          severity: info
        annotations:
          summary: "GPU {{ $labels.gpu }} 利用率持续低于 10%"

      # 显存吃紧：剩余 < 1GB 持续 5 分钟
      - alert: GPULowFreeMemory
        expr: (DCGM_FI_DEV_FB_TOTAL - DCGM_FI_DEV_FB_USED) < 1024
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "GPU {{ $labels.gpu }} 剩余显存不足 1GB"

      # Xid 错误出现：5 分钟内 Xid 计数增加
      - alert: GPUXidError
        expr: increase(DCGM_FI_DEV_XID_ERRORS[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "GPU {{ $labels.gpu }} 出现 Xid 错误"
```

::: tip 告警阈值设计要点
温度 85°C 是数据中心卡（A100/H100）的通用警戒线（90°C 附近开始降频）；"利用率低"告警要加 `for`/`avg_over_time` 滤波，避免训练数据加载的间隙误报；Xid 一旦出现就该人工介入（多数 Xid 不可自愈）。功耗告警比温度告警更早暴露降频风险（先撞功耗墙再升温）。
:::

### 5.3 Grafana

导入 NVIDIA 官方 **DCGM Exporter Dashboard**（Grafana.com 上搜索 "DCGM"，常用 ID 12239），按需加面板：利用率、显存、温度、功耗、时钟、ECC 计数、Xid。多机场景用 node-exporter 关联 CPU/内存/网络，构成完整视图。

## 6. GPU 利用率低的排查思路

**利用率低 ≠ 故障**。先列原因再动手：

| 常见原因 | 特征 | 验证手段 |
|---|---|---|
| 数据加载慢（磁盘/网络 I/O） | GPU-Util 周期性"锯齿"，kernel 间隙大 | 看进程 CPU 占用、`iostat`、nsys 时间线（见 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)） |
| CPU 预处理瓶颈 | GPU 等 CPU 提交，kernel 间大段空白 | `top -H -p &lt;pid&gt;` 看 CPU 是否打满、nsys 看 CPU-GPU 是否重叠 |
| batch 太小 | kernel 短促、启动开销占比大 | 增大 batch 复测 |
| 分布式等待 | 多卡负载不均、通信慢（AllReduce 阻塞） | `nsys` 看通信区间，`nvidia-smi` 对比各卡利用率 |
| 隐式同步 | 代码里 `.item()`/`.cpu()`/numpy() 强制同步 | nsys 里看 `cudaDeviceSynchronize`/`cudaMemcpy` 阻塞 |
| 功耗/温度降频 | 时钟掉到基础频率、功耗贴近 Cap | `nvidia-smi -q -d CLOCK,POWER` |
| 指标本身局限 | 小 kernel 密集时 GPU-Util 高但 SM 占用低 | DCGM `DCGM_FI_PROF_SM_OCCUPANCY`、ncu |

::: important 排查顺序口诀
**先看"有没有活干"（CPU 是否在喂），再看"干得快不快"（kernel 效率），最后看"是不是被限速"（时钟/功耗/温度）**。多数"利用率低"是喂不饱，而不是 GPU 坏了——用 nsys 一跑时间线，CPU 瓶颈一目了然。
:::

## 7. 容量规划

### 7.1 单模型显存估算

**推理**：`显存 ≈ 参数量 × 字节数 + KV Cache + 激活`。例：7B 模型 FP16 权重 ≈ 14 GB（7B × 2B），KV cache 随序列长度增长（2 × layers × kv_heads × head_dim × seq_len × batch × 2B），再加少量激活——所以 7B 推理通常需要 16–24 GB，40GB 的 A100 单卡刚好放得下。

**训练**：`参数 + 梯度 + 优化器状态 + 激活`。AdamW 混合精度训练每参数粗算 **16–20 字节**（FP16 权重 2B + FP32 主权重 4B + 动量 4B + 方差 4B + 梯度 2B+）。例：7B 模型单卡训练起步需 7B × 16B ≈ **112 GB**，一张 A100 80G 装不下 → 必须上 ZeRO/FSDP 分片或降低精度。详细估算公式见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)。

### 7.2 按峰值利用率规划集群

- 目标：平均利用率 60–80%，峰值 < 100%，留重启/突发余量；
- 单卡需求 × 并发任务数 = 卡数；宁可多备 10–20% 给失败重试与版本回滚；
- 注意"卡多任务少"比"卡少任务多"更浪费：闲置卡也要功耗。

### 7.3 功耗与散热规划

| 卡型 | TDP | 8 卡节点估算 |
|---|---|---|
| A100 SXM | 400W | 8×400W = 3200W + CPU/内存 ≈ 4.5–5kW/节点 |
| H100 SXM | 700W | 8×700W = 5600W + 其余 ≈ 7–8kW/节点 |
| 机柜（42U，约 8–12 个 2U 节点） | — | 单机柜供电需求 40–70kW（含冗余），务必核对机柜供电与空调制冷上限 |

::: warning 功耗规划别只看 GPU
机柜功率 = GPU + CPU + 内存 + 网卡 + 风扇 + UPS 损耗。H100 机柜动辄 60kW+，普通机房单机柜 10–20kW 的容量根本带不动——**先查机柜供电与制冷，再下单显卡**。
:::

## 8. 集群级工具

| 工具 | GPU 资源写法 | 说明 |
|---|---|---|
| **Slurm** | `sbatch --gres=gpu:2 script.sh`、`srun --gres=gpu:a100:4` | 传统 HPC 调度；`sinfo -o "%n %G"` 看各节点 GPU |
| **K8s** | `resources.limits: nvidia.com/gpu: 1` | 扩展资源 + Device Plugin（见 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)） |
| **Ray** | `@ray.remote(num_gpus=1)`、`ray.accelerators` 检测、`gpus_per_task` | Python 分布式任务，适合训练/推理工作负载（见 [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)） |

::: tip 监控与调度的配合
集群调度器负责"分卡"，监控平台负责"看卡用得好不好"。落地时给每个任务打标签（团队/项目/队列），告警按标签路由，容量规划才有数据基础。
:::

## 9. 健康巡检清单

**新卡验收 / 开机必检**：

```bash
nvidia-smi -L                          # 识别卡数与 UUID
nvidia-smi -q -d HEALTH                # 健康检查器结果
dcgmi diag -r 1                        # 快速诊断（Level 1）
dmesg | grep -i xid | tail -20         # 历史 Xid 错误（有残留先查 [[14 GPU故障排查与问题定位]]）
nvidia-smi -q -d ECC                   # ECC 计数：SBE 持续增长要警惕
nvidia-smi -pm 1                       # 确认持久化模式 On
```

**记录基线**（对比"异常前"必备）：

```bash
# 空闲基线
nvidia-smi --query-gpu=name,temperature.gpu,power.draw,clocks.sm --format=csv
# 满载基线：跑压测（如 nvidia 的 gpu-burn / dcgmi diag -r 2）并采样 30 分钟
nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,power.draw,clocks.sm \
  --format=csv -l 10 -f baseline_full_load.log
```

**日常巡检节奏**：每日看利用率/温度/功耗曲线；每周跑一次 `dcgmi diag -r 1`；每月跑一次 `dcgmi diag -r 2`；出现 Xid/ECC 增长立即进入 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/) 流程。

::: note 基线的作用
温度、功耗、时钟是**相对指标**：同一张卡满载 82°C 是常态，换张卡可能 75°C 就是异常。所以一定要给每台机器留基线，用"偏离基线多少"而不是"绝对值多少"来判断异常。
:::

## 10. 本章小结

- 监控先建指标体系：利用率/显存/功耗/温度/时钟/PCIe/ECC/进程，每个指标要能翻译成行动；
- `nvidia-smi` 全家桶：默认视图逐字段、`-q -d` 分块、`--query-gpu --format=csv -l` 循环采样、`--query-compute-apps` 查进程、`-L`/`topo -m`/`-pm`/`-pl`/`-lgc`/`-e`/`-r`；
- DCGM 提供 profiling 级指标与诊断（`dcgmi diag -r 1/2`），dcgm-exporter 接 Prometheus，配温度/显存/利用率/Xid 四类告警；
- 利用率低 ≠ 故障：按"有没有活干 → 干得快不快 → 是不是被限速"排查；
- 容量规划盯三件事：单模型显存、峰值利用率、机柜功耗散热；
- 巡检 = 识别 + 诊断 + 基线 + 节奏，一切靠"偏离基线"说话。

::: tip 引出下一章
监控回答"**卡用得好不好**"，但"**为什么不够快、瓶颈在哪**"要靠剖析工具回答。下一章 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/) 讲 nsys / ncu / PyTorch Profiler：从全局时间线到单 kernel 微观指标，把利用率低、慢 kernel、memcpy 风暴逐一揪出来。
:::

## 11. 自测题

**1. GPU-Util 高和低分别意味着什么？为什么利用率低不一定是故障？**
答：GPU-Util 是采样周期内 SM 上有 kernel 在执行的时间占比。高=算力繁忙；低=可能空闲、等数据、CPU 瓶颈、batch 太小或分布式等待——它是"有没有在跑"的粗粒度指标，不等于 SM 满载率，所以低不一定是故障，要结合 CPU 占用与时间线判断。

**2. `nvidia-smi` 第一行的 CUDA Version 指什么？和 `nvcc --version` 有什么区别？**
答：第一行 CUDA Version 是**驱动支持的最高 CUDA 运行时版本**（由驱动决定）；`nvcc --version` 是机器上安装的 CUDA Toolkit 编译器版本（可装多个）。两者可以不同：驱动 550 支持 CUDA 12.4，但机器上可以只装 11.8 的 toolkit。

**3. 如何每 5 秒采样一次 GPU 利用率并写入日志文件？写出命令。**
答：`nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader -l 5 -f /var/log/gpu_monitor.log`（`-l 5` 即 `--loop=5` 秒；`-f` 指定输出文件）。

**4. 如何查某个 PID 占用了多少显存？**
答：`nvidia-smi --query-compute-apps=pid,used_memory,process_name --format=csv` 看进程表；或 `nvidia-smi -q -d PROCESSES`；单进程也可用 `nvidia-smi --query-compute-apps=pid,used_memory --format=csv,noheader | grep &lt;pid&gt;`。

**5. `dcgmi diag -r 1` 和 `-r 2` 的区别？巡检和排障分别怎么用？**
答：`-r 1` 是快速/运行时诊断（驱动、设备枚举、SM 状态，秒级）；`-r 2` 是扩展诊断，含压力测试（耗时数分钟到几十分钟）。日常巡检用 `-r 1`；疑似硬件问题时先 `-r 1` 再 `-r 2` 深挖。

**6. 设计三条告警：GPU 温度 >85°C 持续 5 分钟、显存剩余 <1GB、出现 Xid 错误。分别写出 PromQL。**
答：① `DCGM_FI_DEV_TEMPERATURE_GPU > 85` + `for: 5m`；② `(DCGM_FI_DEV_FB_TOTAL - DCGM_FI_DEV_FB_USED) < 1024` + `for: 5m`；③ `increase(DCGM_FI_DEV_XID_ERRORS[5m]) > 0`（Xid 不需 for，出现即告警）。

**7. `nvidia-smi topo -m` 里的 NV2 和 PIX 分别是什么意思？**
答：NV2 = 两卡间有 2 条 NVLink 直连（高速，多卡训练首选）；PIX = 两卡在同一 PCIe 交换机下（经 PCIe 通信，比 NVLink 慢一个数量级）。还有 PHB（跨 PCIe 交换机）、SYS/NODE（跨处理器互联，最慢）。

**8. 一台 2U 节点装 8×A100（TDP 400W），机柜放 10 台，估算单机柜供电需求并说明还要考虑什么。**
答：GPU 部分 8×400W=3200W/节点；加上 CPU/内存/网卡/风扇约 4.5–5kW/节点；10 台约 45–50kW，考虑冗余（N+1）与 UPS 损耗，机柜供电需 55kW+。还要核对机柜制冷能力（空调/液冷）与电力线路容量，H100（700W/卡）场景会到 70kW+。

**9. 拿到一台 GPU 利用率很低的机器，按什么顺序排查？**
答：按"有没有活干 → 干得快不快 → 是不是被限速"：① `nvidia-smi --query-compute-apps` 看进程是否在跑、CPU 占用（`top -H -p`）；② nsys 看时间线——GPU 行大片空白是 CPU 喂不饱，kernel 间隙大是提交慢/同步；③ batch 是否太小；④ 多卡任务看各卡利用率是否均衡；⑤ `-q -d CLOCK,POWER` 看是否降频（功耗/温度墙）。

**10. 巡检 GPU 的完整命令清单是什么？为什么要记录基线？**
答：`nvidia-smi -L` → `nvidia-smi -q -d HEALTH` → `dcgmi diag -r 1` → `dmesg | grep -i xid` → `nvidia-smi -q -d ECC` → `nvidia-smi -pm 1`，再采样空闲/满载基线。因为温度、功耗、时钟是相对指标，只有对照"该机器自己的基线"才能判断异常（同一台卡满载 82°C 是常态，另一台 75°C 可能已是故障）。

::: note 第 6 题提示
告警设计三原则：**温度用绝对阈值 + for 滤波**（避免瞬时波动误报）、**利用率用 avg_over_time**（过滤数据加载间隙）、**Xid 用 increase 且不设 for**（错误出现即人工介入）。Xid 错误码的具体含义见 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)。
:::
