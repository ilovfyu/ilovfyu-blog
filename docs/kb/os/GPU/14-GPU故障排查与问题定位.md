---
title: "GPU故障排查与问题定位"
permalink: /kb/os/GPU/14-GPU故障排查与问题定位/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "大模型训练推理GPU实践", link: /kb/os/GPU/13-大模型训练推理GPU实践/ }
next: { text: "国产GPU与异构计算生态", link: /kb/os/GPU/15-国产GPU与异构计算生态/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
本章回答：**GPU 出问题（不认卡、OOM、挂死、过热、Xid 报错）时，按什么流程、用什么命令、以什么顺序排查？** 学完你会：看懂 `dmesg` 里的 Xid 错误码并知道每种怎么处理，区分可纠正/不可纠正 ECC 错误与页退役，诊断 PyTorch/CUDA OOM 的四种成因，在 GPU 挂死时按"复位 → 重载驱动 → 重启"的顺序抢救，并用 gpu-burn / DCGM 完成新卡验收。
:::

前置基础：[GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)、[GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)、[GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)；日常监控手段见 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)，性能类问题见 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)。

## 1. 故障分类与排查总览

先给故障分门别类，再按"症状 → 可能原因 → 排查命令"索引，避免上来乱试。

### 1.1 四大类故障

| 类别 | 典型表现 | 例子 |
|---|---|---|
| 硬件故障 | Xid、ECC 增长、掉总线、过热降频 | 显存颗粒损坏、散热失效、供电不稳 |
| 驱动问题 | 不认卡、版本不匹配、模块加载失败 | nouveau 抢占、内核升级后 DKMS 失败 |
| 运行时问题 | OOM、context 丢失、NVML 初始化失败 | 显存不足、多进程竞争、CUDA 版本冲突 |
| 应用问题 | 任务挂死、跑得慢、结果错 | 死循环、非法内存访问、死锁 |

### 1.2 症状 → 排查命令索引表

| 症状 | 可能原因 | 第一步命令 |
|---|---|---|
| nvidia-smi 看不到卡 | 驱动/硬件 | `dmesg | grep -i nvidia`、`lspci | grep -i nvidia` |
| 任务报 OOM | 显存不足/碎片/他人占用 | `nvidia-smi` + `--query-compute-apps` |
| 训练中途卡死 | 驱动 bug/硬件/死锁 | `dmesg -T | grep -i xid`、`nvidia-smi`（是否无响应） |
| 内核日志出现 Xid | 硬件或驱动错误 | `dmesg -T | grep -i xid` 查错误码 |
| 温度高、性能下降 | 散热/功耗 | `nvidia-smi -q -d TEMPERATURE` 看 throttle |
| 某卡明显比别的卡慢 | 拓扑/降频/共享带宽 | `nvidia-smi topo -m`、`-q -d CLOCK` |

::: important 排障第一原则：先看日志，再动设备
GPU 问题的第一现场在**内核日志（dmesg）**和 **nvidia-smi 状态**里，不在应用报错里。任何"卡死了/报错了"的场景，第一步永远是 `dmesg -T | tail -100`，而不是盲目重启或重装。
:::

## 2. 核心排查三板斧

### 2.1 第一斧：nvidia-smi（卡状态）

```bash
nvidia-smi                          # 卡数、驱动版本、利用率、显存、温度、功耗
nvidia-smi -L                       # 卡列表与 UUID
nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,temperature.gpu --format=csv
```

看什么：驱动版本（与 CUDA 匹配性）、每卡利用率、显存占用（谁把显存吃满了）、温度/功耗（是否过热降频）。**注意 nvidia-smi 的显存占用包含其他进程**，不是"我的进程"的占用。

### 2.2 第二斧：dmesg（内核日志，找 Xid）

```bash
dmesg -T | grep -i nvidia | tail -50     # 只看 NVIDIA 相关
dmesg -T | grep -i xid | tail -20        # 直接找 Xid 错误
journalctl -k | grep -i nvidia           # systemd 系统同理
```

Xid 是驱动写入内核日志的**硬件/驱动级错误码**，格式如 `NVRM: Xid (PCI:0000:1b:00): 63, pid='python', ...`。见 §3 详解。

### 2.3 第三斧：nvidia-smi -q（详细状态）

