---
title: "Ray Generator"
permalink: /kb/ai/Ray/Ray-Core/03-Ray-Generator/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Ray Core Task 深入", link: /kb/ai/Ray/Ray-Core/02-Task-深入/ }
next: { text: "Ray Core Object 与序列化", link: /kb/ai/Ray/Ray-Core/04-Object-与序列化/ }
knowledgeNote:
  series: "AI"
  group: "Ray Core"
---
::: info 版本范围
本文依据 **2026-08-01 的 Ray latest 官方文档**，只讨论 Ray Core 的 Python Generator API。`ObjectRefGenerator` 是公开行为的载体，但其具体模块路径和内部实现不应作为稳定依赖。
:::

Ray Generator 让一个 Task 或 Actor method 在完成前逐项 `yield` 结果。它解决“结果很多、每项较大、希望边生成边消费”的问题。普通 Task 基础见 [Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)，每个 yielded ObjectRef 的生命周期见 [Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)，Actor generator 相关模型见 [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)。

## 1. 为什么需要 Generator

普通 Task 返回列表时，调用者通常要等整个函数结束，而且 Worker heap 或 object store 可能同时容纳全部结果：

```python
@ray.remote
def build_all():
    return [make_large_item(i) for i in range(1000)]
```

Generator 改为逐项产生：

```python
import time
import ray

ray.init()


@ray.remote
def count_slowly(n):
    for i in range(n):
        time.sleep(0.2)
        yield i


generator = count_slowly.remote(5)
for item_ref in generator:
    print(ray.get(item_ref))
```

`count_slowly.remote()` 返回 `ObjectRefGenerator`，迭代得到的是 **ObjectRef**，不是值。每次 `yield` 对应一个可独立传递和引用计数的远端对象。

::: important 与本地 Python Generator 的关键差异
本地生成器通常由调用者 `next()` 驱动执行；Ray Generator Task 会 eager 地继续执行到完成，不因调用者停止轮询就自动暂停。因此 Generator 能降低“整批结果同时存在”的压力，但**不天然提供生产者背压**。
:::

## 2. 同步消费

### 2.1 `next` 与 `for`

```python
import ray
import time

ray.init()


@ray.remote
def records(n):
    for i in range(n):
        time.sleep(0.1)
        yield {"id": i, "value": i * i}


gen = records.remote(3)

first_ref = next(gen)  # 阻塞，直到下一个 ref 可用
print(ray.get(first_ref))

for ref in gen:
    print(ray.get(ref))

# 再 next(gen) 会抛 StopIteration。
```

有两个等待点：

- `next(gen)` 等待下一个 **ObjectRef 被生成**；
- `ray.get(ref)` 等待/获取该 ObjectRef 的值并传播异常。

通常一个 yield 完成后 `ray.get(ref)` 很快，但仍应按两个阶段理解。

### 2.2 不允许直接 `ray.get(gen)`

`ObjectRefGenerator` 不是单个结果 ref：

```python
gen = records.remote(3)
# ray.get(gen)  # 不允许

# 等待 Generator Task 整体结束：
ray.get(gen.completed())
```

`completed()` 返回一个完成 ref，在 Generator Task 正常结束或报错时 ready。它只表示 Task 终态，不替代逐项消费。

## 3. 异步消费

`ObjectRefGenerator` 支持异步迭代；ObjectRef 可 `await`：

```python
import asyncio
import time
import ray

ray.init()


@ray.remote
def stream(name, n):
    for i in range(n):
        time.sleep(0.2)
        yield name, i


async def consume(name):
    async for ref in stream.remote(name, 3):
        value = await ref
        print(value)


async def main():
    await asyncio.gather(consume("A"), consume("B"))


asyncio.run(main())
```

异步迭代避免阻塞事件循环线程，适合 Driver 已使用 asyncio 的应用。注意：普通 remote Task 本身不能直接写成 `@ray.remote async def`；async remote method 属于 Async Actor 语境，见 [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)。

