---
title: "Python 3.13 新特性详解"
permalink: /kb/language/Python/版本特性/Python-3.13-新特性详解/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Python 3.12 新特性详解", link: /kb/language/Python/版本特性/Python-3.12-新特性详解/ }
next: { text: "Python 3.14 新特性详解", link: /kb/language/Python/版本特性/Python-3.14-新特性详解/ }
knowledgeNote:
  series: "Language"
  group: "版本特性"
---
::: info 版本状态与整理口径
Python 3.13.0 发布于 2024-10-07。本文基于 Python 3.13 官方 What’s New、free-threading HOWTO、标准库文档和相关 PEP，整理相对 Python 3.12 的版本级变化。本文核对日期为 2026-08-15，3.13 是稳定版本系列；文中的 free-threaded 构建和 JIT 是 3.13 首次交付时的**实验性能力**，不能因为对应 PEP 已被接受就写成 3.13 的默认生产配置。
:::

## 一句话结论

Python 3.13 首次把“同一解释器内真正的 CPU 密集多线程”带给用户：专用 free-threaded 构建可在运行时关闭 GIL，让多个线程同时执行 Python 代码。但它不是默认构建，3.13 的单线程性能、内存、C 扩展、frame/iterator 安全和 wheel 生态仍有明显限制。普通 CPython 3.13 的 `threading` 仍受 GIL 约束。

## 版本亮点

| 领域 | 核心变化 | 定位 |
|---|---|---|
| Free threading | PEP 703：可选的无 GIL 构建 | 实验性；首次支持同一解释器的 Python 线程跨核并行 |
| JIT | PEP 744：copy-and-patch JIT | 实验性、默认不构建，3.13 收益有限 |
| REPL | 基于 PyPy/PyREPL 的新交互解释器 | 多行编辑、历史、F1/F2/F3、彩色输出 |
| `locals()` | PEP 667：定义局部变量映射语义 | optimized scope 返回快照，`frame.f_locals` 写穿透 |
| Typing | PEP 696、702、705、742 | 类型参数默认值、弃用标记、只读键、`TypeIs` |
| asyncio | `Queue.shutdown()`、TaskGroup 取消修复 | 结构化并发和队列生命周期更可靠 |
| 同步队列 | `queue.Queue.shutdown()` | 生产者/消费者可显式优雅或立即关闭 |
| CPU 资源 | `os.process_cpu_count()` | 默认 worker 数更符合容器和 CPU affinity |
| 平台 | iOS、Android 正式支持 | PEP 11 tier 3；WASI 升为 tier 2 |
| 清理 | PEP 594 移除 19 个旧模块 | 同时移除 `2to3` 和 `lib2to3` |

## Free-threaded CPython 与 GIL

### 普通构建和 free-threaded 构建

| 维度 | 普通 CPython 3.13 | Free-threaded CPython 3.13 |
|---|---|---|
| 定位 | 默认、稳定发行形态 | 可选、实验性专用构建 |
| GIL | 始终存在 | 默认可关闭，也可运行时重新启用 |
| 常见命令 | `python3.13` | `python3.13t`、Windows `py -3.13t` |
| 构建参数 | 默认配置 | `./configure --disable-gil` |
| ABI | `cp313` 或适用的 `abi3` | `cp313t`，POSIX `sys.abiflags` 含 `t` |
| Python 线程 | 同时只有一个线程执行 Python 字节码 | 多线程可同时在多个 CPU 核执行 Python 代码 |
| 3.13 单线程性能 | 正常基线 | 官方 HOWTO 的 pyperformance 平均开销约 40% |
| Specialization | PEP 659 自适应专门化解释器 | 3.13 free-threaded 模式中禁用 |
| C 扩展 | 主流生态兼容 | 需要 free-threaded wheel 和线程安全声明 |
| Stable ABI | 支持 `abi3` | 3.13 尚无 free-threaded Stable ABI |
| 内存分配 | 定制 mimalloc 默认优先使用 | mimalloc 是必需项 |

### 安装和构建

macOS 和 Windows 官方安装器可选装 free-threaded binaries，通常与普通构建并存。源码构建：

```bash
./configure --disable-gil --prefix="$HOME/python313t"
make -j
make altinstall
```

建议为它建立独立虚拟环境：

```bash
python3.13t -m venv .venv-ft
source .venv-ft/bin/activate
python -VV
```

