---
title: "第2章 asyncio 基础"
permalink: /kb/language/Python/异步处理/02-第2章-asyncio-基础/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "第1章 认识 asyncio", link: /kb/language/Python/异步处理/01-第1章-认识-asyncio/ }
next: { text: "第3章 第一个 asyncio 应用", link: /kb/language/Python/异步处理/03-第3章-第一个-asyncio-应用/ }
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
::: info 阅读定位
本笔记对应原书第 2 章，从协程对象一路连接到 Task、Future、取消、超时和事件循环，并标出 Python 3.11+ 的结构化并发写法。
:::

## 本章目标

- 用 `async def` 定义协程，用 `await` 表达暂停点和依赖关系。
- 理解“调用协程函数”“创建任务”“等待结果”是三个不同动作。
- 正确取消任务、设置超时并完成清理。
- 理清 coroutine、Task、Future、awaitable 的关系。
- 发现 CPU 密集代码和阻塞 API 对事件循环的破坏。
- 理解原书手动管理 loop 的方式与 `asyncio.run()`、`Runner` 的关系。

## 章节地图

1. **2.1 协程入门**：`async def` 产生协程函数，调用后得到协程对象；`await` 暂停当前协程。
2. **2.2 用 sleep 表示长操作**：`asyncio.sleep()` 模拟可让出控制权的等待。
3. **2.3 Task 实现并发**：任务把协程注册到事件循环，多个任务在暂停点交错推进。
4. **2.4 取消与超时**：`cancel()` 注入取消，`wait_for()` 用期限触发取消。
5. **2.5 Task、协程、Future 与 awaitable**：Future 是低层结果占位符，Task 是驱动协程的 Future 子类。
6. **2.6 装饰器计时**：以异步装饰器测量协程墙钟时间，并保留函数元数据。
7. **2.7 协程与任务陷阱**：CPU 工作、阻塞 API、遗失任务和未取异常。
8. **2.8 访问和手动管理事件循环**：理解底层生命周期，但应用入口优先高层 Runner。

## 概念精讲

### 2.1 async、await 与协程对象

调用普通函数会立即执行函数体；调用 `async def` 函数只创建一个 coroutine 对象，函数体尚未开始。它必须被 `await`、包装成 Task，或交给顶层 runner 才会运行。忘记等待通常产生 `RuntimeWarning: coroutine was never awaited`。

`await expression` 要求表达式可等待。当前协程暂停，把控制权交给事件循环；awaitable 完成后，当前协程从原处恢复并取得结果或异常。连续写 `await a(); await b()` 仍是顺序依赖，并不会自动并发。

### 2.2 非阻塞 sleep

`asyncio.sleep()` 安排定时器并暂停当前任务，不占住事件循环线程。`time.sleep()` 则阻塞调用线程。原书用 sleep 建立可重复的时间模型，真实项目中暂停点通常来自 socket、HTTP 或异步数据库驱动。

### 2.3 Task 与并发

`asyncio.create_task(coro)` 将协程包装为 Task 并安排尽快运行，调用者可继续创建其他任务。任务保存执行状态、结果和异常。只创建裸协程列表不会启动并发。

任务应有明确作用域。若函数创建后台任务后丢弃引用，任务可能在入口退出时被取消，异常也可能变成“Task exception was never retrieved”。Python 3.11+ 的 `TaskGroup` 把子任务生命周期绑定到代码块：正常退出等待全部完成，任一非取消异常会取消其余任务。

### 2.4 取消与超时

`task.cancel()` 是请求，不是强制终止线程。事件循环在任务下一次获得执行机会时，于挂起的 `await` 处抛出 `asyncio.CancelledError`。协程应通过 `finally` 释放资源；如果捕获取消，清理后通常要重新抛出。吞掉取消会破坏 `TaskGroup`、timeout 等依赖取消的控制结构。

原书使用 `asyncio.wait_for(awaitable, timeout)`。期限到达后，它向目标请求取消并等待目标结束，所以实际返回可能略晚于期限。目标因这次取消结束时，`wait_for()` 抛出内置 `TimeoutError`；如果目标压制取消并正常返回，`wait_for()` 会返回该结果；如果取消清理抛出其他异常，则传播该异常。`asyncio.shield()` 可保护内层任务不随外层取消，但必须保留任务引用，且应谨慎使用。

### 2.5 Future、Task、coroutine、awaitable

- **coroutine function**：由 `async def` 定义的函数。
- **coroutine object**：调用协程函数得到的惰性执行对象。
- **Future**：事件循环世界里的单次结果占位符，可处于 pending、finished 或 cancelled；应用代码很少手工创建。
- **Task**：Future 的子类，负责逐步驱动一个协程，因此既可等待也可查询结果。
- **awaitable**：协议类别，coroutine、Task 和 Future 都可用于 `await`。

