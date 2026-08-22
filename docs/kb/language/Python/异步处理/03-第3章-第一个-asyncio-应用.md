---
title: "第3章 第一个 asyncio 应用"
permalink: /kb/language/Python/异步处理/03-第3章-第一个-asyncio-应用/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "第2章 asyncio 基础", link: /kb/language/Python/异步处理/02-第2章-asyncio-基础/ }
next: { text: "第4章 并发 Web 请求", link: /kb/language/Python/异步处理/04-第4章-并发-Web-请求/ }
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
::: info 阅读定位
本笔记对应原书第 3 章。通过 echo server 把前两章的抽象落到真实 socket：先看阻塞为何失去并发，再看 selector 与 asyncio 如何等待就绪，并最终处理任务异常和优雅停机。
:::

## 本章目标

- 理解 TCP socket 的监听、接受连接、收发字节和关闭过程。
- 用 Telnet/终端客户端观察长连接协议，并识别阻塞服务器的并发瓶颈。
- 理解非阻塞 socket 与 `selectors` 如何构成简化事件循环。
- 用 asyncio 构建可同时处理多个连接的 echo server。
- 保证连接处理任务的异常可见，资源必定清理。
- 通过信号、停止接入、等待在途任务实现优雅停机。

## 章节地图

1. **3.1 阻塞 socket**：`accept()`、`recv()` 会等待，直观但一次只能推进当前连接。
2. **3.2 用 Telnet 连接**：从客户端测试读写；单连接循环暴露阻塞危险。
3. **3.3 非阻塞 socket**：未就绪时立即失败，应用必须稍后重试。
4. **3.4 selectors 自制 socket 事件循环**：让操作系统通知可读/可写描述符，而非忙轮询。
5. **3.5 asyncio echo server**：事件循环的 socket 协程、服务器设计与 Task 异常处理。
6. **3.6 优雅停机**：监听系统信号，停止接受新连接，取消或等待 pending tasks。

## 概念精讲

### 3.1 阻塞 socket 的生命周期

TCP 服务端通常执行 `socket()`、`bind()`、`listen()`、`accept()`。`accept()` 返回每个客户端专属的新 socket；监听 socket 继续接受后续连接。连接上用 `recv()` 读取字节，用 `sendall()` 写回。TCP 是字节流，不保留消息边界：一次 `send` 不保证对应一次 `recv`，应用必须自行规定换行、长度前缀等协议帧。

阻塞模式易于理解，但服务端若在客户端 A 的 `recv()` 等待，客户端 B 即使已连接也得不到处理。可以为每个连接建线程或进程，但本章的目标是用一个线程管理多个 socket。

### 3.2 Telnet、读写与多连接危险

Telnet（或 `nc`）可建立交互 TCP 连接，适合手工验证 echo 协议：输入一行，服务器原样返回。它也揭示三个事实：连接可长时间保持；客户端可随时断开；`recv()` 返回 `b""` 表示对端有序关闭，而非“暂时没有数据”。生产协议还要考虑编码、半包、粘包、最大消息长度和恶意慢客户端。

### 3.3 非阻塞 socket

调用 `sock.setblocking(False)` 后，`accept`/`recv`/`send` 在暂不可完成时抛 `BlockingIOError`，线程得以处理别的连接。直接在循环中不断重试会形成 busy loop。正确方向是登记“我关心该 socket 可读/可写”，然后睡眠到操作系统报告状态变化。

非阻塞写也可能只写入部分字节；必须保存剩余缓冲，并在可写时继续。高层 asyncio Streams 的 `writer.write()` + `await writer.drain()` 封装了缓冲与背压。

### 3.4 selectors：事件循环的缩影

`selectors.DefaultSelector` 会选择当前平台高效实现。程序给监听 socket 注册 `EVENT_READ`；就绪后接受连接，再给客户端 socket 注册读事件。`selector.select()` 返回 `(key, mask)`，程序调用 key 中保存的回调。回调应短小、不得阻塞，否则所有连接都延迟。

这已具备事件循环骨架：注册兴趣、阻塞等待一批事件、分派回调、修改或注销兴趣。真正的 asyncio 还管理定时器、线程安全唤醒、任务/Future、取消和异常上下文。

### 3.5 asyncio echo server

原书从低层 `loop.sock_accept()`、`loop.sock_recv()`、`loop.sock_sendall()` 展示 socket 如何成为可等待操作。每接受一个连接就创建处理任务；当该任务等待输入时，acceptor 和其他连接任务可继续。

