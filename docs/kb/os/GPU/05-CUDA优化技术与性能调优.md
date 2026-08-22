---
title: "CUDA优化技术与性能调优"
permalink: /kb/os/GPU/05-CUDA优化技术与性能调优/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "CUDA编程模型与开发入门", link: /kb/os/GPU/04-CUDA编程模型与开发入门/ }
next: { text: "GPU驱动与CUDA运行时栈", link: /kb/os/GPU/06-GPU驱动与CUDA运行时栈/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
[CUDA编程模型与开发入门](/kb/os/GPU/04-CUDA编程模型与开发入门/) 教会你"写出能跑的 Kernel"，本章回答：**怎么把 Kernel 从"能跑"调到"跑满"？** 学完本章，你能用 Roofline 模型判断一个 Kernel 是带宽瓶颈还是算力瓶颈，并针对性地使用合并访存、向量化、共享内存 tiling、占用率调优、多流重叠等手段，把性能从"能跑"提升到"接近峰值"，最后能说出每个优化手段大概能带来多少收益。
:::

优化的第一原则：**先测量，再动手**。没有数据支撑的优化都是玄学。

## 1. 优化方法论：先测量后优化

### 1.1 测量工具

- `ncu`（Nsight Compute）—— 逐 Kernel 剖析，给出 DRAM/SM 吞吐、占用率、各指令占比（ncu 是 nvprof 的继任者，nvprof 自 CUDA 10 起废弃）；
- `nsys`（Nsight Systems）—— 全程序时间线，看拷贝/计算/等待的分布；
- 详细用法见 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)。

```bash
ncu --set full ./vecadd          # 关键指标：Memory Throughput / SM Throughput
nsys profile ./vecadd            # 看 CPU-GPU 时间线
```

::: warning 别用 `nvprof`
老教程里的 `nvprof` 自 CUDA 10 已废弃、CUDA 12 移除，一律用 `ncu` / `nsys`。
:::

### 1.2 Roofline 模型

Roofline 用一个二维图回答"这个 Kernel 的天花板在哪、瓶颈是什么"：

```text
性能 (GFLOP/s)
  │                          ╱  ← 屋顶：受限于峰值算力
  │                        ╱      （compute-bound 区）
  │                      ╱
  │                    ╱
  │                  ╱     ● ridge point = 峰值算力 / 峰值带宽
  │                ╱           （分界点）
  │              ╱
  │            ╱  ← 斜线：受限于峰值带宽（memory-bound 区）
  │          ╱
  │────────╱─────────────────────────────► 计算强度 (FLOP/Byte)
```

- **计算强度（Arithmetic Intensity）** = 总浮点操作数 / 总访存字节数（FLOP/Byte）；
- **分界点（ridge point）** = 峰值算力 / 峰值带宽：计算强度高于它 → **算力瓶颈**；低于它 → **带宽瓶颈**；
- 落在屋顶之下 → 代码还没用好硬件，有优化空间。

::: tip 例：A100（FP32 约 19.5 TFLOPS，HBM2e 带宽约 1.6 TB/s）
ridge ≈ 19.5e12 / 1.6e12 ≈ 12 FLOP/Byte。向量加法算 1 次加、读写各 4 字节：强度 = 1/(4+4) = 0.125 FLOP/Byte，远低于 12 → **铁定带宽瓶颈**，优化方向是压访存量，不是加算力。矩阵乘法（大 K）强度可达几十到几百 → 算力瓶颈，方向是喂饱 SM。
:::

## 2. 判断瓶颈

### 2.1 看 ncu 的两个吞吐指标

| 指标 | 含义 | 接近峰值说明 |
|---|---|---|
| `DRAM Throughput`（`dram__throughput.avg.pct_of_peak_sustained_elapsed`） | 显存带宽利用率 | 高 → 带宽瓶颈 |
| `SM Throughput`（`sm__throughput.avg.pct_of_peak_sustained_elapsed`） | SM 计算单元利用率 | 高 → 算力瓶颈 |
| `Duration`（`gpu__time_duration.sum`） | Kernel 总耗时 | 优化后的对照基准 |

