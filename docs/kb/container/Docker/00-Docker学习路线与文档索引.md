---
title: "Docker 学习路线与文档索引"
permalink: /kb/container/Docker/00-Docker学习路线与文档索引/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: false
knowledgeNote:
  series: "容器"
  group: "Docker"
---
> 本套教程更新时间为 **2026-08-04**。写作时最新稳定版为 Docker Engine **29.7.1**、Docker Desktop **4.85.0**。Docker 会持续更新，安装版本应以官方 release notes 为准，命令行为应以本机 `docker version` 和 `docker info` 输出为准。

## 这套教程解决什么问题

Docker 入门不难，难点通常是把零散命令连成完整知识体系：

1. 知道镜像、容器、网络和数据卷分别是什么。
2. 能把一个应用写成 Dockerfile 并构建镜像。
3. 能用 Compose 运行由多个服务组成的应用。
4. 遇到启动失败、网络不通、数据丢失时知道从哪里排查。
5. 理解 namespace、cgroup、OCI、containerd 和 runc 的作用。
6. 能优化镜像体积、构建速度、跨平台发布与供应链安全。

目录沿用三个分类：

| 分类 | 回答的问题 | 适合阶段 |
| --- | --- | --- |
| 使用教程 | Docker 怎么安装、运行和排错？ | 入门与日常开发 |
| 原理分析 | 命令背后发生了什么？ | 进阶与故障定位 |
| 镜像优化 | 如何构建得更快、更小、更安全？ | CI/CD 与生产实践 |

## 当前版本基线

本文档集使用现代 Docker 的默认能力：

- Docker Engine 29.x。
- Docker Desktop 4.x。
- BuildKit 是默认镜像构建后端。
- Compose 使用 CLI 插件命令 `docker compose`。
- Compose 文件采用 Compose Specification，不写已过时的顶层 `version`。
- Dockerfile 使用 `# syntax=docker/dockerfile:1` 获取稳定语法特性。
- 生产镜像使用明确版本或受控更新的 digest，不盲目依赖 `latest`。
- 容器间通信使用自定义网络及服务名 DNS，不使用旧式 `--link`。

检查自己的环境：

```bash
docker version
docker info
docker compose version
docker buildx version
docker context show
```

不要只看客户端版本。`docker version` 会分别显示 Client 和 Server；真正执行容器的是当前 context 指向的 Server。

## 推荐学习路线

### 第一阶段：先把 Docker 用起来

1. [Docker入门安装与环境检查](/kb/container/Docker/使用教程/01-Docker入门安装与环境检查/)
2. [镜像与容器常用命令](/kb/container/Docker/使用教程/02-镜像与容器常用命令/)
3. [端口网络与容器通信](/kb/container/Docker/使用教程/03-端口网络与容器通信/)
4. [数据卷与持久化](/kb/container/Docker/使用教程/04-数据卷与持久化/)

学完后应能独立完成：

- 安装 Docker Desktop 或 Docker Engine。
- 区分镜像与容器。
- 拉取镜像、运行容器、查看日志、进入容器和清理资源。
- 正确解释 `-p 8080:80` 中宿主机端口与容器端口的顺序。
- 使用自定义 bridge network 让容器通过名称互相访问。
- 判断数据应该放在 named volume、bind mount 还是容器可写层。

### 第二阶段：把自己的应用容器化

1. [Dockerfile从零构建镜像](/kb/container/Docker/使用教程/05-Dockerfile从零构建镜像/)
2. [Docker Compose多容器应用](/kb/container/Docker/使用教程/06-Docker-Compose多容器应用/)
3. [日志调试资源限制与安全实践](/kb/container/Docker/使用教程/07-日志调试资源限制与安全实践/)

学完后应能独立完成：

- 为应用编写可维护的 Dockerfile。
- 理解 `RUN`、`COPY`、`CMD`、`ENTRYPOINT`、`USER` 和 `WORKDIR`。
- 使用 `docker compose up -d` 启动 Web、数据库和缓存服务。
- 使用 healthcheck、日志、inspect、stats 和 events 定位问题。
- 设置 CPU、内存、日志轮转和最小权限运行参数。

### 第三阶段：理解容器为什么能工作

