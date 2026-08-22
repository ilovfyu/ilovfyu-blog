---
title: "GPU容器化与Kubernetes调度"
permalink: /kb/os/GPU/10-GPU容器化与Kubernetes调度/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "GPU虚拟化与MIG技术", link: /kb/os/GPU/09-GPU虚拟化与MIG技术/ }
next: { text: "GPU监控与运维实践", link: /kb/os/GPU/11-GPU监控与运维实践/ }
knowledgeNote:
  series: "OS"
  group: "GPU"
---
::: abstract 本章定位
本章回答：**容器里怎么跑起 GPU？Kubernetes 怎么把 GPU 当资源调度？** 学完你能：用 `docker run --gpus` 给容器注入 GPU，讲清 nvidia-container-toolkit 的注入原理（设备节点 + 用户态库 + 环境变量），在 K8s 集群上部署 Device Plugin 把 GPU 注册成 `nvidia.com/gpu` 扩展资源、写出正确的 Pod 资源清单，并能在整卡独占 / 时间切片 / MIG 三种模式间做出取舍，最后用 GPU Operator 一体化部署管理。
:::

容器化解决的是"**交付**"问题：让应用连同它依赖的 CUDA 版本、cuBLAS/cuDNN 等库一起打包，换机器不换环境。而 GPU 是**宿主机的物理设备**，容器要"借"它，必须由宿主机驱动 + 容器运行时协同完成注入。上一章 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) 讲的是"物理层面怎么切"，本章讲"软件层面怎么注入、怎么调度"。

## 1. 为什么容器跑 GPU

不容器化的痛点：

- **可移植性差**：训练脚本跑在 A100 上没问题，换台驱动老一点的机器就报 `CUDA driver version is insufficient`。
- **依赖地狱**：不同项目要 CUDA 11.8 / 12.1 / 12.4，装在同一台机器上互相踩。
- **隔离弱**：环境变量、库路径全局生效，一改全坏。

容器化之后：

| 诉求 | 容器方案 | 说明 |
|---|---|---|
| 可移植性 | 镜像自带 CUDA 运行时与库 | 换机器只要求"驱动够新"，不用重装环境 |
| 版本锁定 | CUDA 版本随镜像走 | `nvidia/cuda:12.1.1-runtime-ubuntu22.04` 与 `12.4.1-devel` 互不干扰 |
| 隔离 | 命名空间 + 挂载 | 进程、文件系统、库各自隔离，只共享宿主机内核与驱动 |

::: important 容器里跑 GPU 的本质
**注入三样东西**：① `/dev/nvidia*` 设备节点；② 驱动提供的用户态库（`libcuda.so`、`libnvidia-ml.so` 等）；③ 环境变量（告诉 CUDA 用哪几张卡）。**内核模块在宿主机**，容器共享宿主机内核，不需要也不应该把 `.ko` 装进容器。
:::

## 2. GPU 在容器里缺什么

容器默认看不到 GPU，因为缺以下东西（对照 [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/) 的软件栈）：

```text
宿主机（已装 NVIDIA 驱动）              容器（默认）
──────────────────────              ──────────────
内核态：nvidia.ko                    ✗ 共享宿主机内核（容器内无内核）
        nvidia_uvm.ko                   （内核模块只存在于宿主机）
        nvidia_modeset.ko
        nvidia_drm.ko
用户态：libcuda.so.1                 ✗ 需要注入
        libnvidia-ml.so.1            ✗ 需要注入
        libnvidia-ptxjitcompiler.so  ✗ 需要注入
        nvidia-smi                   ✗ 需要注入
设备节点：/dev/nvidia0               ✗ 需要注入
         /dev/nvidiactl
         /dev/nvidia-uvm
         /dev/nvidia-modeset
```

各设备节点用途：

| 节点 | 对应模块 | 用途 |
|---|---|---|
| `/dev/nvidia0`（每卡一个） | nvidia.ko | 访问具体 GPU（计算、显存、控制） |
| `/dev/nvidiactl` | nvidia.ko | 控制设备（建上下文、查信息） |
| `/dev/nvidia-uvm` | nvidia_uvm.ko | 统一内存（UVM），CUDA 初始化必需 |
| `/dev/nvidia-modeset` | nvidia_modeset.ko | 显示/模式设置（数据中心卡可无） |
| `/dev/nvidia-caps` | nvidia.ko | NV-CONTROL 等 |