两个都低 → 代码有问题（占用率低、分支发散、访存模式差、启动开销），先查[GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)的占用率与 Warp 效率。

### 2.2 带宽型 vs 算力型：优化策略完全不同

| 维度 | 带宽型（memory-bound） | 算力型（compute-bound） |
|---|---|---|
| 特征 | 计算强度低（< ridge） | 计算强度高（> ridge） |
| 典型例子 | 向量加法、拷贝、归约、转置 | 矩阵乘法、卷积、FFT |
| 瓶颈指标 | DRAM 吞吐 ≈ 峰值带宽 | SM 吞吐 ≈ 峰值算力 |
| 优化重点 | 合并访存、向量化、少搬数据、kernel 融合 | 共享内存复用、寄存器缓存、指令级并行、Tensor Core |
| 优化的极限 | 峰值带宽（带宽是墙） | 峰值算力（算力是墙） |
| 提高计算强度能解决吗 | 能（把多次遍历合成一次） | 收益有限（已算力瓶颈） |

## 3. 访存优化

### 3.1 合并访存（回顾 [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)）

GPU 访存以 **Warp（32 线程）** 为单位、按 **32 字节扇区 / 128 字节缓存行** 批量取数。**合并访存 = 同一 Warp 的相邻线程访问相邻地址**，一次事务取回整段数据。

```text
合并访存（理想）：
  线程:  t0   t1   t2   ...          t31
  地址: [0]  [4]  [8]  ...          [124]   ← 32×4B 连成 128B，1 个事务搞定

跨步访存（糟糕）：
  线程:  t0   t1   t2   ...          t31
  地址: [0] [128] [256] ...        [3968]   ← 每个 4B 都要单独一个事务，带宽浪费 32 倍
```

**stride 访问的修正**：遍历二维矩阵时，`i` 外层、`j` 内层且 `j` 映射到 `threadIdx.x`（行主序下沿行方向连续），即可天然合并：

```cpp
// 错误示范：线程沿列方向取数（stride = K），32 个线程分散在 32 行 → 不合并
__global__ void bad(float* A, int M, int K) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;  // 线程对应行
    for (int j = 0; j < K; ++j) A[i * K + j] *= 2.0f;  // 每个线程访问不同行 → 发散
}

// 正确示范：线程沿行方向取数，相邻线程相邻地址 → 合并
__global__ void good(float* A, int M, int K) {
    int j = blockIdx.x * blockDim.x + threadIdx.x;  // 线程对应列
    for (int i = 0; i < M; ++i) A[i * K + j] *= 2.0f;  // 同一行内连续 → 合并
}
```

### 3.2 向量化：float4（128-bit 访问）

把 4 个 float 打包成 `float4` 一次读 16 字节，事务数降到 1/4，同时减少指令数：

```cpp
__global__ void vecAddFloat4(const float4* A, const float4* B, float4* C, int n4) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n4) {
        float4 a = A[i], b = B[i];
        C[i] = make_float4(a.x + b.x, a.y + b.y, a.z + b.z, a.w + b.w);
    }
}
// 调用时：把数组强转并除以 4
vecAddFloat4<<<blocks, threads>>>((const float4*)d_A, (const float4*)d_B,
                                  (float4*)d_C, n / 4);
```

::: important float4 的两个前提
1. **16 字节对齐**：`cudaMalloc` 分配的内存天然 256 字节对齐，直接可用；自建结构体要注意 `__align__(16)`。
2. **元素个数能被 4 整除**：处理不了尾部剩余元素（可让最后一个线程单独收尾，或要求输入为 4 的倍数）。
:::

### 3.3 案例：矩阵转置（未合并 → 共享内存版）

转置的经典困境：读行是合并的，**写列就变成跨步的**（反之亦然）。以 N×N 矩阵为例：

```cpp
// 朴素版：读合并（按行），写不合并（按列，stride=N）→ 写侧带宽浪费 N 倍
__global__ void transposeNaive(const float* in, float* out, int N) {
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x < N && y < N) out[x * N + y] = in[y * N + x];
}
```