```bash
nvidia-smi -q                 # 全量详细状态
nvidia-smi -q -d ECC          # ECC 错误计数（可纠正/不可纠正）
nvidia-smi -q -d TEMPERATURE  # 温度 + Perf state + 降频原因
nvidia-smi -q -d PAGES        # 显存页退役情况
```

配套：**nvidia-bug-report.sh** 一键收集全套日志（驱动信息、dmesg、Xid、配置、进程），RMA 或问厂商时必备：

```bash
sudo nvidia-bug-report.sh     # 生成 nvidia-bug-report.log.gz，随故障工单提交
```

## 3. Xid 错误详解（重点）

**Xid 是什么**：NVIDIA 驱动检测到硬件或驱动层错误时，向内核日志输出的一行错误码，形如 `NVRM: Xid (PCI:0000:1b:00): 43, ...`。**Xid 是 GPU 故障最重要的第一现场**。

### 3.1 常见 Xid 对照表

| Xid | 含义 | 处理方向 |
|---|---|---|
| 13 | Graphics Engine Exception（图形引擎异常，多为应用非法内存访问） | 查应用代码（越界/悬垂指针），复现验证 |
| 31 | Too many pending DMAs（DMA 请求积压超限） | 多为驱动 bug 或硬件异常：升级驱动、跑诊断 |
| 43 | Stopped processing（GPU 停止处理） | 通常跟随前序错误：看上下文里的其他 Xid，复位卡 |
| 45 | Preemptive cleanup（抢占式清理，前序错误触发） | 它本身是"善后"，往前找根因 |
| 48 | Double bit ECC error（显存不可纠正错误） | 查 ECC、页退役、**倾向换卡** |
| 56 | GPU exception（应用级异常，CUDA 非法访问常见） | 应用侧排查（与 13 类似） |
| 63 | GPU Memory Controller exception（显存控制器错误） | `dcgmi diag` 诊断，持续出现换卡 |
| 64 | GPU parity error（奇偶校验错误） | 硬件问题，诊断后换卡 |
| 79 | GPU fell off the bus（卡从 PCIe 掉线） | 供电/插槽接触/硬件：重插、换槽、查电源、RMA |
| 119 | Driver / software error（驱动或软件错误） | 升级/重装驱动，提交 nvidia-bug-report |

::: warning 区分"应用错误"和"硬件错误"
Xid 13/56 常见于**应用越界访问**（升级驱动、换卡都救不了，要查代码）；Xid 48/63/64/79 才指向**硬件**。先确认 Xid 类型，再决定是改代码还是换卡，避免"重装三遍驱动问题依旧"。
:::

### 3.2 如何查看

- `dmesg -T | grep -i xid`（最常用）
- `/var/log/messages`（部分发行版）
- `journalctl -k | grep -i xid`（systemd 发行版）
- DCGM 事件：`dcgmi events -s` / `dcgmi monitor` 可实时上报 Xid 与 ECC 事件

### 3.3 Xid 出现后的标准动作

```text
记录上下文(时间/Xid/负载/前后日志) → 检查 ECC(nvidia-smi -q -d ECC)
  → 复位卡(持久化模式 + --gpu-reset，或重启)
  → 复现测试(原负载 / gpu-burn)
  → 仍复现 → 换槽位/换卡 → RMA(附 nvidia-bug-report.sh 全套日志)
```

## 4. ECC 错误处理

数据中心卡（A100/H100 等）显存带 ECC（纠错码）能力，错误分两级：

| 类型 | 含义 | 后果 | 处理 |
|---|---|---|---|
| 可纠正（correctable，单比特） | 硬件自动纠错，任务不中断 | 无直接后果 | **持续增长要警惕**（颗粒退化前兆），关注计数 |
| 不可纠正（uncorrectable / UCE） | 双比特或不可恢复错误 | 可能导致 GPU 重置、任务失败 | 页退役 + 观察；频繁出现则换卡 |

### 4.1 查看 ECC

```bash
nvidia-smi -q -d ECC
# 关注两个维度：
#  Volatile   ：本次开机以来的计数（重启清零）
#  Aggregate  ：累计计数（跨重启保留）
#  每个维度下又分 SRAM / DRAM 的 Correctable / Uncorrectable
```

