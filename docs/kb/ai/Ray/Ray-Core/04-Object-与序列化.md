---
title: "Ray Core Object 与序列化"
permalink: /kb/ai/Ray/Ray-Core/04-Object-与序列化/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Ray Generator", link: /kb/ai/Ray/Ray-Core/03-Ray-Generator/ }
next: { text: "Ray Core：Actor 深入", link: /kb/ai/Ray/Ray-Core/05-Actor-深入/ }
knowledgeNote:
  series: "AI"
  group: "Ray Core"
---
::: info 版本范围
本文依据 **2026-08-01 的 Ray latest 官方文档**，只讨论 Ray Core Python 对象模型与序列化。Pickle 5、cloudpickle、共享对象存储是当前公开文档描述；具体内部格式、Plasma/raylet 实现及私有释放 API 不应视为稳定契约。
:::

Ray Task 和 Actor 通过 remote object 交换数据，代码中用 `ObjectRef` 引用它。理解 ObjectRef 的解引用、immutability、ownership 和 distributed reference counting，是避免性能和生命周期问题的关键。运行时组件见 [架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)，Task 依赖见 [Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)，逐项对象见 [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)。

## 1. ObjectRef 是什么

ObjectRef 类似 future/指针：它标识同一 Ray 集群内的远端对象，而不等于对象值或持久 URL。

ObjectRef 主要来自：

1. `ray.put(value)`；
2. remote function / actor method 的返回值。

```python
import ray

ray.init()

put_ref = ray.put({"source": "put", "value": 21})


@ray.remote
def double(x):
    return x * 2


task_ref = double.remote(21)
print(ray.get(put_ref))
print(ray.get(task_ref))
ray.shutdown()
```

每个节点有 object store。对象不会因 `ray.put` 自动广播到所有节点；其他节点需要时按需传输。小对象可能走内部 inline 优化，但应用代码不应依赖具体大小阈值或传输路径。

## 2. `ray.put`、返回值与 `ray.get`

### 2.1 何时使用 `ray.put`

大型只读对象被多个 Task 复用时，先 put 一次：

```python
import numpy as np
import ray

ray.init()


@ray.remote
def shard_sum(matrix, begin, end):
    return matrix[begin:end].sum()


matrix = np.ones((10_000, 1000), dtype=np.float32)
matrix_ref = ray.put(matrix)
refs = [
    shard_sum.remote(matrix_ref, begin, begin + 1000)
    for begin in range(0, 10_000, 1000)
]
print(sum(ray.get(refs)))
```

这里 `matrix_ref` 是顶层参数，会在 Task 启动前自动解引用。反复直接传 `matrix` 可能重复序列化/传输。另一方面，小整数、小配置不值得逐个 put；过多 ObjectRef 会增加元数据和引用计数成本。

避免在 remote function 里 `ray.put` 后直接返回 ref 作为常规返回协议：这会增加 owner/两层 ref 的复杂度，且可能损害容错。通常直接 `return value`，让 Ray 管理 Task 返回对象。

### 2.2 `ray.get`

```python
import time
import ray
from ray.exceptions import GetTimeoutError

ray.init()


@ray.remote
def slow(x):
    time.sleep(2)
    return x


refs = [slow.remote(i) for i in range(3)]
try:
    values = ray.get(refs, timeout=0.5)  # 批量并行等待
except GetTimeoutError:
    print("not ready yet")

values = ray.get(refs)
assert values == [0, 1, 2]
```

- `ray.get(ref)` 返回一个值；`ray.get([refs...])` 保持输入顺序返回值列表。
- `timeout` 只让当前等待提前失败，不会取消底层 Task；要取消用 `ray.cancel`。
- 多个 ref 用一次批量 `get`，不要循环逐个按提交顺序阻塞；若希望完成即处理，用 `ray.wait`。
- async 代码可 `await ref`，不要阻塞事件循环。

## 3. 顶层与嵌套 ObjectRef 解引用

这是最重要的传参规则。

### 3.1 顶层：按值依赖

```python
import ray

ray.init()


@ray.remote
def inspect_top_level(x):
    return type(x).__name__, x + 1


ref = ray.put(41)
assert ray.get(inspect_top_level.remote(ref)) == ("int", 42)
```

ObjectRef 直接作为 Task/Actor constructor/actor method 的某个参数时，Ray 自动获取底层值。Task 要等对象 ready，调度器也知道这项数据依赖。

