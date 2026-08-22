---
title: "BuildKit 缓存挂载与构建加速"
permalink: /kb/container/Docker/镜像优化/03-BuildKit缓存挂载与构建加速/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "多阶段构建实战", link: /kb/container/Docker/镜像优化/02-多阶段构建实战/ }
next: { text: "多平台镜像与 Buildx", link: /kb/container/Docker/镜像优化/04-多平台镜像与Buildx/ }
knowledgeNote:
  series: "容器"
  group: "镜像优化"
---
## 本篇目标

构建加速不是简单地“开启缓存”。

真正需要回答的是：

- 哪些输入决定某一步的结果
- 哪些缓存可以跨构建复用
- 哪些缓存只能留在本地 builder
- 缓存是否可能包含凭据
- CI 中如何导入和导出缓存
- 如何避免速度优化破坏可重复性

本文版本背景为 2026-08-04：

- Docker Engine 29.7.1
- Docker Desktop 4.85.0
- BuildKit 已是默认构建后端
- 示例使用 `# syntax=docker/dockerfile:1`

## BuildKit 在缓存什么

Dockerfile 指令会形成有向无环构建图。

BuildKit 根据指令、相关文件和挂载等输入计算缓存键。

当缓存键和可复用结果匹配时，该步骤显示为 `CACHED`。

```bash
docker buildx build --progress=plain -t app:test --load .
```

第二次执行时可观察：

```text
=> CACHED [build 3/7] RUN npm ci
```

普通层缓存要求整个步骤结果可复用。

cache mount 则允许步骤重新执行时复用目录中的部分数据。

二者互补，不是替代关系。

## 缓存失效的基本规则

对 `COPY` 和 `ADD`，文件元数据与内容参与缓存判断。

文件修改时间本身通常不作为缓存校验依据。

对普通 `RUN`，命令字符串是重要输入。

BuildKit 不会自动理解远程包仓库已经更新。

例如：

```dockerfile
# syntax=docker/dockerfile:1
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y curl
```

即使 apt 仓库内容变化，已有层仍可能命中。

需要刷新基础镜像时使用：

```bash
docker buildx build --pull -t app:test --load .
```

需要诊断完整重建时使用：

```bash
docker buildx build --no-cache --pull -t app:test --load .
```

`--no-cache` 不应成为日常默认值。

## 依赖优先复制

低效 Node 示例：

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
```

任何源码变更都会使 `npm ci` 失效。

调整为：

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

现在依赖层只受 manifest 和 lockfile 影响。

同样原则适用于：

- Go 的 `go.mod` 与 `go.sum`
- Python 的锁定 requirements
- Rust 的 `Cargo.toml` 与 `Cargo.lock`
- Java 的 Maven/Gradle 描述文件
- .NET 的项目文件

## cache mount 的语义

cache mount 只在 `RUN` 执行期间挂载。

其内容不会自动进入最终镜像层。

```dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci
```

这意味着：

- 步骤命中普通层缓存时根本不会执行
- 步骤失效并重跑时仍可复用已下载包
- 缓存由 builder 管理
- 换 builder 后默认看不到旧缓存
- 缓存内容不应被视为最终产物

## Node 实战

```dockerfile
# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --omit=dev
COPY --from=build --chown=node:node /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]
```

`id` 让缓存名称更明确。

多个项目共用 builder 时可包含项目标识：

```dockerfile
RUN --mount=type=cache,id=my-api-npm,target=/root/.npm npm ci
```

不要让不兼容的工具版本误共享同一缓存。

## Go 实战

Go 通常有两个值得缓存的目录：

- 模块下载缓存 `/go/pkg/mod`
- 编译缓存 `/root/.cache/go-build`

```dockerfile
# syntax=docker/dockerfile:1

FROM golang:1.26-bookworm AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -o /out/api ./cmd/api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
USER nonroot:nonroot
ENTRYPOINT ["/api"]
```

模块下载和编译缓存不会进入最终镜像。

修改一个 Go 文件时，编译步骤会重跑，但可复用未变化包的编译结果。

## Python 实战

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.14-slim-bookworm AS build
WORKDIR /build
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip wheel --wheel-dir=/wheels -r requirements.txt

FROM python:3.14-slim-bookworm
WORKDIR /app
COPY --from=build /wheels /wheels
COPY requirements.txt ./
RUN python -m pip install \
      --no-cache-dir --no-index --find-links=/wheels \
      -r requirements.txt \
    && rm -rf /wheels
COPY src ./src
RUN useradd --uid 10001 --no-create-home app
USER 10001
CMD ["python", "-m", "src.app"]
```

