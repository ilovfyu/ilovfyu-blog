---
title: "Python 3.16 新特性详解"
permalink: /kb/language/Python/版本特性/Python-3.16-新特性详解/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Python 3.15 新特性详解", link: /kb/language/Python/版本特性/Python-3.15-新特性详解/ }
next: false
knowledgeNote:
  series: "Language"
  group: "版本特性"
---
::: danger 极早期开发快照，不是完整版本规格
截至 2026-08-15，Python 官方页面仍标为 **Python 3.16.0a0 documentation**。What’s New 的 `Summary` 和 `New features` 为空，`New modules` 写着 `None yet`，`Optimizations` 和 C API 章节仍有 `TODO` 占位。本文只能整理当前已经进入 3.16 官方文档的条目；后续 alpha、beta、RC 和 final 会大幅补充或修改，不能把本文当作 3.16 最终功能清单或发布承诺。
:::

## 一句话结论

当前 3.16 草案还没有核心语言 headline，也没有 GIL/free-threading 的版本专项新承诺。并发方面已经记录的变化主要是：彻底移除 asyncio event loop policy、Unix socket server 可原子设置权限、`Executor.map()` 的异常后迭代器生命周期改变，以及 `multiprocessing.Pool.imap*()` 新增背压缓冲区。3.14/3.15 的 free-threaded、多解释器和进程并行能力继续存在，但不能算作 3.16 新特性。

## 当前草案状态

| 章节 | 2026-08-15 的官方页面状态 |
|---|---|
| Summary / release highlights | 空 |
| New features | 空 |
| Other language changes | 已有 3 条 |
| New modules | `None yet` |
| Improved modules | 已记录多个模块变化 |
| Optimizations | 仅有一项明确 `re` 优化，另有 TODO |
| Removed / Deprecated | 已有迁移时间线 |
| C API new features | TODO |
| Build changes | 已有 libmpdec 和依赖后端配置变化 |
| 发布日期 | 尚未发布，不能宣称 final 日期 |

因此，本文中的所有“新增”都应理解为“当前开发分支文档已记录”，不保证最终保留同样名称或语义。

## 语言与数据模型

### `memoryview.cast()` 支持 Fortran 顺序

新增 `order=`，并允许多维 F-contiguous view 转成一维 view：

```python
buffer = bytes(range(6))

view = memoryview(buffer).cast(
    "B",
    shape=[3, 2],
    order="F",
)

print(view.f_contiguous)
print(view.tolist())
# [[0, 3], [1, 4], [2, 5]]
```

核心语义：

- `order="F"` 按 Fortran/列主序解释 flat buffer。
- 不重排、不复制底层数据，是 zero-copy view。
- 转换前后总字节数必须一致。
- 目标 format 仍需满足 `memoryview.cast()` 的原生单元素格式限制。
- 源或目标之一仍需是 byte format，即 `B`、`b` 或 `c`。
- F-contiguous 多维 view 现在可以降为一维 view。

这对 NumPy、Fortran、BLAS/LAPACK 和列主序本地库的 buffer 互操作尤其有用，但它只改变视图解释，不进行矩阵转置或数据重排。

### frame 对象支持 weak reference

frame 现在可被弱引用，调试器和 profiler 可以在不延长 frame 及其整个对象图生命周期的前提下关联元数据：

```python
import inspect
import weakref

metadata = weakref.WeakKeyDictionary()

frame = inspect.currentframe()
if frame is not None:
    metadata[frame] = {"source": "debugger"}
```

这不会取消 free-threaded 环境中的 frame 安全限制。跨线程读取另一个正在执行线程的 `frame.f_locals` 仍需遵守对应 HOWTO，weak reference 只解决对象生命周期和附加元数据问题。

## GIL、Free-threading 与 CPU 密集多线程

### 当前没有 3.16 专项新承诺

截至本文核对日期，3.16 What’s New 没有：

- 新的 PEP 703 phase 变化。
- 默认关闭 GIL 的决定。
- 将 free-threaded 设为默认或唯一构建的决定。
- 普通 GIL 构建的 `ThreadPoolExecutor` CPU 并行语义变化。
- `threading` 模块的新 GIL 条目。
- 3.16 专属的 free-threaded 性能数字。

