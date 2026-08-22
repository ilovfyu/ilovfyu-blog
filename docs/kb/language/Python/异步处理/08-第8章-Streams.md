---
title: "第 8 章 Streams"
permalink: /kb/language/Python/异步处理/08-第8章-Streams/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "第 7 章 使用线程处理阻塞任务", link: /kb/language/Python/异步处理/07-第7章-使用线程处理阻塞任务/ }
next: { text: "第 9 章 Web 应用", link: /kb/language/Python/异步处理/09-第9章-Web-应用/ }
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
::: abstract 本章定位
网络程序最终面对的是字节、连接生命周期和背压。`asyncio` 同时提供底层 transports/protocols 与高层 Streams。本章从这两层模型出发，构建一个能正确处理消息边界、`drain()`、EOF 与广播的聊天室。
:::

## 本章目标/地图

- 理解 transport 负责“怎么传”、protocol 负责“收到后做什么”。
- 使用 `StreamReader` / `StreamWriter` 编写 TCP 客户端和服务器。
- 正确处理 TCP 无消息边界、写缓冲背压、半关闭与 EOF。
- 管理 server 生命周期和每连接 Task。
- 将并发连接组织成一个最小聊天室，并识别慢客户端问题。

```text
低层 callback API                 高层 coroutine API
Protocol <-> Transport    <=>    StreamReader + StreamWriter
   data_received()                   await reader.readline()
   pause/resume_writing()            writer.write(); await writer.drain()
```

## 概念精讲

### TCP 是字节流，不是消息队列

一次 `write(b"hello")` 不保证对端一次 `read()` 恰好得到 `b"hello"`。数据可能合并、拆分或分多次到达。应用必须定义 framing：固定长度、长度前缀、分隔符或自描述格式。本章聊天室使用换行符，并用 `readline()` 读取一条逻辑消息。

若消息可能很大，要同时设置协议级最大长度和 StreamReader limit，防止攻击者在不发送分隔符时耗尽内存。

### Transports 与 Protocols

Transport 封装 socket 等底层传输，负责写入、关闭、缓冲和流量控制；Protocol 是回调对象，响应 `connection_made()`、`data_received()`、`eof_received()`、`connection_lost()`。loop 调用 protocol，而不是用户 `await` protocol。

这一层适合需要自定义协议状态机、精细性能控制或 datagram 的库。代价是回调状态更分散，异步业务逻辑不如协程直观。Streams 是建立在同类底层机制上的高层抽象。

### StreamReader 与 StreamWriter

`StreamReader` 提供可等待的读取；`StreamWriter` 公开 `write()`、`drain()`、`close()` 和连接信息。reader 与 writer 通常成对出现，但分别承担入站和出站方向。

常见读取方法语义不同：

- `read(n)`：最多读 n 字节；返回可能少于 n，空字节表示 EOF。
- `readexactly(n)`：必须读满，否则抛 `IncompleteReadError`，异常里保留部分数据。
- `readuntil(separator)`：读到分隔符；超过 limit 抛 `LimitOverrunError`。
- `readline()`：以换行 framing，EOF 前的残余数据也可能作为最后一行返回。

### `write()` 与 `drain()`

`writer.write()` 通常只是把字节放进用户态传输缓冲，并不等待网络真正发送。持续写入而不 `await drain()`，慢客户端会让内存不断增长。`drain()` 在缓冲达到高水位后暂停生产者，降到低水位再恢复，是协作式背压点。

不必机械地每写几个字节就 drain；可在一条或一批消息后调用。聊天广播还要避免一个慢客户端串行拖住所有客户端，可为每个连接设置独立发送队列和容量。示例保持短小，采用发送超时并移除慢连接。

### EOF 与关闭

reader 返回 `b""` 表示对端发送方向结束。writer 关闭应执行 `writer.close()`，再 `await writer.wait_closed()` 让缓冲刷新和资源释放完成。某些传输支持 `write_eof()` 做半关闭：本端不再发送，但仍可读取；TLS 等传输的支持情况不同，应先检查 `can_write_eof()`。

关闭路径必须幂等：正常退出、异常、服务器停机可能同时触发清理。不要只在成功路径关闭 writer。

