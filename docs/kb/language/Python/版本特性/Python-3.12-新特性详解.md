---
title: "Python 3.12 新特性详解"
permalink: /kb/language/Python/版本特性/Python-3.12-新特性详解/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "Python 3.13 新特性详解", link: /kb/language/Python/版本特性/Python-3.13-新特性详解/ }
knowledgeNote:
  series: "Language"
  group: "版本特性"
---
::: info 版本状态与整理口径
Python 3.12.0 发布于 2023-10-02。本文基于 Python 3.12 官方 What’s New、标准库文档和相关 PEP，整理相对 Python 3.11 的版本级变化。这里的“完整”指覆盖语言、解释器、typing、重要标准库、性能、移除/弃用、C API 和迁移影响，不逐条复制补丁级 changelog。本文核对日期为 2026-08-15；3.12 当前处于仅安全修复阶段。
:::

## 一句话结论

Python 3.12 是 CPython 多核路线的基础版本：它通过 PEP 684 实现了**每解释器独立 GIL**，但 3.12 只提供 C API，普通 `threading` 和 `ThreadPoolExecutor` 仍不能让纯 Python CPU 密集代码跨核并行。与此同时，PEP 695、PEP 701、PEP 669、PEP 688 和 PEP 709 分别改进了泛型语法、f-string、低开销监控、buffer protocol 和推导式性能。

## 版本亮点

| 领域 | 核心变化 | 实际影响 |
|---|---|---|
| 泛型与类型别名 | PEP 695：`class Box[T]`、`def f[T]`、`type Alias = ...` | 泛型定义更紧凑，类型参数作用域更明确 |
| f-string | PEP 701：正式纳入 PEG 语法 | 同类引号、反斜杠、多行和注释都可用于表达式 |
| GIL | PEP 684：每解释器独立 GIL | 多个隔离解释器可跨核并行，但 3.12 仅 C API |
| 监控 | PEP 669：`sys.monitoring` | 调试器、覆盖率和 profiler 可按事件低开销插桩 |
| Buffer | PEP 688：Python 层 buffer protocol | Python 类可实现 `__buffer__()`，新增 `Buffer` ABC |
| 性能 | PEP 709：推导式内联 | 列表、集合、字典推导式不再创建临时函数帧 |
| asyncio | socket 写入、eager task、runner 等增强 | 部分基准显著提速，但 eager task 会改变执行时序 |
| 清理 | 移除 `distutils`、`imp`、`asyncore` 等 | 升级时需要处理构建、导入和旧异步网络代码 |

## 语言与语法

### PEP 695：类型参数新语法

3.12 可以直接在函数、类和类型别名上声明类型参数：

```python
from collections.abc import Callable, Hashable, Sequence


def first[T](items: Sequence[T]) -> T:
    return items[0]


class Box[T]:
    def __init__(self, value: T) -> None:
        self.value = value


type Point = tuple[float, float]
type Pair[T] = tuple[T, T]
type IntFunc[**P] = Callable[P, int]
type LabeledTuple[*Ts] = tuple[str, *Ts]
type HashableSequence[T: Hashable] = Sequence[T]
type IntOrStrSequence[T: (int, str)] = Sequence[T]
```

核心语义：

- `type` 在类型别名语句中是 soft keyword，不影响其他位置继续把 `type` 当标识符。
- `type Alias = ...` 创建 `typing.TypeAliasType`，不等于普通变量赋值。
- 新语法支持 `TypeVar`、`ParamSpec` 和 `TypeVarTuple`。
- 类型别名的值、类型变量的 bound 和 constraints 按需求值，可以引用后面才定义的类型。
- 新增 annotation scope；类型参数只在声明及其嵌套作用域可见，不泄漏到模块作用域。
- 类型参数的方差可以由类型检查器推断。
- 新旧泛型语法都可用，但不应在同一个声明中混合两套类型参数来源。
- 这是静态类型系统增强，运行时不会自动验证参数和返回值类型。

