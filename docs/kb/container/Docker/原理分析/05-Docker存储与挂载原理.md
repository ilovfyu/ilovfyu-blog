---
title: "Docker 存储与挂载原理"
permalink: /kb/container/Docker/原理分析/05-Docker存储与挂载原理/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Docker 网络原理", link: /kb/container/Docker/原理分析/04-Docker网络原理/ }
next: { text: "BuildKit 构建、缓存与镜像分发", link: /kb/container/Docker/原理分析/06-BuildKit构建缓存与镜像分发/ }
knowledgeNote:
  series: "容器"
  group: "原理分析"
---
## 1. 先区分四类数据

理解 Docker 存储，先不要把所有“容器里的文件”混成一类。

常见数据来源有：

1. 镜像只读层。
2. 容器可写层。
3. volume 或 bind mount 等持久/外部挂载。
4. tmpfs 等内存型临时挂载。

```text
容器 mount namespace 中看到的文件树
/
├── /bin /usr /etc  <- 镜像层 + 容器可写层
├── /var/lib/app    <- named volume
├── /workspace      <- bind mount
└── /run/secrets    <- tmpfs 或受管理的临时挂载
```

它们恰好出现在同一目录树中，不代表生命周期和存储位置相同。

## 2. 平台边界

### 原生 Linux Engine

镜像 store、snapshotter、volume 数据通常位于 Linux 主机文件系统。

准确 root 目录可从 `docker info` 等查询。

不要直接修改 Docker data root 中的私有文件。

### Docker Desktop

macOS/Windows 上的 Linux Engine 数据主要位于 Desktop 管理的 Linux VM/虚拟磁盘中。

named volume 也通常在该 Linux 环境中管理。

bind mount 则可能需要把 macOS/Windows 路径共享到 VM，再挂入容器。

```text
macOS/Windows filesystem
      │ Desktop file sharing boundary
      ▼
Linux VM mount
      │ container bind mount
      ▼
container path
```

因此 Desktop bind mount 的一致性、权限、大小写和性能表现可能不同于原生 Linux。

Windows 容器还有不同的存储驱动与路径语义。

本文聚焦 Linux 容器。

## 3. 镜像层与可写层回顾

镜像 filesystem layers 是不可变变更集。

运行容器时，storage driver 或 snapshotter 提供组合 rootfs。

容器在上面获得可写层。

```text
merged view  <- 容器进程看到
    │
    ├── upperdir：容器可写变更
    ├── workdir：OverlayFS 内部工作目录
    └── lowerdirs：镜像只读层/快照
```

这是 OverlayFS 的概念图。

实际环境也可能使用其他 snapshotter。

路径、层数和挂载参数属于实现细节。

## 4. OverlayFS 的基本语义

Linux OverlayFS 将 lower 层与 upper 层合成 merged 视图。

### 读取

读取路径时优先看 upper。

upper 不存在再看 lower。

### 新建

新文件写入 upper。

### 修改 lower 文件

通常先 copy-up 到 upper，再修改 upper 副本。

### 删除 lower 文件

upper 中记录 whiteout，使 merged 视图隐藏 lower 文件。

### 删除 lower 目录或遮蔽内容

可能涉及 opaque directory 等 OverlayFS 语义。

OCI layer tar 中也定义了 whiteout 表达。

解包器负责把分发层语义转为 snapshotter 可用状态。

## 5. copy-up 的性能含义

容器首次修改镜像中的大文件时，可能需要复制数据或元数据到 upper。

这可能造成：

- 首次写延迟。
- 可写层空间增长。
- 大型数据库文件的写放大。
- inode 与元数据操作开销。

具体行为取决于 kernel、OverlayFS 特性、挂载选项和文件操作模式。

数据库的持久目录应使用 volume 或经过验证的外部存储。

不要把活跃数据库放在容器可写层并期待可管理的生命周期。

## 6. rename、hard link 与 page cache

联合文件系统会让部分 POSIX 边缘行为更复杂。

涉及 lower/upper 边界的 rename、hard link、inode 观察可能与普通单层文件系统不同。

现代 kernel 和 snapshotter 已处理大量兼容问题。

但对依赖 inode 稳定性、特殊 xattr 或高级 filesystem 特性的应用，应在目标环境验证。

不要根据某篇旧版 `overlay2` 文章推断 2026 环境的所有细节。

## 7. overlay2 与 OverlayFS