Future 常作为回调式底层 API 与 `async`/`await` 之间的桥。不要在业务代码中随意 `set_result()` 一个 Task。

### 2.6 异步计时装饰器

异步装饰器的 wrapper 自身也必须是 `async def`，并 `await` 被包装函数。计时应使用单调时钟 `time.perf_counter()`，避免系统时钟校准造成倒退。`functools.wraps()` 保留名称、文档和类型工具需要的元数据。墙钟时间包含等待时间，不能当作 CPU 时间。

### 2.7 阻塞陷阱

协程只有在遇到真正会暂停的 `await` 时才让出循环。纯 CPU 循环即使位于 `async def` 中，也会独占线程。同步 `requests.get()`、同步数据库调用和 `time.sleep()` 同样冻结所有任务。

短暂、可控的计算可直接执行；阻塞 I/O 可用 `await asyncio.to_thread(...)` 过渡；纯 Python 重计算通常使用进程池。最佳方案仍是选择原生异步库，因为线程包装无法提供完整的异步取消语义。

### 2.8 事件循环生命周期

原书展示 `asyncio.new_event_loop()`、`loop.run_until_complete()` 与 `loop.close()`，有助于理解入口实际做了什么。手动模式必须处理异步生成器、默认执行器、遗留任务和关闭顺序，很容易遗漏。现代应用脚本优先 `asyncio.run()`；需要同一循环连续运行多个顶层调用时使用 `asyncio.Runner`。库函数不应自行启动或关闭调用方的循环。

## 关键API

| API | 语义 | 使用建议 |
|---|---|---|
| `asyncio.run(coro, debug=False)` | 完整运行一次异步入口 | 脚本首选 |
| `await x` | 暂停当前协程直到 `x` 完成 | 表达依赖，不自动产生并发 |
| `asyncio.create_task(coro, name=...)` | 调度协程并返回 Task | 保存引用并最终等待 |
| `asyncio.TaskGroup()` | 有作用域的子任务组 | 3.11+ 并发任务首选基线 |
| `Task.cancel()` | 请求在任务中注入取消 | 清理依赖 `try/finally` |
| `asyncio.wait_for(aw, timeout)` | 给单个 awaitable 限时 | 原书核心 API，今天仍有效 |
| `asyncio.timeout(delay)` | 给一段当前任务的异步代码限时 | 3.11+，便于覆盖多个 await |
| `asyncio.shield(aw)` | 隔离内层 awaitable 与调用方取消 | 只用于明确必须继续的工作 |
| `asyncio.get_running_loop()` | 获取当前运行循环 | 协程内首选 |
| `asyncio.Runner()` | 显式持有高层循环上下文 | 多次顶层 `run()` 或框架集成 |

## 完整可运行原创示例

示例展示 TaskGroup、整体期限、局部清理和异步计时装饰器。Python 3.11+ 无第三方依赖。

```python
import asyncio
from functools import wraps
from time import perf_counter
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")


def timed(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
    @wraps(func)
    async def wrapper(*args: object, **kwargs: object) -> T:
        started = perf_counter()
        try:
            return await func(*args, **kwargs)
        finally:
            print(f"{func.__name__} 用时 {perf_counter() - started:.2f}s")
    return wrapper


async def job(name: str, delay: float) -> str:
    try:
        print(f"{name} 开始")
        await asyncio.sleep(delay)
        return f"{name} 完成"
    finally:
        print(f"{name} 清理")


@timed
async def run_batch() -> list[str]:
    tasks: list[asyncio.Task[str]] = []
    try:
        async with asyncio.timeout(0.35):
            async with asyncio.TaskGroup() as group:
                for name, delay in (("A", 0.10), ("B", 0.20), ("C", 0.60)):
                    tasks.append(group.create_task(job(name, delay), name=name))
    except TimeoutError:
        print("批次超时；TaskGroup 已等待子任务完成取消清理")

    return [task.result() for task in tasks if not task.cancelled()]


async def main() -> None:
    print(await run_batch())


if __name__ == "__main__":
    asyncio.run(main(), debug=True)
```

输出中 A、B 正常完成，C 在约 0.35 秒被取消但仍执行 `finally`；最终结果只收集未取消任务。

## 执行流程/时序说明

