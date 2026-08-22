---
title: "多平台镜像与 Buildx"
permalink: /kb/container/Docker/镜像优化/04-多平台镜像与Buildx/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "BuildKit 缓存挂载与构建加速", link: /kb/container/Docker/镜像优化/03-BuildKit缓存挂载与构建加速/ }
next: { text: "镜像安全供应链与生产检查清单", link: /kb/container/Docker/镜像优化/05-镜像安全供应链与生产检查清单/ }
knowledgeNote:
  series: "容器"
  group: "镜像优化"
---
## 本篇目标

同一个镜像名称可以支持多个操作系统和 CPU 架构。

本篇将解释：

- OCI image manifest 与 image index
- Buildx builder 的作用
- `--platform`、`--load` 和 `--push`
- QEMU、原生节点和交叉编译的取舍
- Go 与 Node 多平台构建
- tag、平台 digest 和 index digest 的关系
- 多平台发布的验证与 CI 门禁

本文版本背景为 2026-08-04：

- Docker Engine 29.7.1
- Docker Desktop 4.85.0
- BuildKit 默认启用
- Engine 29 和当前 Desktop 默认使用支持多平台的 containerd image store

升级自旧环境时仍应检查实际 image store 和 builder driver。

## 单平台镜像包含什么

单平台 OCI 镜像通常包含：

- image manifest
- image configuration
- 一组压缩层

manifest 描述 config 和 layers 的 digest。

configuration 描述架构、环境变量、入口和 rootfs 等信息。

## 多平台镜像包含什么

多平台镜像入口通常是 OCI image index。

Docker 生态也常称其为 manifest list。

index 指向多个平台 manifest：

```text
image index
├── linux/amd64 manifest
├── linux/arm64 manifest
└── linux/arm/v7 manifest
```

客户端拉取时根据主机平台选择匹配项。

同一个 tag 因此能在 x86-64 和 ARM64 主机上运行。

容器仍共享主机内核。

多平台镜像不会让 Linux 容器原生变成 Windows 容器。

## 平台字符串

常见格式：

```text
linux/amd64
linux/arm64
linux/arm/v7
windows/amd64
```

结构为：

```text
OS/ARCH[/VARIANT]
```

确认本机信息：

```bash
docker info --format '{{.OSType}}/{{.Architecture}}'
docker version
```

查看 builder 支持的平台：

```bash
docker buildx ls
docker buildx inspect --bootstrap
```

## Buildx 是什么

Buildx 是 Docker CLI 的构建扩展。

它通过 BuildKit 提供：

- 多平台构建
- 多种输出 exporter
- 外部缓存
- 多节点 builder
- provenance 与 SBOM attestation
- bake 编排

查看版本：

```bash
docker buildx version
```

列出 builders：

```bash
docker buildx ls
```

## 创建独立 builder

```bash
docker buildx create \
  --name multiarch \
  --driver docker-container \
  --use \
  --bootstrap
```

检查：

```bash
docker buildx inspect multiarch --bootstrap
```

`docker-container` driver 在独立 BuildKit 容器中构建。

它适合多平台和高级缓存。

其结果通常不会自动进入 Engine 本地镜像存储。

因此需要显式 `--push`、`--load` 或其他输出。

## 第一次多平台构建

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.22
RUN uname -m > /architecture
CMD ["cat", "/architecture"]
```

构建并推送：

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/team/platform-demo:1.0.0 \
  --push .
```

多平台结果最自然的输出是 Registry。

Registry 保存 index 和各平台 manifest。

## `--load` 与 `--push`

单平台本地测试：

```bash
docker buildx build \
  --platform linux/amd64 \
  -t platform-demo:test \
  --load .
```

`--load` 是 `type=docker` 输出的简写。

多平台发布：

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/team/platform-demo:1.0.0 \
  --push .
```

`--push` 是 Registry exporter 的简写。

不要假设多平台构建后所有变体都能通过传统本地 image store 加载。

当前 containerd image store 支持多平台，但 builder driver 与输出仍决定行为。

## 检查远程 index

```bash
docker buildx imagetools inspect \
  registry.example.com/team/platform-demo:1.0.0
```

原始 JSON：

```bash
docker buildx imagetools inspect \
  --raw registry.example.com/team/platform-demo:1.0.0
```

也可使用：

```bash
docker manifest inspect \
  registry.example.com/team/platform-demo:1.0.0
