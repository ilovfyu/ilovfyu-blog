---
title: "GPU性能分析与Profiling工具"
permalink: /kb/os/GPU/12-GPU性能分析与Profiling工具/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU监控与运维实践", link: /kb/os/GPU/11-GPU监控与运维实践/ }
next: { text: "大模型训练推理GPU实践", link: /kb/os/GPU/13-大模型训练推理GPU实践/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
本章回答：**应用跑得慢，瓶颈到底在哪？怎么用工具把瓶颈找出来？** 学完你能：用 nsys 看全局时间线定位 CPU-GPU 串行化、memcpy 风暴与 kernel 间隙；用 ncu 深入单个 kernel 分析 SM/DRAM 吞吐、占用率与 Warp 停顿原因；用 PyTorch Profiler 剖析训练脚本并导出 trace；最后按一套 10 步工作流系统性地优化任意 CUDA/PyTorch 程序。
:::

上一章 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) 回答"卡用得好不好"（集群视角、粗粒度）；本章回答"**为什么不够快**"（单任务视角、细粒度）。两者互补：监控发现问题，Profiling 定位问题。本章的优化结论会反复呼应 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 的 Roofline、合并访存、占用率理论——工具就是用来验证理论的。

## 1. Profiling 分层

性能问题可能藏在四层，工具也按层分工：

```text
应用层（业务逻辑、API 调用耗时）      ← nsys / PyTorch Profiler / NVTX
   ↓
运行时层（cudaMemcpy、cudaLaunch、流与事件） ← nsys（CUDA API trace）、CUPTI
   ↓
Kernel 层（指令、访存、占用率、stall） ← ncu（微观）、CUPTI 计数器
   ↓
硬件计数器层（SM/DRAM 吞吐、管线利用率） ← ncu、DCGM（粗粒度）
```

| 层 | 问的问题 | 工具 |
|---|---|---|
| 应用层 | 哪段业务代码慢？CPU 在等什么？ | nsys、NVTX、PyTorch Profiler |
| 运行时层 | cudaMemcpy 多不多？launch 开销大不大？ | nsys、CUPTI |
| Kernel 层 | kernel 内部访存/指令/占用率如何？ | ncu |
| 硬件层 | SM 吞吐多少？DRAM 喂饱没有？ | ncu、DCGM |

::: important 用对工具：先全局后局部
别一上来就 ncu 抠 kernel——**先 nsys 看全局**：时间都花在 memcpy 还是 kernel 上？CPU 和 GPU 有没有重叠？等确认"瓶颈在某个 kernel"之后，再 ncu 深入。90% 的问题（memcpy 过多、CPU 提交慢、串行化）在 nsys 一层就能定位。
:::

## 2. 工具家族图

```text
nvprof（CUDA 8–10 时代的老工具，已废弃，CUDA 11 起移除）
  │
  ├──► Nsight Systems（nsys）        系统级时间线：CPU/GPU 全景
  ├──► Nsight Compute（ncu）         kernel 级微观分析：指令/访存/占用率
  ├──► Nsight Graphics               DX/Vulkan 图形与光追分析
  ├──► Nsight Visual Studio / CLI    嵌入 VS 或命令行
  └──► CUPTI（库，不是工具）         上述所有工具与 PyTorch Profiler 的底层
```

- **版本对应**：CUDA Toolkit 11.x 起不再自带 nvprof；nsys / ncu 随 CUDA Toolkit 安装（`/usr/local/cuda/bin/`），也可从 NVIDIA 官网（Nsight 系列页）单独下载更新版本；
- nvprof 早已废弃：**新代码一律用 nsys + ncu**，文档与示例也以两者为准。

## 3. Nsight Systems（nsys，重点）

**定位**：全局时间线。回答"时间都花在哪"——CUDA API 调用、kernel 执行、memcpy、CPU 线程活动全部画在一张时间线上，一眼看出 CPU 与 GPU 是否重叠、gap 在哪。

### 3.1 核心命令

```bash
# 最简用法：跑一遍程序，生成 out.nsys-rep
nsys profile -o out ./app

# 文本汇总：CUDA API / GPU Kernel / memcpy 的调用次数与耗时排序
nsys stats out.nsys-rep

# 指定 trace 范围 + 用 cudaProfilerStart/Stop 控制采集窗口（跳过初始化）
nsys profile --trace=cuda,nvtx,osrt -c cudaProfilerApi -o out ./app

# 附带 GPU 硬件计数器（SM 频率、利用率曲线，需权限）
nsys profile --gpu-metrics-device=all -o out ./app

# Python 程序直接包
nsys profile -o out python train.py
```

