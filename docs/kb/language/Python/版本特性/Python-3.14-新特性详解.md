---
title: "Python 3.14 新特性详解"
permalink: /kb/language/Python/版本特性/Python-3.14-新特性详解/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Python 3.13 新特性详解", link: /kb/language/Python/版本特性/Python-3.13-新特性详解/ }
next: { text: "Python 3.15 新特性详解", link: /kb/language/Python/版本特性/Python-3.15-新特性详解/ }
knowledgeNote:
  series: "Language"
  group: "版本特性"
---
::: info 版本状态与整理口径
Python 3.14.0 发布于 2025-10-07，已是稳定版本。本文基于当前 Python 3.14 官方 What’s New、标准库文档和相关 PEP，整理相对 Python 3.13 的版本级变化，核对日期为 2026-08-15。需要特别注意：3.14.0 到 3.14.4 曾采用增量 GC，但该实现从 3.14.5 起撤回；不能把早期 3.14 的 GC 行为概括成整个 3.14 系列的当前行为。
:::

## 一句话结论

Python 3.14 把 3.12 和 3.13 的多核路线推向可用阶段：free-threaded 构建从实验性升级为**官方支持但仍可选**，标准库首次提供 `concurrent.interpreters` 和 `InterpreterPoolExecutor`，`asyncio` 也获得 free-threaded 一等支持。CPU 密集型工作因此有三条正式路线：共享内存的 free-threaded 线程、隔离状态的多解释器、隔离进程的多进程。

## 版本亮点

| 领域 | 核心变化 | 影响 |
|---|---|---|
| 运行时注解 | PEP 649、749：延迟求值 | 前向引用更自然，内省工具迁移到 `annotationlib` |
| 多解释器 | PEP 734：`concurrent.interpreters` | Python 层可管理隔离解释器并实现多核并行 |
| 模板字符串 | PEP 750：t-string | 插值结构不立即拼成字符串，可构建安全处理器和 DSL |
| 远程调试 | PEP 768：`sys.remote_exec()` | debugger 可安全附加正在运行的 Python 进程 |
| Free threading | PEP 779：进入 phase II | 官方支持、仍可选；单线程损失约降至 5% 到 10% |
| asyncio | 调用图和进程外 task 内省 | `python -m asyncio ps/pstree PID` |
| 并行执行器 | `InterpreterPoolExecutor` | 同进程、每 worker 独立解释器和 GIL |
| 压缩 | PEP 784：`compression.zstd` | 标准库正式支持 Zstandard |
| 性能 | tail-call interpreter、实验 JIT | 两条独立实验性优化路线，不等于尾递归优化 |
| 语法 | PEP 758、765 | `except A, B:`；`finally` 中危险控制流发 warning |

## PEP 649 与 PEP 749：延迟求值注解

### 新模型

函数、类和模块的注解不再默认在定义时立即求值，而是保存为专用 annotate function，需要读取时再求值。

```python
def process(value: LaterType) -> Result:
    ...


class LaterType:
    pass


class Result:
    pass
```

多数前向引用不再需要手工写成字符串。定义对象时的注解运行时成本下降，但读取注解的框架必须理解新模型。

### `annotationlib`

新增三种读取格式：

```python
from annotationlib import Format, get_annotations


def func(arg: Undefined):
    pass


print(get_annotations(func, format=Format.FORWARDREF))
print(get_annotations(func, format=Format.STRING))
```

| 格式 | 语义 |
|---|---|
| `Format.VALUE` | 求值为运行时对象；未定义名称会抛 `NameError` |
| `Format.FORWARDREF` | 未定义名称变为 `ForwardRef` |
| `Format.STRING` | 返回字符串形式 |

框架迁移原则：

- 使用 `annotationlib.get_annotations()`，不要直接依赖 `__annotations__` 的实现细节。
- 类构造过程中需要读取 namespace 时，使用 `get_annotate_from_class_namespace()`。
- `inspect.signature()` 新增 `annotation_format=`。
- `inspect.Signature.format()` 新增 `unquote_annotations=`。
- `from __future__ import annotations` 在 3.14 仍保持字符串化行为，但已经进入弃用路线。
- 多数只定义注解、不在运行时内省注解的应用无需改动。

## PEP 734：多解释器进入标准库

### 核心模型

`concurrent.interpreters` 在同一进程内管理多个隔离解释器：