Windows 可使用：

```powershell
py -3.13t -VV
py -3.13t -m venv .venv-ft
```

### 检测构建能力与当前状态

“二进制是否支持 free-threading”和“当前是否启用 GIL”是两个不同问题：

```python
import sys
import sysconfig

supports_free_threading = sysconfig.get_config_var("Py_GIL_DISABLED") == 1
gil_is_enabled = sys._is_gil_enabled()

print(sys.version)
print("free-threaded build:", supports_free_threading)
print("GIL enabled now:", gil_is_enabled)
print("ABI flags:", getattr(sys, "abiflags", ""))
```

- `sysconfig.get_config_var("Py_GIL_DISABLED") == 1`：当前二进制具备 free-threading 能力。
- `sys._is_gil_enabled()`：当前进程此刻是否启用了 GIL。
- free-threaded 二进制可能因启动参数或导入不兼容扩展而重新启用 GIL。
- `python -VV` 和 `sys.version` 会包含 `experimental free-threading build`。

### 运行时控制

```bash
# 在 free-threaded 二进制中启用 GIL
python3.13t -X gil=1 app.py
PYTHON_GIL=1 python3.13t app.py

# 显式关闭 GIL
python3.13t -X gil=0 app.py
PYTHON_GIL=0 python3.13t app.py
```

命令行 `-X gil=` 优先于环境变量。普通 `python3.13` 不能通过这些开关关闭 GIL。

### C 扩展触发 GIL 回退

导入没有声明 free-threading 支持的原生扩展时，默认行为是：

1. 打印警告。
2. 为整个进程重新启用 GIL。
3. `sys._is_gil_enabled()` 变为 `True`。

如果用户显式使用 `-X gil=0` 或 `PYTHON_GIL=0`，解释器不会自动回退；这并不会让扩展变得线程安全，反而可能产生数据竞争、内存破坏或崩溃。

```python
import sys

print("before import:", sys._is_gil_enabled())
import native_dependency
print("after import:", sys._is_gil_enabled())
```

free-threaded 构建安装 C 扩展需要 pip 24.1 或更新版本。应检查依赖是否提供 `cp313t` wheel，而不是只看纯 Python 包名是否可安装。

### 扩展模块如何声明兼容

多阶段初始化模块通过 `Py_mod_gil`：

```c
static PyModuleDef_Slot module_slots[] = {
    {Py_mod_gil, Py_MOD_GIL_NOT_USED},
    {0, NULL}
};
```

单阶段初始化模块使用：

```c
#ifdef Py_GIL_DISABLED
PyUnstable_Module_SetGIL(module, Py_MOD_GIL_NOT_USED);
#endif
```

声明“无需 GIL”只是最终步骤，扩展还必须真正完成并发安全改造：

- 保护过去由 GIL 隐式保护的全局变量、缓存和底层库状态。
- 避免在容器可能并发修改时使用不加锁的 `PyList_GET_ITEM` 等宏。
- `PyDict_Next()` 等遍历需要 critical section。
- 把易悬空的 borrowed reference 改为 strong-reference API。
- Python 对象与普通内存分别使用正确的 allocator domain。
- 继续正确管理 thread state；free-threaded 不等于可以删除所有 GIL/thread-state API。

常见 strong-reference 替代：

| 旧 borrowed API | 新 API |
|---|---|
| `PyList_GetItem()` | `PyList_GetItemRef()` |
| `PyDict_GetItem()` | `PyDict_GetItemRef()` |
| `PyDict_GetItemString()` | `PyDict_GetItemStringRef()` |
| `PyDict_SetDefault()` | `PyDict_SetDefaultRef()` |
| `PyWeakref_GetObject()` | `PyWeakref_GetRef()` |
| `PyImport_AddModule()` | `PyImport_AddModuleRef()` |

### 线程安全不等于业务操作原子

free-threaded CPython 为 `dict`、`list`、`set` 等内建容器增加内部同步，以避免解释器内部结构损坏。但这不保证复合业务操作原子：

```python
# 即使单次 dict 操作本身不破坏内部结构，整个 check-then-act 仍有竞态。
if key not in cache:
    cache[key] = compute()
```

检查后更新、读取后删除、遍历同时修改、多对象不变量仍需 `threading.Lock`。不要依赖过去“在 GIL 下碰巧原子”的字节码序列。

