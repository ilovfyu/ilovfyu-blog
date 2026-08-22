---
title: "GPU虚拟化与MIG技术"
permalink: /kb/os/GPU/09-GPU虚拟化与MIG技术/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU上下文与多进程调度", link: /kb/os/GPU/08-GPU上下文与多进程调度/ }
next: { text: "GPU容器化与Kubernetes调度", link: /kb/os/GPU/10-GPU容器化与Kubernetes调度/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
上一章讲了进程级共享（时间切片/MPS，[GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)）。本章回答云与虚拟化场景的核心问题：**怎么把一块物理 GPU 变成多个可独立分配、可隔离、可计费的"虚拟 GPU"？** 从纯软件模拟到 PCIe 直通、SR-IOV、NVIDIA vGPU，再到硬件级切分的 MIG，学完本章你能看懂云厂商 GPU 实例的底层形态，并能根据场景选型。
:::

## 1. 为什么需要 GPU 虚拟化

- **共享成本**：一块 A100/H100 数十万元，独占利用率往往只有 20-50%，切分共享能摊薄成本；
- **隔离安全**：多租户共享时，租户间显存与算力必须互不可见、互不干扰（防侧信道、防 OOM 互踢）；
- **细粒度分配**：小模型/推理任务按需分配 1/8、1/4 块 GPU，而不是整卡；
- **云厂商计费**：按实例规格（如 1/8 卡、5GB 显存）售卖与计量，是云 GPU 商业化的基础。

::: tip 记住目标函数
GPU 虚拟化一直在三个维度上做权衡：**性能损耗、隔离强度、切分粒度/灵活性**。后面每种技术的定位，本质都是这个三角的一次取舍。
:::

## 2. GPU 虚拟化技术谱系

```text
技术谱系（从"纯软件"到"纯硬件"）：

软件模拟（全虚拟化）
   └─> API 转发/远程（vCUDA / rCUDA / 阿里云 cGPU 等）
        └─> 半虚拟化（para-virtualization）
             └─> 直通 Passthrough（VFIO/IOMMU）—— 整卡独占
                  └─> SR-IOV（PF/VF，单卡多虚拟功能）
                       └─> 硬件切片 MIG（GPU 内部原生切分）
```

| 技术 | 性能损耗 | 隔离性 | 可迁移性 | 生态兼容 |
|---|---|---|---|---|
| 软件模拟 | 高（数十倍） | 弱 | 好 | 差（非 CUDA 语义） |
| API 转发（vCUDA/rCUDA） | 中（API 层开销） | 中 | 好 | 部分 CUDA |
| 直通 Passthrough | 接近零（~5% 内） | 强（整卡） | 差（不可迁移） | 完整 |
| SR-IOV | 低 | 强（VF 级） | 中 | 完整 |
| vGPU（GRID） | 中低（视 profile） | 强（管理程序级） | 中 | 完整（需专用驱动） |
| MIG | 接近零 | 最强（硬件级） | 差（不可迁移） | 完整（需新驱动） |

::: note 两条演进主线
一条是**隔离从软件走向硬件**：模拟/转发（软件）→ 直通（IOMMU）→ SR-IOV（硬件虚拟功能）→ MIG（GPU 原生分区）。另一条是**切分粒度从整卡走向子卡**：直通只能整卡，vGPU/MIG 可以 1/8 卡。
:::

## 3. PCIe 直通（GPU Passthrough）

### 3.1 VFIO 原理

直通 = 把整张物理 GPU 直接分配给一个虚拟机独占使用：

```text
          VM (Guest)                   Host (宿主机)
   ┌──────────────────┐        ┌──────────────────────────┐
   │  NVIDIA 驱动     │        │  QEMU/KVM               │
   │  (guest driver)  │        │  VFIO 框架 + IOMMU       │
   │  直接访问设备    │ ←────→ │  设备直通/中断直通        │
   └──────────────────┘        └──────────────────────────┘
         Guest 驱动看到完整 GPU（PCI 设备视图）
```

- **IOMMU**（如 Intel VT-d / AMD-Vi）：为直通设备做 DMA 重映射与隔离——guest 的 DMA 只能命中分配给它的内存（防 guest 乱写宿主机内存），这是直通的安全基础；
- **VFIO**（Virtual Function I/O）：内核提供的用户态设备直通框架，负责设备绑定（`vfio-pci` 驱动接管）、DMA 映射、中断重映射；
- **中断直通**：MSI-X 中断直接递送到 VM，减少 VM-Exit；
- 性能：接近裸机（通常损耗 <5%），因为 guest 驱动直接操作硬件，无中间层。

### 3.2 优缺点

| 优点 | 缺点 |
|---|---|
| 性能接近裸机、生态完整（驱动照常装） | **不能切分**：一张卡只能给一个 VM |
| 部署简单（相比 vGPU 无许可） | **不能迁移**：live migration 无法跨宿主机搬设备状态 |
| 适合独占整卡的高性能训练 | 受宿主 PCIe/IOMMU 拓扑限制，VM 数量受限 |

::: warning 直通不是"虚拟化"
直通本质是**设备独占 + 隔离**，不是切分。它解决了"多 VM 各要一张卡"，解决不了"一张卡给多个 VM"。后者需要 SR-IOV/vGPU/MIG。
:::

## 4. SR-IOV

- **SR-IOV（Single Root I/O Virtualization）**：PCIe 规范定义的硬件虚拟化，一个物理功能（PF，Physical Function）派生多个虚拟功能（VF，Virtual Function），每个 VF 可独立分配给一个 VM；
- 网卡是 SR-IOV 最典型的场景（一张 100G 网卡切成多个 VF）；GPU 场景下，NVIDIA 数据中心卡（vGPU 的某些实现路径）与 AMD/Intel 显卡用 SR-IOV 提供设备级切分；
- 与 VFIO 直通的区别：

| | VFIO 直通 | SR-IOV |
|---|---|---|
| 切分单位 | 整张物理设备 | PF 派生多个 VF |
| 每 VM 份额 | 独占整卡 | 一个 VF（可多个 VM 共享一张卡） |
| 硬件要求 | IOMMU | 设备支持 SR-IOV + IOMMU |

::: note 现状
NVIDIA 消费级显卡基本不支持 SR-IOV（人为限制）；数据中心卡的 vGPU（Blackwell/A100 时代）底层部分基于 SR-IOV 实现。理解 SR-IOV 的价值在于看懂"PF/VF"这类术语出现在 vGPU/驱动日志里时的含义。
:::

## 5. NVIDIA vGPU（原 GRID）

### 5.1 架构

vGPU = **管理程序（hypervisor）切分 + 专用驱动栈**：

```text
  VM1 (guest 驱动)   VM2 (guest 驱动)   VM3 (guest 驱动)
        │                  │                  │
        └──────────┬───────┴────────┬─────────┘
              vGPU Manager（部署在 hypervisor，如 ESXi/KVM）
                        │
                   物理 GPU（A100/H100 数据中心卡）
```

- 宿主机装 **vGPU Manager**（替代普通 NVIDIA 驱动），guest 装 **NVIDIA guest 驱动**（vGPU 专用版）；
- 通过 **vGPU profile** 定义每个虚拟 GPU 的份额：计算资源 + 显存大小；
- 特性：**显存隔离**（每个 vGPU 只能看到自己的显存切片）、**时间片隔离**（计算按 profile 分时保证）、vSGA/vCS（图形虚拟化/计算虚拟化模式）。

### 5.2 vGPU Profile 命名

典型格式如 `1g.5gb`、`2g.10gb`、`4g.20gb`、`8g.40gb`（以 A100 40GB 为例）：

| profile | 含义 |
|---|---|
| `1g.5gb` | 1/8 计算份额 + 5GB 显存（40/8） |
| `2g.10gb` | 1/4 计算份额 + 10GB 显存 |
| `4g.20gb` | 1/2 计算份额 + 20GB 显存 |
| `8g.40gb` | 整卡计算 + 40GB 显存 |

::: tip 命名规则
前缀数字 = GPU 计算份额（以 1/8 为基本单位）；后缀 `gb` 前数字 = 显存大小。同一 profile 的计算/显存比例由 vGPU Manager 保证，与 MIG 的 profile 命名同源（§6）。
:::

### 5.3 vGPU vs MIG

| | vGPU | MIG |
|---|---|---|
| 隔离实现 | 管理程序软件层 | GPU 硬件层 |
| 依赖 | hypervisor + vGPU 许可 + 专用驱动 | 驱动 + 数据中心卡，无许可 |
| 支持形态 | VM/虚拟桌面为主 | 裸机/容器/VM 皆可 |
| 计算隔离 | 时间片 | SM 硬件分区 |
| 开销 | 中 | 接近零 |

::: warning 一句话
vGPU 是"管理程序帮你切"，MIG 是"GPU 自己切自己"。vGPU 强在虚拟桌面与 VM 生态，MIG 强在数据中心计算与无许可。
:::

## 6. MIG（Multi-Instance GPU）

### 6.1 是什么

**MIG（Multi-Instance GPU）**：数据中心 GPU（A100/A30/H100/L40S 等）原生的硬件切分能力——把一块物理 GPU 切成最多 7 个独立实例，每个实例拥有**独占的显存切片、L2 分区、SM 分区与内存带宽**，硬件级隔离：

```text
物理 GPU（A100 40GB, 108 SMs, 40MB L2, 40GB HBM）
  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
  │ MIG 1g.5gb │ MIG 1g.5gb │ MIG 1g.5gb │ MIG 1g.5gb │ MIG 1g.5gb │ MIG 1g.5gb │ MIG 1g.5gb │
  │ 1/8 SM     │ 1/8 SM     │ ...        │ ...        │ ...        │ ...        │ ...        │
  │ 5GB 显存    │ 5GB 显存    │ 5GB        │ 5GB        │ 5GB        │ 5GB        │ 5GB        │
  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
  （A100 40GB 可切 7 × 1g.5gb；L2 与带宽按实例分区）
```

### 6.2 GI 与 CI

MIG 切分分两层：

- **GPU Instance（GI，GPU 实例）**：**显存切片**——独占一块显存与对应的 L2 分区/内存控制器分区，是"内存隔离"的单位；
- **Compute Instance（CI，计算实例）**：**计算切片**——一个 GI 内的 SM 分区，是"算力隔离"的单位；
- 一个 MIG 实例 = **1 个 GI + 1 个或多个 CI**；一个 GI 可以拆成多个 CI（共享显存、各占 SM 分区）；
- 隔离效果：实例间**零上下文切换、零缓存互相污染、显存互相不可见、故障相对隔离**。

```text
       GI 0（5GB 显存 + L2 分区）          GI 1（5GB 显存 + L2 分区）
   ┌───────────────────────────┐   ┌───────────────────────────┐
   │ CI 0: SM 分区 1/8          │   │ CI 1: SM 分区 1/8          │
   └───────────────────────────┘   └───────────────────────────┘
   1 个 GI 可含多个 CI：例如一个 7g.40gb GI 可拆成多个 CI，各占部分算力
```

### 6.3 支持情况与限制

| 项目 | 说明 |
|---|---|
| 支持的卡 | A100/A30/H100/H200/L40S 等数据中心卡；RTX/GeForce 消费卡不支持 |
| 最大实例数 | A100/H100 最多 **7 个**（全切 1g profile） |
| 显存要求 | 需开启 ECC（A100 上 MIG 要求 ECC on） |
| 模式切换 | 一张卡 MIG 模式与普通模式二选一，切换需重启驱动/卡 |
| 特性限制 | MIG 实例间不支持 P2P/NVLink 直连；不支持 live migration；MIG 内可再开 MPS（CUDA 11+） |

### 6.4 命令实战

```bash
# 1. 开启 MIG 模式（需 root，切换后对驱动重启生效）
sudo nvidia-smi -m 1                # -m = --multi-instance-gpu，1 开 0 关
nvidia-smi -L                        # 确认卡已进入 MIG 模式（或看 MIG Devices 列表）

# 2. 创建 GPU Instance：7 个 1g.5gb（profile ID 19 是 A100 40GB 上 1g.5gb 的整数 ID，
#    也可直接写名字：-cgi 1g.5gb,1g.5gb,...）
sudo nvidia-smi mig -cgi 19,19,19,19,19,19,19
sudo nvidia-smi mig -lgi            # 列出已创建的 GI（可见 ID 0-6）

# 3. 在每个 GI 内创建 Compute Instance
sudo nvidia-smi mig -cci 0,1,2,3,4,5,6
sudo nvidia-smi mig -lci            # 列出 CI

# 4. 查看/使用实例
nvidia-smi -L                        # 每个 MIG 实例有自己的 UUID，如 MIG 1g.5gb Device 0
CUDA_VISIBLE_DEVICES=0 python train.py   # 进程内看到的就是这个实例（逻辑编号见 [[08 GPU上下文与多进程调度]]）
sudo nvidia-smi mig -gi 1 -ci 0     # 查看/操作指定 GI/CI（配合 -c/-d 等子选项）

# 5. 销毁（全部）
sudo nvidia-smi mig -cgi -1          # 销毁全部 GI（先销毁 CI：-cci -1）
sudo nvidia-smi -m 0                 # 关闭 MIG 模式
```

::: important profile 命名规则（与 vGPU 同源）
`1g.5gb` = 计算份额 1/8（A100 共 8 份）+ 显存 5GB。A100 40GB 的可选 profile：`1g.5gb`（最多 7 个）、`2g.10gb`（最多 3 个）、`3g.20gb`、`4g.20gb`（最多 2 个）、`7g.40gb`（整卡 1 个）等；H100 80GB 类似（如 `1g.9gb`、`2g.18gb`、`7g.79gb`）。**profile 由卡的显存与 SM 总数决定，不可跨卡混用**；`-cgi` 参数既可用整数 ID 也可用 profile 名字。
:::

### 6.5 MIG 下的使用形态

- 裸机：`CUDA_VISIBLE_DEVICES` 选实例；
- 容器：device plugin 识别 MIG 实例并注入（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）；
- VM：MIG 也可直通给 VM（A100 起支持）；
- 调度：K8s 通过 `nvidia.com/mig-1g.5gb` 资源名调度（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）。

## 7. 云 GPU 实例形态

| 云厂商 | 代表实例 | 虚拟化方式 |
|---|---|---|
| AWS | p4d/p4de（A100 整卡）、g5（A10G）、trn1（Trainium） | 整卡直通（+ EFA 高速网络）；无切片共享 |
| Azure | ND A100 v4 系列 | 整卡直通；部分场景支持 MIG 切分 |
| 阿里云 | ecs.gn7（A100）、共享型 GPU 实例 | 整卡直通 + **cGPU**（用户态显存/算力隔离切分） |
| 谷歌云 | A2（A100） | 整卡直通；A2 支持 MIG 细分实例 |

::: note 云上看到的是抽象
云厂商把"直通/切片/vGPU"的差异封装成实例规格。你只需要知道：**整卡实例 = 性能最稳；切片实例 = 便宜，但软切有邻居影响、MIG 则完全隔离**。计费都按规格，不看底层。
:::

## 8. 开源 GPU 共享方案

- **k8s-device-plugin 时间切片**：NVIDIA 官方，把一张卡按时间片共享给多个 Pod，零改动但无隔离（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）；
- **GPU Share（如 gpushare 类）**：虚拟显存方案——给每个 Pod 分配"假"的显存配额，超卖调度，适合开发/低负载场景；
- **vGPU-software（阿里开源）**：用户态显存隔离切分，无需硬件支持，可在消费卡上做显存隔离；
- 与 MIG/vGPU 的区别：**软件层、无硬件隔离、性能与安全性弱于硬件方案**，但胜在通用（任何 NVIDIA 卡都能跑）。

## 9. 选择指南

| 场景 | 推荐技术 | 理由 |
|---|---|---|
| 训练独占整卡（性能第一） | 直通 / 裸机整卡 | 零损耗、生态完整 |
| 多租户生产推理（强隔离 + SLA） | MIG | 硬件隔离、无切换开销 |
| 多进程小模型推理（吞吐优先） | MPS（见 [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)） | 软共享但并发高 |
| 开发/测试共享（省钱优先） | 时间切片 / GPU Share / cGPU | 部署简单、可超卖 |
| 虚拟桌面 / 图形 VM | vGPU | 图形虚拟化生态成熟 |
| 需要 VM 形态 + 计算隔离 | vGPU（A100 系）或 MIG 直通给 VM | 视 hypervisor 支持 |

::: tip 选型口诀
**要性能独占 → 直通；要隔离切分 → MIG；要 VM/桌面 → vGPU；要省钱不较真 → 时间切片/软件共享。**
:::

## 10. 本章小结

- GPU 虚拟化 = 成本共享 + 隔离安全 + 细粒度分配 + 计费的基础；
- 谱系：软件模拟 → API 转发 → 半虚拟化 → 直通（VFIO）→ SR-IOV → MIG，隔离从软件走向硬件；
- 直通（VFIO + IOMMU）：性能最好、整卡独占、不可切分不可迁移；
- SR-IOV：PF/VF 硬件切分，是理解 vGPU 底层的关键；
- vGPU：管理程序切分 + profile（`1g.5gb` 格式），显存/时间片隔离，VM 与桌面生态强；
- MIG：硬件级切分（GI=显存切片、CI=计算切片），A100/H100 最多 7 实例，命令 `nvidia-smi mig -cgi/-cci`；
- 云厂商把底层封装成实例规格；开源方案（device-plugin 时间切片、GPU Share、cGPU）是软件层兜底。

::: tip 引出下一章
GPU 切好了（直通/MIG/时间切片），下一步就是怎么把它交给容器和 Kubernetes 调度：[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/) 讲 device plugin、`nvidia.com/gpu` 扩展资源与 GPU Operator。
:::

## 11. 自测题

**1. GPU 虚拟化的四个驱动力？**
答：共享成本（提高利用率摊薄硬件成本）、隔离安全（租户间显存/算力不可见不可干扰）、细粒度分配（按 1/8 卡等粒度售卖）、云厂商计费（按规格计量）。

**2. VFIO 直通的安全基础是什么？它为什么性能接近裸机？**
答：IOMMU——为直通设备做 DMA 重映射与隔离，guest 的 DMA 只能命中分配给它的内存。性能接近裸机因为 guest 驱动直接操作物理设备，无虚拟化中间层，中断走直通。

**3. 直通、SR-IOV、MIG 在"切分单位"上的区别？**
答：直通整卡独占一个 VM；SR-IOV 由 PF 派生多个 VF 分配给多个 VM（设备级切分）；MIG 在 GPU 内部把 SM/显存/L2 切成多个实例（芯片级切分）。直通不可切分，SR-IOV/MIG 可切。

**4. vGPU profile `2g.10gb` 表示什么？**
答：2/8 = 1/4 的计算份额 + 10GB 显存（以 40GB 卡为例）。前缀数字是计算份额（1/8 为单位），后缀是显存大小。

**5. MIG 里 GI 和 CI 的区别？一个 MIG 实例 = ?**
答：GI 是显存切片（独占显存 + L2/内存控制器分区），CI 是计算切片（GI 内的 SM 分区）。一个 MIG 实例 = 1 个 GI + 1 个或多个 CI。

**6. A100 40GB 上 `nvidia-smi mig -cgi 19,19,19,19,19,19,19` 创建了什么？profile ID 19 是什么？**
答：创建 7 个 `1g.5gb` 的 GPU Instance（profile ID 19 = 1g.5gb），合计约 7/8 的 SM 算力与 35GB 显存。之后还需 `-cci 0,1,2,3,4,5,6` 为每个 GI 建 CI，实例才能真正被计算使用。

**7. 为什么说 MIG 是"硬件级隔离"？相比时间切片强在哪？**
答：MIG 的显存切片、L2 分区、SM 分区、内存带宽分区都由硬件保证，实例间零上下文切换、零缓存污染、显存互不可见；时间切片是软件轮转，有切换开销且无显存隔离。

**8. 选型题：云厂商要卖"1/8 卡 + 5GB 显存、强隔离"的实例，且客户要跑 CUDA 容器，选什么？**
答：MIG（1g.5gb）。硬件隔离满足 SLA，容器通过 device plugin 直接调度 MIG 实例（[GPU容器化与Kubernetes调度](/kb/os/GPU/10-GPU容器化与Kubernetes调度/)）；vGPU 需要 VM + 许可，cGPU/时间切片无硬件隔离。

**9. 选型题：公司要上虚拟桌面（多个 Windows VM 各看 4K 视频 + 轻量 CUDA），选什么？**
答：vGPU。虚拟桌面场景图形虚拟化生态成熟（vSGA/vCS），按 profile 分配显存与时间片；MIG 不面向图形/桌面场景，直通则一张卡只能给一个 VM。

**10. MIG 的主要限制有哪些？**
答：仅数据中心卡支持（消费卡不行）；A100/H100 最多 7 实例；需开 ECC；MIG 与普通模式需切换（重启）；实例间不支持 P2P/NVLink 直连、不支持 live migration；profile 受卡型限制。

::: note 提示
第 6 题建议在 A100 真机上验证：先 `sudo nvidia-smi -m 1`，再 `nvidia-smi mig -cgi 19,19,19,19,19,19,19 && nvidia-smi mig -cci 0,1,2,3,4,5,6`，然后 `nvidia-smi -L` 观察实例列表；销毁用 `-cgi -1`。配合 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) 的 DCGM 可看到各实例的隔离指标。
:::