```text
0.00  main -> run_batch -> 进入 0.35s timeout -> 进入 TaskGroup
0.00  A/B/C 三个 Task 被调度，各自 sleep，run_batch 在组出口等待
0.10  A 恢复、返回、执行 finally
0.20  B 恢复、返回、执行 finally
0.35  timeout 取消 run_batch；取消传播到 TaskGroup，再到仍挂起的 C
0.35  C 收到 CancelledError，先执行 finally；TaskGroup 确认子任务结束
0.35  timeout 将自身触发的取消转换为可在上下文外捕获的 TimeoutError
```

取消是沿任务树传播的控制流，不是立即销毁对象。清理代码若包含异步操作，也必须设计自己的上限，避免取消迟迟无法结束。

## 常见错误

- 调用 `worker()` 后既不 `await` 也不建 Task，导致协程从未运行。
- 以为连续两个 `await` 会并发；第二项只会在第一项结束后开始。
- 创建 Task 后丢掉引用或不等待，在程序退出时留下遗留任务和未读取异常。
- 捕获 `CancelledError` 后不重新抛出，使超时和 TaskGroup 无法按语义结束。它从 `BaseException` 继承，普通 `except Exception` 不会捕获。
- 在 `finally` 中执行无期限清理，令 `wait_for()` 实际等待时间远超 timeout。
- 对协程对象重复 `await`；协程只能运行一次，需要共享结果时应创建并等待同一个 Task。
- 在 Jupyter、ASGI 等已有循环的环境内调用 `asyncio.run()`；应直接 `await`，或使用宿主提供的生命周期。
- 在协程里使用同步阻塞 API，debug 模式也只能帮助发现慢回调，不能自动修复。

## 现代Python补充

- **`wait_for()` 与 `asyncio.timeout()`**：前者面向一个 awaitable，必要时会自动把 coroutine 包装为 Task；后者取消当前任务，适合给一整段操作设截止时间并可通过 `timeout_at()` 使用绝对期限。不要在每层都随意叠加不一致的超时。
- **TaskGroup 与手工 Task 列表**：TaskGroup 解决“子任务归谁管”和失败传播；若要求部分成功、按完成顺序消费或自定义取消策略，仍可使用 `gather()`、`as_completed()`、`wait()`，但必须显式收尾所有任务。
- **Runner 与 manual loop**：`Runner` 管理 loop 创建、上下文变量、异步生成器和默认执行器关闭。只有实现框架、特殊事件循环策略或低层集成时，才通常需要直接调用 loop 生命周期方法。
- 任务可命名，配合 `asyncio.all_tasks()`、debug 模式和日志中的 task name 提升可观测性。

## 实践清单

- [ ] 每个协程对象最终都被等待或转成受管理任务。
- [ ] 用 TaskGroup 或等价作用域管理子任务。
- [ ] 在资源持有处使用 `async with` 或 `try/finally`。
- [ ] 超时后确认取消已传播并完成清理。
- [ ] 将阻塞 I/O 隔离到线程，将重 CPU 工作隔离到进程或专用系统。
- [ ] 开发和测试阶段启用 asyncio debug，并检查“never awaited/never retrieved”。
- [ ] 使用单调时钟度量耗时，区分墙钟时间和 CPU 时间。

## 复习题

1. 调用 `async def` 函数时为什么函数体没有立即执行？
2. Task 与 Future 的关系是什么？为什么应用层通常不手工创建 Future？
3. `cancel()` 为什么只是请求？取消代码必须在哪些位置清理？
4. `wait_for()` 和 `asyncio.timeout()` 分别更适合什么范围？
5. 为什么 `async def crunch(): ...大量计算...` 会阻塞其他协程？
6. TaskGroup 中一个子任务失败时，兄弟任务和调用者会发生什么？
7. `Runner` 比手动 `run_until_complete()` 多管理了哪些生命周期问题？

## 与前后章链接

- 系列索引：[Python asyncio并发编程读书笔记](/kb/language/Python/异步处理/00-Python-asyncio并发编程读书笔记/)
- 上一章：[第1章 认识 asyncio](/kb/language/Python/异步处理/01-第1章-认识-asyncio/)
- 下一章：[第3章 第一个 asyncio 应用](/kb/language/Python/异步处理/03-第3章-第一个-asyncio-应用/)

## 原书/官方资料

- Matthew Fowler, *Python Concurrency with asyncio*, Manning, 2022，第 2 章 “asyncio basics”。
- [Manning 第 2 章目录与简介](https://www.manning.com/preview/python-concurrency-with-asyncio/chapter-2)
- [Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html)
- [Runners](https://docs.python.org/3/library/asyncio-runner.html)
- [Developing with asyncio](https://docs.python.org/3/library/asyncio-dev.html)