应用层通常优先 `asyncio.start_server()`：回调收到 `StreamReader`/`StreamWriter`。`readline()` 处理换行协议，`write()` 写入内存缓冲，`drain()` 在高水位时提供背压。关闭必须调用 `writer.close()` 并 `await writer.wait_closed()`。

创建任务后若无人等待，其异常可能直到垃圾回收才报告。可把任务放入集合并在 done callback 中移除、读取异常；更现代的方式是让所有连接任务处于明确的服务作用域中。服务器通常是长生命周期组件，连接任务还需要独立失败，不应因一个客户端协议错误关闭整个服务，因此要在连接边界捕获并记录预期异常。

### 3.6 优雅停机

停机顺序比“取消所有任务”更重要：

1. 收到 `SIGINT`/`SIGTERM` 后设置 shutdown event。
2. 关闭监听服务器，停止接入新连接，并 `await server.wait_closed()`。
3. 通知在途连接完成，或在宽限期后取消。
4. 等待任务的 `finally` 关闭 writer。
5. 最后退出顶层 runner。

不要取消 `asyncio.current_task()`，也不要无差别取消宿主框架任务。Windows 对 `loop.add_signal_handler()` 的支持有限；跨平台程序可让 `KeyboardInterrupt` 在 runner 外触发停机，或使用平台专用方案。

## 关键API

| API | 作用 | 边界 |
|---|---|---|
| `socket.setblocking(False)` | 切换非阻塞模式 | 低层 asyncio socket API 的前提 |
| `selectors.DefaultSelector()` | 跨平台等待描述符就绪 | 回调必须非阻塞并管理读写缓冲 |
| `loop.sock_accept(sock)` | 异步接受连接 | 返回 `(conn, address)` |
| `loop.sock_recv(sock, n)` | 异步读取最多 n 字节 | `b""` 表示 EOF |
| `asyncio.start_server(cb, host, port)` | 创建高层流服务器 | 返回 `Server`，需关闭并等待关闭 |
| `reader.readline()` | 按换行读取 | 应设置消息大小/超时，默认 limit 可配置 |
| `writer.write()` / `drain()` | 缓冲写与背压等待 | 不能只 write 而永不 drain |
| `loop.add_signal_handler()` | 把 POSIX 信号转成循环回调 | 主线程、平台能力受限 |

## 完整可运行原创示例

以下程序在随机本地端口启动 echo server，同时运行两个内置客户端，然后停止服务器。无需 Telnet、外网或人工中断，Python 3.11+ 可直接执行。

```python
import asyncio
from contextlib import suppress


async def handle_client(
    reader: asyncio.StreamReader,
    writer: asyncio.StreamWriter,
) -> None:
    peer = writer.get_extra_info("peername")
    try:
        async with asyncio.timeout(2.0):
            while data := await reader.readline():
                if len(data) > 1024:
                    raise ValueError("消息过长")
                writer.write(b"echo: " + data)
                await writer.drain()
    except TimeoutError:
        print(f"{peer} 连接处理超时")
    except (ConnectionError, ValueError) as exc:
        print(f"{peer} 连接结束: {exc}")
    finally:
        writer.close()
        with suppress(ConnectionError):
            await writer.wait_closed()


async def client(port: int, name: str) -> None:
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    try:
        for index in range(2):
            message = f"{name}-{index}\n".encode()
            writer.write(message)
            await writer.drain()
            reply = await reader.readline()
            print(name, reply.decode().rstrip())
            await asyncio.sleep(0.05)
    finally:
        writer.close()
        await writer.wait_closed()


async def main() -> None:
    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    print(f"监听 127.0.0.1:{port}")
    try:
        async with server:
            async with asyncio.TaskGroup() as group:
                group.create_task(client(port, "甲"))
                group.create_task(client(port, "乙"))
    finally:
        server.close()
        await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())
```

这是自结束的教学程序。持续运行的实际服务会在 `async with server` 中等待 shutdown event，而不是客户端组结束即退出。

## 执行流程/时序说明

```text
main       start_server -> 得到随机端口 -> 创建甲/乙客户端 -> 等待客户端 -> 关闭监听
acceptor   接受甲连接 -> 调度 handler甲 -> 接受乙连接 -> 调度 handler乙
handler甲  readline 等待 <- 甲发送 -> write/drain -> 再次 readline
handler乙  readline 等待 <- 乙发送 -> write/drain -> 再次 readline
客户端     各自等待回复时，事件循环可推进另一个客户端和 handler
收尾       客户端关闭 -> handler 读到 EOF -> finally 关闭 writer
```