```python
class Container[T]:
    item: T


print(Container.__type_params__)
print(T)  # NameError：T 不在模块作用域
```

::: warning
`typing_extensions` 可以回移部分 typing API，但不能让 Python 3.11 解析器理解 `def f[T]` 或 `type Alias = ...`。使用新语法会直接提高项目最低 Python 版本。
:::

### PEP 701：f-string 正式语法化

f-string 现在由 PEG parser 解析，表达式部分可以使用任何普通 Python 表达式允许的语法：

```python
songs = ["Eden", "Alkaline", "Ascensionism"]

print(f"playlist: {", ".join(songs)}")
print(f"one per line:\n{"\n".join(songs)}")
print(f"""values: {
    ", ".join([
        "alpha",  # 表达式内部允许注释
        "beta",
    ])
}""")
```

主要变化：

- 表达式可以复用外层 f-string 的引号。
- 表达式可以包含反斜杠和 Unicode 转义。
- 支持多行表达式和注释。
- f-string 可以更自然地嵌套。
- 错误信息可精确指向整个源码行中的错误位置。
- `tokenize` 不再把整个 f-string 视为单个 `STRING` token，而是产生 `FSTRING_START`、`FSTRING_MIDDLE`、表达式 token 和 `FSTRING_END`。

格式化工具、linter、语法高亮和源码转换器如果直接消费 token，需要适配新的 token 序列。

### 其他语言变化

- 非法反斜杠转义从 `DeprecationWarning` 提升为 `SyntaxWarning`；正则表达式应优先使用 raw string。
- 大于 `0o377` 的八进制转义也改为 `SyntaxWarning`，未来可能成为 `SyntaxError`。
- 源代码中的空字节直接产生 `SyntaxError`；`ast.parse()` 也统一抛出 `SyntaxError`。
- `slice` 对象可哈希，可在组成部分可哈希时作为 dict key 或 set item。
- `sum()` 对浮点数及 int/float 混合输入采用 Neumaier 补偿求和，提高准确性与顺序稳定性。
- `memoryview` 支持半精度浮点格式码 `"e"`。
- `__set_name__()` 抛出的原异常不再包装为 `RuntimeError`，而是附加 exception note。
- 完整处理 `ExceptionGroup` 后只剩单一新异常时，不再无条件多包一层 `ExceptionGroup`。
- `NameError` 可提示缺少标准库导入或建议 `self.name`。
- `ImportError` 可根据模块已有成员建议正确名称。
- 错写 `import x from y` 时，会提示使用 `from y import x`。

## 解释器、性能与运行时

### PEP 709：推导式内联

列表、集合和字典推导式直接内联到外层函数，不再创建只执行一次的隐式函数对象和栈帧。

```python
def inspect_comprehension():
    outer = "visible in 3.12"
    return [locals().copy() for item in [1]]


print(inspect_comprehension())
```

可观察变化：

- traceback 不再出现独立的 `&lt;listcomp&gt;`、`&lt;setcomp&gt;` 或 `&lt;dictcomp&gt;` 帧。
- tracing/profiling 不再把推导式显示为一次函数调用。
- `locals()` 能看到外层函数局部变量，不再包含隐式 `.0` 参数。
- `symtable` 不再为这些推导式创建子符号表。
- 推导式循环变量仍保持隔离，不会覆盖外层同名变量。
- 生成器表达式不在本次内联范围内。

官方给出的单项推导式基准最高可接近 2 倍，但端到端收益取决于推导式在应用中的占比。

### PEP 669：`sys.monitoring`

`sys.monitoring` 面向 debugger、coverage、profiler 和优化器，提供按解释器、按 code object、按事件控制的监控 API。

关键接口：

