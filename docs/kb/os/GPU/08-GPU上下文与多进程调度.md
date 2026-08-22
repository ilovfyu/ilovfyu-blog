---
title: "GPU上下文与多进程调度"
permalink: /kb/os/GPU/08-GPU上下文与多进程调度/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU内存管理与显存分配", link: /kb/os/GPU/07-GPU内存管理与显存分配/ }
next: { text: "GPU虚拟化与MIG技术", link: /kb/os/GPU/09-GPU虚拟化与MIG技术/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
上一章讲了显存怎么分配（[GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)）。但一块 GPU 常常被多个进程同时使用：训练任务、推理服务、开发调试并存。本章回答：**"上下文"到底是什么？多个进程怎么共享一块 GPU？时间切片、MPS、MIG 各有什么取舍？** 学完本章，你能解释"为什么我的 kernel 被别人的 kernel 拖慢"、"多进程 OOM 互踢"等线上常见问题。
:::

## 1. CUDA Context 概念

### 1.1 上下文 = 进程在 GPU 上的"PCB"

**CUDA Context（CUDA 上下文）**是进程在一张 GPU 上拥有的**资源集合**，类比 CPU 世界里进程的 PCB（进程控制块）：

| 资源 | 说明 |
|---|---|
| 地址空间 | 设备内存的虚拟地址映射（显存指针的归属） |
| 模块（Module） | 加载的 cubin/PTX 代码与 kernel 函数句柄 |
| Streams | 执行流（命令队列） |
| 事件（Event） | 时间戳/同步原语 |
| 资源句柄 | 纹理、表面、图（graph）等 |

关键事实：

- **每个进程、每张 GPU，都有一个独立上下文**；同进程内不同线程默认共享主上下文；
- 运行时 API（`cudaMalloc`/`cudaLaunchKernel` 等）自动使用**主上下文（primary context）**——驱动在首次调用时隐式创建，无需手动管理；
- 驱动 API 可显式管理：`cuCtxCreate` 创建、`cuCtxSetCurrent`/`cuCtxPushCurrent` 切换当前上下文；
- 上下文之间**地址空间隔离**：进程 A 的指针在进程 B 里没有意义（除非 IPC，见 [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)§7）。

::: tip 一个直观类比
上下文 ≈ 进程在 GPU 侧的"内存 + 句柄表"。CPU 进程的一切（代码段、堆、栈、fd 表）在 GPU 侧都有对应物，只是由驱动管理而不是 OS 管理。
:::

### 1.2 上下文生命周期

```text
进程启动 → 首次 CUDA 调用 → 驱动创建 primary context（加载驱动、分配上下文显存开销）
         → 使用（分配/launch/同步）
         → 进程退出 → 驱动销毁 context，回收其全部显存与句柄
```

::: warning 上下文有"入场费"
创建 primary context 要初始化设备、建立映射，通常耗时**几十到几百毫秒**，并占用少量显存（几 MB 到几十 MB）。所以推理服务常复用常驻进程而不是每次请求新起进程；容器反复启停也是这个开销。
:::

## 2. 上下文切换成本

GPU 上的"上下文切换"发生在驱动把 GPU 从一个进程的工作切到另一个进程时，代价远高于 CPU：

| | CPU 上下文切换 | GPU 上下文切换 |
|---|---|---|
| 保存内容 | 寄存器、页表基址、栈指针 | 整个 GPU 状态：地址映射（TLB）、L2 缓存状态、在飞 kernel |
| 典型耗时 | 微秒级（~1-10µs） | 毫秒级，且要等 GPU 到可抢占点 |
| 频率 | OS 调度器任意切 | 驱动在 kernel 边界/抢占点切 |
| 后果 | 命中率高，成本可控 | TLB 全失效、L2 被冲刷，后续 kernel 冷启动 |

开销来源：

1. **TLB/页表失效**：不同 context 的显存映射不同，切换后地址翻译缓存全部作废；
2. **L2 缓存失效**：L2 是 GPU 缓存的一致性点，切换后缓存内容对下一个 context 无意义（MIG 通过 L2 分区缓解，见 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)）；
3. **映射重建**：GPU 的 MMU 需要重新装载新 context 的页表；
4. **同步等待**：若当前 kernel 不可抢占，新 context 必须等它跑完（或到抢占点）。

