---
title: "Docker Compose 多容器应用"
permalink: /kb/container/Docker/使用教程/06-Docker-Compose多容器应用/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Dockerfile 从零构建镜像", link: /kb/container/Docker/使用教程/05-Dockerfile从零构建镜像/ }
next: { text: "日志、调试、资源限制与安全实践", link: /kb/container/Docker/使用教程/07-日志调试资源限制与安全实践/ }
knowledgeNote:
  series: "容器"
  group: "使用教程"
---
上一篇：[Dockerfile从零构建镜像](/kb/container/Docker/使用教程/05-Dockerfile从零构建镜像/)

Compose 用一个声明式模型描述服务、网络、volume、配置和依赖关系。现代命令是 `docker compose`，文件遵循 Compose Specification，不需要顶层 `version`。

## 1. Compose 管理的不是“几条 run 命令”

Compose application model 包含：

- `services`：长期运行或一次性容器任务。
- `networks`：服务通信边界与 DNS。
- `volumes`：持久数据。
- `configs`：非敏感配置。
- `secrets`：敏感文件的声明与挂载。

Compose 会为资源增加项目维度，便于统一启动、查看和清理。

## 2. 文件名与基本命令

推荐文件名：

```text
compose.yaml
```

验证安装：

```bash
docker compose version
```

常用命令：

```bash
docker compose config
docker compose up -d
docker compose ps
docker compose logs -f
docker compose down
```

不要使用旧式：

```text
docker-compose
```

## 3. 最小 Compose 文件

```yaml
services:
  web:
    image: nginx:1.28-alpine
    ports:
      - "127.0.0.1:8080:80"
```

启动：

```bash
docker compose up -d
```

查看：

```bash
docker compose ps
docker compose logs web
curl http://127.0.0.1:8080
```

停止并移除服务容器和默认网络：

```bash
docker compose down
```

## 4. 完整三层应用示例

目录：

```text
compose-demo/
├── .env.example
├── compose.yaml
└── api/
    ├── Dockerfile
    ├── package.json
    └── server.js
```

`compose.yaml`：

```yaml
name: compose-demo

services:
  proxy:
    image: nginx:1.28-alpine
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      - type: bind
        source: ./nginx.conf
        target: /etc/nginx/conf.d/default.conf
        read_only: true
    depends_on:
      api:
        condition: service_healthy
    networks:
      - frontend
    read_only: true
    tmpfs:
      - /var/cache/nginx:size=64m
      - /var/run:size=16m
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    restart: unless-stopped

  api:
    build:
      context: ./api
      target: runtime
    image: compose-demo-api:1.0.0
    environment:
      NODE_ENV: production
      PORT: "3000"
      DATABASE_URL: postgresql://app:${POSTGRES_PASSWORD}@db:5432/app
    expose:
      - "3000"
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s
    networks:
      - frontend
      - backend
    read_only: true
    tmpfs:
      - /tmp:size=64m
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    mem_limit: 512m
    cpus: 1.0
    init: true
    restart: unless-stopped

  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}
    volumes:
      - type: volume
        source: postgres_data
        target: /var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    networks:
      - backend
    shm_size: 256m
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped

networks:
  frontend:
  backend:
    internal: true

volumes:
  postgres_data:
```

这个示例是架构骨架，`nginx.conf`、API 健康脚本和数据库连接重试必须与实际项目一致。

## 5. 不写顶层 `version`

旧教程常见：

```yaml
version: "3.8"
```

现代 Compose 使用统一 Compose Specification。顶层 `version` 已过时，不应继续添加。功能支持取决于实际 Compose 实现版本，可通过以下命令检查解析结果：

```bash
docker compose config
```

## 6. `image` 与 `build`

只拉取预构建镜像：

```yaml
services:
  api:
    image: registry.example.com/team/api:1.4.2
```

本地构建：

```yaml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
      target: runtime
    image: compose-demo-api:1.4.2
```

构建：

```bash
docker compose build --pull
docker compose up -d --build
```

生产应在 CI 构建、测试、扫描和推送，再由部署环境拉取固定版本或 digest，而不是在生产主机临时从源码构建。

## 7. 服务名就是 DNS 名

Compose 默认网络中：

```text
api -> db:5432
proxy -> api:3000
```

不能在 API 容器中使用 `localhost:5432` 访问数据库，因为 `localhost` 指 API 容器自己。

容器重建后 IP 可能变化，服务名保持稳定。不要保存容器 IP。

## 8. `ports`、`expose` 与容器端口

```yaml
ports:
  - "127.0.0.1:8080:80"
```

顺序是：宿主机 `8080` -> 容器 `80`。

```yaml
expose:
  - "3000"
```

`expose` 不发布宿主机端口，只表达容器端口。网络内服务通常可直接访问监听端口，即使不写 `expose`。

数据库没有 `ports`，因此不会通过宿主机接口暴露。API 通过 `db:5432` 访问它。

## 9. 环境变量插值

Compose 文件中的：

```yaml
environment:
  LOG_LEVEL: ${LOG_LEVEL:-info}
  API_TOKEN: ${API_TOKEN:?set API_TOKEN}
```

