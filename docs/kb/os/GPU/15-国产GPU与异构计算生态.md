---
title: "国产GPU与异构计算生态"
permalink: /kb/os/GPU/15-国产GPU与异构计算生态/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU故障排查与问题定位", link: /kb/os/GPU/14-GPU故障排查与问题定位/ }
next: false
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
本章回答：**不买 NVIDIA，还能用什么？昇腾/寒武纪/海光/AMD 的软件栈长什么样，怎么把现有代码迁过去？** 学完你会：看懂 ROCm/HIP、CANN、CNToolkit、DTK 各自是什么、和 CUDA 怎么对应；知道 `torch_npu`/`torch_mlu`/`torch_dcu` 这类适配层怎么用；能根据"代码用了什么抽象层"选择合适的迁移路径（换 wheel vs hipify vs 重写），并客观评估各生态的成熟度与混部集群的可行性。
:::

前置基础：[CUDA编程模型与开发入门](/kb/os/GPU/04-CUDA编程模型与开发入门/)、[GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)、[大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)。本文所有对比都以 NVIDIA/CUDA 为基准参照物。

## 1. 为什么关注国产 GPU

- **供应链安全**：地缘政治下 NVIDIA 高端卡（H100/A100）受限，国产卡是确定性替代；
- **信创要求**：政务、金融、央企的算力采购要求国产化率，昇腾/寒武纪/海光是主要受益者；
- **成本**：国产卡采购价低于同档 NVIDIA，且算力紧张时有"买得到"的独特价值。

::: warning 国产卡的真实定位
国产卡的**硬件差距在缩小**（910B 的 FP16 算力约 376 TFLOPS，接近 A100），真正的差距在**软件生态**：算子覆盖、分布式框架适配、推理框架支持、监控与排障工具都比 CUDA 生态落后 2-3 年。**选国产卡 = 选一个待完善的软件栈**，要有迁移与踩坑预算。
:::

### 1.1 格局总览

| 厂商 | 代表芯片 | 软件栈 | PyTorch 支持 | 生态成熟度 |
|---|---|---|---|---|
| NVIDIA | H100 / A100 | CUDA | 原生 | ★★★★★ |
| AMD | MI300X / MI250 | ROCm + HIP | torch+rocm | ★★★★ |
| 华为 | 昇腾 910B / 310 | CANN | torch_npu | ★★★☆ |
| 寒武纪 | 思元 370 / 590 | CNToolkit | torch_mlu | ★★☆ |
| 海光 | DCU（深算系列） | DTK | torch_dcu | ★★☆ |
| 摩尔线程 | MTT S系列 | MUSA | 适配中 | ★★ |
| 沐曦 | 曦云 C系列 | MXMACA | 适配中 | ★★ |
| 壁仞 | BR100/104 | BIRENSUPA | 适配中 | ★★ |

## 2. AMD：ROCm 与 HIP（最接近 CUDA 的替代）

### 2.1 ROCm 软件栈组成

```text
应用层:  PyTorch / TensorFlow / DeepSpeed / vLLM (ROCm 版)
库层:    rocBLAS(≈cuBLAS)  hipBLAS(≈cuBLAS C接口)  rocFFT(≈cuFFT)
         MIOpen(≈cuDNN)    RCCL(≈NCCL)            rocSPARSE(≈cuSPARSE)
运行时:  HIP runtime / ROCr（ROCm 运行时）/ ROCclr
驱动:    amdgpu（内核模块，上游 Linux 内核自带）+ libdrm
硬件:    MI210 / MI250X / MI300X / MI325X ...
```

- **rocm-smi**：对应 nvidia-smi，查卡状态/温度/功耗/版本；
- **HIP**（Heterogeneous-Computing Interface for Portability）：**CUDA 的 C++ 语法近亲**——`hipMalloc`/`hipMemcpy`/`__global__`/`hipLaunchKernelGGL` 与 CUDA 一一对应，一份代码可在 AMD 与 NVIDIA（HIP on NVIDIA）上编译运行。

### 2.2 HIP 编程与自动转换

```bash
# 自动把 CUDA 源码转成 HIP
hipify-perl   vectorAdd.cu > vectorAdd.cpp
hipify-clang  vectorAdd.cu -o vectorAdd.cpp
# 编译运行（HIP 平台可配置为 nvidia 或 amd）
hipcc vectorAdd.cpp -o vectorAdd && ./vectorAdd
```