```python
from concurrent import interpreters

interp = interpreters.create()
interp.exec('print("running in another interpreter")')


def calculate(value: int) -> int:
    return value * value


print(interp.call(calculate, 12))
thread = interp.call_in_thread(calculate, 20)
thread.join()
interp.close()
```

关键 API：

- `interpreters.list_all()`
- `interpreters.get_current()`
- `interpreters.get_main()`
- `interpreters.create()`
- `interpreters.create_queue()`
- `Interpreter.exec()`
- `Interpreter.call()`
- `Interpreter.call_in_thread()`
- `Interpreter.prepare_main()`
- `Interpreter.close()`

解释器本身只表示当前线程所使用的隔离执行上下文，不会自动创建线程。`call_in_thread()` 或 `InterpreterPoolExecutor` 才把解释器与 OS 线程组合起来。

### 隔离与通信

各解释器拥有独立的 import state、`sys.modules`、`builtins`、`__main__` 和大部分运行时状态。自 3.12 起，隔离解释器不共享 GIL，因此不同线程使用不同解释器时可真正跨 CPU 核运行。

对象传递规则：

- 多数对象通过 pickle 复制。
- `None`、bool、bytes、str、int、float、只含受支持对象的 tuple 等不可变对象可直接共享或高效复制。
- `memoryview` 和 `concurrent.interpreters.Queue` 可共享可变数据。
- 普通可变对象不能由多个解释器同时使用。
- `create_queue()` 提供跨解释器、兼容 `queue.Queue` 接口的消息通道。

多解释器不是安全沙箱。同一进程的扩展模块可以绕过隔离，文件描述符和进程级资源也仍然共享。

### `InterpreterPoolExecutor`

```python
from concurrent.futures import InterpreterPoolExecutor


def cpu_work(n: int) -> int:
    total = 0
    for i in range(n):
        total += (i * i) % 97
    return total


if __name__ == "__main__":
    with InterpreterPoolExecutor(max_workers=4) as pool:
        print(sum(pool.map(cpu_work, [8_000_000] * 4)))
```

它是 `ThreadPoolExecutor` 的子类，每个 worker 仍是线程，但各线程运行自己的解释器和 GIL。因此能并行执行纯 Python CPU 代码。

代价和限制：

- callable、参数和返回值通常需要 pickle。
- 每个解释器都要单独 import 模块。
- 可变 Python 对象不能直接共享。
- initializer 和参数也会序列化。
- 未捕获异常尽量保留原对象，并把 `ExecutionFailed` 放进 `__cause__`；不能保留时直接返回 `ExecutionFailed`。
- 启动解释器和内存占用尚未完全优化。
- 很多第三方 C 扩展仍不兼容多解释器。

## PEP 750：t-string 模板字符串

t-string 复用 f-string 的插值语法，但不立即生成 `str`：

```python
from string.templatelib import Interpolation

name = "Python"
template = t"Hello, {name}!"

for part in template:
    if isinstance(part, Interpolation):
        print("expression:", part.expression)
        print("value:", part.value)
    else:
        print("literal:", part)
```

返回值是 `string.templatelib.Template`，插值部分是 `Interpolation`。模板处理器可以在运行时区分可信静态文本和动态值，从而实现：

- HTML escape 与 DOM 构造。
- 参数化 SQL 构建。
- 安全 shell 命令封装。
- 结构化日志。
- CSS、配置和业务 DSL。

::: warning
t-string 本身不会自动转义 HTML、SQL 或 shell 输入。它只保留结构，让专用处理器有机会正确处理动态值；安全性取决于处理器实现。
:::

## PEP 768：安全外部调试

`sys.remote_exec()` 可把 Python 文件发送给另一个 Python 进程，在目标进程的下一个安全执行点执行：

```python
import sys

sys.remote_exec(12345, "/tmp/attach_debugger.py")
```

`pdb` 也支持：

```bash
python -m pdb -p 12345
```

安全控制：

- `PYTHON_DISABLE_REMOTE_DEBUG`
- `-X disable-remote-debug`
- `--without-remote-debug`

目标进程如果阻塞在系统调用或 I/O 中，需要等它回到 Python 安全执行点，或者先通过信号打断阻塞。远程执行接口具有强能力，应结合 OS 权限和生产环境安全策略控制。

## Free-threaded 进入官方支持阶段

### PEP 779 的准确结论

3.14 将 free-threaded CPython 从 phase I 推进到 phase II：

- 不再标记为实验性。
- 成为官方支持的构建形态。
- 仍然是可选构建，不是默认构建。
- 是否进入 phase III，即成为默认或唯一构建，尚未决定，需未来 PEP。