不能因为 3.16 是后续版本就推断 phase III 已发生。当前能力来源仍是：

| 能力 | 来源 | 3.16 当前结论 |
|---|---|---|
| 可选 free-threaded 构建 | PEP 703，3.13 首次交付 | 继续存在 |
| 官方支持、仍可选 | PEP 779，3.14 phase II | 继续存在 |
| asyncio free-threaded 一等支持 | 3.14 | 继续存在 |
| `concurrent.interpreters` | PEP 734，3.14 | 继续存在 |
| `InterpreterPoolExecutor` | 3.14 | 继续存在 |
| `abi3t` | PEP 803，3.15 | 继续存在 |

### 当前 CPU 并行选择

| 运行形态 | 纯 Python CPU 多核 | 说明 |
|---|---:|---|
| 普通 GIL 构建 + `ThreadPoolExecutor` | 否 | 除非实际工作在释放 GIL 的扩展中 |
| Free-threaded 构建 + `ThreadPoolExecutor` | 是 | 需确认 GIL 未回退、依赖兼容并显式同步共享状态 |
| `InterpreterPoolExecutor` | 是 | 每 worker 独立解释器和 GIL，通常需要 pickle |
| `ProcessPoolExecutor` / `multiprocessing` | 是 | 独立进程，有启动和 IPC 成本 |
| 单 event loop `asyncio` | 否 | I/O 并发；一次运行一个 task 的 Python 代码 |
| Free-threaded 中每线程一个 event loop | 是 | 不同 loop 的 Python 处理可跨核，Task/Future 不跨线程 |

free-threaded 现有注意事项继续适用：

- 不兼容 C 扩展可能触发 GIL 回退。
- 内建容器的内部锁不替代业务级 lock。
- 不应让多个线程无保护地消费同一 iterator；可使用 3.15 的 threading iterator 工具。
- 不跨线程直接操作 asyncio Task/Future。
- 跨线程同步使用 `threading` 或 `queue.Queue`，不是 `asyncio.Lock`/`Queue`。
- 要同时测量单线程损失、并行扩展、内存和锁竞争。

## asyncio

### Unix socket server 的 `mode=`

以下 API 新增 `mode`：

- `asyncio.start_unix_server()`
- `loop.create_unix_server()`

```python
import asyncio


async def handle_client(reader, writer):
    writer.close()
    await writer.wait_closed()


async def main() -> None:
    server = await asyncio.start_unix_server(
        handle_client,
        path="/tmp/example.sock",
        mode=0o660,
    )
    async with server:
        await server.serve_forever()


asyncio.run(main())
```

实现会在 bind 后、开始 accept 前设置 socket 文件权限，避免“先用 umask 派生权限接收连接，再补 chmod”的窗口。

限制：

- 仅 Unix domain socket。
- 不能与现成的 `sock=` 同时使用。
- abstract Unix socket 没有文件系统节点，不支持 `mode`。
- 文件 mode 不是身份认证或应用层授权机制。

### Event loop policy system 移除

3.14 弃用、3.16 当前草案正式移除：

- `asyncio.AbstractEventLoopPolicy`
- `asyncio.DefaultEventLoopPolicy`
- `asyncio.WindowsSelectorEventLoopPolicy`
- `asyncio.WindowsProactorEventLoopPolicy`
- `asyncio.get_event_loop_policy()`
- `asyncio.set_event_loop_policy()`

迁移原则：把进程级全局配置变成明确 runner 边界。

旧模式：

```python
asyncio.set_event_loop_policy(CustomPolicy())
asyncio.run(main())
```

新模式：

```python
import asyncio


def loop_factory():
    loop = asyncio.SelectorEventLoop()
    asyncio.set_event_loop(loop)
    return loop


asyncio.run(main(), loop_factory=loop_factory)
```

需要在同一个 event loop 和 `contextvars.Context` 中多次运行：

```python
with asyncio.Runner(loop_factory=loop_factory) as runner:
    runner.run(first())
    runner.run(second())
```

自定义 `loop_factory` 负责创建 loop，并在需要时把它设为 current loop。框架和库应让应用传入 factory，不应重新创造一个隐式全局 policy 系统。

同时移除：

- `asyncio.iscoroutinefunction()`，改用 `inspect.iscoroutinefunction()`。

