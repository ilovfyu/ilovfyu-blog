---
title: "Dockerfile 从零构建镜像"
permalink: /kb/container/Docker/使用教程/05-Dockerfile从零构建镜像/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "数据卷与持久化", link: /kb/container/Docker/使用教程/04-数据卷与持久化/ }
next: { text: "Docker Compose 多容器应用", link: /kb/container/Docker/使用教程/06-Docker-Compose多容器应用/ }
knowledgeNote:
  series: "容器"
  group: "使用教程"
---
上一篇：[数据卷与持久化](/kb/container/Docker/使用教程/04-数据卷与持久化/)

Dockerfile 是可审查、可复现的镜像构建配方。现代 Docker 默认使用 BuildKit，本篇直接采用当前 Dockerfile frontend 与多阶段构建。

## 1. 构建上下文

```bash
docker build -t demo-app:0.1.0 .
```

最后的 `.` 是**构建上下文**，不是 Dockerfile 路径。Dockerfile 中的 `COPY` 只能读取上下文允许的文件。

指定其他 Dockerfile：

```bash
docker build -f docker/Dockerfile -t demo-app:0.1.0 .
```

减少上下文可提升速度并避免意外发送秘密。

## 2. 第一个完整项目

目录：

```text
demo-app/
├── .dockerignore
├── Dockerfile
├── package.json
└── server.js
```

`package.json`：

```json
{
  "name": "docker-demo-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=24"
  }
}
```

`server.js`：

```javascript
import http from "node:http";

const port = Number(process.env.PORT ?? 3000);
const server = http.createServer((request, response) => {
  const body = JSON.stringify({
    ok: true,
    path: request.url,
    hostname: process.env.HOSTNAME
  });

  response.writeHead(200, { "content-type": "application/json" });
  response.end(body);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`listening on 0.0.0.0:${port}`);
});

const shutdown = (signal) => {
  console.log(`received ${signal}`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

`Dockerfile`：

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24.6.0-alpine3.22

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package.json ./
COPY --chown=node:node server.js ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

`.dockerignore`：

```dockerignore
.git
.env
.env.*
node_modules
npm-debug.log*
coverage
Dockerfile*
compose*.yaml
README.md
```

构建：

```bash
docker build --pull -t demo-app:0.1.0 .
```

运行：

```bash
docker run --rm \
  --name demo-app \
  -p 127.0.0.1:3000:3000 \
  --read-only \
  --cap-drop ALL \
  demo-app:0.1.0
```

测试：

```bash
curl http://127.0.0.1:3000/health
```

## 3. 理解每条指令

### syntax directive

```dockerfile
# syntax=docker/dockerfile:1
```

它选择当前稳定 Dockerfile frontend，使 BuildKit 特性可明确解析。

### `FROM`

```dockerfile
FROM node:24.6.0-alpine3.22
```

选择基础镜像。原则：

- 优先 Docker Official Image 或可信发布者。
- 使用明确版本，不依赖未限定的 `latest`。
- 生产可固定 digest，并由自动化工具定期更新。
- 小镜像不必然更安全，仍需兼容性和漏洞评估。
- Alpine 使用 musl，某些原生依赖更适合 Debian slim。

### `WORKDIR`

```dockerfile
WORKDIR /app
```

为后续 `RUN`、`COPY`、`CMD` 设置工作目录。始终使用绝对路径。

### `COPY`

```dockerfile
COPY --chown=node:node server.js ./
```

从构建上下文复制文件并设置所有者。普通本地文件复制优先 `COPY`；只有确实需要 `ADD` 的自动解包、远程资源等能力时才使用 `ADD`。

### `ENV` 与 `ARG`

```dockerfile
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
```

- `ARG` 主要在构建期可用。
- `ENV` 会进入最终镜像和运行环境。
- 两者都不适合传递秘密。
- 构建秘密应使用 BuildKit secret mount。

### `USER`

```dockerfile
USER node
```

让运行进程默认非 root。切换前确保应用文件和必要写目录权限正确。

### `EXPOSE`

```dockerfile
EXPOSE 3000
```

只记录应用预期监听端口，**不会发布宿主机端口**。运行时仍需 `-p 127.0.0.1:3000:3000`。

### `CMD`

```dockerfile
CMD ["node", "server.js"]
```

使用 JSON exec form，让 Node 直接成为 PID 1 并正确接收信号。

## 4. Shell form 与 exec form

不推荐的服务入口：

```dockerfile
CMD node server.js
```

它通常经 `/bin/sh -c` 启动，信号和参数处理更复杂。

推荐：

```dockerfile
CMD ["node", "server.js"]
```

`RUN` 常用 shell form，因为需要管道和变量：

```dockerfile
RUN apk add --no-cache tini
```

入口命令优先 exec form。

## 5. `ENTRYPOINT` 与 `CMD`

适合命令行工具的组合：

```dockerfile
ENTRYPOINT ["mytool"]
CMD ["--help"]
```

运行：

```bash
docker run --rm mytool:1.0.0
docker run --rm mytool:1.0.0 scan /data
```

`ENTRYPOINT` 定义固定可执行文件，`CMD` 提供默认参数。不要为了“灵活”堆叠复杂 shell 脚本；需要脚本时结尾使用 `exec "$@"`，保证主进程接收信号。

## 6. 镜像层与缓存

Dockerfile 指令通常形成层。某一步输入变化，会使该步及后续缓存失效。

Node 项目应先复制依赖清单：

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
```

