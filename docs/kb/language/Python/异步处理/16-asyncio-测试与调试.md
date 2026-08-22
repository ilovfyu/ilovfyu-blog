---
title: "第 16 章：asyncio 测试与调试"
permalink: /kb/language/Python/异步处理/16-asyncio-测试与调试/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "现代 asyncio 补遗", link: /kb/language/Python/异步处理/15-现代-asyncio-补遗/ }
next: false
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
::: abstract 本章定位
异步代码的难点不只是得到正确结果，还要验证并发时序、取消清理、超时边界和任务生命周期。本章使用标准库建立可重复的测试方法，再说明 pytest-asyncio、AsyncMock 和运行时诊断的适用边界。示例要求 Python 3.11+。
:::

## 目标 / 地图

- 用 `unittest.IsolatedAsyncioTestCase` 为每个测试建立隔离事件循环。
- 使用 `AsyncMock` 测试异步依赖，同时避免把协议模拟得过于宽松。
- 确定性地测试并发、超时、取消、异常传播和资源清理。
- 检测测试结束后的遗留 Task，避免后台异常泄漏到其他测试。
- 使用 asyncio debug、任务栈和循环异常处理器定位卡顿及未检索异常。
- 理解 pytest-asyncio fixture 的生命周期和 loop scope。

## 为什么异步测试更容易失真

### 结果正确不代表生命周期正确

函数返回预期值时，后台 Task 仍可能没有结束，连接仍可能未关闭，或取消被意外吞掉。异步测试至少要同时检查：

1. 返回值或业务状态。
2. 异常类型与传播边界。
3. 所有已创建任务是否完成、取消并被等待。
4. 锁、连接、队列项目和上下文是否在失败路径恢复。

### 不用 sleep 猜测调度

`await asyncio.sleep(0.01)` 不能可靠证明另一个任务已经运行到某一行；机器负载和实现细节会改变时序。测试应使用 `Event`、`Queue` 或测试专用 Future 建立明确握手：被测任务设置 `started` 表示已经进入关键位置，测试再触发 `release` 或取消。

真实时间只应验证数量级较大的外部行为，不能成为绝大多数单元测试的同步机制。对重试和退避逻辑，应注入 `sleep` 函数或时钟，而不是让测试真的等待数秒。

## 标准库测试工具

### IsolatedAsyncioTestCase

`unittest.IsolatedAsyncioTestCase` 允许测试方法、`asyncSetUp()` 和 `asyncTearDown()` 使用 `async def`。每个测试获得隔离的事件循环，降低 Task、ContextVar 和异常状态串到其他用例的风险。同步资源仍可使用普通 `setUp()`/`tearDown()`，异步资源优先放进异步版本。

### AsyncMock

`unittest.mock.AsyncMock` 调用后返回可等待对象，`assert_awaited_once_with()` 检查它是否被正确等待。使用 `spec` 或 `autospec` 可以约束方法签名，避免被测代码调用了不存在的 API 而测试仍通过。

不要把所有依赖都 mock 掉。Streams、Queue、锁和取消传播等 asyncio 行为更适合使用本地真实对象；数据库、HTTP 服务可先做单元 mock，再用本地临时服务或容器做少量集成测试。

### 完整可运行示例

将下面内容保存为一个测试模块后运行 `python -m unittest -v`。它只使用标准库，展示成功、超时、取消清理和遗留任务检测。

