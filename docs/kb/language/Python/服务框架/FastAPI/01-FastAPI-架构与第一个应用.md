---
title: "FastAPI 架构与第一个应用"
permalink: /kb/language/Python/服务框架/FastAPI/01-FastAPI-架构与第一个应用/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "FastAPI 学习路线", link: /kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/ }
next: { text: "路径查询请求头与 Cookie", link: /kb/language/Python/服务框架/FastAPI/02-路径查询请求头与-Cookie/ }
knowledgeNote:
  series: "Language"
  group: "FastAPI"
---
> 基线：FastAPI 0.141.1（2026-07-29 latest）、Python 3.10+、Pydantic v2。

本篇从运行链路出发，解释 FastAPI、Starlette、Pydantic、Uvicorn 和 ASGI 各自负责什么，并创建第一个具有参数校验、依赖注入和 OpenAPI 文档的应用。参数声明优先使用 `Annotated`。

## 1. FastAPI 在技术栈中的位置

一次 HTTP 请求大致经过以下链路：

```text
浏览器 / API 客户端
        ↓ HTTP
Uvicorn（ASGI Server）
        ↓ ASGI scope / receive / send
FastAPI 应用
        ├── Starlette：路由、请求响应、ASGI、中间件、WebSocket
        ├── Pydantic：数据解析、校验、序列化、JSON Schema
        └── FastAPI：依赖注入、参数来源声明、OpenAPI 集成
```

各组件边界如下：

| 组件 | 主要职责 | 不负责的事情 |
|---|---|---|
| ASGI | Python Web 应用与服务器之间的异步调用协议 | 不是服务器，也不提供业务路由 |
| Uvicorn | 监听端口、解析 HTTP/WebSocket、调用 ASGI 应用 | 不做业务参数校验，不生成 OpenAPI |
| Starlette | ASGI 工具箱：路由、中间件、请求响应、后台任务、WebSocket | 不提供 FastAPI 式依赖注入和 Pydantic API 契约 |
| Pydantic v2 | 根据类型注解解析、校验和序列化数据，生成 JSON Schema | 不监听网络，不决定参数来自 path 还是 query |
| FastAPI | 把类型注解、Pydantic、依赖注入、Starlette 路由和 OpenAPI 连接起来 | 不替代数据库、任务队列、反向代理或认证服务 |

FastAPI 是 Starlette 的子类，因此 Starlette 的 `Request`、`Response`、中间件和异常机制可以直接使用。FastAPI 并不是 Uvicorn 的替代品：前者是 ASGI 应用框架，后者是运行它的 ASGI 服务器。

## 2. ASGI 调用模型

最小 ASGI 应用是一个可异步调用对象：

```python
async def app(scope, receive, send):
    ...
```

- `scope`：连接级元数据，例如 `type`、请求路径、方法、请求头和客户端地址。
- `receive`：异步读取请求体或断开连接事件。
- `send`：异步发送响应状态、响应头和响应体事件。
- HTTP 请求通常对应一次 ASGI 调用；WebSocket 则可能在一次调用中持续收发事件。

FastAPI 把这个低层协议包装为路径操作函数。大多数业务代码不应直接操作 `receive` 和 `send`，而应使用声明式参数、`Request` 和 `Response`。

### `async def` 还是 `def`

- 调用支持 `await` 的网络库时使用 `async def`，例如异步数据库驱动或异步 HTTP 客户端。
- 只有同步阻塞 API 时可使用普通 `def`；FastAPI 会在线程池中运行路径操作函数。
- 不要在 `async def` 中直接执行长时间阻塞 I/O 或 CPU 密集任务，它会阻塞事件循环。CPU 密集任务应交给进程池或外部任务系统，这不属于 FastAPI 本身的职责。

## 3. 安装与项目结构

推荐使用 uv：

```bash
uv init
uv add "fastapi[standard]"
```

`fastapi[standard]` 提供常用标准依赖，包括 FastAPI CLI、Uvicorn 以及表单解析等能力。一个最小项目可以只有：

```text
project/
├── main.py
└── pyproject.toml
```

## 4. 完整可运行示例

创建 `main.py`：

```python
from typing import Annotated

from fastapi import Depends, FastAPI, Query
from pydantic import BaseModel, Field


app = FastAPI(
    title="商品目录 API",
    version="1.0.0",
    description="第一个 FastAPI 应用",
)


class Item(BaseModel):
    id: int
    name: str
    price: float = Field(gt=0)


ITEMS = [
    Item(id=1, name="Keyboard", price=399.0),
    Item(id=2, name="Mouse", price=199.0),
]


def common_query(
    q: Annotated[str | None, Query(min_length=1, max_length=50)] = None,
) -> str | None:
    return q.casefold() if q else None


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"message": "Hello FastAPI"}


@app.get("/items/{item_id}", response_model=Item, tags=["items"])
async def read_item(item_id: int) -> Item:
    for item in ITEMS:
        if item.id == item_id:
            return item
    # 下一篇响应与错误教程会引入 HTTPException。
    return Item(id=item_id, name="Unknown", price=0.01)


@app.get("/items", response_model=list[Item], tags=["items"])
async def list_items(
    q: Annotated[str | None, Depends(common_query)],
) -> list[Item]:
    if q is None:
        return ITEMS
    return [item for item in ITEMS if q in item.name.casefold()]
```

在包含 `main.py` 的目录运行：

```bash
fastapi dev
```