### Server 与连接并发

`asyncio.start_server(client_connected_cb, ...)` 创建监听 server。每个新连接都会触发 callback；若 callback 是协程函数，asyncio 会把它调度为 Task。`async with server` 管理监听 socket，`serve_forever()` 接受连接直到被取消。

监听 server 关闭只停止接收新连接，已有连接还需应用自行追踪、通知和关闭。

## API

| API | 用途 | 关键点 |
|---|---|---|
| `loop.create_connection(protocol_factory, ...)` | 建立底层 transport/protocol 客户端 | 回调式协议实现 |
| `loop.create_server(protocol_factory, ...)` | 建立底层协议服务器 | 返回 `asyncio.Server` |
| `asyncio.open_connection(host, port)` | 打开 TCP stream 客户端 | 返回 `(reader, writer)` |
| `asyncio.start_server(callback, host, port, limit=...)` | 建立 TCP stream 服务器 | 每连接调用 callback |
| `reader.read/readexactly/readuntil/readline` | 按不同 framing 读取 | 正确处理 EOF 和限制异常 |
| `writer.write(data)` | 将 bytes 写入缓冲 | 不是协程，不等于已送达 |
| `await writer.drain()` | 响应写缓冲背压 | 慢对端可能长时间阻塞 |
| `writer.close(); await writer.wait_closed()` | 有序关闭写端 | 放在 `finally` 中 |
| `writer.get_extra_info("peername")` | 获取连接附加信息 | 值可能为 `None` |

## 完整原创可运行示例

程序在本机随机端口启动聊天室服务器，再启动两个演示客户端。协议为 UTF-8 换行文本，第一行是昵称；服务器广播后正确 `drain()`，并给慢写设置超时。

```python
import asyncio


clients: dict[asyncio.StreamWriter, str] = {}


async def send_line(writer: asyncio.StreamWriter, text: str) -> None:
    writer.write((text + "\n").encode())
    await asyncio.wait_for(writer.drain(), timeout=1)


async def broadcast(text: str) -> None:
    stale: list[asyncio.StreamWriter] = []
    recipients = list(clients)
    results = await asyncio.gather(
        *(send_line(writer, text) for writer in recipients),
        return_exceptions=True,
    )
    for writer, result in zip(recipients, results):
        if isinstance(result, BaseException):
            stale.append(writer)
    for writer in stale:
        clients.pop(writer, None)
        writer.close()


async def handle_chat(
    reader: asyncio.StreamReader,
    writer: asyncio.StreamWriter,
) -> None:
    name = "anonymous"
    try:
        raw_name = await reader.readline()
        if not raw_name:  # 在登录完成前收到 EOF
            return
        name = raw_name.decode().strip()[:30] or name
        clients[writer] = name
        await broadcast(f"* {name} joined")

        while line := await reader.readline():
            message = line.decode().rstrip("\r\n")
            if message == "/quit":
                break
            await broadcast(f"{name}: {message[:200]}")
    except (UnicodeDecodeError, ValueError):
        await send_line(writer, "protocol error")
    finally:
        was_joined = clients.pop(writer, None) is not None
        writer.close()
        await writer.wait_closed()
        if was_joined:
            await broadcast(f"* {name} left")


async def demo_client(name: str, messages: list[str], port: int) -> None:
    reader, writer = await asyncio.open_connection("127.0.0.1", port)

    async def receive() -> None:
        while line := await reader.readline():
            print(f"[{name} sees] {line.decode().rstrip()}")

    receiver = asyncio.create_task(receive())
    try:
        await send_line(writer, name)
        for message in messages:
            await send_line(writer, message)
            await asyncio.sleep(0.05)
        await send_line(writer, "/quit")
    finally:
        writer.close()
        await writer.wait_closed()
        await receiver


async def main() -> None:
    server = await asyncio.start_server(
        handle_chat,
        "127.0.0.1",
        0,
        limit=4096,
    )
    port = server.sockets[0].getsockname()[1]
    print(f"chat server on 127.0.0.1:{port}")

    async with server:
        await asyncio.gather(
            demo_client("Ada", ["hello", "streams need framing"], port),
            demo_client("Lin", ["hi", "drain provides backpressure"], port),
        )


if __name__ == "__main__":
    asyncio.run(main())
```