::: tip 常用技巧
`nsys stats` 输出三类汇总表：**CUDA API 汇总**（哪个 API 耗时最长、调用最多）、**GPU Kernel 汇总**（Top kernel 总耗时与平均时长）、**Memcpy 汇总**（D2H/H2D 传输量与次数）。先看这三张表，热点直接浮出水面。GUI 里打开 `.nsys-rep` 文件看时间线最直观。
:::

### 3.2 时间线怎么看

```text
时间 ──────────────────────────────────────────────────────►
CPU 线程行:  [--forward--][--loss--][--backward--][--step--]
CUDA API 行: [launch][launch][cudaMemcpy D2H ██████████████]
GPU 行:      [ kernel A ][ kernel B ][ kernel C ]
                     ▲              ▲
              CPU 提交 kernel A     CPU 在等 memcpy 完成（GPU 空转）
```

| 现象 | 含义 | 行动 |
|---|---|---|
| GPU 行大片空白、CPU 行忙碌 | CPU 瓶颈：GPU 等 CPU 喂数据 | 优化数据加载/预处理，多 stream 预取 |
| GPU 行忙碌、CUDA API 行有长条同步块 | 同步阻塞：`.item()`/`.cpu()`/cudaDeviceSynchronize | 去掉隐式同步，改异步 |
| 大量 memcpy D2H/H2D | 数据搬运过多 | 减少 CPU-GPU 往返，见第 7 节 |
| kernel 之间小间隙 | launch 开销 | CUDA Graphs / 减少 host 逻辑 |
| 两个 kernel 并行不重叠 | 没用到 stream | 多 stream 并发 |

::: warning 看时间线先找"空"
优化的第一目标不是"kernel 更快"，而是**填满 GPU 的空闲**。时间线上 GPU 行的空白 = 白花花的性能损失。先消除 gap，再考虑 kernel 微观优化。
:::

### 3.3 NVTX 打点：把业务语义画进时间线

裸的时间线只有 kernel/API，看不清"这一段是 forward 还是 dataloader"。用 NVTX 给代码段命名：

```cpp
#include <nvtx3/nvToolsExt.h>
nvtxRangePush("forward");      // 开始一个命名区间
// ... 前向代码 ...
nvtxRangePop();                // 结束
```

Python（PyTorch 里用 torch.cuda.nvtx）：

```python
import torch
torch.cuda.nvtx.range_push("dataloader")
# ... 取数据 ...
torch.cuda.nvtx.range_pop()
```

nsys 里（`--trace=nvtx` 或默认）这些区间会显示为彩色块，业务耗时占比一目了然。

::: note torch.profiler 与 NVTX 的关系
`torch.profiler.record_function("xxx")` 本质就是在 Python 侧打 NVTX 区间，nsys 同样能看到。所以训练脚本里不用额外埋点，用 record_function 即可让 nsys 时间线带业务语义。
:::

### 3.4 典型应用场景

1. **找串行化**：CPU 与 GPU 是否重叠；GPU 是否频繁空转等 CPU；
2. **找 memcpy 过多**：每 step 几次 D2H/H2D？传输量多大？
3. **找 kernel 间隙**：launch 开销 vs 计算时间的比例；
4. **快速对比**：改代码前后各跑一次 nsys stats，对比 kernel/memcpy 总时间。

## 4. Nsight Compute（ncu，重点）

**定位**：单个 kernel 的"显微镜"。回答"这个 kernel 为什么慢"——SM 吞吐、DRAM 吞吐、占用率、Warp 停顿原因、访存合并情况。

### 4.1 核心命令

```bash
# 全套指标（最常用），生成 out.ncu-rep 后用 GUI 看
ncu --set full -o out ./app

# 只取两个关键吞吐指标（轻量、快）
ncu --metrics sm__throughput.avg.pct_of_peak_sustained_elapsed, \
      dram__throughput.avg.pct_of_peak_sustained_elapsed ./app

# 指定 section
ncu --section SpeedOfLight --section Occupancy --section MemoryWorkloadAnalysis ./app

# 只看第 3 次启动的 matmul kernel（跳过前 2 次预热）
ncu --kernel-name matmul --launch-skip 2 --launch-count 1 ./app

# Python 程序
ncu --set full -o out python train.py
```

