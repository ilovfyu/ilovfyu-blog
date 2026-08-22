---
title: "Ray Core：Actor 深入"
permalink: /kb/ai/Ray/Ray-Core/05-Actor-深入/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Ray Core Object 与序列化", link: /kb/ai/Ray/Ray-Core/04-Object-与序列化/ }
next: { text: "Ray Core：资源与调度", link: /kb/ai/Ray/Ray-Core/06-资源与调度/ }
knowledgeNote:
  series: "AI"
  group: "Ray Core"
---
::: info 文档基线
本文只讨论 Ray Core，依据 2026-08-01 的 Ray latest 官方文档。示例面向 Python API，可保存为脚本直接运行；安装命令为 `pip install -U "ray[default]"`。
:::

Actor 是有状态的远程 worker。调用 `ActorClass.remote()` 时，Ray 创建一个专属 Python 进程；该进程不被普通 task 复用，方法共享进程内状态。跨 actor 可并行，同一 actor 是否串行取决于 actor 类型和并发配置。

## 1. 最小可运行示例

```python
import ray

ray.init()

@ray.remote(num_cpus=1)
class Counter:
    def __init__(self, initial=0):
        self.value = initial

    def add(self, n=1):
        self.value += n
        return self.value

    def get(self):
        return self.value

counter = Counter.remote(10)          # ActorHandle，不是本地 Counter
refs = [counter.add.remote() for _ in range(3)]
print(ray.get(refs))                  # [11, 12, 13]
print(ray.get(counter.get.remote()))  # 13
ray.shutdown()
```

`.remote()` 立即返回 `ObjectRef`，真正取值才用 `ray.get()`。actor 默认资源规则很特殊：创建时要求 1 个逻辑 CPU，运行时默认占 0 CPU。生产中应显式写 `num_cpus`，否则一个节点可能塞入远超预期的 actor。资源细节见 [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)。

## 2. 三种执行模型

### 2.1 普通同步 actor

没有 `async def`，且没有把 `max_concurrency` 设为大于 1 时，是单线程串行 actor。它最容易推理，适合可变状态机、协调器和串行访问的客户端。

```python
import ray
import time

ray.init()

@ray.remote(num_cpus=1)
class Ledger:
    def __init__(self):
        self.balance = 0

    def deposit(self, amount):
        time.sleep(0.1)
        self.balance += amount
        return self.balance

ledger = Ledger.remote()
print(ray.get([ledger.deposit.remote(10), ledger.deposit.remote(20)]))
assert ray.get(ledger.deposit.remote(0)) == 30
ray.shutdown()
```

单线程只避免 actor 内部方法同时执行，并不自动提供业务事务：方法中对外部数据库的多步写入仍可能部分成功。

### 2.2 async actor

类中只要出现至少一个 `async def`，Ray 就把整个类识别为 async actor。方法在一个 Python 线程、一个 asyncio event loop 上复用执行；遇到 `await` 才让出控制权。默认 `max_concurrency=1000`，它是准入上限，不是 1000 条线程。

```python
import asyncio
import ray

ray.init()

@ray.remote(num_cpus=1)
class AsyncPool:
    def __init__(self):
        self.in_flight = 0

    async def request(self, value):
        self.in_flight += 1
        try:
            await asyncio.sleep(0.2)  # 模拟异步网络 I/O
            return value * 2
        finally:
            self.in_flight -= 1

pool = AsyncPool.options(max_concurrency=8).remote()
print(ray.get([pool.request.remote(i) for i in range(10)]))
ray.shutdown()
```

async 方法内不要调用阻塞的 `ray.get()`、`ray.wait()`、`time.sleep()` 或同步 HTTP 客户端，否则会冻结整个 event loop。可直接 `result = await ref`；Python 3.11+ 与标准库集成时也可用 `asyncio.wrap_future(ref.future())`。CPU 密集代码也会阻塞 loop，应改用 task、多个 actor，或明确卸载到线程/本地进程。

