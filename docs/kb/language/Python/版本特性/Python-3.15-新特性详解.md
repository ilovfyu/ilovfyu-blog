---
title: "Python 3.15 新特性详解"
permalink: /kb/language/Python/版本特性/Python-3.15-新特性详解/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Python 3.14 新特性详解", link: /kb/language/Python/版本特性/Python-3.14-新特性详解/ }
next: { text: "Python 3.16 新特性详解", link: /kb/language/Python/版本特性/Python-3.16-新特性详解/ }
knowledgeNote:
  series: "Language"
  group: "版本特性"
---
::: warning 这是预发布版本文档
截至 2026-08-15，Python 官方文档版本为 **3.15.0rc1**，RC1 发布于 2026-08-04；PEP 790 预计 3.15.0 final 于 2026-10-01 发布。Beta 1 之后已经 feature freeze，但 RC 文档仍明确标为 draft，修复、细节、性能数据和文档表述仍可能变化。本文只能表示“RC1 官方草案中已经记录的内容”，不能替代最终版 What’s New。
:::

## 一句话结论

Python 3.15 RC1 没有宣布默认关闭 GIL，也没有改变普通 CPython 中 `ThreadPoolExecutor` 的纯 Python CPU 并行语义。它重点完善现有路线：通过 PEP 803 的 `abi3t` 降低 free-threaded 扩展的长期分发成本，通过线程安全迭代器 API 和分层 import lock 修复并发问题，通过 PEP 788 改善解释器并发终结安全，并显著升级 JIT 和生产 profiler。

## RC1 亮点

| 领域 | RC1 已记录变化 | 定位 |
|---|---|---|
| 导入 | PEP 810：`lazy import` | 显式按需导入，减少大型应用启动时间 |
| 不可变数据 | PEP 814：内建 `frozendict` | 可哈希、保序的不可变 mapping |
| 哨兵值 | PEP 661：内建 `sentinel` | 统一唯一哨兵及其 typing/pickle 语义 |
| 性能分析 | PEP 799：`profiling` 与 Tachyon | 可附加运行进程的高频采样 profiler |
| 原生可观测性 | PEP 831：默认 frame pointer | 改善 eBPF、系统 profiler 和崩溃栈展开 |
| 推导式 | PEP 798：`*`、`**` 解包 | 简化扁平化 iterable 和 mapping |
| 编码 | PEP 686：UTF-8 默认模式 | 无显式 encoding 时不再依赖 locale |
| 启动配置 | PEP 829：`.start` 文件 | 替代 `.pth` 中难以审计的可执行 import 行 |
| Typing | PEP 728、747、800 | TypedDict 额外项、`TypeForm`、不相交基类 |
| Free-threading ABI | PEP 803、793、820 | 新 `abi3t`、`PyModExport_*`、统一 `PySlot` |
| C API 终结安全 | PEP 788 | interpreter guard/view 和安全 thread-state attach |
| asyncio | `TaskGroup.cancel()` | 正式支持提前终止任务组 |
| 线程 | 线程安全 iterator 工具 | free-threaded 下并发消费 iterator 有标准工具 |
| JIT | tracing frontend、寄存器分配等升级 | RC1 基准显著改善，但仍不是最终性能承诺 |

## PEP 810：显式惰性导入

### 基本语法

```python
lazy import json
lazy from pathlib import Path

print("startup continues")

data = json.loads('{"key": "value"}')  # 第一次使用时加载 json
path = Path(".")                         # 第一次使用时加载 pathlib
```

`lazy` 是 soft keyword。导入语句先绑定轻量 proxy，实际查找、读取、编译和执行模块推迟到名称第一次被使用。

失败语义：

- 模块不存在或导入执行失败时，异常在第一次使用处抛出，而不是声明语句处。
- traceback 同时包含使用位置和原始 lazy import 位置。
- 因异常时机变化，不能把所有 import-time validation 都假定在程序启动完成前发生。

### 作用域限制

lazy import 只允许在模块作用域。以下场景会产生 `SyntaxError`：

- 函数体。
- 类体。
- `try`、`except`、`finally`。
- star import。
- `__future__` import。

限制的目的之一是避免动态作用域、异常捕获和导入副作用之间形成难以推理的语义。

### 全局和选择性控制

```bash
python -X lazy_imports=all app.py
PYTHON_LAZY_IMPORTS=all python app.py
```

可用值：

- `normal`：默认，只尊重源码中的 `lazy` 和模块配置。
- `all`：默认把导入设为惰性。

运行时 API：

```python
import sys


def only_my_app(importing, imported, fromlist):
    return imported.startswith("myapp.")


sys.set_lazy_imports_filter(only_my_app)
sys.set_lazy_imports("all")
print(sys.get_lazy_imports())
```

相关接口：

