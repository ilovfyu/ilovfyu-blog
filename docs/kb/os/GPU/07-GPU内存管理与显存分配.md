---
title: "GPU内存管理与显存分配"
permalink: /kb/os/GPU/07-GPU内存管理与显存分配/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU驱动与CUDA运行时栈", link: /kb/os/GPU/06-GPU驱动与CUDA运行时栈/ }
next: { text: "GPU上下文与多进程调度", link: /kb/os/GPU/08-GPU上下文与多进程调度/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
上一章讲了驱动与 CUDA 运行时栈的整体结构（[GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)），这一章把镜头对准"显存"这个最稀缺的资源：**`cudaMalloc` 到底在做什么？显存为什么会碎片化？为什么 PyTorch 显存"只增不减"？OOM 了怎么办？** 学完本章，你能看懂 `nvidia-smi` 的显存数字、读懂 PyTorch 缓存分配器的行为，并在显存不足时做出正确取舍。
:::

## 1. 显存分配 API 全览

先建立一张 API 地图。CUDA 提供多个入口分配内存，用途各不相同：

| API | 分配在哪 | 对齐/特性 | 典型用途 |
|---|---|---|---|
| `cudaMalloc` | 设备显存 | ≥256B 对齐，驱动堆分配 | 通用 GPU 缓冲 |
| `cudaFree` | 释放 `cudaMalloc` 内存 | 释放 | 与 `cudaMalloc` 配对 |
| `cudaMallocPitch` | 设备显存 | 行宽 pitch 自动对齐（常见 512B 级别），行内连续 | 2D 图像/矩阵，保证行对齐访存 |
| `cudaMalloc3D` | 设备显存 | 3D 带 pitch | 3D 体数据、卷积输入 |
| `cudaMallocManaged` | 托管内存（UVM） | CPU/GPU 统一寻址，按需迁移 | 免拷贝开发、显存溢出兜底 |
| `cudaMallocAsync` | 设备显存（内存池） | 流序分配，可池化复用 | 高频分配/释放、多流场景 |
| `cudaHostAlloc` / `cudaMallocHost` | 主机分页锁定内存 | 不可换出，可映射/写合并 | 高速 H2D/D2H 传输 |
| `cudaHostGetDevicePointer` | 返回主机内存的设备指针 | UVA 下直接可用 | 零拷贝访问 |

::: tip 记忆法
普通情况用 `cudaMalloc`；2D/3D 布局用 Pitch/3D（为合并访存保对齐）；跨 CPU/GPU 免拷贝用 Managed；高性能流式分配用 Async 池；只有主机侧高速传输才用 Pinned。
:::

## 2. cudaMalloc 的内部机制

### 2.1 一次 cudaMalloc 发生了什么

`cudaMalloc` 是运行时 API，内部走驱动 API `cuMemAlloc`：

```text
cudaMalloc(&p, N)
   │ 用户态: libcudart → libcuda
   ▼
cuMemAlloc → 检查设备/上下文 → 向驱动内存分配器请求 N 字节
   │ 内核态: ioctl → nvidia.ko
   ▼
驱动分配器: 从设备内存堆（GPU 显存）切出一块
   │ 建立 GPU 地址映射（页表条目）
   ▼
返回 256B 对齐的指针 p
```

要点：

- 驱动底层以**较大粒度**向设备内存申请（Linux 上常见与 2MB 大页对齐），再在内部按请求切分；`cudaMalloc` 返回的地址**至少 256B 对齐**，满足所有内置类型（`float4`、`double2` 等）的对齐要求；
- 每次调用都有固定开销：用户态/内核态切换（ioctl）、驱动内部锁、地址空间与映射管理。**单次不大，但高频小分配会把开销放大**；
- 释放时 `cudaFree` 把块还给驱动分配器，驱动**可能保留在内部池里复用**，未必立刻变成 `nvidia-smi` 里的"空闲"。

### 2.2 为什么频繁小分配慢：与 PyTorch 缓存分配器对比

| | 裸 `cudaMalloc` | PyTorch caching allocator |
|---|---|---|
| 每次分配 | 走驱动：ioctl + 锁 + 映射管理 | 用户态从缓存块列表取一块，无系统调用 |
| 高频小分配 | 开销随调用次数线性增长 | 接近 O(1)，块复用 |
| 释放 | 归还驱动，可能触发同步 | 标记为空闲块，留在进程内缓存 |
| 适用 | 少量大缓冲 | 深度学习每步迭代都有大量临时张量 |

::: important 结论
PyTorch 快，是因为它**用用户态缓存分配器把驱动调用次数压到最低**：只有初始化/扩容时才真正 `cudaMalloc`，之后的张量分配/释放都在缓存块上完成。这也是为什么显存"只增不减"——详见 §9。
:::

## 3. 显存碎片

### 3.1 碎片怎么产生

与 CPU 内存外部碎片同理：进程按需分配、释放大小不一的块，驱动分配器留下大量"夹缝"小空洞。GPU 上无法换页、紧凑成本极高（要搬移显存数据），所以碎片一旦产生，基本靠"新分配去碰运气"。

加剧因素：

- 训练脚本里反复创建不同 shape 的临时张量（PyTorch 按 size 分桶缓存，也会产生分桶碎片）；
- 多个进程共享一张卡，各自申请不同大小的常驻缓冲（见 [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)）；
- 大模型显存不够时拆小 batch，分配模式更零碎。

### 3.2 怎么看碎片：nvidia-smi 的 used/free 与实际进程占用

`nvidia-smi` 的显存列是**驱动视角**的占用：

```bash
nvidia-smi
# 输出示例（A100 40GB）
# | GPU  Name        Memory-Usage |
# |   0  A100-SXM4  31714MiB / 40960MiB |
# | Processes:                       GPU Memory |
# |   PID  Type   Process name      Usage        |
# | 12345    C   python             12345MiB     |
```

常见困惑与原因：

| 现象 | 原因 |
|---|---|
| used 很大但进程列表加起来对不上 | 驱动保留：上下文固定开销、驱动内存池缓存、UVM 常驻页、显示相关保留 |
| 进程退出后 used 仍不降 | 残留进程（zombie/卡死）、驱动延迟回收、驱动缓存 |
| free 还够但 `cudaMalloc` 失败 | 连续大块不足（碎片化），或驱动对单次分配有约束 |
| used 显示 0 但程序 OOM | 使用了 UVM/Managed，页面未驻留 GPU；或分配被换出 |

::: warning 判断"碎片化 OOM"
如果 `free` 总量大于你要分配的大小、但分配仍失败，且反复重启进程能缓解，多半是**碎片化**而非"真不够"。缓解手段见 §9 的 `max_split_size_mb` 与 `expandable_segments`。
:::

### 3.3 缓解手段

- **池化复用**：所有分配走一个缓存分配器（PyTorch 自带，或自研 memory pool），避免反复向驱动要块；
- **大块一次性申请**：一次 `cudaMalloc` 整块再手工切分（arena 思想）；
- **统一形状**：训练时固定 batch/tensor shape，减少分桶碎片；
- **进程隔离**：多进程各占固定显存区域（如 MIG 切片，见 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)）。

