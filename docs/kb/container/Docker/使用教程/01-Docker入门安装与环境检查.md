---
title: "Docker 入门：安装与环境检查"
permalink: /kb/container/Docker/使用教程/01-Docker入门安装与环境检查/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "镜像与容器常用命令", link: /kb/container/Docker/使用教程/02-镜像与容器常用命令/ }
knowledgeNote:
  series: "容器"
  group: "使用教程"
---
> 本文更新时间：2026-08-04。此时最新稳定版 Docker Engine 为 **29.7.1**，Docker Desktop 为 **4.85.0**。版本会继续更新，安装时应以官方发布页为准。

Docker 最适合解决这样一个问题：同一份应用，如何在开发机、测试机和服务器上获得尽可能一致的运行环境？

它把应用、运行时和依赖打包成**镜像**，再由镜像创建相互隔离的**容器**。

## 1. 先建立正确心智模型

| 概念 | 直观理解 | 典型命令 |
| --- | --- | --- |
| Dockerfile | 构建镜像的配方 | `docker build` |
| 镜像 Image | 只读应用模板 | `docker image ls` |
| 容器 Container | 镜像的一次运行实例 | `docker run` |
| 仓库 Registry | 存放和分发镜像的服务 | `docker pull` |
| 数据卷 Volume | 独立于容器生命周期的数据 | `docker volume ls` |
| 网络 Network | 容器通信边界和 DNS 环境 | `docker network ls` |

镜像与容器的关系类似于“程序安装包”和“运行中的进程”，但并不完全等同：

- 一个镜像可以创建多个容器。
- 删除容器不会删除镜像。
- 容器可写层默认随容器一起删除。
- 重要数据应写入 volume 或明确的 bind mount。
- 容器共享宿主机内核，不是完整虚拟机。

::: important
容器隔离不是绝对安全边界。镜像来源、权限、内核、挂载和 Docker daemon 权限都需要认真管理。
:::

## 2. Docker Engine 与 Docker Desktop 怎么选

### Linux 服务器

通常安装 Docker Engine：

- Docker daemon 负责镜像、容器、网络和存储。
- Docker CLI 向 daemon 发送请求。
- Compose 插件提供 `docker compose`。
- BuildKit 是现代 Docker 的默认构建后端。

### macOS 与 Windows 开发机

通常安装 Docker Desktop。Linux 容器依赖 Linux 内核，因此 Desktop 会管理一个轻量 Linux 虚拟机。

这解释了几个常见现象：

- 容器看到的不是 macOS 或 Windows 内核。
- bind mount 跨越宿主机与虚拟机边界，性能可能不同。
- Desktop 的 CPU、内存和磁盘额度会影响全部容器。
- `host.docker.internal` 可用于从容器访问宿主机服务。

::: note
企业使用 Docker Desktop 前应检查许可条款。Docker Engine 与 Docker Desktop 不是同一个授权产品。
:::

## 3. 安装前检查

### 检查 CPU 架构

Linux/macOS：

```bash
uname -m
```

常见输出：

| 输出 | Docker 平台名称 |
| --- | --- |
| `x86_64` | `linux/amd64` |
| `aarch64`、Apple Silicon 的 `arm64` | `linux/arm64` |

Windows PowerShell：

```powershell
[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
```

拉取镜像前确认其支持目标平台。跨架构模拟通常能运行，但构建和执行会更慢。

### 检查虚拟化

- macOS：使用受支持的 macOS 版本，Apple Silicon 或支持虚拟化的 Intel Mac。
- Windows：启用 WSL 2 或 Hyper-V，具体取决于 Desktop 后端。
- Linux 虚拟机：云厂商通常已经提供所需能力。

## 4. macOS 安装 Docker Desktop

1. 从官方页面下载与芯片匹配的安装包。
2. 安装并启动 Docker Desktop。
3. 等待状态显示 Engine 正常运行。
4. 打开终端验证 CLI 与 daemon。

```bash
docker version
docker info
docker compose version
docker buildx version
```

若使用 Homebrew，可安装官方 cask：

```bash
brew install --cask docker
```

安装 cask 后仍需启动 Docker Desktop 应用，单有 CLI 不能运行容器。

## 5. Windows 安装 Docker Desktop

推荐使用 WSL 2 后端：