判断标准：
- 单次可纠正错误：常见、多由瞬时干扰引起，不用紧张；
- **可纠正错误持续增长**（如每几分钟 +1）：显存颗粒可能正在退化，建议排查并准备换卡；
- **任何不可纠正错误（UCE）都要重视**：记时间、查上下文 Xid、跑 `dcgmi diag`。

### 4.2 页退役（Page Retirement）

驱动会把确认损坏的显存页从分配池里剔除，避免再次命中：

```bash
nvidia-smi -q -d PAGES                              # pending / retired 页
nvidia-smi --query-retired-pages=timestamp,address,cause --format=csv
# cause: double bit ECC error / multiple single bit ECC error 等
```

- 退役页多了 → 可用显存变小，且说明硬件在坏；
- **pending retirement 页持续出现、退役页快速增加、或频繁 UCE → 走 RMA 换卡**，不要在坏卡上继续扛生产任务。

## 5. 显存 OOM 排查（重点）

### 5.1 两种 OOM 报错的区别

```text
CUDA 层:    "CUDA error: out of memory"
PyTorch 层: "RuntimeError: CUDA out of memory. Tried to allocate 512.00 MiB
             (GPU 0; 79.15 GiB total capacity; 60.23 GiB already allocated;
              10.05 GiB free; 68.31 GiB reserved in total by PyTorch)"
```

- **CUDA OOM**：底层 `cudaMalloc` 失败，通常意味着显存真的满了（或碎片化到连小块都分不出）。
- **PyTorch OOM**：PyTorch 缓存分配器申请新块失败，报错里已给出关键数字（total capacity / already allocated / free / reserved），按 §5.2 逐项判断。

### 5.2 PyTorch OOM 的 4 种可能

| 可能 | 怎么判断 | 处理 |
|---|---|---|
| ① 真不够 | `already allocated + reserved` 接近 total，模型/激活确实超了 | 减 batch、开梯度累积、开 checkpointing（见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)） |
| ② 碎片化 | free 不少，但申请一个大块（如 8GB）失败——大块被小碎片隔断 | `PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128`，或 `expandable_segments:True`（PyTorch 2.x） |
| ③ 其他进程占用 | `nvidia-smi` 里别的进程用了大量显存 | 见 §5.4 查占用者并处理 |
| ④ 缓存未释放 | 报错显示 `reserved` 很高但 `already allocated` 低 | 是别的进程/上一次 OOM 留下的缓存池，`empty_cache()` 只能清自己进程的 |

### 5.3 解读 memory_summary 与 empty_cache

```python
import torch
torch.cuda.memory_summary(device=0)   # 详细报告：allocated vs reserved vs cached
torch.cuda.empty_cache()              # 把 reserved 中的空闲缓存归还给驱动
```

- **allocated**：当前实际被张量占用的显存（真实需求）；
- **reserved / cached**：PyTorch 向驱动申请但暂未使用、留着复用的缓存池（见 [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)）。
- `empty_cache()` **只释放 reserved 里空闲的部分**，不释放正在使用的张量；`PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True` 能让分配器按需向驱动要显存，显著缓解碎片与"显存只增不减"。

### 5.4 查谁在占显存

```bash
nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv
ps -ef | grep -i python                    # 找到对应 PID 的进程
# 残留进程处理
kill -9 &lt;pid&gt;
# 检查僵尸进程（父进程未回收）
ps aux | awk '$8=="Z"{print $2,$11}'
```

::: tip 显存"消失"的两个常见原因
1. **僵尸/残留进程**：训练崩了但进程没退干净，显存一直被占——`nvidia-smi --query-compute-apps` 一眼看出；
2. **缓存池幻觉**：自己进程 `reserved` 很高但实际没用，导致别的进程看到"显存被占"——多数情况 `empty_cache()` + 调小 `max_split_size_mb` 解决。
:::

## 6. GPU 挂死（Hang）

### 6.1 症状

- 训练/推理任务卡住，日志长时间不动；
- `nvidia-smi` 无响应或超时报错（NVML 卡住）；
- 进程进入 **D 状态**（uninterruptible sleep，不可中断睡眠——正在等驱动/硬件响应）；
- 内核日志出现 `hung task` / `GPU fell off the bus` / `NVRM: Xid`。

### 6.2 原因