### 3.2 嵌套：按引用传递

```python
@ray.remote
def inspect_nested(bundle):
    inner_ref = bundle["value"]
    assert isinstance(inner_ref, ray.ObjectRef)
    return ray.get(inner_ref) + 1


ref = ray.put(41)
assert ray.get(inspect_nested.remote({"value": ref})) == 42
```

嵌套在 list、dict 或其他对象内的 ObjectRef 不自动解引用。这样 Task 可选择：

- `ray.get` 读取；
- 不读取，直接转发给另一个 Task；
- 根据元数据只读取部分 refs。

选择原则：

- 消费者一定要用值：**顶层传 ref**，依赖清晰且可做局部性调度；
- 消费者只协调/转发或选择性读取：嵌套传 ref；
- 不要为了“看起来整洁”把全部 refs 包进一个 list，意外失去自动解引用。

Actor constructor/method 同样遵守：`Actor.remote(ref)` 是按值，`Actor.remote([ref])` 是按引用。Actor 细节见 [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)。

### 3.3 嵌套 remote object

```python
inner = ray.put({"payload": 42})
outer = ray.put({"inner_ref": inner})
del inner

container = ray.get(outer)
assert ray.get(container["inner_ref"]) == {"payload": 42}
```

外层对象捕获内层 ObjectRef。只要外层引用链仍有效，distributed reference counting 会使内层保持存活。这既能构造复合对象，也可能造成不明显的内存保留。

## 4. Immutability：远端对象不可变

对象写入 object store 后不可修改。这使同一数据能安全复制到多个节点、由同节点多个 Worker 共享，而不需要副本一致性协议。

“不可变”是 remote object 的语义，不代表任意 `ray.get` 返回的 Python 容器都被语言层冻结：

```python
ref = ray.put({"items": [1, 2]})
local = ray.get(ref)
local["items"].append(3)

# 修改的是本进程反序列化结果，不会原地改写 object store 中的对象。
assert ray.get(ref) == {"items": [1, 2]}
```

要产生新版本，创建新对象：

```python
@ray.remote
def append_item(data, item):
    return {**data, "items": [*data["items"], item]}


new_ref = append_item.remote(ref, 3)
```

需要持续可变状态时使用 Actor，而不是试图原地改 remote object，见 [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)。

## 5. Distributed reference counting

Ray 跟踪分布在 Driver、Worker 和对象内部的 ObjectRef。只要集群中仍有有效引用，对象通常保持 pinned；所有引用消失后，数据可被回收。

会保留对象的常见引用：

- Driver/Worker 的本地 Python `ObjectRef`；
- pending Task 的参数；
- Worker 正在使用的反序列化参数；
- 嵌套在另一个 Ray object 内的 ref；
- remote function 闭包捕获的 ref；
- 零拷贝 `ray.get` 得到的 NumPy 视图。

```python
import gc
import ray

ray.init()

refs = [ray.put(bytearray(10_000_000)) for _ in range(10)]
# 使用对象……
del refs
gc.collect()
```

注意：

- `del` 只是移除当前名字；容器、闭包、Task 和别的进程可能仍持有 ref。
- Python GC 和分布式引用更新不是即时全局屏障。
- 不要依赖精确回收时刻保证业务正确性。
- 闭包捕获 ObjectRef 可一直 pin 到 job 结束，应优先显式传参。

排查：

```bash
ray memory --sort-by=OBJECT_SIZE --group-by=STACK_TRACE
ray memory --stats-only
```

常见引用类型包括 `LOCAL_REFERENCE`、`USED_BY_PENDING_TASK`、`CAPTURED_IN_OBJECT`、`PINNED_IN_MEMORY`。具体输出列可能随版本演进。

## 6. Ownership

对象的 owner 是**创建原始 ObjectRef 的进程**，不一定是计算值的进程。

```python
import numpy as np
import ray

ray.init()


@ray.remote
def make_array():
    return np.zeros(1000)


x = ray.put(1)          # Driver 创建 ref 和值，owner 是 Driver
```

owner 跟踪对象位置、引用和重建所需元数据。值可位于某个 Worker 节点的 object store，也可复制到多个节点，这不转移 ownership。

### 6.1 Owner 生命周期的后果