`start_server` 管理接受连接并调用 handler。handler 返回不代表 writer 自动按应用期望完成清理，因此示例显式关闭。`server.close()` 只停止新连接，现有连接的 handler 生命周期需另行管理。

## 常见错误

- 把 TCP 当作消息队列，假设一次 `recv()` 必然读到一条完整消息。
- 忽略 `recv() == b""` / `readline() == b""`，对已关闭连接无限循环。
- 非阻塞 socket 上 busy polling，CPU 占满却没有有效工作。
- 写入后不 `drain()`，慢客户端导致发送缓冲无限增长，缺少背压。
- handler 没有超时和消息长度限制，容易被慢连接或超大帧耗尽资源。
- 关闭 writer 却不等待 `wait_closed()`，TLS 或缓冲数据可能未完成收尾。
- fire-and-forget 连接任务不读取异常，产生 “Task exception was never retrieved”。
- 收到信号立刻关闭 loop，让任务没有机会运行 `finally`。

## 现代Python补充

- Python 3.11+ 可用 `asyncio.timeout()` 同时覆盖多个读写步骤；原书的 `wait_for(reader..., timeout)` 仍适合仅限制一次读取。
- `TaskGroup` 很适合管理有限批客户端或服务的子组件。对无限期接受的连接，可在服务作用域维护任务集合，停机时停止接入、限时等待、再取消剩余任务；不能让一个不可信客户端异常无条件击倒整个 TaskGroup。
- `asyncio.Runner` 可让程序在统一上下文中注册信号并运行主协程，免去手动 `loop.run_forever()`、收集 pending tasks、`shutdown_asyncgens()` 和 `close()` 的大部分样板。
- 高层 Streams 更适合常规 TCP 应用；低层 socket 方法和 Protocol/Transport 适合需要已有 socket、定制协议或精确控制分配的场景。
- Python 3.11 的 `asyncio.Runner.run()` 可接收自定义 signal handling 的顶层设计，但 POSIX 信号处理仍必须考虑主线程和平台。

## 实践清单

- [ ] 明确定义帧协议、编码、最大消息长度和 EOF 行为。
- [ ] 每次网络等待都有空闲超时或总期限。
- [ ] 每次写入都考虑 `drain()` 背压。
- [ ] 每个连接都在 `finally` 关闭 writer 并等待关闭。
- [ ] 限制并发连接数、每连接缓冲和每客户端速率。
- [ ] 任务异常进入日志或由父作用域获取，不依赖垃圾回收告警。
- [ ] 停机先停止接入，再等待/取消在途工作，最后关闭 loop。
- [ ] 用断连、半包、慢读、慢写、超长消息和信号测试服务。

## 复习题

1. 监听 socket 与 `accept()` 返回的连接 socket 分别负责什么？
2. 为什么 TCP 不能假设发送次数等于接收次数？
3. 非阻塞 socket 与 selector 分别解决什么问题？
4. `writer.write()` 后为什么还要 `await writer.drain()`？
5. 后台 Task 的异常无人获取会有什么表现？如何建立所有权？
6. 优雅停机为什么必须先停止接受新连接？
7. `server.close()` 会不会自动终止现有 handler？

## 与前后章链接

- 系列索引：[Python asyncio并发编程读书笔记](/kb/language/Python/异步处理/00-Python-asyncio并发编程读书笔记/)
- 上一章：[第2章 asyncio 基础](/kb/language/Python/异步处理/02-第2章-asyncio-基础/)
- 下一章：[第4章 并发 Web 请求](/kb/language/Python/异步处理/04-第4章-并发-Web-请求/)

## 原书/官方资料

- Matthew Fowler, *Python Concurrency with asyncio*, Manning, 2022，第 3 章 “A first asyncio application”。
- [Manning 第 3 章目录与简介](https://www.manning.com/preview/python-concurrency-with-asyncio/chapter-3)
- [Python 官方文档：Streams](https://docs.python.org/3/library/asyncio-stream.html)
- [Python 官方文档：Event Loop 的 socket 方法](https://docs.python.org/3/library/asyncio-eventloop.html#working-with-socket-objects-directly)
- [Python 官方文档：selectors](https://docs.python.org/3/library/selectors.html)