优化思路：**用共享内存做"搬运中转"**——以块为单位读入（合并读）→ 存入共享内存 → 转置地写出（合并写）。读和写各自都合并了：

```cpp
#define TILE 32
__global__ void transposeSmem(const float* in, float* out, int N) {
    __shared__ float tile[TILE][TILE];          // 32×32 块，读入后原地转置存放
    int x = blockIdx.x * TILE + threadIdx.x;    // 目标列
    int y = blockIdx.y * TILE + threadIdx.y;    // 目标行
    if (x < N && y < N)
        tile[threadIdx.y][threadIdx.x] = in[y * N + x];   // 合并读
    __syncthreads();
    x = blockIdx.y * TILE + threadIdx.x;        // 交换 block 角色
    y = blockIdx.x * TILE + threadIdx.y;
    if (x < N && y < N)
        out[y * N + x] = tile[threadIdx.x][threadIdx.y];  // 合并写（读共享内存无 DRAM 事务）
}
```

::: note 收益量级
朴素转置写侧一个 Warp 写 32 个分散地址，带宽利用率可能只有个位数百分比；共享内存版两侧都合并，带宽利用率可到 70%+。若要再压榨，可叠加 float4（一次搬运 4 元素）与 padding（消除 Bank 冲突，见下节）。
:::

## 4. 共享内存优化：矩阵乘法 tiling

矩阵乘法 C[M×N] = A[M×K] × B[K×N] 是 CUDA 的"hello world"级优化案例。我们走三步，每一步都能量化收益。

### 4.1 基础版（naive）：每个线程算一个 C 元素

```cpp
__global__ void matMulNaive(const float* A, const float* B, float* C,
                            int M, int N, int K) {
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    if (row < M && col < N) {
        float sum = 0.0f;
        for (int k = 0; k < K; ++k)
            sum += A[row * K + k] * B[k * N + col];   // 每个 k 都要读两次全局内存
        C[row * N + col] = sum;
    }
}
```

问题：对每个 (row, col)，内层循环**重复读** A 的一行和 B 的一列，全局访存次数 = 2MNK，而数据本身只有 (M+N)K 个元素——**数据被反复从 HBM 搬运**，带宽彻底爆掉。

### 4.2 共享内存版（tiling）：数据只读一次进 SM

让一个 block 负责一个 TILE×TILE 的输出子块，把 A、B 对应的条带**分块载入共享内存**，块内所有线程复用：

```cpp
#define TILE 16
__global__ void matMulSmem(const float* A, const float* B, float* C,
                           int M, int N, int K) {
    __shared__ float As[TILE][TILE];   // A 的一块
    __shared__ float Bs[TILE][TILE];   // B 的一块
    int row = blockIdx.y * TILE + threadIdx.y;
    int col = blockIdx.x * TILE + threadIdx.x;
    float sum = 0.0f;

    for (int t = 0; t < (K + TILE - 1) / TILE; ++t) {
        // 协作载入：256 个线程一起把 A、B 的两个 TILE 搬进共享内存
        if (row < M && t * TILE + threadIdx.x < K)
            As[threadIdx.y][threadIdx.x] = A[row * K + t * TILE + threadIdx.x];
        else
            As[threadIdx.y][threadIdx.x] = 0.0f;
        if (col < N && t * TILE + threadIdx.y < K)
            Bs[threadIdx.y][threadIdx.x] = B[(t * TILE + threadIdx.y) * N + col];
        else
            Bs[threadIdx.y][threadIdx.x] = 0.0f;
        __syncthreads();                       // ① 全员到位才能开算

        for (int k = 0; k < TILE; ++k)
            sum += As[threadIdx.y][k] * Bs[k][threadIdx.x];   // 全部命中共享内存

        __syncthreads();                       // ② 算完才能覆盖下一块
    }
    if (row < M && col < N) C[row * N + col] = sum;
}
```