若先 `COPY . .`，任何源码变化都会让依赖安装重新执行。

查看构建过程：

```bash
docker build --progress=plain -t demo-app:0.1.0 .
```

关闭缓存只用于诊断或特定供应链刷新：

```bash
docker build --pull --no-cache -t demo-app:0.1.0 .
```

`--no-cache` 不代表自动拉取新基础镜像，因此需要时与 `--pull` 组合。

## 7. 多阶段构建

以 TypeScript/Node 应用为例：

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24.6.0-alpine3.22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24.6.0-alpine3.22 AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

优势：

- 编译器和开发依赖不进入运行镜像。
- 最终镜像更小，攻击面更低。
- 构建、测试和运行职责清晰。
- 可单独构建某一 stage。

```bash
docker build --target build -t demo-app-build:0.1.0 .
```

## 8. BuildKit cache mount

```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --requirement requirements.txt
```

缓存 mount 加速重复构建，但不会被复制进最终层。目标目录和共享模式要符合包管理器行为。

APT 示例：

```dockerfile
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update \
    && apt-get install -y --no-install-recommends curl
```

若不使用 cache mount，传统写法应在同一 `RUN` 中 update、install 并删除索引：

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
```

## 9. BuildKit secret mount

不要这样传 token：

```dockerfile
ARG NPM_TOKEN
RUN echo "$NPM_TOKEN" > /root/.npmrc
```

它可能泄漏到镜像历史、缓存或元数据。

正确思路：

```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci
```

构建时：

```bash
docker build \
  --secret id=npmrc,src="$HOME/.npmrc" \
  -t demo-app:0.1.0 .
```

Secret 只在该 `RUN` 步骤临时挂载，不进入最终镜像。构建命令和 CI 日志仍要避免泄漏路径或值。

## 10. SSH mount

构建需要访问私有 Git 仓库时，可转发 SSH agent：

```dockerfile
RUN --mount=type=ssh \
    git clone git@github.com:example/private-repo.git
```

```bash
docker build --ssh default -t demo-app:0.1.0 .
```

不要把私钥 `COPY` 进镜像。还需正确配置 `known_hosts`，不能用关闭主机验证换取便利。

## 11. `.dockerignore` 不是可选装饰

至少排除：

```dockerignore
.git
.env
.env.*
**/.DS_Store
**/node_modules
**/__pycache__
coverage
dist
*.log
```

不要无脑排除构建真正需要的 lockfile、源码或证书链。用：

```bash
docker build --progress=plain .
```

观察 context 大小和 `COPY` 失败位置。

## 12. 非 root 运行

Debian 基础镜像中创建固定用户：

```dockerfile
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app app

COPY --chown=app:app . /app
USER 10001:10001
```

固定 UID/GID 有利于部署时匹配 volume 权限。应用如需监听低端口，不要默认退回 root；可改用高端口并由反向代理发布。

## 13. 只读运行与临时目录

镜像设计应允许：

```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL \
  demo-app:0.1.0
```

应用写入点分类：

- 业务数据：named volume 或外部存储。
- 临时文件：受限 tmpfs。
- 日志：stdout/stderr。
- 配置：镜像或只读挂载。

## 14. 健康检查

Dockerfile 可定义：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "healthcheck.js"]
```

健康检查应：

- 快速、稳定、低资源消耗。
- 检查服务能否完成关键轻量操作。
- 有明确超时。
- 不因短暂外部依赖波动造成级联重启。
- 使用镜像中实际存在的工具。

健康状态不会自动修复应用；重启行为由运行平台决定。

## 15. 构建参数与多平台

查看 builder：

```bash
docker buildx ls
```

本地构建：

```bash
docker buildx build \
  --platform linux/amd64 \
  --load \
  -t demo-app:0.1.0 .
```