```python
sys.monitoring.use_tool_id(tool_id, name)
sys.monitoring.free_tool_id(tool_id)
sys.monitoring.set_events(tool_id, event_set)
sys.monitoring.set_local_events(tool_id, code, event_set)
sys.monitoring.register_callback(tool_id, event, callback)
sys.monitoring.restart_events()
```

可监控函数开始、恢复、返回、yield、调用、源码行、指令、跳转、分支和异常等事件。callback 可返回 `sys.monitoring.DISABLE`，只关闭当前位置的后续事件。没有启用事件时成本接近零；启用大量 `LINE` 或 `INSTRUCTION` 事件仍然会产生实际开销。

```python
import sys

TOOL_ID = 3


def on_call(code, offset, callable_obj, arg0):
    print("CALL", code.co_name, getattr(callable_obj, "__name__", callable_obj))


def demo():
    return len([1, 2, 3])


sys.monitoring.use_tool_id(TOOL_ID, "demo")
sys.monitoring.register_callback(
    TOOL_ID,
    sys.monitoring.events.CALL,
    on_call,
)
sys.monitoring.set_events(TOOL_ID, sys.monitoring.events.CALL)
try:
    demo()
finally:
    sys.monitoring.set_events(TOOL_ID, sys.monitoring.events.NO_EVENTS)
    sys.monitoring.register_callback(TOOL_ID, sys.monitoring.events.CALL, None)
    sys.monitoring.free_tool_id(TOOL_ID)
```

### PEP 688：Python 层 buffer protocol

Python 类可以通过 `__buffer__()` 提供 buffer：

```python
class BufferProvider:
    def __init__(self, data: bytes) -> None:
        self._data = data

    def __buffer__(self, flags: int, /) -> memoryview:
        return memoryview(self._data)

    def __release_buffer__(self, buffer: memoryview, /) -> None:
        pass
```

同时新增：

- `collections.abc.Buffer`：用于运行时检查和类型标注。
- `inspect.BufferFlags`：表示 C buffer protocol 的请求 flag。
- `__release_buffer__()`：可选的资源释放钩子。

`Buffer` 不区分可写和只读，因为这通常是实例级能力，不一定能从类型本身判断。

### PEP 683：immortal objects

CPython 可以把部分全局内建对象标记为 immortal，使其引用计数不再按普通对象方式增减。它为多个解释器安全共享少量只读对象、降低引用计数写入和实现 free-threading 奠定基础。

需要避免的误解：

- 不是所有 Python 对象都变成 immortal。
- 用户不能通过普通 Python API 把自定义对象设为 immortal。
- 不代表垃圾回收器被移除。
- 不代表任意对象都可跨解释器安全共享。
- 不应依赖 `sys.getrefcount()` 对这些对象返回的具体数值。

### 其他优化

| 项目 | 官方 What’s New 给出的典型结果或方向 |
|---|---|
| CPython 总体 | 官方发布材料给出的总体估计约 5%，不是所有程序的保证 |
| `asyncio` | 部分基准最高约 75% |
| eager task | 特定同步完成型协程约 2 到 5 倍 |
| `asyncio.current_task()` | C 实现约 4 到 6 倍 |
| `tokenize` | 受 PEP 701 实现影响，最高约 64% |
| runtime-checkable Protocol | 常见小协议约 2 到 20 倍 |
| `re.sub()` / `re.subn()` | 含组引用的替换约 2 到 3 倍 |
| `inspect.getattr_static()` | 多数调用至少约 2 倍 |
| BOLT | 实验性构建优化约 1% 到 5% |

此外，3.12 增加 Linux `perf` 集成：`-X perf`、`PYTHONPERFSUPPORT` 和 `sys.activate_stack_trampoline()` 等 API。

## GIL、多线程与真正的 CPU 并行

### PEP 684：每解释器独立 GIL

3.12 新增 `Py_NewInterpreterFromConfig()`，可创建拥有自己 GIL 的隔离子解释器：