OverlayFS 是 Linux kernel 文件系统。

`overlay2` 是 Docker 经典 storage driver 的名称。

两者不是完全同义词。

containerd image store 也可以通过 overlayfs snapshotter 使用 OverlayFS。

此时元数据和生命周期管理走 containerd 模型，而不是经典 graphdriver 模型。

检查当前环境：

```bash
docker info
docker info --format '{{.Driver}}'
docker info --format '{{json .DriverStatus}}'
```

输出字段随版本和 store 配置不同。

## 8. containerd content store 与 snapshotter

content store 保存按 digest 标识的 OCI blobs。

snapshotter 保存或表示可挂载的 filesystem snapshots。

二者不能混为一谈。

```text
Registry compressed layer blob
            │ pull + verify
            ▼
containerd content store
            │ unpack / prepare
            ▼
snapshotter snapshots
            │ mount/compose
            ▼
container rootfs
```

远程 snapshotter 可能按需读取内容。

并不一定先把所有数据完整解包到传统目录。

实际可用性取决于 Engine 配置和插件。

## 9. 容器可写层的生命周期

可写层绑定容器对象。

```bash
docker run --name writable-demo alpine sh -c 'echo hello >/data.txt'
docker start writable-demo
docker exec writable-demo cat /data.txt
```

停止再启动同一个容器，文件仍在。

因为可写层尚未删除。

```bash
docker rm writable-demo
```

删除容器后，可写层通常被删除。

重新从同一镜像创建新容器不会恢复该文件。

“容器停止数据还在”不等于“数据已持久化”。

## 10. mount 如何遮蔽原有内容

把 mount 挂到容器已有非空目录，挂载内容会遮蔽原目录。

例如镜像中 `/app/config/default.yml` 已存在：

```bash
docker run --mount type=bind,src=/host/empty,dst=/app/config image-name
```

容器看到的是 `/host/empty` 内容。

原镜像文件没有被删除，只是在该 mount namespace 中被遮蔽。

移除 mount 或创建不带挂载的新容器时仍可见。

这是“挂载后文件消失”的最常见原因之一。

## 11. volume

volume 是由 Docker 管理生命周期和挂载位置的数据对象。

创建：

```bash
docker volume create app-data
```

使用：

```bash
docker run --mount type=volume,src=app-data,dst=/var/lib/app image-name
```

查看：

```bash
docker volume inspect app-data
docker volume ls
```

删除容器不会默认删除命名 volume。

```bash
docker rm container-name
docker volume inspect app-data
```

volume 适合：

- 数据库数据。
- 应用持久状态。
- 独立备份与迁移。
- 容器之间明确共享的数据。

## 12. local volume driver 不等于远程存储

默认 `local` driver 通常在 Docker host 管理本地 volume。

“local”也可以结合 driver options 挂载 NFS 等文件系统。

但这依赖宿主内核挂载能力和配置。

第三方 volume plugins 可接入云盘、网络存储等。

使用远程存储时必须考虑：

- 一致性语义。
- 文件锁。
- 单写/多写能力。
- 延迟与故障恢复。
- 凭据管理。
- plugin 生命周期。

Docker 成功 mount 不代表应用层分布式写入一定安全。

## 13. volume 的初始化复制行为

将新的空 volume 挂到镜像中已有文件的目录时，Docker 对普通 volume 可能把该目录现有内容复制到 volume。

这常用于初始化默认数据。

```text
image /var/lib/app contains seed files
          │ first use of empty volume
          ▼
volume receives seed files
```

可使用 `volume-nocopy` 关闭相应复制语义：

```bash
docker run --mount type=volume,src=app-data,dst=/var/lib/app,volume-nocopy image-name
```

具体适用格式和行为应以当前 Docker 文档为准。

bind mount 不提供同样的自动复制语义。

## 14. 匿名 volume

不指定 source 时可创建匿名 volume：

```bash
docker run --mount type=volume,dst=/data image-name
```

它会有随机/自动生成名称。

匿名 volume 仍是独立 Docker volume 对象。

容器删除后是否自动清理取决于创建和删除选项。

```bash
docker run --rm -v /data image-name
```

`--rm` 对匿名 volume 的处理与命名 volume 不同。

应检查当前 CLI 文档，不要依靠记忆进行数据清理。

## 15. bind mount

bind mount 将宿主路径直接挂进容器 mount namespace。

