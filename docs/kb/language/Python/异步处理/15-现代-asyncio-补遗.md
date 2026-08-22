---
title: "现代 asyncio 补遗"
permalink: /kb/language/Python/异步处理/15-现代-asyncio-补遗/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "第 14 章：高级 asyncio", link: /kb/language/Python/异步处理/14-第14章-高级-asyncio/ }
next: { text: "第 16 章：asyncio 测试与调试", link: /kb/language/Python/异步处理/16-asyncio-测试与调试/ }
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
> 面向 Python 3.11+，补充《Python Concurrency with asyncio》出版后进入标准库的重要能力。版本点以对应 Python 官方文档为准。

## 目标 / 地图

- 3.11：`TaskGroup`、`ExceptionGroup` / `except*`、`timeout()` / `timeout_at()`、`Runner`。
- 3.12：`eager_task_factory` 的性能机会与语义风险。
- 3.13：`Queue.shutdown()`、任务组取消计数改进等适用更新。
- 深入取消：计数、`uncancel()`、`shield()` 和任务弱引用。
- 用迁移表把散装任务改造成结构化并发。

基础原语、队列、子进程、高级机制分别见 [第11章 同步原语](/kb/language/Python/异步处理/11-第11章-同步原语/)、[第12章 异步队列](/kb/language/Python/异步处理/12-第12章-异步队列/)、[第13章 管理子进程](/kb/language/Python/异步处理/13-第13章-管理子进程/)、[第14章 高级 asyncio](/kb/language/Python/异步处理/14-第14章-高级-asyncio/)。

## 概念机制

### TaskGroup 与 ExceptionGroup

`async with TaskGroup()` 建立任务所有权边界。组内首个非取消异常会取消其他任务；退出时等待全部清理，再把多个失败组合成 `ExceptionGroup`（或 `BaseExceptionGroup`）。`except* SomeError` 会从异常树中选择匹配叶子；多个 `except*` 可分别处理不同类型。它不是普通 `except` 的顺序择一语义。

任务组取消子任务来“唤醒”其 `__aexit__`，同时还要区分外部取消。现代实现努力保留 `Task.cancelling()` 计数；3.13 改进了内部/外部取消同时发生时的处理。不要依赖一次 `CancelledError` 就把所有取消请求清零。

### timeout 与绝对期限

`asyncio.timeout(delay)` 是可重调度的异步上下文管理器；到期会取消当前任务，并在上下文外将该取消转换为内置 `TimeoutError`。因此 `TimeoutError` 应在 `async with` 外捕获。`timeout_at(when)` 使用 loop 的单调时钟绝对时刻，适合把同一总预算传过多层，避免每层重新给满额超时。`wait_for()` 适合单个 awaitable；timeout 上下文可覆盖多个 await。

### Runner

`asyncio.run()` 是一次性顶层入口。`Runner` 允许同步程序在同一 loop 和 `contextvars.Context` 中多次 `run()`，并集中关闭异步生成器、executor 和 loop；仍不能在已有运行 loop 的线程里调用。可用 `loop_factory` 显式配置替代全局 policy。

### eager task factory

3.12 的 `eager_task_factory` 让 coroutine 在 `Task` 构造时立刻执行，直到首次阻塞；若同步完成，甚至不进入 loop 队列。缓存命中型 coroutine 可能减少调度成本，但执行顺序、异常出现时机、`all_tasks()` 可见性和公平性都会改变。它是语义变化，不是无风险开关；必须基准测试并审计“create_task 后再初始化”的代码。

### 取消、uncancel 与 shield

`task.cancel()` 提交取消请求；`task.cancelling()` 返回尚未撤销的请求数。协程在暂停点收到 `CancelledError`，应在 `finally` 清理并继续传播。若代码有意吞掉取消，仅捕获异常还不一定清除取消状态；极少数确需彻底抑制的场景才配对调用 `uncancel()`。结构化并发与 timeout 都以取消实现，滥用 `uncancel()` 会破坏其协议。