CLI 会自动发现 `main.py` 中的 `app`，开发模式默认开启自动重载。若模块位置不明确，可以显式运行：

```bash
fastapi dev main.py
```

生产环境不要依赖开发重载；应使用 `fastapi run` 或按部署平台要求启动 Uvicorn，并在反向代理、容器或进程管理器层配置并发、TLS 和超时。

## 5. 路径操作与依赖注入

```python
@app.get("/items/{item_id}")
async def read_item(item_id: int) -> Item:
    ...
```

- `@app.get(...)` 注册 HTTP `GET` 路径操作。
- `{item_id}` 对应同名函数参数；`int` 让 FastAPI 解析并校验路径片段。
- 返回值由 FastAPI 编码为 JSON 响应。
- `response_model=Item` 明确输出契约并执行安全过滤。

`Depends(common_query)` 不只是“调用一个函数”。FastAPI 会建立依赖图，解析每个依赖所需参数，并在单次请求内缓存同一个依赖的结果。依赖适合复用认证、数据库会话、分页参数等请求级逻辑，但数据库驱动本身不属于 FastAPI。

`Annotated[T, Depends(...)]` 保留了参数的真实类型 `T`，同时附加 FastAPI 元数据；这比把 `Depends` 放在默认值中更利于类型检查和复用。

## 6. OpenAPI 与交互式文档

启动应用后访问：

- Swagger UI：<http://127.0.0.1:8000/docs>
- ReDoc：<http://127.0.0.1:8000/redoc>
- OpenAPI JSON：<http://127.0.0.1:8000/openapi.json>

FastAPI 从路由、参数来源、类型注解、Pydantic JSON Schema、状态码和 `response_model` 生成 OpenAPI。Swagger UI 和 ReDoc 消费的是同一份 OpenAPI 文档，而不是扫描业务实现。

可以改变或关闭默认地址：

```python
app = FastAPI(
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
```

关闭 UI 不等于实施访问控制。生产环境是否公开 API 文档应依据安全策略；如果需要保护文档，应在应用依赖或网关层真正鉴权。

## 7. 请求生命周期与边界

典型生命周期如下：

1. Uvicorn 接收并解析 HTTP。
2. 中间件按最终堆栈从外向内进入；通过 `add_middleware()` 添加时，最后添加的用户中间件最先接收请求。
3. Starlette 匹配路由。
4. FastAPI 解析 path/query/header/cookie/body，执行依赖并调用 Pydantic 校验。
5. 路径操作函数运行。
6. FastAPI 按响应契约序列化结果。
7. 中间件反向退出，Uvicorn 写回网络。

需要注意：

- 路由匹配按声明顺序进行。应在 `/users/{user_id}` 之前声明 `/users/me`，否则 `me` 可能先被动态路由捕获。
- 类型校验失败通常返回 `422 Unprocessable Entity`，错误体会指出位置、错误类型和输入。
- OpenAPI 是契约描述，不是自动版本治理。破坏性变更仍需由团队管理。
- FastAPI 不自动提供持久化、迁移、消息队列、分布式追踪后端或 TLS 终止。

## 8. 常见错误

### 把 Uvicorn 当作 FastAPI

Uvicorn 只负责运行 ASGI 应用；输入校验、依赖注入和 OpenAPI 来自 FastAPI/Pydantic。

### 在 `async def` 中调用阻塞函数

`time.sleep()`、同步数据库查询或大型文件处理会阻塞事件循环。使用异步库、普通 `def` 路由的线程池，或把重计算移出 Web 进程。

### 认为开发热重载适合生产

热重载会监控文件并重启进程，适合开发，不适合稳定生产服务。

### 忽略输出契约

直接返回任意 `dict` 虽然方便，但可能泄露内部字段。公开 API 应通过返回注解或 `response_model` 定义输出；详见 [响应模型错误与状态码](/kb/language/Python/服务框架/FastAPI/05-响应模型错误与状态码/)。

## 9. 最佳实践

- 用类型注解表达 API 契约，参数元数据优先写成 `Annotated`。
- 开发阶段经常检查 `/docs` 和 `/openapi.json`，确认实现与契约一致。
- I/O 并发不等于 CPU 并行；根据依赖库选择 `async def` 或 `def`。
- 让路由层负责 HTTP 协议适配，让领域逻辑保持可独立测试。
- 明确 FastAPI 生态边界，不把代理限流、数据库事务和后台任务可靠性误认为框架自动保证。
- 使用固定依赖版本和自动化测试，升级 FastAPI、Starlette 或 Pydantic 时检查变更日志。

## 10. 官方资料

- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [FastAPI 第一步](https://fastapi.tiangolo.com/tutorial/first-steps/)
- [FastAPI CLI](https://fastapi.tiangolo.com/fastapi-cli/)
- [FastAPI 异步说明](https://fastapi.tiangolo.com/async/)
- [FastAPI OpenAPI](https://fastapi.tiangolo.com/how-to/extending-openapi/)
- [ASGI 规范](https://asgi.readthedocs.io/en/latest/specs/main.html)
- [Starlette 官方文档](https://www.starlette.io/)
- [Pydantic 官方文档](https://docs.pydantic.dev/latest/)
- [Uvicorn 官方文档](https://www.uvicorn.org/)

## 导航

学习路线：[FastAPI 学习路线](/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/)  
下一篇：[路径查询请求头与 Cookie](/kb/language/Python/服务框架/FastAPI/02-路径查询请求头与-Cookie/)