::: tip HIP 的迁移性价比
如果你的代码是**CUDA C/C++ 写的**，迁 AMD 最省事的路就是 hipify——绝大多数 CUDA API 能机械转换；真正要手工改的是少量平台相关代码（如 PTX 内联汇编、cuDNN 专属调用）。
:::

### 2.3 MI 系列硬件规格

| 卡 | 显存 | 带宽 | BF16 峰值 | 对比参照 |
|---|---|---|---|---|
| MI210 | 64GB HBM2e | 1.6TB/s | ~181 TFLOPS | ≈ A100 级 |
| MI250X | 128GB HBM2e（双 GCD） | 3.2TB/s | ~383 TFLOPS | 双 GCD 拼装 |
| MI300X | 192GB HBM3 | 5.3TB/s | ~1307 TFLOPS | **显存/带宽超 H100** |
| A100 80G | 80GB HBM2e | 2.0TB/s | 312 TFLOPS | 基准 |
| H100 SXM | 80GB HBM3 | 3.35TB/s | ~989 TFLOPS | 基准 |

MI300X 的单卡 192GB 显存是最大卖点——**单卡装 70B 模型权重（FP16 140GB）成为可能**，极大降低多卡通信开销。

### 2.4 PyTorch ROCm 版

```bash
pip install torch --index-url https://download.pytorch.org/whl/rocm6.2
# 验证
python -c "import torch; print(torch.cuda.is_available())"   # 返回 True（ROCm 复用 cuda 命名空间）
```

注意：ROCm 的 PyTorch 仍用 `torch.cuda` API（内部映射到 ROCm），所以**大部分 CUDA 训练代码零改动**即可跑在 AMD 卡上。

### 2.5 生态现状与差距

- 对标关系：cuDNN→MIOpen、NCCL→RCCL、cuBLAS→rocBLAS/hipBLAS、Nsight→rocprof/omnitrace；
- 差距：算子覆盖不全（新模型算子常要等适配）、RCCL 的拓扑优化与稳定性弱于 NCCL、厂商支持周期滞后（新 PyTorch 版本要等 ROCm 版）、推理框架支持较少（vLLM 已官方支持 ROCm）；
- 优势：**HIP 是"真·跨平台"**（AMD + NVIDIA 都能编译），迁移成本在国产栈中最低；Linux 内核自带 amdgpu 驱动，装机友好。

## 3. Intel：oneAPI 与 SYCL

- **oneAPI**：Intel 的统一编程模型，核心语言是 **SYCL/DPC++**（基于 C++ 的异构标准，可编译到 CPU/GPU/FPGA）；
- **Data Center GPU Max（Ponte Vecchio）**：Intel 数据中心 GPU，128 Xe 核、128GB HBM2e，定位 HPC 与 AI；
- 现状一句话：**硬件布局收缩、AI 生态弱**（PyTorch 靠 IPEX 扩展适配，主流训练框架支持有限），主要价值在 HPC 与科学计算场景。

## 4. 华为昇腾（重点）

### 4.1 芯片：910B / 310

- **昇腾 910B**：训练主力。**达芬奇架构**，核心计算单元是 **AI Core**（内含 Cube 矩阵单元 + Vector 向量单元 + Scalar 标量单元，分工类似 Tensor Core + CUDA Core）；64GB HBM 显存；FP16 算力约 **376 TFLOPS**（有 B1/B2/B3/B4 等子型号，算力/互联略有差异）。Atlas 800T A2 服务器 = 8 卡，共 512GB 显存。
- **昇腾 310**：边缘推理小芯片，主打低功耗（约 8W 级）与 INT8 推理，用于摄像头/边缘盒子。

### 4.2 CANN 架构（对标 CUDA 软件栈）

```text
应用层:   MindSpore / PyTorch(torch_npu) / TensorFlow / 自研推理引擎
             │
CANN:    AscendCL（编程接口，≈CUDA Runtime + 加速库）
         ├─ 图引擎 Graph Engine（整图编译下发）
         ├─ 算子库与算子适配（GE + 自研算子）
         └─ HCCL（集合通信，≈NCCL）
             │
驱动层:   Ascend driver（昇腾驱动）
             │
硬件:     达芬奇架构 NPU（910B/310）
```