- owner 活着、某个数据副本丢失：Ray 可找其他副本或尝试 lineage reconstruction；
- owner 死亡：当前 Ray 不支持恢复 ownership，消费者可能收到 `OwnerDiedError`；
- `ray.put` 数据丢失：没有创建 Task lineage，无法重放 `put`；
- Task 返回对象丢失：在 owner 活着、lineage/依赖可用且重试额度允许时可重建。

```python
try:
    value = ray.get(y)
except ray.exceptions.OwnerDiedError:
    # 从业务持久化层重建，或让上层重新提交完整计算。
    value = recover_from_external_store()
```

ObjectRef 不适合：

- 写入数据库后在未来任意 job 中恢复；
- 跨 Ray 集群使用；
- owner 已结束后作为永久对象句柄。

需要持久数据时持久化**值**到对象存储/数据库/文件系统，并存业务 key。

## 7. Pickle 5 与 cloudpickle

Worker 之间不共享普通进程 heap，数据、函数和异常必须序列化。当前 Ray 使用定制的 Pickle protocol 5 路径，并借助 cloudpickle 支持更丰富的 Python 对象，例如 lambda、嵌套函数和动态类。

概念分工：

- **Pickle protocol 5**：支持 out-of-band buffer，适合大型连续数据缓冲区；
- **cloudpickle**：扩展标准 pickle，可按值序列化动态定义的函数/类等；
- **object store**：存储不可变对象缓冲区，并支持同节点高效共享。

这不意味着任何 Python 对象都可安全序列化。典型不可序列化对象：

- `threading.Lock`；
- 活动数据库连接；
- socket、文件句柄；
- 绑定进程/线程状态的 C 扩展对象；
- 闭包意外捕获上述对象。

推荐传纯数据：标量、str/bytes、list/dict、dataclass 的纯状态、NumPy 数组及其组合。资源句柄在 Worker 内重建，或由 Actor 长期持有。

### 7.1 对象图语义

Pickle 可保留同一对象图中的共享引用：

```python
import numpy as np
import ray

ray.init()

array = np.zeros(42)
graph = [array] * 3
restored = ray.get(ray.put(graph))
assert restored[0] is restored[1]
```

Ray 当前 Pickle 5 路径也支持递归对象；但复杂对象图通常更难调试和跨版本维护，分布式接口应优先简单 schema。

## 8. NumPy zero-copy

Pickle 5 的 out-of-band buffer 让 object store 中的 NumPy 数组在**同节点反序列化读取**时通常无需复制底层数据；Worker 得到指向共享内存的数组视图。

```python
import numpy as np
import ray

ray.init()

ref = ray.put(np.arange(10, dtype=np.int64))
arr = ray.get(ref)
print(arr.flags.writeable)  # 通常 False
```

零拷贝的边界：

- “零拷贝反序列化”不等于跨节点零网络拷贝；远端节点仍要传输数据；
- Python list 等对象仍需反序列化和分配；
- 同节点共享数组是只读的；
- 持有数组视图可 pin object store 数据，即使原 ObjectRef 已 `del`；
- 非连续、对象 dtype 或复杂包装可能不具备同样收益，应实测。

### 8.1 `assignment destination is read-only`

```python
import numpy as np
import ray

ray.init()


@ray.remote
def mutate_wrong(arr):
    arr[0] = 99  # ValueError: assignment destination is read-only
    return arr


@ray.remote
def mutate_right(arr):
    writable = arr.copy()
    writable[0] = 99
    return writable


ref = ray.put(np.zeros(10))
result = ray.get(mutate_right.remote(ref))
assert result[0] == 99
```

`.copy()` 放弃该次读取的零拷贝优势，但保持 remote object immutability。若算法本质上原地更新大量状态，考虑按分片 copy、重新设计算法，或使用 Actor 管理本地可变状态。

## 9. 自定义序列化

### 9.1 有源码：`__reduce__`

只序列化可重建状态，不序列化活动连接：

```python
import sqlite3
import ray


class DBConnection:
    def __init__(self, path):
        self.path = path
        self.conn = sqlite3.connect(path)

    def __reduce__(self):
        return DBConnection, (self.path,)


ray.init()
original = DBConnection("/tmp/example.db")
restored = ray.get(ray.put(original))
print(restored.conn)
```

反序列化会创建新连接，不共享原连接。构造器必须在每个 Worker 可用，路径也必须在对应节点有意义。对于集群数据库，通常传 DSN/凭据引用并在 Task 内连接更清晰。