::: warning 常见报错
容器里跑 CUDA 报 `no CUDA-capable device is detected` 或 `failed to open /dev/nvidia-uvm`，几乎都是这三样没注入全：设备节点缺失、用户态库没挂、或环境变量没设。别先怀疑代码，先 `ls /dev/nvidia*` 和 `ldconfig -p | grep libcuda`。
:::

## 3. nvidia-container-toolkit 原理（重点）

### 3.1 历史脉络

```text
2016  nvidia-docker 1.x      包装 docker CLI 的脚本，笨重，已废弃
  │
2017  nvidia-docker 2.0      引入 nvidia-container-runtime：
  │                          Docker 自定义 OCI runtime，创建容器时注入 GPU
  │
2019  nvidia-container-toolkit  更名整合：libnvidia-container（核心库 + cli）
  │                            + nvidia-container-runtime + 各运行时适配
  │                            新增 containerd / CRI-O / Podman 支持
  │
现在  nvidia-ctk             统一配置命令（runtime configure / hook 安装）
```

::: note 关系一句话
**libnvidia-container** 是核心库，提供 `nvidia-container-cli` 命令行；**nvidia-container-runtime** 是包装 runc 的 OCI runtime，创建容器时调用 `nvidia-container-cli` 完成注入；**nvidia-container-toolkit** 是这堆东西的总包名，同时为 containerd/CRI-O 提供 OCI prestart hook 模式。
:::

### 3.2 注入工作流（核心）

```text
docker run --gpus all
      │
      ▼
dockerd ──按 runtime 配置──> nvidia-container-runtime（本质是 runc 的包装）
      │                              │
      │                              ▼
      │                  容器创建前：调用 nvidia-container-cli（libnvidia-container 前端）
      │                              │
      │              ┌───────────────┼──────────────────┐
      │              ▼               ▼                  ▼
      │      ① 注入设备节点      ② 挂载用户态库     ③ 注入环境变量
      │      /dev/nvidia0        libcuda.so.1          NVIDIA_VISIBLE_DEVICES
      │      /dev/nvidiactl      libnvidia-ml.so.1     NVIDIA_DRIVER_CAPABILITIES
      │      /dev/nvidia-uvm     libnvidia-ptxjitcompiler.so  CUDA_VERSION
      │      /dev/nvidia-modeset nvidia-smi 等
      │
      ▼
交给 runc 启动容器（此时容器里 nvidia-smi 已可用）
```

具体动作（hook 阶段完成）：

1. **检测请求**：读取容器的 `NVIDIA_VISIBLE_DEVICES` 环境变量（`all` / `0,1` / UUID），决定注入哪些卡；
2. **注入设备节点**：把宿主机 `/dev/nvidia*` 按需 bind mount 进容器；
3. **挂载驱动库**：把宿主机驱动的用户态库（`libcuda.so.1`、`libnvidia-ml.so.1`、`libnvidia-ptxjitcompiler.so` 等）挂进容器，并运行 `ldconfig` 更新缓存；
4. **设置能力变量**：根据 `NVIDIA_DRIVER_CAPABILITIES`（`compute,utility` 等）决定挂哪些库、是否注入 `nvidia-smi`。

::: tip 为什么容器里的 libcuda 来自宿主机
`libcuda.so`（驱动 API 库）必须与宿主机内核模块严格配套，所以**永远从宿主机驱动注入**；而 cuBLAS/cuDNN/cudart 是纯用户态库，随镜像走。这就是"镜像锁 CUDA 版本、宿主机锁驱动"的分工。
:::

### 3.3 安装步骤