```bash
docker run --mount \
  type=bind,src=/srv/config,dst=/etc/app,readonly \
  image-name
```

特点：

- 源路径由宿主管理员决定。
- 容器与宿主直接操作同一文件对象。
- 可访问范围取决于 mount 和安全策略。
- 强依赖宿主目录结构。
- 迁移到另一主机时路径必须存在并兼容。

适合：

- 开发源码挂载。
- 注入宿主管理的配置。
- 明确的日志交换目录。
- 需要与宿主工具协作的数据。

## 16. `--mount` 与 `-v`

两者都可声明挂载。

`--mount` 更显式：

```bash
docker run --mount type=bind,src=/host/path,dst=/container/path,readonly image
```

`-v` 更短：

```bash
docker run -v /host/path:/container/path:ro image
```

一个重要差异是宿主 source 不存在时的处理。

`--mount type=bind` 通常报错。

`-v` 的短语法在部分场景会自动创建目录。

这可能掩盖路径拼写错误。

脚本和生产声明通常优先使用 `--mount`。

## 17. bind mount 权限

容器内进程最终仍以某个 UID/GID 访问宿主 inode。

名称不重要，数值 ID 才参与 Linux DAC 权限检查。

```bash
docker run --rm --user 1000:1000 \
  --mount type=bind,src=/srv/data,dst=/data \
  image-name
```

宿主 `/srv/data` 需要允许对应映射后的身份访问。

还可能受到：

- user namespace remapping。
- rootless ID mapping。
- SELinux label。
- AppArmor。
- ACL。
- Desktop 文件共享翻译。

遇到 `Permission denied` 时，不要先 `chmod -R 777`。

应逐层确认身份和策略。

## 18. bind mount 的安全风险

可写 bind mount 让容器直接修改宿主路径。

高风险目标包括：

- `/`。
- `/etc`。
- `/proc`、`/sys`。
- Docker socket。
- SSH key 与云凭据目录。
- 宿主二进制和服务配置。

能只读就使用 `readonly`：

```bash
docker run --mount type=bind,src=/srv/config,dst=/config,readonly image-name
```

但只读 bind mount 不一定防止通过其他高权限接口修改宿主。

必须与 capabilities、seccomp 和最小用户权限配合。

## 19. mount propagation

bind mount 的 propagation 决定子挂载事件是否跨 mount namespaces 传播。

常见模式：

- `rprivate`：递归私有，常见默认。
- `rshared`：双向传播。
- `rslave`：从主挂载接收但不反向传播。

示意：

```text
host /mnt
  └── later mounts /mnt/disk
             │
             ├─ rprivate: container may not see new submount
             └─ rslave/rshared: may propagate according to mode
```

这主要用于嵌套容器、存储插件和挂载管理器。

普通应用不应为了“试试看”启用 shared propagation。

## 20. recursive read-only

只读 bind mount 对已有或后续子挂载的只读效果，受 recursive read-only 支持、kernel 版本和 propagation 影响。

现代 Docker 提供相关控制能力，但并非所有 kernel 都支持同样语义。

安全敏感场景应实测：

```bash
docker inspect container-name --format '{{json .Mounts}}'
```

并在容器中尝试写目标与子挂载。

不要仅看到顶层 `ro` 就假设所有嵌套 mount 都不可写。

## 21. tmpfs mount

tmpfs 使用内存支持的 Linux 文件系统。

```bash
docker run --mount type=tmpfs,dst=/run/app,tmpfs-size=67108864 image-name
```

或：

```bash
docker run --tmpfs /run/app:rw,noexec,nosuid,size=64m image-name
```

特点：

- 容器停止/删除后内容不持久。
- 不进入镜像层。
- 适合临时 token、socket、PID 文件和短期缓存。
- 消耗内存资源。
- 是否可能进入 swap 取决于宿主配置与内核行为。

敏感数据使用 tmpfs 仍要考虑 core dump、日志和应用复制。

## 22. volume、bind、tmpfs 对比

| 维度 | volume | bind mount | tmpfs |
| --- | --- | --- | --- |
| 管理者 | Docker/driver | 宿主用户 | kernel + Docker |
| 生命周期 | 独立于容器 | 独立于容器 | 临时 |
| 宿主路径依赖 | 低 | 高 | 无持久路径 |
| 适合持久数据 | 是 | 可，但需自行管理 | 否 |
| Desktop 跨 VM | 通常 VM 内 | 常需文件共享 | VM 内存 |
| 迁移性 | 较好，取决于 driver | 较差 | 不适用 |
| 典型用途 | 数据库、应用状态 | 源码、配置 | secret、临时文件 |