## `concurrent.futures`

### `Executor.map()` 异常后的迭代器生命周期

3.16 当前行为：某次 `fn` 调用抛出异常后，异常会在取对应结果时抛出，但 map iterator 不再自动关闭。

```python
from concurrent.futures import ThreadPoolExecutor


def process(value: int) -> int:
    if value == 3:
        raise ValueError("bad value")
    return value * value


with ThreadPoolExecutor() as executor:
    results = executor.map(process, range(10), buffersize=4)
    try:
        for result in results:
            print(result)
    finally:
        results.close()
```

语义影响：

- 单个任务失败不再自动取消所有后续调用。
- 调用方可以决定是否继续处理，或显式 `close()`。
- `close()` 取消尚未开始的后续调用，并丢弃已完成但尚未取出的结果。
- timeout 仍会关闭 iterator 并取消后续调用。
- 过去依赖“第一个异常自动停止全部 map 工作”的代码需要增加显式生命周期策略。

### `ProcessPoolExecutor` 修复

官方库文档记录了 `max_tasks_per_child` 场景的死锁修复：worker 达到任务上限退出而队列仍有工作时，executor 不应挂死。这是现有实现修复，不是新的并行模型。

## `multiprocessing`

### `Pool.imap*()` 的 `buffersize`

以下 API 新增仅限关键字的 `buffersize`：

- `multiprocessing.pool.Pool.imap()`
- `multiprocessing.pool.Pool.imap_unordered()`

```python
from multiprocessing import Pool


def cpu_work(value: int) -> int:
    return value * value


if __name__ == "__main__":
    with Pool(processes=4) as pool:
        for result in pool.imap(
            cpu_work,
            range(1_000_000),
            chunksize=32,
            buffersize=8,
        ):
            consume(result)
```

作用：

- 限制已提交、但结果尚未由结果 iterator 产出的任务数量。
- buffer 满时暂停消费输入 iterable，形成背压。
- 避免大型、无限或生成成本高的输入被无限预提交。
- 控制父进程的内存和队列压力。
- 官方建议 `buffersize` 至少等于进程数，以便持续利用全部 worker。
- 更大的值可以预取，近似额外预取量为 `buffersize - processes`。

区分版本：`Executor.map(buffersize=...)` 是 3.14 新增；`Pool.imap*()` 的 `buffersize` 才是当前 3.16 草案条目。

## 其他标准库变化

### `csv`

`csv.Sniffer.sniff()` 改用 trial parsing，而不是孤立片段和字符频率 heuristic：

- 结果更接近 `csv.reader()` 实际解析。
- 可检测 `escapechar`。
- `delimiters` 可含非 ASCII delimiter。
- 不再把 quoted field 内的 delimiter 误判为字段分隔符。
- 避免 quoted sample 的二次时间复杂度。
- `lineterminator` 由样本行尾多数投票决定，不再总返回 `\r\n`。

这是兼容性变化。同一不规范样本在新旧版本可能推断出不同 dialect，数据导入系统应增加固定测试样本，关键格式最好显式提供 dialect。

### `codecs` 与 `encodings`

- 有 C `iconv()` 的平台上，Python 无内建 codec、但 iconv 已知的 encoding 现在可用。
- `iconv:name` 可强制使用 iconv backend，即使存在同名内建 codec。
- 新增 `utf-7-imap`，实现 IMAP modified UTF-7。

iconv 能力取决于平台 C 库，不能假设跨平台集合完全一致。

### `curses`

当前草案记录了大规模增强：

- character-cell API 接受 spacing character 加 combining characters。
- wide-character 读取：`get_wstr()`、`in_wstr()`。
- `complexchar`、`complexstr` 表示带属性和颜色的字符单元/字符串。
- `newterm()`、`set_term()`、screen object，支持多终端。
- 扩展属性、颜色、dynamic color pair API。
- screen dump/restore。
- soft label key、扩展键、鼠标和状态查询。
- `Textbox` 改进完整 Unicode 输入。

很多能力取决于 ncurses、ncursesw 和 extended-color 编译配置，不是每个 CPython 构建都具备。

### `ctypes`

新增注解式工具：