### 3.13 已知限制

- 首次创建主线程以外的线程后，一批模块、函数、方法描述符、code object 和类会被 immortalize，动态生成大量此类对象的长进程可能增加内存。
- 跨线程访问 frame object 不安全，可能崩溃。
- `sys._current_frames()` 在 free-threaded 构建中通常不安全。
- 多线程共享同一个 iterator 通常不安全，可能重复、漏项甚至崩溃。
- debugger、profiler、coverage 和依赖 frame 的诊断工具必须单独验证。
- C 扩展和 native library 仍可能含未受保护的全局状态。
- 多线程收益会受对象锁、引用计数、GC、内存分配、缓存一致性和任务粒度限制。

### CPU 密集型线程是否真的可用

在 3.13 free-threaded 构建且 GIL 确实关闭时，独立的纯 Python CPU 任务可以通过 `Thread` 或 `ThreadPoolExecutor` 跨 CPU 核并行：

```python
from concurrent.futures import ThreadPoolExecutor
import sys


def cpu_work(n: int) -> int:
    total = 0
    for i in range(n):
        total += (i * i) % 97
    return total


if __name__ == "__main__":
    print("GIL enabled:", sys._is_gil_enabled())
    with ThreadPoolExecutor(max_workers=4) as pool:
        print(sum(pool.map(cpu_work, [10_000_000] * 4)))
```

要得到有意义的结论，应比较：

| 模式 | 用途 |
|---|---|
| 普通 3.13 单线程 | 稳定基线 |
| 普通 3.13 `ThreadPoolExecutor` | 观察 GIL 对纯 Python CPU 工作的限制 |
| 3.13t `-X gil=0` | 测试真正线程并行 |
| 3.13t `-X gil=1` | 在同一二进制内隔离无 GIL 的影响 |
| 普通 3.13 `ProcessPoolExecutor` | 对比进程并行、pickle 和 IPC 成本 |

free-threaded 适合大粒度、可并行且锁竞争较少的任务。短任务、共享可变状态密集、底层 BLAS/OpenMP 已有线程池的程序，可能因调度、锁竞争或线程过量订阅反而变慢。

## 实验性 JIT

### 构建与开关

```bash
./configure --enable-experimental-jit
make -j

PYTHON_JIT=0 ./python app.py
PYTHON_JIT=1 ./python app.py
```

`--enable-experimental-jit` 支持：

| 值 | 含义 |
|---|---|
| `no` | 禁用 Tier 2 和 JIT 流水线 |
| `yes` | 构建并默认启用 JIT |
| `yes-off` | 构建 JIT，但默认关闭 |
| `interpreter` | 只启用 Tier 2 micro-op 解释器，不生成机器码 |

Windows 可使用 `PCbuild\build.bat --experimental-jit`。构建阶段需要 LLVM/Clang，最终解释器没有 LLVM 运行时依赖。

### 执行流水线

```text
Tier 1 专门化字节码
    -> 热点转换为 Tier 2 micro-op IR
    -> Tier 2 优化器
    -> Tier 2 解释，或 copy-and-patch 生成机器码
```

3.13 的 JIT 默认不构建，性能收益有限，可能增加约 10% 到 20% 内存。它不是 Numba、GPU 编译器或自动多核工具，也不改变 GIL。`PYTHON_JIT=1` 不能给一个未在构建时包含 JIT 的普通解释器“临时安装 JIT”。

## 新交互解释器与错误信息

新 PyREPL 支持：

- 多行编辑并保留多行历史。
- `help`、`exit`、`quit` 可作为 REPL 命令。
- prompt 和 traceback 默认彩色。
- `F1` 打开交互帮助。
- `F2` 浏览去掉输出和提示符的历史。
- `F3` 进入/退出 paste mode。
- `PYTHON_HISTORY` 设置历史文件位置。

回退旧 REPL：

```bash
PYTHON_BASIC_REPL=1 python3.13
```

颜色可由 `PYTHON_COLORS`、`NO_COLOR`、`FORCE_COLOR` 控制。错误信息会识别脚本名遮蔽标准库/第三方模块，并能为错误关键字参数建议正确名称。

## PEP 667：`locals()` 和 frame locals

### 两类作用域

