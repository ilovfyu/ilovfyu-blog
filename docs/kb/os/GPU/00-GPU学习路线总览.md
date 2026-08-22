---
title: "GPU学习路线总览"
permalink: /kb/os/GPU/00-GPU学习路线总览/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "GPU硬件架构与工作原理", link: /kb/os/GPU/01-GPU硬件架构与工作原理/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 系列定位
本系列系统梳理 GPU 的完整知识体系：从 GPU 硬件架构与执行模型出发，到 CUDA 编程与优化、驱动与运行时栈、显存管理、虚拟化与容器化，再到 Kubernetes 调度、监控运维、故障排查，最后覆盖大模型训练推理实践与国产 GPU 生态。目标不是罗列 `nvidia-smi` 的参数，而是把"GPU 到底怎么工作、怎么用、怎么调、怎么排障"讲透，并能落到真实机器上观察和验证。
:::

GPU 不是"带很多核心的 CPU"，而是**面向吞吐量的专用并行协处理器**。它有自己的内存、自己的调度器、自己的编程模型，甚至自己的"操作系统"——驱动 + 运行时 + 库的整条软件栈。理解 GPU 系统的关键，是同时掌握三条线索：**硬件怎么造（架构）、软件怎么管（驱动/运行时/OS 集成）、工程怎么用（编程/优化/运维）**。

## 1. 知识地图

本系列按"硬件原理 → 编程开发 → 系统软件栈 → 虚拟化与容器 → 运维排障 → 工程实践"组织，与 GPU 目录结构一一对应：

| 文件 | 核心问题 | 所属阶段 |
|---|---|---|
| [GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/) | GPU 芯片上有什么？为什么和 CPU 不一样？ | 原理 |
| [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/) | 显存怎么组织？带宽为什么是命根子？ | 原理 |
| [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/) | 线程怎么被调度？Warp 和占用率是什么？ | 原理 |
| [CUDA编程模型与开发入门](/kb/os/GPU/04-CUDA编程模型与开发入门/) | 怎么写第一个 CUDA 程序？ | 编程 |
| [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) | 怎么让 Kernel 跑得快？ | 编程 |
| [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/) | 驱动、运行时、库之间什么关系？ | 系统软件栈 |
| [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/) | 显存怎么分配释放？OOM 怎么回事？ | 系统软件栈 |
| [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/) | 多个进程怎么共享一块 GPU？ | 系统软件栈 |
| [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) | 云上 GPU 怎么切片、怎么隔离？ | 虚拟化 |
| [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/) | 容器和 K8s 怎么把 GPU 当资源调度？ | 虚拟化/运维 |
| [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) | 怎么监控 GPU 健康与利用率？ | 运维 |
| [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/) | 怎么用工具定位性能瓶颈？ | 运维/调优 |
| [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/) | LLM 训练推理怎么把 GPU 用满？ | 工程实践 |
| [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/) | GPU 出问题怎么按流程排查？ | 运维 |
| [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/) | 昇腾/寒武纪/海光等生态怎么接？ | 生态 |

## 2. 三条主线

**主线一：GPU 硬件是怎么工作的（原理）**

- GPU = 大量简单核心 + 高带宽内存 + 靠"并行度"和"延迟隐藏"取胜（[GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/)）
- 内存分层次：寄存器 → 共享内存 → L1/L2 → HBM，访存合并决定带宽利用率（[GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)）
- 线程以 **Warp（32 线程）** 为单位被调度，占用率越高越能藏延迟（[GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)）

**主线二：软件栈是怎么把 GPU 管起来的（系统）**