- **AscendCL**：昇腾的编程接口，提供张量算子与图模式（把模型编译成整图一次性下发，省去逐算子调度开销）；
- **MindSpore**：华为自研深度学习框架，昇腾原生支持，生态远小于 PyTorch；
- **HCCL**：昇腾集合通信库，多卡训练靠它（对标 NCCL，见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/) §5）。

### 4.3 用昇腾跑 PyTorch：torch_npu

```bash
pip install torch_npu==2.5.0 torch==2.5.0     # 版本必须严格对应
```

```python
import torch
import torch_npu            # 关键：import 即注册 npu 后端
assert torch.npu.is_available()
torch.npu.set_device(0)
model.to("npu:0")           # 或 x.to("npu:0")
```

**踩坑点**：
- 算子覆盖：模型里若有 torch_npu 未实现的算子，会 fallback 到 CPU 或直接报错——先用官方"算子支持清单"排查，或用 `torch.npu` 专属算子替代；
- 版本绑定：torch 与 torch_npu 必须配套，升级 PyTorch 意味着等华为适配；
- 精度对齐：迁移后要和 NVIDIA 输出逐层对比（如 max 绝对误差），排查数值差异。

### 4.4 昇腾容器

- **Ascend Docker Runtime**：昇腾的容器运行时（类似 nvidia-container-toolkit），注入 `/dev/davinci*` 设备与驱动库；
- 华为官方提供 CANN 基础镜像（如 `quay.io/ascend/cann`），K8s 上配合昇腾 Device Plugin 调度 `huawei.com/Ascend910` 资源（见 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）。

### 4.5 部署形态

- **Atlas 800T A2**：8×910B 训练服务器（训练主力机型）；
- **Atlas 800I A2**：推理服务器（配 310/推理卡）；
- 工作流：`模型(PyTorch/NVIDIA权重) → 权重转换/直接加载 → torch_npu 跑通 → msprof 剖析调优 → 容器化部署`。

### 4.6 Profiling：msprof

```bash
msprof --output=./prof ./train_script.py    # 昇腾官方性能剖析工具
# 看 AI Core 利用率、算子耗时、HCCL 通信耗时，定位瓶颈
```

::: important 昇腾是国产卡里生态最完整的
硬件出货量大、MindSpore + CANN + Atlas 整机 + Ascend Runtime 全家桶齐备，PyTorch 迁移有官方路径（torch_npu），还有社区版 vLLM-Ascend 支持推理。**如果只选一条国产路线深耕，先看昇腾**。
:::

## 5. 寒武纪

- **芯片**：思元 370（MLU370-X8 训练卡 48GB LPDDR5、MLU370-S4/S8 推理卡）；思元 590（新一代训练旗舰，官方宣称对标 H100 级）；
- **软件栈**：CNToolkit（Cambricon Neuware Toolkit，含编译器/运行时/算子库，类似 CUDA Toolkit）、torch_mlu（PyTorch 适配）、CNCL（集合通信）、cnmon（监控）；
- **现状一句话**：推理场景落地较多（互联网大厂有采购），训练生态与昇腾有差距，PyTorch 适配靠 torch_mlu 且算子覆盖待完善。

## 6. 海光

- **芯片**：DCU（深算一号/深算二号），**类 AMD GCN（Vega 系）架构**，天然与 HIP 生态亲缘；
- **软件栈**：**DTK**（海光 DCU 开发套件）——提供**兼容 CUDA API 的移植层** + HIP 风格开发 + 自研库（如 hipDNN 类库）；PyTorch 经 **torch_dcu** 适配；
- **现状一句话**：信创/政务训练与科学计算落地多，由于架构亲 AMD，ROCm 系生态的算子可直接受益，但 CUDA 兼容靠自家移植层、成熟度中等。

## 7. 其他国产厂商一览

| 厂商 | 架构/工具链 | 代表产品 | 一句话定位 |
|---|---|---|---|
| 摩尔线程 | **MUSA** + MUSA Toolkit | MTT S80 / S4000 | 自称 CUDA 语法兼容的通用 GPU，桌面+数据中心并行 |
| 沐曦 | **MXMACA** + MXMACA Toolkit | 曦云 C500 等 | 面向训练/推理，宣称兼容 CUDA 生态的编程接口 |
| 壁仞 | **BIRENSUPA** | BR100 / BR104 | 面向大规模训练，软件栈仍在快速迭代 |