::: important 这就是为什么要 MPS/MIG
时间切片模式下一旦进程多，切换开销与缓存冷启动会被放大——MPS 通过"少切"、MIG 通过"物理隔离"分别缓解这两个问题。
:::

## 3. 多进程共享 GPU 的四种方式全景

| 方式 | 隔离级别 | 性能 | 部署成本 | 典型场景 |
|---|---|---|---|---|
| **时间切片**（默认） | 无（地址空间隔离，资源不隔离） | 有切换开销，kernel 可能被抢占 | 零 | 多任务共享一张卡、开发调试 |
| **MPS** | 无（显存不隔离），地址空间部分共享 | 高吞吐，减少切换，可并发 kernel | 低（一个守护进程） | 多进程小模型推理、批量小任务 |
| **MIG** | 硬件级（显存/L2/带宽分区） | 接近独占，无切换开销 | 中（需配置、仅数据中心卡） | 多租户生产隔离、SLA 保障 |
| **vGPU** | 管理程序级（显存/时间片隔离） | 视 profile 而定 | 高（需 vGPU 许可） | 虚拟桌面、VM 场景 |

时间切片与 MPS 是**软件共享**（一块 GPU 分时/分调度给多个进程），MIG 与 vGPU 是**资源切分**（物理上把 GPU 分成多份）。本章展开时间切片与 MPS，MIG/vGPU 在 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) 详述。

## 4. 时间切片（Time Slicing）

### 4.1 默认行为

驱动默认按**时间片**在多个进程的 kernel 之间轮转：

```text
进程 A 的 kernel:  ██████████████░░░░░░██████████████░░░░░░
进程 B 的 kernel:  ░░░░░░░░████████████░░░░░░░░████████████
                 └──── 时间片 ────┘
                 每个时间片内，GPU 工作调度器切换执行
```

- 切换发生在 kernel 边界或**抢占点**（见 §5）；
- 只要驱动在工作，任何进程的 kernel 都能获得执行机会——GPU 利用率最大化；
- 对应用透明：进程不知道自己在被共享（`cudaDeviceSynchronize` 只是等自己的 kernel）。

### 4.2 缺点

| 缺点 | 说明 |
|---|---|
| 切换开销 | 上下文切换的 TLB/L2 开销摊在每个时间片边界 |
| 缓存冷启动 | 切换后第一个 kernel 的 L2 命中率低，等效性能下降 |
| 不公平 | 长 kernel 会压制短任务；默认 compute mode 共享，谁也抢不过谁 |
| 延迟不可控 | 无法保证"我每 10ms 必须跑一次"，不适合硬实时/低延迟推理 |

::: note 观察方法
`nvidia-smi` 的 `Volatile GPU-Util` 是整卡聚合利用率。多进程时间切片时它可能显示 ~100%，但你的进程实际只分到一部分——按进程看用 `nvidia-smi --query-compute-apps=pid,used_memory --format=csv` 或 DCGM（[GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)）。
:::

## 5. 抢占（Preemption）

时间切片能否"打断正在跑的 kernel"，取决于抢占能力：

- **Graphics preemption**（Kepler 起）：在图形管线阶段边界抢占（如 draw call 之间），对图形任务够用；
- **Compute preemption**（Pascal 起）：**指令级**抢占——在 kernel 指令流中间保存/恢复执行状态，计算任务可被细粒度打断；
- Volta 及之后进一步降低抢占开销、支持更细粒度（SM 子分区级）抢占，Turing/Ampere 延续；
- 抢占的代价：被抢占 kernel 的状态要保存（寄存器/共享内存/缓存），恢复后继续执行，有一定性能损耗；驱动默认启用。

::: tip 一句话
抢占让"长 kernel"不至于饿死其他进程，是时间切片能落地的前提；但抢占本身有成本，频繁抢占会拖低总吞吐——这也是 MPS/MIG 存在的意义。
:::

## 6. MPS（Multi-Process Service）

### 6.1 原理与架构

MPS 在**用户态**加一个代理进程（MPS server），让多个 client 进程的 CUDA 调用集中提交：