3.14 完成更多 PEP 703 实现与 C API 改造，并在 free-threaded 模式重新启用 PEP 659 specializing adaptive interpreter。官方 What’s New 给出的单线程额外开销约为 5% 到 10%，具体取决于平台和编译器；PEP 779 还记录了约 15% 到 20% 的典型额外内存成本。

### 3.13 到 3.14 的关键进步

| 维度 | 3.13 | 3.14 |
|---|---|---|
| 状态 | 实验性 | 官方支持、仍可选 |
| 自适应专门化 | free-threaded 模式关闭 | 已启用 |
| 单线程性能损失 | 官方 HOWTO 基准约 40% | 约 5% 到 10% |
| asyncio | 需谨慎验证 | 获得一等 free-threaded 支持 |
| 多解释器 Python API | 无正式标准库 API | `concurrent.interpreters` 与解释器池 |
| 第三方扩展 | 早期适配 | 生态改善，但不代表全部兼容 |

Windows 为 free-threaded 构建编译扩展时，构建后端需要显式定义 `Py_GIL_DISABLED`，不再由 C 编译器自动判断。可通过 `sysconfig.get_config_var("Py_GIL_DISABLED")` 查询运行解释器的构建配置。

### asyncio 与 free-threaded Python

3.14 的 asyncio 实现可安全用于多线程 free-threaded 环境。推荐模型是**每个线程一个 event loop**：

```python
import asyncio
import threading


async def worker(name: str) -> None:
    print(name, "start")
    await asyncio.sleep(1)
    print(name, "done")


def run_loop(name: str) -> None:
    asyncio.run(worker(name))


threads = [
    threading.Thread(target=run_loop, args=(f"T{i}",))
    for i in range(4)
]
for thread in threads:
    thread.start()
for thread in threads:
    thread.join()
```

在 free-threaded 构建中，各线程的 event loop 可以在不同 CPU 核并行。使用边界：

- 不跨线程共享 event loop。
- 一个线程创建的 Task/Future 不应在另一个线程 await 或直接操作。
- 跨线程提交 coroutine 使用 `asyncio.run_coroutine_threadsafe()`。
- 跨线程调度 callback 使用 `loop.call_soon_threadsafe()`。
- `asyncio.Lock`、`Event`、`Queue` 不是线程同步原语；线程间使用 `threading` 或 `queue.Queue`。
- 单个 loop 仍然一次只执行一个 task；要让请求处理 Python 代码跨核，需要多个线程/loop 或把 CPU 工作转交线程池。

### 并发安全 warning 和 context

`warnings.catch_warnings()` 可通过 context variable 保存过滤器，避免多线程或多个 asyncio task 互相污染。由以下开关控制：

- `-X context_aware_warnings`
- `sys.flags.context_aware_warnings`

默认值：

- free-threaded 构建：开启。
- GIL 构建：关闭。

`thread_inherit_context` 控制 `threading.Thread` 是否继承调用 `start()` 一方的 `contextvars.Context`：

- free-threaded 构建默认开启。
- GIL 构建默认关闭。
- `Thread(context=...)` 可显式指定复制的或空的 `Context`。

## 三条 CPU 密集并行路线

| 路线 | 真正多核 | 共享模型 | 优点 | 主要代价 |
|---|---:|---|---|---|
| Free-threaded `ThreadPoolExecutor` | 是 | 同一解释器共享对象 | 低 IPC 成本，可共享大型只读数据 | 需要 free-threaded 构建、依赖兼容和完整锁审计 |
| `InterpreterPoolExecutor` | 是 | 每 worker 隔离解释器 | 普通 GIL 构建也能多核；比共享状态更易推理 | pickle、重复 import、扩展兼容、解释器开销 |
| `ProcessPoolExecutor` | 是 | 独立进程 | 生态成熟、故障和地址空间隔离更强 | 进程启动、pickle、IPC 和更高内存 |

普通 GIL 构建中的 `ThreadPoolExecutor` 仍不适合纯 Python CPU 密集任务，除非调用的 C 扩展主动释放 GIL。`asyncio` 本身是 I/O 并发模型，不会自动产生多核计算。

选择建议：

- 大量共享只读数据、线程友好依赖、能严格同步：测试 free-threaded 线程。
- 想保留普通 CPython 构建、任务边界清晰：测试解释器池。
- 依赖多解释器不兼容扩展、需要更强隔离：使用进程池。
- NumPy、BLAS、OpenMP 等本身有 native 线程时，控制线程过量订阅。

