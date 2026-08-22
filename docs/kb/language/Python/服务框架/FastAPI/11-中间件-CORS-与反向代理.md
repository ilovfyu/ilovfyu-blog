---
title: "中间件、CORS 与反向代理"
permalink: /kb/language/Python/服务框架/FastAPI/11-中间件-CORS-与反向代理/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "大型应用配置与工程结构", link: /kb/language/Python/服务框架/FastAPI/10-大型应用配置与工程结构/ }
next: { text: "WebSocket、SSE 与流式响应", link: /kb/language/Python/服务框架/FastAPI/12-WebSocket-SSE-与流式响应/ }
knowledgeNote:
  series: "Language"
  group: "FastAPI"
---
> 基线：FastAPI 0.141.1（2026-07-29），Python 3.10+，Pydantic v2。部署与 HTTPS 细节见 [部署容器性能与生产实践](/kb/language/Python/服务框架/FastAPI/15-部署容器性能与生产实践/)，文档路径问题见 [OpenAPI 文档与客户端生成](/kb/language/Python/服务框架/FastAPI/14-OpenAPI-文档与客户端生成/)。

## 1. ASGI 中间件机制与顺序

中间件包裹整个 ASGI 应用，能处理 HTTP 请求进入前、响应返回后以及异常。`app.add_middleware(A)` 后再添加 `B`，实际调用栈是 **最后添加的在最外层**：请求 `B -> A -> 路由`，响应 `路由 -> A -> B`。FastAPI 自身最外面还有 `ServerErrorMiddleware`，里面有 `ExceptionMiddleware`；不要依赖未公开的内部层级。

函数式 `@app.middleware("http")` 简单，但底层也是 `BaseHTTPMiddleware`。它只处理 HTTP，不处理 WebSocket。纯 ASGI 中间件直接实现 `__call__(scope, receive, send)`，可处理所有 ASGI scope，开销更低且语义最完整。

### BaseHTTPMiddleware 的边界

`BaseHTTPMiddleware` 方便但有重要限制：上游设置的 `contextvars.ContextVar` 变化可能无法向上传播；包装 request/response body 容易造成流被消费、缓冲或失去取消语义。流式响应、请求体审计、分布式追踪上下文等优先写纯 ASGI 中间件。不要在中间件中无上限读取整个上传体。

```python
# main.py
import time
import uuid
from collections.abc import MutableMapping
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware


class RequestIdMiddleware:
    """纯 ASGI：不缓冲 body，也适用于 WebSocket 握手。"""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: MutableMapping[str, Any], receive: Any, send: Any) -> None:
        if scope["type"] not in {"http", "websocket"}:
            await self.app(scope, receive, send)
            return
        request_id = str(uuid.uuid4())
        scope["request_id"] = request_id
        started = time.perf_counter()

        async def send_with_headers(message: MutableMapping[str, Any]) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("ascii")))
                headers.append((b"server-timing", f"app;dur={(time.perf_counter()-started)*1000:.2f}".encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)


app = FastAPI(root_path="")

# 先添加的靠内，后添加的靠外。HTTPSRedirect 仅在本地演示时注释掉。
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["api.example.com", "localhost", "testserver"])
app.add_middleware(RequestIdMiddleware)
# 生产中若入口允许 HTTP 且要应用重定向，可启用；TLS 终止代理必须正确传递并受信任。
# app.add_middleware(HTTPSRedirectMiddleware)


@app.get("/whoami")
async def whoami(request: Request) -> dict[str, str]:
    return {
        "url": str(request.url),
        "root_path": request.scope.get("root_path", ""),
        "request_id": request.scope["request_id"],
    }
```

运行：`python -m pip install "fastapi[standard]==0.141.1"`，然后 `fastapi dev main.py`。生产使用 `fastapi run main.py`。

## 2. CORS：浏览器安全策略，不是服务端认证

Origin 是协议、域名、端口三元组。浏览器对非“简单请求”先发送 `OPTIONS` 预检；`CORSMiddleware` 校验 Origin、方法、请求头后返回许可头。curl/Postman 不执行浏览器 CORS，因此“curl 正常、网页失败”首先看浏览器 Network 中的 OPTIONS。

启用 `allow_credentials=True` 时，响应不能用 `Access-Control-Allow-Origin: *` 表示任意源；FastAPI/Starlette 要求 origins、methods、headers 显式列出，避免“带 Cookie/Authorization 向任意站点开放”。生产应从配置加载精确白名单。Cookie 跨站还需要 `Secure; SameSite=None`，并应有 CSRF 防护；CORS 本身不防 CSRF。`expose_headers` 决定前端 JS 可读取哪些响应头。

常见故障：尾部斜杠不影响 Origin，但端口会；`https://example.com` 与 `https://www.example.com` 不同；代理若自行响应 OPTIONS，应用 CORS 设置不会生效；错误响应缺少 CORS 头时，可把整个 FastAPI 应用再包一层 `CORSMiddleware`，让未捕获 500 也经过 CORS，但要保持单一配置源。