```c
PyInterpreterConfig config = {
    .use_main_obmalloc = 0,
    .allow_fork = 0,
    .allow_exec = 0,
    .allow_threads = 1,
    .allow_daemon_threads = 0,
    .check_multi_interp_extensions = 1,
    .gil = PyInterpreterConfig_OWN_GIL,
};

PyThreadState *tstate = NULL;
PyStatus status = Py_NewInterpreterFromConfig(&tstate, &config);
```

准确含义：

- 独立的是**解释器的 GIL**，不是每个线程一个 GIL。
- 一个解释器内的多个线程仍争用同一个 GIL。
- 多个解释器分别拥有 GIL，并运行在不同 OS 线程时，纯 Python 代码才可跨 CPU 核并行。
- 3.12 只公开 C API，没有正式的 Python 标准库多解释器 API。
- `threading.Thread`、`ThreadPoolExecutor` 和 `asyncio.to_thread()` 不会自动创建子解释器。
- `_xxsubinterpreters` 是私有实现细节，不应当作稳定公共 API。
- `Py_NewInterpreterFromConfig()` 创建解释器，不自动创建 OS 线程。

### 隔离与共享边界

每个解释器具有独立的 `sys.modules`、`sys.path`、`builtins`、`__main__`、模块对象、类、函数和大多数 Python 状态。

同一进程内仍共享地址空间、文件描述符、环境变量、进程级 OS 状态，以及可能存在于 C 扩展或底层 C 库中的全局状态。因此子解释器不是安全沙箱。

普通可变 Python 对象不能直接跨解释器使用。3.12 也没有完整的高层通信 API，通常需要嵌入层提供序列化、消息传递或受控共享内存。

### C 扩展要求

支持独立 GIL 的扩展应：

- 使用 PEP 489 多阶段初始化。
- 把可变状态放进每解释器或每模块状态，而不是 C 全局变量。
- 通过 `Py_mod_multiple_interpreters` 声明兼容级别。
- 对独立 GIL 使用 `Py_MOD_PER_INTERPRETER_GIL_SUPPORTED`。
- 审计链接的第三方 C 库是否含非线程安全全局状态。
- 谨慎处理默认假设主解释器的 `PyGILState_*` API。

### 3.12 并发模型对比

| 模型 | 纯 Python CPU 多核并行 | 内存模型 | 3.12 的适用边界 |
|---|---:|---|---|
| `threading` | 否 | 同一解释器共享对象 | I/O 并发；C 扩展主动释放 GIL 时可并行 |
| `ThreadPoolExecutor` | 否 | 同一解释器共享对象 | 阻塞 I/O、释放 GIL 的本地计算 |
| `asyncio` | 否 | 单解释器协作式 task | 高并发 I/O，不等于多核执行 |
| `asyncio.to_thread()` | 通常否 | 转交线程池 | 防止阻塞 event loop；纯 Python CPU 仍受 GIL |
| `multiprocessing` | 是 | 独立进程 | 常规 CPU 并行，有启动、pickle 和 IPC 成本 |
| `ProcessPoolExecutor` | 是 | 独立 worker 进程 | 高层 CPU 并行 API，目标和数据需可 pickle |
| own-GIL 子解释器 | 是 | 同进程、解释器隔离 | 仅 C API；扩展兼容与通信成本需要处理 |

::: important
Python 3.12 没有删除 GIL。对于普通 CPython 3.12 应用，纯 Python CPU 密集任务仍优先使用 `ProcessPoolExecutor` 或 `multiprocessing`。只有明确释放 GIL 的 C 扩展，才能在普通线程中实现计算并行。
:::

## asyncio 与并发标准库

### eager task factory

新增：

- `asyncio.eager_task_factory()`
- `asyncio.create_eager_task_factory()`
- `asyncio.Task(..., eager_start=True)`

启用后，coroutine 在构造 Task 时立即执行到首次阻塞：

