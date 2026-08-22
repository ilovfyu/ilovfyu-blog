---
title: "Ray Core Task 深入"
permalink: /kb/ai/Ray/Ray-Core/02-Task-深入/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Ray Core 架构与运行时", link: /kb/ai/Ray/Ray-Core/01-架构与运行时/ }
next: { text: "Ray Generator", link: /kb/ai/Ray/Ray-Core/03-Ray-Generator/ }
knowledgeNote:
  series: "AI"
  group: "Ray Core"
---
::: info 版本范围
本文依据 **2026-08-01 的 Ray latest 官方文档**，聚焦 Python Ray Core Task。公开 API 是主要契约；任务调度器、Worker 复用方式和事件采集内部实现可能变化。
:::

Ray Task 是一次异步 remote function 调用。它适合无状态、可并行、最好幂等的工作。运行时背景见 [架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)；对象传参规则见 [Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)；逐项流式返回见 [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)。

## 1. Remote function 与 Task

普通函数经 `@ray.remote` 变成 remote function；调用 `.remote()` 才创建 Task。

```python
import ray

ray.init()


def local_add(a: int, b: int) -> int:
    return a + b


@ray.remote
def add(a: int, b: int) -> int:
    return a + b


ref = add.remote(20, 22)  # 非阻塞提交，返回 ObjectRef
assert ray.get(ref) == 42
ray.shutdown()
```

也可动态转换：`remote_add = ray.remote(local_add)`。一般装饰器更易读。

Task 默认请求 1 个逻辑 CPU，返回 1 个 `ObjectRef`。`.remote()` 的异步性是构建并行 DAG 的基础；`ray.get()` 是同步边界。

## 2. 参数：值、ObjectRef 与调用选项

### 2.1 Python 参数语义

位置参数、关键字参数、默认参数按普通 Python 方式绑定；跨进程边界的数据必须可序列化。

```python
import ray

ray.init()


@ray.remote
def summarize(values, *, scale=1.0):
    return sum(values) * scale


assert ray.get(summarize.remote([1, 2, 3], scale=0.5)) == 3.0
```

传入文件句柄、线程锁、活动 socket 等进程本地资源通常失败。应在 Task 内创建短期资源，或让 Actor 持有长期资源，见 [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)。

### 2.2 顶层 ObjectRef 自动解引用

ObjectRef 直接作为顶层参数时，Ray 在执行 Task 前取到其底层值；依赖未就绪时 Task 等待。

```python
@ray.remote
def produce():
    return 41


@ray.remote
def increment(value):
    assert not isinstance(value, ray.ObjectRef)
    return value + 1


a = produce.remote()
b = increment.remote(a)  # 声明数据依赖，不在 Driver 上 ray.get
assert ray.get(b) == 42
```

若生产和消费位于不同节点，数据按需传输。调度器可考虑大参数的数据局部性，但具体放置不是稳定保证。

### 2.3 嵌套 ObjectRef 不自动解引用

ref 放在 list/dict/自定义容器内时，Task 收到的仍是 ref；这可用于只转发、不读取数据。

```python
@ray.remote
def resolve_bundle(bundle):
    refs = bundle["items"]
    return sum(ray.get(refs))


refs = [ray.put(i) for i in range(4)]
assert ray.get(resolve_bundle.remote({"items": refs})) == 6
```

优先传顶层 ref，让 Ray 显式知道依赖；仅当 Task 需要选择性读取或继续转发时嵌套。

### 2.4 静态参数与每次调用覆盖

```python
@ray.remote(
    num_cpus=2,
    resources={"fast_disk": 0.25},
    max_retries=2,
    retry_exceptions=False,
)
def transform(x):
    return x * 2


ref = transform.options(
    num_cpus=1,
    name="transform-small",
    scheduling_strategy="DEFAULT",
).remote(21)
```

常用 remote function 选项：

| 选项 | 含义 | 注意 |
|---|---|---|
| `num_cpus`, `num_gpus` | 逻辑资源需求 | 准入/放置，不是 OS 隔离 |
| `resources` | 数值型自定义资源 | 资源必须在节点上存在 |
| `memory` | heap 内存调度需求 | 不是硬内存限制 |
| `num_returns` | 返回 ref 数量 | 必须匹配返回协议 |
| `max_retries` | 系统故障最大重试次数 | `-1` 无限，`0` 禁用 |
| `retry_exceptions` | 是否/哪些应用异常可重试 | 默认不重试应用异常 |
| `max_calls` | Worker 执行该函数若干次后退出 | 只能在 remote function 定义时设置，不能由 `.options()` 覆盖；CPU Task 默认无限，GPU Task 默认通常为 1 |
| `runtime_env` | 当前 Task 及子任务环境 | 有打包/安装成本 |
| `scheduling_strategy` | 默认、分散、placement group 等 | 显式策略可改变局部性选择 |
| `enable_task_events` | 是否上报该 Task 的事件 | 关闭可降开销但降低可观测性 |