```bash
# 1) 添加 NVIDIA 官方 apt 源（Ubuntu/Debian 为例）
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# 2) 配置 Docker 使用 nvidia runtime（写 /etc/docker/daemon.json）
sudo nvidia-ctk runtime configure --runtime=docker

# 3) 重启 Docker
sudo systemctl restart docker

# 4) 验证
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

`nvidia-ctk runtime configure` 会写入：

```json
{
  "runtimes": {
    "nvidia": {
      "path": "nvidia-container-runtime",
      "runtimeArgs": []
    }
  },
  "default-runtime": "nvidia"
}
```

::: warning 设了 `default-runtime: nvidia` 之后
所有容器默认都会走 nvidia runtime，但**只有声明了 `NVIDIA_VISIBLE_DEVICES`（或 `--gpus`）的容器才真正注入 GPU**，其余容器行为不变。若不想全局改，把该行删掉、用 `--runtime=nvidia` 显式指定即可。
:::

## 4. Docker 使用 GPU

Docker 19.03+ 支持 `--gpus` 选项：

```bash
# 全部 GPU
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi

# 指定第 0、1 号卡
docker run --rm --gpus '"device=0,1"' nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi -L

# 按 UUID 指定（跨机器最稳）
docker run --rm --gpus '"device=GPU-xxxxxxxx-...."' \
  nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi -L

# 等价旧写法：runtime + 环境变量
docker run --rm --runtime=nvidia \
  -e NVIDIA_VISIBLE_DEVICES=0,1 \
  -e NVIDIA_DRIVER_CAPABILITIES=compute,utility \
  nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

hook 会读取的关键环境变量：

| 变量 | 示例 | 作用 |
|---|---|---|
| `NVIDIA_VISIBLE_DEVICES` | `all` / `0,1` / `GPU-&lt;uuid&gt;` / `void` | 哪些卡可见；`void`/`none` 不注入 GPU |
| `NVIDIA_DRIVER_CAPABILITIES` | `compute,utility` | `compute`=CUDA 库，`utility`=nvidia-smi/NVML，`graphics/video/display`=图形栈 |
| `NVIDIA_REQUIRE_CUDA` | `cuda>=12.0` | 驱动不满足 CUDA 版本要求时拒绝启动（防呆） |

::: tip 生产小贴士
镜像里 nvidia-smi 能用，是因为 `NVIDIA_DRIVER_CAPABILITIES=utility` 时 hook 把宿主机的 nvidia-smi 也挂进去了——它显示的是**宿主机驱动**信息，不是镜像里的。
:::

## 5. 镜像内 CUDA 与宿主机驱动的关系

- 镜像自带：cudart、cuBLAS、cuDNN 等**用户态库**（随镜像版本走）；
- 宿主机提供：`libcuda`（驱动 API）+ 内核模块（见 [GPU驱动与CUDA运行时栈](/kb/os/GPU/06-GPU驱动与CUDA运行时栈/)）；
- **约束**：镜像里的 CUDA 运行时版本 ≤ 宿主机驱动支持的最高 CUDA 版本（`nvidia-smi` 第一行 `CUDA Version` 就是驱动支持的上限）。

::: warning 版本不匹配的典型报错

:::```
> CUDA driver version is insufficient for CUDA runtime version
> ```
> 即镜像 CUDA 太新、驱动太老。解法：换旧版镜像，或升级宿主机驱动。反向（新驱动跑旧镜像）永远兼容，这就是驱动的**向前兼容**。

`nvidia/cuda` 镜像 tag 规范：`<CUDA版本>-<变体>-&lt;OS&gt;`，三种变体：

| 变体 | 包含 | 体积 | 用途 |
|---|---|---|---|
| `base` | CUDA 运行时最小集（cudart 等） | 最小 | 跑基础 CUDA 程序 |
| `runtime` | base + 全套 CUDA 库（cuBLAS/cuFFT/cuSPARSE/cuSOLVER…） | 中 | 跑编译好的 CUDA 应用（生产首选） |
| `devel` | runtime + nvcc、头文件、Samples | 大 | 编译 CUDA 代码 |

```bash
# 生产推理：用 runtime 而非 devel
docker pull nvidia/cuda:12.4.1-runtime-ubuntu22.04
# 需要编译扩展（如某些 pip 包源码编译）：用 devel
docker pull nvidia/cuda:12.4.1-devel-ubuntu22.04
```

## 6. Kubernetes GPU 调度（重点）

### 6.1 扩展资源机制

K8s 原生资源只有 CPU/内存，GPU 走**扩展资源（Extended Resource）**通道：

