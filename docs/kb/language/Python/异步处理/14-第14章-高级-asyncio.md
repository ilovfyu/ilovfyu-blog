---
title: "第 14 章：高级 asyncio"
permalink: /kb/language/Python/异步处理/14-第14章-高级-asyncio/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "第 13 章：管理子进程", link: /kb/language/Python/异步处理/13-第13章-管理子进程/ }
next: { text: "现代 asyncio 补遗", link: /kb/language/Python/异步处理/15-现代-asyncio-补遗/ }
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
> 对应 Matthew Fowler《Python Concurrency with asyncio》第 14 章。内容以原创模型和示例重新讲解。

## 目标 / 地图

- 为库设计同步/异步双 API，而不嵌套事件循环。
- 用 `contextvars` 保存任务局部上下文；理解 `sleep(0)` 的协作式让出。
- 区分 coroutine、generator、async generator 和 custom awaitable。
- 明确 uvloop 的收益边界；理解自制 loop 仅用于教学，不用于生产。

现代结构化并发统一整理于 [现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/)。

## 概念机制

### 同步/异步双 API

库的核心若天然异步，应以 `async def` 为唯一实现，再提供顶层同步包装器调用 `asyncio.run()`。同步包装器只能供“当前线程没有运行事件循环”的调用方使用；Notebook、ASGI、GUI 等已有循环环境应直接调用异步 API。不要用 `run_until_complete()` 嵌套 loop，也不要为伪兼容偷偷开线程。若需让异步代码调用阻塞函数，使用 `asyncio.to_thread()`，并明确线程安全与取消边界。

### contextvars

全局变量会被并发任务覆盖，`threading.local()` 又只能区分线程。`ContextVar` 的值属于当前上下文；创建任务时上下文会被复制，子任务后续修改不会倒灌父任务。`set()` 返回 token，`reset(token)` 应放在 `finally`，避免请求 ID 泄漏到后续工作。`to_thread()` 会传播当前上下文，低层 executor 组合则应核对版本语义。

### sleep(0)

`await asyncio.sleep(0)` 走优化路径，主动让其他就绪任务获得机会。它不是实时调度承诺，也不修复阻塞调用；CPU 长循环应分块或移出线程/进程。过度插入会增加调度成本，并掩盖错误的工作划分。

### 可等待对象谱系

调用 coroutine function 得到 coroutine object，它必须被 await 或调度。普通 generator 通过 `yield` 产值、`next()` 驱动；async generator 通过 `async for` 驱动，不能直接 `await`。实现 `__await__()` 的对象是 custom awaitable，其方法必须返回迭代器，通常委托现有 coroutine 的 `.__await__()`。手写 awaitable 适合框架适配，业务代码更应返回 coroutine/Future。

事件循环本质上管理就绪队列、计时器与 I/O 多路复用，并驱动 coroutine 每次前进到下一个暂停点。自制 loop 能解释协议，却缺少线程安全、取消、I/O、公平性、调试与关闭语义，仅用于教学。

### 异步迭代与异步上下文协议

异步迭代器的 `__aiter__()` 返回异步迭代器，`__anext__()` 返回 awaitable；序列结束时抛出 `StopAsyncIteration`。异步生成器通常比手写协议更简洁，并能在每次 `yield` 之间等待 I/O。消费者提前退出时，应通过 `contextlib.aclosing()` 或明确的资源作用域及时关闭生成器，不能只等进程退出清理。

异步上下文管理器的 `__aenter__()` 和 `__aexit__()` 都可等待，适合连接、事务、锁和临时后台任务等需要异步建立/清理的资源。简单资源管理器优先使用 `contextlib.asynccontextmanager()`；无论正常返回、异常还是取消，`finally` 都必须恢复资源不变量。

```python
from contextlib import asynccontextmanager


@asynccontextmanager
async def managed_connection():
    connection = await open_connection()
    try:
        yield connection
    finally:
        await connection.close()
```

这里的 `open_connection()`/`close()` 代表库提供的异步资源 API。若清理不能无限等待，应在更外层定义关闭期限，同时保留取消与清理失败的可观测性。

### 任务诊断与事件循环异常

为 Task 设置业务名称后，可通过 `asyncio.current_task()` 和 `asyncio.all_tasks()` 定位所有者不明的后台任务；`task.get_stack()`/`task.print_stack()` 能查看任务停在哪个 await。开发环境开启 debug，并调整 `loop.slow_callback_duration` 观察阻塞 loop 的慢回调。`loop.set_exception_handler()` 可统一记录“Task exception was never retrieved”等循环级问题，但处理器应保留默认上下文并调用 `loop.default_exception_handler(context)`，不能静默吞错。

计时器 API `call_soon()`、`call_later()` 和 `call_at()` 返回可取消的 `Handle`/`TimerHandle`。它们调度的是短小同步回调，不是 coroutine；若要运行协程，应显式创建有所有者的 Task。底层库可使用这些 API，普通业务逻辑通常优先 `await asyncio.sleep()` 和结构化并发。

### uvloop 边界

uvloop 是基于 libuv 的事件循环实现，常改善大量 socket/定时器负载的吞吐与延迟，但不会加速 CPU 算法、数据库服务端或阻塞库；收益需用真实负载基准验证。它受平台和兼容范围约束，不能替代架构、背压与正确关闭。新式代码可把 loop factory 交给 `Runner`，避免旧式全局 policy 依赖。