| 作用域 | `locals()` 行为 |
|---|---|
| 模块、类、显式 `exec`/`eval` namespace | 返回实际执行命名空间，可读写 |
| 函数、生成器、协程、推导式等 optimized scope | 每次返回独立快照 |

```python
def f() -> None:
    first = locals()
    first["injected"] = 1
    second = locals()

    print(first is second)          # False
    print("injected" in second)    # False
```

修改 optimized scope 中 `locals()` 的结果不会修改真实局部变量。省略显式 namespace 的 `exec()`/`eval()` 也遵循快照语义：

```python
def unreliable_old_pattern() -> None:
    exec("x = 1")
    print(locals().get("x"))  # 3.13 中稳定为 None


def explicit_namespace() -> None:
    namespace: dict[str, object] = {}
    exec("x = 1", globals(), namespace)
    print(namespace["x"])
```

调试器则可通过 `frame.f_locals` 的 write-through proxy 可靠写入真实局部变量：

```python
import sys


def f() -> None:
    value = 1
    sys._getframe().f_locals["value"] = 2
    assert value == 2
```

这项变化让并发执行中的 debugger 和动态工具不再依赖不稳定的 locals 同步行为。

## Typing 更新

### PEP 696：类型参数默认值

```python
from collections.abc import Callable


class Box[T = int]:
    value: T


type Callback[**P = [int, str]] = Callable[P, None]
type Shape[*Ts = *tuple[int, bool]] = tuple[*Ts]
```

运行时可通过 `__default__` 和 `has_default()` 检查。默认值按需求值；有默认值的参数之后不能出现无默认值参数，默认值还必须满足 bound 或 constraints。

### PEP 702：弃用进入类型系统

```python
from warnings import deprecated


@deprecated("Use new_api() instead", category=DeprecationWarning)
def old_api() -> None:
    pass
```

类型检查器和 IDE 可在静态阶段报告调用。默认运行时也发出 warning；`category=None` 可只保留静态弃用信息。

### PEP 705：只读 `TypedDict` 项

```python
from typing import ReadOnly, TypedDict


class Movie(TypedDict):
    title: ReadOnly[str]
    year: int
```

`ReadOnly` 只约束类型检查器，运行时仍是普通 `dict`。如果值本身可变，如 `ReadOnly[list[str]]`，仍可修改列表内容。

### PEP 742：`TypeIs`

```python
from typing import TypeIs


def is_str(value: object) -> TypeIs[str]:
    return isinstance(value, str)
```

与 `TypeGuard` 相比：

- `TypeIs` 在 `True` 分支取原类型与目标类型的交集。
- 在 `False` 分支排除目标类型。
- 目标类型必须与输入类型兼容。
- 适合类似 `isinstance()` 的精确谓词。

此外新增 `typing.get_protocol_members()`、`typing.is_protocol()`、`typing.NoDefault`，并允许 `ClassVar` 与 `Final` 嵌套。

## asyncio、线程和进程并发

### `asyncio.as_completed()`

返回对象同时支持普通迭代和异步迭代。异步迭代时，如果输入本来就是 Task/Future，会直接产出原对象，便于关联任务身份：

```python
import asyncio


async def fetch(name: str, delay: float) -> str:
    await asyncio.sleep(delay)
    return name


async def main() -> None:
    tasks = [
        asyncio.create_task(fetch("a", 0.2), name="a"),
        asyncio.create_task(fetch("b", 0.1), name="b"),
    ]
    async for task in asyncio.as_completed(tasks):
        print(task.get_name(), await task)


asyncio.run(main())
```

### TaskGroup 取消修复

3.13 改进内部取消与外部取消同时发生时的处理：

- 不再让内层 TaskGroup 吞掉外层取消。
- 保留 `Task.cancelling()` 的取消计数。
- 外部取消与 `ExceptionGroup` 同时发生时，重新对父 task 调用 `cancel()`，保证下一个 `await` 看到 `CancelledError`。
- 对 inactive TaskGroup 调用 `create_task()` 时会关闭传入 coroutine，避免 never-awaited warning。

不要吞掉 `CancelledError`；确需完全抑制时还必须正确处理 `uncancel()`，否则会破坏 `TaskGroup` 和 timeout 的协议。

### `asyncio.Queue.shutdown()`

优雅关闭：

```python
queue.shutdown()
```

