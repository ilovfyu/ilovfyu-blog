---
title: "GPU驱动与CUDA运行时栈"
permalink: /kb/os/GPU/06-GPU驱动与CUDA运行时栈/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "CUDA优化技术与性能调优", link: /kb/os/GPU/05-CUDA优化技术与性能调优/ }
next: { text: "GPU内存管理与显存分配", link: /kb/os/GPU/07-GPU内存管理与显存分配/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
前几篇讲了怎么写 Kernel、怎么调优，本章回答：**你的 `cudaMalloc`、`<<< >>>` 背后，到底是谁在干活？** 学完本章，你能画出"应用 → 库 → Runtime → Driver → 内核驱动 → GPU"的完整软件栈，说清用户态驱动与内核态驱动为什么必须分两层，能解释 `nvidia-smi` 与 `nvcc --version` 的 CUDA 版本为何不同，并能在遇到 "CUDA driver version is insufficient" 这类报错时按图索骥地排查。
:::

GPU 有自己的"操作系统"：驱动 + 运行时 + 一堆库。理解这条栈，是理解显存管理（[GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)）、多进程调度（[GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)）、容器化（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）的前提。

## 1. 软件栈全景图

```text
┌────────────────────────────────────────────────────────────┐
│  应用层：PyTorch / TensorFlow / 自研 CUDA 程序 / 游戏引擎     │
├────────────────────────────────────────────────────────────┤
│  加速库层：cuBLAS  cuDNN  NCCL  cuFFT  cuSPARSE  Thrust     │
├────────────────────────────────────────────────────────────┤
│  CUDA Runtime：libcudart.so（cudaMalloc / cudaLaunch / …）  │
├────────────────────────────────────────────────────────────┤
│  CUDA Driver：libcuda.so（cuInit / cuLaunchKernel / …）     │
├────────────────────────────────────────────────────────────┤
│  内核态驱动：nvidia.ko（/dev/nvidia*、ioctl、DMA、中断）      │
├────────────────────────────────────────────────────────────┤
│  GPU 硬件：SM / 显存 / 拷贝引擎 / NVLink / PCIe              │
└────────────────────────────────────────────────────────────┘
```

每一层的职责：

| 层 | 典型组件 | 职责 |
|---|---|---|
| 应用层 | PyTorch、自研程序 | 描述"要算什么" |
| 加速库层 | cuBLAS、cuDNN、NCCL | 把常见算子封装成**免手写 Kernel 的高性能实现** |
| CUDA Runtime | libcudart.so | 易用 API：显存分配、Kernel 启动、流与事件；**封装 Driver API** |
| CUDA Driver | libcuda.so（用户态） | 上下文管理、模块加载、命令缓冲；直通内核驱动的 API 层 |
| 内核态驱动 | nvidia.ko | 设备文件、ioctl、DMA、显存物理管理、中断与错误（Xid） |
| 硬件 | SM、HBM、DMA 引擎 | 真正执行指令与搬运数据 |

::: note 两条并行的辅助通道
旁边还有两条"旁路"：**NVML**（libnvidia-ml.so）走独立接口提供监控（温度/功耗/利用率），**CUPTI** 提供性能剖析数据（`ncu`/`nsys` 的数据来源，见 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)）。它们不经过 Runtime API。
:::

## 2. 驱动架构：用户态驱动与内核态驱动

GPU 驱动拆成两层，是**性能与安全的经典取舍**。

### 2.1 用户态驱动（UMD，libcuda.so）

运行在**应用自己的进程地址空间**里：

- 实现 CUDA Driver API（cuInit、cuCtxCreate、cuLaunchKernel）；
- **命令缓冲（push buffer）**：把 Kernel 启动、内存操作翻译成 GPU 命令，写进一块**映射到用户态的环形缓冲**；
- 上下文管理（CUcontext，见 [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)）、UVM 的页表操作。

### 2.2 内核态驱动（KMD，nvidia.ko）

运行在内核态，是唯一能碰硬件的部分：

- 管理设备文件：`/dev/nvidia0`（每卡一个）、`/dev/nvidiactl`（控制）、`/dev/nvidia-uvm`（统一内存）；
- 通过 **ioctl** 接受用户态驱动请求：分配显存、建立映射、提交命令缓冲；
- 负责 **DMA**、显存物理页管理、**中断处理**（MSI）、GPU 故障上报（dmesg 里的 Xid 错误，见 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)）。

### 2.3 为什么必须分两层？