```python
import asyncio
import unittest
from collections.abc import Awaitable, Callable
from unittest.mock import AsyncMock


async def load_pair(
    fetch: Callable[[str], Awaitable[str]],
    timeout: float,
) -> tuple[str, str]:
    async with asyncio.timeout(timeout):
        async with asyncio.TaskGroup() as group:
            left = group.create_task(fetch("left"), name="fetch-left")
            right = group.create_task(fetch("right"), name="fetch-right")
    return left.result(), right.result()


async def cancellable_worker(
    started: asyncio.Event,
    released: asyncio.Event,
    cleaned: asyncio.Event,
) -> None:
    try:
        started.set()
        await released.wait()
    finally:
        cleaned.set()


class AsyncTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.baseline = set(asyncio.all_tasks())

    async def asyncTearDown(self) -> None:
        current = asyncio.current_task()
        leaked = {
            task
            for task in asyncio.all_tasks() - self.baseline
            if task is not current and not task.done()
        }
        for task in leaked:
            task.cancel()
        if leaked:
            await asyncio.gather(*leaked, return_exceptions=True)
            self.fail(f"leaked tasks: {[task.get_name() for task in leaked]}")

    async def test_success(self) -> None:
        async def fake_fetch(key: str) -> str:
            await asyncio.sleep(0)
            return key

        fetch = AsyncMock(side_effect=fake_fetch)

        result = await load_pair(fetch, timeout=0.1)

        self.assertEqual(result, ("left", "right"))
        self.assertEqual(fetch.await_count, 2)
        fetch.assert_any_await("left")
        fetch.assert_any_await("right")

    async def test_timeout(self) -> None:
        blocker = asyncio.Event()

        async def fetch(key: str) -> str:
            await blocker.wait()
            return key

        with self.assertRaises(TimeoutError):
            await load_pair(fetch, timeout=0.01)

    async def test_cancellation_runs_cleanup(self) -> None:
        started = asyncio.Event()
        released = asyncio.Event()
        cleaned = asyncio.Event()
        task = asyncio.create_task(
            cancellable_worker(started, released, cleaned),
            name="cancellable-worker",
        )
        await started.wait()

        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task

        self.assertTrue(cleaned.is_set())


if __name__ == "__main__":
    unittest.main()
```

`asyncTearDown()` 中的清理先取消再 `gather(..., return_exceptions=True)`，确保任务真正结束后才让测试失败。如果直接断言后退出，遗留任务可能只产生警告，甚至污染后续测试。

## 测试并发语义

### 取消

正确的取消测试流程是：

1. 通过 Event 确认任务已经运行到可取消位置。
2. 调用 `task.cancel()`。
3. `await task` 并断言 `CancelledError`。
4. 检查 `finally` 是否执行、资源是否归还、兄弟任务是否按约定停止。

仅检查 `task.cancelled()` 不足以证明资源已清理。若被测代码有意屏蔽取消，还要检查内部任务最终由谁等待。

### 超时

`asyncio.timeout()` 取消当前任务，并在上下文外转换为 `TimeoutError`；`wait_for()` 通常取消目标 awaitable。测试要断言外部看到的异常，也要验证内部取消清理。如果目标吞掉取消，测试必须防止自身永久挂起，可在更外层设置测试级硬期限。

时间边界不要写成“必须在 10 毫秒内完成”这类容易抖动的断言。单元测试优先控制事件；必须测时间时，预留合理容差并使用 `loop.time()` 的单调时钟。

### TaskGroup 与 ExceptionGroup

测试 TaskGroup 失败时，应验证首个非取消异常会触发兄弟取消，并按叶子异常类型检查 `ExceptionGroup`。不要依赖两个任务恰好在同一轮失败，因为调度和取消时序可能使异常组只包含一个业务异常。

### Queue 与背压

有界 Queue 测试应验证：队列满时生产者 `put()` 仍未完成；消费者 `get()` 后生产者恢复；每个 `get()` 与 `task_done()` 配对；`join()` 只在未完成计数归零后返回。Python 3.13 的 `shutdown(immediate=True)` 是例外，它会解除 `join()`，不能断言所有项目均已处理。

## pytest-asyncio

安装 `pytest` 和 `pytest-asyncio` 后，可使用异步测试与 fixture：

```python
import asyncio
import pytest


@pytest.fixture
async def resource():
    value = await open_resource()
    try:
        yield value
    finally:
        await value.close()


@pytest.mark.asyncio
async def test_resource(resource):
    assert await resource.read() == b"ready"
```

这里的 `open_resource()` 代表项目资源 API。具体插件版本可能采用 auto mode，或要求显式 `@pytest.mark.asyncio`；项目应在配置中固定模式，不依赖开发者机器的默认值。fixture 的 loop scope 必须覆盖资源生命周期，不能在一个 loop 创建连接后拿到另一个 loop 使用。

并行测试进程还会共享端口、数据库和临时目录等外部资源。TCP 测试应绑定端口 `0` 让操作系统选择空闲端口，不要硬编码固定端口；数据库测试应使用独立 schema/事务或测试实例。

## 调试与可观测性

### 开启 debug

可使用以下任一方式：

```bash
PYTHONASYNCIODEBUG=1 python -m unittest -v
```

```python
asyncio.run(main(), debug=True)
```

debug 模式能发现未等待 coroutine、未检索 Task 异常、非线程安全调用和慢 callback，但有额外开销，生产环境通常按需采样或在预发布环境长期启用。