- 名字必须带域名前缀：`nvidia.com/gpu`；
- **只能整数值**（没法要 0.5 张卡），数量 = 设备数；
- **不能超卖**：节点上总数由 Device Plugin 上报，调度器按"已分配量"记账；
- **requests 必须等于 limits**（两者都写时；只写 limits 时 K8s 自动补 requests=limits）。

::: important 为什么 requests 必须等于 limits
扩展资源不支持超卖（overcommit），因为 GPU 无法像 CPU/内存那样被抢占式回收。若 requests < limits，语义就是"保证 1 张、最多 2 张"，调度器无法记账，K8s 直接拒绝。
:::

### 6.2 Device Plugin 架构

```text
┌──────────────────┐  ① register（Unix socket 注册自己）  ┌────────────────────┐
│  Device Plugin   │ ──────────────────────────────────> │      kubelet       │
│  (每节点 DaemonSet)│                                     │   （每个节点一个）    │
│   gRPC: v1beta1  │ <────────────────────────────────── │                    │
└──────────────────┘  ② ListAndWatch（流式上报            └─────────┬──────────┘
        ▲                 {ID: GPU-UUID, Health} 列表)              │ ③ 更新节点
        │                                                          │    allocatable
        │ ⑤ Allocate(设备ID) ──返回────┐                            ▼
        └──────────────────────────────────┐                ┌──────────────────┐
                    EnvVars / Mounts / Devices               │  调度器 kube-scheduler│
                    注入到容器 spec                          │  ④ 见 nvidia.com/gpu │
                                                            │     富余则调度       │
                                                            └──────────────────┘
```

完整流程：

1. **注册**：插件启动后通过 `/var/lib/kubelet/device-plugins/kubelet.sock` 向 kubelet 注册，声明资源名 `nvidia.com/gpu` 与 API 版本 v1beta1；
2. **ListAndWatch**：kubelet 调用该接口，插件持续上报设备列表（每个设备 = GPU 的 UUID + 健康状态）；kubelet 据此更新节点的 allocatable；
3. **调度**：Pod 声明 `nvidia.com/gpu: 1` 后，调度器把 Pod 放到"可用数 > 0"的节点；
4. **Allocate**：kubelet 在节点上调用插件的 `Allocate(ids)`，插件返回容器配置——`EnvVars`（`NVIDIA_VISIBLE_DEVICES=GPU-&lt;uuid&gt;`）、`Mounts`、`Devices`（`/dev/nvidia*`）；
5. **创建容器**：CRI 运行时（containerd/CRI-O）创建容器时，再经 nvidia-container-toolkit 完成最终注入（见第 3 节）。

::: note 健康上报的价值
插件检测到 GPU 异常（如 Xid 错误）会把该设备标记 `Unhealthy` 并从 ListAndWatch 流中移除，kubelet 自动把节点上的 `nvidia.com/gpu` 数量扣减，Pod 不再被调度到坏卡上。Xid 的解读见 [GPU故障排查与问题定位](/kb/os/GPU/14-GPU故障排查与问题定位/)。
:::

### 6.3 部署 nvidia-device-plugin

```bash
# 官方 DaemonSet（kubectl 直接应用）
kubectl create -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.16.2/nvidia-device-plugin.yml
```

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin-ds
  template:
    metadata:
      labels:
        name: nvidia-device-plugin-ds
    spec:
      priorityClassName: system-node-critical
      tolerations:
        - operator: Exists            # 容忍所有污点，保证每节点必达
      containers:
        - name: nvidia-device-plugin-ctr
          image: nvcr.io/nvidia/k8s-device-plugin:v0.16.2
          args:
            - --mig-strategy=none            # none | single | mixed
            - --device-list-strategy=env-var # env-var | volume-mounts
          securityContext:
            privileged: true                 # 需要访问 /dev 与 kubelet socket
          volumeMounts:
            - name: device-plugin
              mountPath: /var/lib/kubelet/device-plugins
            - name: dev
              mountPath: /dev
          resources:
            limits:
              cpu: "1"
              memory: 100Mi
      volumes:
        - name: device-plugin
          hostPath:
            path: /var/lib/kubelet/device-plugins
        - name: dev
          hostPath:
            path: /dev