```text
方案 A（每步都进内核）：应用 ──syscall──► 内核驱动 ──► GPU
   每个 Kernel 启动都是一次系统调用，光切换上下文就吃掉几微秒，吞吐被 CPU 卡死

方案 B（真实设计）：
   应用 ──写命令环(用户态直接写)──► 映射到用户态的命令缓冲 ──► GPU 硬件自主取命令
        │
        └─ 只有 初始化/分配/出错/换页 等少数操作才 syscall 进内核
```

::: important 核心答案
**命令提交必须绕过内核**：用户态驱动把 GPU 命令直接写进一块 mmap 出来的命令环，GPU 硬件自己来取——正常执行路径零 syscall。内核态驱动只处理"低频但高危"的事：资源分配、权限校验、异常与中断。这样既保性能，又不让用户态代码直接操纵硬件（安全）。
:::

## 3. 驱动安装

### 3.1 三种安装方式

| 方式 | 命令（示例） | 特点 |
|---|---|---|
| runfile | `sudo sh NVIDIA-Linux-x86_64-550.54.15.run` | 官方安装包，可 `--no-opengl-files` 等自定义；升级/卸载灵活 |
| apt（发行版源） | `sudo apt install nvidia-driver-550` | 与发行版集成好，自动处理 blacklist/initramfs |
| apt（NVIDIA CUDA 源） | 加 NVIDIA 官方 apt 源后 `apt install cuda-drivers` | 版本新，随 Toolkit 一起管理 |
| **DKMS** | `sudo dkms install nvidia/550.54.15` | 内核升级时**自动重编译模块**，服务器首选 |

### 3.2 安装后的关键步骤与验证

```bash
# 禁用 nouveau（开源驱动，与 NVIDIA 闭源驱动冲突）
cat > /etc/modprobe.d/blacklist-nvidia-nouveau.conf <&lt;EOF
blacklist nouveau
options nouveau modeset=0
EOF
sudo update-initramfs -u

# 加载与验证
sudo modprobe nvidia
lsmod | grep nvidia        # 应看到 nvidia / nvidia_uvm / nvidia_modeset / nvidia_drm
nvidia-smi                 # 出现显卡列表 = 驱动正常

# 查看模块信息
modinfo nvidia | head -5
```

&gt; [!warning] Secure Boot 的坑
> 启用 Secure Boot 的机器只加载**签过名**的内核模块。第三方驱动需要先用 `mokutil --import` 导入自签名证书并重启录入 MOK，否则 `modprobe nvidia` 报 "Required key not available"。服务器上最常见"装完驱动起不来"的原因就是它。

### 3.3 驱动文件组成（安装后看得到什么）

| 文件 | 角色 |
|---|---|
| `nvidia.ko` | 主内核模块（含 `nvidia-uvm.ko`、`nvidia-modeset.ko`、`nvidia-drm.ko`） |
| `libcuda.so.1` | 用户态 Driver API（**注意：不属于 Toolkit**，是驱动自带的） |
| `libnvidia-ml.so.1` | NVML 监控库 |
| `libnvidia-ptxjitcompiler.so.1` | PTX 的 JIT 编译器（运行时把 PTX 编成 SASS） |
| `nvidia-smi` | 命令行监控工具（见第 7 节） |
| `nvidia-cuda-mps-control` | MPS 多进程服务（[GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)） |

::: tip 一个反直觉的事实
**`libcuda.so` 是驱动的一部分，不是 Toolkit 的一部分**。你装的"CUDA Toolkit"提供 nvcc 和 libcudart；而 libcuda（Driver API）随驱动安装。所以"装驱动"和"装 Toolkit"是两个独立动作，缺一不可。
:::

## 4. CUDA 版本体系

### 4.1 三个"CUDA 版本"各指什么

| 名称 | 从哪看 | 含义 |
|---|---|---|
| 驱动支持的 CUDA 版本 | `nvidia-smi` 右上角 | 该驱动**最多能支持**到哪个 CUDA 大版本（向后兼容） |
| Toolkit 版本 | `nvcc --version` | 编译器/头文件/库的版本 |
| 运行时库版本 | `ldd app \| grep cudart` | 链接到的 libcudart 版本 |

**兼容规则**：驱动向后兼容——新驱动能跑旧 Toolkit 编译的程序；反之不行。Toolkit 有**最低驱动版本**要求：