### 2.3 threaded actor

类中没有任何 `async def`，同时设置 `max_concurrency > 1`，Ray 使用线程池，每次方法调用占一个线程。

```python
import threading
import time
import ray

ray.init()

@ray.remote(num_cpus=2)
class ThreadedClient:
    def call(self, value):
        time.sleep(0.2)  # 会释放 GIL 的阻塞 I/O
        return value, threading.get_ident()

client = ThreadedClient.options(max_concurrency=4).remote()
print(ray.get([client.call.remote(i) for i in range(8)]))
ray.shutdown()
```

threaded actor 的共享字段必须按普通多线程代码保护，可使用 `threading.Lock`。锁内不要做远程等待，否则容易形成锁竞争或分布式死锁。

## 3. GIL 与并发上限

Python GIL 使同一进程内同一时刻通常只有一个线程执行 Python 字节码。因此：

| 工作负载 | 推荐模型 | 原因 |
| --- | --- | --- |
| 大量异步网络 I/O | async actor | 单线程低开销复用 |
| 阻塞 I/O SDK | threaded actor | 线程可在 I/O 时并发 |
| NumPy/PyTorch 等释放 GIL 的原生计算 | threaded 或多个 actor | 原生代码可真实并行 |
| 纯 Python CPU 密集 | 多个 actor 或 task | async/线程都不能绕过 GIL |
| 强一致的可变状态 | 普通 actor | 串行语义最清晰 |

`max_concurrency` 控制 actor 同时处理多少调用。设得过大不会增加 CPU，反而会增加排队中的协程、线程栈、打开的连接和状态竞争。它也不会改变 actor 的 `num_cpus` 资源申请；并发 16 的线程 actor 若确实需要 16 核，应自行声明足够 CPU，并约束底层库线程数。

## 4. 并发组

::: warning 实验性能力
官方 API 参考把 actor `concurrency_groups` 标为实验性，接口可能变化。它支持 async 和 threaded actor；关键业务应固定 Ray 版本并做升级测试。
:::

并发组给不同方法分配独立并发配额。例如健康检查不应被慢请求占满：

```python
import asyncio
import ray

ray.init()

@ray.remote(
    num_cpus=1,
    concurrency_groups={"io": 4, "control": 1},
)
class Service:
    @ray.method(concurrency_group="io")
    async def fetch(self, key):
        await asyncio.sleep(0.1)
        return key

    @ray.method(concurrency_group="control")
    async def health(self):
        return "ok"

service = Service.options(max_concurrency=2).remote()
print(ray.get(service.health.remote()))
print(ray.get([service.fetch.remote(str(i)) for i in range(8)]))
ray.shutdown()
```

未标注方法进入 default group；其并发度由 `max_concurrency` 决定，async 默认 1000，其他 actor 默认 1。调用时可用 `service.fetch.options(concurrency_group="control").remote(...)` 动态改组，但静态绑定更易维护。组与组之间仍共享 actor 状态，不是隔离区。

## 5. 调用顺序与多个调用者

同步单线程 actor 对**同一 submitter**（driver 或同一个 worker）提交的调用，通常按提交顺序执行。以下情况不要依赖全局 FIFO：

- 不同 submitter 向同一 actor 提交调用，彼此之间无顺序保证。
- 较早调用的参数依赖尚未就绪时，另一个 submitter 的可运行调用可能先执行。
- async 或 threaded actor 不保证执行顺序。
- 设置 `allow_out_of_order_execution=True` 会放宽顺序；该选项属于底层 actor 选项，应谨慎使用。
- actor task 开启重试后，失败与重试会影响观察到的顺序；并发 actor 尤其不能假设 FIFO。

若业务需要因果顺序，应显式传递依赖：