### 检查任务栈

服务无响应时，可遍历 `asyncio.all_tasks()`，记录任务名、状态和 `get_stack()`。栈信息可能包含局部变量或敏感参数，生产日志应控制访问和脱敏。任务命名应带操作类型和非敏感标识，不要直接放 token、完整 URL 查询或用户正文。

### 循环异常处理器

自定义 `loop.set_exception_handler()` 时，先补充结构化日志，再调用 `loop.default_exception_handler(context)` 保留标准诊断。处理器用于最后防线，不应替代正常的 `await task`、TaskGroup 或 done callback 异常回收。

### 检测事件循环延迟

慢回调日志只能看到单个 callback。生产系统还可安排周期性定时器，比较计划唤醒时间与实际唤醒时间，得到 event-loop lag；持续升高通常意味着阻塞调用、CPU 饱和、日志阻塞或任务洪泛。该指标应结合线程池排队、Task 数、队列长度和下游延迟一起判断。

## 常见错误

- 用固定 `sleep()` 等待并发状态，测试偶发失败或无谓变慢。
- 创建后台 Task 后只断言返回值，不在 teardown 检测和回收任务。
- 捕获普通 `Exception` 后误以为测试到了取消；`CancelledError` 继承 `BaseException`。
- mock 返回普通值替代 awaitable，使测试与真实异步协议不一致。
- 对所有 I/O 都用 mock，完全遗漏连接关闭、背压和协议 framing。
- 在一个事件循环创建资源，在另一个测试 loop 使用。
- 使用固定 TCP 端口，导致并行测试和残留进程冲突。
- 用极小墙钟时间断言性能，导致慢 CI 上不稳定。
- 自定义 loop 异常处理器后吞掉上下文，使未检索异常悄然消失。
- 只测试成功路径，不测试超时、取消、下游失败和 teardown 失败。

## 实践清单

- [ ] 每个异步测试有隔离 loop 和明确的资源 teardown。
- [ ] 使用 Event/Queue/Future 建立时序，不靠任意 sleep 猜测。
- [ ] 成功、异常、超时和外部取消路径均有覆盖。
- [ ] 测试结束时没有未完成 Task、未关闭 transport 或未检索异常。
- [ ] AsyncMock 有 spec，并断言 awaited 而不只是 called。
- [ ] 至少有少量本地真实协议集成测试，不把全部行为 mock 掉。
- [ ] 重试 sleep、时钟和随机数可注入，使测试快速且确定。
- [ ] CI 开启 asyncio debug，并把 ResourceWarning 作为待修复信号。
- [ ] 生产任务有名称，能采集 event-loop lag 和任务栈。
- [ ] 日志和任务名称不包含凭据与敏感正文。

## 复习题

1. 为什么 `sleep(0.01)` 不适合作为并发测试的主要同步方式？
2. `IsolatedAsyncioTestCase` 解决了哪些测试隔离问题？
3. 取消测试为什么既要 `await task`，又要检查资源清理？
4. `AsyncMock.assert_called_once()` 与 `assert_awaited_once()` 有何区别？
5. 如何发现测试返回后仍在运行的后台 Task？
6. 测试 TaskGroup 时为什么不应假定异常组一定包含所有同时计划失败的任务？
7. pytest 异步 fixture 的 loop scope 为什么必须覆盖资源生命周期？
8. event-loop lag 持续升高可能由哪些问题引起？

## 导航和资料

- 系列索引：[Python asyncio并发编程读书笔记](/kb/language/Python/异步处理/00-Python-asyncio并发编程读书笔记/)
- 上一篇：[现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/)
- 基础取消语义：[第2章 asyncio 基础](/kb/language/Python/异步处理/02-第2章-asyncio-基础/)
- 任务诊断：[第14章 高级 asyncio](/kb/language/Python/异步处理/14-第14章-高级-asyncio/)
- [Python：IsolatedAsyncioTestCase](https://docs.python.org/3/library/unittest.html#unittest.IsolatedAsyncioTestCase)
- [Python：AsyncMock](https://docs.python.org/3/library/unittest.mock.html#unittest.mock.AsyncMock)
- [Python：asyncio 开发与调试](https://docs.python.org/3/library/asyncio-dev.html)
- [pytest-asyncio 文档](https://pytest-asyncio.readthedocs.io/)