| CUDA Toolkit | 最低 Linux 驱动（R 系列） | 主要支持架构 |
|---|---|---|
| 11.8 | 520.61.05 | Volta~Hopper（sm_70~sm_90） |
| 12.0 | 525.60.13 | Ampere~Hopper（sm_80~sm_90） |
| 12.4 | 550.54.15 | Ampere~Hopper（sm_80~sm_90） |
| 12.6 | 560.28.03 | Ampere~Blackwell（sm_80~sm_120） |
| 13.0 | 570 系 | 增加 Blackwell 完整支持 |

### 4.2 为什么 `nvidia-smi` 和 `nvcc --version` 的版本不同？

```text
nvidia-smi:  "CUDA Version: 12.4"   ← 驱动支持的最大 CUDA 版本（驱动 550 系）
nvcc --version:  "release 11.8"     ← Toolkit 版本（你装的是 11.8）
```

这是**健康状态**：只要 `nvidia-smi` ≥ `nvcc`，就能正常编译运行。反过来（Toolkit 比驱动新）才危险——可能触发 "CUDA driver version is insufficient"。

### 4.3 CUDA Forward Compatibility（前向兼容）

正常规则是"驱动向后兼容"，但数据中心卡（Tesla/A100 等）还有一条**前向兼容**通道：应用可携带 `libcuda.so.1` 与 `libnvidia-ptxjitcompiler.so.1`（CUDA 12.x 的 forward compatible 包），从而在**比 Toolkit 要求更旧**的驱动（但 ≥ 某基线，如 525）上运行。代价是功能受限（PTX JIT 路径）且仅限数据中心卡。

::: warning 版本排查第一反应
报 "CUDA driver version is insufficient for CUDA runtime version" → 驱动太老，两个选择：**升级驱动**，或**降级 Toolkit** 到驱动支持的版本。别急着重装系统。
:::

## 5. Driver API vs Runtime API

Runtime API 是 Driver API 的**薄封装**：`cudaMalloc` 内部就是 `cuMemAlloc`，`kernel<<<>>>` 内部就是 `cuLaunchKernel`。Runtime 会在第一次调用时自动 `cuInit`（惰性初始化）。

| 功能 | Runtime API（cudart） | Driver API（libcuda） |
|---|---|---|
| 初始化 | 隐式（首次调用自动完成） | 显式 `cuInit(0)`，**必须先调** |
| 枚举设备 | `cudaGetDeviceCount` | `cuDeviceGetCount` / `cuDeviceGet` |
| 选择设备 | `cudaSetDevice(i)` | `cuCtxCreate(&ctx, 0, dev)` 创建上下文 |
| 分配显存 | `cudaMalloc(&p, bytes)` | `cuMemAlloc(&p, bytes)` |
| 拷贝 | `cudaMemcpy(d, s, n, kind)` | `cuMemcpyHtoD / cuMemcpyDtoH` |
| 加载 Kernel | 编译时内嵌 fatbin，自动加载 | `cuModuleLoad(&mod, "app.ptx")` + `cuModuleGetFunction` |
| 启动 Kernel | `kernel<<<g, b, sh, s>>>(args...)` | `cuLaunchKernel(f, gx,gy,gz, bx,by,bz, sh, stream, args, 0)` |
| 错误处理 | `cudaGetLastError` | `cuGetErrorName` / `cuGetErrorString` |
| 依赖 | libcudart.so → libcuda.so | 直接链接 libcuda.so |
| 多上下文 | 每线程一个上下文，受限 | 一个进程可随意建多个上下文 |

```cpp
// Runtime 写法（内部等价于右侧 Driver 调用）
cudaMalloc(&d_A, bytes);              //   cuMemAlloc(&d_A, bytes);
vecAdd<<<blocks, threads>>>(d_A, ...);//   cuLaunchKernel(f, blocks,1,1, threads,1,1, 0, 0, args, 0);
cudaDeviceSynchronize();              //   cuCtxSynchronize();
```

::: important 什么时候必须用 Driver API？
1. **框架/库开发**：PyTorch 的 CUDA 层（c10/cuda）就用 Driver API——它要自己管理上下文、控制加载时机；
2. **动态加载**：运行时才 `dlopen("libcuda.so")` 按需调用（不依赖 cudart 存在，如探针工具）；
3. **多上下文**：一个进程需要多个隔离上下文（Runtime 模型限制多）；
4. **运行时加载 PTX/cubin**：`cuModuleLoad` 让"代码即数据"，可做 JIT 或从网络下发 Kernel。
:::

**判断口诀**：写应用/学习 → Runtime；写框架/做工具/需要底层控制 → Driver。

