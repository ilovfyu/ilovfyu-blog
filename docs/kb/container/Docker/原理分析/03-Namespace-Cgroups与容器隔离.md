---
title: "Namespace、Cgroups 与容器隔离"
permalink: /kb/container/Docker/原理分析/03-Namespace-Cgroups与容器隔离/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "镜像分层、容器可写层与 OCI", link: /kb/container/Docker/原理分析/02-镜像分层容器可写层与OCI/ }
next: { text: "Docker 网络原理", link: /kb/container/Docker/原理分析/04-Docker网络原理/ }
knowledgeNote:
  series: "容器"
  group: "原理分析"
---
## 1. 容器隔离不是一个开关

Linux 容器隔离由多种内核机制共同构成。

最核心的两组机制是：

- namespaces：限制进程看到什么。
- cgroups：限制和统计进程能使用多少资源。

还需要其他安全边界：

- capabilities：拆分传统 root 权限。
- seccomp：过滤系统调用。
- LSM：SELinux、AppArmor 等强制访问控制。
- user identity：容器用户、user namespace、rootless 模式。
- mount flags：只读、`nosuid`、`nodev` 等。
- kernel patching：容器共享 kernel，内核漏洞非常关键。

所以，“用了 namespace”不等于“安全完成”。

## 2. Linux Engine 与 Desktop

原生 Linux Engine 的容器直接共享 Linux 主机内核。

在 macOS 或 Windows 的 Docker Desktop 中，Linux 容器共享 Desktop 管理的 Linux VM 内核。

```text
原生 Linux：
Host Linux kernel
├── dockerd/containerd
├── container A namespaces + cgroup
└── container B namespaces + cgroup

Docker Desktop：
macOS/Windows host
└── Linux VM kernel
    ├── dockerd/containerd
    ├── container A namespaces + cgroup
    └── container B namespaces + cgroup
```

因此 `/proc`、cgroup filesystem 和 namespace inode 要在承载容器的 Linux 环境观察。

macOS 宿主本身没有 Linux namespace。

## 3. namespace 的基本模型

namespace 让一组进程看到某类资源的独立视图。

它不一定创建资源的完整副本。

Linux 常见 namespace 类型包括：

- mount：挂载点视图。
- PID：进程 ID 空间。
- network：网络设备、路由和端口空间。
- UTS：hostname 和 domainname。
- IPC：System V IPC、POSIX message queue 等。
- user：用户和组 ID 映射。
- cgroup：进程看到的 cgroup 路径视图。
- time：部分时钟偏移视图。

Docker 是否为每个容器启用某类独立 namespace，取决于配置和共享选项。

例如 host network 会让容器共享宿主 network namespace。

## 4. 观察 namespace

启动实验容器：

```bash
docker run -d --name ns-demo alpine sleep 1d
pid=$(docker inspect -f '{{.State.Pid}}' ns-demo)
```

在 Linux Engine 主机上查看：

```bash
sudo ls -l "/proc/$pid/ns"
sudo lsns -p "$pid"
```

`/proc/&lt;pid&gt;/ns/*` 链接中的 inode 可用于比较两个进程是否共享 namespace。

```bash
host_pid=$$
sudo readlink "/proc/$host_pid/ns/net"
sudo readlink "/proc/$pid/ns/net"
```

inode 不同通常表示不同 network namespace。

权限和 procfs 挂载设置可能限制观察。

## 5. PID namespace

PID namespace 隔离进程编号和可见性。

同一个进程可以在嵌套 PID namespaces 中拥有不同 PID。

容器内的 PID 1，在宿主机上通常是另一个较大的 PID。

```bash
docker exec ns-demo ps
docker inspect -f '{{.State.Pid}}' ns-demo
```

### PID 1 的特殊性

容器主进程通常是其 PID namespace 中的 PID 1。

PID 1 有两个常见责任：

- 正确处理终止信号。
- 回收孤儿子进程，避免 zombie 累积。

某些应用不是合格的 init。

可使用：

```bash
docker run --init image-name
```