- `ctypes.util.struct()`：从 annotation 风格定义生成 `Structure` 类型。
- `ctypes.util.wrap_dll_function()`：从函数签名生成 DLL function wrapper。

### `gzip` 与 `io`

- `gzip.open()` 新增 `mtime` 并传给 `GzipFile`，便于可复现压缩输出。
- `io.BytesIO.peek()` 可读取后续 bytes 而不移动 position。

### `imaplib`

- `IMAP4.id()`：RFC 2971 ID。
- `IMAP4.move()`：RFC 6851 MOVE。
- `login_plain()`：PLAIN SASL，支持非 ASCII credential。
- 默认模式自动把非 ASCII mailbox 编为 modified UTF-7。
- 多个 API 增加 `uid=`，替代手工调用通用 `uid()`。
- 搜索条件按指定 charset 编码。
- 命令支持结构化参数和 `?` placeholder，由模块负责 quoting。

这批变化能减少调用方手写 IMAP quoting 和编码的错误，但仍应对 server capability、UTF8=ACCEPT 和响应边界做集成测试。

### `math`

新增以半圈，即 π 为单位的三角函数：

- `acospi()`、`asinpi()`、`atanpi()`、`atan2pi()`。
- `cospi()`、`sinpi()`、`tanpi()`。

```python
import math

assert math.sinpi(0.5) == 1.0
assert math.cospi(1.0) == -1.0
```

避免调用方先乘除 π，可在部分特殊值上获得更自然的表示和数值行为。

### `os`

Linux 5.6+ 新增 `os.pidfd_getfd()`，可通过 pidfd 复制另一个进程的文件描述符。它受内核版本、权限和安全策略限制。

### `re`

字符集支持 Unicode Technical Standard #18 风格集合操作：

```python
import re

consonant = re.compile(r"[a-z--[aeiou]]")
uppercase = re.compile(r"\p{Lu}+")
```

新增：

- 差集：`[A--B]`
- 交集：`[A&&B]`
- 并集：`[A||B]`
- 嵌套集合。
- Unicode property escape：`\p{...}`、`\P{...}`。

限制：

- property escape 只适用于 Unicode str pattern，不适用于 bytes pattern。
- 仅支持官方文档列出的 property。
- symmetric difference `~~` 当前未支持。
- 集合操作从左到右处理，应使用嵌套集合表达分组。

### `zipfile`

新增：

- `ZipFile.remove()`：从 central directory 删除成员记录。
- `ZipFile.repack()`：回收已移除成员 local file entry 的空间。

```python
from zipfile import ZipFile

with ZipFile("data.zip", "a") as archive:
    removed = [
        archive.remove("old-a.bin"),
        archive.remove("old-b.bin"),
    ]
    archive.repack(removed)
```

只调用 `remove()` 不会擦除 archive 中的原始 bytes，取证工具仍可能恢复。需要回收空间或真正移除 local entry 时必须 repack。对不可信 ZIP，启发式扫描不应被当成安全清理器，最坏性能可造成拒绝服务风险。

### 其他模块速览

| 模块 | 当前 3.16 草案变化 |
|---|---|
| `ipaddress` | IPv4/IPv6 network 新增 `next_network()` |
| `logging.handlers` | `TimedRotatingFileHandler` 可用文件创建时间决定首次轮转 |
| `lzma` | ARM64 和 RISC-V BCJ filter，依赖运行时 liblzma 版本 |
| `pydoc` | HTML5、python-docs-theme 风格、暗色模式、继承成员折叠 |
| `shlex` | `quote(force=True)` 强制给原本 shell-safe 的字符串加引号 |
| `sqlite3` | `Blob` 支持负 step slice 读写 |
| `symtable` | `symtable()` 可直接接收 AST |
| `tkinter` | Treeview、Text、Canvas、打印、暗色检测、systray、通知和 font chooser 等大量 Tk 8.7/9.x API |
| `xml` | Expat 支持更多东亚多字节 encoding；已知不支持 encoding 更早失败 |

当前 New modules 写着 `None yet`，但 Improved modules 中出现 `tkinter.systray`、`tkinter.fontchooser` 子模块。应理解为暂无单独列入 New modules 的顶层模块，而不是标准库中绝无新子模块。

## 优化

当前只有一项明确优化：