```python
@ray.remote
class Ordered:
    def apply(self, previous, value):
        return value

actor = Ordered.remote()
first = actor.apply.remote(None, "first")
second = actor.apply.remote(first, "second")  # first 是依赖屏障
print(ray.get(second))
```

更稳健的设计是把序列号、版本号或幂等键放进协议，由 actor 验证，而不是把提交时间当作一致性协议。

## 6. ActorHandle 的所有权与传递

handle 可被序列化并传给 task、actor 或其他 driver；每份 handle 都指向同一个 actor。只调用 `.remote()` 而不 `ray.get()` 是 fire-and-forget 提交，不代表成功。普通 actor 的 owner 是最初调用 `ActorClass.remote()` 的进程：owner 死亡时 actor 与之 fate-share，即使别处还有 handle。

```python
@ray.remote
def use_counter(handle, n):
    return ray.get(handle.add.remote(n))

counter = Counter.remote()
print(ray.get(use_counter.remote(counter, 5)))
```

避免在热路径反复广播 handle 或构造环状 actor 依赖。需要跨 job 查找时使用 named actor，而不是自行持久化 handle 的内部字节表示。

## 7. Named 与 detached actor

名字在 namespace 内唯一。`name` 只提供发现能力，不延长生命周期；`lifetime="detached"` 才使 actor 脱离创建 job，并且 detached actor 不再有 owner 进程。

```python
import ray

ray.init(address="auto", namespace="payments")

@ray.remote(num_cpus=1)
class Registry:
    def ping(self):
        return "pong"

registry = Registry.options(
    name="registry-v1",
    lifetime="detached",
    get_if_exists=True,
).remote()
assert ray.get(ray.get_actor("registry-v1").ping.remote()) == "pong"
```

`get_if_exists=True` 已存在时会返回旧 actor，新的构造参数会被忽略。部署升级前必须处理版本兼容。跨 namespace 可 `ray.get_actor(name, namespace="payments")`。detached actor 不会自动 GC，应建立命名、盘点和回收制度。

## 8. 终止与清理

- 所有 Python handle 离开作用域后，普通 actor 会在完成排队工作后自动终止。
- `actor.__ray_terminate__.remote()` 触发手动 graceful termination，并调用同步的 `__ray_shutdown__()`。
- `ray.actor.exit_actor()` 让 Actor 在方法内部主动退出并运行 `atexit` handler，但不要依赖它调用 `__ray_shutdown__()`；尚未执行的排队方法会失败。
- `ray.kill(actor)` 是强制终止，不执行 `__ray_shutdown__()` 或 `atexit`；适合 hang、泄漏和 detached actor 回收。
- `ray.kill(actor, no_restart=False)` 允许配置了 `max_restarts` 的 actor 被重启；默认 `no_restart=True`。

```python
import ray

@ray.remote
class ResourceOwner:
    def __init__(self):
        self.connection = open("actor-resource.txt", "a", encoding="utf-8")

    def __ray_shutdown__(self):
        self.connection.close()

actor = ResourceOwner.remote()
ray.get(actor.__ray_terminate__.remote())
```

`__ray_shutdown__()` 必须是同步方法。Actor handle 全部离开作用域后的正常终止，以及 `__ray_terminate__.remote()`，会调用它；`exit_actor()`、崩溃、OOM kill 和 `ray.kill()` 不应被假定会调用它。清理必须可重复，外部资源还应有租约或超时兜底。

## 9. 崩溃、重启与状态

`max_restarts` 控制 actor 进程意外死亡后的重建次数，默认 0，`-1` 为无限。重启会重新运行 `__init__`，不会自动恢复内存状态。`max_task_retries` 控制 actor method 因系统故障的重试次数，默认 0；非零意味着方法可能至少执行一次，甚至因“执行成功但回复前崩溃”而重复执行。