```text
   client 1 ─┐                    ┌─> 同一驱动/上下文侧
   client 2 ─┼─(Unix socket)──> MPS server ──> CUDA 驱动 ──> GPU
   client 3 ─┘    CUDA_MPS_PIPE_DIRECTORY      (内核态)
```

- client 的 `cudaLaunchKernel`/拷贝等请求经 **Unix domain socket** 发给 server，server 统一向驱动提交；
- 好处：**多个 client 的 kernel 可以同时驻留 GPU**（并发 kernel），SM 被填得更满；进程间不再频繁做 GPU 上下文切换；
- 早期版本所有 client 共享同一地址空间（指针可直接互通），也带来安全隐患（CVE-2018-6260）；Volta 起地址空间隔离，指针共享受限；
- **显存仍不隔离**：所有 client 共享整卡显存，一个 client 吃光显存，其他 client 会 `cudaErrorMemoryAllocation`。

### 6.2 启用方式

```bash
# 1. 启动 MPS server（守护进程）
export CUDA_MPS_PIPE_DIRECTORY=/tmp/nvidia-mps
mkdir -p $CUDA_MPS_PIPE_DIRECTORY
nvidia-cuda-mps-control -d

# 2. client 进程同样设置该环境变量后启动即可自动接入
export CUDA_MPS_PIPE_DIRECTORY=/tmp/nvidia-mps
python train.py ...

# 3. 检查/关闭
echo "get_server_list" | nvidia-cuda-mps-control   # 查看 server 与 client
echo quit | nvidia-cuda-mps-control                # 关闭 server
```

::: warning 常见坑
- client 与 server 的 `CUDA_MPS_PIPE_DIRECTORY` 必须一致；
- 容器里跑 MPS 要共享该目录并保证权限（见 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）；
- MPS server 是**单点**：server 崩溃则所有 client 的 GPU 工作中断；
- 老驱动上建议配合 `nvidia-smi -c EXCLUSIVE_PROCESS` 使用，避免其他进程干扰。
:::

### 6.3 MPS vs 时间切片

| | 时间切片 | MPS |
|---|---|---|
| kernel 执行 | 时间片轮转，近似串行 | 并发驻留 SM，可真正重叠 |
| 上下文切换 | 每次切换都有 | 几乎没有（经 server 统一提交） |
| 显存隔离 | 无 | 无 |
| 适用 | 通用默认 | 多进程小模型推理、吞吐优先 |

::: tip 一句话
MPS ≈ 把"多个进程"伪装成"一个进程的多个流"去提交工作，从而吃到并发 kernel + 低切换的红利；代价是显存不隔离 + 单点。
:::

## 7. MIG 一句话定位

**MIG（Multi-Instance GPU）**把一块物理 GPU 硬件级切成多个独立实例，每个实例有独占的显存切片、L2 分区与 SM 分区，进程之间**零切换开销、零干扰**。它是生产多租户的首选，但仅限数据中心卡。详见 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)。

## 8. 多 GPU 与 P2P

### 8.1 P2P 访问

同一节点多卡之间可以直连互访：

```c
int can = 0;
cudaDeviceCanAccessPeer(&can, currentDev, peerDev);   // 查询是否支持
if (can) cudaDeviceEnablePeerAccess(peerDev, 0);      // 启用后本进程可直接解引用 peer 显存指针
// 用完 cudaDeviceDisablePeerAccess(peerDev)
```

- 物理互连：**NVLink**（GPU↔GPU 高速互联，双向带宽数百 GB/s，远高于 PCIe 的 ~32-64GB/s）或 PCIe；
- 在 UVA 下，启用 peer access 后指针跨卡直接可用，`cudaMemcpyPeer` 也走最快路径；
- 多卡训练依赖 P2P（NCCL 的 ring/tree 算法），详见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)。

### 8.2 CUDA_VISIBLE_DEVICES 与逻辑编号

```bash
# 机器上有 4 张卡（物理 0-3），只让进程看到第 2、3 张
export CUDA_VISIBLE_DEVICES=2,3
# 进程内 torch.cuda.device_count() == 2，逻辑编号为 0,1
# 逻辑 0 → 物理 2；逻辑 1 → 物理 3
```