- 驱动分用户态（libcuda）与内核态（nvidia.ko），运行时/库一层层包上去（[GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)）
- 显存分配、上下文、多进程共享由运行时管理（[GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)、[GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)）
- 云场景靠 vGPU / MIG / 容器 / K8s 实现切分与调度（[GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)、[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）

**主线三：工程上怎么用、怎么调、怎么救（实践）**

- 写 Kernel：[CUDA编程模型与开发入门](/kb/os/GPU/04-CUDA编程模型与开发入门/)；调优：[CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/)（Roofline、合并访存、共享内存、占用率）
- 监控：[GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)；性能剖析：[GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)
- 大模型落地：[大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)（显存估算、NCCL、并行策略、vLLM）
- 出故障按流程查：[GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)（Xid、ECC、OOM、挂死）
- 换国产卡：[国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/)（ROCm/HIP、昇腾 CANN、寒武纪等）

## 3. 推荐学习路线

### 3.1 零基础完整路线（推荐）

1. 建立硬件直觉：[GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/) → [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)
2. 搞懂显存：[GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)
3. 上手编程：[CUDA编程模型与开发入门](/kb/os/GPU/04-CUDA编程模型与开发入门/) → 写一个向量加法 + 矩阵乘法
4. 学习调优：[CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/)，配合 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)
5. 理解软件栈：[GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/) → [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)
6. 多进程与共享：[GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)
7. 云与容器：[GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) → [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)
8. 运维：[GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) → [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)
9. 工程实战：[大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)
10. 最后了解 [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/)，形成全局视野

### 3.2 面试速成路线

- [GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/)（GPU vs CPU、SM、Tensor Core、带宽）
- [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/)（Warp、SIMT、分支发散、占用率计算）
- [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/)（内存层次、合并访存、Bank 冲突）
- [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/)（Roofline、共享内存 tiling、float4）
- [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/)（显存不够怎么办、UVM、PyTorch 缓存分配器）
- [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)（时间片、MPS、抢占）
- [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)（Passthrough vs vGPU vs MIG）
- [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)（Device Plugin 原理、扩展资源）
- [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)（显存估算、ZeRO/FSDP、vLLM）

### 3.3 运维实操路线

1. [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)（nvidia-smi 全参数、DCGM、Prometheus 接入）
2. [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)（Xid 错误表、OOM、ECC、挂死复位）
3. [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)（给 Pod 分配 GPU、时间片共享、MIG 模式）
4. [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)（nsys / ncu 定位应用瓶颈）
5. [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)（模型部署时算显存、选卡、配 NCCL）

## 4. 重要概念反查表

| 概念 | 一句话 | 详细笔记 |
|---|---|---|
| GPU vs CPU | CPU 重延迟、单核强；GPU 重吞吐、海量弱核并行 | [GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/) |
| SM / CUDA Core | SM 是 GPU 的基本计算单元，内含若干 CUDA Core（FP32 单元） | [GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/) |
| Warp | 32 个线程一组，硬件调度的最小单位，SIMT 执行 | [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/) |
| 占用率 Occupancy | 活跃 Warp 数 / 最大可容纳 Warp 数，越高越能隐藏延迟 | [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/) |
| 分支发散 | Warp 内线程走不同分支时串行执行，浪费算力 | [GPU执行模型与线程调度](/kb/os/GPU/03-GPU执行模型与线程调度/) |
| 共享内存 | SM 内可编程高速缓存，需手动管理、可能 Bank 冲突 | [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/) |
| 合并访存 | 相邻线程访问相邻地址，一次事务取回整段数据 | [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/) |
| 显存带宽 | GPU 性能关键指标，HBM 系列可达 TB/s 级 | [GPU内存体系与访存原理](/kb/os/GPU/02-GPU内存体系与访存原理/) |
| Kernel | 在 GPU 上执行的函数，用 `<<<grid, block>>>` 启动 | [CUDA编程模型与开发入门](/kb/os/GPU/04-CUDA编程模型与开发入门/) |
| Roofline | 用"计算强度"判断瓶颈是算力还是带宽的模型 | [CUDA优化技术与性能调优](/kb/os/GPU/05-CUDA优化技术与性能调优/) |
| 用户态驱动 | libcuda.so 等，负责 API 封装与命令缓冲 | [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/) |
| 内核态驱动 | nvidia.ko，负责资源管理与硬件交互（ioctl/DMA） | [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/) |
| UVA / UVM | 统一虚拟寻址 / 统一内存，让 CPU 与 GPU 共享地址空间 | [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/) |
| PyTorch 缓存分配器 | 显存按块缓存复用，避免频繁 cudaMalloc 的开销 | [GPU内存管理与显存分配](/kb/os/GPU/07-GPU内存管理与显存分配/) |
| MPS | 多进程服务，让多个进程共享 GPU 的调度与资源 | [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/) |
| MIG | 把一块物理 GPU 切成多个独立实例，硬件级隔离 | [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) |
| Passthrough | 整卡直通给虚拟机，性能最好、不可切分 | [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) |
| Device Plugin | K8s 把 GPU 注册为 `nvidia.com/gpu` 扩展资源的组件 | [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/) |
| DCGM | NVIDIA 数据中心 GPU 管理组件，提供监控与诊断 | [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) |
| Xid 错误 | GPU 硬件/驱动级错误码，dmesg 里能看到 | [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/) |
| NCCL | NVIDIA 集合通信库，多卡训练的关键 | [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/) |
| ZeRO / FSDP | 把模型参数/梯度/优化器状态分片到多卡，省显存 | [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/) |
| HIP / ROCm | AMD 的 CUDA 兼容层与软件栈 | [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/) |
| CANN | 华为昇腾的异构计算架构（类似 CUDA） | [国产GPU与异构计算生态](/kb/os/GPU/15-国产GPU与异构计算生态/) |