## asyncio 与并发 API

### 进程外 task 内省

```bash
python -m asyncio ps 12345
python -m asyncio pstree 12345
```

`ps` 显示 task、coroutine stack、awaiter chain；`pstree` 显示层次化 await graph。发现循环 await graph 时，工具会报告环路径，而不是输出错误树。

程序内新增：

- `asyncio.capture_call_graph()`
- `asyncio.print_call_graph()`

它们适合定位长时间 pending、卡死或复杂 TaskGroup 中的任务关系。

### task 创建参数转发

以下 API 接受任意关键字参数并传给 Task 构造器或自定义 task factory：

- `asyncio.create_task()`
- `loop.create_task()`
- `TaskGroup.create_task()`

这修正并统一了 3.13 补丁版本中曾出现过的 task factory 契约问题。

### event loop 行为迁移

- `asyncio.get_event_loop()` 在没有当前 loop 时直接抛出 `RuntimeError`，不再隐式创建。
- 顶层入口使用 `asyncio.run()`。
- 需要同一 loop 多次运行时使用 `asyncio.Runner`。
- 异步代码内部使用 `asyncio.get_running_loop()`。
- event loop policy 系统在 3.14 弃用，计划 3.16 移除；使用 `loop_factory` 代替全局 policy。
- child watcher API 已移除，由 event loop 内部处理子进程监控。

### `concurrent.futures`

`Executor.map()` 新增 `buffersize`：

```python
with InterpreterPoolExecutor(max_workers=4) as pool:
    for result in pool.map(cpu_work, source, buffersize=8):
        consume(result)
```

未设置时会立即收集输入；设置后限制“已提交但尚未产出”的任务数量，buffer 满时暂停消费输入 iterable。这是背压和内存控制，不改变结果顺序。

`ProcessPoolExecutor` 还新增：

- `terminate_workers()`：调用 `Process.terminate()`。
- `kill_workers()`：调用 `Process.kill()`。

二者都会同时 shutdown executor；调用后不能再提交任务。强制终止可能破坏队列、锁和事务，应只用于无法优雅关闭的场景。

### `multiprocessing`

Unix 非 macOS 平台默认 start method 从 `fork` 改为 `forkserver`；Windows 和 macOS 仍是 `spawn`。`ProcessPoolExecutor` 的默认方式也离开 `fork`。

影响：

- 不再依赖父进程可变全局状态被 fork 复制。
- target、参数和结果需可 pickle。
- `__main__` 必须可由 worker 导入。
- 如确实需要 `fork`，显式传 `multiprocessing.get_context("fork")`，并承担多线程 fork 风险。

其他增强：

- `Process.interrupt()` 通过 `SIGINT` 请求子进程退出，使其有机会执行 `finally`。
- `SyncManager.set()` 和 `Manager().set()` 新增共享 set。
- list/dict proxy 补齐 `clear()`、`copy()`、`fromkeys()` 和部分合并操作。
- forkserver 控制 socket 增加认证。

### `threading`

- `Thread.start()` 会把 `Thread.name` 设置为 OS 线程名，便于系统 profiler 和 task manager 识别。
- `Thread` 新增 `context=`。
- Windows 上 `Lock.acquire()` 可被 signal 中断。
- `RLock.locked()`、`Condition.locked()` 新增。
- 在解释器最终化晚期 join 仍运行的 daemon thread 可能抛 `PythonFinalizationError`。

## 其他语言变化

### PEP 758：多异常可省略括号

没有 `as` 子句时：

```python
try:
    connect()
except TimeoutError, ConnectionRefusedError:
    recover()
```

同样适用于 `except*`。带 `as` 时仍需要括号以避免语法歧义。

### PEP 765：`finally` 中的控制流

会跳出 `finally` 的 `return`、`break`、`continue` 现在产生 `SyntaxWarning`，因为它们可能吞掉正在传播的异常或覆盖返回值。warning 在编译代码时产生，运行时再修改 filter 不能追回已编译模块。

### 内建类型和函数

- `bytes.fromhex()`、`bytearray.fromhex()` 接受 ASCII bytes-like object。
- 新增 `float.from_number()`、`complex.from_number()`。
- `map(..., strict=True)` 检查所有 iterable 长度一致。
- `int()` 不再回退到 `__trunc__()`；自定义类型应实现 `__int__()` 或 `__index__()`。
- 在布尔上下文使用 `NotImplemented` 抛出 `TypeError`。
- 三参数 `pow()` 必要时也调用 `__rpow__()`。
- `super` 对象可复制、可 pickle。
- `memoryview` 成为泛型类型。
- 浮点格式化的小数部分也支持 `_` 和 `,` 分隔符。