- `sys.set_lazy_imports()`
- `sys.get_lazy_imports()`
- `sys.set_lazy_imports_filter()`
- `types.LazyImportType`
- 模块级 `__lazy_modules__`

为了让同一源码仍能被旧 Python 解析，可写：

```python
__lazy_modules__ = ["json", "pathlib"]

import json
from pathlib import Path
```

3.15 会按模块列表把对应普通 import 解释为 lazy import；旧版本只会忽略这个约定变量，继续立即导入。

### 使用边界

适合：

- CLI 中很少使用的子命令依赖。
- 插件、可选后端、格式转换器。
- 大型应用中只有少数请求路径使用的模块。
- 启动时延比首次使用时延更重要的进程。

需要审计：

- 依赖 import side effect 完成注册的框架。
- 希望启动时立即发现缺失依赖的服务。
- monkey patch 或按导入顺序初始化的代码。
- 并发首次访问同一 lazy name 的路径。
- profiler、coverage、import hook 和 reload 工具。

lazy import 降低启动工作量，不代表总工作量消失；代价被移动到第一次使用处。

## PEP 814：内建 `frozendict`

```python
settings = frozendict(host="localhost", port=5432)

print(settings["host"])
print(hash(settings))

settings["port"] = 5433  # TypeError
```

语义：

- 创建后不可修改。
- 不是 `dict` 子类，而是直接继承 `object`。
- 保留插入顺序，但相等比较不考虑顺序。
- 所有 key 和 value 可哈希时，`frozendict` 可哈希。
- 需要接受任意 mapping 的 API 应使用 `collections.abc.Mapping`，不要只检查 `dict`。

已经适配的标准库包括 `copy`、`decimal`、`json`、`marshal`、`pickle`、`plistlib` 序列化、`pprint`、ElementTree。`eval()`/`exec()` 的 globals、`type()` 和 `str.maketrans()` 也可接受它。

::: note
`frozendict` 只保证 mapping 本身不可增删改。如果 value 是可变对象，嵌套对象仍可改变；要实现深层不可变，需要递归转换。
:::

## PEP 661：内建 `sentinel`

新内建类型用于创建唯一、表示简洁的哨兵值，替代散落的 `object()`：

```python
MISSING = sentinel("MISSING")


def get_value(value=MISSING):
    if value is MISSING:
        return "not supplied"
    return value
```

RC1 文档记录的能力：

- copy 后保持身份语义。
- 简洁、稳定的表示形式。
- 可用 `|` 构造类型表达式。
- 当可通过模块和名称导入时可 pickle。

哨兵仍应使用 `is` 比较，不使用 `==`。

## PEP 799：`profiling` 与 Tachyon

### 统一 profiler 命名空间

新增：

- `profiling.tracing`：确定性函数调用跟踪，来源于 `cProfile`。
- `profiling.sampling`：Tachyon 统计采样 profiler。
- `cProfile` 保留为兼容别名。
- 纯 Python `profile` 弃用，计划 3.17 移除。

### Tachyon 能力

Tachyon 可附加现有进程，不要求修改代码或重启。RC1 文档宣称最高可达 1,000,000 Hz；这是预发布页面的性能描述，不应当作所有平台和 workload 的绝对保证。

目标模式：

- `attach PID`：附加已运行进程。
- `run script.py`：从启动开始分析脚本。
- `run -m package`：分析模块入口。
- `dump PID`：一次性抓取所有线程栈，可结合 `--async-aware` 查看 asyncio task。

采样模式：

| 模式 | 用途 |
|---|---|
| `--mode wall` | 墙钟时间，包含 I/O 和阻塞，默认 |
| `--mode cpu` | 只看线程实际消耗 CPU 的时间 |
| `--mode gil` | 分析各线程持有 GIL 的时间 |
| `--mode exception` | 只采样活动异常中的线程 |

输出和分析：

- `--pstats`
- `--collapsed`
- `--flamegraph`
- `--gecko`
- `--heatmap`
- `--live`
- `--opcodes`
- `-a` 分析全部线程
- `--async-aware` 重建 task 调用栈

`--mode gil` 对普通 GIL 构建尤其适合识别线程争用热点；对 free-threaded 构建则应结合 CPU、wall 和锁竞争等其他指标判断。

## PEP 831：默认 frame pointer

在支持的平台上，CPython 默认使用：

```text
-fno-omit-frame-pointer
-mno-omit-leaf-frame-pointer
```

收益：

- native stack unwinding 更快、更可靠。
- eBPF、系统 profiler、debugger 和 crash analyzer 更容易得到完整 Python/native 混合调用栈。
- flags 通过 `sysconfig` 暴露，使用 Python 构建配置的扩展可以继承。

第三方 C/C++/Rust 构建系统若自行忽略 Python CFLAGS，应显式保留等价 frame-pointer 选项。原生调用链中任一组件省略 frame pointer 都可能破坏整条链。可用 `--without-frame-pointers` 显式退出。