1. [Docker整体架构与请求链路](/kb/container/Docker/原理分析/01-Docker整体架构与请求链路/)
2. [镜像分层容器可写层与OCI](/kb/container/Docker/原理分析/02-镜像分层容器可写层与OCI/)
3. [Namespace Cgroups与容器隔离](/kb/container/Docker/原理分析/03-Namespace-Cgroups与容器隔离/)
4. [Docker网络原理](/kb/container/Docker/原理分析/04-Docker网络原理/)
5. [Docker存储与挂载原理](/kb/container/Docker/原理分析/05-Docker存储与挂载原理/)
6. [BuildKit构建缓存与镜像分发](/kb/container/Docker/原理分析/06-BuildKit构建缓存与镜像分发/)

这部分不要求先背内核细节。阅读时始终围绕四个问题：

1. 这项能力由 Docker、runtime 还是 Linux 内核提供？
2. 它隔离的是什么，不能隔离的又是什么？
3. 可以用什么命令观察它？
4. 出问题时应该检查哪一层？

学完后应能解释：

- Docker CLI、dockerd、containerd、shim 和 runc 的分工。
- 镜像层、容器可写层、manifest、OCI index 和 digest 的关系。
- namespace 为什么提供“看起来独立”的环境。
- cgroup v2 如何限制和统计 CPU、内存与进程数。
- bridge、veth、路由、DNS 和端口发布如何配合。
- volume、bind mount、tmpfs 和联合文件系统的差别。
- BuildKit 为什么能并行构建并精确复用缓存。

### 第四阶段：优化构建与生产发布

1. [镜像体积优化与构建上下文](/kb/container/Docker/镜像优化/01-镜像体积优化与构建上下文/)
2. [多阶段构建实战](/kb/container/Docker/镜像优化/02-多阶段构建实战/)
3. [BuildKit缓存挂载与构建加速](/kb/container/Docker/镜像优化/03-BuildKit缓存挂载与构建加速/)
4. [多平台镜像与Buildx](/kb/container/Docker/镜像优化/04-多平台镜像与Buildx/)
5. [镜像安全供应链与生产检查清单](/kb/container/Docker/镜像优化/05-镜像安全供应链与生产检查清单/)

学完后应能完成：

- 用 `.dockerignore` 缩小构建上下文。
- 按变更频率排列 Dockerfile 指令，提高缓存命中率。
- 用多阶段构建把编译工具排除在运行镜像之外。
- 用 cache、secret 和 SSH mount 提升速度并避免凭据进入镜像层。
- 用 Buildx 构建 `linux/amd64` 与 `linux/arm64` 镜像。
- 生成并检查 provenance、SBOM 和漏洞扫描结果。
- 用 digest 将部署内容与经过审批的镜像精确对应。

## 按问题查文档

| 遇到的问题 | 优先阅读 |
| --- | --- |
| Docker 安装后命令连不上 daemon | [Docker入门安装与环境检查](/kb/container/Docker/使用教程/01-Docker入门安装与环境检查/) |
| 分不清 `run`、`start`、`exec` | [镜像与容器常用命令](/kb/container/Docker/使用教程/02-镜像与容器常用命令/) |
| 浏览器打不开容器服务 | [端口网络与容器通信](/kb/container/Docker/使用教程/03-端口网络与容器通信/) |
| 容器重建后数据消失 | [数据卷与持久化](/kb/container/Docker/使用教程/04-数据卷与持久化/) |
| 不知道如何编写 Dockerfile | [Dockerfile从零构建镜像](/kb/container/Docker/使用教程/05-Dockerfile从零构建镜像/) |
| 要同时启动应用、数据库和缓存 | [Docker Compose多容器应用](/kb/container/Docker/使用教程/06-Docker-Compose多容器应用/) |
| 容器退出、OOM 或权限不足 | [日志调试资源限制与安全实践](/kb/container/Docker/使用教程/07-日志调试资源限制与安全实践/) |
| 想理解 Docker 的组件关系 | [Docker整体架构与请求链路](/kb/container/Docker/原理分析/01-Docker整体架构与请求链路/) |
| 删除文件后镜像仍然很大 | [镜像分层容器可写层与OCI](/kb/container/Docker/原理分析/02-镜像分层容器可写层与OCI/) |
| 想理解容器隔离和资源限制 | [Namespace Cgroups与容器隔离](/kb/container/Docker/原理分析/03-Namespace-Cgroups与容器隔离/) |
| 想理解 bridge、veth 和端口映射 | [Docker网络原理](/kb/container/Docker/原理分析/04-Docker网络原理/) |
| bind mount 权限或性能异常 | [Docker存储与挂载原理](/kb/container/Docker/原理分析/05-Docker存储与挂载原理/) |
| 构建缓存命中行为不符合预期 | [BuildKit构建缓存与镜像分发](/kb/container/Docker/原理分析/06-BuildKit构建缓存与镜像分发/) |
| 镜像太大或构建上下文太大 | [镜像体积优化与构建上下文](/kb/container/Docker/镜像优化/01-镜像体积优化与构建上下文/) |
| 最终镜像包含编译器和源代码 | [多阶段构建实战](/kb/container/Docker/镜像优化/02-多阶段构建实战/) |
| CI 每次都重新下载依赖 | [BuildKit缓存挂载与构建加速](/kb/container/Docker/镜像优化/03-BuildKit缓存挂载与构建加速/) |
| Apple Silicon 与 x86 服务器架构不一致 | [多平台镜像与Buildx](/kb/container/Docker/镜像优化/04-多平台镜像与Buildx/) |
| 需要漏洞扫描、SBOM 和发布门禁 | [镜像安全供应链与生产检查清单](/kb/container/Docker/镜像优化/05-镜像安全供应链与生产检查清单/) |