`shield(aw)` 只保护内部 awaitable 不被“当前等待者的取消”连带取消；外层仍收到 `CancelledError`。内部任务自身取消、直接被别人取消时仍会停止。事件循环只保存 Task 弱引用，所以必须把传给 `shield()` 或后台运行的 Task 存在强引用集合中，并在完成回调里移除；否则它可能执行中被回收。`shield()` 也不是忽略关闭的许可证，调用方仍须决定何时等待或取消内部任务。

### Queue.shutdown

3.13 的 `Queue.shutdown(immediate=False)` 禁止新入队并唤醒被阻塞的生产者；正常模式允许消费者排空已有项目，之后 `get()` 抛 `QueueShutDown`，`join()` 仍遵守未完成计数归零的不变量。`immediate=True` 则立即排空队列、让阻塞的 `get()` 失败，并解除阻塞中的 `join()`，不再要求未完成计数按正常处理流程归零。此时 `join()` 返回不代表每个项目都已处理，仅适合明确允许丢弃积压的紧急关闭。

## API

| 版本 | API | 核心语义 |
|---|---|---|
| 3.11 | `TaskGroup.create_task()` | 任务归组所有，失败联动取消 |
| 3.11 | `ExceptionGroup`, `except*` | 聚合并按叶子类型拆分异常 |
| 3.11 | `timeout()`, `timeout_at()` | 相对超时、绝对 deadline |
| 3.11 | `Runner` | 同步边界复用 loop/context |
| 3.11 | `Task.uncancel()` | 撤销一次取消请求，慎用 |
| 3.12 | `eager_task_factory()` | 创建时同步启动 coroutine |
| 3.13 | `Queue.shutdown()` | 正常排空或立即关闭队列 |
| 3.13 | `TaskGroup` 取消改进 | 更可靠保留取消计数 |

## 完整原创可运行示例

以下示例要求 Python 3.11+。它展示绝对期限、任务组、异常组拆分和 `shield` 的强引用；不会依赖 3.12/3.13，便于在 3.11 直接运行。

```python
import asyncio


async def query(name: str, delay: float, failure=None) -> str:
    await asyncio.sleep(delay)
    if failure:
        raise failure(f"{name} failed")
    return name


async def batch() -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + 0.2
    tasks = []
    try:
        async with asyncio.timeout_at(deadline):
            async with asyncio.TaskGroup() as group:
                tasks.append(group.create_task(query("cache", 0.02)))
                tasks.append(group.create_task(query("db", 0.04, ValueError)))
                tasks.append(group.create_task(query("api", 0.04, OSError)))
    except* ValueError as errors:
        print("bad values:", len(errors.exceptions))
    except* OSError as errors:
        print("I/O errors:", len(errors.exceptions))


async def durable_flush() -> None:
    await asyncio.sleep(0.03)
    print("flushed")


async def main() -> None:
    await batch()
    flush_task = asyncio.create_task(durable_flush())  # 保留强引用
    try:
        async with asyncio.timeout(0.01):
            await asyncio.shield(flush_task)
    except TimeoutError:
        print("caller timed out; flush still owned")
    await flush_task


asyncio.run(main())
```

同一轮里两个失败是否都进入异常组取决于它们在取消传播前是否都已发生，不能靠调度碰巧同时来保证业务聚合。

## 时序

```text
进入 TaskGroup -> 建立任务所有权 -> 某任务失败 -> 取消兄弟 -> 等清理 -> 抛异常组
timeout 到期 -> cancel 当前任务 -> 上下文退出转换 -> 外部捕获 TimeoutError
外层取消 -> shield 让内部任务继续 -> 外层仍得 CancelledError -> 所有者稍后回收内部任务
```

## 结构化并发迁移表