::: important `__syncthreads()` 语义
块内**所有线程**都到达该点后才继续，是共享内存数据正确性的保证。① 防止有人还没写完共享内存就开始读；② 防止有人还在用旧数据就覆盖。它只同步**块内**，不能跨块同步。
:::

收益：全局内存读取从 `2MNK` 降到 `2MNK/TILE`，带宽压力缩小 TILE 倍。256 线程、TILE=16 时大约能带来 **5~10 倍** 于 naive 的提速（瓶颈转为 SM 吞吐）。

### 4.3 消除 Bank 冲突：padding + 循环展开

共享内存分 **32 个 Bank**，每 Bank 4 字节，同一周期内**不同地址落在同一 Bank 会被串行化**（[GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)）。上例中 `As[threadIdx.y][k]` 访问同一列 k 的 16 个不同行——按 `As[y][k]` 的地址 `y*TILE + k` 算 Bank = (y*16+k)%32，线程两两命中同一 Bank，产生冲突。

**Padding（补一列）**：把 `As[TILE][TILE]` 改成 `As[TILE][TILE+1]`，行首错开 1 个 float，Bank 分布被打散，冲突消除。再叠加**循环展开**（手动展开 k 循环，减少 `__syncthreads` 相对开销与地址计算）：

```cpp
#define TILE 16
__shared__ float As[TILE][TILE + 1];   // padding 消除 Bank 冲突
__shared__ float Bs[TILE][TILE + 1];

// 内层改为手动展开 4 次，减少循环开销、提高指令级并行
#pragma unroll
for (int k = 0; k < TILE; k += 4) {
    sum += As[threadIdx.y][k + 0] * Bs[k + 0][threadIdx.x];
    sum += As[threadIdx.y][k + 1] * Bs[k + 1][threadIdx.x];
    sum += As[threadIdx.y][k + 2] * Bs[k + 2][threadIdx.x];
    sum += As[threadIdx.y][k + 3] * Bs[k + 3][threadIdx.x];
}
```

::: tip 收益量级（A100 实测参考）
naive 约 0.2~0.5 TFLOPS → 共享内存 tiling 约 2~4 TFLOPS → padding+展开约 4~6 TFLOPS → 继续加 float4、寄存器分块、双缓冲可到 10+ TFLOPS → cuBLAS 用 Tensor Core 直接干到 15+ TFLOPS。**每一步都是数量级或翻倍级别的提升**，这就是为什么矩阵乘法是调优必修课。
:::

## 5. 占用率调优

占用率 = 活跃 Warp 数 / SM 最大可容纳 Warp 数，决定延迟能否被隐藏（[GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)）。

### 5.1 block 大小选择

| block 大小 | 典型效果 | 说明 |
|---|---|---|
| 128 | 小、占用率弹性大、每块开销低 | 适合小问题、共享内存占用大的 Kernel |
| **256** | 通用首选：占用率与块调度开销平衡 | 绝大多数 Kernel 从 256 起步试 |
| 512 / 1024 | 块少、同步粒度大 | 适合共享内存小、需要大块协作的 Kernel |

实践：把 block 大小做成可配置参数，用 `ncu` 扫 64~1024 各档，选 `Duration` 最小者——**不要凭感觉**。

### 5.2 寄存器是占用率的头号敌人

每 SM 寄存器有限（如 A100 每 SM 65536 个 32 位寄存器，最多 2048 线程）：

```text
每线程用 64 寄存器 → 65536/64 = 1024 线程/SM → 占用率 50%
每线程用 32 寄存器 → 65536/32 = 2048 线程/SM → 占用率 100%
```

```cpp
// __launch_bounds__：告诉编译器"块内最多 256 线程、每 SM 至少 8 个块"
// → 编译器自动限制寄存器 ≤ 65536/(256×8) = 32 个，以保证 8 块×256=2048 线程
__global__ void __launch_bounds__(256, 8) myKernel(...) { ... }
```

```bash
nvcc -maxrregcount=64 -o app app.cu   # 全局限制每线程寄存器 ≤ 64（粗暴手段）
```