驱动 bug（升级引入或已知缺陷）、硬件故障（显存/供电）、不安全的内核（死循环、非法访问把 GPU 拖死）、多进程资源死锁（多个进程互相等对方释放独占资源）。

### 6.3 处理流程（由轻到重）

```text
① 先观察：dmesg 有没有 Xid？别急着动手
② 软件复位：nvidia-smi --gpu-reset   (前提：持久化模式 nvidia-smi -pm 1，且无进程占用)
③ 重载驱动：rmmod nvidia_uvm nvidia_drm nvidia_modeset nvidia && modprobe nvidia
             (先停掉所有使用 GPU 的进程；卸载顺序：先卸依赖 nvidia 的模块)
④ 重启机器（最常见、最有效的兜底）
⑤ 还不行 → 带外管理（BMC/IPMI/iLO）看硬件状态，考虑换槽/换卡
```

```bash
# 完整重载驱动流程
ps -ef | grep -i python | awk '{print $2}' | xargs -r kill -9   # 先杀占用进程
sudo rmmod nvidia_uvm nvidia_drm nvidia_modeset nvidia
sudo modprobe nvidia
nvidia-smi    # 验证恢复
```

### 6.4 内核日志特征

| 日志片段 | 含义 |
|---|---|
| `NVRM: Xid (PCI:...): 79` | 卡从 PCIe 掉线（供电/硬件） |
| `GPU at PCI:0000:1b:00.0 has fallen off the bus` | 掉总线，硬件级问题 |
| `INFO: task ... blocked for more than 120 seconds` | hung task，进程卡在驱动里（D 状态） |
| `NVRM: GPU at ... has suffered an unrecoverable error` | 不可恢复错误，通常伴随 UCE |

## 7. 温度与功耗问题

- **过热阈值**：GPU 温度超过约 **85°C** 开始降频（thermal throttling），算力断崖下跌；90°C+ 是危险区。
- **查看温度与降频原因**：

```bash
nvidia-smi -q -d TEMPERATURE
# GPU Current Temp / Perf State (P0 最高性能，P8/P12 空闲)
# Clocks Throttle Reasons: 这里列出的就是降频原因
```

常见 throttle 原因：`SW Thermal Slowdown`（软件热保护）、`HW Thermal Slowdown`（硬件热保护）、`HW Power Brake`（供电刹车）、`SW Power Cap`（功耗上限）。

处理手段：清灰/换硅脂（数据中心卡多为风冷/液冷维护）、机柜风道与空调、用 `nvidia-smi -pl 250` 主动限制功耗（牺牲一点性能换稳定）、DCGM 的 nvpmodel 配置。**监控侧持续采集温度与 throttle 计数**，见 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)。

## 8. 驱动问题

### 8.1 nvidia-smi 报 "No devices were found"

原因排查顺序：

| 原因 | 判断 | 解决 |
|---|---|---|
| nouveau 未禁用 | `lsmod | grep nouveau` 有输出 | 写 blacklist 并 `update-initramfs -u` |
| Secure Boot 开启 | BIOS 签名校验拦截 | 给驱动模块签名，或关闭 Secure Boot |
| 内核模块未加载 | `lsmod | grep nvidia` 为空 | `modprobe nvidia`；开机自启配置 |
| 驱动与内核不匹配 | `dmesg` 有版本报错 | 重装与内核匹配的驱动（DKMS） |

### 8.2 "CUDA driver version is insufficient for CUDA runtime version"

含义：**应用要求的 CUDA 版本高于驱动支持**（驱动向后兼容、不向前兼容）。例如驱动只支持 CUDA 12.2，应用要 CUDA 12.4。解决：升级驱动，或让应用使用旧 CUDA；容器场景可配合官方 CUDA Compatibility（见 [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/) §8）。

### 8.3 DKMS 编译失败（内核升级后）

现象：`dkms status` 显示 nvidia 模块 build failed。原因：缺内核头文件/编译工具，或驱动版本过旧不支持新内核。解决：

```bash
sudo apt install linux-headers-$(uname -r) build-essential dkms
sudo dkms autoinstall    # 或 dkms install -m nvidia -v 550.xx
```

### 8.4 卸载重装驱动