## 现代 Docker 与旧教程的常见差异

| 旧教程中常见内容 | 当前建议 |
| --- | --- |
| `docker-compose up` | 使用 `docker compose up` |
| Compose 顶层 `version: "3"` | 删除顶层 `version`，使用 Compose Specification |
| 关闭 BuildKit 后使用 legacy builder | 保持 BuildKit，排查真实兼容问题 |
| 用 `--link` 连接容器 | 使用自定义网络和内置 DNS |
| 把 `EXPOSE` 当作端口发布 | `EXPOSE` 只是镜像元数据，使用 `-p` 或 Compose `ports` 发布 |
| 所有镜像都写 `:latest` | 开发可按需使用，生产采用明确 tag 和受控 digest |
| 用 `ARG`、`ENV` 传构建密钥 | 使用 BuildKit secret 或 SSH mount |
| 一个镜像既编译又运行 | 优先使用多阶段构建分离 build 与 runtime |
| 默认以 root 运行 | 在镜像中创建并切换到非 root 用户 |
| 只关心镜像体积 | 同时衡量安全、缓存、可维护性和可重复构建 |

## 建议的练习项目

选择一个简单 HTTP API，按以下顺序练习：

1. 本地运行 API，明确启动命令和监听端口。
2. 编写 Dockerfile，构建带明确 tag 的镜像。
3. 用 `docker run` 发布端口并验证健康接口。
4. 添加数据库，用 named volume 保存数据。
5. 用 Compose 管理 API 和数据库。
6. 为服务添加 healthcheck 和资源限制。
7. 改造成多阶段构建并比较镜像大小。
8. 在 BuildKit 中添加依赖 cache mount。
9. 构建 amd64 与 arm64 多平台镜像。
10. 在 CI 中执行测试、SBOM、漏洞扫描并按 digest 发布。

每次练习都记录四类证据：

```bash
docker compose config
docker compose ps
docker image history your-image:tag
docker inspect your-container
```

能解释命令输出，比记住更多命令更重要。

## 生产前总原则

- 镜像是交付物，不是数据盘。
- 容器是可替换实例，不应依赖手工进入容器修改状态。
- 配置与密钥不要烘焙进镜像。
- 只发布真正需要对外访问的端口。
- 明确 CPU、内存、进程数和日志上限。
- 使用可信基础镜像，并定期重建以获取安全修复。
- 以非 root 用户运行，按需收紧 capabilities 和只读文件系统。
- 让 CI 产生可追溯的镜像、测试结果、SBOM 和 provenance。
- 部署时记录 digest，确保运行内容与审批内容一致。
- Docker socket 等价于高权限控制面，不应随意挂载进容器。

## 官方资料

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Engine release notes](https://docs.docker.com/engine/release-notes/)
- [Docker Desktop release notes](https://docs.docker.com/desktop/release-notes/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Compose Specification](https://docs.docker.com/compose/compose-file/)
- [BuildKit](https://docs.docker.com/build/buildkit/)
- [OCI Specifications](https://github.com/opencontainers)

版本号帮助确认语境，官方文档帮助核对变化；真正可靠的依据仍是目标环境中的命令输出、测试结果和运行观测。