## 6. 运行时与库

### 6.1 cudart 与 cudadevrt

| 库 | 全称 | 作用 |
|---|---|---|
| `libcudart.so` | CUDA Runtime | 主机侧运行时：内存、流、事件、Kernel 启动封装 |
| `libcudadevrt.a` | Device Runtime | **设备侧**运行时：支持"Kernel 里再启动 Kernel"（动态并行，需 `-rdc=true` 编译） |

### 6.2 常用加速库一览

| 库 | 一句话用途 |
|---|---|
| cuBLAS | 稠密线性代数（BLAS）；GEMM 自动用 Tensor Core，性能天花板 |
| cuDNN | 深度学习原语：卷积、池化、归一化、RNN——PyTorch/TF 的算力底座 |
| cuFFT | 快速傅里叶变换（一维/多维、实数/复数） |
| cuSPARSE | 稀疏矩阵的存储与运算（CSR 等格式） |
| cuSOLVER | 线性方程组求解、特征值/奇异值分解 |
| NCCL | **多 GPU 集合通信**：AllReduce/Broadcast，多卡训练的关键（[大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)） |
| Thrust | C++ 模板算法库（类似 STL：sort/reduce/transform），基于容器抽象 |
| CUB | 块级/设备级并行原语（block reduce、scan、radix sort），性能极致 |
| cuRAND | 随机数生成（Mersenne Twister、Philox 等） |
| NPP | 图像/视频处理原语 |

::: tip 选库思路
能用库绝不用手写：cuBLAS/cuDNN 是 NVIDIA 花数年调出来的，手写 GEMM 的上限只是它的起点（见 [. 案例研究](/kb/os/GPU/05-CUDA优化技术与性能调优/#9.%20%E6%A1%88%E4%BE%8B%E7%A0%94%E7%A9%B6)）。CUB/Thrust 用于自己写 Kernel 时复用成熟的 block 级原语，避免重复造轮子。
:::

## 7. NVML 与 nvidia-smi

**NVML**（NVIDIA Management Library，`libnvidia-ml.so`）是监控/管理接口；**nvidia-smi** 是它的命令行客户端，Python 侧可用 `pynvml`。

```bash
nvidia-smi                          # 总览：卡、利用率、显存、温度、功耗、右上角 CUDA 版本
nvidia-smi -L                       # 列出所有卡
nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used \
            --format=csv            # 脚本化查询
nvidia-smi -q -d ECC                # ECC 计数（数据中心卡）
nvidia-smi -q -d CLOCK              # 时钟状态
nvidia-smi --query-compute-apps=pid,used_memory --format=csv   # 谁在占显存
```

NVML 能查到什么（对比 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) 的完整清单）：

| 类别 | 指标示例 |
|---|---|
| 设备信息 | 型号、UUID、PCIe 信息、驱动版本 |
| 运行状态 | GPU 利用率、显存占用、SM/显存时钟 |
| 功耗温度 | 当前功耗、温度、功耗上限（可动态调） |
| 可靠性 | **ECC 可纠正/不可纠正错误计数**、Xid 错误、重置计数 |
| 进程 | 每个进程的 PID、显存占用、GPU 时间 |

::: note NVML 与 CUDA 的关系
NVML 是独立于 CUDA 运行时的管理通道——不初始化 CUDA 上下文也能用，所以 `nvidia-smi` 在 CUDA 完全没装时依然能显示驱动信息。容器/监控系统（DCGM、Prometheus exporter）都靠它取数。
:::

## 8. 版本排查实战

### 8.1 三步定位"链接到哪个库"

```bash
ldd ./app | grep -E "cuda|nvidia"     # 看链接了 libcudart / libcuda 的哪个版本
# 输出示例：
#   libcudart.so.12 => /usr/local/cuda/lib64/libcudart.so.12
#   libcuda.so.1   => /lib/x86_64-linux-gnu/libcuda.so.1     ← 这是驱动的！

readlink -f /usr/lib/x86_64-linux-gnu/libcuda.so.1          # 看指向哪个驱动版本
nvidia-smi | grep "Driver Version"                          # 对照驱动版本
```

::: tip 常见误判
`libcuda.so.1` 是**驱动**的库，`libcudart.so.12` 是 **Toolkit** 的库。容器里"进了容器看不到 GPU"、`ldd` 显示 `not found`，多半是容器没挂载驱动的库或设备（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）。
:::

### 8.2 算力与编译参数匹配表（compute capability）