`.options()` 返回带调用级覆盖配置的对象，不永久修改原 remote function。并非所有定义级配置都能覆盖；`max_calls` 必须在 `@ray.remote(max_calls=...)` 或 `ray.remote(..., max_calls=...)` 中设置。

## 3. 返回值与多返回

### 3.1 单返回

默认只有一个 ObjectRef。即使 Python 函数返回 tuple，tuple 也是一个对象：

```python
@ray.remote
def one_ref():
    return 1, 2, 3


ref = one_ref.remote()
assert ray.get(ref) == (1, 2, 3)
```

### 3.2 固定多返回

`num_returns=N` 让每个元素拥有独立 ObjectRef，下游可独立依赖：

```python
@ray.remote(num_returns=3)
def split():
    return "meta", [1, 2], [3, 4]


meta_ref, left_ref, right_ref = split.remote()
assert ray.get(meta_ref) == "meta"
assert ray.get([left_ref, right_ref]) == [[1, 2], [3, 4]]
```

函数必须返回与 `num_returns` 匹配的值。固定数量生成器也可配 `num_returns=N`，但这类返回通常要等生成器 Task 完成后整体可用；需要真正逐项到达，请使用 streaming Generator，见 [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)。

### 3.3 返回 ObjectRef 的一层语义

Task 返回的 Python 值若本身是 ObjectRef，外层 Task 的返回 ref 与内层 ref 是两层 future。调用一次 `ray.get` 通常只解一层：

```python
@ray.remote
def leaf():
    return 42


@ray.remote
def submit_leaf():
    return leaf.remote()


outer = submit_leaf.remote()
inner = ray.get(outer)
assert isinstance(inner, ray.ObjectRef)
assert ray.get(inner) == 42
```

若调用者只要最终值，父 Task 中 `return ray.get(leaf.remote())` 更直观，但会阻塞父任务；若要异步展开 DAG，返回内层 refs 更合适。

## 4. 依赖 DAG 与并行

不要在 Driver 上过早 `ray.get`：

```python
import ray

ray.init()


@ray.remote
def square(x):
    return x * x


@ray.remote
def add(a, b):
    return a + b


# 两个 square 可并行；add 等待二者，无需 Driver 拉回中间值。
left = square.remote(3)
right = square.remote(4)
total = add.remote(left, right)
assert ray.get(total) == 25
```

反模式：

```python
# 每轮提交后立即 get，实际串行。
results = [ray.get(square.remote(i)) for i in range(100)]
```

基本并行：

```python
refs = [square.remote(i) for i in range(100)]
results = ray.get(refs)
```

如果 100 变成数百万，不能无限提交。用 `ray.wait` 做有界 in-flight 队列。

## 5. `ray.wait`：完成即消费与背压

```python
import random
import time
import ray

ray.init()


@ray.remote
def work(i):
    time.sleep(random.random() * 0.2)
    return i, i * i


pending = [work.remote(i) for i in range(20)]
results = []
while pending:
    ready, pending = ray.wait(pending, num_returns=1)
    results.append(ray.get(ready[0]))

print(results)  # 完成顺序，不保证提交顺序
```

`ray.wait(refs, num_returns=1, timeout=None, fetch_local=True)` 返回 `(ready, unready)`：

- 输入 refs 必须唯一；
- `timeout=0` 可轮询；
- 默认 `fetch_local=True`，ready 意味着对象已拉到当前节点；
- `fetch_local=False` 可在对象存在于集群任意位置时返回，避免不必要预取；
- 输入中的相对顺序在 ready/unready 各自列表内保持，但完成顺序仍由每轮就绪情况决定。

有界提交模板：

```python
MAX_PENDING = 8
pending = []
results = []

for i in range(100):
    pending.append(work.remote(i))
    if len(pending) >= MAX_PENDING:
        ready, pending = ray.wait(pending, num_returns=1)
        results.extend(ray.get(ready))

results.extend(ray.get(pending))
```

这同时限制 Driver 元数据、pending Task、参数引用和潜在结果内存。