## 3. 安全中间件

- `TrustedHostMiddleware` 校验 `Host`，缓解 Host Header 攻击。通配符只能写 `*.example.com`；健康探针所用 host 也要纳入。它不等同于可信代理配置。
- `HTTPSRedirectMiddleware` 把 `http/ws` 重定向到 `https/wss`。TLS 在代理终止时，Uvicorn 必须信任代理传来的 `X-Forwarded-Proto`，否则会循环重定向。
- `GZipMiddleware` 对达到 `minimum_size` 的响应压缩；已经带 `Content-Encoding` 或 `text/event-stream` 不应压缩。压缩会增加 CPU，并可能缓冲流；图片、zip 等已压缩内容收益很小。敏感秘密与用户可控文本同响应压缩还需考虑 BREACH 类侧信道。

推荐把 HSTS、证书、请求大小限制、限流放在可信边缘代理；应用仍需认证授权、输入限制和 TrustedHost，形成纵深防御。

## 4. 反向代理头：只信任真正的代理

代理通常写 `X-Forwarded-For/Proto/Host`。Uvicorn 只有在来源 IP 被信任时才解释它们：

```bash
fastapi run main.py --proxy-headers --forwarded-allow-ips="10.0.0.10,10.0.0.11"
```

只有应用端口不对公网开放、所有流量必经受信代理时才可用 `--forwarded-allow-ips="*"`。否则攻击者可伪造客户端 IP、协议和 host，绕过审计或安全判断。代理应覆盖而非盲目追加外部传来的转发头。业务若从 `X-Forwarded-For` 自行取第一个地址，要理解多级代理链并固定可信跳数。

Nginx 核心片段：

```nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_http_version 1.1;
}
```

WebSocket 还需 `Upgrade`/`Connection`；SSE 还需关闭代理缓冲，见 [WebSocket SSE 与流式响应](/kb/language/Python/服务框架/FastAPI/12-WebSocket-SSE-与流式响应/)。

## 5. root_path 与 mount 不是一回事

若公网 URL 是 `/api/v1/items`，代理**剥掉** `/api/v1` 后把 `/items` 交给应用，应设置 ASGI `root_path=/api/v1`：

```bash
fastapi run main.py --root-path /api/v1 --proxy-headers --forwarded-allow-ips=10.0.0.10
```

也可 `FastAPI(root_path="/api/v1")`，但不要两边重复配置。`root_path` 只告诉应用“外部前缀”，不会让直连 Uvicorn 的 `/api/v1/items` 自动匹配；是否剥前缀必须与代理一致。它会影响 `request.url_for()`、OpenAPI `servers` 和 docs 加载 schema 的地址。

`mount` 则是真正把独立 ASGI 子应用挂到路径，子应用拥有独立路由与 OpenAPI：

```python
from fastapi import FastAPI

app = FastAPI()
admin = FastAPI(title="Admin API")

@admin.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}

app.mount("/admin", admin)
```

访问 `/admin/health`；框架会自动给子应用计算 `root_path=/admin`。`include_router(prefix=...)` 则仍属于同一应用和同一 OpenAPI。不要把 mount 前缀再写进子应用路由。

## 6. 排错与生产检查

1. 用 `curl -i -H 'Origin: https://app.example.com'` 看实际许可头，用 OPTIONS 携带 `Access-Control-Request-Method` 复现预检。
2. 检查外部 URL、代理转发 URL、`scope.path`、`scope.root_path` 四者，不要靠反复拼前缀碰运气。
3. 遇到 HTTPS 重定向循环，查看应用看到的 `request.url.scheme`，再检查可信代理 IP和 `X-Forwarded-Proto`。
4. 中间件计时只代表它包围的范围；后台任务在所有中间件之后运行。异常日志不要记录 token、Cookie 或完整请求体。
5. 流式端点若“攒到最后才出现”，依次检查 GZip、中间件缓冲、Nginx buffering、CDN 和客户端读取方式。

## 官方资料

- [Middleware](https://fastapi.tiangolo.com/tutorial/middleware/)
- [Advanced Middleware](https://fastapi.tiangolo.com/advanced/middleware/)
- [CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [Behind a Proxy](https://fastapi.tiangolo.com/advanced/behind-a-proxy/)
- [Sub Applications / Mounts](https://fastapi.tiangolo.com/advanced/sub-applications/)
- [Starlette Middleware](https://www.starlette.io/middleware/)
- [Uvicorn Settings](https://www.uvicorn.org/settings/)

## 导航

学习路线：[FastAPI 学习路线](/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/)  
上一篇：[大型应用配置与工程结构](/kb/language/Python/服务框架/FastAPI/10-大型应用配置与工程结构/)  
下一篇：[WebSocket SSE 与流式响应](/kb/language/Python/服务框架/FastAPI/12-WebSocket-SSE-与流式响应/)