- `\d`、`\D`、`\s`、`\S`、`\w`、`\W` 以及只含一个此类 escape 的字符集直接编译为单个 `CATEGORY` opcode，不再套 `IN` block。
- 加快 `\d+` 等模式并减小正则字节码。

优化章节还有 `TODO`，不能据此预测 3.16 final 的通用解释器、JIT 或 free-threaded 性能。

## 已移除内容

| 模块 | 移除内容和替代 |
|---|---|
| `annotationlib` | `ForwardRef._evaluate()`；使用 `evaluate()` 或 `typing.evaluate_forward_ref()` |
| `array` | `'u'` type code；使用始终为 4-byte Py_UCS4 的 `'w'` |
| `asyncio` | `iscoroutinefunction()`；使用 `inspect.iscoroutinefunction()` |
| `asyncio` | 整个 event loop policy system；使用 runner `loop_factory` |
| `functools` | Python `reduce()` 的 `function=`、`sequence=` 关键字形式 |
| `logging` | 自定义 handler 的 `strm`；使用 `stream` |
| `mimetypes` | 无前导 `.` 的 extension 现在抛 `ValueError` |
| `shutil` | 未实际使用的 `ExecError` |
| `symtable` | `Class.get_methods()` |
| `sys` | `_enablelegacywindowsfsencoding()`；使用环境变量 |
| `sysconfig` | `expand_makefile_vars()`；使用 `get_paths(vars=...)` |
| `tarfile` | 未公开、未使用的 `TarFile.tarfile` |
| ElementTree | 无法正常工作的 `write_c14n()`/`method="c14n"`；使用 `canonicalize()` |

此外，官方内建类型文档的弃用时间线指出对 bool 使用 `~` 在 3.16 变为错误；当前 What’s New 的 Removed 小节尚未补入这一条，最终版前应重新核对。

## 新弃用

| 模块 | 当前 3.16 新弃用 |
|---|---|
| `abc` | `abstractclassmethod`、`abstractstaticmethod`、`abstractproperty`；组合标准 descriptor 和 `abstractmethod` |
| `ast` | `slice`、`Index`、`ExtSlice`、`Suite`、`Param`、`AugLoad`、`AugStore` 等旧节点 |
| `struct` | `'F'`、`'D'`；使用 `'Zf'`、`'Zd'` |
| `tempfile` | 私有 `_TemporaryFileWrapper`；使用公开 `TemporaryFileWrapper` |
| `tkinter` | `filedialog.askopenfiles()`；改用文件名列表并自行 `open()` |

大量 Pending Removal 条目源自更早版本，不能全部算作 3.16 新弃用。

### `.pth` import 行的继续迁移

PEP 829 是 3.15 特性，3.16 继续其弃用周期：

- 有同名 `.start` 时，`.pth` 中的 import 行被忽略。
- 没有 `.start` 时，当前 3.16 阶段仍执行 import 行。
- 启动代码应迁移到 `.start` 的 `pkg.mod:callable`。
- `.pth` 只保留静态 path extension。

后续 3.18 到 3.20 的具体 warning/忽略时间线仍应以届时官方文档为准。

## 构建变化

- CPython 源码树移除 bundled `libmpdec`，`decimal` 无条件使用外部 `libmpdec`。
- 删除已经无意义的 `--with-system-libmpdec`。
- python.org 近几个版本的二进制原本已使用独立 libmpdec，主要影响源码构建者和发行版。
- 新增 `--with-build-details-suffix`，帮助多个 Python build 共存时避免 `build-details.json` 冲突。
- 新增 `--with-curses`，可选择 `ncursesw`、`ncurses` 或 native curses；`--without-curses` 可排除模块。
- 新增 `--with-zlib`、`--with-bzip2`，可选择系统实现或 Rust backend；`--without-*` 可排除对应模块。
- `--with-zlib=zlib-ng` 会校验检测到的实现确为 zlib-ng。

## C API 状态

当前 `C API changes / New features` 仍是 TODO，没有可陈述的 3.16 新 C API headline。

已记录迁移：

- `PyType_ClearCache()` 变成 no-op，因为 type cache 已改为 per-type；仍返回 version tag 以兼容旧调用。

新弃用，计划 3.18 移除：