1. 以管理员身份启用或安装 WSL。
2. 安装受支持的 Linux 发行版。
3. 安装 Docker Desktop。
4. 在设置中启用 WSL 2 engine 与目标发行版集成。

PowerShell 检查：

```powershell
wsl --status
wsl --version
docker version
docker compose version
```

项目文件放在 WSL Linux 文件系统中，通常比从 `/mnt/c` bind mount 获得更好的 Linux 工具链性能。

## 6. Ubuntu 安装 Docker Engine

以下展示官方 APT 仓库的标准思路。发行版代号和包名可能随时间变化，执行前对照官方 Ubuntu 安装页。

### 删除冲突包

```bash
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
  sudo apt-get remove -y "$pkg"
done
```

### 配置官方仓库

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

### 安装 Engine 与插件

```bash
sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

如需严格安装 29.7.1，应先查看仓库提供的完整版本字符串：

```bash
apt-cache madison docker-ce
```

再按官方页面给出的格式锁定 `docker-ce` 与 `docker-ce-cli`。不要猜测发行版后缀。

### 启动并检查服务

```bash
sudo systemctl enable --now docker
sudo systemctl status docker --no-pager
sudo docker run --rm hello-world
```

## 7. Linux 非 root 使用 Docker

可以把用户加入 `docker` 组：

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker run --rm hello-world
```

::: warning
`docker` 组近似拥有宿主机 root 权限。能控制 daemon 的用户可挂载宿主机文件系统并启动特权容器。多用户主机应优先评估 rootless mode，而不是把所有用户加入该组。
:::

若此前使用 `sudo docker` 导致配置目录归 root 所有：

```bash
sudo chown -R "$USER":"$USER" "$HOME/.docker"
sudo chmod -R g+rwx "$HOME/.docker"
```

Rootless mode 的适用边界：

- 降低 daemon 和容器获得宿主机 root 的风险。
- 网络、低端口、cgroup 和部分存储驱动能力可能受环境限制。
- 应按官方 rootless 文档安装，不要与系统级 daemon 混用 context。

## 8. 一套完整环境检查

### 客户端与服务端

```bash
docker version
```

输出分为 Client 和 Server。只有 Client 往往表示 CLI 已安装，但 daemon 未启动或不可访问。

```bash
docker info
```

重点观察：

- `Server Version`
- `Storage Driver`
- `Cgroup Driver` 与版本
- `Docker Root Dir`
- `CPUs`、`Total Memory`
- `Security Options`
- 当前 context

### Compose 与 Buildx

```bash
docker compose version
docker buildx version
docker buildx ls
```

本教程只使用 Compose v2 命令：

```bash
docker compose up
```

不使用旧式独立二进制：

```text
docker-compose up
```

### 运行最小容器

```bash
docker run --rm hello-world
```

这个命令会：

1. 检查本地是否有镜像。
2. 必要时从 registry 拉取镜像。
3. 创建容器。
4. 启动容器并输出文本。
5. 容器退出后由 `--rm` 自动删除。

再测试交互式 Linux：

```bash
docker run --rm -it alpine:3.22 sh
```

容器内执行：

```sh
cat /etc/os-release
id
uname -a
exit
```

`uname` 显示宿主侧 Linux 内核，而 `/etc/os-release` 显示镜像用户空间。这正是容器与虚拟机的重要区别。

## 9. Context：确认命令发给谁

```bash
docker context ls
docker context show
```

Docker Desktop、rootless daemon 和远程服务器可能各自创建 context。排障时先确认当前 context，避免删除或启动了错误环境中的容器。

切换示例：

```bash
docker context use default
```

生产环境不建议长期通过裸露 TCP socket 暴露 daemon。远程访问优先使用 SSH context，并遵循最小权限原则。

## 10. 第一个可观察的 Web 容器

```bash
docker run --name web-demo \
  --detach \
  --publish 127.0.0.1:8080:80 \
  nginx:1.28-alpine
```

访问：

```bash
curl http://127.0.0.1:8080
```

查看状态和日志：

```bash
docker ps
docker logs web-demo
docker inspect web-demo
```

停止并删除：

```bash
docker stop web-demo
docker rm web-demo
```

端口格式是：

```text
宿主机地址:宿主机端口:容器端口
127.0.0.1:8080:80
```

这里浏览器连接宿主机 `8080`，Docker 转发到容器 `80`。绑定 `127.0.0.1` 只允许本机访问；省略地址常常会监听所有接口，可能意外暴露服务。