::: note 怎么看待"CUDA 兼容"宣传
各家的"兼容 CUDA"大多是**源码级 API 兼容**（你的 CUDA 代码改改能编译），不是**二进制兼容**（NVIDIA 编译好的 .so 直接跑）。真正的二进制兼容只有 NVIDIA 自家的 CUDA Compatibility 与第三方 ZLUDA 在做（见 §8）。采购前务必用**你自己的模型**实测，别信宣传页。
:::

## 8. 兼容层方案

### 8.1 ZLUDA（第三方）

把 CUDA 应用翻译到 AMD ROCm / Intel oneAPI（Level Zero）上运行，可做到**二进制级**（替换 libcuda）或源码级运行。

- 技术限制：算子覆盖有限、性能打折扣、对 PTX/新特性支持滞后；
- 法律限制：**NVIDIA EULA 明令禁止非官方兼容层**（2021 年 NVIDIA 曾向 ZLUDA 发函），且涉及逆向工程风险；
- 结论：**演示/研究可用，生产慎用**——生产国产化不要赌 ZLUDA。

### 8.2 CUDA Compatibility（NVIDIA 官方）

NVIDIA 官方方案：**容器内装新版 CUDA Toolkit + 宿主机旧驱动**也能运行（minor version compatibility，同主版本内）。适用：驱动不便升级、但需要新 CUDA 特性的场景。这是 NVIDIA 自家 API 的版本兼容，与国产"兼容 CUDA"是两码事。

### 8.3 各家"CUDA 兼容"实现差异

| 方案 | 类型 | 兼容粒度 | 官方性 |
|---|---|---|---|
| NVIDIA CUDA Compatibility | 版本兼容 | 二进制（同主版本内） | 官方 |
| AMD HIP | 源码移植 | 源码（hipify） | 官方 |
| 海光 DTK | API 移植层 | 源码为主 | 官方（自研） |
| 沐曦 / 摩尔线程 / 壁仞 | 自研兼容 API | 源码为主 | 官方（自研） |
| ZLUDA | 第三方翻译 | 二进制/PTX | 非官方 |

## 9. 迁移策略（重点）

### 9.1 抽象层选择：越高越轻

```text
        算子层 (自定义 CUDA Kernel / PTX)        ← 最重：hipify 或重写
        库层   (cuBLAS/cuDNN/cuFFT/NCCL)        ← 中：换成厂商对应库
        框架层 (PyTorch/JAX/DeepSpeed)          ← 最轻：换 wheel + device 字符串
```

**原则：能留在框架层就在框架层迁**。你的代码用了哪一层，决定了迁移工作量：

| 你的代码用了什么 | 迁移动作 | 工作量 |
|---|---|---|
| 纯 PyTorch 训练脚本（无自定义算子） | 换 wheel（torch_npu/torch+rocm/torch_mlu/torch_dcu）+ device 改 `npu:0`/`cuda` + 算子覆盖检查 | 轻（小时级） |
| transformers/DeepSpeed/Megatron 等框架 | 需厂商适配版本或改配置（如分布式后端） | 中 |
| 直接调 cuBLAS/cuDNN/NCCL | 换成 rocBLAS/MIOpen/RCCL 或厂商库，改头文件与链接 | 中 |
| 自定义 CUDA kernel（.cu） | hipify 自动转换（AMD/海光类）或按新架构重写（昇腾需改写为 AscendCL 算子） | 重（天级） |

### 9.2 昇腾迁移实战路径

```text
① 环境：装 CANN + torch_npu（版本配对）
② 跑通：import torch_npu → model.to("npu:0") → 单卡跑通 forward/backward
③ 算子排查：报错/回退 CPU 的算子逐个替换（查昇腾算子支持清单）
④ 精度对齐：与 NVIDIA 输出对比（max abs error），排查数值差异
⑤ 多卡：HCCL 初始化（分布式通信后端切换）
⑥ 性能：msprof 剖析 AI Core 利用率与通信占比 → 针对性调优
```

### 9.3 性能对比方法论

**同卡同模型 benchmark** 是唯一可信的评价方式：同一模型、同一 batch、同一输入、同一精度，分别测——