| 算力（sm_XX） | 架构 | 代表显卡 |
|---|---|---|
| sm_70 | Volta | V100 |
| sm_75 | Turing | T4、RTX 2080 Ti |
| **sm_80** | Ampere | **A100**（数据中心）；GA100 |
| sm_86 | Ampere | RTX 3080/3090（消费级） |
| sm_89 | Ada Lovelace | RTX 4090 |
| **sm_90** | Hopper | **H100 / H200** |
| sm_100 | Blackwell | B200（GB100，数据中心） |
| sm_120 | Blackwell | RTX 50 系（GB202 等，消费级） |

```bash
nvcc -arch=sm_90 -o app app.cu     # 为 H100 编译；算力更高/更低都不通用
```

### 8.3 常见报错与排查思路

| 报错 | 原因 | 排查路径 |
|---|---|---|
| `CUDA driver version is insufficient for CUDA runtime version` | 驱动太老，不支持当前 Toolkit | `nvidia-smi` 看驱动 CUDA 版本 → 升级驱动或降级 Toolkit |
| `cuInit failed: CUDA_ERROR_NO_DEVICE` / 找不到设备 | 驱动没加载 / 设备文件无权限 / 容器未挂 GPU | `nvidia-smi` 是否正常；`ls -l /dev/nvidia*`；`dmesg \| grep -i nvidia`；容器加 `--gpus all` |
| `no kernel image is available for execution on the device` | fatbin 里既无本卡 SASS 也无 PTX | 按本卡算力重编，或 `-gencode arch=compute_XX,code=compute_XX` 带 PTX 兜底（[. 编译与构建](/kb/os/GPU/04-CUDA编程模型与开发入门/#9.%20%E7%BC%96%E8%AF%91%E4%B8%8E%E6%9E%84%E5%BB%BA)） |
| `modprobe nvidia` 报 key 错误 | Secure Boot 未签名 | `mokutil --import` 导入 MOK 并重启 |
| Kernel 运行报非法地址 | 越界访问（常见于边界处理漏了 `if (idx < n)`） | `cuda-gdb` / `compute-sanitizer` 定位（[GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)） |

## 9. 本章小结

- 软件栈五层：应用 → 库 → Runtime（libcudart）→ Driver（libcuda）→ 内核驱动（nvidia.ko）→ 硬件，层层封装；
- 驱动分两层的根本原因：**命令提交走用户态映射的命令环（零 syscall），内核态只做低频高危操作**——性能与安全兼得；
- `libcuda.so` 属于**驱动**，`libcudart.so` 属于 **Toolkit**；`nvidia-smi` 的 CUDA 版本是驱动支持上限，`nvcc --version` 是工具包版本；
- Runtime API = Driver API 的薄封装；框架/动态加载/多上下文场景用 Driver API；
- 常用库：cuBLAS（线性代数）、cuDNN（深度学习）、NCCL（多卡通信）、Thrust/CUB（并行原语）；
- NVML 是独立监控通道，nvidia-smi 只是它的命令行客户端；
- 版本排查三板斧：`ldd` 看库、`nvidia-smi` 看驱动、算力表对编译参数。

::: tip 引出下一章
驱动与运行时把"显存"抽象成了 `cudaMalloc` 一把梭，但显存背后有分配器、UVA/UVM、页迁移、OOM 与 PyTorch 缓存分配器一大堆机制——下一章 [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/) 专门讲显存怎么分配释放、为什么"显存只增不减"、显存不够时怎么办。
:::

## 自测题

**1. 按顺序写出从应用到 GPU 硬件的软件栈各层，并各说一句职责。**
答：应用层（描述要算什么）→ 加速库层 cuBLAS/cuDNN/NCCL（高性能算子封装）→ CUDA Runtime libcudart（易用 API，封装 Driver）→ CUDA Driver libcuda（上下文/命令缓冲）→ 内核驱动 nvidia.ko（ioctl/DMA/中断/显存物理管理）→ GPU 硬件（执行指令）。

**2. 为什么 GPU 驱动要分成用户态与内核态两层？直接在内核态实现全部 API 行不行？**
答：性能上，Kernel 启动若每次都 syscall 进内核，上下文切换开销（微秒级）会吃掉吞吐；用户态驱动把命令直接写进 mmap 映射的命令环，GPU 自己取命令，正常路径零 syscall。安全上，不能让用户态任意操纵硬件，所以资源分配、权限校验、异常处理必须留在内核态。只做内核态 → 太慢；全放用户态 → 不安全。

**3. `nvidia-smi` 显示 CUDA 12.4、`nvcc --version` 显示 11.8，说明什么？反过来（Toolkit 12.4、驱动只支持 11.8）会怎样？**
答：前者说明驱动支持上限 12.4 ≥ 工具包 11.8，正常可开发。后者驱动太老，运行时会报 "CUDA driver version is insufficient for CUDA runtime version"，需升级驱动或降级 Toolkit。

**4. 判断：机器装 CUDA 12.4 Toolkit，驱动为 535.54.03（支持到 CUDA 12.2）。能编译吗？能运行吗？**
答：编译没问题（nvcc 不依赖驱动版本）；运行报错——12.4 Toolkit 要求最低驱动 550.54.15，535 低于要求。解决方案：升级驱动到 ≥ 550，或换用 CUDA 12.2 及以下 Toolkit。

**5. Runtime API 和 Driver API 的本质关系？各自至少举一个"非它不可"的场景。**
答：Runtime 是 Driver 的薄封装（cudaMalloc→cuMemAlloc、kernel<<<>>>→cuLaunchKernel），且惰性初始化。Runtime 场景：普通应用开发（简单、自动管理）；Driver 场景：框架开发（PyTorch 用 Driver API 自管上下文）、运行时动态加载（dlopen libcuda）、一个进程多上下文、运行时加载 PTX/cubin（cuModuleLoad）。

**6. `libcuda.so` 与 `libcudart.so` 分别属于驱动还是 Toolkit？装 Toolkit 不装驱动能编译吗？能运行吗？**
答：`libcuda.so`（Driver API）随**驱动**安装；`libcudart.so`（Runtime）随 **Toolkit** 安装。只装 Toolkit 不装驱动：能编译（nvcc 只要头文件），运行必失败（找不到设备/库，`cuInit` 失败）。

**7. 容器里 `nvidia-smi` 正常但 CUDA 程序报找不到设备，最可能的原因是什么？怎么验证？**
答：`nvidia-smi` 正常说明宿主机驱动与 NVML 可用；程序找不到设备通常是容器内缺少设备节点（/dev/nvidia*）或驱动库（libcuda.so.1）未挂载。验证：`docker run --gpus all` 启动；进容器 `ls -l /dev/nvidia*`、`ldd 程序 | grep cuda`。本质是容器隔离了 /dev 与库，见 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)。