```

关键参数：

| 参数 | 取值 | 说明 |
|---|---|---|
| `--mig-strategy` | `none`/`single`/`mixed` | 是否把 MIG 实例上报为资源；`single`=每个 MIG 实例算 1 个 `nvidia.com/gpu`，`mixed`=允许不同大小实例混报 |
| `--device-list-strategy` | `env-var`/`volume-mounts` | `env-var`：用 `NVIDIA_VISIBLE_DEVICES` 环境变量传设备 UUID；`volume-mounts`：把设备列表写文件挂进容器 |
| `--fail-on-init-error` | 布尔 | 插件初始化失败（如驱动没装）时退出，方便 DaemonSet 报错可见 |
| `--gpus-per-node` | 数字 | 限制每节点上报卡数（配合时间切片用） |

部署后验证：

```bash
kubectl -n kube-system get pods -l name=nvidia-device-plugin-ds
kubectl describe node &lt;node&gt; | grep -A3 "nvidia.com/gpu"   # 应看到 allocatable
```

## 7. Pod 使用 GPU：YAML 实战

最小示例：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-test
spec:
  restartPolicy: OnFailure
  containers:
    - name: cuda-vectoradd
      image: nvidia/samples:vectoradd-cuda11.2.1
      resources:
        limits:
          nvidia.com/gpu: 1      # 申请 1 张整卡
```

完整示例（vLLM 推理 8B 模型，2 张卡）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vllm-llama3-8b
spec:
  restartPolicy: OnFailure
  nodeSelector:                            # 按 GPU 型号亲和（见第 9 节）
    nvidia.com/gpu.product: "A100-SXM4-40GB"
  containers:
    - name: vllm
      image: vllm/vllm-openai:latest
      command: ["python3", "-m", "vllm.entrypoints.openai.api_server"]
      args:
        - --model
        - meta-llama/Llama-3-8B-Instruct
        - --tensor-parallel-size
        - "2"                              # 两张卡张量并行
        - --gpu-memory-utilization
        - "0.9"
      env:
        - name: HF_TOKEN
          valueFrom:
            secretKeyRef:
              name: hf-secret
              key: token
      resources:
        limits:
          nvidia.com/gpu: 2                # 2 张整卡
          memory: 64Gi
          cpu: "16"
        requests:
          nvidia.com/gpu: 2                # 扩展资源：requests == limits
          memory: 64Gi
          cpu: "16"
      ports:
        - containerPort: 8000
      readinessProbe:
        tcpSocket:
          port: 8000
```

::: tip 调度失败排查
`kubectl describe pod` 里看到 `0/2 nodes are available: 1 Insufficient nvidia.com/gpu, 1 node(s) had untolerated taint`，先 `kubectl describe node` 看 allocatable 是否为 0（插件没起来）或已被占满（记账问题）。
:::

## 8. GPU 共享与切分模式对比

| 模式 | `nvidia.com/gpu: 1` 的含义 | 隔离性 | 性能 | 适用场景 |
|---|---|---|---|---|
| **整卡独占** | 1 张物理卡 | 最强（硬件隔离） | 100% | 训练、大模型推理 |
| **时间切片** | 1 张物理卡的 1/N 份额（同一张卡被上报 N 次） | 弱（**无显存隔离**，可能 OOM） | 受其他租户干扰、波动 | 推理小模型、突发负载 |
| **MIG**（见 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)） | 1 个 MIG 实例 | 强（硬件级算力+显存隔离） | 接近独占（按切片比例） | 多租户生产环境 |
| **MPS**（见 [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/)） | 仍按整卡计（1 = 1 卡） | 弱（进程共享 SM） | 提升小任务并发吞吐 | 单卡内多进程 |

**时间切片配置**（device plugin v0.15+ 的 config 文件方式）：

```yaml
# /etc/nvidia/device-plugin/config.yaml
version: v1
sharing:
  timeSlicing:
    resources:
      - name: nvidia.com/gpu
        replicas: 4        # 每张卡上报 4 个 nvidia.com/gpu
