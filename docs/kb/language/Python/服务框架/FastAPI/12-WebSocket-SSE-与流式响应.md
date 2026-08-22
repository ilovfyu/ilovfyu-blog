---
title: "WebSocket、SSE 与流式响应"
permalink: /kb/language/Python/服务框架/FastAPI/12-WebSocket-SSE-与流式响应/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "中间件、CORS 与反向代理", link: /kb/language/Python/服务框架/FastAPI/11-中间件-CORS-与反向代理/ }
next: { text: "测试与调试", link: /kb/language/Python/服务框架/FastAPI/13-测试与调试/ }
knowledgeNote:
  series: "Language"
  group: "FastAPI"
---
> 基线：FastAPI 0.141.1，Python 3.10+，Pydantic v2。反向代理设置见 [中间件 CORS 与反向代理](/kb/language/Python/服务框架/FastAPI/11-中间件-CORS-与反向代理/)，测试见 [测试与调试](/kb/language/Python/服务框架/FastAPI/13-测试与调试/)。

## 1. 如何选择

| 技术 | 方向/协议 | 适合 | 主要限制 |
|---|---|---|---|
| `StreamingResponse` | HTTP 响应字节流 | 大文件之外的二进制、动态文本 | 无事件语义；客户端/代理可能缓冲 |
| JSON Lines | HTTP，一行一个 JSON | 日志、LLM、结构化批流 | 不是一个合法 JSON 数组 |
| SSE | HTTP `text/event-stream`，服务端到客户端 | 通知、进度、token；浏览器自动重连 | 原生 `EventSource` 仅 GET，不能自定义 Authorization 头 |
| WebSocket | 长连接全双工 | 聊天、协作、低延迟双向消息 | 连接状态、心跳、扩缩容更复杂 |
| `FileResponse` | 高效文件响应 | 磁盘文件、Range 下载 | 路径安全与生命周期要自行控制 |

## 2. 完整可运行示例

```python
# main.py
import asyncio
from collections.abc import AsyncIterable
from pathlib import Path
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, Header, Query, WebSocket, WebSocketDisconnect, WebSocketException, status
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.sse import EventSourceResponse, ServerSentEvent
from pydantic import BaseModel

app = FastAPI()
DOWNLOAD_ROOT = Path(__file__).parent.resolve()


class Item(BaseModel):
    seq: int
    message: str


async def current_ws_user(
    websocket: WebSocket,
    token: Annotated[str | None, Query()] = None,
    session: Annotated[str | None, Cookie()] = None,
) -> str:
    credential = token or session
    if credential != "demo-secret":
        # 握手前不要抛 HTTPException；用 WebSocketException 关闭连接。
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="invalid credential")
    return "demo-user"


class ConnectionManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self.lock:
            self.active.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self.lock:
            self.active.discard(ws)

    async def broadcast(self, message: str) -> None:
        # 慢客户端不应永远阻塞其他连接；真实系统宜每连接一个有界队列。
        async with self.lock:
            peers = list(self.active)
        dead: list[WebSocket] = []
        for peer in peers:
            try:
                await asyncio.wait_for(peer.send_text(message), timeout=2)
            except Exception:
                dead.append(peer)
        for peer in dead:
            await self.disconnect(peer)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, user: Annotated[str, Depends(current_ws_user)]) -> None:
    await manager.connect(ws)
    try:
        await manager.broadcast(f"{user} joined")
        while True:
            text = await ws.receive_text()
            if len(text) > 4096:
                await ws.close(code=status.WS_1009_MESSAGE_TOO_BIG)
                return
            await manager.broadcast(f"{user}: {text}")
    except WebSocketDisconnect:
        await manager.disconnect(ws)
        await manager.broadcast(f"{user} left")
    finally:
        await manager.disconnect(ws)


@app.get("/bytes")
async def bytes_stream() -> StreamingResponse:
    async def generate() -> AsyncIterable[bytes]:
        for i in range(5):
            yield f"chunk {i}\n".encode()
            # 提供取消点，断开时生成器才能及时收到 CancelledError。
            await asyncio.sleep(0.2)
    return StreamingResponse(generate(), media_type="text/plain")


@app.get("/items.jsonl")
async def json_lines() -> AsyncIterable[Item]:
    # FastAPI 0.134+ 最新方式：直接 yield，返回标注驱动校验、OpenAPI 和 Pydantic 序列化。
    for i in range(5):
        yield Item(seq=i, message=f"item {i}")
        await asyncio.sleep(0.2)


@app.get("/events", response_class=EventSourceResponse)
async def events(
    last_event_id: Annotated[int | None, Header()] = None,
) -> AsyncIterable[ServerSentEvent]:
    start = (last_event_id + 1) if last_event_id is not None else 0
    for i in range(start, start + 10):
        yield ServerSentEvent(data=Item(seq=i, message="tick"), event="tick", id=str(i), retry=3000)
        await asyncio.sleep(1)
    yield ServerSentEvent(raw_data="[DONE]", event="done")


@app.get("/download/{name}", response_class=FileResponse)
async def download(name: str) -> FileResponse:
    path = (DOWNLOAD_ROOT / name).resolve()
    if path.parent != DOWNLOAD_ROOT or not path.is_file():
        from fastapi import HTTPException
        raise HTTPException(404, "file not found")
    return FileResponse(path, filename=path.name, media_type="application/octet-stream")
```

安装并运行：`python -m pip install "fastapi[standard]==0.141.1"`，`fastapi dev main.py`。测试：`curl -N http://127.0.0.1:8000/items.jsonl`、`curl -N http://127.0.0.1:8000/events`。浏览器 WebSocket：`new WebSocket("ws://127.0.0.1:8000/ws?token=demo-secret")`。