```python
import asyncio


async def cached_result() -> int:
    return 42


async def main() -> None:
    loop = asyncio.get_running_loop()
    loop.set_task_factory(asyncio.eager_task_factory)

    task = asyncio.create_task(cached_result())
    print(task.done(), task.result())


asyncio.run(main())
```

同步完成的 coroutine 可能从未进入 event loop 队列。它可以减少缓存命中等路径的调度开销，但会改变执行顺序、异常出现时机和 task 可见性。它是语义变化，不是无风险性能开关，也不创建线程或提供 CPU 并行。

### 其他 asyncio 变化

- socket 写入减少复制，支持时使用 `sendmsg()`。
- `asyncio.run()` 新增 `loop_factory`。
- `Task.get_context()` 返回 task 的 `contextvars.Context`。
- eager 完成的 task 上，`Task.get_coro()` 可能返回 `None`。
- Linux 优先使用 `PidfdChildWatcher`，否则使用 `ThreadedChildWatcher`。
- event loop 自动选择适当 child watcher，不再建议应用手工配置。
- `asyncio.current_task()` 改为 C 实现。
- `asyncio.iscoroutine()` 对普通生成器返回 `False`。
- `asyncio.wait()` 和 `asyncio.as_completed()` 接受生成 task 的生成器。

### `threading`

新增：

- `threading.settrace_all_threads()`
- `threading.setprofile_all_threads()`

它们可以给已存在和后续创建的 Python 线程安装 trace/profile 函数，但不会改变 GIL 或并行模型。

### `multiprocessing` 与 `fork`

POSIX 多线程进程中调用 `os.fork()` 在可检测时会发出 `DeprecationWarning`。fork 只复制调用线程，其他线程持有的锁可能在子进程中永远无法释放。

```python
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor


def work(value: int) -> int:
    return value * value


if __name__ == "__main__":
    ctx = mp.get_context("spawn")
    with ProcessPoolExecutor(mp_context=ctx) as pool:
        print(list(pool.map(work, range(8))))
```

库应尽量接受调用方传入 multiprocessing context，而不是擅自全局调用 `set_start_method()`。

## Typing 更新

### PEP 692：精确标注 `**kwargs`

```python
from typing import NotRequired, TypedDict, Unpack


class RequestOptions(TypedDict):
    url: str
    timeout: NotRequired[float]


def request(**kwargs: Unpack[RequestOptions]) -> None:
    ...
```

类型检查器可据此知道必需键、可选键以及每个键的值类型。它只影响静态检查，不改变运行时参数绑定。

### PEP 698：`typing.override`

```python
from typing import override


class Base:
    def render(self) -> str:
        return "base"


class Child(Base):
    @override
    def render(self) -> str:
        return "child"
```

若方法名拼错或没有覆盖祖先成员，类型检查器可以报告错误。运行时只会尽力设置 `__override__ = True`，不提供强制检查。

### Protocol 运行时检查

- `runtime_checkable` Protocol 改用 `inspect.getattr_static()`，不会意外触发 descriptor 或 `__getattr__()`。
- Protocol 成员集合在类创建时冻结，后续 monkey patch 不改变 `isinstance()` 所检查的成员。
- 运行时 Protocol 只检查成员存在，不验证完整签名，不能替代静态类型检查。
- `types.get_original_bases()` 可获取泛型类的原始基类。
- `TypedDict` 和 `NamedTuple` 类新增 `__orig_bases__`。
- `typing.dataclass_transform()` 新增 `frozen_default`。

## 标准库变化总览