```

```bash
# 插件带 config 启动
kubectl edit ds nvidia-device-plugin-daemonset -n kube-system
# args 增加：--config-file=/etc/nvidia/device-plugin/config.yaml
# 并挂载上面的 ConfigMap
```

::: warning 时间切片的两个大坑
① 时间切片只是"把同一张卡上报 N 次"，**显存完全不隔离**：两个 Pod 各分 1/2 切片，显存仍可互相挤爆（OOM 直接杀进程）；② 调度器眼里 4 个切片=4 个资源，但实际算力还是 1 张卡，排满后谁也跑不快——对延迟敏感的服务慎用。
:::

**MIG 模式**：先开 MIG 再让插件上报（`nvidia-smi mig -cgi` 创建实例，详见 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/)）：

```bash
nvidia-smi -mig 1                        # 开启 MIG（需 root，改完要重启）
# 创建 2 个 1g.10gb 实例
nvidia-smi mig -cgi 19,19 -C             # 19 = 1g.10gb 的 profile ID
# 插件 --mig-strategy=single：每个实例 = 1 个 nvidia.com/gpu
```

## 9. GPU 拓扑感知调度

多卡机型里卡与卡之间连接方式不同（PCIe / NVLink / NVSwitch），通信带宽差异巨大：

```bash
nvidia-smi topo -m
```

```text
        GPU0    GPU1    GPU2    GPU3    CPU Affinity    NUMA Affinity
GPU0     X      NV2     NV2     NV2     0-31            N/A
GPU1    NV2      X      NV2     NV2     0-31            N/A
GPU2    NV2     NV2      X      NV2     0-31            N/A
GPU3    NV2     NV2     NV2      X      0-31            N/A

Legend:
  X    = Self
  NV#  = 有 # 条 NVLink 连接
  PIX  = 同一 PCIe 交换机下
  PHB  = 同一 PCIe Host Bridge（需跨 PCIe 交换机）
  SYS  = 跨 QPI/NUMA 域（走 PCIe + 处理器互联，最慢）
  NODE = 跨 NUMA 节点
```

调度层面的手段：

- **Gang 调度**：多卡任务要"同时拿到全部卡"才启动，否则互相等待。K8s 1.27+ 用 Pod 调度门控（`PodSchedulingGates`）+ readiness gates + sidecar 容器实现；或上 Volcano / Kueue 等批调度器；
- **GPU 亲和**：gpu-feature-discovery（GPU Operator 组件）给节点打 `nvidia.com/gpu.product`、`nvidia.com/gpu.memory` 等标签，配合 `nodeSelector`/`nodeAffinity` 把 Pod 绑到指定型号或拓扑域；
- **NCCL**：多卡通信库会根据 `topo -m` 选最优路径（NVLink 直连优先、跳过慢速链路），拓扑感知调度能显著提升多卡训练吞吐，详见 [大模型训练推理GPU实践](/kb/os/GPU/13-大模型训练推理GPU实践/)。

::: tip 8 卡 SXM 机型通常全 NVLink 互联（如上图），而 4 卡 PCIe 机型多为 PIX/PHB 混合——跑分布式训练前先 `topo -m` 看一眼，避免把通信重的 pair 分到 SYS 链路。
:::

## 10. NVIDIA GPU Operator

**是什么**：把"GPU 节点该装的一切"打包成 Helm chart 一体化部署——驱动、容器工具链、Device Plugin、监控、标签发现、MIG 管理全自动：

```bash
helm repo add nvidia https://nvidia.github.io/gpu-operator
helm repo update
helm install gpu-operator nvidia/gpu-operator \
  -n gpu-operator --create-namespace