含义：

- `${LOG_LEVEL:-info}`：未设置或为空时使用 `info`。
- `${API_TOKEN:?set API_TOKEN}`：缺失时立即报错。

查看插值后的模型：

```bash
docker compose config
```

注意该输出可能包含敏感值，CI 日志中不要直接打印。

## 10. `.env` 与 `env_file` 不同

项目目录 `.env` 常用于 Compose 自身变量插值：

```dotenv
POSTGRES_PASSWORD=development-only-password
```

`env_file` 用于给容器设置环境变量：

```yaml
services:
  api:
    env_file:
      - ./api.env
```

两者职责不同。`.env` 不是 Secret vault，不应提交真实生产密码。

提供 `.env.example`：

```dotenv
POSTGRES_PASSWORD=replace-me
```

并在 `.gitignore` 排除真实 `.env`。

## 11. Secrets

本地 Compose 文件型 secret：

```yaml
services:
  app:
    image: registry.example.com/team/app:1.4.2
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

容器通常在 `/run/secrets/db_password` 读取。应用必须支持从文件读取，某些官方镜像提供 `_FILE` 环境变量约定。

文件型 secret 仍依赖宿主文件权限和部署流程。生产应结合目标平台的 secret manager，不要提交 secret 文件。

## 12. Configs

```yaml
services:
  app:
    image: registry.example.com/team/app:1.4.2
    configs:
      - source: app_config
        target: /app/config.yaml

configs:
  app_config:
    file: ./config/app.yaml
```

Configs 适合非敏感配置。敏感数据不要因为“都是文件”而混入 config。

## 13. Named volume

```yaml
services:
  db:
    image: postgres:18-alpine
    volumes:
      - postgres_data:/var/lib/postgresql

volumes:
  postgres_data:
```

查看实际名称：

```bash
docker compose volumes
docker volume ls
```

Compose 的 volume 独立于服务容器。`up --force-recreate` 不应删除它。

## 14. `depends_on` 不是万能就绪保证

短语法：

```yaml
depends_on:
  - db
```

主要表达启动顺序，不代表数据库已经接受查询。

结合健康检查：

```yaml
depends_on:
  db:
    condition: service_healthy
```

即便如此，应用仍必须实现连接重试和指数退避，因为数据库运行中也可能短暂不可用。启动顺序不能替代分布式系统韧性。

## 15. 健康检查

```yaml
healthcheck:
  test: ["CMD", "curl", "--fail", "http://localhost:3000/health"]
  interval: 10s
  timeout: 3s
  retries: 5
  start_period: 20s
```

先确认镜像内存在 `curl`。极简镜像可提供应用自身健康子命令：

```yaml
test: ["CMD", "/app/server", "healthcheck"]
```

查看健康状态：

```bash
docker compose ps
docker inspect --format '{{json .State.Health}}' compose-demo-api-1
```

## 16. 网络分层

```yaml
networks:
  frontend:
  backend:
    internal: true
```

服务只加入必需网络。代理无需数据库凭据，数据库无需前端网络。`internal` 网络减少外部连接，但不是认证、TLS、数据库角色权限的替代品。

## 17. 安全约束

```yaml
services:
  api:
    image: registry.example.com/team/api:1.4.2
    user: "10001:10001"
    read_only: true
    tmpfs:
      - /tmp:size=64m,mode=1777
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
```

逐项验证应用需求：

- `user`：非 root 数字 UID/GID。
- `read_only`：根文件系统只读。
- `tmpfs`：只开放必要临时写目录。
- `cap_drop: ALL`：移除 Linux capabilities。
- `no-new-privileges`：阻止进程通过 exec 获得新权限。

确实需要 capability 时逐项添加，不使用 `privileged: true` 作为通用修复。

## 18. 资源限制

单机 Compose 常用：

```yaml
services:
  api:
    cpus: 1.0
    mem_limit: 512m
    pids_limit: 200
```

限制要基于负载测试：

- 太低会导致 OOM、延迟和频繁重启。
- 不限制会让异常容器拖垮宿主机。
- 应给数据库缓存和 JVM/Node 堆留足余量。
- 容器内存包括堆外、原生库和页缓存等，不只应用堆。

检查：

```bash
docker compose stats
docker inspect &lt;container&gt; --format '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}}'
```

## 19. 重启策略

```yaml
restart: unless-stopped
```

常见选择：

| 值 | 行为 |
| --- | --- |
| `no` | 不自动重启 |
| `on-failure` | 非零退出时重启 |
| `always` | 总是尝试重启 |
| `unless-stopped` | 除非明确停止，否则重启 |

重启策略不能修复配置错误。持续重启会掩盖退出原因，应配合日志、告警和退避。

## 20. 生命周期命令

前台启动：

```bash
docker compose up
```

后台启动：

```bash
docker compose up -d
```

只启动部分服务：

```bash
docker compose up -d db api
```

重建：

```bash
docker compose up -d --build
docker compose up -d --force-recreate
```

停止但保留容器：

```bash
docker compose stop
docker compose start
```

移除：

```bash
docker compose down
```

同时删除 volume：

```bash
docker compose down --volumes
```

最后一个命令具有数据破坏性，数据库项目不可随手执行。

## 21. 查看与操作

```bash
docker compose ps --all
docker compose logs --follow --tail 100 api
docker compose top
docker compose stats
docker compose images
```

在运行中服务执行命令：

```bash
docker compose exec api sh
docker compose exec db psql -U app -d app
```

运行一次性任务：

```bash
docker compose run --rm api npm run migrate
```

`run` 会创建新容器，端口默认行为与 `up` 管理的服务不同。数据库迁移要确保并发控制和失败处理。

## 22. Profiles

```yaml
services:
  adminer:
    image: adminer:5.4.1
    profiles: ["debug"]
    networks:
      - backend
    ports:
      - "127.0.0.1:8081:8080"