“volume 一定更快”不是跨平台绝对规律。

性能要按 workload、driver、VM 和底层存储验证。

## 23. Desktop 文件共享

Desktop bind mount 需要跨越宿主 OS 和 Linux VM。

这带来额外问题：

- 大量小文件 metadata 操作较慢。
- 文件事件传播可能不同。
- 大小写敏感性不一致。
- UID/GID 与 ACL 需要翻译。
- symlink 和特殊文件可能受限制。
- 宿主路径必须在允许共享范围。

开发优化思路：

- 源码 bind mount，依赖目录放 named volume。
- 避免把超大依赖树在 VM 边界频繁扫描。
- 使用 Desktop 提供的同步或文件共享优化能力。
- 以 Desktop 4.85.0 当前设置与文档为准。

不要把过时的某个文件共享后端名称当作永久实现。

## 24. 数据库为什么优先 volume

数据库需要稳定的：

- fsync/durability 语义。
- 文件锁。
- rename 原子性。
- 权限与 ownership。
- 容量和 inode。
- 备份一致性。

named volume 降低宿主路径耦合，并避开容器可写层 copy-up。

但 volume 不是自动备份。

也不保证远程存储满足数据库持久性要求。

必须使用数据库官方支持的文件系统和备份方法。

## 25. volume 备份原则

简单 tar 只能保证读取到一组文件。

它不自动保证运行中数据库的一致性。

应优先：

- 数据库原生逻辑备份。
- 数据库支持的物理备份工具。
- 应用 quiesce 后的存储快照。
- 经验证的恢复演练。

通用离线归档示例：

```bash
docker run --rm \
  --mount type=volume,src=app-data,dst=/source,readonly \
  --mount type=bind,src="$PWD",dst=/backup \
  alpine tar -C /source -czf /backup/app-data.tar.gz .
```

此命令对运行中数据库不自动一致。

恢复前还要验证所有权、xattr、ACL 和目标应用版本。

## 26. volume 删除与清理

查看引用：

```bash
docker volume ls
docker volume inspect app-data
docker ps -a --filter volume=app-data
```

删除：

```bash
docker volume rm app-data
```

清理未使用 volume：

```bash
docker volume prune
```

“未被容器引用”不代表“业务上无价值”。

停机迁移留下的 volume 也可能被判定未使用。

自动清理前需要外部资产和备份记录。

## 27. `VOLUME` Dockerfile 指令

```dockerfile
VOLUME /var/lib/app
```

它声明该路径应作为 volume 挂载点使用。

运行时未指定具体 volume 时，Docker 可能创建匿名 volume。

这容易留下难识别的数据卷。

`VOLUME` 不定义备份策略、容量、远程 driver 或命名规则。

是否在镜像中声明应结合应用部署方式。

## 28. secret 与 config 不应普通持久化

将 secret 放进镜像会永久进入内容层。

放在环境变量中也可能通过 inspect、进程环境或诊断输出泄露。

运行时应使用平台提供的 secrets 机制或受限只读文件。

单机 Docker 与 Swarm、Compose、Kubernetes 的 secret 语义不同。

不能只因都叫 secret 就假设加密、存储和挂载生命周期一致。

BuildKit build secret 只服务构建过程，也不等于运行时 secret。

## 29. 日志与可写层增长

应用写 `/var/log` 会进入可写层，除非该路径被挂载。

同时 Docker logging driver 还可能在容器外保存 stdout/stderr 日志。

这会产生两份不同日志通道。

推荐：

- 应用主要写 stdout/stderr。
- 配置日志 rotation 和 driver。
- 必须写文件时显式挂载并管理轮转。

查看空间：

```bash
docker ps --size
docker system df -v
docker inspect container-name --format '{{json .HostConfig.LogConfig}}'
```

## 30. inode、稀疏文件和 `df` 差异

空间问题不只有字节耗尽。

还可能是：

- inode 耗尽。
- 稀疏文件逻辑大小与实际块不同。
- deleted-but-open 文件仍占空间。
- volume 与 image store 在不同文件系统。
- Desktop 虚拟磁盘未及时回收宿主空间。
- shared layers 统计重复或去重。