```

| 组件 | 职责 |
|---|---|
| NVIDIA Driver | 用 Driver Toolkit 自动编译/加载内核模块（支持开箱即用的 DGX 与常见发行版） |
| nvidia-container-toolkit | 容器运行时注入（第 3 节那套） |
| k8s-device-plugin | `nvidia.com/gpu` 扩展资源上报（第 6 节） |
| DCGM / dcgm-exporter | 监控指标采集（见 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/)） |
| gpu-feature-discovery | 给节点打 GPU 型号/显存/驱动版本标签 |
| MIG Manager | 自动创建/管理 MIG 实例 |
| node-exporter / validator | 节点指标与安装自检 |

与手工安装对比：

| 步骤 | 手工 | GPU Operator |
|---|---|---|
| 装驱动 | apt/runfile 手动装、管版本 | Helm 一条命令，Driver Toolkit 自动编译加载 |
| Device Plugin | 手写 DaemonSet | 内置 |
| 监控 | 单独部署 dcgm-exporter | 内置 |
| 升级 | 逐组件升级 | `helm upgrade` 滚动 |
| 代价 | 依赖少、可控 | 引入 Operator 抽象层，排障多一跳 |

::: note 选择建议
裸机 + 手动可控场景选手工安装；多节点、要快速交付、要驱动版本统一管理的集群直接用 GPU Operator。
:::

## 11. 常见坑

| 现象 | 原因 | 解法 |
|---|---|---|
| 容器里 `nvidia-smi` 报 `couldn't communicate with the NVIDIA driver` | 设备节点/库没注入（docker < 19.03、runtime 没配、或宿主机驱动本身坏了） | 先宿主机跑 nvidia-smi；再 `nvidia-ctk runtime configure` + 重启 docker；最后 `docker run --gpus all` 验证 |
| `CUDA driver version is insufficient` | 镜像 CUDA 版本 > 驱动支持版本 | 换旧镜像或升级驱动（见第 5 节） |
| Pod 一直 Pending：`Insufficient nvidia.com/gpu` | 插件没起 / allocatable 为 0 / 卡被占满 | `kubectl describe node` 看 allocatable；`kubectl logs` 插件 |
| requests 与 limits 不一致 | 扩展资源不支持超卖 | 改成相等 |
| DaemonSet 起不来：`Failed to create pod sandbox` / 权限错 | 插件需要 privileged + 挂载 `/dev` 与 `/var/lib/kubelet/device-plugins` | 检查 securityContext 与 volumeMounts |
| MIG 下改配置后 Pod 被驱逐 | 设备列表变化（实例重建），kubelet 认为设备不可用 | 改 MIG 配置前先 `kubectl drain` 节点 |
| 容器里 CUDA 初始化失败、`/dev/nvidia-uvm` 不存在 | 较老 toolkit 不挂 uvm 节点 / uvm 模块没加载 | 升级 nvidia-container-toolkit ≥ 1.11，或宿主机 `nvidia-modprobe` |

## 12. 本章小结

- 容器跑 GPU = 注入**设备节点 + 用户态驱动库 + 环境变量**，内核模块共享宿主机的；
- nvidia-container-toolkit（libnvidia-container + nvidia-container-cli + runtime）在容器创建前完成注入；镜像锁 CUDA 用户态库、宿主机锁 libcuda/驱动；
- K8s 用**扩展资源 + Device Plugin** 把 GPU 注册为 `nvidia.com/gpu`：register → ListAndWatch → Allocate 三步；
- 整卡 / 时间切片 / MIG 三种模式的核心差异是**隔离性与性能**；MIG 硬件隔离最强，时间切片无显存隔离；
- 多卡机型注意 NVLink 拓扑，配合 Gang 调度与亲和性；GPU Operator 可一体化交付驱动 + 插件 + 监控。

::: tip 引出下一章
容器和 K8s 把 GPU"发"出去了，接下来要回答：**GPU 到底用得好不好、卡有没有病？** 下一章 [GPU监控与运维实践](/kb/os/GPU/11-GPU监控与运维实践/) 从 `nvidia-smi` 每个字段讲起，到 DCGM 与 Prometheus 告警，再到利用率低与容量规划，把 GPU 集群管起来。
:::

## 13. 自测题

**1. 容器里跑 GPU 的本质是什么？需要注入哪三样东西？内核模块为什么不用进容器？**
答：本质是"借宿主机物理设备"。三样东西：① `/dev/nvidia*` 设备节点；② 用户态驱动库（libcuda、libnvidia-ml 等）；③ 环境变量（NVIDIA_VISIBLE_DEVICES 等）。内核模块（nvidia.ko 等）加载在宿主机内核里，容器与宿主机共享内核，所以不需要、也无法在容器里装内核模块。