::: warning 占用率不是越高越好
压寄存器会引发**寄存器溢出（spill）到本地内存**，反而变慢；占用率换不来缓存（L1/共享内存被更多块瓜分）。正确姿势：**先满足访存/计算需求，再看占用率**。经验上 50% 以上的占用率往往就能吃饱带宽，不必盲目追求 100%。
:::

## 6. 指令优化

### 6.1 分支发散

Warp 内线程走不同分支时，硬件**两个分支串行执行**（SIMT 限制），最坏浪费一半算力：

```cpp
// 发散版本：warp 内一半走 A、一半走 B
if (data[i] > 0) { result[i] = f(data[i]); }
else             { result[i] = g(data[i]); }

// 优化 1：数据重排——先按条件把数据分组，让同组线程集中执行
// 优化 2：用谓词（predication）替代分支，编译器对短分支自动做
result[i] = (data[i] > 0) ? f(data[i]) : g(data[i]);   // 可编译为无分支选择
```

::: tip 分支发散的本质
代价是**执行的指令条数**而不是"判断"本身：两条路径各 10 条指令，32 个线程就要执行 20 条。让**路径长度差**变小（尽量让 Warp 内数据同类）比消除 if 本身更重要。
:::

### 6.2 循环展开与编译器提示

```cpp
#pragma unroll            // 让编译器展开循环（或 #pragma unroll 4 指定倍数）
for (int k = 0; k < K; ++k) sum += ...;

#pragma unroll 1          // 禁用展开，避免 I-cache 压力过大
```

### 6.3 数学函数

| 写法 | 说明 |
|---|---|
| `a / b` | 通用除法，慢 |
| `__fdividef(a, b)` | 快速除法，精度略低（2 ulp 内） |
| `__expf / __logf / __sinf` | 快速版数学函数（`__` 前缀） |
| `-use_fast_math` | 编译开关：全局启用快速数学（**注意精度损失**） |
| 常量折叠 | 编译期可算的表达式（如 `x * 2.0f`）让编译器自动优化 |

::: warning fast math 的坑
`-use_fast_math` 会把 `sinf/cosf/除法` 全换成近似版本，还能关闭 denormal 处理。科学计算若在意数值精度，**逐函数选用 `__` 版本**比全局开关安全得多。
:::

## 7. 减少数据搬运

GPU 最贵的是 DRAM 流量，少搬一次就是一次提速。

### 7.1 Kernel 融合（fusion）

多个 elementwise 操作合并成一个 Kernel，避免中间结果往返 HBM：

```cpp
// 分开写：d_temp 写一次、读一次，多出 2×N 流量
add<<<...>>>(d_temp, A, B, N);
scale<<<...>>>(C, d_temp, 2.0f, N);

// 融合：一次遍历完成 y = 2*(a+b)，流量减半
__global__ void addScale(const float* A, const float* B, float* C, float s, int N) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < N) C[i] = s * (A[i] + B[i]);
}
```

### 7.2 用对存储空间

- **常量内存（`__constant__`）**：全体线程读同一地址时走广播路径，如权重、系数表；
- **纹理/表面内存**：需要硬件插值、二维局部性好的访问（如 stencil 的邻居读取）；
- **`__restrict__` 别名提示**：告诉编译器两个指针不指向同一内存，允许它放心缓存/重排：

```cpp
__global__ void vecAdd(const float* __restrict__ A,
                       const float* __restrict__ B,
                       float* __restrict__ C, int N) { ... }
```

## 8. 异步与重叠

### 8.1 多 Stream 并行 + 拷贝/计算重叠

拷贝引擎（Copy Engines）和 SM 是**独立硬件**，可以同时干活。用 `cudaMemcpyAsync` + 非默认流把"拷下一块"和"算当前块"重叠：

```text
串行（默认流）：
时间 ────────────────────────────────────────────►
     [H2D A] [Kernel A] [D2H A] [H2D B] [Kernel B] [D2H B]
     任意时刻只有拷贝引擎或 SM 在工作

重叠（两个流 + cudaMemcpyAsync + pinned 内存）：
     [H2D A] [Kernel A] [D2H A]
              [H2D B] [Kernel B] [D2H B]
     拷贝与计算并行，总耗时 ≈ 串行的 1/2 ~ 2/3
```