`--init` 增加一个轻量 init 作为 PID 1。

是否需要取决于应用进程模型。

### 共享 PID namespace

Docker 可配置容器共享其他容器或宿主 PID namespace。

这会弱化隔离，但可用于调试或 sidecar 场景。

```bash
docker run --pid host ...
```

不要在普通业务容器中无理由使用 `--pid host`。

## 6. mount namespace

mount namespace 隔离挂载点视图。

容器拥有自己的 rootfs 组合与挂载表。

```bash
docker exec ns-demo cat /proc/self/mountinfo
```

宿主挂载 bind mount 后，容器看到指定目标路径。

```bash
docker run --rm --mount type=bind,src=/host/path,dst=/data,ro alpine ls /data
```

mount namespace 不自动复制数据。

bind mount 仍指向宿主文件系统对象。

### mount propagation

挂载传播控制一个 namespace 中新增 mount 是否传播到另一个 namespace。

常见语义有：

- private。
- rprivate。
- shared。
- rshared。
- slave。
- rslave。

默认行为和平台支持应查当前 Docker 文档。

传播选项使用错误可能导致：

- 容器看不到宿主后续子挂载。
- 容器挂载意外传播到宿主。
- Kubernetes-in-Docker 等嵌套场景失败。

普通应用通常不需要修改传播模式。

## 7. network namespace

network namespace 隔离：

- 网络接口。
- IP 地址。
- 路由表。
- 邻居表。
- socket 端口空间。
- 部分 netfilter 状态和网络 sysctl。

默认 bridge 容器通常通过 veth 与宿主 bridge 相连。

容器里的 `eth0` 并不是宿主物理网卡。

```bash
docker exec ns-demo ip addr
docker exec ns-demo ip route
```

Alpine 镜像可能未安装完整 `iproute2`。

可使用专用诊断镜像，避免临时污染业务镜像。

### host network

```bash
docker run --network host ...
```

在原生 Linux 上，这通常让容器共享宿主 network namespace。

它失去独立端口空间，`-p` 的意义也随之改变。

Docker Desktop 的 host networking 能力和路径受 Desktop 版本与设置约束。

不能机械等同于原生 Linux。

## 8. UTS namespace

UTS namespace 隔离 hostname 和 NIS domain name。

```bash
docker run --rm --hostname demo-host alpine hostname
```

修改容器 hostname 不会修改宿主 hostname。

hostname 不是稳定的服务发现方案。

容器重建、扩缩容后身份可能变化。

服务发现应使用网络别名、DNS 或编排平台服务名。

## 9. IPC namespace

IPC namespace 隔离部分进程间通信资源。

包括：

- System V shared memory。
- semaphore sets。
- message queues。
- POSIX message queues。

`/dev/shm` 的挂载与大小也是应用常见关注点。

```bash
docker run --rm --shm-size=256m image-name
```

浏览器、数据库和科学计算应用可能需要更大共享内存。

共享 IPC namespace 会扩大容器之间可见面。

## 10. user namespace

user namespace 可以把容器内 UID/GID 映射到外部不同 UID/GID。

概念示例：

```text
容器内 UID 0  ──映射──>  宿主 UID 100000
容器内 UID 1  ──映射──>  宿主 UID 100001
```

容器内“root”不再等价于初始 user namespace 的宿主 root。

这可以显著降低逃逸后的权限风险。

但它会影响：

- bind mount 所有权。
- 设备访问。
- 低端口与 capability 行为。
- 某些文件系统和旧软件兼容性。

Docker 的 user namespace remapping、rootless mode 和普通 `--user` 是不同概念。

### `--user`

```bash
docker run --user 1000:1000 image-name
```

它选择容器进程凭据。

但不必然启用 user namespace 映射。

### rootless mode

rootless Docker 让 daemon 和容器以非 root 用户运行。

它依赖 user namespace 等机制。

网络、cgroup、端口和存储能力可能受系统配置限制。

应以当前 rootless 文档和 `docker info` 为准。

## 11. cgroup 不是 namespace

namespace 改变可见视图。