## 6. 嵌套 Task

Remote function 可在 Worker 内继续提交 Task：

```python
import ray

ray.init()


@ray.remote
def child(x):
    return x * x


@ray.remote
def parent_return_refs(values):
    return [child.remote(x) for x in values]


@ray.remote
def parent_return_values(values):
    return ray.get([child.remote(x) for x in values])


child_refs = ray.get(parent_return_refs.remote([1, 2, 3]))
assert ray.get(child_refs) == [1, 4, 9]
assert ray.get(parent_return_values.remote([1, 2, 3])) == [1, 4, 9]
```

两种模式：

- **返回 refs**：父 Task 很快结束，调用者继续协调；适合动态 DAG。
- **父内 `ray.get`**：父 Task 等子 Task 并聚合；封装更完整，但父 Worker 被阻塞且 owner 生命周期更重要。

当前 Ray 在普通 Task 因 `ray.get` 阻塞时会释放其 CPU 资源，并在恢复时重新获取，以降低父子 CPU 死锁风险；GPU 资源通常在 Task 全生命周期保留，因为进程可能持有 GPU 内存。不要把这扩展成“所有资源/所有阻塞都自动安全”的保证。

定义顺序也很重要：被闭包引用的 remote function 应先定义，再定义会捕获它的父 remote function，避免序列化到不完整全局。

## 7. 取消 Task

```python
import time
import ray
from ray.exceptions import TaskCancelledError, WorkerCrashedError

ray.init()


@ray.remote
def slow():
    time.sleep(60)
    return "done"


ref = slow.remote()
ray.cancel(ref, force=False, recursive=True)

try:
    ray.get(ref)
except TaskCancelledError:
    print("cancelled")
```

语义取决于状态：

- pending：取消后不执行；
- running 且 `force=False`：Python Task 收到类似 `KeyboardInterrupt` 的中断；用户代码若吞掉 `BaseException` 可能破坏取消；
- running 且 `force=True`：杀死执行 Worker，`ray.get` 可能是 `WorkerCrashedError`；
- finished：无效果；
- `recursive=True`（默认）：尝试取消该 Task 提交的子 Task/Actor Task；
- 被取消的 Task 不会因 `max_retries` 自动重试。

取消是 best-effort 的分布式控制操作，不等于事务回滚。已经写入数据库、对象存储或外部服务的副作用不会撤销。优先设计可协作停止、可幂等的 Task；只有 Worker 卡死且可接受该 Worker 上状态丢失时才考虑 `force=True`。

## 8. 故障、异常与重试

### 8.1 应用异常传播

```python
import ray

ray.init()


class TemporaryError(Exception):
    pass


@ray.remote
def fail():
    raise TemporaryError("service busy")


try:
    ray.get(fail.remote())
except TemporaryError as exc:
    print(exc)
except ray.exceptions.RayTaskError as exc:
    print("wrapped:", exc.cause)
```

Ray 将远端应用异常包装/传播为 `RayTaskError`；当用户异常类型可被子类化时，抛出的对象通常也可按用户异常捕获。不能序列化的异常 cause 可能被替换成更一般的 `RayError`，因此异常对象本身也应可序列化。

依赖对象产生失败时，下游 Task 不会正常执行函数体；取下游结果会看到输入依赖失败的异常链。

### 8.2 系统故障重试

普通 Task 的 `max_retries` 默认是 3，即 Worker/节点意外失败后最多额外尝试相应次数；`0` 禁用，`-1` 无限。取消不触发重试。

```python
@ray.remote(max_retries=3)
def idempotent_write(request_id, value):
    # 外部系统应以 request_id 去重或使用幂等 upsert。
    return request_id, value
```

系统故障可能发生在外部副作用完成、Ray 结果提交之前，因此“函数看似失败”不代表副作用未发生。

### 8.3 应用异常重试

默认 `retry_exceptions=False`。可以只允许临时异常：

```python
class TemporaryError(Exception):
    pass


@ray.remote(max_retries=2, retry_exceptions=[TemporaryError])
def call_service(mode):
    if mode == "temporary":
        raise TemporaryError("retry me")
    if mode == "invalid":
        raise ValueError("do not retry")
    return "ok"
```

`retry_exceptions=True` 会重试任意应用异常，容易放大确定性 bug；生产中优先使用异常 allowlist、指数退避（在业务层实现）和幂等键。

### 8.4 Lineage reconstruction