运行：

```bash
python chapter08_chat.py
```

## 执行流程

1. `start_server()` 绑定 `127.0.0.1` 的随机空闲端口。
2. 两个客户端分别调用 `open_connection()`，每个连接得到独立 reader/writer。
3. 客户端创建接收 Task，同时通过 writer 发送昵称和消息。
4. 服务器的连接协程用 `readline()` 恢复换行定义的消息边界。
5. 广播复制当前 writer 列表，并发写入，再在 `drain()` 处接受背压。
6. `/quit` 或 EOF 结束读取；`finally` 删除连接、关闭 writer 并广播离开事件。
7. 所有客户端结束后退出 `async with server`，监听 socket 被关闭。

演示中全局字典只在同一个 loop 线程访问，因此不需要线程锁。不过多个 Task 会在 `await` 处分段交错，所以遍历时仍创建快照，避免广播期间集合变化。

## 错误陷阱

- **假设一次 read 对应一次 write**：TCP 没有消息边界。定义明确 framing。
- **忘记编码层**：Streams 处理 bytes，不自动处理 UTF-8 半字符；应先按字节 framing，再 decode 完整消息。
- **无限 `readuntil()`**：对端不发分隔符时会增长缓冲。设置 `limit` 和协议消息上限。
- **只 `write()` 不 `drain()`**：慢连接令写缓冲膨胀。批次后 drain，并设置容量/超时。
- **串行广播所有客户端**：第一个慢客户端拖住后续客户端。并发发送或为每连接设置发送 Task。
- **多个协程同时读取同一 reader**：消息归属不确定，且可能触发运行时错误。每连接保持单一读取者。
- **多个协程随意写同一 writer**：单条消息可能在应用层交错。集中写入或加每连接发送队列。
- **把 `b""` 当暂时没数据**：它表示 EOF，应结束读取与清理。
- **只调用 `close()` 不等待**：关闭未完全完成。正常清理时 `await wait_closed()`。
- **关闭 server 就认为连接全关**：监听与已接受连接生命周期不同，需追踪连接 Task/writer。

## 现代Python补充

### Python 3.11+

- `asyncio.timeout()` 很适合登录首包、单条消息和 `drain()` 的截止时间，比散布多个 `wait_for()` 更易组合。
- `TaskGroup` 可管理 server 之外由应用显式创建的每连接后台任务，退出时集中取消并等待。
- `asyncio.Runner` 可用于同步 CLI 中明确管理 loop，但网络库仍不应偷偷创建嵌套 loop。
- TLS 可通过 `open_connection(..., ssl=...)` / `start_server(..., ssl=...)` 接入；必须验证证书与 hostname，不能只追求“加密成功”。
- Streams 仍是稳定的高层 API，但低层 transports/protocols 对高性能协议库、UDP 和精细流控依然重要。

生产聊天室通常为每个连接设置有界 `asyncio.Queue`，独立 writer Task 顺序发送。队列满时可断开慢客户端或丢弃允许丢失的事件，从而隔离慢消费者，避免一次广播生成无限 Task。

### UDP 与 DatagramProtocol

Streams 面向 TCP 字节流，不适用于 UDP。UDP 保留每个数据报的边界，但不保证送达、顺序或不重复，也没有连接级背压。`loop.create_datagram_endpoint()` 返回 `(transport, protocol)`；接收由 `DatagramProtocol.datagram_received()` 回调驱动，发送使用 `transport.sendto()`。回调必须短小，复杂处理应进入有界队列，不能为每个包无限创建 Task。

下面的本地回显示例不依赖外网：