## API

| API | 用途 |
|---|---|
| `asyncio.run(coro)` | 同步入口创建、运行并关闭循环 |
| `asyncio.to_thread(func, ...)` | 在线程中运行阻塞函数 |
| `ContextVar(name, default=...)` | 声明上下文变量 |
| `var.set()` / `var.reset(token)` | 临时绑定并可靠恢复 |
| `asyncio.sleep(0)` | 主动让出一次执行机会 |
| `obj.__await__()` | 定义 custom awaitable 协议 |
| `asyncio.Runner(loop_factory=...)` | 复用同一循环运行多个顶层调用 |
| `contextlib.asynccontextmanager()` | 用异步生成器定义资源作用域 |
| `asyncio.current_task()` / `all_tasks()` | 查看当前或循环中的未完成任务 |
| `Task.get_stack()` / `print_stack()` | 诊断任务阻塞位置 |
| `loop.set_exception_handler()` | 处理循环级未捕获异常上下文 |
| `loop.call_soon/later/at()` | 安排短小同步回调或定时器 |

## 完整原创可运行示例

例子同时展示双 API、任务上下文隔离、`sleep(0)` 和自定义 awaitable。

```python
import asyncio
from contextvars import ContextVar


request_id = ContextVar("request_id", default="-")


class Checkpoint:
    def __await__(self):
        return asyncio.sleep(0).__await__()


async def fetch_async(label: str) -> str:
    token = request_id.set(label)
    try:
        await Checkpoint()
        await asyncio.sleep(0.01)
        return f"{request_id.get()}:ok"
    finally:
        request_id.reset(token)


def fetch(label: str) -> str:
    """仅供当前线程尚无运行中事件循环的同步调用方。"""
    return asyncio.run(fetch_async(label))


async def async_main() -> None:
    results = await asyncio.gather(fetch_async("A"), fetch_async("B"))
    print(results, "parent context:", request_id.get())


if __name__ == "__main__":
    print("sync:", fetch("sync"))
    asyncio.run(async_main())
```

`fetch()` 与 `fetch_async()` 不应在同一调用链混用：异步环境直接 await 后者。

## 时序

```text
同步 main --asyncio.run--> fetch_async --Checkpoint/sleep(0)--> loop --完成/关闭
异步 main --创建 A/B--> 各复制 context --分别 set/reset--> 父 context 不变
```

coroutine 只有被 await/Task 驱动才运行；generator 则由迭代协议驱动。

## 陷阱

- 在运行中的 loop 内调用 `asyncio.run()`，触发 `RuntimeError` 并产生未等待协程。
- 同步与异步实现复制两套业务逻辑，逐渐行为漂移。
- `ContextVar.set()` 后不 reset，造成同一上下文后续请求污染。
- 把 coroutine object 当结果，或创建后既不 await 也不调度。
- 混淆 async generator 与 awaitable；前者应用 `async for`。
- 用 `sleep(0)` 包装阻塞 CPU/同步 I/O，实际仍阻塞 loop。
- 把 uvloop 当普适加速开关，不做基准和兼容测试。
- 将教学 loop 或脆弱 custom awaitable 投入生产。
- 异步生成器提前退出后不关闭，长期占用连接或文件句柄。
- 自定义异常处理器吞掉默认诊断信息，或在同步 callback 中直接调用 coroutine。

## 现代 Python 补充

- 3.11+ `Runner` 适合需要在同一上下文多次运行顶层异步函数的同步程序；不能嵌套进当前运行 loop。
- 3.11+ 结构化并发优先 `TaskGroup`，不要让双 API 包装破坏任务所有权。
- 3.12 `eager_task_factory` 可能在任务构造时同步执行 coroutine，改变任务顺序、异常时机和性能特征。
- 事件循环 policy 机制逐步淡出；新代码优先显式 `loop_factory`。详见 [现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/)。

## 实践清单

- [ ] 异步实现是唯一核心，同步入口只位于边界。
- [ ] 已有 loop 的环境绝不嵌套 `asyncio.run()`。
- [ ] `ContextVar` 用 token/finally 恢复，并测试子任务隔离。
- [ ] CPU/阻塞 I/O 被真正卸载，而非用 `sleep(0)` 粉饰。
- [ ] custom awaitable、uvloop 均有明确收益与测试。
- [ ] 异步迭代器提前退出时关闭资源，异步上下文的取消路径经过测试。
- [ ] Task 有业务名称和所有者，debug/慢回调/循环异常能进入日志与指标。

## 复习题

1. 为什么同步包装器不能在已有事件循环中调用？
2. `ContextVar` 比全局变量和 thread-local 更适合任务上下文在哪里？
3. `sleep(0)` 能做什么，不能做什么？
4. coroutine、generator、async generator 如何被驱动？
5. uvloop 为什么不能加速 CPU 密集算法？
6. `__anext__()` 如何表示异步序列结束？消费者提前退出时如何释放资源？
7. 如何定位一个长期未完成的 Task 正停在哪个 await？

## 导航和资料

- 上一章：[第13章 管理子进程](/kb/language/Python/异步处理/13-第13章-管理子进程/)
- 下一篇：[现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/)
- Matthew Fowler, *Python Concurrency with asyncio*, Chapter 14, Manning
- [Python：Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html)
- [Python：contextvars](https://docs.python.org/3/library/contextvars.html)
- [uvloop](https://github.com/MagicStack/uvloop)