## 11. 常见故障

### `Cannot connect to the Docker daemon`

依次检查：

```bash
docker context show
docker version
```

Linux 再检查：

```bash
sudo systemctl status docker --no-pager
sudo journalctl -u docker --since "10 minutes ago" --no-pager
```

可能原因：daemon 未启动、context 错误、socket 权限错误、`DOCKER_HOST` 指向旧地址。

```bash
env | grep '^DOCKER_'
```

### `permission denied` 访问 socket

- 临时使用 `sudo` 验证是否为权限问题。
- 正确配置 `docker` 组后重新登录。
- 或采用 rootless mode。
- 不要把 `/var/run/docker.sock` 粗暴改成全员可写。

### 拉取超时或证书错误

- 检查系统时间、DNS、代理和企业 CA。
- 在 daemon/Desktop 中配置代理，而不只是给当前 shell 配置代理。
- 不要用关闭 TLS 校验掩盖证书问题。

### `port is already allocated`

更换宿主机端口：

```bash
docker run --rm -p 127.0.0.1:8081:80 nginx:1.28-alpine
```

容器端口仍是 `80`，只改变左侧宿主机端口。

### 磁盘空间持续减少

先看占用，不要直接删除：

```bash
docker system df
docker system df --verbose
```

清理命令可能删除可复用缓存或未使用资源，应先理解其范围。不要在不确认数据归属时执行带 `--volumes` 的 prune。

## 12. 版本与升级策略

- 开发机可以及时跟进稳定版。
- 生产环境先在测试环境验证升级。
- 记录 Engine、containerd、Compose 和 Buildx 版本。
- 阅读 release notes 和已知问题。
- 镜像使用明确版本或 digest，不把可变的 `latest` 当生产发布策略。
- 重要主机升级前确认 volume、外部数据库和配置备份。

截至本文日期的版本基线：

| 组件 | 最新稳定版 |
| --- | --- |
| Docker Engine | 29.7.1 |
| Docker Desktop | 4.85.0 |

版本号只是环境事实，不代表所有生产系统必须当天升级。补丁版本通常应积极评估，主版本升级则需要兼容性测试。

## 13. 学完自检

- [ ] 能解释镜像和容器的区别。
- [ ] 知道 Engine 与 Desktop 的适用平台。
- [ ] `docker version` 同时显示 Client 与 Server。
- [ ] `docker compose version` 可正常执行。
- [ ] `docker buildx ls` 能看到可用 builder。
- [ ] 能运行并清理 `hello-world`。
- [ ] 知道当前 Docker context 指向哪里。
- [ ] 理解 `docker` 组近似 root 权限。
- [ ] 能解释 `127.0.0.1:8080:80` 的顺序。
- [ ] 不会把 `latest` 当作生产版本固定方案。

## 14. 练习

1. 运行 `alpine:3.22`，输出 `/etc/os-release` 后自动删除容器。
2. 启动 Nginx，将宿主机 `8088` 映射到容器 `80`，只允许本机访问。
3. 分别用 `docker ps` 和 `docker ps -a` 观察运行中与已停止容器。
4. 用 `docker inspect` 找到容器镜像 ID、IP 地址和挂载信息。
5. 停止并删除实验容器，确认镜像仍然存在。

参考答案骨架：

```bash
docker run --rm alpine:3.22 cat /etc/os-release
docker run -d --name nginx-lab -p 127.0.0.1:8088:80 nginx:1.28-alpine
docker ps
docker inspect nginx-lab
docker rm -f nginx-lab
docker image ls nginx
```

## 15. 官方资料

- [Docker Engine 安装总览](https://docs.docker.com/engine/install/)
- [Ubuntu 安装 Docker Engine](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Desktop 安装](https://docs.docker.com/desktop/setup/install/)
- [Linux 安装后步骤](https://docs.docker.com/engine/install/linux-postinstall/)
- [Rootless mode](https://docs.docker.com/engine/security/rootless/)
- [Docker contexts](https://docs.docker.com/engine/manage-resources/contexts/)
- [Docker Engine release notes](https://docs.docker.com/engine/release-notes/)
- [Docker Desktop release notes](https://docs.docker.com/desktop/release-notes/)

下一篇：[镜像与容器常用命令](/kb/container/Docker/使用教程/02-镜像与容器常用命令/)