::: warning 逻辑编号的坑
1. 进程内看到的编号是**按可见列表重新编号**的（从 0 开始），与物理编号无关；
2. 多进程场景（如 DataLoader worker、NCCL）中，各进程要**用相同的 `CUDA_VISIBLE_DEVICES` 顺序**，否则同一 rank 可能映射到不同物理卡，导致数据错位/死锁；
3. 用 `nvidia-smi` 看的是物理编号，对不上时先查环境变量；
4. `CUDA_VISIBLE_DEVICES` 也作用于容器（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/) 里 device plugin 就是靠它注入）。
:::

## 9. GPU 在 OS 中的定位：协处理器，不是调度单元

- GPU 是**协处理器/加速器**：它没有自己的"进程"概念，只有**命令队列**；一切工作由 CPU 发起；
- 典型执行模型：CPU 提交（launch）→ GPU 异步执行 → CPU 用 stream/event 同步：

```text
CPU:   submit kernel A ──┐
       submit copy   B ──┤  (异步，CPU 不等待)
       submit kernel C ──┘
GPU:   A ──> B ──> C   （按流内顺序执行）
CPU:   cudaStreamSynchronize / cudaDeviceSynchronize 等待完成
```

- 与 CPU 调度的对比：

| | CPU | GPU |
|---|---|---|
| 调度对象 | 线程/进程（OS 调度器） | kernel/命令（驱动调度器） |
| 抢占 | OS 时钟中断抢占 | 驱动在抢占点抢占（§5） |
| 上下文 | PCB/TCB（OS 管） | CUDA Context（驱动管） |
| 谁发起 | — | 永远由 CPU 发起 |

::: tip 异步是理解一切的钥匙
多进程"抢 GPU"抢的其实是**驱动调度器的时间与显存**，而不是 CPU 时间片。理解了这一点，`cudaDeviceSynchronize` 放在哪里、为什么推理服务要常驻进程，就都顺理成章了。
:::

## 10. 常见问题排查

### 10.1 多进程 OOM 互踢

显存**没有硬件隔离**（时间切片/MPS）时，任何进程都可能申请到把整卡吃光的程度：

```text
进程 A 吃光显存 → 进程 B 的 cudaMalloc 失败
  → 返回 cudaErrorMemoryAllocation (错误码 2)
  → PyTorch 报 "CUDA out of memory" / CUDA 报 "out of memory"
```

应对：给每个进程设显存上限（如限制 PyTorch 的 `reserved`）、用 MIG 切分（[GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)）、容器内存限制（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）。

### 10.2 残留进程占用显存

```bash
nvidia-smi                                  # 看 Processes 列的 PID 与占用
fuser -v /dev/nvidia*                       # 找谁在占用 GPU 设备文件
kill -9 &lt;pid&gt;                               # 杀残留进程（显存由驱动随 context 回收）
# 杀不掉/僵尸：确认不是 CUDA 测试进程，必要时重启驱动（生产慎用，见 [[14 GPU故障排查与问题定位]]）
```

::: note 进程退出后显存去哪了
进程退出时驱动销毁其 context 并回收显存；但 **zombie 进程、卡死进程、以及 driver 内部缓存**会导致 `nvidia-smi` 的 used 迟迟不降。先查 PID，再考虑驱动问题。
:::

### 10.3 compute-sanitizer

```bash
# 内存越界/未初始化/竞态检查（替代老 memcheck）
compute-sanitizer --tool memcheck ./my_app
compute-sanitizer --tool racecheck ./my_app   # 共享内存/全局内存竞态
```

用于定位"多进程/多流场景下的非法访问"类问题，配合 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/) 使用。

## 11. 本章小结

- CUDA Context = 进程在 GPU 上的资源集合（地址空间/模块/流/事件），运行时 API 自动用 primary context；
- GPU 上下文切换贵：TLB/L2/映射全失效，毫秒级，所以能少切就少切；
- 共享 GPU 四种方式：时间切片（默认，零成本但有切换开销）、MPS（代理提交，吞吐高、显存不隔离）、MIG（硬件切分，隔离最好）、vGPU（管理程序级）；
- 时间切片靠抢占（graphics/compute preemption）落地，Pascal 起指令级抢占；
- MPS：server 代理 + socket，并发 kernel、低切换；启用看 `CUDA_MPS_PIPE_DIRECTORY`；
- P2P + NVLink + UVA 实现多卡直连；`CUDA_VISIBLE_DEVICES` 重编号，多进程必须统一顺序；
- GPU 是协处理器，CPU 发起、GPU 异步执行；
- 多进程 OOM 互踢、残留进程、compute-sanitizer 是三大常见排查点。