**2. nvidia-container-toolkit 的注入流程分几步？nvidia-container-runtime 与它是什么关系？**
答：容器创建前由 `nvidia-container-cli` 完成：① 读 NVIDIA_VISIBLE_DEVICES 确定卡；② 注入设备节点；③ 绑定挂载用户态驱动库并 ldconfig；④ 按 NVIDIA_DRIVER_CAPABILITIES 注入 nvidia-smi 等。nvidia-container-runtime 是包装 runc 的 OCI runtime，负责在创建容器时触发上述注入；toolkit 是包含 libnvidia-container、cli、runtime 及 containerd/CRI-O hook 支持的总包。

**3. `docker run --gpus all` 背后发生了什么？如何只给第 0、1 号卡？**
答：dockerd 调用配置的 nvidia runtime，runtime 通过 hook 调用 nvidia-container-cli 完成设备/库/环境变量注入。指定卡：`docker run --gpus '"device=0,1"'`，或 `--runtime=nvidia -e NVIDIA_VISIBLE_DEVICES=0,1`。

**4. 镜像内 CUDA 版本与宿主机驱动是什么关系？报 "CUDA driver version is insufficient" 怎么办？**
答：镜像自带 CUDA 用户态库（cudart/cuBLAS 等），libcuda 来自宿主机驱动，要求 镜像 CUDA ≤ 驱动支持的最高 CUDA 版本（nvidia-smi 第一行 CUDA Version）。报错说明镜像太新/驱动太老：换低版本镜像或升级驱动。新驱动跑旧镜像永远兼容（向前兼容）。

**5. 写出一个 Pod 申请 2 张 GPU 的资源清单，并解释为什么 requests 必须等于 limits。**
答：`resources: {limits: {nvidia.com/gpu: 2}, requests: {nvidia.com/gpu: 2}}`。扩展资源是整数、不可超卖、不可抢占式回收，调度器必须精确记账，所以 requests 必须等于 limits（只写 limits 时 K8s 自动补 requests=limits）。

**6. 描述 Device Plugin 的完整工作流程（从注册到容器启动）。**
答：① 插件经 /var/lib/kubelet/device-plugins/kubelet.sock 向 kubelet 注册（资源名 nvidia.com/gpu、API v1beta1）；② kubelet 调 ListAndWatch，插件流式上报 {UUID, Health}，kubelet 更新节点 allocatable；③ 调度器按 Pod 的 nvidia.com/gpu 数量把 Pod 调度到富余节点；④ kubelet 调 Allocate(ids)，插件返回 EnvVars/Mounts/Devices 注入容器 spec；⑤ CRI 运行时创建容器，经 nvidia-container-toolkit 完成最终注入。

**7. 时间切片与 MIG 的核心区别？各适合什么场景？**
答：时间切片只是把同一张卡上报 N 次，算力时分复用、**无显存隔离**（可互相 OOM），性能受邻居干扰；MIG 是硬件级切分，算力与显存都隔离，性能接近独占。时间切片适合显存需求小、延迟不敏感的小模型推理；MIG 适合多租户生产、需要稳定性能与强隔离的场景。

**8. `nvidia/cuda` 镜像 base/runtime/devel 的区别？生产推理选哪个？**
答：base 只有 CUDA 运行时最小集；runtime = base + 全套 CUDA 库（cuBLAS/cuFFT 等）；devel = runtime + nvcc/头文件。生产推理选 runtime（体积小、够用）；需要编译 CUDA 代码才用 devel。

**9. GPU Operator 包含哪些组件？相对手工安装解决了什么问题？**
答：驱动（Driver Toolkit）、nvidia-container-toolkit、k8s-device-plugin、DCGM/dcgm-exporter、gpu-feature-discovery、MIG Manager、validator 等。解决：驱动装不上/版本乱、插件与监控逐组件手工部署易错、升级繁琐——Helm 一条命令完成装机、配置、升级与自检。

::: note 第 7 题提示
判断"该用哪种共享模式"先问两个问题：**要不要显存隔离？** 要 → MIG；不要且图省事 → 时间切片。再问**性能敏感吗？** 敏感 → 尽量整卡独占。三者的底层机制分别在 [GPU虚拟化与MIG技术](/kb/os/GPU/09-GPU虚拟化与MIG技术/) 和 [GPU上下文与多进程调度](/kb/os/GPU/08-GPU上下文与多进程调度/) 里展开。
:::