builder 中 pip 下载缓存用于加速。

最终镜像使用 wheel，但不保留 pip 缓存。

缓存和运行时内容应分别设计。

## apt cache mount

apt 会并发写入索引和包缓存。

使用 `sharing=locked` 避免并行构建破坏缓存：

```dockerfile
# syntax=docker/dockerfile:1
FROM debian:bookworm-slim
RUN rm -f /etc/apt/apt.conf.d/docker-clean \
    && printf 'Binary::apt::APT::Keep-Downloaded-Packages "true";\n' \
       > /etc/apt/apt.conf.d/keep-cache
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends gcc
```

不同 Debian 镜像对 apt 缓存清理策略可能不同。

应检查基础镜像配置，而不是盲抄目录。

编译器应放在 builder 阶段。

## `sharing` 模式

cache mount 常用共享模式包括：

- `shared`：默认，多个 writer 可同时使用
- `private`：并行 writer 获得独立缓存
- `locked`：一个 writer 使用时其他 writer 等待

apt 推荐 `locked`。

其他包管理器是否需要锁，应根据其并发语义判断。

## bind mount 加速一次性输入

构建 bind mount 不会把输入写入镜像层：

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.26 AS build
WORKDIR /src
RUN --mount=type=bind,target=. \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -o /out/app ./cmd/app
```

bind mount 默认只读。

写入目标必须位于挂载目录之外。

这种方式适合只用于生成产物的大型源码输入。

如果后续步骤需要源码，仍应使用 `COPY`。

## secret mount

秘密不能通过 `ARG` 或 `ENV` 传递。

错误示例：

```dockerfile
ARG NPM_TOKEN
RUN npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
```

正确示例：

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    --mount=type=cache,target=/root/.npm \
    npm ci
```

构建：

```bash
docker buildx build \
  --secret id=npmrc,src="$HOME/.npmrc" \
  -t app:test --load .
```

也可从环境变量提供 secret：

```bash
docker buildx build --secret id=API_TOKEN,env=API_TOKEN .
```

Dockerfile 中默认挂载到 `/run/secrets/API_TOKEN`。

secret 内容不会直接进入缓存键。

秘密变化后，相关步骤可能仍命中旧缓存。

需要失效时传入非秘密版本参数：

```dockerfile
ARG CACHEBUST
RUN --mount=type=secret,id=API_TOKEN,required=true \
    some-private-fetch
```

```bash
docker buildx build \
  --secret id=API_TOKEN,env=API_TOKEN \
  --build-arg CACHEBUST=2026-08-04 .
```

## SSH mount

访问私有 Git 仓库时不要复制私钥。

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.22 AS source
RUN apk add --no-cache git openssh-client
RUN mkdir -p -m 0700 /root/.ssh \
    && ssh-keyscan github.com >> /root/.ssh/known_hosts
RUN --mount=type=ssh,required=true \
    git clone git@github.com:example/private-repo.git /src
```

构建：

```bash
docker buildx build --ssh default="$SSH_AUTH_SOCK" .
```

`ssh-keyscan` 示例需要在生产中验证 host key。

不能无条件信任网络返回的 key。

## CI 外部缓存

临时 CI runner 不保留本地 builder 缓存。

可将缓存导出到 Registry：

```bash
docker buildx build \
  --cache-from type=registry,ref=registry.example.com/team/app:buildcache \
  --cache-to type=registry,ref=registry.example.com/team/app:buildcache,mode=max \
  --pull \
  -t registry.example.com/team/app:"$GIT_SHA" \
  --push .
```

`mode=min` 通常只导出最终镜像路径所需缓存。

`mode=max` 会导出更多中间阶段缓存。

后者命中机会更多，也需要更多存储。

缓存引用最好与发布 tag 分离。

不要部署 `:buildcache`。

## OCI Registry 缓存注意事项

Registry 必须支持相关 OCI media types。

不同 Registry 的垃圾回收和保留策略不同。

需要确定：

- 缓存是否会被生命周期策略删除
- 并行分支是否覆盖同一引用
- 缓存仓库是否有独立权限
- 跨项目读取是否会泄露构建结果
- 存储成本是否可接受

分支缓存可使用独立引用：

```bash
--cache-to type=registry,ref=registry.example.com/team/app:cache-main,mode=max
```

不可信 PR 不应拥有覆盖主分支缓存的权限。

## 本地缓存导入导出

```bash
docker buildx build \
  --cache-from type=local,src=.buildx-cache \
  --cache-to type=local,dest=.buildx-cache-new,mode=max \
  -t app:test --load .