- 禁止后续 `put()`。
- 唤醒阻塞生产者并抛出 `QueueShutDown`。
- 已入队工作可继续消费。
- 队列耗尽后 `get()` 抛出 `QueueShutDown`。
- 正确配对 `task_done()` 后，`join()` 仍表示所有工作已处理。

立即关闭：

```python
queue.shutdown(immediate=True)
```

- 立即排空队列。
- 唤醒生产者和消费者。
- `join()` 可在工作未处理完时解除，破坏通常的不变量。

同步 `queue.Queue`、`LifoQueue`、`PriorityQueue` 也新增相同关闭协议，异常名为 `queue.ShutDown`；`queue.SimpleQueue` 和 `multiprocessing.Queue` 没有该 API。

### 其他 asyncio 变化

- `Server.close_clients()`、`Server.abort_clients()` 更强制地关闭连接。
- `StreamReader.readuntil()` 接受 separator tuple。
- Unix server 关闭时可自动移除 Unix socket。
- `DatagramTransport.sendto(b"")` 会发送零长度 datagram。
- `asyncio.sleep(float("nan"))` 抛出 `ValueError`。

### worker 默认值与容器 CPU 限制

新增 `os.process_cpu_count()`，更接近当前进程实际可使用的逻辑 CPU 数，而不是整个系统 CPU 数。默认值变化：

| 组件 | 3.13 默认 |
|---|---|
| `ThreadPoolExecutor` | `min(32, (os.process_cpu_count() or 1) + 4)` |
| `ProcessPoolExecutor` | `os.process_cpu_count()`，Windows 最多 61 |
| `multiprocessing.Pool` | `os.process_cpu_count()` |
| `compileall` | 使用 `os.process_cpu_count()` |

可用 `-X cpu_count=N` 或 `PYTHON_CPU_COUNT=N` 覆盖。它仍是启发式默认值，不保证对特定任务最优。

### `threading` 和解释器最终化

- `threading.Lock` 从工厂函数改为公开 class。
- 新增 `PythonFinalizationError`，继承 `RuntimeError`。
- `_thread.start_new_thread()`、`os.fork()`、`os.forkpty()`、`subprocess.Popen` 在解释器最终化阶段被禁止时改抛该异常。
- 可用 `sys.is_finalizing()` 检测最终化状态。
- 不应在 finalization 或 `atexit` 晚期启动新的线程、进程和 subprocess。

## 其他语言与解释器变化

- 编译器删除 docstring 每行共同的前导缩进，可减小 `.pyc`，但直接读取 `__doc__` 的内容会变化。
- class annotation scope 现在允许 lambda 和 comprehension。
- `from .__future__ import ...` 只作为普通相对导入，不再触发 future feature。
- `exec()`、`eval()` 的 `globals` 和 `locals` 可按关键字传递。
- 新增类属性 `__static_attributes__`，记录类体函数中通过 `self.name` 赋值的名称。
- 新增类属性 `__firstlineno__`。
- `property` 新增可写 `__name__`。
- `compile()` 新增 `ast.PyCF_OPTIMIZED_AST`；`ast.parse()` 新增 `optimize`。
- `str.replace()` 的 `count` 可按关键字传递。
- 多个接受文件描述符的函数收到 bool 时发出 warning，避免 `True == 1` 造成误用。

## 平台支持

- PEP 730：`arm64-apple-ios`、`arm64-apple-ios-simulator` 成为 tier 3。
- PEP 738：`aarch64-linux-android`、`x86_64-linux-android` 成为 tier 3。
- `wasm32-wasi` 升为 tier 2。
- `wasm32-emscripten` 不再是官方支持平台。
- `multiprocessing` 不支持 Android、iOS、WASI。
- `threading`、`concurrent.futures` 不支持 WASI。

## 标准库变化总览

