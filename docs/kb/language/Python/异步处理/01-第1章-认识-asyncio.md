---
title: "第1章 认识 asyncio"
permalink: /kb/language/Python/异步处理/01-第1章-认识-asyncio/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "《Python asyncio 并发编程》读书笔记", link: /kb/language/Python/异步处理/00-Python-asyncio并发编程读书笔记/ }
next: { text: "第2章 asyncio 基础", link: /kb/language/Python/异步处理/02-第2章-asyncio-基础/ }
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
::: info 阅读定位
本笔记对应 Matthew Fowler《Python Concurrency with asyncio》第 1 章。重点不是背 API，而是建立判断模型：工作在等待什么、并发是否有益、事件循环为何能让单线程同时推进许多 I/O。
:::

## 本章目标

- 区分 I/O 密集型与 CPU 密集型工作，并为它们选择合适的并发工具。
- 准确区分并发、并行、多任务、进程和线程。
- 理解 GIL 的限制、释放时机，以及它与 `asyncio` 的关系。
- 从阻塞 socket 推导非阻塞 socket、就绪通知和事件循环。
- 认识协作式多任务的性能优势与纪律要求。

## 章节地图

1. **1.1 什么是 asyncio**：标准库中的异步 I/O 框架，以事件循环调度协程。
2. **1.2 I/O 密集与 CPU 密集**：先识别瓶颈，再谈并发方式。
3. **1.3 并发、并行与多任务**：并发是时间段内推进多个工作，并行是同一时刻执行多个工作；`asyncio` 使用协作式多任务。
4. **1.4 进程与线程**：进程隔离强、成本高；线程共享内存、同步复杂。
5. **1.5 GIL**：常规 CPython 中同一解释器一次通常只有一个线程执行 Python 字节码，但阻塞 I/O 和部分扩展会释放锁。
6. **1.6 单线程并发**：socket 切换到非阻塞模式后，程序不必停在一次读写上。
7. **1.7 事件循环**：注册关注的 I/O，等待就绪事件，恢复对应工作，循环往复。

## 概念精讲

### 1.1 asyncio 是什么

`asyncio` 同时提供两层能力：高层的协程、任务、队列、流和同步原语，以及低层的事件循环、传输协议和 socket 接口。它特别适合网络调用、数据库访问、消息消费等**等待时间远大于少量 Python 计算时间**的场景。

异步不会使单次 I/O 本身变快。收益来自把任务 A 的等待窗口让给任务 B 使用，从而提高吞吐量、降低一批独立操作的总耗时，并让服务在等待外部系统时仍能响应其他连接。

### 1.2 I/O 密集型与 CPU 密集型

- **I/O 密集型**：大部分墙钟时间耗在网络、磁盘、数据库或用户输入上。非阻塞驱动配合 `asyncio` 往往有效。
- **CPU 密集型**：大部分时间用于压缩、加密、图像处理或纯 Python 数值循环。仅把函数写成 `async def` 不会加速；长计算还会阻塞事件循环。
- **混合负载**：异步管理 I/O，把短小计算留在循环线程；重计算交给进程池、原生释放 GIL 的库，或拆到独立服务。

判断应基于测量，而非函数名。一次数据库调用也可能因客户端反序列化大量记录而转为 CPU 瓶颈。

### 1.3 并发、并行与多任务

- **并发（concurrency）**描述结构：多个工作在重叠的时间范围内取得进展，不要求同时执行。
- **并行（parallelism）**描述执行：多个工作在同一物理时刻运行，通常需要多核、多进程或释放 GIL 的原生代码。
- **抢占式多任务**由操作系统决定线程何时被切走；切换点不可预测，共享状态需要锁。
- **协作式多任务**由协程在 `await` 处主动交还控制权。切换成本低、临界区更容易推理，但任何协程若长时间不让出控制权，所有其他任务都会挨饿。

并发并不自动意味着更快。创建任务、保存状态、系统调用、排队和远端限流都有成本；彼此依赖的操作也不能盲目并发。

### 1.4 进程与线程

进程拥有独立地址空间、至少一个主线程和操作系统资源。多进程能利用多个 CPU 核并隔离故障，但启动、进程间通信和数据序列化成本较高。

同一进程内的线程共享堆与文件描述符，通信方便且适合包装某些阻塞 I/O；代价是竞态、死锁和线程切换。`asyncio` 通常在一个线程运行一个事件循环，以任务而不是线程承载大量等待中的工作。三者不是互斥选择：异步应用也可通过 `asyncio.to_thread()` 调用阻塞函数，或通过执行器使用进程。