| 模块 | 3.12 主要变化 |
|---|---|
| `array` | `array.array` 支持下标，成为泛型类型 |
| `asyncio` | socket 写入优化、eager task、`loop_factory`、child watcher 自动选择、task 上下文 API |
| `calendar` | 新增 `calendar.Month`、`calendar.Day` 枚举 |
| `csv` | 新增 `QUOTE_NOTNULL`、`QUOTE_STRINGS` |
| `dis` | 公开 pseudo instruction；新增 `hasarg`、`hasexc` |
| `fractions` | `Fraction` 支持 float 风格格式化 |
| `importlib.resources` | `as_file()` 支持目录；`files()` 参数改名为 `anchor` |
| `inspect` | `markcoroutinefunction()`、`getasyncgenstate()`、`getasyncgenlocals()` |
| `itertools` | 新增 `batched()` |
| `math` | 新增 `sumprod()`；`nextafter()` 增加 `steps` |
| `os` | `PIDFD_NONBLOCK`；Windows drive/volume/mount 枚举与 junction API；更准确的 Windows stat |
| `os.path` | `isjunction()`、`splitroot()` |
| `pathlib` | 正式支持子类化；`Path.walk()`；`relative_to(walk_up=True)`；glob 大小写控制 |
| `platform` | 改进 Windows 11 和新版 Windows Server 识别 |
| `pdb` | 新增 convenience variables |
| `random` | `binomialvariate()`；`expovariate()` 默认参数 |
| `shutil` | `rmtree(onexc=...)`；归档和解压安全改进 |
| `sqlite3` | CLI、`autocommit`、配置 API；默认日期时间 adapter/converter 弃用 |
| `statistics` | `correlation(method="ranked")` 支持 Spearman 相关 |
| `sys` | `last_exc`；`_current_exceptions()` 直接返回异常对象；perf 支持 |
| `tempfile` | `NamedTemporaryFile(delete_on_close=...)`；`mkdtemp()` 返回绝对路径 |
| `threading` | `settrace_all_threads()`、`setprofile_all_threads()` |
| `tkinter` | 多项 Tcl/Tk API 与类型转换改进 |
| `tokenize` | 适配 PEP 701，f-string token 结构变化且性能提升 |
| `types` | `get_original_bases()`；`MappingProxyType` 在底层 mapping 可哈希时可哈希 |
| `typing` | PEP 692、PEP 698、PEP 695 配套运行时 API |
| `unicodedata` | Unicode 数据库升级到 15.0.0 |
| `unittest` | `--durations=N` 显示最慢测试 |
| `uuid` | 新增 `python -m uuid` CLI |

### 文件系统与路径

`pathlib.Path.walk()` 提供面向 Path 的目录树遍历；`Path` 和 `PurePath` 子类可通过 `with_segments()` 把自定义信息传播给派生路径。`os.path.splitroot()` 把路径拆成 `(drive, root, tail)`，比传统 `splitdrive()` 更精确表达根部分。

### sqlite3 事务模型

`sqlite3.connect()` 新增 `autocommit`，但默认仍是 `LEGACY_TRANSACTION_CONTROL` 以降低兼容性破坏：

- `autocommit=False`：PEP 249 风格事务语义。
- `autocommit=True`：SQLite 原生 autocommit。
- legacy 模式：继续由旧 `isolation_level` 影响隐式事务。

默认日期时间 adapter/converter 已弃用，应用应显式注册符合自身时区和存储格式要求的转换器。

### tar 解压过滤器

`tarfile` 和 `shutil.unpack_archive()` 新增 `filter`：

- `"fully_trusted"`：保留历史全功能行为，只适用于可信归档。
- `"tar"`：限制部分危险 tar 特性。
- `"data"`：更适合不可信数据，限制绝对路径、目录逃逸、危险链接、设备文件和 Unix 专用元数据。

过滤器不能防止压缩炸弹、资源耗尽和所有竞态攻击，不是安全沙箱。

## 移除、弃用与迁移

### 已移除模块

| 已移除 | 常见迁移方向 |
|---|---|
| `distutils` | `setuptools`、PEP 517/518 build backend、`packaging`、`sysconfig` |
| `imp` | `importlib`、`importlib.util`、`importlib.machinery` |
| `asyncore` | `asyncio` |
| `asynchat` | `asyncio` |
| `smtpd` | `aiosmtpd` 或基于 `asyncio` 的实现 |