## 5. 学习方法

GPU 知识同样要"看得到"，建议每篇三遍：

1. **原理轮**：读懂架构图、数据流、状态机（这一遍解决"是什么"）
2. **验证轮**：在真机上跑命令/示例——`nvidia-smi`、`deviceQuery`、向量加法、矩阵乘法（这一遍解决"真的吗"）
3. **调优轮**：用 `nsys` / `ncu` 看数据，改代码看指标变化（这一遍解决"怎么快"）

::: tip 理解 GPU 的一个核心心法
GPU 的设计哲学是**用并行度换延迟**：单个线程慢没关系，只要同时有成千上万个线程在跑，流水线就不会空转。所以一切优化（占用率、合并访存、流水线重叠）本质上都是在问同一个问题：**GPU 的算力和带宽有没有被喂饱？**
:::

## 6. 能力检查

完成本系列后，应能回答：

- GPU 和 CPU 在架构设计上本质区别是什么？为什么 GPU 需要"延迟隐藏"？
- SM、CUDA Core、Tensor Core、Warp 分别是什么？一条 Kernel 如何被分发到硬件上执行？
- 显存带宽为什么是 GPU 的第一性能指标？合并访存和 Bank 冲突分别是什么？
- 占用率怎么算？为什么占用率不是越高越好？
- CUDA 的 `<<<grid, block>>>` 语法到底在做什么？线程索引怎么映射到数据？
- 从 Roofline 模型看，一个 Kernel 是算力瓶颈还是带宽瓶颈，怎么判断？
- 用户态驱动和内核态驱动各干什么？CUDA 运行时 API 和驱动 API 什么关系？
- PyTorch 为什么显存"只增不减"？`empty_cache()` 到底清的是什么？
- 多个进程共享一块 GPU 有哪几种方式（时间片/MPS/MIG）？各有什么取舍？
- K8s 里 `nvidia.com/gpu` 是怎么注册和调度的？GPU Operator 解决了什么问题？
- 拿到一台 GPU 利用率很低的机器，你按什么顺序排查？（参考 [GPU性能分析与Profiling工具](/kb/os/GPU/12-GPU性能分析与Profiling工具/)）
- 一个 70B 模型推理至少需要多少显存？怎么估算？
- dmesg 里的 Xid 错误怎么看？ECC 可纠正/不可纠正错误分别怎么处理？

## 7. 配套环境建议

学习期间建议准备：

- **一块 NVIDIA GPU**（哪怕 RTX 系列），安装驱动 + CUDA Toolkit，用 `nvidia-smi` 和 CUDA Samples（`deviceQuery`、`bandwidthTest`）验证；
- **PyTorch 环境**（官方镜像或 `pip install torch`），用于验证显存分配、OOM、Profiler；
- **Docker + nvidia-container-toolkit**，用于验证容器 GPU 透传；
- 云上可开一台 A100/H100 或昇腾/寒武纪的按需实例体验数据中心级 GPU 与国产卡。

```bash
# 环境自检三板斧
nvidia-smi                          # 驱动、卡、利用率、显存
/usr/local/cuda/samples/1_Utilities/deviceQuery/deviceQuery   # CUDA 可用性
python -c "import torch; print(torch.cuda.get_device_name(0))" # PyTorch 可用性
```

每个笔记末尾都有对应主题的实操命令与自测题。

从硬件开始：[GPU硬件架构与工作原理](/kb/os/GPU/01-GPU硬件架构与工作原理/)。