### 命令行和 REPL

- `-X importtime=2` 同时显示已缓存模块。
- `python -c` 自动对代码参数执行类似 `textwrap.dedent()` 的去缩进。
- 默认 REPL 增加语法高亮和 import 补全。
- `-J` 不再为 Jython 保留。

## GC 行为的补丁版本差异

::: warning 不应只写“Python 3.14 使用增量 GC”
:::

3.14.0 到 3.14.4 曾将三代分代 GC 改为两代增量 GC，降低大堆最长暂停时间，并改变 `gc.collect(1)`、threshold、count 和 stats 语义。

由于生产环境报告显著内存压力，Python 3.14.5 起恢复 3.13 风格的分代 GC。当前使用 3.14.5+ 时，应以恢复后的行为和对应补丁版本文档为准。

## Typing 变化

### Union 运行时统一

```python
import types
import typing

assert types.UnionType is typing.Union
assert (int | str) == typing.Union[int, str]
```

迁移影响：

- `repr(Union[int, str])` 更接近 `int | str`。
- 不再依赖 `Union[...]` 对象 identity，比较使用 `==`。
- 不要依赖私有 `typing._UnionGenericAlias`。
- 运行时内省使用 `typing.get_origin()` 和 `typing.get_args()`。
- `typing.Union` 本身可用于 `isinstance(union_obj, typing.Union)`。
- union 的 `__args__` 不再可写，也不能任意设置属性。

### 其他 typing 变化

- `typing.TypeAliasType` 支持星号解包。
- `io.Reader`、`io.Writer` 提供比 `typing.IO` 更简单的协议。
- `memoryview`、`ctypes.py_object` 支持泛型下标。
- `typing.ByteString` 和 `collections.abc.ByteString` 继续走向移除，改用 `Buffer` 或明确 union。

## 新模块

| 模块 | 用途 |
|---|---|
| `annotationlib` | 延迟注解的读取和格式控制 |
| `compression` / `compression.zstd` | 统一压缩命名空间和 Zstandard |
| `concurrent.interpreters` | 同进程多解释器管理与通信 |
| `string.templatelib` | t-string 的 `Template` 和 `Interpolation` |

## 标准库变化总览

| 模块 | 3.14 主要变化 |
|---|---|
| `argparse` | 更准确的默认 `prog`；`suggest_on_error`；帮助默认可着色 |
| `ast` | `ast.compare()`；节点支持 `copy.replace()`；更丰富 `repr()` 和 CLI |
| `asyncio` | 调用图内省；task 参数转发；free-threaded 优化 |
| `calendar` | CLI 颜色突出当天 |
| `concurrent.futures` | `InterpreterPoolExecutor`、map 背压、进程 worker 终止 API |
| `configparser` | 写出不可重读配置时抛 `InvalidWriteError` |
| `contextvars` | `Token` 支持 context manager |
| `ctypes` | `_layout_`、公开 `CField`、`memoryview_at()`、复数类型、free-threaded 支持 |
| `curses` | `assume_default_colors()` |
| `datetime` | `date.strptime()`、`time.strptime()` |
| `decimal` | `Decimal.from_number()`、`IEEEContext()` |
| `difflib` | `HtmlDiff` 暗色模式 |
| `dis` | 完整源码位置和更多 CLI 选项 |
| `faulthandler` | `dump_c_stack()`；可输出 C stack |
| `fnmatch` | `filterfalse()` |
| `fractions` | 接受任何提供 `as_integer_ratio()` 的对象；`from_number()` |
| `functools` | `Placeholder` 让 `partial()` 预留任意位置参数 |
| `getopt` | 可选参数；保留选项/非选项原顺序 |
| `getpass` | `echo_char=` 提供输入反馈 |
| `graphlib` | 排序开始前可多次 `prepare()` |
| `heapq` | 完整 max-heap API |
| `hmac` | OpenSSL 不可用时使用 HACL* fallback |
| `http.server` | `HTTPSServer` 和 TLS CLI 选项；暗色页面 |
| `imaplib` | `IMAP4.idle()` |
| `inspect` | 注解格式控制；`ispackage()` |
| `io` | `Reader`、`Writer` Protocol；非阻塞文本流行为更明确 |
| `json` | 错误 note 定位对象路径；首选 `python -m json` CLI |
| `linecache` | 可获取 frozen module 源码 |
| `logging.handlers` | `QueueListener` 支持 context manager；重复 start 报错 |
| `mimetypes` | 新 CLI 和大量 MIME 类型更新 |
| `multiprocessing` | 默认 forkserver、proxy API、共享 set、`Process.interrupt()` |
| `operator` | `is_none()`、`is_not_none()` |
| `os` | `reload_environ()`、scheduler 常量、`readinto()` |
| `os.path` | `realpath(strict=ALLOW_MISSING)` |
| `pathlib` | `copy()`、`copy_into()`、`move()`、`move_into()`、`Path.info` |
| `pdb` | 远程附加、异步调试、语法高亮、monitoring backend |
| `pickle` | 默认协议改为 5；错误附加对象路径 note |
| `platform` | `invalidate_caches()` |
| `re` | `\z`；`\B` 现在也匹配空输入 |
| `socket` | 多个平台的 Bluetooth socket 改进 |
| `ssl` | `HAS_PHA` |
| `struct` | C complex 格式 `'F'`、`'D'` |
| `sys` | `_is_immortal()`、`remote_exec()`、`sys._jit` |
| `sys.monitoring` | `BRANCH_LEFT`、`BRANCH_RIGHT` |
| `tarfile` | 多项 path traversal 和链接回退安全修复 |
| `threading` | OS 线程名同步 |
| `types` | `UnionType` 与 `typing.Union` 统一 |
| `typing` | Union 统一；`TypeAliasType` 解包 |
| `unicodedata` | Unicode 16.0.0 |
| `unittest` | 彩色输出；新增一批语义更直接的 assertion |
| `urllib` | SHA-256 Digest；路径/URL 转换增强 |
| `uuid` | UUID 6、7、8；`NIL`、`MAX`；CLI count |
| `webbrowser` | `BROWSER` 可引用已注册浏览器 |
| `zipfile` | `ZipInfo._for_archive()`；支持 `SOURCE_DATE_EPOCH` |