- `PyGen_New()`
- `PyGen_NewWithQualName()`
- `PyCoro_New()`
- `PyAsyncGen_New()`

已移除一组 unstable executable-kind API。Unstable API 本就允许跨小版本变更，不应把它当 Stable ABI 使用。

## 迁移清单

- [ ] 把 3.16 标注为 3.16.0a0 草案，不写 final headline 和性能承诺。
- [ ] 全面删除 asyncio policy 依赖，使用 `run()`/`Runner(loop_factory=...)`。
- [ ] Unix socket server 需要精确权限时使用 `mode=`，并继续实现应用层认证。
- [ ] `Executor.map()` 异常路径显式决定继续还是 `close()`。
- [ ] 流式进程池输入为 `Pool.imap*()` 设置合适 `buffersize`。
- [ ] 为 `csv.Sniffer` 新实现建立固定样本回归测试。
- [ ] 迁移 `array('u')`、bool `~`、旧 asyncio 和 sysconfig API。
- [ ] 源码构建环境安装外部 `libmpdec`。
- [ ] 使用新 `re` 集合语法前检查 bytes/str 和 Unicode property 限制。
- [ ] `ZipFile.remove()` 后需要真正回收或擦除条目时调用 `repack()`。
- [ ] 不把现有 free-threaded 能力误写成 3.16 默认无 GIL。
- [ ] 在后续 alpha、beta、RC 和 final 发布时重新核对整篇文档。

## 常见误区

| 误区 | 正确结论 |
|---|---|
| 当前 3.16 文档已经完整 | Summary、New features、C API 和优化仍有空白/TODO |
| 3.16 已决定默认无 GIL | 当前没有这项官方承诺 |
| `Pool.imap(buffersize=...)` 让任务更快 | 它主要提供背压和内存控制 |
| `Executor.map()` 一个任务失败会自动停掉全部后续工作 | 3.16 不再自动关闭 iterator |
| 删除 asyncio policy 后只能使用默认 loop | 用 `loop_factory` 明确注入自定义 loop |
| Unix socket `mode` 等于认证 | 它只是文件系统权限 |
| `memoryview.cast(order="F")` 会重排数据 | 它只创建 zero-copy 列主序视图 |
| `ZipFile.remove()` 会擦除原始 bytes | 只删 central directory 记录，需 `repack()` 回收 |
| 新 regex property 可用于 bytes pattern | `\p`、`\P` 面向 Unicode str pattern |
| Improved modules 有新子模块，所以 `None yet` 错了 | `None yet` 指 New modules 章节暂无顶层模块 |

## 官方资料

- [What’s New In Python 3.16](https://docs.python.org/3.16/whatsnew/3.16.html)
- [threading 文档](https://docs.python.org/3.16/library/threading.html)
- [asyncio 文档](https://docs.python.org/3.16/library/asyncio.html)
- [asyncio runners](https://docs.python.org/3.16/library/asyncio-runner.html)
- [asyncio and free-threaded Python](https://docs.python.org/3.16/library/asyncio-threading.html)
- [concurrent.futures 文档](https://docs.python.org/3.16/library/concurrent.futures.html)
- [concurrent.interpreters 文档](https://docs.python.org/3.16/library/concurrent.interpreters.html)
- [multiprocessing 文档](https://docs.python.org/3.16/library/multiprocessing.html)
- [Free-threaded Python HOWTO](https://docs.python.org/3.16/howto/free-threading-python.html)
- [PEP 703：Making the GIL Optional](https://peps.python.org/pep-0703/)
- [PEP 779：Free-threaded Phase II](https://peps.python.org/pep-0779/)
- [PEP 734：Multiple Interpreters](https://peps.python.org/pep-0734/)
- [PEP 803：abi3t](https://peps.python.org/pep-0803/)
- [PEP 829：Package startup configuration files](https://peps.python.org/pep-0829/)
- [site 文档](https://docs.python.org/3.16/library/site.html)
- [re 文档](https://docs.python.org/3.16/library/re.html)
- [memoryview.cast 文档](https://docs.python.org/3.16/library/stdtypes.html#memoryview.cast)

## 导航

- 上一篇：[Python 3.15 新特性详解](/kb/language/Python/版本特性/Python-3.15-新特性详解/)