`venv` 和 `ensurepip` 不再默认安装 `setuptools`，所以新虚拟环境默认也不再包含 `pkg_resources`、`easy_install` 或由 setuptools 提供的 `distutils`。应用运行时若依赖它们，必须显式声明依赖。

### 其他高价值移除

- `configparser.SafeConfigParser`、`readfp()` 等长期弃用接口。
- import finder/loader 的 `find_module()`、`find_loader()`；迁移至 `find_spec()`。
- `pkgutil.ImpImporter`、`ImpLoader`。
- `ssl.wrap_socket()`；改用 `SSLContext.wrap_socket()`。
- `ssl.match_hostname()` 和多项旧 TLS API。
- `Element.copy()`；改用 `copy.copy()`。
- 多个 `unittest.TestCase` 旧别名，如 `assertEquals`、`failUnless`。

### 重要弃用

- `datetime.utcnow()`：改用 `datetime.now(datetime.UTC)`。
- `datetime.utcfromtimestamp(ts)`：改用 `datetime.fromtimestamp(ts, datetime.UTC)`。
- 手工 child watcher 配置 API。
- `shutil.rmtree(onerror=...)`：改用 `onexc`。
- `sys.last_type`、`last_value`、`last_traceback`：改用 `sys.last_exc`。
- `typing.Hashable`、`typing.Sized`：使用 `collections.abc`。
- `typing.ByteString`：根据语义改用 `Buffer` 或明确的 bytes-like union。
- `ast.Num`、`Str`、`Bytes`、`NameConstant`、`Ellipsis`：改用 `ast.Constant`。
- 对 `bool` 使用 `~`；逻辑取反应使用 `not`。
- generator/coroutine 的三参数 `throw(type, value, traceback)`。
- `Element` 真值测试；使用 `elem is not None` 或 `len(elem)`。
- `functools.cached_property` 不再使用跨所有实例的内部锁；多线程竞争时 getter 可能执行多次，需要 exactly-once 时自行加锁。

### C API 与构建

- PEP 689 新增 `PyUnstable_*` API 层级。
- PEP 697 允许 Limited API 扩展不透明基类，新增 `PyObject_GetTypeData()` 等接口。
- 删除 Unicode 对象旧 `wstr` 表示及相关旧 C API，通常减少 `str` 对象内存。
- `PyLongObject` 内部布局变化，扩展不能直接读取私有字段。
- 新增 `PyErr_GetRaisedException()`、`PyErr_SetRaisedException()`；三元组式异常 API 进入弃用路径。
- 自定义 CPython 内存 allocator 必须线程安全。
- CPython 标准库 C 扩展构建从 `setup.py` 检测迁移到 `configure` 和 `Makefile`。
- Clang 支持时，ThinLTO 成为默认 LTO 策略。

## CPU 密集任务验证示例

```python
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from time import perf_counter

TASKS = [8_000_000] * 4


def cpu_work(n: int) -> int:
    total = 0
    for i in range(n):
        total += (i * i) % 97
    return total


def benchmark(executor_type) -> None:
    start = perf_counter()
    with executor_type(max_workers=4) as executor:
        results = list(executor.map(cpu_work, TASKS))
    elapsed = perf_counter() - start
    print(executor_type.__name__, elapsed, sum(results))


if __name__ == "__main__":
    benchmark(ThreadPoolExecutor)
    benchmark(ProcessPoolExecutor)
```

在至少 4 个可用核心上，进程池通常能并行执行纯 Python 循环；线程池通常不会比串行更快，甚至可能因调度和 GIL 竞争更慢。一次计时不是严谨基准，正式测试应重复运行、预热并使用 `pyperf`。

## 常见误区