不要在 async 上下文中调用阻塞式 `ray.get`/`ray.wait`；使用 `await ref`、`async for` 或 asyncio 组合 API。

## 4. 用 `ray.wait` 等待下一项

`ray.wait` 可以接收 Generator。Generator ready 的含义是：下一次 `next(gen)` 对应的对象已可用。

```python
import time
import ray

ray.init()


@ray.remote
def slow_values(n):
    for i in range(n):
        time.sleep(0.2)
        yield i


gen = slow_values.remote(3)

ready, unready = ray.wait([gen], timeout=0)
assert ready == []

while True:
    ready, _ = ray.wait([gen], timeout=1.0)
    if not ready:
        print("still waiting")
        continue
    try:
        ref = next(gen)  # 已 ready，通常立即返回
    except StopIteration:
        break
    print(ray.get(ref))
```

`timeout`、`num_returns`、`fetch_local` 等参数同样适用于 Generator。Generator 与普通 ObjectRef 可混合等待，但要区分类型并在消费一项后把尚未结束的 Generator 放回待等待集合。

一个不导入内部 `ObjectRefGenerator` 类型的简单混合模式，是分别维护两个集合：

```python
generators = [slow_values.remote(2), slow_values.remote(3)]
regular_refs = []

while generators or regular_refs:
    ready, _ = ray.wait([*generators, *regular_refs], num_returns=1)
    item = ready[0]

    if item in generators:
        try:
            yielded_ref = next(item)
        except StopIteration:
            generators.remove(item)
        else:
            print(ray.get(yielded_ref))
    else:
        regular_refs.remove(item)
        print(ray.get(item))
```

实际项目应给容器封装明确类型和来源映射，避免靠内部模块路径做 `isinstance`。

## 5. 取消

`ray.cancel` 可直接接收 Generator：

```python
import time
import ray
from ray.exceptions import TaskCancelledError

ray.init()


@ray.remote
def endless():
    i = 0
    while True:
        time.sleep(0.1)
        yield i
        i += 1


gen = endless.remote()
print(ray.get(next(gen)))
ray.cancel(gen, force=False, recursive=True)

try:
    while True:
        ref = next(gen)
        print(ray.get(ref))
except TaskCancelledError:
    print("generator task cancelled")
except StopIteration:
    print("generator ended")
```

对于 remote function Generator，取消语义与普通 Task 基本相同：

- pending 时可阻止执行；
- running 且 `force=False` 时尝试中断 Python Task；
- `force=True` 会结束 Worker，错误可能表现为 `WorkerCrashedError`；
- `recursive=True` 尝试取消其子 Task；
- 取消不会回滚已经 yield 或已产生的外部副作用；
- 取消后，下一个 ref 何时携带 `TaskCancelledError` 没有特殊顺序保证。

Actor method 返回的 Generator 属于 Actor Task，取消边界不同：

- Regular/Threaded Actor Generator 只能使用 `force=False`；运行中方法应周期性检查 `ray.get_runtime_context().is_canceled()`，协作式退出；
- Async Actor Generator 会尝试取消对应的 `asyncio.Task`，但只有执行到 `await` 时才有机会响应；
- 对 Actor Task 使用 `force=True` 会抛 `ValueError`；若必须终止整个 Actor，应使用 `ray.kill(actor)`，同时接受其他运行中或排队方法也会受影响。

Generator 已经交给调用者的 refs 是普通 ObjectRef，调用者仍应按需要消费、删除或清理引用。

## 6. 故障与错误顺序

### 6.1 应用异常

```python
import ray

ray.init()


@ray.remote
def fail_after_two():
    yield 0
    yield 1
    raise ValueError("bad record")


gen = fail_after_two.remote()
try:
    for ref in gen:
        print(ray.get(ref))
except ValueError as exc:
    print("stream failed:", exc)
```