## 4. 分页锁定内存 Pinned Memory

### 4.1 为什么 H2D/D2H 传输要用 Pinned

GPU 的 DMA 引擎只能访问**物理地址连续且固定（不可换出）**的内存。普通 `malloc` 内存（pageable）随时可能被 OS 换出到磁盘，DMA 无法直接使用：

```text
普通 pageable 内存的 cudaMemcpy：
  host pageable ──(CPU staging 拷贝)──> pinned staging buffer ──(DMA)──> GPU 显存
  两次拷贝，第一次要 CPU 参与，且是同步的

pinned 内存的 cudaMemcpy：
  host pinned ─────────────────────────────(DMA 直达)────────────────────> GPU 显存
  一次拷贝，DMA 引擎独占完成，可异步
```

- `cudaHostAlloc` / `cudaMallocHost` 分配页锁定内存（物理页锁定、不可换出）；
- 用 pinned 源/目的后，`cudaMemcpyAsync` 才真正异步——传输由 DMA 完成，CPU 可以继续干活；
- 代价：**占用物理内存且不可换出**，过量分配会压垮主机；分配/释放也较慢（要锁定页）。

::: tip 什么时候用
高频小传输、流式传输（边算边传）、与 `cudaStream` 重叠 I/O 时值得用；一次性大拷贝（如读一次 checkpoint）用普通内存即可，staging 拷贝的开销可忽略。
:::