```cpp
cudaStream_t s1, s2;
cudaStreamCreate(&s1); cudaStreamCreate(&s2);
// 前提：h_A/h_B 必须用 cudaHostAlloc 分配（pinned），否则 Async 退化为同步
cudaMemcpyAsync(d_A, h_A, bytes, cudaMemcpyHostToDevice, s1);
cudaMemcpyAsync(d_B, h_B, bytes, cudaMemcpyHostToDevice, s2);
kernel1<<<grid, block, 0, s1>>>(d_A, d_C, N);
kernel2<<<grid, block, 0, s2>>>(d_B, d_D, N);
cudaMemcpyAsync(h_C, d_C, bytes, cudaMemcpyDeviceToHost, s1);
cudaMemcpyAsync(h_D, d_D, bytes, cudaMemcpyDeviceToHost, s2);
cudaStreamSynchronize(s1); cudaStreamSynchronize(s2);
```

::: warning 三个必备条件
① 必须用 **pinned 内存**（`cudaHostAlloc`）；② 必须用 **`cudaMemcpyAsync`**（同步版 `cudaMemcpy` 会隐式同步）；③ 不能混用默认流（默认流与所有流隐式同步，会偷偷把并行废掉）。
:::

### 8.2 CUDA Graphs：一次提交一张图

Stream 每次 launch 都要走一遍 API 调用的 CPU 开销；小 Kernel 密集启动时 CPU 反而成瓶颈。**CUDA Graphs** 把一串 Kernel/拷贝录制成图，一次提交、GPU 内部按依赖调度：

```cpp
cudaGraph_t graph;
cudaGraphExec_t exec;
cudaStream_t stream; cudaStreamCreate(&stream);

// 捕获模式：把下面这段"照常写的启动代码"录制成图
cudaStreamBeginCapture(stream, cudaStreamCaptureModeThreadLocal);
    kernel1<<<grid, block, 0, stream>>>(...);
    kernel2<<<grid, block, 0, stream>>>(...);   // 依赖自动推导
cudaStreamEndCapture(stream, &graph);

cudaGraphInstantiate(&exec, graph, 0);
cudaGraphLaunch(exec, stream);    // 一次提交，GPU 侧按依赖执行
cudaStreamSynchronize(stream);
// 后续可重复 cudaGraphLaunch(exec, stream) 复用
```

适合：启动开销占比高的小 Kernel 密集场景（如每步都调用几十个 Kernel 的推理循环），可省掉每次 launch 的 CPU 开销，典型收益 5~30% 端到端。

## 9. 案例研究

### 9.1 向量求和 Reduction（归约）

朴素"每个线程读一个元素，最后累加"的问题是串行依赖 + 线程太多。两步优化：

1. **Tree reduction**：每个线程先顺序累加多个元素（grid-stride 循环），再在共享内存里做**两两相加的树状归约**（`__syncthreads` 分隔）；
2. **Warp shuffle**：用 `__shfl_down_sync` 在 **Warp 内寄存器间**直接归约，不经过共享内存：

```cpp
__global__ void reduceShuffle(const float* in, float* out, int n) {
    __shared__ float sdata[32];
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    float sum = 0.0f;
    // ① grid-stride 循环：每个线程累加多个元素（跨步 = 总线程数）
    for (int s = i; s < n; s += gridDim.x * blockDim.x) sum += in[s];
    // ② warp 内归约：寄存器间交换，零共享内存
    for (int offset = 16; offset > 0; offset >>= 1)
        sum += __shfl_down_sync(0xffffffff, sum, offset);
    // ③ 每 warp 组长写共享内存，最后 32 个线程再归约一次
    if ((threadIdx.x & 31) == 0) sdata[threadIdx.x >> 5] = sum;
    __syncthreads();
    if (threadIdx.x < 32) {
        float v = (threadIdx.x < (blockDim.x >> 5)) ? sdata[threadIdx.x] : 0.0f;
        for (int offset = 16; offset > 0; offset >>= 1)
            v += __shfl_down_sync(0xffffffff, v, offset);
        if (threadIdx.x == 0) out[blockIdx.x] = v;
    }
}
```