Generator Task 抛错时，`next(gen)` 返回一个包含异常的 ObjectRef；真正调用 `ray.get`/`await` 时抛异常。应用异常按正确 yield 顺序出现：若在第二次 yield 后失败，前两项先出现，随后异常 ref；之后继续 `next` 会持续得到异常 ref 的行为应通过终止消费来处理，而不是无限重试 `next`。

稳健模板：

```python
gen = fail_after_two.remote()
try:
    while True:
        ref = next(gen)
        value = ray.get(ref)
        process(value)
except StopIteration:
    pass
except ray.exceptions.RayTaskError as exc:
    handle_stream_failure(exc)
```

### 6.2 系统故障

Worker crash、节点失败等系统故障没有相同的顺序保证。若原逻辑有 N 次 yield，故障场景中可能观察到 1 到 N+1 个 refs（部分输出及一个系统异常 ref）。消费者必须接受：

- 只收到前缀；
- 重试后收到重复项；
- 异常相对已在途结果没有严格业务 exactly-once 保证。

### 6.3 重试与重复输出

Generator 支持 Task 的 `max_retries` 与 `retry_exceptions`：

```python
class TemporaryError(Exception):
    pass


@ray.remote(max_retries=2, retry_exceptions=[TemporaryError])
def retryable_stream(run_id):
    for offset in range(10):
        # 输出携带稳定去重键。
        yield {"run_id": run_id, "offset": offset, "value": offset * 2}
```

容错并不自动提供 exactly-once。Task 重跑可能重新产生前缀；消费端应以 `(run_id, offset)` 去重，或者采用幂等 sink。若源不可重放或副作用不可幂等，应谨慎启用应用异常重试。

lineage reconstruction 也可能重执行 Generator Task 以恢复丢失对象，仍要求逻辑确定且幂等。

## 7. 内存、GC 与所谓“流式”

### 7.1 每个 yielded ref 独立计数

```python
import gc
import numpy as np
import ray

ray.init()


@ray.remote
def arrays(n):
    for i in range(n):
        yield np.full(1_000_000, i, dtype=np.int64)


gen = arrays.remote(10)
for ref in gen:
    arr = ray.get(ref)
    print(arr[0])
    del arr
    del ref
    gc.collect()
```

取出的 ref 与普通 ObjectRef 一样参与 distributed reference counting。处理后及时丢弃 ref 和值有助于释放 object store；NumPy 零拷贝视图本身也可 pin 住共享内存，所以只 `del ref` 不一定够，见 [Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)。

### 7.2 删除 Generator

```python
gen = arrays.remote(100)
first_ref = next(gen)
del gen
```

已取出的 `first_ref` 继续作为普通 ref 存活。尚未通过 `next` 消费的 refs 会在 Generator 被 GC 时清理相应引用。Python GC 不是即时分布式屏障，生产代码不要用“恰好何时回收”做正确性条件。

### 7.3 没有天然背压

Ray eager 执行 Generator 到结束。若生产者远快于消费者，yielded 对象仍可能累积并触发 object store spilling，甚至形成内存/磁盘压力。改进方向：

- 调整 yield 粒度：每项不要太小，也不要大到造成峰值；
- 增加消费者并发，同时设置有界 in-flight；
- 用 Actor 协议实现显式 credit/ack 背压；
- 将大规模持久流写入适合的外部流系统，而不是把 Generator 当消息队列；
- 用 `ray memory --stats-only` 和 Dashboard 观察对象存储与 spill。

Generator 的核心收益是“可逐项可见与可逐项释放”，不是无限缓冲或可靠消息传输。

## 8. Actor Generator

同步、Async Actor 和 Threaded Actor method 均可 yield：

```python
import ray

ray.init()


@ray.remote
class Counter:
    def values(self, start, count):
        for i in range(start, start + count):
            yield i


counter = Counter.remote()
for ref in counter.values.remote(10, 3):
    print(ray.get(ref))
```

Actor method 的顺序、并发、重启与取消还受 Actor execution model 约束。普通 Actor 的长 Generator method 可能阻挡同一 Actor 的后续方法；Threaded/Async Actor 也受 GIL、事件循环和 `max_concurrency` 约束。详见 [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)。