### 4.2 相关限制

```bash
ulimit -l   # 锁定内存上限；容器里默认很小，pinned 分配容易失败
```

::: warning 容器里 pinned 内存的坑
Docker 默认 `ulimit -l` 只有几十 KB，`cudaHostAlloc` 稍大即失败。用 `docker run --ulimit memlock=-1` 解除。这是 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/) 里容器化推理的常见故障点。
:::

## 5. 零拷贝与映射内存：UVA

CUDA 4.0 起引入 **UVA（Unified Virtual Addressing，统一虚拟寻址）**：64 位进程中，主机内存、本卡显存、peer 卡显存被放进**同一个 64 位虚拟地址空间**，指针值本身就能区分它指向哪里：

```text
┌────────────── 统一 64 位虚拟地址空间 ──────────────┐
│ host pinned 段 │ device 0 段 │ device 1 段 │ ... │
└──────────────────────────────────────────────────┘
  指针高位段标识归属 → kernel 里直接解引用，无需显式指明设备
```

- `cudaHostAlloc(..., cudaHostAllocMapped)` 分配可映射的 pinned 内存；UVA 下该指针**可直接传进 kernel**（无需 `cudaHostGetDevicePointer`，该 API 保留用于非 UVA/兼容场景）；
- kernel 直接读写该内存 = **零拷贝访问**（GPU 经 PCIe/NVLink 直接访问主机内存）：
  - 优点：省掉拷贝，数据只生成一份；
  - 缺点：每次访问走 PCIe（几十 GB/s），远低于 HBM 的 TB/s 级，**只有低频访问或集成显卡（共享内存架构）才划算**；
- 注意：普通 pageable 内存不能映射，必须 `cudaHostAlloc` / `cudaHostRegister`。

::: tip 一句话
UVA 是"指针大一统"的机制；零拷贝是把 mapped pinned 内存直接暴露给 kernel 的一种用法，代价是 PCIe 延迟，适合低频小数据（如每步传几个控制参数）。
:::

## 6. Unified Memory（UVM）

### 6.1 按需页迁移

`cudaMallocManaged` 分配托管内存：CPU 和 GPU 看到**同一个指针、同一份数据**，OS 与驱动协作做**按需页迁移（demand paging）**：

```text
CPU 访问 p   → 缺页 → 驱动把页从 GPU 迁回主机内存 → CPU 继续
kernel 访问 p → 缺页（GPU page fault）→ 驱动把页迁到显存 → kernel 继续
```

- 迁移以**页**为单位，粒度常见 **64KB（小页）/ 2MB（大页）**——所以按"行"随机访问托管内存性能很差，按"整页顺序访问"才划算；
- **Over-subscription（显存超卖）**：managed 内存可以大于物理显存，数据在主机内存与显存之间流动，等于"GPU 也能用主机内存当后备存储"；
- Pascal 及之后支持 `concurrentManagedAccess`：GPU 与 CPU 可同时访问（硬件一致性保证）；更老的架构需 `cudaDeviceSynchronize()` 手动同步。

### 6.2 主动管理：预取与建议

| API | 作用 |
|---|---|
| `cudaMemPrefetchAsync(ptr, size, dev)` | 主动把页迁到指定设备，避免运行中缺页抖动 |
| `cudaMemAdvise(ptr, size, cudaMemAdviseSetReadMostly, dev)` | 标记"主要被某设备读"，缓存页副本，减少迁移 |
| `cudaMemAdvise(..., cudaMemAdviseSetPreferredLocation, dev)` | 设定页的首选驻留位置 |
| `cudaMemAdvise(..., cudaMemAdviseSetAccessedBy, dev)` | 声明某设备会访问，允许预迁移 |

### 6.3 性能注意事项

::: warning UVM 不是默认银弹
1. 运行中发生缺页会**打断 kernel 执行**（GPU 缺页要等驱动迁移完），性能抖动大；
2. 迁移粒度 64KB/2MB，随机小粒度访问会造成大量无效迁移；
3. CPU↔GPU 频繁交替访问同一数据时，数据会在两处反复横跳（thrashing）；
4. 正确用法：**预先 `cudaMemPrefetchAsync` + `cudaMemAdvise` 把数据钉在目标设备上**，让运行期几乎不发生缺页。
:::