```bash
sudo nvidia-uninstall                    # 官方 .run 方式安装的
# 或 apt/yum 方式：
sudo apt purge '*nvidia*' cuda*          # Debian/Ubuntu
# 禁用 nouveau：
echo -e "blacklist nouveau\noptions nouveau modeset=0" | sudo tee /etc/modprobe.d/blacklist-nouveau.conf
sudo update-initramfs -u
# 重启后安装新驱动（.run 加 --no-opengl-files 可避免与桌面冲突）
```

## 9. 性能异常

| 现象 | 方向 | 工具 |
|---|---|---|
| 利用率低（任务慢） | 应用瓶颈，不是故障：看 kernel 是不是带宽/延迟瓶颈 | [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)（nsys/ncu） |
| 显存占用异常高 | 泄漏/缓存池/他人占用 | §5 的 memory_summary 与 --query-compute-apps |
| 卡与卡速度不一致 | 拓扑（共享 PCIe switch 带宽）、降频、MIG 残留、坏卡 | `nvidia-smi topo -m`、`-q -d CLOCK`、`-q -d TEMPERATURE` |

::: tip "某张卡特别慢"先看拓扑
多卡机器上不同槽位的卡走不同 PCIe 通道，共享 switch 带宽的卡互相拖累；`nvidia-smi topo -m` 一眼看出谁和谁共享链路（见 [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/) 的 PCIe 拓扑）。同时排除该卡是否因温度高在降频。
:::

## 10. 故障排查决策树

```text
                           GPU 出问题
                                │
        ┌───────────────────────┼────────────────────────┐
    卡不认/驱动报错           跑任务 OOM                任务挂死/卡死
        │                       │                          │
  nvidia-smi 有输出?       nvidia-smi 看显存占用       dmesg 找 Xid/掉线
     │否                 │ 谁占的?                   │
     ├─ nouveau 未禁     ├─ 其他进程 → kill          ├─ Xid 79/63/48/64 → 硬件
     ├─ Secure Boot     ├─ 自己缓存池 → empty_cache  │   → 诊断/换卡/RMA
     ├─ 模块未加载       ├─ 碎片 → ALLOC_CONF        ├─ 无 Xid → 驱动层
     ├─ 版本不匹配       └─ 真不够 → 减 batch /       │   → gpu-reset → rmmod
     └─ DKMS 失败           checkpointing            │     → modprobe → 重启
              │                                    └─ 应用层: 死锁/非法访问
              └─ 按 §8 逐项处理                           → 查应用代码
```

三个入口一句话：**"卡不认 → 驱动层"、"跑任务 OOM → 应用/运行时层"、"任务挂死 → 硬件/驱动层"**。

## 11. 压测工具与新卡验收

### 11.1 常用压测/诊断工具

```bash
# 1) gpu-burn：GPU 满载压力测试，看稳定性与温度
git clone https://github.com/wilicc/gpu-burn && cd gpu-burn && make
./gpu_burn 600                          # 满载 10 分钟

# 2) CUDA Samples：基础功能与带宽
/usr/local/cuda/samples/1_Utilities/deviceQuery/deviceQuery
/usr/local/cuda/samples/1_Utilities/bandwidthTest/bandwidthTest
/usr/local/cuda/samples/1_Utilities/p2pBandwidthLatencyTest/p2pBandwidthLatencyTest

# 3) DCGM 诊断（NVIDIA 官方）
dcgmi diag -r 1                          # 快速诊断
dcgmi diag -r 3                          # 深度诊断（含压力测试，耗时长）

# 4) 多卡通信验证（NCCL 相关，见 [[13 大模型训练推理GPU实践]] §5.5）
```

### 11.2 新卡验收清单

1. 驱动/CUDA 版本与卡匹配，`nvidia-smi` 正常显示；
2. `deviceQuery` 通过（CUDA 可用）；
3. `bandwidthTest` 带宽接近该卡理论值（如 A100 应 >1.5TB/s 量级）；
4. `gpu_burn` 满载 30 分钟以上无 Xid、无掉线，温度在正常范围；
5. `nvidia-smi -q -d ECC` 各项计数为 0（或无明显增长）；
6. 多卡机器：`nvidia-smi topo -m` 拓扑符合预期，P2P 测试通过；
7. 跑一次真实负载（如 vLLM 部署或小模型训练）冒烟验证。