## PEP 798：推导式解包

```python
lists = [[1, 2], [3, 4], [5]]
sets = [{1, 2}, {2, 3}, {3, 4}]
dicts = [{"a": 1}, {"b": 2}, {"a": 3}]

print([*items for items in lists])
print({*items for items in sets})
print({**mapping for mapping in dicts})
print(list((*items for items in lists)))
```

等价于常见嵌套推导式或 `itertools.chain.from_iterable()`。也支持异步生成器表达式：

```python
flattened = (*items async for items in async_iterable())
```

字典解包仍遵守后出现的 key 覆盖前值的规则。

## PEP 686：UTF-8 成为默认编码

未显式指定 encoding 的文本 I/O 默认使用 UTF-8，不再依赖 locale：

```python
with open("data.txt", "w") as file:
    file.write("中文")
```

兼容工具：

- `encoding="locale"`：明确要求 locale encoding。
- `PYTHONUTF8=0` 或 `-X utf8=0`：临时恢复旧行为。
- EncodingWarning：查找未显式指定 encoding 的代码。

即使 3.15 默认统一为 UTF-8，跨版本库和需要读取外部文件格式的代码仍应显式写 `encoding=`，因为文件协议不一定是 UTF-8。

## PEP 829：`.start` 启动配置

`.pth` 文件既能扩展 `sys.path`，也能用 `import` 行执行任意启动代码，难以审计。3.15 新增 `.start` 文件，以 entry point 形式声明启动 callable：

```text
my_package.startup:initialize
```

规则：

- `site` 在未使用 `-S` 时处理。
- `.pth` 的普通路径行继续有效。
- `.pth` 中的可执行 import 行进入弃用路线。
- 存在匹配 `.start` 文件时，相关 `.pth` import 行被忽略。
- `site.StartupState` 先批量收集路径，再执行 startup callable，避免路径顺序不完整。

相关 API：

- `site.StartupState`
- `addsitedir()`
- `addusersitepackages()`
- `addsitepackages()`
- `process()`

包维护者应把 `.pth` 中的可执行 import 迁移到 `.start`，但不能把 3.16 或更远版本的阶段性处理规则当作 3.15 最终删除。

## Typing 更新

### PEP 728：`TypedDict` 额外项

```python
from typing import TypedDict


class ClosedConfig(TypedDict, closed=True):
    host: str
    port: int


class Metrics(TypedDict, extra_items=float):
    service: str
```

- `closed=True`：类型检查器拒绝未声明的额外 key。
- `extra_items=T`：允许额外 key，但要求其 value 为 `T`。

它改进了开放字典结构的表达力，不改变运行时 `dict` 本身。

### PEP 747：`TypeForm`

`TypeForm[T]` 表示值本身是描述 `T` 的类型表达式：

```python
from typing import Any, TypeForm


def checked_cast[T](typ: TypeForm[T], value: Any) -> T:
    ...
```

适合接收 `int`、`str | None`、`list[int]`、TypedDict class 等“类型形式”的 API。运行时 `TypeForm(x)` 直接返回 `x`。

### PEP 800：不相交基类

`@typing.disjoint_base` 让类型检查器知道某些基类不能同时出现在一个有效对象的继承树中，主要用于精确描述内建或扩展类型的运行时继承限制。

### 其他 typing 变化

- `TypeVarTuple` 接受 `bound`、`covariant`、`contravariant`、`infer_variance`；RC1 文档同时指出 `bound` 的规范语义尚未完整定义。
- 修复 Protocol 类型参数遗漏和顺序推导。
- `slice` 成为泛型类型。
- sentinel 可参与类型 union。
- `typing.ByteString` 从 `__all__` 删除且访问发出 warning，完整移除仍计划在 3.17。
- 不再支持 `NamedTuple("Point", x=int, y=int)` 这类未公开关键字字段语法。
- 不再支持 `TypedDict("TD")` 和 `TypedDict("TD", None)`。
- 删除 `typing.no_type_check_decorator`。
- 未显式 `@runtime_checkable`、但继承 runtime-checkable Protocol 的类进行运行时检查进入弃用路线。

## Free-threaded、GIL 与真正多线程

### 3.15 没有把 free-threaded 设为默认

3.15 RC1 继承 3.14 phase II：

- free-threaded 是官方支持的可选构建。
- 普通 CPython 仍启用 GIL。
- 普通 `threading` 和 `ThreadPoolExecutor` 执行纯 Python CPU 循环时仍不能跨核并行。
- free-threaded 构建且 `sys._is_gil_enabled()` 为 `False` 时，线程可以真正并行。
- `InterpreterPoolExecutor`、`ProcessPoolExecutor` 继续为默认 GIL 构建提供多核路线。

### PEP 803：`abi3t`