::: warning ncu 的两个前提
① 需要访问硬件性能计数器：多数系统要 root，或设置 `sysctl kernel.perf_event_paranoid=-1`；② ncu 默认会**重放 kernel**（replay 模式），程序会慢几个数量级——只用于 profiling 单 kernel，不要拿它跑完整训练。
:::

### 4.2 Speed of Light：判断 compute bound 还是 memory bound

```
Compute (SM) Throughput:  95%   ← SM 几乎打满 → compute bound
Memory Throughput (DRAM): 30%   ← 显存带宽没用满
```

| SOL 读数 | 结论 | 方向 |
|---|---|---|
| SM 高、DRAM 低 | **Compute bound** | 减少计算量（算法/精度）、提高 ILP |
| SM 低、DRAM 高 | **Memory bound** | 提高访存效率（合并、缓存复用、减少传输） |
| 两者都低 | 延迟受限/依赖链/并行度不足 | 提占用率、藏延迟 |
| 两者都高 | 接近理论极限 | 已到 roofline 上限，考虑换算法/换卡 |

::: tip 对应 Roofline
"SM 高还是 DRAM 高"正是 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 里 Roofline 模型的实践版：`ncu --section Roofline` 会自动算出 kernel 的计算强度（FLOP/Byte）并画出在 roofline 图上的位置——点在斜线区 = 带宽瓶颈，在水平区 = 算力瓶颈。**先看 SOL，再决定往哪个方向用力。**
:::

### 4.3 Occupancy 与 Warp Stall

**Achieved Occupancy**：实际活跃 warp 数 / 理论最大。低占用率意味着没多少 warp 可切换，访存延迟藏不住：

| 指标 | 偏低原因 | 对策 |
|---|---|---|
| Achieved Occupancy 低 | block 太小、寄存器用量过大、共享内存过多 | 调 block 大小；`__launch_bounds__(maxThreadsPerBlock, minBlocksPerSM)` 限制寄存器；减共享内存 |

**Warp Stall 原因**（ncu 会按占比列出等待原因，前几项就是瓶颈）：

| Stall 原因 | 含义 | 对策 |
|---|---|---|
| `long scoreboard` | 等**显存**返回（访存延迟） | 提高占用率藏延迟、合并访存、减少访存次数 |
| `short scoreboard` | 等**共享内存** | 减少共享内存访问、消除 bank 冲突 |
| `wait` | 等固定延迟指令（如浮点除法） | 换指令（`__fdividef`）、算法层面 |
| `mio throttle` | 访存指令在 MIO 队列排队 | 减少访存指令数（向量化 float4） |
| `barrier` | 等 `__syncthreads()` | 减少同步、合并阶段 |
| `math pipe throttle` | 算力管线排队 | 算力已打满（与 SOL 互证） |
| `not selected` | 调度器选了别的 warp（**正常现象**） | 无需处理 |

::: important 不要迷信"消除所有 stall"
`not selected` 是正常调度开销，占比高说明占用率健康；真正要盯的是 `long scoreboard`（访存）和 `barrier`（同步）这类"真等待"。**stall 分析要和 SOL 对着看**：SM 打满时的 math throttle 是"好事"，说明算力用上了。
:::

### 4.4 Memory Workload Analysis

```bash
ncu --section MemoryWorkloadAnalysis ./app
```

- **Sector Efficiency / 合并访问比例**：低说明访存不合并（相邻线程没访问相邻地址），典型原因是索引布局不对——对照 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 的合并访存小节改索引/数据布局；
- **L2 Hit Rate**：低说明数据复用差，考虑共享内存缓存或调整访问顺序；
- **共享内存 Bank Conflict**：冲突会让一次访问拆成多次，ncu 直接给冲突计数——padding 一行即可解决。

### 4.5 指令统计

`ncu --section InstructionStats`：看指令类型分布。浮点/访存/控制流指令占比，能快速发现"非计算指令吃掉了吞吐"（如地址计算过多、`printf` 混入 kernel）。

## 5. CUPTI

**CUPTI（CUDA Profiling Tools Interface）** 是 NVIDIA 官方的底层 Profiling 库，随 CUDA Toolkit 发布（CUDA 12 起并入安装，位于 `/usr/local/cuda/extras/CUPTI`）：