| 模块 | 3.13 主要变化 |
|---|---|
| `argparse` | 参数、位置参数和子命令支持 `deprecated=` |
| `array` | 新增 Unicode 类型码 `'w'`；实现 `clear()` |
| `ast` | 构造器更严格；可选字段和列表字段获得明确默认；支持优化 AST |
| `asyncio` | `as_completed()` 双迭代协议；Queue shutdown；TaskGroup 取消修复；server/stream 增强 |
| `base64` | `z85encode()`、`z85decode()` |
| `compileall` | worker 数改用 `os.process_cpu_count()` |
| `concurrent.futures` | 默认 worker 数改用 `os.process_cpu_count()` |
| `configparser` | `allow_unnamed_section=True` 支持顶层 key-value |
| `copy` | `copy.replace()` 和 `__replace__()` 协议 |
| `ctypes` | `Structure._align_`；metaclass 初始化行为变化 |
| `dbm` | 新增并默认优先使用 `dbm.sqlite3` 后端 |
| `dis` | 默认显示逻辑 label；改进 offset/cache 信息 |
| `doctest` | 默认彩色；新增 skipped 统计 |
| `email` | 更严格、安全的地址和 header 解析 |
| `enum` | 公开 `EnumDict` |
| `fractions` | 扩展 `Fraction` 格式化 mini-language |
| `glob` | 新增 `glob.translate()` |
| `io` | finalizer 的 `close()` 异常交给 `sys.unraisablehook` |
| `ipaddress` | `IPv4Address.ipv6_mapped`；修正地址分类 |
| `itertools` | `batched(..., strict=True)` |
| `marshal` | `allow_code=False` 可拒绝 code object |
| `math` | 新增 `math.fma()` |
| `mimetypes` | `guess_file_type()`，路径应逐步从 `guess_type()` 迁移 |
| `mmap` | `trackfd=`、`seekable()`，Windows 安全性与行为改进 |
| `multiprocessing` | worker 默认值使用可用 CPU 数 |
| `os` | `process_cpu_count()`、Linux timerfd、CPU 数覆盖开关 |
| `os.path` | Windows `isreserved()`；路径绝对性修正 |
| `pathlib` | `UnsupportedOperation`、`Path.from_uri()`、`full_match()`、follow-symlink 控制 |
| `pdb` | 立即停在当前行；zipapp；异常链浏览 |
| `queue` | `shutdown()` 和 `ShutDown` |
| `random` | 新增 CLI |
| `re` | `re.PatternError`，旧 `re.error` 保留兼容 |
| `site` | `.pth` 优先以 UTF-8 解码 |
| `sqlite3` | 未关闭 Connection 发 `ResourceWarning`；`iterdump(filter=...)` |
| `ssl` | 默认启用 `VERIFY_X509_PARTIAL_CHAIN` 和 `VERIFY_X509_STRICT` |
| `statistics` | `kde()`、`kde_random()` |
| `subprocess` | 更多场景使用 `posix_spawn()` |
| `sys` | `_is_gil_enabled()`、`_is_interned()`、`_clear_internal_caches()` |
| `time` | Windows 使用更高精度时钟 |
| `traceback` | exception-only 输出可展开异常组 |
| `types` | `SimpleNamespace` 可接收 mapping 或键值 iterable |
| `typing` | PEP 696、705、742、Protocol 内省和 `NoDefault` |
| `unicodedata` | Unicode 数据库更新到 15.1.0 |
| `venv` | 默认生成 Git ignore，可配置 SCM ignore |
| `warnings` | PEP 702 `deprecated()` |
| `xml` | Expat reparse deferral、parser `flush()`、`iterparse().close()` |
| `zipimport` | 支持 ZIP64 |

### `copy.replace()`

它为不可变对象提供统一“复制并替换字段”的协议：

```python
from copy import replace
from dataclasses import dataclass


@dataclass(frozen=True)
class Point:
    x: int
    y: int


p1 = Point(1, 2)
p2 = replace(p1, y=10)
```

标准库已支持 namedtuple、dataclass、日期时间对象、`inspect.Signature`、`Parameter`、`SimpleNamespace` 和 code object。用户类型可实现 `__replace__(**changes)`。

## 移除、弃用与迁移

### PEP 594 移除 19 个模块

```text
aifc audioop cgi cgitb chunk crypt imghdr mailcap msilib nis
nntplib ossaudiodev pipes sndhdr spwd sunau telnetlib uu xdrlib
```

此外单独移除：

- `2to3` 工具和 `lib2to3`。
- `tkinter.tix`。
- `locale.resetlocale()`。
- `typing.io`、`typing.re`。
- chained `classmethod` descriptor。
- 多项长期弃用的 `configparser`、`pathlib`、`re`、`unittest`、`urllib` API。

### AST 迁移

