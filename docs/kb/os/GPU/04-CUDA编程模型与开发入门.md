---
title: "CUDA编程模型与开发入门"
permalink: /kb/os/GPU/04-CUDA编程模型与开发入门/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU执行模型与线程调度", link: /kb/os/GPU/03-GPU执行模型与线程调度/ }
next: { text: "CUDA优化技术与性能调优", link: /kb/os/GPU/05-CUDA优化技术与性能调优/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
前面的笔记回答了 GPU 硬件怎么造、内存怎么组织、线程怎么调度，本章回答最实际的问题：**怎么写第一个能跑起来的 CUDA 程序？** 学完本章，你能独立搭建 CUDA 开发环境，写出带错误检查的向量加法 Kernel，理解 `<<<grid, block>>>` 到底在做什么、线程索引如何映射数据，并会用 nvcc 与 CMake 编译运行一个完整的 CUDA 工程。
:::

CUDA 是"软件定义并行"的典范：硬件只提供海量可编程核与统一调度，而"把问题切成无数小任务"这件工作完全由你在代码里显式完成。

## 1. CUDA 是什么

CUDA（Compute Unified Device Architecture，统一计算设备架构）是 NVIDIA 推出的**通用并行计算平台与编程模型**，让 GPU 不仅能画图，还能当作通用并行协处理器做科学计算、AI 训练。

### 1.1 历史与版本

- **2006 年**：NVIDIA 随 Tesla 架构（GeForce 8800 GTX，G80 芯片）发布 CUDA，早期叫 "C for CUDA"——在 C 语言上加了少量扩展（`__global__`、`<<< >>>`）即可写 GPU 程序；
- 之后按年迭代：CUDA 1.x → 4.x → 8.x → 11.x → **12.x**（2022 年起）→ 13.0（2025 年，支持 Blackwell B200）；
- 每代版本同时升级三样东西：编译器（nvcc）、运行时/驱动 API、附带的库（cuBLAS/cuDNN 等）。

::: note 版本速记：常见发行版是 **CUDA 12.x**（12.4/12.6/12.8）；文档里的"CUDA 版本"有多个含义（驱动上限 / 工具包 / 运行时库），区别见 [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)，本章先记住 `nvcc --version` 是工具包版本。
:::

### 1.2 CUDA 由四部分组成

| 组成部分 | 代表物 | 职责 |
|---|---|---|
| **工具链** | nvcc 编译器、cuda-gdb、Nsight（nsys/ncu）、cuobjdump | 编译、调试、剖析 |
| **运行时** | libcudart.so（Runtime API）、libcuda.so（Driver API） | 显存分配、kernel 启动、上下文管理 |
| **加速库** | cuBLAS、cuDNN、NCCL、cuFFT、Thrust | 免手写 Kernel 的高性能实现 |
| **硬件抽象** | SM、Warp、内存层次（[GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/)） | 编程模型与硬件一一对应 |

编程模型的关键设计：**线程分级组织**（grid → block → thread），配合**内存分级**（全局/共享/寄存器），让"并行度"和"局部性"都由程序员显式控制——这正是 CUDA 高性能的来源。

## 2. 开发环境搭建

### 2.1 驱动与 CUDA Toolkit 的关系

两条独立的软件：

- **显卡驱动（Driver）**：负责让操作系统认识 GPU，提供 CUDA 运行时所需的底层能力，自带一个"支持的最大 CUDA 版本"。
- **CUDA Toolkit**：开发包，含 nvcc、头文件、运行时库、示例。Toolkit 要求驱动版本 **不低于** 某个最低值（版本兼容矩阵），但**驱动向后兼容**——新驱动可以跑旧 Toolkit 编译的程序。

```bash
# 环境自检三板斧
nvidia-smi                              # ① 驱动与显卡信息
nvcc --version                          # ② CUDA Toolkit 版本
/usr/local/cuda/bin/deviceQuery         # ③ CUDA 运行时可用性（返回 PASS）
```

::: warning 最常见的环境困惑
`nvidia-smi` 右上角显示的 "CUDA Version: 12.4" **不是**你装的 Toolkit 版本，而是**当前驱动最多支持到 CUDA 12.4**。即使你机器上根本没装 Toolkit，这行字也会显示。`nvcc --version` 显示的才是真正的工具包版本。两者不一致是正常的：`nvidia-smi` 的版本 ≥ `nvcc` 的版本才健康。
:::

### 2.2 nvcc / cuda-gdb / Nsight 分工

| 工具 | 干什么 | 常用方式 |
|---|---|---|
| `nvcc` | 编译器驱动：把 .cu 编译成可执行文件 | `nvcc -arch=sm_80 -o app app.cu` |
| `cuda-gdb` | GPU 上的调试器（断点、查看寄存器/共享内存） | `cuda-gdb ./app` |
| `nsys`（Nsight Systems） | 系统级剖析：看 CPU/GPU 时间线、拷贝与计算重叠 | `nsys profile ./app` |
| `ncu`（Nsight Compute） | Kernel 级剖析：看吞吐、占用率、瓶颈（[GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)） | `ncu --set full ./app` |
| `cuobjdump` / `nvdisasm` | 查看 cubin 里的 SASS 汇编 | `cuobjdump -sass ./app` |

## 3. 第一个程序：Hello CUDA

```cpp
// hello.cu —— 最小 CUDA 程序
#include &lt;cstdio&gt;
__global__ void helloKernel() {
    // 每个线程打印自己所在的位置
    printf("Hello from thread (%d,%d,%d) of block (%d,%d,%d)\n",
           threadIdx.x, threadIdx.y, threadIdx.z,
           blockIdx.x, blockIdx.y, blockIdx.z);
}
int main() {
    helloKernel<<<2, 4>>>();   // 启动 2 个 block，每个 block 4 个线程
    cudaDeviceSynchronize();   // 等 GPU 跑完（kernel 是异步的！）
    return 0;
}
```

编译运行：`nvcc -o hello hello.cu && ./hello`，输出 8 行 "Hello from thread ..."。三个要点：

1. `__global__` 声明这是**在 GPU 上执行的函数**（Kernel）；
2. `<<<2, 4>>>` 是启动语法：`<<<gridDim, blockDim>>>`，总共 `2 × 4 = 8` 个线程；
3. 启动后**主机代码立即继续执行**（异步），必须 `cudaDeviceSynchronize()` 等待，否则可能看不到输出就退出。

## 4. 向量加法：第一个完整程序

```cpp
// vecadd.cu —— 向量加法 C = A + B
#include &lt;cstdio&gt;
#include &lt;cstdlib&gt;
// 错误检查宏：任何 CUDA API 出错立即打印并退出
#define CHECK_CUDA(call)                                                        \
    do {                                                                        \
        cudaError_t err = (call);                                               \
        if (err != cudaSuccess) {                                               \
            fprintf(stderr, "CUDA error %s at %s:%d: %s\n",                     \
                    cudaGetErrorName(err), __FILE__, __LINE__,                  \
                    cudaGetErrorString(err));                                   \
            exit(EXIT_FAILURE);                                                 \
        }                                                                       \
    } while (0)

// Kernel：每个线程算一个元素
__global__ void vecAdd(const float* A, const float* B, float* C, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;  // 全局线程编号
    if (idx < n) {                                     // 越界保护
        C[idx] = A[idx] + B[idx];
    }
}
int main() {
    const int n = 1 << 20;                    // 1,048,576 个元素
    const size_t bytes = n * sizeof(float);
    // ① 主机端数据
    float *h_A = (float*)malloc(bytes);
    float *h_B = (float*)malloc(bytes);
    float *h_C = (float*)malloc(bytes);
    for (int i = 0; i < n; ++i) { h_A[i] = 1.0f; h_B[i] = 2.0f; }
    // ② 设备端分配显存
    float *d_A, *d_B, *d_C;
    CHECK_CUDA(cudaMalloc(&d_A, bytes));
    CHECK_CUDA(cudaMalloc(&d_B, bytes));
    CHECK_CUDA(cudaMalloc(&d_C, bytes));
    // ③ 数据拷入 GPU
    CHECK_CUDA(cudaMemcpy(d_A, h_A, bytes, cudaMemcpyHostToDevice));
    CHECK_CUDA(cudaMemcpy(d_B, h_B, bytes, cudaMemcpyHostToDevice));
    // ④ 启动 Kernel：256 线程/块，块数向上取整
    int threads = 256;
    int blocks  = (n + threads - 1) / threads;
    vecAdd<<<blocks, threads>>>(d_A, d_B, d_C, n);
    CHECK_CUDA(cudaGetLastError());          // 捕获启动期错误（异步！）
    CHECK_CUDA(cudaDeviceSynchronize());     // 等待并捕获 Kernel 执行期错误
    // ⑤ 结果拷回主机
    CHECK_CUDA(cudaMemcpy(h_C, d_C, bytes, cudaMemcpyDeviceToHost));
    for (int i = 0; i < 10; ++i)
        printf("C[%d] = %f\n", i, h_C[i]);   // 期望都是 3.0
    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    free(h_A); free(h_B); free(h_C);
    return 0;
}
```

::: important 三步曲：H2D → Kernel → D2H
GPU 不能直接读你的堆内存，一切数据都要先 `cudaMemcpy` 进显存、算完再拷回来。这一步拷贝往往比计算还贵——这正是 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 里"减少数据搬运"的动机。`blocks = (n + threads - 1) / threads` 是经典向上取整，配合 `if (idx < n)` 处理尾部不足一块的线程。
:::

## 5. Kernel 语法与限定符

### 5.1 函数限定符

| 限定符 | 执行位置 | 调用位置 | 说明 |
|---|---|---|---|
| `__global__` | GPU | 只能从**主机**调用 | Kernel 入口；返回类型必须 `void`；不能取地址 |
| `__device__` | GPU | 只能从**设备**调用 | 设备端普通函数，可被 Kernel 调用 |
| `__host__` | CPU | 主机 | 普通主机函数（默认，可省略） |
| `__host__ __device__` | CPU+GPU | 两端 | 双端函数，常用于数学工具函数 |

### 5.2 `<<<gridDim, blockDim>>>` 启动语法

- 启动语法：`kernel<<<gridDim, blockDim, sharedMemBytes, stream>>>(args...)`，`sharedMemBytes` 为动态共享内存字节数、`stream` 为流（默认 0）；`gridDim`/`blockDim` 可为 `dim3`（如 `dim3(2,2,1)`）或单个整数（等价 `dim3(x,1,1)`）；
- 一个 block 最多 **1024** 个线程（x、y 方向各 ≤1024，z 方向 ≤64；现代架构 grid 的 x 方向可达 2³¹-1）；
- 启动是**异步**的：主机把任务写进命令缓冲就返回，GPU 排队执行。

::: warning 为什么 Kernel 是异步的？
同步启动意味着每个 `<<< >>>` 都要等 GPU 跑完，主机与 GPU 完全串行——延迟全暴露。异步启动让主机可以继续准备下一批数据、启动多个 Kernel，由硬件流水线并行执行（[GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/) 讲硬件如何靠大量 Warp 隐藏延迟）。代价是**错误也是异步的**：Kernel 内部出错（如越界访问）不会立刻抛给主机，必须靠 `cudaDeviceSynchronize()` 或后续 API 才能拿到错误码。
:::

## 6. 线程索引与数据映射

### 6.1 四个内建变量

| 内建变量 | 含义 | 示例 |
|---|---|---|
| `threadIdx` | 线程在块内的编号（dim3） | `threadIdx.x` |
| `blockIdx` | 块在网格内的编号（dim3） | `blockIdx.y` |
| `blockDim` | 块的维度（每块线程数） | `blockDim.x` |
| `gridDim` | 网格的维度（块数） | `gridDim.z` |

### 6.2 一维映射（最常用）

```text
全局线程编号 idx = blockIdx.x * blockDim.x + threadIdx.x
例：blockDim.x = 256，blockIdx.x = 3，threadIdx.x = 42
    idx = 3 * 256 + 42 = 810        ← 该线程负责第 810 个元素
```

### 6.3 二维网格映射（处理图像/矩阵）

```text
          gridDim = (2, 2)   ← 4 个 block
┌───────────────────────┬───────────────────────┐
│     Block(0,0)        │     Block(1,0)        │
│  线程 (tx,ty)∈[0,4)×[0,3) │  线程 (tx,ty)∈[0,4)×[0,3) │
├───────────────────────┼───────────────────────┤
│     Block(0,1)        │     Block(1,1)        │
└───────────────────────┴───────────────────────┘
  blockDim = (4, 3)，每个 block 12 个线程，共 48 个线程
```

```cpp
// 二维图片 W×H，按行主序存在一维数组里
int gx = blockIdx.x * blockDim.x + threadIdx.x;   // 全局列
int gy = blockIdx.y * blockDim.y + threadIdx.y;   // 全局行
if (gx < W && gy < H) {
    int linear = gy * W + gx;                     // 展成一维下标
    out[linear] = process(in[linear]);
}
```

::: tip 把问题拆成"几何结构"
一维数据用一维 grid，二维图像用二维 grid，三维体数据用三维 grid——**让线程的几何形状尽量贴合数据的几何形状**，索引计算最自然、也最容易做合并访存（[GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)）。
:::

## 7. 内存 API 入门

| API | 作用 |
|---|---|
| `cudaMalloc(&ptr, bytes)` | 在显存分配 `bytes` 字节 |
| `cudaFree(ptr)` | 释放显存 |
| `cudaMemset(ptr, val, bytes)` | 把显存区域置为某值（如清零） |
| `cudaMemcpy(dst, src, bytes, kind)` | 在主机/设备间拷贝数据 |

`cudaMemcpy` 的方向枚举：

| 枚举值 | 方向 | 何时用 |
|---|---|---|
| `cudaMemcpyHostToDevice` | 主机 → 设备 | 把输入数据拷进显存 |
| `cudaMemcpyDeviceToHost` | 设备 → 主机 | 把结果拷回主机 |
| `cudaMemcpyDeviceToDevice` | 设备 → 设备 | 显存内拷贝 |
| `cudaMemcpyDefault` | 自动推断 | 需要统一虚拟寻址（见 [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)） |

```cpp
cudaMalloc(&d_A, bytes);                          // 分配
cudaMemset(d_A, 0, bytes);                        // 清零
cudaMemcpy(d_A, h_A, bytes, cudaMemcpyHostToDevice);  // 拷入
cudaMemcpy(h_C, d_C, bytes, cudaMemcpyDeviceToHost);  // 拷出
cudaFree(d_A);                                    // 释放
```

::: note Pinned 内存：普通 `malloc` 内存可被 OS 换页，`cudaMemcpy` 需先锁定页面再 DMA，慢；`cudaHostAlloc` 分配**页锁定内存**可提升 H2D/D2H 带宽，也是 `cudaMemcpyAsync` 的前提（细节见 [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)）。
:::

## 8. 错误处理

CUDA API 几乎全部返回 `cudaError_t`，Kernel 启动没有返回值——所以错误检查要分两层：

| API | 行为 |
|---|---|
| `cudaGetLastError()` | 返回**最近一次**错误并**清除**错误标志 |
| `cudaPeekAtLastError()` | 返回最近一次错误但**不清除**（"偷看"） |
| `cudaDeviceSynchronize()` | 同步等待；若之前异步的 Kernel 出错，返回该错误 |

```cpp
// 标准检查套路：启动后立刻查一次，同步后再查一次
vecAdd<<<blocks, threads>>>(d_A, d_B, d_C, n);
CHECK_CUDA(cudaGetLastError());      // ① 启动参数/资源错误（如块数超限）
CHECK_CUDA(cudaDeviceSynchronize()); // ② Kernel 内部错误（如非法访存）
```

::: important 为什么启动后还要查两次
启动是异步的，`<<< >>>` 本身不返回值。参数错误（如 blockDim 超过 1024）会在**启动时**由驱动捕获；而 Kernel 执行中的错误（非法地址等）要等同步点才浮出来。只查一次会漏掉一半错误。
:::

## 9. 编译与构建

### 9.1 nvcc 单文件编译

```bash
nvcc --version                                   # 工具包版本（12.x）
nvcc -arch=sm_80 -o vecadd vecadd.cu             # 为 A100（Ampere）编译
nvcc -arch=sm_80 -O3 -o vecadd vecadd.cu         # 加优化
nvcc -g -G -o vecadd vecadd.cu                   # -g 主机调试、-G 设备调试（cuda-gdb）
# 多架构 fatbin：一次编译，多卡可跑
nvcc -gencode arch=compute_80,code=sm_80 \
     -gencode arch=compute_90,code=sm_90 \
     -gencode arch=compute_90,code=compute_90 \
     -o vecadd vecadd.cu
```

`-arch` 与 `-gencode` 的区别：

| 写法 | 产物 | 能否跨架构 |
|---|---|---|
| `-arch=sm_80` | 只生成 **SASS**（sm_80 专用机器码） | 否，换卡需重编 |
| `-arch=compute_80` | 只生成 **PTX**（中间语言） | 是，运行时由驱动 JIT 编译 |
| `-gencode arch=compute_80,code=sm_80` | SASS + 可选 PTX，打包进 fatbin | 指定的都能跑 |
| `-gencode arch=compute_90,code=compute_90` | 附加 PTX，新卡可 JIT | 是（兜底方案） |

::: warning "no kernel image is available" 报错
用 `sm_80` 编出的程序拿到 H100（sm_90）上跑，若 fatbin 里没有 PTX，驱动无法 JIT，就会报 "no kernel image is available for execution on the device"。解决办法：要么按目标卡重编，要么像上面那样在 fatbin 里**同时带一份 PTX**（`code=compute_XX`）做兜底。显卡算力对照表见 [. 版本排查实战](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/#8.%20%E7%89%88%E6%9C%AC%E6%8E%92%E6%9F%A5%E5%AE%9E%E6%88%98)。
:::

### 9.2 编译产物：host code / PTX / SASS / cubin

```text
vecadd.cu
  ├── 主机代码 ──► nvcc 调用宿主编译器(gcc/cl) ──► 目标文件（.o）
  └── 设备代码 ──► 生成 PTX（中间语言，类汇编）──► 汇编为 SASS（架构相关）──► cubin（二进制）
两者合并进 fatbin（可含多架构 SASS + PTX）──► 链接 ──► 可执行文件
运行时：加载 fatbin；有匹配 SASS 直接用，否则用 PTX 让驱动 JIT 编译
```

- **PTX**：虚拟指令集，与具体卡无关，可 JIT（可移植、性能略降）；
- **SASS**：某代架构的真实机器码（sm_80 专用），性能最佳；
- 用 `cuobjdump -sass ./vecadd` 可反汇编查看 SASS。

### 9.3 CMake 最小工程

```cmake
cmake_minimum_required(VERSION 3.18)
project(vecadd LANGUAGES CXX CUDA)          # 声明启用 CUDA 语言
find_package(CUDAToolkit REQUIRED)          # 找到 Toolkit（不要求 CMake 自带 CUDA 支持）
add_executable(vecadd vecadd.cu)
target_link_libraries(vecadd PRIVATE CUDA::cudart)
```

```bash
cmake -B build -DCMAKE_CUDA_ARCHITECTURES=80   # 指定算力（= nvcc -arch=sm_80）
cmake --build build -j
./build/vecadd
```

## 10. Streams 与 Events 入门

Stream（流）是一串按序执行的 GPU 操作队列；Event（事件）是队列里的"里程碑"。最小用法：

```cpp
// Event：测 Kernel 耗时
cudaEvent_t start, stop;
cudaEventCreate(&start);
cudaEventCreate(&stop);
cudaEventRecord(start);
vecAdd<<<blocks, threads>>>(d_A, d_B, d_C, n);
cudaEventRecord(stop);
cudaEventSynchronize(stop);
float ms = 0.0f;
cudaEventElapsedTime(&ms, start, stop);
printf("kernel time: %.3f ms\n", ms);
// Stream：让 Kernel 在非默认流里异步执行
cudaStream_t stream;
cudaStreamCreate(&stream);
vecAdd<<<blocks, threads, 0, stream>>>(d_A, d_B, d_C, n);
cudaStreamSynchronize(stream);
cudaStreamDestroy(stream);
```

::: note 深水区预告
多流并行、拷贝与计算重叠、CUDA Graphs 是异步优化的主战场，见 [. 异步与重叠](/kb/os/GPU/05-CUDA优化技术与性能调优/#8.%20%E5%BC%82%E6%AD%A5%E4%B8%8E%E9%87%8D%E5%8F%A0)。现在只需记住：默认流（0）与主机同步，非默认流之间可以并行。
:::

## 11. 小练习建议

按顺序做，每步都用 `ncu` 看一眼指标（[GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)）：

1. **deviceQuery**：跑通 CUDA Samples 里的 `deviceQuery`，确认驱动/Toolkit/算力匹配（环境验证）；
2. **向量加法**：照本章代码实现，改为 `float4` 向量化后对比耗时（预热 [. 访存优化](/kb/os/GPU/05-CUDA优化技术与性能调优/#3.%20%E8%AE%BF%E5%AD%98%E4%BC%98%E5%8C%96)）；
3. **矩阵加法**：把 2D grid 映射真正用起来，注意行主序下标计算。

## 12. 本章小结

- CUDA = 工具链 + 运行时 + 加速库 + 硬件抽象；驱动负责底层，Toolkit 负责开发；
- `nvidia-smi` 的 CUDA 版本是驱动支持的**上限**，`nvcc --version` 才是工具包版本；
- Kernel 用 `<<<grid, block>>>` 启动，**异步执行**，错误要"启动后 + 同步后"查两次；
- 线程索引：`idx = blockIdx.x * blockDim.x + threadIdx.x`，多维 grid 逐维展开；
- 数据搬运三步曲 H2D → Kernel → D2H 是一切 CUDA 程序的骨架；
- 编译用 `nvcc -arch=sm_XX` 或 CMake `find_package(CUDAToolkit)`；fatbin 可多架构 + PTX 兜底。

::: tip 引出下一章
会写程序只是第一步。同一个向量加法，写得讲究和不讲究能差出 10 倍——下一章 [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) 讲怎么用 Roofline 判断瓶颈、合并访存、共享内存 tiling、占用率与流水线重叠，把 Kernel 从"能跑"调到"跑满"。
:::

## 自测题

**1. `nvidia-smi` 显示 "CUDA Version: 12.4"，但 `nvcc --version` 显示 11.8，正常吗？分别代表什么？**
答：正常。`nvidia-smi` 的 CUDA Version 是**驱动支持的最大 CUDA 版本**（12.4），`nvcc` 的版本是**已安装 Toolkit 的版本**（11.8）。两者含义不同：驱动向后兼容，只要驱动版本 ≥ Toolkit 要求的最低驱动，就能正常开发运行。

**2. `helloKernel<<<2, 4>>>()` 一共启动多少线程？若去掉 `cudaDeviceSynchronize()` 会发生什么？**
答：2×4=8 个线程（2 个 block、每块 4 个线程）。Kernel 是异步的，主机可能先于 GPU 执行完 main 并退出，输出可能丢失或为空；`cudaDeviceSynchronize()` 让主机等待 GPU 全部完成。

**3. 一维数组有 1,000,000 个元素，用 256 线程/块，需要多少 block？尾部如何处理？**
答：`(1000000 + 256 - 1) / 256 = 3907` 个 block（3906×256 = 999,936 不够覆盖，3907×256 = 1,000,192 全覆盖，最后一个 block 只有部分线程有效）。Kernel 里必须 `if (idx < n)` 做越界保护，防止多余线程写越界内存。

**4. 二维网格中，线程 (threadIdx.x=3, threadIdx.y=5) 位于 block(2, 1)，blockDim=(16, 16)，求它在 W 宽行主序矩阵中的一维下标。**
答：gx = 2×16+3 = 35，gy = 1×16+5 = 21；linear = gy×W + gx = 21W + 35。

**5. `cudaMemcpy` 有哪四种方向枚举？pinned 内存为什么拷贝更快？**
答：HostToDevice、DeviceToHost、DeviceToDevice、HostToHost（以及 UVM 下的 Default）。pinned 内存页锁定、不会被换出，驱动可直接用 DMA 搬运，无需先"锁页再拷贝"两步，且是 `cudaMemcpyAsync` 异步拷贝的前提。

**6. 为什么 Kernel 启动后要同时调用 `cudaGetLastError()` 和 `cudaDeviceSynchronize()`？两者各捕获什么错误？**
答：`cudaGetLastError()` 捕获**启动期错误**（如 grid/block 维度超限、参数非法），这类错误在 `<<< >>>` 调用后立即可查；Kernel 是异步的，**执行期错误**（如非法地址）要等 `cudaDeviceSynchronize()` 同步点才返回。只查一次会漏掉另一类错误。

**7. `-arch=sm_80` 与 `-arch=compute_80` 的区别？"no kernel image is available" 怎么解决？**
答：`sm_80` 只生成 sm_80 的 SASS 机器码，不能跨架构；`compute_80` 只生成 PTX 中间码，可被驱动 JIT 编译到任意新架构（略慢）。报 "no kernel image" 说明 fatbin 里既无当前卡的 SASS 也无 PTX 兜底：应针对目标卡重编，或用 `-gencode arch=compute_XX,code=compute_XX` 附带 PTX。

**8. PTX、SASS、cubin 三者什么关系？运行时如何选择？**
答：nvcc 先把设备代码编译成 PTX（虚拟指令集，可移植），再汇编成 SASS（特定架构机器码），打包成 cubin（含在一个 fatbin 里）。运行时优先加载匹配当前 GPU 的 SASS；没有匹配 SASS 但有 PTX 时，由驱动 JIT 编译 PTX 执行。

**9. 事件（Event）的典型用途？写代码片段测一个 Kernel 的耗时。**
答：在流中记录里程碑，用于计时与流间同步。片段：`cudaEventCreate(&s,&e); cudaEventRecord(s); kernel<<<...>>>(); cudaEventRecord(e); cudaEventSynchronize(e); cudaEventElapsedTime(&ms, s, e);`。

::: note 提示
第 3、4 题是面试高频手写题：一维/二维索引公式必须能默写。第 7 题对应真实部署中"编译的卡和运行的卡不一致"的经典事故，务必理解 fatbin 与 PTX 兜底机制。
:::