- **Activity API**：异步记录 CUDA API 调用与 GPU 事件（kernel 起止、memcpy 起止）；
- **Callback API**：在 CUDA API 调用前后插入回调；
- **性能计数器/事件查询**：读取 SM、内存等硬件计数器。

工具与框架基于它的方式：Nsight Systems/Compute、PyTorch Profiler、TensorBoard Profiler、TAU 等全部在 CUPTI 之上构建。**版本绑定**：CUPTI 的 API 与 CUDA 版本严格对应（libcupti 随对应 CUDA Toolkit 分发），跨版本混用会报错。

::: note 什么时候直接碰 CUPTI
99% 的场景用 nsys/ncu 即可；只有要写**自定义 profiling 工具**（采集自己的事件流、与自家平台集成）时才需要直接调 CUPTI API。
:::

## 6. PyTorch Profiler（重点）

训练场景最常用的剖析入口，底层就是 CUPTI + NVTX。

### 6.1 完整示例

```python
import torch
from torch.profiler import profile, ProfilerActivity, schedule, tensorboard_trace_handler

def train_step():
    # 一个常规训练步：前向、损失、反向、优化器
    ...

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    schedule=schedule(wait=1, warmup=1, active=3, repeat=2),   # 见下方解释
    on_trace_ready=tensorboard_trace_handler("./logs"),        # 输出到 TensorBoard
) as prof:
    for step in range(20):
        train_step()
        prof.step()          # 必须每步调用：推进 schedule 状态机

# 1) 表格：按 CUDA 时间排序
print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=20))

# 2) Chrome trace：导出后拖进 chrome://tracing 或 Perfetto
prof.export_chrome_trace("trace.json")

# 3) 按 kernel 名聚合
print(prof.key_averages(group_by_input_shape=True).table(sort_by="cuda_time_total", row_limit=10))
```

**schedule 参数**（为什么是 `wait, warmup, active, repeat`）：

```text
step:  0   1   2   3   4   5   6   7   8   9 ...
       [wait=1][warmup=1][ active=3 ][wait][warmup][active]...
       跳过      丢弃     采集        ↑ repeat=2 再循环一轮
```

| 参数 | 作用 |
|---|---|
| `wait` | 前 N 步不采集（跳过初始化/缓存预热阶段，那些数据没参考价值） |
| `warmup` | 开始采集但**丢弃**（profiler 自身有开销，warmup 让开销稳定） |
| `active` | 真正保留数据的步数 |
| `repeat` | 上述周期重复次数 |

### 6.2 表格怎么读

`key_averages().table(sort_by="cuda_time_total")` 的列：`Self CPU time`（CPU 侧自身耗时）、`CUDA total`（含子 op）、`Self CUDA time`（GPU 侧自身耗时）、`# of Calls`。**先看 Self CUDA time 最大的 op**——那是 GPU 上的真热点；再看 `Self CPU` 大的 op——那是 CPU 侧瓶颈（可能阻塞 GPU）。

### 6.3 导出与可视化

```bash
# TensorBoard：启动后打开 http://localhost:6006 的 Profiler 页
tensorboard --logdir ./logs

# Chrome trace：浏览器打开 chrome://tracing（或 ui.perfetto.dev）加载 trace.json
# 能看到和 nsys 类似的 CPU/GPU 时间线，PyTorch 各 op 已按名称标好
```

::: tip Tensor Core 利用率怎么看
① profiler 表格里看 `aten::cuda_*` 与 matmul/conv 类 op 的占比（AI 负载热点应是 GEMM）；② 更精确用 `torch.profiler` 的 breakdown 或 ncu 看 `sm__pipe_tensor_*` 系列指标（Tensor Core 管线活跃度）；③ 训练脚本里 `torch.backends.cuda.matmul.allow_tf32` 等精度设置也会影响是否真正走 Tensor Core。
:::

## 7. 常见瓶颈模式库