::: note 数值陷阱
浮点加法**不满足结合律**，归约顺序影响结果。`-use_fast_math` 或不同 block 数会导致结果与 CPU 串行版本有微小差异——大模型训练里的"loss 抖动"有时就来自这里（[大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)）。
:::

### 9.2 GEMM 优化梯度（数量级对比）

| 版本 | 关键技术 | A100 FP32 量级（近似） |
|---|---|---|
| naive | 逐元素循环 | ~0.3 TFLOPS |
| 共享内存 tiling | 分块复用 | ~3 TFLOPS |
| + padding/展开/float4 | 消除 Bank 冲突、向量化 | ~6 TFLOPS |
| + 寄存器分块/双缓冲 | 减少同步、提高 ILP | ~10 TFLOPS |
| cuBLAS（Tensor Core） | 硬件矩阵单元 | 15+ TFLOPS（接近峰值） |

结论：**手写 Kernel 的终点是 cuBLAS 的起点**。工程上优先用库，手写优化是为了理解原理与特殊场景定制。

### 9.3 Stencil（模板计算）

以 2D 五点 stencil 为例：每点依赖上下左右邻居。优化套路：

- 每线程负责多行（行间复用邻居数据，减少冗余加载）；
- 把数据条带载入共享内存（含 **halo 边界**），边界用 `if` 或单独处理；
- 沿行方向天然合并访存；长 stride 方向（列）尽量少碰。

## 10. 性能目标：经验值

| 场景 | 能达到峰值的比例 | 说明 |
|---|---|---|
| 带宽型 Kernel（合并访存良好） | **70~90% 峰值带宽** | 未达标先查合并/向量化/占用率 |
| 算力型 Kernel（手写通用） | 40~70% 峰值算力 | 未达标查寄存器、ILP、tiling |
| 算力型（cuBLAS/Tensor Core） | 80~95% 峰值算力 | 库实现已接近物理极限 |
| 端到端应用 | 视 IO 而定 | 先看 nsys 时间线再谈 Kernel |

::: tip 一条判断口诀
瓶颈指标贴墙（≥70% 峰值）→ 优化到头，换算法/换硬件才有出路；不贴墙 → 一定有代码层面的浪费，按"访存模式 → 共享内存 → 占用率 → 指令 → 重叠"的顺序排查。
:::

## 11. 本章小结

- 先测量后优化：`ncu`/`nsys` 定量，Roofline 定性（计算强度 vs ridge point）；
- 带宽瓶颈压访存：合并访存、float4、kernel 融合；算力瓶颈喂 SM：tiling、寄存器、Tensor Core；
- 共享内存 tiling 是矩阵类问题的核心手法，padding 消 Bank 冲突，`__syncthreads` 保证正确性；
- 占用率受寄存器约束，`__launch_bounds__` 精确控寄存器，别盲目追 100%；
- 指令层：避免发散、`#pragma unroll`、按需用 `__` 快速数学；
- 异步层：多流 + `cudaMemcpyAsync` + pinned 内存实现拷贝/计算重叠，CUDA Graphs 消除启动开销；
- 经验目标：带宽型 70~90% 峰值带宽，算力型手写 40~70%、库实现 80~95%。

::: tip 引出下一章
调优调到头，你可能会问：`ncu` 报的指标、`cudaMalloc` 的实现、`nvcc` 与驱动的配合，背后到底是谁在干活？下一章 [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/) 拆解从你的应用一路到 GPU 硬件的整条软件栈：libcuda、nvidia.ko、Runtime API 与 Driver API 的分工，以及版本排查实战。
:::

## 自测题

**1. 一个 Kernel 计算强度 2 FLOP/Byte，机器峰值算力 20 TFLOPS、峰值带宽 2 TB/s。它是带宽瓶颈还是算力瓶颈？**
答：ridge point = 20e12 / 2e12 = 10 FLOP/Byte。该 Kernel 强度 2 < 10，落在 roofline 斜线区 → **带宽瓶颈**，应优化访存（合并、向量化、减少搬运），加算力没用。