::: tip 适用场景
显存不够时的"兜底"、原型快速开发、数据一次性流入流出的流式场景。训练大模型时建议先用 §10 的正规手段，UVM 最后兜底（详见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)）。
:::

## 7. 多进程共享显存：CUDA IPC

不同进程的 CUDA 上下文互相隔离（各自地址空间），但可以用 **CUDA IPC** 让进程 A 把一块显存"借给"进程 B 直接访问：

```text
进程 A: cudaMalloc(&p) → cudaIpcGetMemHandle(&handle, p)
          │ handle 是固定大小的字节结构，经任意通道传给 B（socket/shm/文件）
进程 B: cudaIpcOpenMemHandle(&p2, handle) → p2 直接读写同一块显存
          │ 要求：同一张 GPU、同一进程树（或启用 peer access）
          └── 用完 cudaIpcCloseMemHandle(p2)
```

- 场景：多进程共享推理缓存（如多 worker 共享 embedding 表）、自定义集合通信、NCCL 之外的进程间数据交换；
- 与共享内存（shm）的区别：

| | CUDA IPC | POSIX shm |
|---|---|---|
| 共享的是什么 | **GPU 显存**（数据在显存，零拷贝直读） | 主机内存 |
| 访问方 | 需 CUDA 环境、同 GPU | 任意进程 mmap |
| 跨机 | 不行 | 不行（本地） |
| 典型用途 | 多进程共享显存中的权重/缓存 | 进程间传控制消息/小数据 |

::: note 序列化细节
`cudaIpcMemHandle_t` 是固定大小的字节结构，可直接 memcpy 进 shm/消息队列传给另一个进程，不必走 socket 编码。
:::

## 8. 内存池：cudaMemPool 与 cudaMallocAsync

CUDA 11.2 起把"池化"做成了一等公民：

- `cudaMallocAsync(ptr, size, stream)`：从**内存池**分配，池由 stream 管理（stream-ordered），分配/释放异步、可跨 kernel 复用；
- 池对象：`cudaDeviceGetDefaultMemPool` 拿设备默认池，或 `cudaMemPoolCreate` 自定义池（可配最小分配粒度、释放阈值等）；
- **跨进程共享池**：`cudaMemPoolExportToShareableHandle` / `cudaMemPoolImportFromShareableHandle`，让多个进程共享同一块池化显存；
- 意义：高频分配场景（如推理服务每请求分配输出缓冲）把驱动调用降到最低，并天然缓解碎片（池内块按大小分桶复用）。

::: tip 与 PyTorch 的关系
PyTorch 的 caching allocator 是"用户态版内存池"，CUDA 官方把同一思想下沉到运行时（`cudaMallocAsync`）；PyTorch 2.x 也支持 `PYTORCH_CUDA_ALLOC_CONF=backend:cudaMallocAsync` 直接使用官方池（实验特性）。
:::

## 9. PyTorch 显存管理专题

### 9.1 caching allocator 原理

PyTorch 的 `CUDACachingAllocator` 在进程内维护一个**块（block）缓存**：

- 小分配（512B ~ 2MB）：按 **512B 对齐、分桶**（round up 到桶大小），桶内复用；
- 大分配（> 2MB）：round up 到 **2MB 整数倍**，单独管理；
- 释放 = 把块标回空闲桶；**块不会还给驱动，除非 `empty_cache()`**；
- 分配器向驱动申请内存是"扩张式"的：不够了才 `cudaMalloc` 一大块，之后逐步切分。

```text
cudaMalloc 的块（例如 4096 MiB arena）
┌──────────┬─────┬──────────────┬───────┬─────────┐
│ 模型权重 │ 桶  │  梯度临时块   │ 空闲  │ 优化器态 │
│ (常驻)   │     │ (反复分配)    │       │ (常驻)   │
└──────────┴─────┴──────────────┴───────┴─────────┘
   ← memory_allocated（当前活着的张量）→
   ←———————— memory_reserved（向驱动要来的总显存）————————→
```