cgroup 组织进程并实施资源控制与核算。

即使容器看不到宿主进程，如果没有合理资源限制，它仍可能耗尽宿主资源。

反过来，有 cgroup 限制也不等于文件、网络和进程视图被隔离。

两者解决不同问题。

## 12. cgroups v2 的统一层级

cgroups v2 使用统一 hierarchy。

常见挂载位置是：

```text
/sys/fs/cgroup
```

检查版本：

```bash
stat -fc %T /sys/fs/cgroup
```

输出 `cgroup2fs` 通常表示 v2。

也可查看：

```bash
mount | grep cgroup
docker info
```

本文重点使用 cgroups v2 语义。

发行版可能由 systemd 管理 cgroup hierarchy。

Docker 的 cgroup driver 也应从 `docker info` 确认。

## 13. cgroup v2 文件模型

每个 cgroup 表现为 cgroup filesystem 中的目录。

控制文件常见有：

- `cgroup.procs`：该 cgroup 中的进程。
- `cgroup.controllers`：可用 controllers。
- `cgroup.subtree_control`：对子树启用的 controllers。
- `cpu.max`：CPU 带宽上限。
- `cpu.weight`：竞争时的相对权重。
- `memory.max`：内存硬上限。
- `memory.high`：内存节流阈值。
- `memory.current`：当前记账内存。
- `memory.events`：内存事件。
- `pids.max`：进程数上限。
- `io.max`、`io.weight`：I/O 控制。

具体 controller 是否可用取决于 kernel、父 cgroup 委托和 daemon 配置。

## 14. CPU 限制

Docker 常见选项：

```bash
docker run --cpus=1.5 image-name
docker run --cpu-shares=512 image-name
docker run --cpuset-cpus=0,2 image-name
```

它们含义不同。

### `--cpus`

通常转化为 CPU quota/period 语义。

它限制一段时间窗口内可使用的 CPU 时间。

不是“绑定一颗固定 CPU”。

### `--cpu-shares`

表达竞争时相对权重。

机器空闲时，容器仍可能使用更多 CPU。

cgroups v2 中会映射为相应 weight 语义。

映射细节由 runtime/daemon 处理。

### `--cpuset-cpus`

限制任务可在哪些逻辑 CPU 上运行。

它与 NUMA、本地性和宿主调度有关。

不要假定容器看到的 CPU 编号跨机器稳定。

## 15. 内存限制

```bash
docker run --memory=512m image-name
docker run --memory=512m --memory-swap=1g image-name
```

内存记账不只是进程匿名堆。

可能包括 page cache、内核相关记账和共享页面的特定计费。

具体细节取决于 kernel 和 cgroup 版本。

达到硬限制后，cgroup OOM 处理可能终止容器内进程。

观察：

```bash
docker inspect -f '{{.State.OOMKilled}}' container-name
docker stats container-name
```

Linux 主机还可读取对应 cgroup 的：

```text
memory.current
memory.max
memory.events
memory.stat
```

`docker stats` 与主机监控工具可能因 cache 口径不同而显示不同数字。

比较时先确认统计定义。

## 16. PID 数量限制

fork bomb 不一定先耗尽内存。

它也可能耗尽宿主 PID 或调度资源。

```bash
docker run --pids-limit=256 image-name
```

cgroups v2 对应 `pids.max`。

对会创建大量线程的 JVM、数据库和代理，要为正常峰值留出空间。

Linux 线程也会计入 task/PID 相关限制。

## 17. I/O 控制

Docker 提供部分块设备 I/O 限制选项。

实际效果依赖：

- cgroup v2 I/O controller 是否启用。
- 底层块设备映射。
- filesystem 和 storage driver。
- Desktop VM 与虚拟磁盘路径。
- buffered I/O 与 direct I/O 行为。

因此 I/O 限制必须在目标环境压测验证。

不能只看命令接受了参数就认定效果符合预期。

## 18. cgroup 路径观察

在容器内：

```bash
cat /proc/self/cgroup
```

cgroup v2 常见输出类似：

```text
0::/some/path
```