### 9.2 无法修改类：注册 serializer

```python
import threading
import ray


class LockedValue:
    def __init__(self, value):
        self.value = value
        self.lock = threading.Lock()


def serialize_locked(obj):
    return obj.value


def deserialize_locked(value):
    return LockedValue(value)


ray.init()
ray.util.register_serializer(
    LockedValue,
    serializer=serialize_locked,
    deserializer=deserialize_locked,
)

copied = ray.get(ray.put(LockedValue(42)))
assert copied.value == 42
ray.util.deregister_serializer(LockedValue)
```

关键边界：serializer 注册是**每个 Worker 本地**的。Driver 注册不自动保证所有 Worker 已注册。可在 remote function 内注册，或借助统一导入/初始化机制保证每个进程执行注册：

```python
def register_serializers():
    ray.util.register_serializer(
        LockedValue,
        serializer=serialize_locked,
        deserializer=deserialize_locked,
    )


@ray.remote
def consume(obj):
    register_serializers()
    return obj.value
```

但请注意参数在函数体执行前就必须反序列化，因此“只在函数体内注册参数类型 serializer”可能太晚。更稳妥的方法是让 Worker 启动路径先注册，或传简单状态并在函数体构造对象：

```python
@ray.remote
def consume_state(value):
    local_object = LockedValue(value)
    return local_object.value


assert ray.get(consume_state.remote(42)) == 42
```

自定义异常 serializer 同样必须在抛出端和接收端可用。

### 9.3 包装单个对象

如果只想改变某个实例的表示，可用带 `__reduce__` 的 wrapper，而不是全局注册整个类型。该模式适合局部转换，但会改变反序列化后的顶层类型/协议，接口需写清楚。

### 9.4 设计原则

- serializer 输出简单、版本化的纯数据；
- 不序列化锁、线程、连接本身；反序列化时重建；
- 处理 schema 版本和代码部署一致性；
- 不在 serializer 中执行不可控外部副作用；
- 对性能做真实数据基准，不因“自定义”就假定更快。

## 10. `inspect_serializability`

提交前定位闭包或对象中的不可 pickle 成员：

```python
import threading
from ray.util import inspect_serializability

lock = threading.Lock()


def bad_function():
    with lock:
        return 1


inspect_serializability(bad_function, name="bad_function")
```

它会递归检查并打印可能的失败路径。返回/输出适合诊断，不应作为生产业务逻辑。

修复常见闭包问题：

```python
# 错误：remote function 捕获进程本地 lock。
lock = threading.Lock()


@ray.remote
def bad():
    with lock:
        return 1


# 更好：只传纯数据；需要同步状态则使用 Actor。
@ray.remote
def good(value):
    return value + 1
```

需要更深诊断时，可在 **import Ray 之前**设置 `RAY_PICKLE_VERBOSE_DEBUG=2`，官方文档说明这会采用更易调试但明显更慢的 Python 路径；只在诊断环境使用。

## 11. 显式序列化 ObjectRef 的危险

正常方式是在 Ray Task 参数、返回值或 Ray object 内传 ObjectRef。只有不得已时才用 `ray.cloudpickle` 显式写到外部介质：

```python
from ray import cloudpickle

ref = ray.put({"value": 42})
payload = cloudpickle.dumps(ref)
restored_ref = cloudpickle.loads(payload)
assert ray.get(restored_ref) == {"value": 42}
```

限制：

- 反序列化进程必须属于同一 Ray 集群；
- 必须使用 `ray.cloudpickle`，其他 pickle 工具不保证工作；
- 显式序列化会 pin 对象，容易形成难排查的生命周期泄漏；
- 官方示例中的 `ray._private.internal_api.free` 是**私有 API**，可能变化，不应成为应用的长期公共接口；
- 它仍不能让 ref 在 owner 死亡后变成持久句柄。

最佳实践是外部存储写对象值和业务 key，不写 ObjectRef。

## 12. Object spilling：只做入门引导

object store 满时，Ray 会将可 spill 对象写到本地磁盘，之后按需 restore。默认位置在 Ray 临时/session 目录下，可指定目录：

```python
import ray

ray.init(object_spilling_directory="/fast-disk/ray-spill")
```

或集群启动时：

```bash
ray start --head --object-spilling-directory=/fast-disk/ray-spill
```

观察：