## 9. API 限制

当前官方文档列出的限制：

- 不支持本地生成器的 `throw`、`send`、`close`；
- 不支持从 Generator 使用 `return value` 传回最终值；最终元数据应作为最后一个带类型标签的 yield，或另设普通返回通道；
- 不能把 `ObjectRefGenerator` 作为参数传给另一个 Task 或 Actor；可传已经 `next` 得到的 ObjectRef；
- 不支持 Ray Client；
- `ObjectRefGenerator` **不是线程安全的**；只能由一个线程/协程所有，或在外层加严格同步；
- deprecated dynamic generator 不应作为新代码方案；新代码使用 Ray Generator streaming 语义。

不要依赖 `ray._raylet.ObjectRefGenerator` 等内部导入路径。使用返回对象的公开迭代、异步迭代、`completed()`、`ray.wait` 和 `ray.cancel` 行为。

## 10. 完整示例：有界并发消费多个流

下面的脚本启动多个 Generator，并每轮只取 ready 的下一项。它不会解决生产端的严格背压，但避免 Driver 阻塞在某个慢流上：

```python
import random
import time
import ray

ray.init()


@ray.remote
def partition(partition_id: int, count: int):
    for offset in range(count):
        time.sleep(random.uniform(0.05, 0.2))
        yield {
            "partition": partition_id,
            "offset": offset,
            "value": partition_id * 100 + offset,
        }


active = [partition.remote(p, 4) for p in range(3)]
seen = set()

while active:
    ready, _ = ray.wait(active, num_returns=1, timeout=1.0)
    if not ready:
        print("no partition ready")
        continue

    gen = ready[0]
    try:
        ref = next(gen)
    except StopIteration:
        active.remove(gen)
        continue

    try:
        item = ray.get(ref)
    except ray.exceptions.RayTaskError as exc:
        active.remove(gen)
        print("partition failed:", exc)
        continue

    key = (item["partition"], item["offset"])
    if key not in seen:
        seen.add(key)
        print(item)
    del ref

ray.shutdown()
```

若要在最后一次 yield 后立即发现 `StopIteration`，仍需再次等待/调用 `next`。若只关心 Task 终态，可额外等待 `gen.completed()`，但不能据此替代逐项异常处理。

## 11. 何时用，何时不用

适合：

- 动态数量的大结果；
- 每项可独立处理并尽快释放；
- 首项延迟比总完成时间更重要；
- 调用者已能处理 partial results 和重复项。

不适合：

- 必须原子地得到整批结果；
- 必须 exactly-once 且没有业务去重；
- 生产者必须被消费速度严格背压，但没有另建协议；
- 想把 Generator 跨 Task 转发；
- 把 Ray Core Generator 当长期持久消息队列。

## 12. 最佳实践

- 明确命名 `gen`、`item_ref`、`item`，避免把三层对象混淆。
- 同步代码用 `ray.wait` 避免卡在最慢流；async Driver 用 `async for` 和 `await ref`。
- 每个输出携带稳定序号/分区键，以便重试后去重。
- 消费完成后释放 ref 和零拷贝视图，观察 object store 与 spill。
- 把异常 ref 视为流终止信号，记录已成功处理到的 offset。
- 不跨线程共享一个 Generator，不导入其内部实现类。
- 需要最终摘要时，将摘要作为有明确 tag 的最后一项，或由另一普通 Task/ObjectRef 提供。
- 只有测量证明普通批量返回造成首项延迟或内存峰值时，才为复杂性引入 Generator。

## 13. 延伸阅读

- Task、取消和重试：[Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)
- ObjectRef GC、owner 和 NumPy：[Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)
- 运行时组件：[架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)
- Actor execution model：[Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)
- 系列路线：[Ray Core 学习路线](/kb/ai/Ray/Ray-Core/00-Ray-Core-学习路线/)