3.13/3.14 的 free-threaded 扩展通常需要为每个 Python 小版本构建 `cp313t`、`cp314t` wheel。3.15 新增 free-threaded Stable ABI：`abi3t`。

兼容目标：

| ABI | 目标解释器 |
|---|---|
| `abi3` | GIL-enabled CPython 3.x+ |
| `cp315t` | 仅版本绑定的 3.15 free-threaded 构建 |
| `abi3t` | 3.15+ free-threaded 构建 |
| `abi3.abi3t` wheel tag | 明确同时支持两类 Stable ABI，官方 PEP 推荐方式 |

`abi3t` 要求 `PyObject`、`PyVarObject`、`PyModuleDef` 等结构保持 opaque，扩展通常需要：

- 使用 PEP 697 的负 `PyType_Spec.basicsize` 和 `PyObject_GetTypeData()`，而不是把 `PyObject` 嵌进 instance struct。
- 从 `PyInit_*` 迁移到 PEP 793 的 `PyModExport_*` 导出钩子。
- 使用 PEP 820 的统一 `PySlot`。
- 通过 `Py_mod_abi` 提供运行时 ABI 信息。
- 使用 `PyCriticalSection` 等 API 真正实现无 GIL 线程安全。

选择宏：

```c
#define Py_LIMITED_API ...   /* abi3 */
#define Py_TARGET_ABI3T ...  /* abi3t */
```

::: important
ABI 可加载不等于扩展线程安全。`abi3t` 解决跨 Python 小版本的二进制兼容和分发矩阵，不会自动给扩展全局变量、容器访问和底层库加锁。
:::

RC1 What’s New 记录称当时部分主流构建工具尚未支持 `abi3t`。这是预发布时点信息，正式采用前应核对 setuptools、meson-python、scikit-build-core、Maturin、Cython、PyO3 等工具的当前状态。

### PEP 788：解释器终结安全

传统 C API 中，线程尝试附加到正在 finalizing 的解释器可能永久挂起；另一个线程并发删除解释器时，也缺少安全的生命周期检查。

PEP 788 引入：

- interpreter guard：阻止解释器在使用期间 finalizing。
- interpreter view：安全观察可能正在终结或已删除的解释器。
- 自动 attach/detach thread state 且内建生命周期保护的新接口。

`PyGILState` 家族，包括 `PyGILState_Ensure()`、`PyGILState_Release()`，被 soft-deprecated：

- 没有删除计划。
- 现有代码继续工作。
- 未来不会继续新增这一家族的 API。

这项工作同时服务多解释器和 free-threaded，不是“GIL 已消失”的信号。

### 线程安全 iterator 工具

新增：

- `threading.serialize_iterator`
- `threading.synchronized_iterator()`
- `threading.concurrent_tee()`

它们解决 free-threaded 环境中多个线程并发访问生成器和 iterator 的安全问题。内建容器的内部同步并不自动使任意 iterator 可被并发 `next()`；需要共享消费时应使用这些工具或显式锁。

### 分层 import lock

import system 现在按父包到子模块的层次顺序获取 per-module locks，修复长期并发导入死锁：

```text
线程 A: import pkg.sub
线程 B: import pkg.sub.mod
pkg/sub/__init__.py: import pkg.sub.mod
```

这是锁顺序修复，与 PEP 810 的 lazy import 是两件独立事情。

### CPU 密集任务选择

| 场景 | 适合方案 |
|---|---|
| 普通 GIL 构建、纯 Python CPU | `ProcessPoolExecutor` 或 `InterpreterPoolExecutor` |
| 普通 GIL 构建、释放 GIL 的 native 计算 | 可以测试 `ThreadPoolExecutor` |
| Free-threaded 构建、共享大型只读状态 | `ThreadPoolExecutor`，同时审计依赖和同步 |
| 需要地址空间和故障隔离 | `ProcessPoolExecutor` |
| 希望同进程但减少共享状态竞态 | `InterpreterPoolExecutor` |
| 高并发 I/O | 单 loop `asyncio`；free-threaded 下可按线程扩展多个 loop |

真正支持不等于线性加速。任务粒度、对象分配、共享锁、cache line、GC、native 线程池和内存带宽都会限制扩展性。

## asyncio、concurrent.futures 与线程

### `TaskGroup.cancel()`

3.15 新增正式的任务组提前终止：

```python
import asyncio


async def worker(name: str) -> None:
    try:
        while True:
            await asyncio.sleep(1)
    finally:
        print(name, "cleaned up")


async def main() -> None:
    async with asyncio.TaskGroup() as group:
        group.create_task(worker("a"))
        group.create_task(worker("b"))
        await asyncio.sleep(0.1)
        group.cancel()


asyncio.run(main())
```

过去需要创建一个故意抛异常的 task 并在退出时抑制异常。`cancel()` 让“目标已完成、服务不再需要”的意图更明确，但子任务仍应在 `finally` 中释放资源并正确传播取消。