```bash
ray memory --stats-only
```

要点：

- spilling 延长可处理数据规模，但增加磁盘写入/恢复延迟；
- spill 目录需要足够容量、吞吐和正确权限；
- 本地磁盘故障/节点故障不能替代外部持久化；
- 优先修复无界 ObjectRef 保留、过大结果和无背压，再调 spill；
- 具体配置与日志格式可能变化，应继续阅读对应版本官方 Object Spilling 文档。

本文不展开高级 spilling 配置，避免将内部实现参数当稳定 API。容量规划、pinning 和排障继续见 [内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/)。

## 13. 性能实践

### 13.1 避免重复传大值

```python
# 反模式：large_array 每次调用都作为普通值进入提交路径。
refs = [consume.remote(large_array, i) for i in range(100)]

# 推荐：put 一次，顶层 ref 复用。
large_ref = ray.put(large_array)
refs = [consume.remote(large_ref, i) for i in range(100)]
```

### 13.2 数据形状

- 大型数值数据优先连续 NumPy 数组或数组集合，利用 Pickle 5 buffer；
- 百万级微小 Python 对象会有较大序列化和对象管理开销，先批处理/列式化；
- 压缩可省网络但耗 CPU，依据带宽、数据熵和端到端基准决定；
- 数据局部性是优化提示，不是固定放置保证。

### 13.3 内存峰值

同时考虑：

- Driver 原始对象；
- 序列化临时缓冲；
- object store 副本；
- Worker heap 反序列化副本；
- NumPy 只读共享视图造成的 pin；
- 跨节点复制和 spilling。

只看 `top` 的 RSS 可能重复计算共享内存；Ray 文档建议区分 RSS 与 SHR，并配合 `ray memory`。

## 14. 错误模式速查

| 现象 | 根因 | 修复 |
|---|---|---|
| Task 收到 ObjectRef 而非值 | ref 被嵌套在容器内 | 顶层传 ref，或在 Task 内显式 `ray.get` |
| NumPy 写入报只读 | zero-copy 共享对象不可变 | `arr = arr.copy()` 后修改 |
| `cannot pickle '_thread.lock'` | 对象/闭包含锁 | 传纯状态、重建资源、Actor 或自定义 serializer |
| Object store 长期不释放 | 本地/嵌套/pending/零拷贝视图仍引用 | `ray memory` 查引用链并释放实际持有者 |
| `OwnerDiedError` | 创建 ref 的进程死亡 | 从业务持久层重建，重新提交完整计算 |
| `ObjectReconstructionFailedError` | lineage/依赖/重试条件不满足 | 调整容错设计并持久化不可重建输入 |
| `ObjectLostError` | 数据副本不可达且无法重建 | 重算或从外部存储恢复 |
| 自定义 serializer 在某 Worker 失效 | 注册仅进程本地 | 各 Worker 一致初始化，或传简单状态 |
| spill 很多且吞吐下降 | 活跃对象集超出 object store | 背压、缩短 ref 生命周期、调整批大小/磁盘 |

## 15. 最佳实践清单

- ObjectRef 只用于当前集群内的数据依赖，不作为持久化 ID。
- 大型只读参数 `ray.put` 一次并复用；小值直接传。
- 消费值时顶层传 ref；只有协调/选择性读取时嵌套 ref。
- 远端对象按不可变数据设计；变更产生新对象。
- Task 返回值直接 `return value`，避免无必要 `return ray.put(value)`。
- 优先 NumPy/简单容器，减少复杂 Python 对象图。
- 修改 NumPy 前显式 copy，并把复制成本纳入基准。
- 自定义序列化只保存可重建状态，确保所有相关 Worker 注册一致。
- 用 `inspect_serializability` 检查函数闭包、类和实例。
- 用 `ray memory` 查真正 pin 住对象的引用，不依赖手动私有 free API。
- 将 Task 写成幂等、可重放；将关键输入/结果持久化到外部系统。
- 把 spilling 当容量缓冲和故障信号，不当持久化层或无限内存。

## 16. 延伸阅读

- Driver、object store 与 owner 生命周期：[架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)
- Task 参数、依赖与容错：[Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)
- yielded ObjectRef 的回收与故障：[Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)
- 有状态资源与不可序列化句柄：[Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)
- 系列路线：[Ray Core 学习路线](/kb/ai/Ray/Ray-Core/00-Ray-Core-学习路线/)