在宿主机找到实际目录后可读控制文件。

路径形式受 systemd cgroup driver、rootless 和 daemon 配置影响。

不要硬编码 `docker/&lt;id&gt;`。

可从容器 PID 的 `/proc/&lt;pid&gt;/cgroup` 开始定位。

## 19. Linux capabilities

传统 Unix 把大量特权集中在 UID 0。

capabilities 将其拆成较小权限单元。

常见能力包括：

- `CAP_NET_BIND_SERVICE`：绑定低端口。
- `CAP_NET_ADMIN`：多种网络管理操作。
- `CAP_SYS_ADMIN`：范围非常广，风险很高。
- `CAP_CHOWN`：修改文件所有者。
- `CAP_KILL`：跨普通权限边界发送信号。
- `CAP_SYS_PTRACE`：跟踪其他进程。

Docker 默认给容器一组受限 capabilities，而非全部。

实际默认集合可能随版本变化。

查询具体容器配置和当前文档，不要背固定列表。

### 最小权限模式

```bash
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE image-name
```

先全部删除，再仅添加必要能力，边界更清楚。

应用还应以非 root 用户运行。

capability 检查可使用：

```bash
docker exec container-name sh -c 'grep Cap /proc/1/status'
```

十六进制位图需要 `capsh` 等工具解码。

## 20. seccomp

seccomp 可限制进程允许调用的系统调用。

Docker 默认通常应用一个 seccomp profile。

默认行为和 profile 会随版本、平台变化。

它可以降低内核攻击面。

例如阻止普通容器不需要的高风险系统调用。

自定义 profile：

```bash
docker run --security-opt seccomp=/path/profile.json image-name
```

完全禁用：

```bash
docker run --security-opt seccomp=unconfined image-name
```

禁用只应作为定位兼容问题的短期实验。

不要因为应用报 `Operation not permitted` 就直接长期 unconfined。

先定位是 seccomp、capability、LSM 还是文件权限导致。

## 21. AppArmor 与 SELinux

LSM 在 namespace 和 Unix 权限之外继续实施访问控制。

Docker 可与 AppArmor 或 SELinux 集成。

具体取决于发行版、kernel 与 daemon 配置。

### SELinux bind mount 标签

某些系统使用 `:z` 或 `:Z` 处理 bind mount 标签。

这会修改宿主路径标签，具有实际影响。

使用前应理解共享与私有标签语义。

### AppArmor profile

默认 profile 可限制 mount、ptrace 和文件访问等行为。

排障应检查内核审计日志，而不是只在容器里反复 `chmod 777`。

## 22. privileged 到底做了什么

```bash
docker run --privileged image-name
```

`--privileged` 会大幅放宽设备、capabilities 和安全配置限制。

具体变化由 Docker 版本和平台决定。

它不是“多给一个权限”那么简单。

普通业务容器不应使用它。

如果应用必须 privileged，应重新评估：

- 是否只需要一个 capability。
- 是否只需要一个设备。
- 是否只需要特定 seccomp 例外。
- 是否可把高权限组件拆成最小代理。

## 23. Docker socket 与隔离绕过

把 Docker socket 挂入容器相当于把 daemon 控制权交给容器。

攻击者可请求：

- 创建 privileged 容器。
- bind mount 宿主根目录。
- 读取其他容器配置。
- 管理镜像和网络。

因此“容器本身不是 privileged”并不能抵消 socket 暴露。

需要构建服务时，应考虑隔离 builder、受限 API 代理和独立主机。

## 24. 只读 rootfs

```bash
docker run --read-only --tmpfs /tmp image-name
```

只读 rootfs 可减少应用篡改和持久化落点。

应用仍可能需要：

- `/tmp`。
- 运行时 PID 目录。
- 缓存目录。
- 明确的数据 volume。

应为这些路径提供最小可写挂载。

只读 rootfs 不会自动阻止网络攻击或内核漏洞。

## 25. no-new-privileges

```bash
docker run --security-opt no-new-privileges=true image-name
```

它阻止进程通过 `execve` 获得新的特权。