**2. 向量加法为什么几乎不可能达到峰值算力？它的性能上限由什么决定？**
答：每元素只做 1 次加法、却要读写 8 字节，计算强度约 0.125 FLOP/Byte，远低于 ridge point，是典型的带宽型 Kernel。上限 = 峰值带宽 × 利用率（良好实现可达 70~90%），与算力无关。

**3. 什么是合并访存？写出一个"不合并"的二维矩阵访问模式并修正。**
答：同一 Warp 的相邻线程访问相邻地址，一次内存事务取回整段数据。反例：线程对应矩阵的行号 i，内层按列循环访问 `A[i*K+j]`，相邻线程地址相差 K 个元素 → 每个线程单独一个事务。修正：线程对应列号 j，内层按行循环，同一行内相邻线程地址连续。

**4. 用 float4 向量化需要满足哪两个前提？**
答：① 数据 16 字节对齐（`cudaMalloc` 天然满足，自定义结构需 `__align__(16)`）；② 元素总数能被 4 整除（或单独处理尾部）。满足后 128-bit 访存把事务数降到 1/4。

**5. 共享内存版矩阵乘法里两个 `__syncthreads()` 各起什么作用？去掉会怎样？**
答：第一个在**载入共享内存之后、计算之前**——保证所有线程写完了自己负责的 tile 数据，防止有人读到别人还没写好的数据；第二个在**计算之后、覆盖下一块之前**——防止快的线程覆盖了慢线程还没读完的旧 tile。去掉任一个都会产生数据竞争，结果随机出错（且难以复现）。

**6. 为什么 `__shared__ float As[TILE][TILE]` 会 Bank 冲突？padding 为什么能解决？**
答：Bank = 地址 % 32（每 bank 4B）。访问 `As[ty][k]` 时固定 k、ty 变化，地址 = ty×16+k，多个线程的地址模 32 相同 → 命中同一 Bank → 串行化。改成 `As[TILE][TILE+1]` 后行首错开 1 个 float，地址模 32 均匀分散，冲突消除。

**7. 每 SM 有 65536 个寄存器、最多容纳 2048 线程。Kernel 每线程用 48 个寄存器，占用率是多少？`__launch_bounds__(256, 8)` 会让编译器做什么？**
答：65536/48 ≈ 1365 线程，占用率 1365/2048 ≈ 66.7%（按 Warp 粒度取整后约 64~67%）。`__launch_bounds__(256, 8)` 要求每 SM 至少 8 块×256=2048 线程，编译器必须把寄存器压到 ≤ 65536/2048 = 32 个，若压不住会产生寄存器溢出（spill），反而变慢。

**8. 多 Stream 重叠拷贝与计算需要哪三个条件？默认流为什么不行？**
答：① 主机内存必须 pinned（`cudaHostAlloc`）；② 必须用 `cudaMemcpyAsync`；③ 各操作放到非默认流。默认流与所有流有隐式同步（legacy default stream 会阻塞其他流），混用会把并行悄悄废掉；`cudaMemcpy` 同步版本也会破坏异步。

**9. 归约为什么用 warp shuffle 能更快？浮点归约结果为什么可能和 CPU 不一致？**
答：`__shfl_down_sync` 直接在 Warp 内寄存器间交换数据，不经过共享内存，省掉读写与同步开销；树状归约把 O(N) 串行依赖降为 O(log N)。浮点加法不满足结合律，不同归约顺序（并行 vs 串行、不同 block 数）产生不同舍入误差，所以结果与 CPU 串行版有微小差异，属正常现象。

::: note 提示
第 1、2 题练 Roofline 判断，第 5、6 题是共享内存的面试必考（数据竞争与 Bank 冲突），第 8 题对应真实工程里"加了流反而变慢"的常见事故。建议每个问题都在真机上用 `ncu` 验证一次结论。
:::