### 9.2 两个关键数字与三个 API

```python
import torch
print(torch.cuda.memory_allocated(0))   # 当前活着的张量占用的显存
print(torch.cuda.memory_reserved(0))    # 缓存分配器向驱动申请的总显存（含空闲缓存块）
print(torch.cuda.memory_summary(0))     # 分桶明细：各 size 桶的空闲/占用块数
torch.cuda.empty_cache()                # 把空闲缓存块 cudaFree 还给驱动
```

::: important `empty_cache()` 到底干了什么
它**只释放"进程内缓存、但当前没有张量使用"的块**（归还给驱动）。它**不会**：释放仍被张量引用的显存；立即把显存还给别的进程（驱动可能保留复用）；解决碎片化（块已 free 但驱动保留，`nvidia-smi` 的 used 仍大）。真正要"还给别人"，请退出进程。
:::

### 9.3 PYTORCH_CUDA_ALLOC_CONF

```bash
export PYTORCH_CUDA_ALLOC_CONF="max_split_size_mb:128"             # 大于该值的块不再拆分
export PYTORCH_CUDA_ALLOC_CONF="garbage_collection_threshold:0.8"  # 分配失败时先回收再报 OOM
export PYTORCH_CUDA_ALLOC_CONF="expandable_segments:True"          # CUDA 11.4+，可扩展段替代固定 arena
export PYTORCH_CUDA_ALLOC_CONF="backend:cudaMallocAsync"           # 2.x 实验特性，换官方池
```

| 配置 | 作用 | 何时用 |
|---|---|---|
| `max_split_size_mb` | 大块不再被切碎给小分配 | 大块被切碎导致碎片化 OOM 时调小 |
| `garbage_collection_threshold` | 逼近阈值时自动触发回收 | 高水位场景 |
| `expandable_segments` | 每次向驱动申请 2MB 粒度可增长段，彻底缓解固定 arena 碎片 | 碎片化 OOM 首选 |

::: warning 碎片化 OOM 的判断与应对
OOM 信息里 `reserved` 远大于 `allocated`、或报"CUDA out of memory"但 `nvidia-smi` 的 free 足够 → 碎片化。依次尝试：`expandable_segments:True` → 调小 `max_split_size_mb` → 统一 tensor shape → 换更少更大的进程。
:::

## 10. 显存不够的常规解法（优先级从高到低）

1. **减小 batch size**：最直接，训练收敛慢一点但显存立降；
2. **梯度累积**：小 batch 多步累积梯度，等效大 batch，见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)；
3. **混合精度（AMP）**：FP16/BF16 训练，权重/梯度/激活减半；
4. **Gradient Checkpointing**：不存激活值、反向时重算，省激活内存（以算力换显存）；
5. **ZeRO / FSDP**：把优化器状态/梯度/参数分片到多卡，突破单卡上限（[大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)）；
6. **减少常驻缓存**：`empty_cache()`、控制缓存分配器水位；
7. **UVM/Managed 兜底**：数据溢出到主机内存，性能有损，不推荐默认使用；
8. **换卡/多卡**：更大显存或模型并行，选型见 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)。

::: note 一句话心法
显存问题 80% 靠"少存"（batch/精度/checkpoint/分片）解决，20% 靠"复用"（池化/缓存）解决，UVM 是最后手段。
:::

## 11. 本章小结

- 分配 API 各司其职：`cudaMalloc` 通用、Pitch/3D 保对齐、Managed 统一内存、Async 池化、HostAlloc 锁页；
- `cudaMalloc` 走驱动，256B 对齐、底层大块管理；高频小分配必须池化；
- 显存碎片与 CPU 内存碎片同源，靠池化/大块复用缓解；`nvidia-smi` 的 used ≠ 进程实际占用；
- Pinned 内存让 DMA 直达、传输异步；零拷贝/UVA 适合低频小数据；
- UVM 按需迁移，粒度 64KB/2MB，要用 Prefetch/Advise 钉住数据；
- CUDA IPC 跨进程共享显存；`cudaMallocAsync` + 内存池可跨进程共享；
- PyTorch 缓存分配器：`reserved` vs `allocated`、`empty_cache()` 只归还驱动、`expandable_segments` 治碎片；
- 显存不够：减 batch → 累积 → AMP → checkpoint → ZeRO/FSDP → UVM 兜底。