| 现象（在 nsys/ncu 里看到） | 根因 | 对策 |
|---|---|---|
| memcpy 密集：每步大量 D2H/H2D | 数据反复在 CPU-GPU 间搬运 | 减少往返（后处理留在 GPU）；用 pinned memory 加速拷贝；流式分块处理 |
| kernel 间隙大：GPU 行大量空白 | CPU 提交慢 / launch 开销 / 隐式同步 | 异步 API、多 stream 预取、CUDA Graphs 固化启动序列、去掉 `.item()`/`.cpu()` |
| Achieved Occupancy 低 | block 太小 / 寄存器或共享内存超用 | 调 block 大小；`__launch_bounds__`；`maxrregcount`（见 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/)） |
| Sector Efficiency 低（访存未合并） | 线程-数据索引错位 | 改索引/数据布局，让相邻线程访问相邻地址 |
| Bank Conflict 多 | 共享内存访问模式冲突 | 数组 padding（`+1` 列） |
| 小 kernel 过多 | 每层一个 kernel，launch 占比高 | kernel 融合、persistent kernel、算子融合（torch.compile / CUDA Graph） |
| SOL 双低（SM 和 DRAM 都闲） | 延迟受限：依赖链长、并行度不足 | 提占用率、拆解长依赖链、提高 ILP |

::: important 一次只改一个变量
优化最忌"同时改三处"——改了不知道哪个起作用。每轮只动一个因素（batch、block 大小、访存布局……），用同样的 profiling 手段复测对比。**优化是循环，不是一次性的。**
:::

## 8. 实操流程：10 步 Profiling 工作流

```text
① 定目标与基线 ──► ② nsys 全局采集 ──► ③ 看时间线（重叠/gap/memcpy）
                                             │
     ⑩ 记录、迭代 ◄── ⑨ 复测对比 ◄── ⑧ 改代码 ◄── ⑦ 形成假设 ◄── ⑥ ncu 单 kernel ◄── ⑤ 定热点
        （直到达标或      （nsys/ncu      （一次一个变量）      （SOL/占用率/stall/访存）     （GPU 时间最大
          到 roofline）   重跑）                                             的 kernel）
```

1. **定目标与基线**：明确"快多少算达标"；不改代码先跑一次全流程计时；
2. **nsys 全局采集**：`nsys profile -o base ./app`，覆盖完整运行；
3. **看时间线**：CPU-GPU 是否重叠？gap 在哪？memcpy 多不多？NVTX 区间标注业务阶段；
4. **看 stats 汇总**：`nsys stats` 按耗时排 Top kernel 与 memcpy；
5. **定热点 kernel**：GPU 时间占比最大的 kernel（一般前 1–3 个占 80%+）；
6. **ncu 单 kernel 微观分析**：`ncu --set full -o k1 ./app`（可 `--kernel-name`/`--launch-skip` 定位）；
7. **解读指标**：SOL（compute/memory bound）→ Occupancy → Warp Stall → Memory Workload；
8. **形成假设并改代码**：一次只改一个变量（见第 7 节模式库）；
9. **复测对比**：同样的 nsys/ncu 命令重跑，对比 kernel 时间/利用率变化；
10. **记录与迭代**：记录每轮改动与收益，直到达标或逼近 roofline 上限。

::: tip 收尾检查
优化完成后用 `nsys` 再确认**没有引入新的串行化**（比如为了优化把 memcpy 从 2 次变 5 次就得不偿失）。最终报告应包含：瓶颈是什么（一句话）、改动清单、每项收益、剩余理论空间。
:::

## 9. 本章小结

- 按层选工具：应用/运行时层用 **nsys**（全局时间线），kernel 层用 **ncu**（微观指标），两者底层都是 **CUPTI**；nvprof 已废弃；
- nsys 三件事：找 CPU-GPU 不重叠、找 memcpy 风暴、找 kernel 间隙；用 NVTX/record_function 给时间线加业务语义；
- ncu 四组指标：**SOL**（compute/memory bound）、**Occupancy**（并行度够不够）、**Warp Stall**（等什么）、**Memory Workload**（访存效率）——与 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 的 Roofline 一一对应；
- PyTorch Profiler：`schedule(wait, warmup, active, repeat)` + `key_averages().table()` + chrome trace/TensorBoard；
- 常见瓶颈有套路可查（memcpy 多、间隙大、占用率低、访存未合并、bank 冲突、小 kernel 多）；
- 10 步工作流：全局 → 局部 → 假设 → 单变量修改 → 复测，循环收敛。

::: tip 引出下一章
会剖析、会优化之后，下一章把这些能力用在最大的场景上：[大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)——显存怎么估算、ZeRO/FSDP 怎么省显存、NCCL 多卡通信怎么调、vLLM 推理怎么把吞吐拉满。剖析工具将成为你调大模型的第一双手。
:::

## 10. 自测题