## 3. StreamingResponse 与 FileResponse

`StreamingResponse` 迭代每个 `bytes`/`str` chunk，并等待 ASGI server 发送，因此自然形成一定 backpressure；但 OS、Uvicorn、代理、HTTP 客户端仍各有缓冲，`yield` 不保证每块立刻显示。async 生成器必须周期性 `await`，否则断开取消无法注入。阻塞式文件/SDK 使用普通生成器，让 Starlette 在线程池迭代，或改用真正异步库；不要在 `async def` 中调用阻塞 I/O。

`FileResponse` 异步发送文件，并提供 `Content-Length`、`Last-Modified`、`ETag`，支持 Starlette 的 HTTP Range。优先于手工 `open()` 流。文件名永远不能直接拼接用户输入；使用固定 ID 到路径的映射，或像示例一样 resolve 后验证目录边界。下载过程中不能提前删除临时文件，可用响应 `BackgroundTask` 在发送完毕后清理。

## 4. JSON Lines 的最新方式

FastAPI 0.134+ 路径函数本身可成为生成器。标注 `AsyncIterable[Item]` 或同步的 `Iterable[Item]`，框架逐项校验、过滤并通过 Pydantic v2 序列化，媒体类型为 `application/jsonl`。每行独立 JSON，适合增量消费；客户端应逐行解析，不能 `response.json()`。若响应开始后某项校验失败，HTTP 状态已经是 200，无法改成 500，只能终止流并记录错误，因此可在首字节前完成关键检查。

## 5. SSE：原生 EventSourceResponse

FastAPI 0.135+ 原生 `fastapi.sse`。路径函数 `yield` 普通对象时放入 JSON 编码的 `data:`；需要 `event/id/retry/comment` 时 yield `ServerSentEvent`。`data="hello"` 会成为 JSON 字符串（含引号），预格式化文本用 `raw_data`，二者互斥。框架默认约每 15 秒发送 ping 注释，并设置 `Cache-Control: no-cache`、`X-Accel-Buffering: no`。

浏览器 `EventSource` 会带 `Last-Event-ID` 重连，但服务端必须有持久化事件日志才能真正续传；示例只是演示序号。原生 API 不能设置任意请求头，认证通常使用同源 HttpOnly Cookie、短期签名查询参数，或以 fetch 读取 POST SSE。避免长期 token 写入 URL/日志。连接上限、代理 idle timeout、每用户并发数都要治理。

断开通常通过 ASGI `http.disconnect` 导致流任务取消；清理资源放在生成器 `try/finally`。响应头发出后不能再返回结构化错误。Nginx 应 `proxy_buffering off; proxy_read_timeout 1h;`，不要对 SSE gzip。客户端消费慢会拖住发送；生产中用**有界** `asyncio.Queue`，队满时丢弃旧进度、合并状态或主动断开，绝不能无限积压内存。

## 6. WebSocket 机制、异常和多进程边界

WebSocket 先 HTTP Upgrade，再在同一连接收发 frame。FastAPI 的 `Depends`、`Cookie`、`Header`、`Query` 可用于握手；拒绝策略用 `WebSocketException`，连接接受后用 `close(code=...)`。常见码：1000 正常、1008 策略违规、1009 消息过大、1011 服务端错误。不要把内部异常 reason 暴露给客户端。

示例 manager 只在**当前进程内存**有效。`--workers 4` 有四份集合，跨 worker 广播、在线人数和房间状态都会错误；容器扩容同理。生产使用 Redis Pub/Sub、NATS、Kafka 等外部通道，连接仍由各 worker 本地持有；需要可靠重放时不能只用 Pub/Sub。负载均衡器必须支持 Upgrade，并设置足够 idle timeout；若协议状态依赖单连接自然保持，不应误以为 sticky session 能解决跨进程广播。

慢消费者需要每连接有界队列和独立 sender task；定义溢出策略、消息大小、速率限制、心跳 ping/pong、空闲超时和最大连接时长。浏览器 WebSocket 不受 CORS 机制保护，服务端应显式校验 `Origin`，同时认证授权。连接断开是正常控制流，捕获 `WebSocketDisconnect`，不要刷错误告警。

## 7. 排错清单

- curl 默认缓冲显示，SSE/JSONL 使用 `curl -N`；确认 `Content-Type` 正确。
- 首块迟迟不出：检查生成器是否先执行阻塞工作、GZip、Nginx/CDN buffering 和客户端 API。
- WebSocket 403：通常是握手依赖拒绝、Origin、Host 或代理未转发 Upgrade。
- 1011/突然断开：检查服务端异常、代理 idle timeout、滚动发布和消息上限。
- 内存持续增长：检查无限队列、已断开连接未移除、生成器 finally 未执行和每连接缓存。
- 负载测试应模拟慢读客户端，并观测连接数、队列深度、发送延迟、断开码，而不只看 RPS。

## 官方资料

- [Stream JSON Lines](https://fastapi.tiangolo.com/tutorial/stream-json-lines/)
- [Server-Sent Events](https://fastapi.tiangolo.com/tutorial/server-sent-events/)
- [SSE API Reference](https://fastapi.tiangolo.com/reference/sse/)
- [Custom Responses](https://fastapi.tiangolo.com/advanced/custom-response/)
- [WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)
- [Starlette Responses](https://www.starlette.io/responses/)

## 导航

学习路线：[FastAPI 学习路线](/kb/language/Python/服务框架/FastAPI/00-FastAPI-学习路线/)  
上一篇：[中间件 CORS 与反向代理](/kb/language/Python/服务框架/FastAPI/11-中间件-CORS-与反向代理/)  
下一篇：[测试与调试](/kb/language/Python/服务框架/FastAPI/13-测试与调试/)