3.13 开始，缺失必需字段或传入不属于 AST 字段的关键字会发出 `DeprecationWarning`，并计划在 3.15 成为错误。代码生成器应立即为所有节点提供完整、合法字段。

### 进程与 fork

3.13 的多数非 macOS POSIX 平台仍默认 `fork`，但多线程进程中 fork 自 3.12 起已有 warning。应提前验证 `spawn` 或 `forkserver`，为 3.14 默认值变化做准备。

## 常见误区

| 误区 | 正确结论 |
|---|---|
| Python 3.13 默认无 GIL | 默认仍是有 GIL 构建 |
| 安装 `python3.13` 后用开关就能关闭 GIL | 只有 `--disable-gil` 专用构建支持 |
| free-threaded 导入任何扩展都安全 | 未兼容扩展会回退 GIL，强制关闭回退可能崩溃 |
| 内建容器有内部锁，所以业务无需锁 | 多步不变量和复合操作仍需显式同步 |
| free-threaded 一定比普通构建快 | 3.13 单线程开销明显，并行收益依赖工作负载 |
| JIT 自动启用 | 默认不构建，也不是生产级能力 |
| JIT 等于无 GIL或多核 | JIT 优化单线程执行路径，不改变并发模型 |
| 新 REPL 让进程池可运行本地 lambda | `ProcessPoolExecutor` 仍要求可导入、可 pickle |
| `locals()` 修改可注入函数局部变量 | optimized scope 中返回独立快照 |
| `Queue.shutdown(immediate=True)` 后 `join()` 表示工作完成 | 立即关闭会破坏这一不变量 |

## 升级与采用清单

- [ ] 区分普通 3.13 和 `3.13t` 的虚拟环境、wheel、性能数据。
- [ ] free-threaded 程序在全部依赖导入后检查 `sys._is_gil_enabled()`。
- [ ] 检查所有原生依赖是否提供 `cp313t` wheel 并明确支持无 GIL。
- [ ] 审计过去由 GIL 隐式保护的共享状态和复合操作。
- [ ] 不跨线程访问 frame，不让多个线程共享同一 iterator。
- [ ] 同时测量单线程性能、线程扩展性、内存和锁竞争。
- [ ] 队列关闭明确选择优雅排空还是立即丢弃。
- [ ] 清理 PEP 594 模块、`2to3` 和 `lib2to3` 依赖。
- [ ] 动态执行代码传入显式 namespace，不依赖 `locals()` 副作用。
- [ ] 修复不完整或附带任意属性的 AST 节点构造。
- [ ] 在容器和 CPU affinity 场景检查默认 worker 数是否合适。

## 官方资料

- [What’s New In Python 3.13](https://docs.python.org/3.13/whatsnew/3.13.html)
- [PEP 719：Python 3.13 Release Schedule](https://peps.python.org/pep-0719/)
- [PEP 703：Making the Global Interpreter Lock Optional](https://peps.python.org/pep-0703/)
- [Python support for free threading](https://docs.python.org/3.13/howto/free-threading-python.html)
- [C API Extension Support for Free Threading](https://docs.python.org/3.13/howto/free-threading-extensions.html)
- [PEP 744：JIT Compilation](https://peps.python.org/pep-0744/)
- [PEP 667：Consistent views of namespaces](https://peps.python.org/pep-0667/)
- [PEP 696：Type Defaults](https://peps.python.org/pep-0696/)
- [PEP 702：Marking deprecations using the type system](https://peps.python.org/pep-0702/)
- [PEP 705：TypedDict Read-only Items](https://peps.python.org/pep-0705/)
- [PEP 742：Narrowing types with TypeIs](https://peps.python.org/pep-0742/)
- [threading 文档](https://docs.python.org/3.13/library/threading.html)
- [asyncio 文档](https://docs.python.org/3.13/library/asyncio.html)
- [concurrent.futures 文档](https://docs.python.org/3.13/library/concurrent.futures.html)
- [multiprocessing 文档](https://docs.python.org/3.13/library/multiprocessing.html)
- [PEP 594：Removing dead batteries](https://peps.python.org/pep-0594/)

## 导航

- 上一篇：[Python 3.12 新特性详解](/kb/language/Python/版本特性/Python-3.12-新特性详解/)
- 下一篇：[Python 3.14 新特性详解](/kb/language/Python/版本特性/Python-3.14-新特性详解/)