**1. nsys 和 ncu 的定位区别？什么场景用哪个？**
答：nsys 是系统级时间线（CPU/GPU 全景、API、memcpy），回答"时间花在哪、有没有重叠"；ncu 是 kernel 级显微镜（SOL、占用率、stall、访存），回答"这个 kernel 为什么慢"。先 nsys 全局定位，确认瓶颈在某个 kernel 后再 ncu 深入。

**2. nsys 时间线上 GPU 行大片空白、CUDA API 行有长条同步块，说明什么问题？怎么解决？**
答：说明 CPU 与 GPU 没重叠——要么 CPU 提交太慢（GPU 空等），要么有隐式同步（`.item()`/`.cpu()`/cudaDeviceSynchronize）阻塞。对策：异步 API、多 stream 预取、去掉强制同步、必要时 CUDA Graphs。

**3. ncu 的 Speed of Light 显示 SM 吞吐 95%、DRAM 吞吐 30%，这是什么 bound？优化方向？**
答：Compute bound（算力打满、带宽没吃满）。方向：减少计算量（算法/精度如 TF32）、提高指令级并行（ILP）、考虑换低精度；不要再优化访存，那是浪费力气。反之 SM 低 DRAM 高是 Memory bound，应优化访存合并与数据复用。

**4. Warp stall 的 `long scoreboard` 是什么意思？怎么缓解？**
答：warp 在等待**显存访问返回**（访存延迟无法被当前指令流掩盖）。缓解：提高占用率（更多 warp 可切换来藏延迟）、合并访存减少事务数、减少每线程访存次数（向量化/缓存复用）。

**5. Achieved Occupancy 只有 20%，最可能的原因与对策？**
答：block 太小（grid 总线程不足）、寄存器用量过大、或共享内存超限。对策：增大 block 或 grid；用 `__launch_bounds__` 限制每线程寄存器；减少共享内存申请。

**6. `torch.profiler` 里 `schedule(wait=1, warmup=1, active=3, repeat=2)` 的含义？为什么不能省略 wait/warmup？**
答：前 1 步不采集（跳过初始化），再 1 步 warmup（采集但丢弃，稳定 profiler 自身开销），随后 3 步真正保留数据，整个周期重复 2 轮。省略 wait 会把初始化阶段的假热点采进来；省略 warmup 会导致前几步数据被 profiler 开销污染。

**7. 如何把 PyTorch Profiler 结果可视化？写出两种方式。**
答：① `on_trace_ready=tensorboard_trace_handler("./logs")` + `tensorboard --logdir ./logs`，浏览器打开 Profiler 页；② `prof.export_chrome_trace("trace.json")`，用 chrome://tracing 或 ui.perfetto.dev 打开查看 CPU/GPU 时间线。

**8. CUPTI 是什么？哪些工具基于它？为什么版本要和 CUDA 严格对应？**
答：CUPTI 是 NVIDIA 官方的 Profiling 接口库（Activity/Callback API + 性能计数器），nsys、ncu、PyTorch Profiler、TensorBoard 都基于它。它随 CUDA Toolkit 发布，API 与 CUDA 版本绑定（libcupti 与 CUDA 同版本分发），混用跨版本会报错。

**9. 一个训练脚本每步有大量小 memcpy 和 kernel 间隙，按 10 步工作流你会怎么优化？（给出前 5 步）**
答：① 定目标与基线（记录每步耗时）；② `nsys profile` 采集；③ 看时间线：确认 memcpy D2H/H2D 次数、kernel 间隙大小、CPU-GPU 重叠情况；④ `nsys stats` 量化 memcpy 与 launch 占比；⑤ 定热点：若 memcpy 占比高 → 减少往返/用 pinned memory；若间隙大 → 去隐式同步、多 stream，或上 CUDA Graphs。

**10. SOL 显示 SM 和 DRAM 都低（双低），说明什么？和"都高"分别怎么办？**
答：双低 = 延迟受限：并行度不足或依赖链太长，warp 都在等，算力和带宽都没喂饱 → 提占用率、拆依赖链、提高 ILP。双高 = 已接近 roofline 上限 → 微调空间有限，考虑换算法（如 flash attention 类）、换精度或换硬件。

::: note 第 3、10 题提示
这两题是 Roofline 思想的直接应用：**看"哪个资源先到顶"**。SM 到顶 → 算力瓶颈；DRAM 到顶 → 带宽瓶颈；都没到顶 → 别急着优化硬件利用率，先解决"并行度/延迟"问题。理论细节回看 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 的 Roofline 一节。
:::