- 训练：step time（s/step）、吞吐（tokens/s）、显存峰值；
- 推理：TTFT、吞吐、`$/token` 折算；
- 资源：功耗、温度、利用率；
- 各家用各家的 profiler：NVIDIA nsys/ncu、AMD rocprof、昇腾 msprof、寒武纪/海光厂商工具。

::: warning 别拿"纸面 TFLOPS"比性能
国产卡纸面算力接近 A100，但**实际利用率**（算子效率、通信效率、框架适配度）往往只有 NVIDIA 的 50-80%。判断一张卡行不行，跑真实模型看 step time，不要看宣传页。
:::

## 10. 生态对比大表

| 维度 | NVIDIA | AMD | 昇腾 | 寒武纪 | 海光 |
|---|---|---|---|---|---|
| 代表硬件 | H100 80G | MI300X 192G | 910B 64G | 370/590 | DCU 深算 |
| 显存带宽 | 3.35TB/s | 5.3TB/s | HBM（64G/卡） | LPDDR5（X8 48G） | 32GB+ 级 |
| 编程模型 | CUDA | HIP | AscendCL | CNToolkit | DTK/HIP |
| PyTorch | 原生 | torch+rocm | torch_npu | torch_mlu | torch_dcu |
| 训练框架 | Megatron/DeepSpeed 等全支持 | 部分支持 | MindSpore + 适配 | 厂商栈 | 厂商栈 |
| 推理框架 | vLLM/TRT-LLM/TGI | vLLM(ROCm) | vLLM-Ascend/MindIE | 厂商自研 | 厂商自研 |
| 集合通信 | NCCL | RCCL | HCCL | CNCL | RCCL 系 |
| 容器方案 | nvidia-container-toolkit | ROCm 容器 | Ascend Docker Runtime | 厂商方案 | 厂商方案 |
| 监控工具 | DCGM/dcgm-exporter | rocm-smi | npu-smi | cnmon | 厂商 smi 类 |
| 生态成熟度 | ★★★★★ | ★★★★ | ★★★☆ | ★★☆ | ★★☆ |

## 11. 混合异构策略：NVIDIA + 国产卡混部

现实情况：大多数大厂数据中心是 **NVIDIA 池 + 国产池并存**，但**模型训练不会跨厂商切分**——集合通信协议不通（NCCL vs HCCL/RCCL/CNCL），一张卡一个软件栈，强行混训不可能。

| 挑战 | 说明 | 对策 |
|---|---|---|
| 集合通信不通 | 跨厂商无法 allreduce | **模型绑定单一厂商池**，不跨厂商切分 |
| 驱动/容器运行时不同 | 每厂商一套注入方案 | 各厂商各自的 Device Plugin + 运行时 |
| 调度异构 | `nvidia.com/gpu` vs `huawei.com/Ascend910` | K8s 多扩展资源类型，按池调度 |
| 监控异构 | 每厂商一套指标 | Prometheus 统一接入各厂商 exporter |
| 性能不均 | 国产卡慢 → straggler 拖累整体 | 按卡型分组调度，不同业务跑不同池 |
| 运维知识分裂 | 错误码/工具完全不同 | 沉淀各厂商排障手册（昇腾看 npu-smi 与 dmesg 的 hisi 日志） |

落地建议：**统一 K8s + 分区调度**——NVIDIA 池跑高性能训练，国产池跑信创业务/推理/中小模型，两边各自用 [GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/) 的资源模型管理，监控统一接入 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) 的 Prometheus 体系。

## 12. 自测题

**1.（迁移路径选择）一个 PyTorch 训练脚本，含一个自己写的 CUDA kernel（.cu 文件），要迁到昇腾 910B。先做什么？最重的工作是什么？**
答：先装 CANN + torch_npu（版本配对）、`import torch_npu` 把模型切到 `npu:0` 跑通纯 PyTorch 部分、查算子支持清单；**最重的工作是自定义 CUDA kernel**——无法直接跑，需要改写成昇腾算子（AscendCL 或 MindSpore 自定义算子），这是天级工作量。若只改 device 不处理 kernel，训练会直接报算子不支持。

**2. HIP 和 CUDA 是什么关系？hipify-perl / hipify-clang 干什么用？**
答：HIP 是 AMD 提供的、语法与 CUDA 高度相似的 C++ 异构编程接口（hipMalloc/__global__ 等一一对应），一份代码可编译到 AMD（ROCm）与 NVIDIA（HIP on NVIDIA）。hipify 工具把 CUDA 源码**自动转换**成 HIP 源码，是 CUDA C 代码迁 AMD/海光的最省事路径。