### Zstandard 与 `compression`

```python
from compression import zstd

data = b"python" * 100
compressed = zstd.compress(data)
restored = zstd.decompress(compressed)
assert restored == data
```

`compression.lzma`、`bz2`、`gzip`、`zlib` 重新导出旧模块。新命名空间是首选，但旧模块未弃用。`tarfile`、`zipfile`、`shutil` 同时获得 Zstandard 支持。

## 性能与实验性解释器

### tail-call interpreter

新的内部解释器让每个 opcode 由小型 C 函数实现，并通过 C 尾调用相互转移。启用：

```bash
./configure --with-tail-call-interp --enable-optimizations
```

当前要求 Clang 19+、x86-64 或 AArch64；官方初步 pyperformance 几何平均约快 3% 到 5%。这不是 Python 函数的尾调用优化，不会消除 Python 递归栈。

### 实验性 JIT

官方 macOS、Windows 二进制包含默认关闭的实验 JIT，可测试：

```bash
PYTHON_JIT=1 python app.py
```

查询：

```python
import sys

print(sys._jit.is_available())
print(sys._jit.is_enabled())
```

3.14 的实际影响随 workload 从慢约 10% 到快约 20%。不建议生产使用；native debugger/profiler 不能稳定穿过 JIT frame。JIT 与 free-threaded 是独立构建轴，3.14 实验 JIT不支持 free-threaded 构建。

### 其他优化

- asyncio 标准基准约快 10% 到 20%，并降低内存。
- `base64.b16decode()` 最高约 6 倍。
- `textwrap.dedent()` 平均约 2.4 倍。
- `Path.read_bytes()` 约快 9% 到 17%。
- `uuid3()`、`uuid5()`、`uuid4()` 获得明显加速。
- Windows 官方构建使用 zlib-ng。
- 多个标准库模块降低 import time。
- 解释器在安全时省略部分引用计数增减，不能依赖 `sys.getrefcount()` 或 `Py_REFCNT() == 1` 的旧细节。

## 已移除内容