```python
import asyncio


class EchoServer(asyncio.DatagramProtocol):
    def connection_made(self, transport) -> None:
        self.transport = transport

    def datagram_received(self, data: bytes, addr) -> None:
        self.transport.sendto(data.upper(), addr)


class EchoClient(asyncio.DatagramProtocol):
    def __init__(self, message: bytes, done: asyncio.Future[bytes]) -> None:
        self.message = message
        self.done = done

    def connection_made(self, transport) -> None:
        self.transport = transport
        transport.sendto(self.message)

    def datagram_received(self, data: bytes, addr) -> None:
        if not self.done.done():
            self.done.set_result(data)

    def error_received(self, exc: Exception) -> None:
        if not self.done.done():
            self.done.set_exception(exc)


async def main() -> None:
    loop = asyncio.get_running_loop()
    server_transport, _ = await loop.create_datagram_endpoint(
        EchoServer,
        local_addr=("127.0.0.1", 0),
    )
    port = server_transport.get_extra_info("sockname")[1]
    done = loop.create_future()
    client_transport, _ = await loop.create_datagram_endpoint(
        lambda: EchoClient(b"hello udp", done),
        remote_addr=("127.0.0.1", port),
    )
    try:
        async with asyncio.timeout(1):
            print((await done).decode())
    finally:
        client_transport.close()
        server_transport.close()


asyncio.run(main())
```

生产 UDP 协议应定义消息大小、请求 ID、去重、重试和鉴权策略。数据报过大可能触发 IP 分片并提高整包丢失概率；`sendto()` 返回也不代表对端已经收到。

### TLS 配置边界

客户端应从 `ssl.create_default_context()` 开始，让系统 CA、证书链和 hostname 校验保持开启，再把 context 传给 `open_connection(host, port, ssl=context, server_hostname=host)`。服务端使用 `SSLContext(ssl.PROTOCOL_TLS_SERVER)` 和 `load_cert_chain()` 加载证书。不要通过 `CERT_NONE` 或关闭 `check_hostname` 解决证书错误；开发环境应信任测试 CA，生产环境还要设置握手/关闭超时并验证证书轮换。TLS 提供传输机密性和对端身份校验，不替代应用层授权、消息大小限制和限流。

## 实践清单

- [ ] 明确定义消息 framing、编码、最大长度和版本。
- [ ] 为首包、读取、写入和空闲连接设置超时策略。
- [ ] 每个连接保持单一 reader 所有者。
- [ ] writer 在批次后 `drain()`，并限制待发送数据量。
- [ ] 将慢客户端与其他客户端隔离。
- [ ] 对 EOF、半包、非法编码、超长消息和连接重置编写测试。
- [ ] 所有 writer 在 `finally` 中关闭并等待关闭完成。
- [ ] 分别管理监听 server 与活跃连接生命周期。
- [ ] TLS 场景验证证书、主机名及关闭行为。
- [ ] UDP 场景定义丢包、乱序、重复、最大数据报和过载策略。
- [ ] 记录 peername、连接数、缓冲压力和协议错误，但不记录敏感正文。

## 复习题

1. 为什么 TCP 上一次 `write()` 不能对应一次 `read()`？
2. Transport 和 Protocol 分别负责什么？
3. `read()`、`readexactly()` 与 `readuntil()` 的失败语义有何不同？
4. `writer.write()` 为什么不是协程，而 `drain()` 是？
5. 收到 `b""` 应如何处理？
6. 为什么聊天室广播应考虑每客户端独立发送队列？
7. `server.close()` 是否会自动关闭所有已连接客户端？
8. 一个连接上安排两个 reader Task 会有什么问题？
9. UDP 与 TCP 在消息边界、可靠性和背压方面有何区别？
10. 为什么不应关闭 TLS hostname 和证书校验来绕过连接错误？

## 前后章链接

- 上一章：[第7章 使用线程处理阻塞任务](/kb/language/Python/异步处理/07-第7章-使用线程处理阻塞任务/)
- 下一章：[第9章 Web 应用](/kb/language/Python/异步处理/09-第9章-Web-应用/)

## 资料

- Matthew Fowler, *Python Concurrency with asyncio*, Chapter 8, Manning, 2022.
- [Python 文档：Streams](https://docs.python.org/3/library/asyncio-stream.html)
- [Python 文档：Transports and Protocols](https://docs.python.org/3/library/asyncio-protocol.html)
- [Python 文档：Event Loop 网络 API](https://docs.python.org/3/library/asyncio-eventloop.html#networking-and-interprocess-communication)