| 旧模式 | 现代模式 | 迁移注意 |
|---|---|---|
| 裸 `create_task()` 后忘记保存 | `TaskGroup.create_task()` | 明确词法生命周期 |
| `gather()` 启一组同生共死任务 | `TaskGroup` | 失败会取消兄弟；结果从 task 读取 |
| `wait_for()` 包一长串操作 | `asyncio.timeout()` | 在上下文外捕获 `TimeoutError` |
| 每层各给 N 秒 | 顶层 `timeout_at(deadline)` | 传绝对预算，避免超时膨胀 |
| 手工收集多个异常 | `ExceptionGroup` + `except*` | 处理嵌套叶子，不假定只有一个异常 |
| 同步代码反复 `run_until_complete` | `Runner.run()` | 不嵌套已有 loop |
| 队列每消费者一个 sentinel | 3.13 `Queue.shutdown()` | 兼容 3.12- 时仍用 sentinel |
| 取消后吞异常继续执行 | `finally` 清理并重抛 | `uncancel()` 仅用于明确抑制协议 |
| `shield(coro)` 后丢引用 | 先建 Task、保存强引用、再 shield | 定义最终回收者 |

## 陷阱

- 认为 `TaskGroup` 会按创建顺序返回结果；应保存 task，退出后调用 `result()`。
- 用普通 `except ExceptionGroup` 代替 `except*`，遗漏异构失败的拆分语义。
- 在 timeout 内捕获 `TimeoutError`；内部实际收到的通常是取消。
- timeout 后吞 `CancelledError`，阻止上下文正确转换并破坏上层取消。
- 开启 eager factory 后仍假设任务“下一轮”才开始。
- 为让任务继续而随意 `uncancel()`，破坏 TaskGroup/timeout。
- 把 `shield()` 当取消屏蔽区，或不保存内部 Task 强引用。
- 在 3.13 `shutdown(immediate=True)` 后仍宣称所有工作已完成。

## 现代 Python 补充

- 3.14 及以后 API 仍可能细化；以项目最低版本文档为准，不用 `hasattr` 拼凑多套关闭语义。
- `KeyboardInterrupt`、`SystemExit` 在任务组中有特殊重新抛出规则，不应当作普通业务异常聚合。
- structured concurrency 管任务生命周期，不自动解决外部资源：子进程仍需 terminate/kill/wait，锁仍需恢复不变量，队列仍需定义剩余工作政策。

## 实践清单

- [ ] 同生命周期任务由 `TaskGroup` 拥有，后台任务有强引用和最终回收者。
- [ ] 总预算用 absolute deadline；超时与外部取消均有测试。
- [ ] `except*` 分别处理可恢复类型，未处理叶子继续传播。
- [ ] 不吞取消；使用 `uncancel()` 有书面不变量依据。
- [ ] eager factory 经真实基准和顺序审计后才启用。
- [ ] 3.13 队列明确正常排空还是紧急丢弃。
- [ ] 外部资源关闭与 TaskGroup 取消协议配套。

## 复习题

1. `TaskGroup` 首个非取消异常出现后怎样处理兄弟任务？
2. `except*` 与普通 `except` 的匹配单位有何不同？
3. `timeout_at()` 为何更适合跨层传递总预算？
4. eager task factory 改变了哪些可观察时序？
5. 捕获 `CancelledError` 后为何通常不应调用 `uncancel()`？
6. `shield()` 为什么既要强引用，也要最终回收者？
7. `Queue.shutdown(immediate=True)` 牺牲了什么保证？

## 导航和资料

- 下一篇：[asyncio 测试与调试](/kb/language/Python/异步处理/16-asyncio-测试与调试/)
- 同步原语：[第11章 同步原语](/kb/language/Python/异步处理/11-第11章-同步原语/)
- 异步队列：[第12章 异步队列](/kb/language/Python/异步处理/12-第12章-异步队列/)
- 子进程：[第13章 管理子进程](/kb/language/Python/异步处理/13-第13章-管理子进程/)
- 高级机制：[第14章 高级 asyncio](/kb/language/Python/异步处理/14-第14章-高级-asyncio/)
- [Python：Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html)
- [Python：Runners](https://docs.python.org/3/library/asyncio-runner.html)
- [Python：Queues](https://docs.python.org/3/library/asyncio-queue.html)
- [PEP 654：Exception Groups and except*](https://peps.python.org/pep-0654/)