```

本地缓存目录不要加入构建上下文。

在 `.dockerignore` 中排除：

```dockerignore
.buildx-cache
.buildx-cache-new
```

CI 更适合 Registry 或平台原生缓存后端。

## 缓存不是可信输入

缓存能提高速度，但不应绕过验证。

发布流程仍应：

- 固定依赖版本
-验证 lockfile
- 运行测试
- 扫描最终镜像
- 记录 provenance
- 对不可信贡献隔离写权限

BuildKit 会校验缓存记录与内容关系。

但错误的权限模型仍可能让攻击者影响构建输入或缓存来源。

## 缓存观测与清理

查看 builders：

```bash
docker buildx ls
docker buildx inspect --bootstrap
```

查看缓存占用：

```bash
docker buildx du
docker system df -v
```

清理构建缓存：

```bash
docker buildx prune
```

自动化环境可按保留策略清理。

清理命令会影响后续构建速度。

执行前应确认 builder 是否共享。

## 如何测量优化效果

至少记录冷构建和热构建：

```bash
time docker buildx build --no-cache --progress=plain -t app:cold --load .
time docker buildx build --progress=plain -t app:warm --load .
```

再修改一个普通源码文件并重建。

最后修改 lockfile 并重建。

三种场景分别回答：

- 完全无缓存需要多久
- 源码迭代需要多久
- 依赖变化需要多久

不要只报告最快的一次。

## 常见失败优化

### 在 cache mount 中生成最终产物

cache mount 内容不保证被导出到镜像层。

最终产物应复制或写入普通文件系统路径。

### 所有项目共用同一个 cache id

版本、架构或权限不兼容时会产生冲突。

为关键缓存设置稳定且有边界的 `id`。

### 把 cache mount 当秘密存储

cache mount 可能持久化并被其他构建读取。

凭据必须使用 secret 或 SSH mount。

### CI 只导出缓存不导入

只有 `--cache-to` 不会加速当前构建。

下一次构建还必须配置对应 `--cache-from`。

### 缓存掩盖陈旧基础镜像

定期使用 `--pull`，并由受控流程更新 digest。

### `COPY . .` 放在依赖安装前

这会让大部分细粒度缓存设计失去意义。

## 检查清单

- [ ] 已使用 `--progress=plain` 观察缓存命中
- [ ] 依赖描述文件先于源码复制
- [ ] `.dockerignore` 排除了无关内容
- [ ] 包下载目录使用 cache mount
- [ ] 最终产物不只存在于 cache mount
- [ ] apt 缓存使用 `sharing=locked`
- [ ] 不兼容项目没有误共享 cache id
- [ ] 秘密使用 secret mount
- [ ] 私有 Git 访问使用 SSH mount
- [ ] `ARG` 和 `ENV` 中没有 token
- [ ] CI 同时配置 `--cache-from` 与 `--cache-to`
- [ ] 不可信 PR 无权覆盖可信缓存
- [ ] 已定义缓存保留和清理策略
- [ ] 已测量冷构建、热构建和源码变更构建
- [ ] 日常构建不滥用 `--no-cache`
- [ ] 定期使用 `--pull` 获取上游更新
- [ ] 生产基础镜像 digest 受控更新
- [ ] 缓存优化没有跳过测试与扫描

## 官方资料

- [Optimize cache usage](https://docs.docker.com/build/cache/optimize/)
- [Build cache invalidation](https://docs.docker.com/build/cache/invalidation/)
- [Cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Build secrets](https://docs.docker.com/build/building/secrets/)
- [Dockerfile `RUN --mount`](https://docs.docker.com/reference/dockerfile/#run---mount)
- [BuildKit](https://docs.docker.com/build/buildkit/)

## 小结

高效缓存来自清晰的输入边界。

依赖优先复制提高普通层缓存命中率。

cache mount 让失效步骤复用下载与编译数据。

secret 和 SSH mount 则让凭据不进入层和 Dockerfile 参数。

CI 还需要外部缓存、权限隔离和生命周期治理。