| 误区 | 正确结论 |
|---|---|
| 3.12 已删除 GIL | 没有；普通解释器仍有 GIL |
| PEP 684 让普通 `threading` 自动多核 | 没有；3.12 只提供 C API |
| 每个线程都有自己的 GIL | 错；是每个按配置创建的解释器可拥有自己的 GIL |
| per-interpreter GIL 等于 free-threading | 错；前者依赖解释器隔离，后者允许同一解释器的线程并行 |
| `asyncio.gather()` 使用多个 CPU 核 | 默认不会，它是单线程协作调度 |
| `asyncio.to_thread()` 可绕过 GIL | 对纯 Python CPU 计算通常不成立 |
| eager task 是透明优化 | 它会改变执行顺序和异常时机 |
| PEP 695 会运行时强制类型 | 不会，主要由静态类型检查器执行 |
| PEP 709 完全不可观察 | traceback、`locals()`、tracing 和 `symtable` 都可观察变化 |
| `data` tar filter 能防所有恶意归档 | 不能，仍需资源限制和业务校验 |

## 升级检查清单

- [ ] 搜索 `distutils`、`imp`、`asyncore`、`asynchat`、`smtpd` 导入。
- [ ] 检查新 `venv` 是否隐式依赖 `setuptools` 或 `pkg_resources`。
- [ ] 检查 `ssl.wrap_socket()`、旧证书参数及过时 TLS API。
- [ ] 替换 naive UTC 的 `utcnow()`、`utcfromtimestamp()`。
- [ ] 审计多线程程序使用 `fork`、`multiprocessing` 或进程池的启动方式。
- [ ] 检查 `cached_property` 是否依赖隐式 exactly-once。
- [ ] 更新 formatter、linter、AST 和 tokenizer 工具以支持 PEP 701。
- [ ] 检查是否依赖推导式栈帧、`.0`、`locals()` 或具体 bytecode。
- [ ] 为 tar 解压显式选择 filter，并增加资源限制。
- [ ] 检查 sqlite3 的事务模式和日期时间 converter。
- [ ] 若使用 PEP 684，审计所有 C 全局状态、模块初始化和底层库线程安全。
- [ ] 使用最新 3.12 安全补丁版本，不停留在 3.12.0。

## 官方资料

- [What’s New In Python 3.12](https://docs.python.org/3.12/whatsnew/3.12.html)
- [PEP 693：Python 3.12 Release Schedule](https://peps.python.org/pep-0693/)
- [PEP 695：Type Parameter Syntax](https://peps.python.org/pep-0695/)
- [PEP 701：Syntactic formalization of f-strings](https://peps.python.org/pep-0701/)
- [PEP 684：A Per-Interpreter GIL](https://peps.python.org/pep-0684/)
- [PEP 669：Low Impact Monitoring](https://peps.python.org/pep-0669/)
- [PEP 688：Making the Buffer Protocol Accessible in Python](https://peps.python.org/pep-0688/)
- [PEP 709：Comprehension Inlining](https://peps.python.org/pep-0709/)
- [PEP 683：Immortal Objects](https://peps.python.org/pep-0683/)
- [PEP 692：Using TypedDict for more precise kwargs typing](https://peps.python.org/pep-0692/)
- [PEP 698：Override Decorator for Static Typing](https://peps.python.org/pep-0698/)
- [threading 文档](https://docs.python.org/3.12/library/threading.html)
- [asyncio 文档](https://docs.python.org/3.12/library/asyncio.html)
- [concurrent.futures 文档](https://docs.python.org/3.12/library/concurrent.futures.html)
- [multiprocessing 文档](https://docs.python.org/3.12/library/multiprocessing.html)
- [子解释器 C API](https://docs.python.org/3.12/c-api/init.html#sub-interpreter-support)
- [sys.monitoring 文档](https://docs.python.org/3.12/library/sys.monitoring.html)

## 导航

- 下一篇：[Python 3.13 新特性详解](/kb/language/Python/版本特性/Python-3.13-新特性详解/)