**3. 用 torch_npu 需要哪三步？**
答：① 安装与 torch 版本严格对应的 torch_npu；② `import torch_npu`（注册 npu 后端）；③ `torch.npu.is_available()` 验证，`model.to("npu:0")` 使用。注意 PyTorch 升级必须等华为适配对应 torch_npu 版本。

**4. MI300X 与 H100 对比，各有什么优势？**
答：MI300X：192GB HBM3、5.3TB/s 带宽、BF16 ~1307 TFLOPS，**显存和带宽超过 H100**，单卡可装 70B FP16 权重；H100：80GB HBM3、3.35TB/s、BF16 ~989 TFLOPS，优势在 CUDA 生态与软件成熟度（算子、框架、推理全支持）。硬件 MI300X 占优，生态 H100 占优。

**5. ZLUDA 是什么？为什么生产环境不推荐？**
答：第三方开源项目，把 CUDA 应用翻译到 AMD/Intel 平台运行（可二进制级替换 libcuda）。不推荐原因：算子覆盖有限、性能打折、**违反 NVIDIA EULA**（官方曾发函制止）、涉及逆向工程法律风险。生产国产化应选官方适配路径。

**6. CUDA Compatibility（NVIDIA 官方）与国产"CUDA 兼容层"的本质区别？**
答：CUDA Compatibility 是 NVIDIA **自家 API 的版本兼容**（容器内新 Toolkit + 旧驱动，二进制兼容，官方支持）；国产厂商的"CUDA 兼容"是**第三方对 CUDA API 的源码级再实现**（代码改改能编译），不是 NVIDIA 编译产物的二进制兼容，成熟度与正确性需要实测。

**7. 哪些厂商的 PyTorch 推理栈有 vLLM 支持？**
答：NVIDIA（原生）、AMD（官方 ROCm 版 vLLM）、昇腾（社区 vLLM-Ascend / 华为 MindIE）。寒武纪、海光等多为厂商自研推理引擎，vLLM 支持有限——选推理框架前先确认目标卡的 vLLM 支持状态。

**8. CANN 与 CUDA 软件栈怎么对应？**
答：AscendCL ≈ CUDA Runtime + 加速库；HCCL ≈ NCCL；MindSpore ≈ PyTorch 的位置；算子库/图引擎 ≈ cuDNN + TensorRT 的编译优化；驱动层对应 nvidia.ko。理解对应关系后，迁移思路可平移（见 [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)）。

**9. NVIDIA + 国产卡混部集群最大的三个挑战是什么？怎么应对？**
答：① **集合通信不通**（NCCL vs HCCL/RCCL）→ 模型不跨厂商切分、按池调度；② **调度与运行时异构**（Device Plugin、容器注入各一套）→ K8s 多扩展资源类型统一管理；③ **监控与排障分裂**（错误码、工具各不同）→ Prometheus 统一接入各厂商 exporter + 沉淀各厂商排障手册。核心原则：分区调度、业务绑定单一厂商池。

**10. 判断一张国产卡行不行的正确方法是什么？**
答：**同卡同模型 benchmark**：同一模型/同一 batch/同一精度，实测训练 step time、推理吞吐与 TTFT、显存峰值、功耗温度，并用厂商 profiler（msprof/rocprof 等）看实际利用率。纸面 TFLOPS 只作参考，实际利用率往往只有 NVIDIA 的 50-80%，必须用真实负载验证。

::: note 第 1 题提示
迁移工作量取决于代码用的抽象层：框架层最轻（换 wheel + device），库层中等（换对应库），算子层最重（hipify 或重写）。对照 §9.1 的金字塔图，先定位自己的代码在第几层，再决定投入。
:::

::: tip 引出相关笔记
国产卡排障的错误码与工具完全不同（如昇腾看 npu-smi 与 hisi 日志），方法论可复用 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/) 的"三板斧"思路；无论什么卡，多机通信都绕不开 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/) 的并行策略与集合通信；虚拟化与容器化思路见 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)、[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)。路线总览回到 [GPU学习路线总览](/kb/os/GPU/00-GPU学习路线总览/)。
:::