### asyncio policy 迁移倒计时

以下 API 计划在 3.16 移除：

- `asyncio.iscoroutinefunction()`，改用 `inspect.iscoroutinefunction()`。
- 整个 event loop policy system。

新代码直接使用：

```python
asyncio.run(main(), loop_factory=my_loop_factory)

with asyncio.Runner(loop_factory=my_loop_factory) as runner:
    runner.run(first())
    runner.run(second())
```

### `concurrent.futures`

- `ProcessPoolExecutor` worker 异常终止时，traceback 显示 PID 和退出码。
- 修复 `max_tasks_per_child` worker 达到任务上限退出、但队列仍有任务时可能死锁的问题。
- `InterpreterPoolExecutor` 和 3.14 的 `Executor.map(buffersize=...)` 继续保留。

### `threading`

- 新增 iterator 同步工具。
- timeout 参数普遍接受任意实数，包括 `Decimal` 和 `Fraction`，但不提高底层时钟精度。
- `threading.get_native_id()` 增加 Solaris 支持。
- 3.14 的 `Thread(context=...)`、OS thread name、最终化异常语义继续有效。

## 其他语言与运行时变化

- `bytearray.take_bytes(n=None)` 可无复制地取出前缀或全部 bytes，并从原 buffer 移除。
- `-W` 和 `PYTHONWARNINGS` 的消息、模块字段支持 `/regex/`。
- 任意类可在 `__slots__` 中定义 `__dict__` 和 `__weakref__`。
- tuple 子类和 namedtuple 类可以定义任意 `__slots__`。
- `memoryview` 支持 C complex 格式 `'Zf'`、`'Zd'`。
- `bytes.replace()` 的 `count` 可按关键字传递。
- match literal pattern 接受一元加号。
- Stable ABI `.so` 文件名可带 multiarch tuple。
- `compile()`、`ast.parse()`、`symtable.symtable()` 等可传模块名，便于精确过滤 SyntaxWarning。
- `ImportError`、`ModuleNotFoundError` 的 `repr` 更清楚显示 `name=`、`path=`。
- `__dict__` 和 `__weakref__` descriptor 按解释器共享实例，降低类创建成本和引用环。
- REPL completion 按对象类型着色。

### `bytearray.take_bytes()`

```python
buffer = bytearray(b"header\npayload")
separator = buffer.index(b"\n") + 1

header = buffer.take_bytes(separator)
print(header)  # b'header\n'
print(buffer)  # bytearray(b'payload')
```

适合网络协议解析、压缩、编码和“构建 bytearray 后返回 bytes”的路径。它减少复制，但取出后原 buffer 内容发生变化，调用方必须明确所有权语义。

## 新模块

### `math.integer`

PEP 791 新增整数数学函数命名空间。RC1 What’s New 只把模块作为新模块列出，没有在该页完整枚举函数；使用时应查最终 `math.integer` 库文档，不在 RC 阶段凭提案草案猜 API。

## 标准库变化总览