## 12. 自测题

**1.（选择）某训练任务报 PyTorch OOM，`nvidia-smi` 显示还有 30GB free，但报错说 Tried to allocate 8GB 失败。最可能的原因是什么？**
答：**显存碎片化**（free 总量够，但被小碎片隔断，凑不出 8GB 连续大块）。处理：`PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128` 或 `expandable_segments:True`。若 `--query-compute-apps` 显示别的进程占了大块，则是"其他进程占用"。

**2.（判断）Xid 79 表示什么？该怎么处理？**
答：**GPU fell off the bus（卡从 PCIe 总线掉线）**，属硬件/供电问题。处理：检查供电与插槽接触、重新插拔/换槽位、跑诊断确认，必要时 RMA。它不是应用能解决的错误。

**3.（判断）Xid 13 出现，第一反应应该是重装驱动吗？**
答：不是。Xid 13（Graphics Engine Exception）多数是**应用非法内存访问**（越界/悬垂指针）。应先复现并查应用代码；确认与硬件无关后再考虑驱动。

**4. nvidia-smi 完全无响应（卡死），按什么顺序抢救？**
答：① 看 dmesg 是否有 Xid/hung task；② 持久化模式（`-pm 1`）下尝试 `nvidia-smi --gpu-reset`；③ 停掉 GPU 进程后 `rmmod nvidia_uvm nvidia_drm nvidia_modeset nvidia && modprobe nvidia`；④ 重启机器；⑤ 带外管理（IPMI/BMC）兜底并检查硬件。

**5. 可纠正 ECC 错误和不可纠正 ECC 错误分别怎么处理？**
答：可纠正（单比特）：硬件自动纠错、任务不中断，**计数持续增长要警惕**（显存颗粒退化前兆）；不可纠正（UCE）：可能引发 GPU 重置/任务失败，需页退役并观察，**频繁出现则换卡**。

**6. 页退役的命令是什么？退役页越来越多说明什么？**
答：`nvidia-smi -q -d PAGES` 与 `nvidia-smi --query-retired-pages=timestamp,address,cause`。退役页快速增加说明**显存颗粒在持续损坏**，应尽快换卡（RMA）。

**7. `nvidia-smi -q -d TEMPERATURE` 里 Perf State 和 Clocks Throttle Reasons 各说明什么？**
答：Perf State 是当前性能档位（P0 最高、数字越大越低）；Clocks Throttle Reasons 列出**当前降频的原因**（SW/HW Thermal Slowdown、SW Power Cap、HW Power Brake 等），据此判断是散热问题还是功耗限制。

**8. 装完驱动后 nvidia-smi 报 "No devices were found"，按什么顺序排查？**
答：① `lsmod | grep nouveau` 查 nouveau 是否禁用；② 查 Secure Boot 是否拦截模块签名；③ `lsmod | grep nvidia` 查模块是否加载（`modprobe nvidia`）；④ 查 dmesg 看驱动与内核是否匹配。逐项排除后按 §8.4 重装。

**9. "CUDA driver version is insufficient" 是什么意思？**
答：应用需要的 CUDA 版本高于当前驱动支持（**驱动向后兼容、不向前兼容**）。解决：升级驱动（或让应用使用低版本 CUDA；容器内可用官方 CUDA Compatibility 方案）。

**10. 新卡验收至少要跑哪几项？**
答：nvidia-smi 识别 → deviceQuery 通过 → bandwidthTest 带宽接近理论 → gpu-burn 满载 30 分钟无 Xid → ECC 计数为 0 → 多卡拓扑与 P2P 验证 → 真实负载冒烟。缺一不可。

::: note 第 1 题提示
"显存 free 很多却 OOM"和"真不够"的区分核心看 `already allocated` 与 `reserved`：reserved 高、allocated 低 → 碎片/缓存池问题；两者都接近 total → 真不够。原理回到 [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/) 的 PyTorch 缓存分配器一节。
:::

::: tip 引出相关笔记
排查完故障，日常如何防患于未然：监控与告警见 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)；跑得慢但没报错属于性能问题，用 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/) 定位；如果换的是国产卡，排障命令和错误码体系完全不同，见 [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/)。路线总览回到 [GPU学习路线总览](/kb/os/GPU/00-GPU学习路线总览/)。
:::