| 模块 | 移除内容和迁移 |
|---|---|
| `ast` | 删除 `Bytes`、`Ellipsis`、`NameConstant`、`Num`、`Str` 别名；使用 `Constant` |
| `asyncio` | 删除全部 child watcher 类和配置 API |
| `asyncio` | 无 current loop 时 `get_event_loop()` 不再隐式创建 |
| `email` | 删除 `email.utils.localtime(isdst=...)` 的 `isdst` |
| `importlib.abc` | 资源 ABC 迁移到 `importlib.resources.abc` |
| `itertools` | iterator 不再支持 copy、deepcopy、pickle |
| `pathlib` | 删除多个容忍额外参数的旧行为 |
| `pkgutil` | 删除 `get_loader()`、`find_loader()` |
| `pty` | 删除 `master_open()`、`slave_open()`；使用 `openpty()` |
| `sqlite3` | 删除 `version`、`version_info`；named placeholder 配 sequence 报错 |
| `urllib.parse` | 删除 `Quoter` |
| `urllib.request` | 删除 `URLopener`、`FancyURLopener` |

## 重要弃用与迁移

### asyncio policy

以下接口在 3.14 弃用并计划 3.16 移除：

- `AbstractEventLoopPolicy`
- `DefaultEventLoopPolicy`
- `WindowsSelectorEventLoopPolicy`
- `WindowsProactorEventLoopPolicy`
- `get_event_loop_policy()`
- `set_event_loop_policy()`

改用：

```python
asyncio.run(main(), loop_factory=my_loop_factory)

with asyncio.Runner(loop_factory=my_loop_factory) as runner:
    runner.run(main())
```

### 其他高价值弃用

- `asyncio.iscoroutinefunction()`：改用 `inspect.iscoroutinefunction()`。
- `codecs.open()`：改用内建 `open()`。
- `argparse.FileType`。
- 非 Windows 的 ctypes 隐式 MSVC layout；显式设置 `_layout_`。
- logging handler 的 `strm` 参数；改用 `stream`。
- `os.popen()`、`os.spawn*` 软弃用；新代码使用 `subprocess`。
- `PurePath.as_uri()`；使用 `Path.as_uri()`。
- `pdb.Pdb.curframe_locals`；使用 `curframe.f_locals`。
- `symtable.Class.get_methods()`。
- `mimetypes.MimeTypes.add_type()` 的无点 extension。
- `typing._UnionGenericAlias`、`typing.ByteString` 进入未来移除路线。

### 移植检查

- Unix 非 macOS 的 multiprocessing 默认变为 `forkserver`。
- `functools.partial` 现在是 method descriptor；需要旧静态行为时包为 `staticmethod(partial(...))`。
- `locale.nl_langinfo()` 某些调用会临时改变进程级 `LC_CTYPE`，可能影响其他线程。
- pickle 的部分失败统一为 `PicklingError`，原异常通过链保留。
- `re` 的 `\B` 现在匹配空字符串。
- FreeBSD 的 `sys.platform` 统一为 `"freebsd"`。
- 读取运行时注解的框架迁移到 `annotationlib`。

## C API 与构建

### PEP 741：配置 API

新增较高层的初始化与运行时配置接口：

- `PyConfig_Get()`、`PyConfig_GetInt()`、`PyConfig_Set()`、`PyConfig_Names()`。
- `PyInitConfig_Create()`、`Free()`、`Get*()`、`Set*()`。
- `PyInitConfig_AddModule()`。
- `Py_InitializeFromInitConfig()`。

### 其他 C API

- PEP 757：`PyLong_Export()`、`PyLongWriter_*()` 等 Python int 原生导入/导出接口。
- `PyIter_NextItem()` 以清晰状态码替代返回语义容易混淆的 `PyIter_Next()`。
- `PyBytes_Join()`、`Py_HashBuffer()`、`PyImport_ImportModuleAttr*()`。
- 多项类型、module state、weakref 和整数转换 API 进入 Stable/Limited API。
- 引用计数唯一性假设更不可靠；临时唯一引用的特殊场景使用官方 unstable API。
- `Py_Finalize()` 会删除 interned strings，扩展不能跨 finalize/reinitialize 生命周期保留悬空引用。

### 构建与发布

- free-threaded Python 正式支持但仍可选。
- `--with-tail-call-interp` 启用新解释器。
- `--without-remote-debug` 关闭远程调试。
- 新增 `build-details.json`，可在不执行 Python 时查询构建信息。
- PGP 发布签名停止，官方改用 Sigstore 验证材料。
- Emscripten 成为 tier 3，python.org 提供 Android binaries。
- 构建系统默认启用更多编译器安全选项。

## 常见误区