```

重点检查：

- index media type
- 平台列表
- 每个平台的 digest
- annotation
- attestation manifest 是否存在

## 三种构建策略

多平台构建主要有三种策略：

1. QEMU 模拟
2. 多个原生节点
3. 语言级交叉编译

它们可组合使用。

## QEMU 模拟

QEMU 让 builder 执行其他架构的用户态程序。

Docker Desktop 通常已配置好模拟支持。

优点：

- Dockerfile 改动少
- 适用于许多通用构建
- 快速验证多平台兼容性

缺点：

- 编译和压缩可能明显变慢
- 某些系统调用或工具链行为存在差异
- 原生扩展构建更容易暴露问题

独立 Linux 环境必要时可注册 binfmt：

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

这是特权操作。

生产 CI 应控制执行主体，并固定、审查所用镜像。

## 多个原生节点

假设已有两个 Docker context：

```bash
docker buildx create --name native --use node-amd64
docker buildx create --name native --append node-arm64
docker buildx inspect native --bootstrap
```

随后构建：

```bash
docker buildx build \
  --builder native \
  --platform linux/amd64,linux/arm64 \
  -t registry.example.com/team/app:1.0.0 \
  --push .
```

优点：

- CPU 密集任务速度更好
- 行为更接近实际部署硬件
- 适合原生依赖

代价：

- 节点运维复杂
- 缓存与网络需要规划
- 工具链版本必须一致
- 节点信任边界扩大

## 交叉编译

BuildKit 提供预定义参数：

- `BUILDPLATFORM`
- `BUILDOS`
- `BUILDARCH`
- `BUILDVARIANT`
- `TARGETPLATFORM`
- `TARGETOS`
- `TARGETARCH`
- `TARGETVARIANT`

在 stage 内使用前要声明相关 `ARG`。

## Go 多平台交叉编译

```dockerfile
# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM golang:1.26-bookworm AS build
ARG TARGETOS
ARG TARGETARCH
ARG VERSION=dev
WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 \
    GOOS=$TARGETOS \
    GOARCH=$TARGETARCH \
    go build -trimpath \
      -ldflags="-s -w -X main.version=${VERSION}" \
      -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
USER nonroot:nonroot
ENTRYPOINT ["/api"]
```

关键点是 builder 固定到 `$BUILDPLATFORM`。

这样 Go 编译器原生运行，不经过 QEMU。

输出通过 `TARGETOS` 和 `TARGETARCH` 交叉编译。

构建：

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VERSION=1.4.0 \
  -t registry.example.com/team/go-api:1.4.0 \
  --push .
```

## Go 与 CGO

`CGO_ENABLED=0` 简化了交叉编译。

需要 CGO 时还要处理：

- 目标架构 C 编译器
- sysroot
- 目标共享库
- libc 类型
- 动态链接器路径

此时可选择：

- 每架构原生节点
- QEMU 中原生构建
- 专门的交叉工具链

不能只设置 `GOARCH` 就假设 CGO 可用。

## Node 多平台构建

Node 应用本身常是架构无关 JavaScript。

但 `node_modules` 可能包含原生扩展。

```dockerfile
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
ARG TARGETPLATFORM
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    echo "installing for ${TARGETPLATFORM}" \
    && npm ci
COPY . .
RUN npm run build \
    && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

这里没有固定 builder 到 `$BUILDPLATFORM`。

因此每个目标平台阶段通常在目标环境或模拟环境中执行 `npm ci`。

这样原生依赖更可能匹配目标架构。

代价是 QEMU 下安装和编译可能很慢。

高负载项目应考虑原生多节点。

## 不要错误交叉复制 `node_modules`

下面的思路有风险：

```dockerfile
FROM --platform=$BUILDPLATFORM node:24 AS build
RUN npm ci
```

如果随后把 build 平台的原生扩展复制到 target 平台，容器可能启动失败。

只有确认依赖全是架构无关内容时才可这样优化。

应通过依赖审计和逐平台运行测试证明它。

## Python 多平台注意事项

Python wheel 名称会声明平台与 ABI。

例如许多 wheel 区分：

- CPython 版本
- manylinux 兼容级别
- musllinux
- `x86_64`
- `aarch64`

在 amd64 builder 下载的二进制 wheel 不能直接复制给 arm64 runtime。

可让依赖安装在各目标平台执行。

也可由可信流水线预构建每个平台 wheelhouse。

## tag 与 digest

tag 可变：

```text
registry.example.com/team/app:1.4.0
```

推送多平台镜像后，该 tag 通常指向 index digest：

```text
registry.example.com/team/app@sha256:&lt;index-digest&gt;
```

index 内每个平台又有自己的 manifest digest。

部署按 index digest 固定，可保留平台自动选择能力。

部署按平台 manifest digest 固定，则只指向一个平台变体。

两者都比只保存 tag 更可审计。

查询：

```bash
docker buildx imagetools inspect registry.example.com/team/app:1.4.0
```

不要盲目部署 `latest`。

生产应由自动化 PR 受控更新基础镜像和部署 digest。

## 基础镜像 digest 与多平台

多平台基础镜像的 tag 通常指向 index。

Dockerfile 可以固定该 index digest：

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:&lt;reviewed-index-digest&gt;
```