### 1.5 GIL 与 asyncio

传统 CPython 的全局解释器锁（GIL）保护解释器内部状态，使多个线程不能同时执行同一解释器中的 Python 字节码。因此，纯 Python CPU 密集线程通常不能随核心数线性加速。线程等待网络/文件 I/O 时会释放 GIL；NumPy 等扩展也可能在原生计算期间释放它。

`asyncio` 不靠绕过 GIL 实现并行，而是避免在等待 I/O 时占住线程。事件循环中的 Python 回调仍受 GIL 约束，所以 CPU 密集协程照样会冻结整个循环。Python 3.13 起存在自由线程构建等新方向，但部署时必须以实际解释器、扩展兼容性和基准测试为准；本书及常规 3.11/3.12 运行模型仍以 GIL 版 CPython 为基础。

### 1.6 非阻塞 socket 如何形成单线程并发

阻塞 `recv()` 在没有数据时让调用线程睡眠。若每个客户端配一个线程，连接很多时线程栈和调度成本随之增加。非阻塞 socket 则立即返回数据，或以 `BlockingIOError` 表示“现在还不能做”，程序可以转去服务其他连接。

反复轮询所有 socket 会浪费 CPU。更好的方式是让操作系统的 I/O 多路复用设施（如 `select`、`poll`、`kqueue`、`epoll`）报告哪些描述符已经可读或可写。一个线程便能监管大量连接。

### 1.7 事件循环如何工作

事件循环可抽象为：

1. 取出到期的定时器和已排队回调并执行。
2. 计算下一次定时器到期前最多可等待多久。
3. 请求操作系统等待 I/O 就绪。
4. 把就绪 socket 对应的任务放回可运行队列。
5. 任务运行到完成、异常或下一个 `await`，再重复上述过程。

任务不是在任意指令间被抢占，而是在明确的暂停点切换。这降低了部分共享状态风险，却不等于没有竞态：若“读取、`await`、写回”跨越暂停点，其他任务仍可能插入。

## 关键API

| API | 用途 | 注意点 |
|---|---|---|
| `asyncio.run(coro)` | 创建事件循环、运行入口、清理异步生成器并关闭循环 | 普通脚本首选；不能在已运行的循环内再次调用 |
| `asyncio.create_task(coro)` | 将协程安排为并发任务 | 保存引用，并明确等待、取消和异常处理 |
| `asyncio.sleep(delay)` | 非阻塞地等待并让出循环 | 与 `time.sleep()` 的阻塞行为相反 |
| `asyncio.get_running_loop()` | 在协程/回调内取得当前循环 | 比旧式 `get_event_loop()` 语义明确 |
| `loop.sock_recv()` / `sock_sendall()` | 在非阻塞 socket 上异步收发 | socket 必须设为非阻塞；高层应用通常优先 Streams |
| `asyncio.to_thread(func, ...)` | 把阻塞函数放入线程，避免卡住循环 | 主要用于 I/O；不保证纯 Python CPU 并行 |

## 完整可运行原创示例

下面用三项“模拟 I/O”比较顺序等待与并发等待。它不依赖外网，Python 3.11+ 可直接运行。

```python
import asyncio
from time import perf_counter


async def fetch_sensor(name: str, delay: float) -> tuple[str, float]:
    print(f"{name}: 发起读取")
    await asyncio.sleep(delay)  # 代表 socket 尚未就绪，控制权交回事件循环
    print(f"{name}: 数据就绪")
    return name, delay


async def sequential() -> list[tuple[str, float]]:
    return [
        await fetch_sensor("温度", 0.30),
        await fetch_sensor("湿度", 0.20),
        await fetch_sensor("气压", 0.10),
    ]


async def concurrent() -> list[tuple[str, float]]:
    async with asyncio.TaskGroup() as group:
        tasks = [
            group.create_task(fetch_sensor("温度", 0.30)),
            group.create_task(fetch_sensor("湿度", 0.20)),
            group.create_task(fetch_sensor("气压", 0.10)),
        ]
    return [task.result() for task in tasks]


async def main() -> None:
    for label, operation in (("顺序", sequential), ("并发", concurrent)):
        started = perf_counter()
        result = await operation()
        elapsed = perf_counter() - started
        print(f"{label}: {result}，耗时 {elapsed:.2f}s\n")


if __name__ == "__main__":
    asyncio.run(main())
```

预期顺序版本约为 `0.60s`，并发版本约为最长单项的 `0.30s`。这不是三个 `sleep` 在三个核心并行执行，而是三个计时等待重叠。