::: tip 引出下一章
时间切片和 MPS 都是"软共享"——隔离靠自觉。要想真正把一块 GPU 切成互不干扰的几块，就需要硬件级的切分：[GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) 讲直通、SR-IOV、vGPU 与 MIG 的完整谱系。
:::

## 12. 自测题

**1. CUDA Context 类比 CPU 的什么？包含哪些资源？**
答：类比进程 PCB。包含设备地址空间（显存映射）、模块（kernel 代码）、streams、事件、纹理/图等资源句柄。每个进程每张 GPU 一个 context，运行时 API 自动使用 primary context。

**2. 为什么 GPU 上下文切换比 CPU 贵？**
答：切换要重建地址映射（TLB 失效）、冲刷 L2 缓存、装载新 context 页表，且要等 GPU 到可抢占点；CPU 切换只保存寄存器与页表基址，微秒级完成。GPU 切换毫秒级且带缓存冷启动代价。

**3. 时间切片、MPS、MIG 三者的隔离级别与适用场景？**
答：时间切片无隔离、零部署，适合多任务共享与调试；MPS 显存不隔离但吞吐高、kernel 并发，适合多进程小模型推理；MIG 硬件级隔离（显存/L2/带宽/SM 分区），适合多租户生产与 SLA 保障。

**4. 场景题：8 个容器各跑一个 1GB 的小模型推理服务，吞吐优先，选什么？**
答：MPS。8 个进程 kernel 并发驻留 SM，切换少、显存各 ~1GB 也放得下；时间切片会被切换开销拖累，MIG 可能不够切（且小模型用 MIG 浪费隔离粒度）。

**5. 场景题：两个租户共一张 A100，要求显存严格隔离、性能互不干扰，选什么？**
答：MIG。硬件级显存与 L2 分区，租户间零干扰、无切换开销；时间切片/MPS 无法保证隔离。

**6. 机器 4 张卡，`CUDA_VISIBLE_DEVICES=3,1` 后，进程内 device 0 和 1 对应物理几号？**
答：device 0 → 物理 3，device 1 → 物理 1。进程内按可见列表从 0 重新编号；用 `nvidia-smi` 对照时要换算回物理编号。

**7. MPS 为什么不隔离显存？一个 client 吃光显存会发生什么？**
答：MPS 只代理调度与提交，显存仍从整卡分配，所有 client 共享；一个 client 吃光后，其他 client 的 `cudaMalloc` 返回 `cudaErrorMemoryAllocation`（PyTorch 报 CUDA out of memory）。

**8. 指令级 compute preemption 从哪代开始？它让时间切片发生了怎样的变化？**
答：Pascal（GP100）起支持指令级 compute preemption，可以在 kernel 指令流中间保存/恢复状态，使长计算 kernel 也能被及时打断；Volta 及之后开销更低、粒度更细。此前（Kepler 的 graphics preemption）只能在图形阶段边界抢占。

**9. GPU 与 CPU 在"调度"上的本质区别？**
答：CPU 由 OS 调度线程/进程（时钟中断抢占、PCB 管理）；GPU 是协处理器，由驱动调度 kernel/命令，没有进程概念，一切工作由 CPU 发起、GPU 异步执行，CPU 用 stream/event 同步。

**10. 进程崩溃后 `nvidia-smi` 显存不释放，按什么顺序排查？**
答：1) `nvidia-smi` 看残留 PID；2) `fuser -v /dev/nvidia*` 定位占用者；3) `kill -9` 残留进程（驱动随 context 回收显存）；4) 仍不释放则怀疑驱动缓存或驱动异常，按 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/) 排查（必要时重置/重启驱动）。

::: note 提示
第 4、5 题是面试高频场景题。判断口诀：**隔离要求 → MIG/vGPU；吞吐要求 → MPS；啥都不要求 → 时间切片**。
:::