::: tip 引出下一章
显存被多个进程抢来抢去，自然引出"谁先跑、谁后跑、怎么切"的问题——这正是 [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/) 的主题：上下文是什么，时间切片 / MPS / MIG 各自怎么共享一块 GPU。
:::

## 12. 自测题

**1. `cudaMalloc` 返回的指针为什么可以放心传给任意 kernel？对齐要求是多少？**
答：驱动保证返回地址至少 256B 对齐，满足所有内置类型（float4、double2 等）的对齐要求；且该指针位于当前进程 CUDA 上下文的设备地址空间，kernel 可直接解引用。

**2. 为什么频繁调用 `cudaMalloc`/`cudaFree` 慢？PyTorch 怎么规避？**
答：每次调用有用户态→内核态切换（ioctl）、驱动锁、映射管理开销，且释放的块未必立即复用。PyTorch 用 caching allocator 在用户态按大小分桶缓存块，张量分配/释放只是桶内标记，几乎不触发驱动调用。

**3. `torch.cuda.memory_reserved` 与 `memory_allocated` 的区别？`empty_cache()` 释放哪个？**
答：`reserved` 是分配器向驱动申请的总显存（含空闲缓存块），`allocated` 是当前存活张量实际占用。`empty_cache()` 把空闲缓存块 `cudaFree` 还给驱动，使 `reserved` 下降、`allocated` 不变。

**4. `nvidia-smi` 显示 used 50GB，但进程列表加起来只有 30GB，剩下的哪去了？**
答：驱动保留部分：CUDA 上下文固定开销、驱动内存池缓存的已释放块、UVM 常驻页、显示相关保留；也可能是残留进程或缓存未回收。

**5. 为什么 pinned 内存的 D2H 比 pageable 快？代价是什么？**
答：pageable 内存要先由 CPU 拷贝到 pinned staging 缓冲再 DMA（两次拷贝且同步）；pinned 直接 DMA 直达、可异步。代价：物理页被锁定不可换出，占用主机物理内存，分配慢，分配过多会压垮主机。

**6. 零拷贝（mapped pinned）适合什么场景？为什么不能无脑用？**
答：适合低频小数据（控制参数、小状态），省掉拷贝。因为 GPU 每次访问走 PCIe（几十 GB/s），远低于显存带宽（TB/s 级），高频访问会变成带宽瓶颈。

**7. UVM 的页迁移粒度是多少？为什么随机访问 managed 内存性能差？**
答：常见 64KB（小页）/ 2MB（大页）。随机访问会产生大量小粒度缺页迁移，每次迁移都打断执行、搬整页，造成抖动和带宽浪费。

**8. CUDA IPC 和 POSIX shm 的区别？**
答：IPC 共享的是 GPU 显存（数据在显存零拷贝直读，需同 GPU、同进程树或 peer access）；shm 共享主机内存，任何进程可 mmap。IPC 适合多进程共享显存中的权重/缓存，shm 适合传小消息。

**9. 写一个 `PYTORCH_CUDA_ALLOC_CONF` 组合，缓解"显存碎片导致的 OOM"，并解释为什么有效。**
答：`PYTORCH_CUDA_ALLOC_CONF="expandable_segments:True,max_split_size_mb:128"`。`expandable_segments` 让分配器按需向驱动申请 2MB 粒度可增长段，不再预先圈死一块 arena，避免大块被切碎后无法满足后续大分配；`max_split_size_mb` 限制大块拆分，保护连续大块。

**10. 显存不够时按什么顺序尝试？为什么 UVM 放最后？**
答：减 batch → 梯度累积 → 混合精度 → gradient checkpointing → ZeRO/FSDP → UVM 兜底。UVM 放最后是因为缺页迁移有性能抖动且不能根治"显存峰值"，正规手段能保持训练吞吐稳定。

::: note 提示
第 3、4 题建议在真机上验证：跑一个训练脚本观察 `memory_reserved` 变化，再 `empty_cache()` 看 `nvidia-smi` 数字变化。配合 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) 用 DCGM 看显存指标更直观。
:::