Linux 观察：

```bash
df -h
df -i
du -xhs /path
lsof +L1
```

Docker data root 不应由 `rm` 手工清理。

使用 Docker 管理命令并先确认引用。

## 31. 挂载观察命令

Docker 视角：

```bash
docker inspect container-name --format '{{json .Mounts}}'
```

容器视角：

```bash
docker exec container-name cat /proc/self/mountinfo
docker exec container-name df -h
```

Linux 宿主 namespace 视角：

```bash
pid=$(docker inspect -f '{{.State.Pid}}' container-name)
sudo nsenter -t "$pid" -m findmnt
```

`findmnt` 是否安装取决于发行版。

三种视角合起来能定位挂载源、目标、只读属性和传播问题。

## 32. 常见误区

### 误区一：容器停了，可写层就消失

停止不等于删除。

删除容器才通常删除可写层。

### 误区二：volume 数据在镜像里

volume 是独立数据对象，不属于镜像 layer。

### 误区三：挂载到非空目录会合并两边文件

mount 通常遮蔽原目录内容，不做目录级智能合并。

### 误区四：bind mount 使用容器内用户名判断权限

Linux 权限主要看数值 UID/GID、ACL 和 LSM。

### 误区五：tmpfs 永远不会落盘

还要考虑 swap、core dump 和应用复制路径。

### 误区六：named volume 自带备份

volume 只提供生命周期和挂载管理。

备份与恢复需单独设计。

### 误区七：Desktop bind mount 就是原生 Linux mount

它通常跨文件共享和 VM 边界。

### 误区八：可以手动删除 data root 中的大目录

这会破坏 Engine/containerd 元数据与引用关系。

## 33. 最小实验

创建 volume：

```bash
docker volume create tutorial-data
```

写入：

```bash
docker run --rm \
  --mount type=volume,src=tutorial-data,dst=/data \
  alpine sh -c 'date >/data/created-at'
```

在另一个容器读取：

```bash
docker run --rm \
  --mount type=volume,src=tutorial-data,dst=/data,readonly \
  alpine cat /data/created-at
```

检查：

```bash
docker volume inspect tutorial-data
```

清理：

```bash
docker volume rm tutorial-data
```

这个实验表明数据生命周期独立于两个临时容器。

## 34. 选型清单

选择 volume，当：

- 需要持久数据。
- 不希望依赖固定宿主路径。
- 需要 Docker/driver 管理挂载。

选择 bind mount，当：

- 必须与宿主现有文件直接协作。
- 开发时需要实时编辑源码。
- 运维明确管理宿主路径。

选择 tmpfs，当：

- 数据只应在运行期存在。
- 数据量可控。
- 应用可接受内存语义。

使用容器可写层，当：

- 数据是一次性临时状态。
- 容器删除时丢失完全可接受。
- 不需要独立备份和共享。

## 35. 总结

- 镜像层、容器可写层和 mount 具有不同生命周期。
- OverlayFS 通过 lower、upper、work 和 merged 提供联合视图。
- 修改 lower 文件通常触发 copy-up。
- containerd content store 与 snapshotter 分别管理内容和快照。
- containerd image store 与经典 `overlay2` 元数据模型不同。
- volume 由 Docker/driver 管理，适合持久状态。
- bind mount 直接暴露宿主路径，灵活但耦合和风险更高。
- tmpfs 适合临时数据，但仍需考虑内存与 swap。
- mount 会遮蔽目标路径原有内容。
- Desktop bind mount 跨 VM 文件共享边界，性能和权限需要单独验证。
- volume 不是备份，数据库备份必须保证应用一致性。
- 不要手工修改 Docker data root。

## 36. 官方资料

- Docker storage overview：https://docs.docker.com/engine/storage/
- Storage drivers：https://docs.docker.com/engine/storage/drivers/
- OverlayFS driver：https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- containerd image store：https://docs.docker.com/engine/storage/containerd/
- Docker volumes：https://docs.docker.com/engine/storage/volumes/
- Bind mounts：https://docs.docker.com/engine/storage/bind-mounts/
- tmpfs mounts：https://docs.docker.com/engine/storage/tmpfs/
- Linux OverlayFS：https://docs.kernel.org/filesystems/overlayfs.html
- OCI image layers：https://github.com/opencontainers/image-spec/blob/main/layer.md