例如限制 setuid/setgid 或文件 capability 带来的提权效果。

这是低成本的加固项。

但要测试依赖特权辅助程序的应用。

## 26. 一个分层加固示例

```bash
docker run --rm \
  --user 10001:10001 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges=true \
  --memory 512m \
  --cpus 1 \
  --pids-limit 256 \
  image-name
```

这只是基线示例。

应用可能需要某个 capability、写目录或更大资源限额。

应通过测试和监控逐项确定，而不是盲目粘贴。

## 27. 常见误区

### 误区一：容器内 root 就一定是宿主 root

是否等价取决于 user namespace、rootless、capabilities 和可访问接口。

但默认 root 容器仍有较高风险。

### 误区二：配置内存限制就保证应用不 OOM

限制只是确定边界。

应用仍可能被 cgroup OOM 杀死。

### 误区三：CPU shares 是硬上限

shares/weight 主要用于竞争时的相对分配。

### 误区四：namespace 是安全沙箱的全部

还需要 capability、seccomp、LSM、用户权限和内核安全。

### 误区五：privileged 是解决权限错误的正常方式

它扩大权限面并掩盖真正需求。

### 误区六：Desktop 容器与 macOS 进程共享 kernel

Linux 容器共享 Desktop Linux VM kernel。

### 误区七：cgroup 路径永远固定

systemd driver、rootless 和版本会改变路径。

## 28. 排障方法

资源限制是否生效：

```bash
docker inspect container-name --format '{{json .HostConfig}}'
docker stats --no-stream container-name
```

OOM：

```bash
docker inspect -f '{{.State.OOMKilled}} {{.State.ExitCode}}' container-name
```

权限错误：

```bash
docker inspect container-name --format '{{json .HostConfig.CapAdd}} {{json .HostConfig.SecurityOpt}}'
docker exec container-name sh -c 'id; grep Cap /proc/1/status'
```

再检查宿主审计日志、seccomp 和 LSM 拒绝记录。

namespace 对比：

```bash
pid=$(docker inspect -f '{{.State.Pid}}' container-name)
sudo lsns -p "$pid"
sudo cat "/proc/$pid/cgroup"
```

## 29. 清理实验

```bash
docker rm -f ns-demo
```

删除容器后，对应进程和通常的独立 namespaces 会消失。

若 namespace 仍被其他进程或文件描述符引用，它可能继续存在。

这属于 Linux namespace 生命周期语义。

## 30. 总结

- namespace 隔离视图，cgroup 控制和统计资源。
- PID namespace 让容器拥有独立 PID 视图，PID 1 需要处理信号与子进程。
- mount namespace 隔离挂载表，但 bind mount 仍访问宿主对象。
- network namespace 提供独立接口、路由和端口空间。
- user namespace 可把容器 root 映射为宿主非 root ID。
- cgroups v2 使用统一层级和 controller 文件。
- CPU quota、weight、cpuset 是不同控制维度。
- 内存限制可能触发 cgroup OOM，统计口径需要确认。
- capabilities、seccomp、LSM 和 no-new-privileges 共同缩小权限面。
- `--privileged` 和 Docker socket 都会显著削弱隔离。
- Desktop 上这些 Linux 机制运行在受管理 Linux VM 内。
- 安全边界必须分层设计并在目标平台验证。

## 31. 官方资料

- Linux namespaces man page：https://man7.org/linux/man-pages/man7/namespaces.7.html
- cgroup v2 kernel documentation：https://docs.kernel.org/admin-guide/cgroup-v2.html
- Docker resource constraints：https://docs.docker.com/engine/containers/resource_constraints/
- Docker security：https://docs.docker.com/engine/security/
- Docker seccomp：https://docs.docker.com/engine/security/seccomp/
- Docker AppArmor：https://docs.docker.com/engine/security/apparmor/
- Docker user namespace：https://docs.docker.com/engine/security/userns-remap/
- Docker rootless mode：https://docs.docker.com/engine/security/rootless/
- OCI Runtime Spec Linux config：https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md