**8. 服务器启用 Secure Boot 后 `modprobe nvidia` 报 "Required key not available"，怎么解决？**
答：NVIDIA 闭源模块未签名，Secure Boot 拒绝加载。用 `mokutil --import <签名证书>` 导入自己的 MOK 密钥，重启进入 MOK 管理界面确认导入，之后模块可被加载；或用 DKMS 配合签名流程自动处理。

**9. 一段 GPU 程序运行时报 "no kernel image is available for execution on the device"，给出排查步骤。**
答：这是 fatbin 里既无当前卡 SASS 也无 PTX。步骤：① `nvidia-smi` 查当前卡算力（如 sm_90）；② 查编译命令用的 `-arch`/`-gencode`（如只写了 sm_80）；③ 按目标算力重编，或增加 `-gencode arch=compute_90,code=compute_90` 附带 PTX 做 JIT 兜底（见 [. 编译与构建](/kb/os/GPU/04-CUDA编程模型与开发入门/#9.%20%E7%BC%96%E8%AF%91%E4%B8%8E%E6%9E%84%E5%BB%BA)）。

**10. 监控 GPU 为什么用 NVML 而不是 CUDA Runtime？NVML 能查到哪几类信息？**
答：NVML 是独立管理通道，不初始化 CUDA 上下文即可用（所以 nvidia-smi 在没装 Toolkit 时也能显示驱动信息），且无上下文开销、适合监控进程高频采样。能查：设备信息、利用率/显存/时钟、功耗温度、ECC 与 Xid 可靠性计数、进程级占用（PID/显存）。

::: note 提示
第 4 题是典型的版本矩阵判断题，建议把 [.1 三个"CUDA 版本"各指什么](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/#4.1%20%E4%B8%89%E4%B8%AA%22CUDA%20%E7%89%88%E6%9C%AC%22%E5%90%84%E6%8C%87%E4%BB%80%E4%B9%88) 的表格背下来再答。第 5 题对应面试必问的 "Runtime vs Driver"，第 7 题是容器排障第一现场。
:::