## 执行流程/时序说明

```text
main        创建 TaskGroup ───────────────────────────── 等待组退出
温度任务    运行 -> sleep(0.30) -----------------------> 恢复 -> 完成
湿度任务    运行 -> sleep(0.20) ---------------> 恢复 -> 完成
气压任务    运行 -> sleep(0.10) -------> 恢复 -> 完成
事件循环    安排三任务 -> 等待最近定时器 -> 唤醒气压 -> 湿度 -> 温度
时间        0.00              0.10          0.20          0.30
```

`TaskGroup` 退出前保证所有子任务都已结束；结果列表按任务创建顺序读取，而不是完成顺序。

## 常见错误

- 把“异步”等同于“多线程”或“多核并行”。默认事件循环通常只在一个线程执行 Python 代码。
- 在协程中调用 `time.sleep()`、同步 HTTP 客户端或同步数据库驱动，导致整个循环停住。
- 认为加上 `async def` 就能加速 CPU 循环；没有 `await` 的长协程会独占循环。
- 无限创建任务，把并发变成对文件描述符、内存、远端 API 或数据库的洪泛。
- 认为单线程没有竞态；跨 `await` 的共享状态更新仍需锁、队列或所有权设计。
- 把低延迟和高吞吐混为一谈；并发可能提高批量吞吐，也可能因排队增加单项尾延迟。

## 现代Python补充

- Python 3.11 的 `asyncio.TaskGroup` 提供结构化并发：首个非 `CancelledError` 失败会取消同组兄弟并等待清理；普通异常通常聚合为 `ExceptionGroup`，包含其他基础异常时可能是 `BaseExceptionGroup`，`KeyboardInterrupt` 和 `SystemExit` 另有原样重抛规则。它是后续章节中手工保存任务列表的现代首选，但不取代需要“按完成顺序处理”的 `as_completed()` 或细粒度状态观察的 `wait()`。
- `asyncio.timeout()`（3.11+）是异步上下文管理器，可为一段包含多个 `await` 的逻辑设置期限；`wait_for()` 仍适合包住单个 awaitable，二者都会通过取消实现超时。
- `asyncio.Runner`（3.11+）适合在同一显式循环上下文中运行多个顶层协程；一次性程序仍优先 `asyncio.run()`。它取代大多数手动 `new_event_loop()` / `run_until_complete()` 样板，而非取代事件循环本身。
- 用 `PYTHONASYNCIODEBUG=1`、`asyncio.run(main(), debug=True)` 或 Runner 的 `debug=True` 检测慢回调、未等待协程和资源问题。

## 实践清单

- [ ] 先用剖析或指标确认瓶颈属于等待、Python 计算还是外部容量。
- [ ] 只在异步调用链中使用非阻塞客户端/驱动。
- [ ] 给外部 I/O 设置超时，并给并发量设置上界。
- [ ] 不在事件循环线程执行不可控的阻塞调用或长 CPU 运算。
- [ ] 让创建的每个任务都有清晰的所有者、生命周期和异常去向。
- [ ] 压测平均延迟、尾延迟、吞吐、内存和下游错误率，而不只比较总耗时。

## 复习题

1. 并发与并行的必要条件分别是什么？单线程事件循环属于哪一种？
2. 为什么三个网络请求并发后总耗时通常接近最慢请求，而不是三者之和？
3. GIL 为什么限制纯 Python CPU 线程，却不妨碍 `asyncio` 重叠网络等待？
4. 非阻塞 socket 若没有 selector，会遇到什么效率问题？
5. 协作式调度的主要优势和主要风险各是什么？
6. 一个异步服务中哪些工作适合移入线程，哪些更适合移入进程？

## 与前后章链接

- 系列索引：[Python asyncio并发编程读书笔记](/kb/language/Python/异步处理/00-Python-asyncio并发编程读书笔记/)
- 下一章：[第2章 asyncio 基础](/kb/language/Python/异步处理/02-第2章-asyncio-基础/)

## 原书/官方资料

- Matthew Fowler, *Python Concurrency with asyncio*, Manning, 2022，第 1 章 “Getting to know asyncio”。
- [Manning 第 1 章目录与简介](https://www.manning.com/preview/python-concurrency-with-asyncio/chapter-1)
- [Python 官方文档：asyncio](https://docs.python.org/3/library/asyncio.html)
- [Python 官方文档：并发执行](https://docs.python.org/3/library/concurrency.html)
- [Python 官方文档：socket](https://docs.python.org/3/library/socket.html)