| 模块 | 3.15 RC1 已记录的高价值变化 |
|---|---|
| `argparse` | `suggest_on_error` 默认开启；单横线长选项；更多彩色帮助 |
| `array` | `'Zf'`、`'Zd'`、`'e'`；`array.typecodes` 改为 tuple |
| `ast` | `ast.dump(color=True)` 与彩色 CLI |
| `asyncio` | `TaskGroup.cancel()` |
| `base64` | padding、wrap、ignore、canonical 控制增强 |
| `binascii` | Base32、Ascii85、Base85 C API 与严格参数 |
| `calendar` | HTML5、暗色、可访问性与 CLI 增强 |
| `collections` | `Counter` 对称差 `^`、`^=` |
| `concurrent.futures` | 进程 worker 异常显示 PID/exit code |
| `contextlib` | ExitStack 支持任意 descriptor；decorator 保持到 await/迭代完成 |
| `ctypes` | 复数格式名统一为 `Zf`、`Zd`、`Zg` |
| `dbm` | `reorganize()` 回收删除条目的空间 |
| `difflib` | `unified_diff(color=...)`；HTML5 diff |
| `faulthandler` | dump/register API 增加 `max_threads` |
| `functools` | `singledispatchmethod()` 支持更多 callable |
| `gc` | 保持撤回增量 GC 后的分代实现 |
| `hashlib` | 保证算法属性存在，后端缺失时在调用处失败 |
| `http.client` | `max_response_headers` 限制响应头数量 |
| `http.server` | 默认彩色日志、默认 content type、额外响应头 |
| `importlib.metadata` | 元数据文件缺失时抛 `MetadataNotFound` |
| `inspect` | `getdoc()` 的 class doc 继承和 fallback 控制 |
| `json` | `array_hook`；可构建 tuple/frozendict 深层不可变表示 |
| `locale` | 保留 locale modifier；取消 `getdefaultlocale()` 弃用 |
| `math` | `isnormal()`、`issubnormal()`、`fmax()`、`fmin()`、`signbit()` |
| `mmap` | Windows `trackfd`；Linux 匿名映射命名 |
| `os` | `statx()`；`makedirs(parent_mode=...)` |
| `os.path` | `realpath()` all-but-last 和 `ALLOW_MISSING` |
| `pathlib` | `mkdir(parent_mode=...)` |
| `pdb` | 默认使用新交互 shell |
| `pickle` | 支持 pickle 私有方法和嵌套类 |
| `pprint` | `expand=`；支持 t-string |
| `re` | `prefixmatch()`，旧 `match()` 软弃用但无删除计划 |
| `resource` | 多个平台资源限制常量 |
| `shelve` | `reorganize()`；自定义 serializer/deserializer |
| `sqlite3` | CLI 补全和彩色输出 |
| `ssl` | TLS 1.3 PSK、group、ciphersuite、signature algorithm API |
| `subprocess` | Linux pidfd、macOS/BSD kqueue 等 wait(timeout) 实现 |
| `symtable` | `Function.get_cells()`、`Symbol.is_cell()` |
| `sys` | `sys.abi_info` |
| `sys.monitoring` | 异常事件可按 code object 启停；`DISABLE` 语义改进 |
| `tarfile` | 多项链接和 path traversal 安全修复 |
| `threading` | `serialize_iterator`、`synchronized_iterator()`、`concurrent_tee()` |
| `timeit` | 彩色 CLI 和可配置 autorange 目标时间 |
| `tkinter` | Text 搜索、geometry manager 内容查询、Event 数据增强 |
| `tomllib` | 支持 TOML 1.1，同时保持 1.0 兼容 |
| `types` | 公开 `FrameLocalsProxyType` |
| `typing` | PEP 728、747、800 与 Protocol/TypeVarTuple 修复 |
| `unicodedata` | Unicode 17.0.0；grapheme、XID、block API |
| `unittest` | warning assertion 不再吞不匹配 warning |
| `urllib.parse` | 区分缺失与空 URL component |
| `venv` | POSIX purelib/platlib 布局更准确 |
| `warnings` | `warn_explicit()` 更准确推导模块名 |
| `wave` | IEEE float WAV 支持 |
| `webbrowser` | macOS 使用 `/usr/bin/open`，降低文件注入风险 |
| `xml` | `is_valid_name()`、`is_valid_text()` |
| `xml.parsers.expat` | 分配放大和 Billion Laughs 防护配置 |
| `zlib` | `adler32_combine()`、`crc32_combine()` |

## JIT 和性能优化

::: warning
3.15 RC1 What’s New 明确把 JIT 基准标为“not yet final”。以下数据用于理解方向，不是 final 性能承诺。
:::

RC1 页面报告：

- x86-64 Linux：相对完整优化的标准解释器，pyperformance 几何平均约快 8% 到 9%。
- AArch64 macOS：相对完整优化的 tail-calling interpreter，约快 12% 到 13%。
- 单项结果从明显变慢到超过 2 倍不等。

升级内容：

- 构建依赖 LLVM 21；最终用户运行 JIT 不需要 LLVM。
- 新 tracing frontend 记录实际执行路径，支持更多 bytecode、控制流、简单对象创建、部分重载操作和生成器。
- 基础寄存器分配减少栈读写。
- 更强常量传播、引用计数消除、唯一引用跟踪和部分原地数值操作。
- Linux ELF 平台为 GDB 和部分 native unwinder 发布 JIT frame 信息。
- 改善 x86-64 与 AArch64 的机器码和 code memory。

其他优化：

- raw memory allocation 默认优先 mimalloc，主要改善 free-threaded 性能。
- Base64 编码约 2 倍、解码约 3 倍；具体结果依硬件和输入。
- Ascii85、Base85、Z85、Base32 的 C 重写带来数量级优化。
- `csv.Sniffer.sniff()` 分隔符检测最高约 1.6 倍。
- Windows 64 位官方构建采用 tail-calling interpreter；RC1 页面在特定 MSVC/CPU 配置报告明显提升，不应外推至所有 Windows 程序。

JIT、tail-calling interpreter、free-threaded 是三条不同路线：

- JIT：把热点 trace 编译为机器码。
- tail-calling interpreter：改变 opcode 的 C dispatch 方式。
- free-threaded：改变线程并行和 GIL 模型。

不能把任意一条的收益算到另一条上。

## 已移除或变为错误