构建并推送多架构镜像：

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag registry.example.com/team/demo-app:0.1.0 \
  --push .
```

多平台构建需要可用 builder、registry 权限，且所有依赖支持目标架构。模拟构建可能很慢；CI 可使用原生架构 runner。

## 16. 镜像标签与可复现性

构建标签：

```bash
docker build \
  --label org.opencontainers.image.source=https://github.com/example/demo-app \
  --label org.opencontainers.image.revision="$GIT_COMMIT" \
  --tag demo-app:1.4.2 .
```

生产建议同时记录：

- 语义版本，如 `1.4.2`。
- 源码 commit。
- 构建时间和流水线。
- 基础镜像 digest。
- 最终镜像 digest。
- SBOM 和漏洞扫描结果。

tag 可变。要求强可复现部署时使用 registry 返回的 digest。

## 17. 检查与测试镜像

```bash
docker image inspect demo-app:0.1.0
docker image history demo-app:0.1.0
```

启动测试：

```bash
container_id=$(docker run -d \
  -p 127.0.0.1::3000 \
  --read-only \
  --cap-drop ALL \
  demo-app:0.1.0)
docker port "$container_id" 3000
docker logs "$container_id"
docker rm -f "$container_id"
```

CI 中至少验证：

- 进程能启动。
- 健康接口返回预期。
- 以非 root 用户运行。
- 只读文件系统约束下可运行。
- 无高危已知漏洞或有已批准例外。
- 不包含秘密和不需要的构建工具。

## 18. 常见构建错误

### `COPY failed` 或文件不存在

- 文件不在 build context。
- `.dockerignore` 排除了文件。
- 文件名大小写在 macOS 与 Linux 上行为不同。
- `-f` 改变了 Dockerfile，不会自动改变 context。

### 缓存没有按预期失效

包管理器下载外部内容时，仅命令文本未变化可能复用缓存。更新 lockfile、使用明确版本，并按需 `--pull` 或定期无缓存重建。

### 镜像异常大

- 编译工具进入最终 stage。
- 在某层创建大文件、后续层才删除。
- 复制了 `.git`、测试数据或本地依赖。
- 包管理器缓存未处理。

### 容器收不到停止信号

- 使用 shell form 启动服务。
- entrypoint 脚本没有 `exec`。
- 应用本身没有处理 `SIGTERM`。

### 构建时能用，运行时报权限错误

切换 `USER` 后文件所有者或运行目录不可写。用 `COPY --chown`，并只为必要路径提供写权限。

## 19. 反模式

- 在镜像中运行 SSH daemon 只为进入容器。
- 把密码、token、私钥写入 `ARG`、`ENV` 或 `COPY`。
- 使用无版本 `latest` 作为生产基础镜像。
- 一条镜像同时启动数据库、Web 和定时任务而无明确需要。
- 用 `chmod -R 777 /app` 解决权限问题。
- 每次启动容器才在线安装依赖。
- 用 `EXPOSE` 声称端口已经对外开放。
- 为方便调试永久保留编译器和 root 用户。

## 20. 发布前检查清单

- [ ] 基础镜像来自可信来源并明确版本。
- [ ] 使用多阶段构建隔离构建依赖。
- [ ] `.dockerignore` 排除了秘密和无关文件。
- [ ] 构建 secret 使用 BuildKit secret mount。
- [ ] 最终进程以非 root 用户运行。
- [ ] `CMD`/`ENTRYPOINT` 使用 exec form。
- [ ] 应用正确处理 `SIGTERM`。
- [ ] 根文件系统可按设计只读。
- [ ] 日志写 stdout/stderr。
- [ ] 镜像通过测试、扫描并记录 digest。
- [ ] 不把 `EXPOSE` 当端口发布。
- [ ] 不依赖 mutable `latest` 部署。

## 21. 练习

1. 构建本篇最小 Node 应用并访问健康路径。
2. 用 `docker history` 查看层。
3. 修改 `server.js` 后重建，观察缓存命中。
4. 改为非 root、只读根文件系统运行。
5. 给镜像添加 OCI source 和 revision label。
6. 尝试把 `.env` 放进目录，确认 `.dockerignore` 阻止复制。
7. 为熟悉的语言项目编写两阶段 Dockerfile。

## 22. 官方资料

- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Build with Docker](https://docs.docker.com/build/)
- [BuildKit](https://docs.docker.com/build/buildkit/)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Build secrets](https://docs.docker.com/build/building/secrets/)
- [Multi-platform builds](https://docs.docker.com/build/building/multi-platform/)

下一篇：[Docker Compose多容器应用](/kb/container/Docker/使用教程/06-Docker-Compose多容器应用/)