```python
import json
import os
import ray

ray.init()
checkpoint = os.path.abspath("counter-checkpoint.json")

@ray.remote(max_restarts=2, max_task_retries=3, num_cpus=1)
class DurableCounter:
    def __init__(self, path):
        self.path = path
        self.value = 0
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                self.value = json.load(f)["value"]

    def set_value(self, request_id, value):
        # 示例用覆盖写表达幂等语义；生产中应原子写临时文件再 rename，
        # 且 checkpoint 必须位于所有候选节点可访问的共享存储。
        self.value = value
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump({"request_id": request_id, "value": value}, f)
        return self.value

actor = DurableCounter.remote(checkpoint)
print(ray.get(actor.set_value.remote("req-001", 42)))
ray.shutdown()
```

精确语义与 checkpoint 设计见 [容错](/kb/ai/Ray/Ray-Core/09-容错/)。节点放置与重启资源见 [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)，PG 上的 actor 重建见 [Placement Group](/kb/ai/Ray/Ray-Core/07-Placement-Group/)。

## 10. 排错清单

| 症状 | 首要检查 | 常见修复 |
| --- | --- | --- |
| actor 一直 PENDING | `ray status`、资源请求、labels/PG | 修正不可满足资源，显式 `num_cpus` |
| async actor 全部卡住 | 是否用了 `ray.get`、`time.sleep`、同步 SDK | 改成 `await`/异步 SDK，或用 threaded actor |
| threaded actor 状态错乱 | 多线程读写、锁粒度 | 加锁、降低并发或改普通 actor |
| 返回值顺序偶发变化 | 多 submitter、并发 actor、重试 | 显式依赖、序列号、幂等协议 |
| actor 重启后状态归零 | 构造器只初始化默认值 | 外部 checkpoint 并在 `__init__` 恢复 |
| `ActorUnavailableError` | 重启、网络瞬断、死亡尚未确认 | 暂停流量并探活；不要盲目重复副作用 |
| `RayActorError` | actor/owner 死亡、重启耗尽 | `ray list actors --detail` 查看 death cause |
| detached actor 泄漏 | 无自动 GC | `ray list actors` 后用 handle 执行 `ray.kill` |

常用命令（需 `ray[default]`）：

```bash
ray list actors --detail
ray list tasks --detail
ray status
```

## 11. 最佳实践

1. 无状态工作优先用 task；确需状态、连接复用或协调时才用 actor。
2. 显式声明 actor 的 CPU/GPU/memory，避免历史默认值带来的过度调度。
3. async 只放非阻塞 I/O；threaded 只用于阻塞 I/O 或释放 GIL 的库。
4. 从小的 `max_concurrency` 开始压测，以延迟、内存和下游容量决定上限。
5. 并发 actor 的方法按可重入、多线程/协程共享状态来设计，不依赖调用顺序。
6. detached actor 必须命名，并配套 owner、版本、健康检查与销毁流程。
7. 开启任何重试前，先使方法幂等，并把关键状态 checkpoint 到跨节点存储。

## 系列导航

- 上一篇：[Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)
- 下一篇：[资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)
- 相关：[Placement Group](/kb/ai/Ray/Ray-Core/07-Placement-Group/) · [内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/) · [容错](/kb/ai/Ray/Ray-Core/09-容错/)

## 官方依据

- [Actors](https://docs.ray.io/en/latest/ray-core/actors.html)
- [AsyncIO / Concurrency for Actors](https://docs.ray.io/en/latest/ray-core/actors/async_api.html)
- [Concurrency Groups](https://docs.ray.io/en/latest/ray-core/actors/concurrency_group_api.html)
- [Actor Task Execution Order](https://docs.ray.io/en/latest/ray-core/actors/task-orders.html)
- [Named Actors](https://docs.ray.io/en/latest/ray-core/actors/named-actors.html)
- [Terminating Actors](https://docs.ray.io/en/latest/ray-core/actors/terminating-actors.html)
- [Actor Fault Tolerance](https://docs.ray.io/en/latest/ray-core/fault_tolerance/actors.html)