| 误区 | 正确结论 |
|---|---|
| 3.14 默认删除 GIL | free-threaded 是官方支持的**可选构建** |
| phase II 意味着 phase III 已确定 | 默认切换尚未决定 |
| asyncio 一个 loop 就能跨核执行 task | 单 loop 的 Python task 仍串行；多核通常每线程一个 loop |
| asyncio primitive 可跨线程 | `asyncio.Lock/Queue` 只用于单 loop；跨线程用 `threading`/`queue` |
| 多解释器自动创建线程 | 解释器本身不提供并发，需配合线程或 executor |
| 多解释器可共享任意 immutable-like 对象 | 只支持文档明确的共享/复制类型 |
| `InterpreterPoolExecutor` 没有序列化成本 | callable、参数和结果通常仍需 pickle |
| t-string 自动防注入 | 必须由安全的专用处理器消费 |
| tail-call interpreter 支持 Python 尾递归优化 | 它只是 CPython 内部 opcode dispatch 方式 |
| 整个 3.14 系列都使用增量 GC | 只适用于 3.14.0 到 3.14.4，3.14.5 起已撤回 |
| JIT 与 free-threaded 可随意叠加 | 3.14 实验 JIT 不支持 free-threaded 构建 |

## 升级和并行方案清单

- [ ] 明确生产使用 GIL 构建还是 free-threaded 构建，并分别测试 wheel。
- [ ] 在所有依赖导入后验证 `sys._is_gil_enabled()`。
- [ ] free-threaded 程序使用显式锁维护复合业务不变量。
- [ ] asyncio 多线程坚持每线程一个 loop，不跨线程操作 Task/Future。
- [ ] 在线程、解释器、进程三种 CPU 并行路线之间做真实数据基准。
- [ ] 检查多解释器中的 C 扩展兼容性、重复 import 和 pickle 成本。
- [ ] 检查 multiprocessing 默认从 fork 改为 forkserver 的影响。
- [ ] 把 event loop policy 配置迁移到 runner 的 `loop_factory`。
- [ ] 注解内省代码迁移到 `annotationlib`，不要读私有实现。
- [ ] 模板处理器对每种输出目标实现正确的 escape/参数化策略。
- [ ] 根据实际 3.14 补丁版本判断 GC 行为。
- [ ] 实验性 tail-call interpreter 和 JIT 只在基准环境测试，不当生产承诺。

## 官方资料

- [What’s New In Python 3.14](https://docs.python.org/3.14/whatsnew/3.14.html)
- [PEP 745：Python 3.14 Release Schedule](https://peps.python.org/pep-0745/)
- [PEP 649：Deferred Evaluation Of Annotations](https://peps.python.org/pep-0649/)
- [PEP 749：Implementing PEP 649](https://peps.python.org/pep-0749/)
- [annotationlib 文档](https://docs.python.org/3.14/library/annotationlib.html)
- [PEP 734：Multiple Interpreters in the Stdlib](https://peps.python.org/pep-0734/)
- [concurrent.interpreters 文档](https://docs.python.org/3.14/library/concurrent.interpreters.html)
- [InterpreterPoolExecutor 文档](https://docs.python.org/3.14/library/concurrent.futures.html#concurrent.futures.InterpreterPoolExecutor)
- [PEP 750：Template Strings](https://peps.python.org/pep-0750/)
- [PEP 768：Safe external debugger interface](https://peps.python.org/pep-0768/)
- [PEP 779：Criteria for supported free-threaded Python](https://peps.python.org/pep-0779/)
- [Free-threaded Python HOWTO](https://docs.python.org/3.14/howto/free-threading-python.html)
- [asyncio and free-threaded Python](https://docs.python.org/3.14/library/asyncio-threading.html)
- [PEP 758：Allow except expressions without brackets](https://peps.python.org/pep-0758/)
- [PEP 765：Disallow return/break/continue that exit finally](https://peps.python.org/pep-0765/)
- [PEP 784：Zstandard in the standard library](https://peps.python.org/pep-0784/)
- [PEP 741：Python Configuration C API](https://peps.python.org/pep-0741/)
- [threading 文档](https://docs.python.org/3.14/library/threading.html)
- [asyncio 文档](https://docs.python.org/3.14/library/asyncio.html)
- [concurrent.futures 文档](https://docs.python.org/3.14/library/concurrent.futures.html)
- [multiprocessing 文档](https://docs.python.org/3.14/library/multiprocessing.html)

## 导航

- 上一篇：[Python 3.13 新特性详解](/kb/language/Python/版本特性/Python-3.13-新特性详解/)
- 下一篇：[Python 3.15 新特性详解](/kb/language/Python/版本特性/Python-3.15-新特性详解/)