```

默认不启动：

```bash
docker compose --profile debug up -d
```

Profiles 适合调试工具、一次性任务和可选服务。即便只绑定本机，也要限制凭据和生命周期。

## 23. 多文件合并

基础文件加开发覆盖：

```bash
docker compose \
  -f compose.yaml \
  -f compose.dev.yaml \
  config
```

```bash
docker compose \
  -f compose.yaml \
  -f compose.dev.yaml \
  up -d
```

合并规则对列表和映射并不总是直觉一致。每次都用 `docker compose config` 检查最终模型。

不要让生产部署隐式加载开发 override，命令中明确文件集合。

## 24. 项目名

项目名影响容器、网络和 volume 名称：

```bash
docker compose -p demo-a up -d
docker compose -p demo-b up -d
```

也可在文件中：

```yaml
name: compose-demo
```

项目名变化可能看起来像“数据丢失”，实际是创建了另一组 volume。生产命名应稳定。

## 25. 拉取与更新

```bash
docker compose pull
docker compose up -d
```

使用明确版本：

```yaml
image: registry.example.com/team/api:1.4.2
```

更严格部署使用 digest：

```yaml
image: registry.example.com/team/api@sha256:<已验证摘要>
```

不要依赖 `latest` 触发生产更新。更新流程应可审查、可回滚，并保留旧 digest。

## 26. 常见故障

### 变量未设置

```bash
docker compose config
docker compose config --environment
```

检查 shell、`.env`、`--env-file` 和默认值。避免输出秘密到共享日志。

### 服务启动但依赖不可用

增加真实健康检查，同时让应用实现重试。查看：

```bash
docker compose ps
docker compose logs db api
```

### 修改 Dockerfile 后没有生效

```bash
docker compose build --pull api
docker compose up -d --no-deps api
```

确认 service 使用的是 `build` 结果，而不是拉取了另一个 `image`。

### 出现孤儿容器

服务从文件移除后，旧容器可能留下：

```bash
docker compose down --remove-orphans
```

执行前确认同项目名下没有其他文件管理的服务。

### `down` 后数据库还在

这是 named volume 的预期行为。用 `docker volume ls` 检查。除非明确丢弃数据，不要加 `--volumes`。

## 27. 生产边界

Compose 很适合：

- 本地开发环境。
- CI 集成测试。
- 单机部署。
- 小规模、明确运维边界的服务。

当需求涉及多主机调度、自动扩缩容、复杂滚动发布、跨节点存储和高级策略时，应评估 Kubernetes、Nomad 或托管平台。迁移平台不会自动解决镜像质量、配置、备份和可观测性问题。

## 28. 上线检查清单

- [ ] 文件通过 `docker compose config --quiet`。
- [ ] 不含顶层 `version`。
- [ ] 使用 `docker compose` 而非 `docker-compose`。
- [ ] 镜像使用明确版本或 digest。
- [ ] 数据库使用 named/external volume。
- [ ] 只有入口服务发布必要端口。
- [ ] 容器间通过服务名通信。
- [ ] 健康检查与应用重试同时存在。
- [ ] 密码不在仓库或镜像中。
- [ ] 非 root、只读、cap-drop 和资源限制已测试。
- [ ] 有备份恢复和回滚方案。
- [ ] 日志、指标和告警已接入。

## 29. 练习

1. 用 Compose 启动 Nginx，并只绑定 `127.0.0.1`。
2. 添加 Redis 服务但不发布 Redis 端口。
3. 用临时 curl/redis-cli 服务通过服务名访问。
4. 为 Redis 添加 named volume。
5. 添加健康检查与资源限制。
6. 使用 profile 加入调试工具。
7. 执行 `config` 检查最终模型，再清理容器但保留 volume。

## 30. 官方资料

- [Docker Compose overview](https://docs.docker.com/compose/)
- [Compose Specification](https://docs.docker.com/reference/compose-file/)
- [Compose CLI reference](https://docs.docker.com/reference/cli/docker/compose/)
- [Compose networking](https://docs.docker.com/compose/how-tos/networking/)
- [Environment variables in Compose](https://docs.docker.com/compose/how-tos/environment-variables/)
- [Compose production guidance](https://docs.docker.com/compose/how-tos/production/)

下一篇：[日志调试资源限制与安全实践](/kb/container/Docker/使用教程/07-日志调试资源限制与安全实践/)