| 模块 | 3.15 RC1 变化 |
|---|---|
| `ast` | 缺失必需字段或额外关键字直接 `TypeError` |
| `collections.abc` | `ByteString` 从 `__all__` 删除 |
| `ctypes` | 删除未公开 `SetPointerType()` |
| `datetime` | `strptime()` 只有日、没有年份时抛 `ValueError` |
| `glob` | 删除私有 `glob0()`、`glob1()` |
| `http.server` | 删除 CGI handler 和 `--cgi` |
| `importlib.resources` | 删除 `files(package=...)` 的旧参数名 |
| `pathlib` | 删除 `PurePath.is_reserved()`；使用 `os.path.isreserved()` |
| `platform` | 删除 `java_ver()` |
| `sre_*` | 删除 `sre_compile`、`sre_constants`、`sre_parse` |
| `sysconfig` | 删除 `is_python_build(check_home=...)` |
| `threading` | C `RLock` 不再接受额外参数 |
| `types` | `CodeType` 删除 `co_lnotab`，使用 `co_lines()` |
| `typing` | 删除旧 NamedTuple/TypedDict 写法和 `no_type_check_decorator` |
| `wave` | 删除 marker API |
| `zipimport` | 删除 `zipimporter.load_module()`，使用 `exec_module()` |

## 新弃用和近期迁移

### 3.15 新弃用

- 实例化抽象 AST 节点，计划 3.20 变为错误。
- `-b`、`-bb`，计划 3.17 变为 no-op。
- `collections.abc.ByteString`、`typing.ByteString` 访问。
- `hashlib` 构造器的 `string=`，改传位置参数。
- `profile` 模块，改用 `profiling.tracing`。
- `re.match()`、`Pattern.match()` 软弃用，推荐 `prefixmatch()`，但没有删除计划。
- struct 复数格式 `'F'`、`'D'` 软弃用，改用 `'Zf'`、`'Zd'`。
- 一批标准库的 `__version__`/`version`/`VERSION`，改以 Python 或对应协议版本 API 查询。

### 3.16 即将移除

升级 3.15 时就应处理：

- asyncio policy system。
- `asyncio.iscoroutinefunction()`。
- `array` `'u'` type code，改用 `'w'`。
- `~True`、`~False`。
- `functools.reduce(function=..., sequence=...)`。
- logging handler `strm`。
- `MimeTypes.add_type()` 无点 extension。
- `shutil.ExecError`。
- `symtable.Class.get_methods()`。
- `sys._enablelegacywindowsfsencoding()`。
- `sysconfig.expand_makefile_vars()`。
- `TarFile.tarfile`。

## C API 与构建变化

### PEP 782：`PyBytesWriter`

高效、受支持的 bytes 构建 API：

- `PyBytesWriter_Create()`
- `PyBytesWriter_Grow()`、`Resize()`
- `PyBytesWriter_WriteBytes()`、`Format()`
- `PyBytesWriter_GetData()`、`GetSize()`
- `PyBytesWriter_Finish*()`
- `PyBytesWriter_Discard()`

旧的 `PyBytes_FromStringAndSize(NULL, len)` 和 `_PyBytes_Resize()` 软弃用。

### PEP 820：统一 `PySlot`

新增 `PySlot`、`PyType_FromSlots()`、`PyModule_FromSlotsAndSpec()` 以及 type/module slot ID。多个旧 `PyType_FromSpec*()`、`PyModule_FromDefAndSpec*()` 构造 API软弃用。

### 其他新 API

- `PyArg_ParseArray()`、`PyArg_ParseArrayAndKeywords()`。
- `PyFrozenDict_*()`、`PyAnyDict_*()`。
- `PySys_GetAttr*()`、`PySys_GetOptionalAttr*()`。
- `Py_mod_abi`、`PyABIInfo_Check()`。
- `PyCriticalSection` 加入 Stable ABI。
- `PyImport_CreateModuleFromInitfunc()`。
- `PyTuple_FromArray()`。
- 多个 GC traverse 期间安全访问 module/type state 的 API。
- `PyDateTime_IMPORT` 变为线程安全；不要直接检查 `PyDateTimeAPI == NULL`。

### 已移除 C API

- 多个旧 Unicode encode/decode API，改用 `PyCodec_*()`。
- `PyImport_ImportModuleNoBlock()`。
- `PyWeakref_GetObject()` 和宏，改用 `PyWeakref_GetRef()`。
- `PySys_ResetWarnOptions()`。
- 多个 `Py_Get*()` 初始化配置查询接口，改用 `PyConfig_Get()`。

### 构建

- frame pointer 默认开启，可用 `--without-frame-pointers` 关闭。
- `--with-pymalloc-hugepages` 尝试使用 2 MiB huge page，失败回退普通页。
- `--with-missing-stdlib-config=FILE` 让发行版定制缺失模块提示。
- bundled libmpdec 不再隐式 fallback；源码构建需明确配置。
- Linux 可为匿名 mmap 添加名字，便于 `/proc/PID/maps` 观察。
- free-threaded 原始分配默认使用 mimalloc。