BuildKit 根据目标平台选择 index 中对应 manifest。

更新 digest 时应确认目标平台仍完整存在。

不要只在 amd64 上验证后直接发布 arm64。

## 缓存的架构边界

多平台构建可共享与平台无关的缓存。

编译结果通常与架构相关。

BuildKit 会把平台纳入相关构建图。

显式 cache mount 的 `id` 仍需谨慎。

若工具不支持跨架构共享，使用平台隔离 id：

```dockerfile
ARG TARGETARCH
RUN --mount=type=cache,id=go-build-$TARGETARCH,target=/root/.cache/go-build \
    go build ./...
```

实际是否需要隔离取决于工具缓存格式。

## 多平台 CI 发布

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --pull \
  --cache-from type=registry,ref=registry.example.com/team/app:buildcache \
  --cache-to type=registry,ref=registry.example.com/team/app:buildcache,mode=max \
  --provenance=mode=max \
  --sbom=true \
  -t registry.example.com/team/app:"$VERSION" \
  -t registry.example.com/team/app:"$GIT_SHA" \
  --push .
```

标签应在同一次构建中指向同一输出。

推送后记录 index digest。

发布 job 应使用最小 Registry 权限。

## 分平台测试

构建前测试 target：

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --target test \
  --progress=plain .
```

推送后做运行测试：

```bash
docker run --rm --platform linux/amd64 \
  registry.example.com/team/app:1.4.0 /app --version

docker run --rm --platform linux/arm64 \
  registry.example.com/team/app:1.4.0 /app --version
```

在非原生平台上，这可能依赖模拟。

关键生产路径最好在原生节点测试。

## 使用 imagetools 创建 index

已有分平台镜像时可组合：

```bash
docker buildx imagetools create \
  -t registry.example.com/team/app:1.4.0 \
  registry.example.com/team/app:1.4.0-amd64 \
  registry.example.com/team/app:1.4.0-arm64
```

这不会重新构建镜像。

它创建指向已有 manifest 的新 index。

组合前必须确认各变体来自同一源码与等价流程。

否则一个 tag 会掩盖不可审计的差异。

## 常见失败模式

### 多平台构建仍使用 `--load`

发布多平台结果通常应 `--push`。

本地测试则按单个平台 `--load`。

### 在 QEMU 下做重型编译

功能可用不等于性能合适。

优先交叉编译或原生节点。

### 忘记 `$BUILDPLATFORM`

Go 交叉编译的 builder 若跟随目标平台，编译器仍会在 QEMU 中运行。

### 假设所有依赖架构无关

Node 原生模块和 Python wheel 是常见反例。

### 只验证 index 存在

index 正确不代表每个平台应用可启动。

必须做逐平台测试与扫描。

### 混用不一致的平台镜像

手工组合 index 时要验证源码 commit、版本、配置和 attestation。

## 检查清单

- [ ] 已确认目标 OS、ARCH 和 VARIANT
- [ ] builder 显示支持全部目标平台
- [ ] 已选择 QEMU、原生节点或交叉编译策略
- [ ] CPU 密集构建没有无评估地依赖 QEMU
- [ ] Go builder 使用 `$BUILDPLATFORM`
- [ ] Go CGO 依赖经过专项处理
- [ ] Node 原生扩展按目标平台安装
- [ ] Python wheel ABI 与目标平台一致
- [ ] 多平台发布使用 `--push`
- [ ] 单平台本地测试正确使用 `--load`
- [ ] 已检查远程 image index
- [ ] 已保存 index digest
- [ ] 已理解 index digest 与平台 digest 的区别
- [ ] 基础镜像按 digest 固定并受控更新
- [ ] 没有盲目依赖 `latest`
- [ ] 已逐平台运行测试
- [ ] 已逐平台扫描漏洞
- [ ] 缓存没有错误跨架构共享
- [ ] provenance 和 SBOM 与发布镜像一起推送
- [ ] Registry 支持 OCI index 和 attestation

## 官方资料

- [Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker Buildx](https://docs.docker.com/build/buildx/)
- [Build drivers](https://docs.docker.com/build/builders/drivers/)
- [Exporters](https://docs.docker.com/build/exporters/)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [Build attestations](https://docs.docker.com/build/metadata/attestations/)

## 小结

多平台镜像不是一个能在所有 CPU 上运行的单一二进制。

它通常是一个 index 加多套平台镜像。

Buildx 负责组织构建图、builder、输出、缓存和 attestation。

发布质量取决于每个平台都经过构建、运行、扫描和 digest 记录。