Task 已完成后若其对象数据副本全部丢失，Ray 可能重放创建 Task 来重建，受 `max_retries`、owner 存活和依赖可重建性约束。它再次要求 Task 确定、幂等。`ray.put` 对象没有创建 Task，不能靠 lineage 重放。

## 9. Task Events 与可观测性

Ray 默认跟踪 Task 状态事件和 profiling 事件，供 Dashboard 与 State API 使用。

```python
@ray.remote(enable_task_events=True)
def visible_task(x):
    return x + 1


@ray.remote(enable_task_events=False)
def high_frequency_tiny_task(x):
    return x + 1
```

关闭事件可减少高频 Task 的事件发送、存储和 Dashboard 开销，但代价是排障信息减少。**嵌套 Task 不继承父 Task 的 `enable_task_events` 设置**，每个 remote function 需要单独配置。

安装 `ray[default]` 后：

```bash
ray summary tasks
ray list tasks
ray list tasks -f state=FAILED
```

建议为关键调用设置可识别名称：

```python
ref = visible_task.options(name="stage-parse-batch-0042").remote(41)
```

任务事件不是业务审计日志，可能受保留策略和采集配置影响。业务状态应写到自己的可靠存储。

## 10. 性能边界

### Task 粒度

Task 固定开销包括提交、调度、序列化、进程间通信和状态跟踪。微秒级函数通常应批处理：

```python
@ray.remote
def square_batch(values):
    return [x * x for x in values]


batches = [list(range(i, i + 1000)) for i in range(0, 100_000, 1000)]
results = ray.get([square_batch.remote(batch) for batch in batches])
```

### 参数与返回值

- 同一个大型只读参数传很多次时，先 `ray.put` 一次并把顶层 ref 传给 Task。
- 不要对非常小的参数逐个 `ray.put`，额外对象和引用跟踪可能更贵。
- 返回巨型 Python 对象会带来序列化和内存峰值；NumPy/Arrow 风格连续缓冲区通常更高效。
- 逐项大结果且数量动态时使用 [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)。

### 并发上限

- 使用 `ray.wait` 限制 pending；无限提交会耗尽 Driver/集群控制面和对象存储。
- `num_cpus=0` 不代表 Task 免费；它仍消耗 Worker、内存和调度开销，并可造成无界并发。
- `memory` 是调度提示，不限制实际 RSS；内存估计错误仍可 OOM。

## 11. 错误模式速查

| 现象 | 常见原因 | 处理 |
|---|---|---|
| `.remote()` 后没有直接值 | 返回的是 ObjectRef | 在边界 `ray.get`，中间 DAG 直接传 ref |
| Task 一直 pending | 资源不可行/不可用 | 检查 `cluster_resources`、声明和调度策略 |
| 看似没有并行 | 循环内立即 `ray.get` | 先批量提交，再批量或完成即取 |
| `TypeError: cannot pickle ...` | 参数/闭包不可序列化 | 用 `inspect_serializability`，移除锁/句柄 |
| 下游未执行且报上游异常 | 顶层 ref 依赖失败 | 在 DAG 边界处理根异常 |
| 取消后外部数据仍变化 | 取消不回滚副作用 | 幂等/事务/补偿逻辑 |
| 重试导致重复写 | Task 非幂等 | 业务幂等键、去重、关闭不合适重试 |
| 小 Task 比本地更慢 | 分布式固定开销占主导 | 批处理、增大粒度、测端到端吞吐 |

## 12. 最佳实践

- remote function 尽量纯函数化，明确输入输出。
- 先构造 DAG，再在应用边界 `ray.get`；完成即处理时使用 `ray.wait`。
- 大型共享参数 `ray.put` 一次，顶层传 ref 以暴露依赖。
- 所有可重试 Task 都按“可能执行不止一次”设计。
- 对临时应用错误用 allowlist，不默认重试所有异常。
- 为高价值 Task 保留 events；只在测得事件开销显著时选择性关闭。
- 用有界 pending 队列做背压，尤其是无限输入流。
- 取消后仍按失败结果消费和清理，不假设调用立即生效。
- 需要跨调用持久状态时使用 [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)，不要依赖普通 Worker 复用。

## 13. 延伸阅读

- 组件、owner 与生命周期：[架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)
- 流式 Task 输出：[Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)
- 顶层/嵌套解引用及序列化：[Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)
- Actor Task：[Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)
- 学习顺序：[Ray Core 学习路线](/kb/ai/Ray/Ray-Core/00-Ray-Core-学习路线/)