## 迁移清单

- [ ] 在部署文档醒目标明当前测试的是 3.15.0rc1，不把 RC 基准写成 final。
- [ ] 检查 import side effect、启动失败时机和 lazy import 首次使用延迟。
- [ ] 迁移 `.pth` 可执行 import 行到 `.start`。
- [ ] 显式设置文件 encoding，尤其是外部协议文件。
- [ ] 需要深层不可变时递归处理 `frozendict` 的 value。
- [ ] Free-threaded 扩展规划 `abi3`、`cp315t`、`abi3t` 构建矩阵。
- [ ] 不把 ABI 可加载误认为无 GIL 线程安全。
- [ ] 多线程消费 iterator 使用新同步工具或显式 lock。
- [ ] 仍在用 event loop policy 的项目迁移到 `loop_factory`。
- [ ] 检查 `TaskGroup.cancel()` 后子任务的资源清理和取消传播。
- [ ] 修复不完整 AST 节点、`co_lnotab`、旧 typing 构造语法。
- [ ] native 扩展保留 frame-pointer 编译选项。
- [ ] JIT、tail-call interpreter 和 free-threaded 分开做基准矩阵。

## 常见误区

| 误区 | 正确结论 |
|---|---|
| 3.15 默认无 GIL | 没有，free-threaded 仍是可选构建 |
| `abi3t` 让普通 `abi3` 扩展自动线程安全 | ABI 和线程安全是不同问题 |
| 有了 `abi3t` 就不需版本绑定 free-threaded wheel | 尚未迁移到 Stable ABI 的扩展仍需 `cp315t` |
| lazy import 消除导入成本 | 只是把成本移动到首次使用 |
| lazy import 失败仍在启动时发生 | 通常推迟到第一次访问 |
| `frozendict` 是深层不可变 | value 仍可能可变 |
| sentinel 应用 `==` 比较 | 哨兵语义使用 `is` |
| frame pointer 会让 Python 代码自动更快 | 主要改善 native 可观测性和栈展开 |
| JIT 的 RC1 平均值就是 final 承诺 | 页面明确标注尚未最终确定 |
| `TaskGroup.cancel()` 省去了清理 | 子任务仍必须正确处理取消和资源 |
| iterator 是内建对象就可多线程共享 | free-threaded 下并发 `next()` 仍需专用同步 |

## 官方资料

- [What’s New In Python 3.15](https://docs.python.org/3.15/whatsnew/3.15.html)
- [PEP 790：Python 3.15 Release Schedule](https://peps.python.org/pep-0790/)
- [PEP 810：Explicit lazy imports](https://peps.python.org/pep-0810/)
- [PEP 814：Add frozendict built-in type](https://peps.python.org/pep-0814/)
- [PEP 661：Sentinel Values](https://peps.python.org/pep-0661/)
- [PEP 799：A dedicated profiling package](https://peps.python.org/pep-0799/)
- [PEP 831：Default frame pointers](https://peps.python.org/pep-0831/)
- [PEP 798：Unpacking in comprehensions](https://peps.python.org/pep-0798/)
- [PEP 686：Make UTF-8 mode default](https://peps.python.org/pep-0686/)
- [PEP 829：Package startup configuration files](https://peps.python.org/pep-0829/)
- [PEP 728：TypedDict with Typed Extra Items](https://peps.python.org/pep-0728/)
- [PEP 747：Annotating Type Forms](https://peps.python.org/pep-0747/)
- [PEP 800：Disjoint bases](https://peps.python.org/pep-0800/)
- [PEP 803：Stable ABI for Free-Threaded Builds](https://peps.python.org/pep-0803/)
- [Stable ABI 官方文档](https://docs.python.org/3.15/c-api/stable.html)
- [abi3t 迁移指南](https://docs.python.org/3.15/howto/abi3t-migration.html)
- [PEP 793：PyModExport](https://peps.python.org/pep-0793/)
- [PEP 820：C API Slot Unification](https://peps.python.org/pep-0820/)
- [PEP 788：Safely attaching to and interacting with interpreters](https://peps.python.org/pep-0788/)
- [PEP 782：PyBytesWriter C API](https://peps.python.org/pep-0782/)
- [threading 文档](https://docs.python.org/3.15/library/threading.html)
- [asyncio 文档](https://docs.python.org/3.15/library/asyncio.html)
- [concurrent.futures 文档](https://docs.python.org/3.15/library/concurrent.futures.html)
- [free-threaded Python HOWTO](https://docs.python.org/3.15/howto/free-threading-python.html)

## 导航

- 上一篇：[Python 3.14 新特性详解](/kb/language/Python/版本特性/Python-3.14-新特性详解/)
- 下一篇：[Python 3.16 新特性详解](/kb/language/Python/版本特性/Python-3.16-新特性详解/)
