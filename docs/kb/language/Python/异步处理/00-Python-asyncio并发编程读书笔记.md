---
title: "《Python asyncio 并发编程》读书笔记"
permalink: /kb/language/Python/异步处理/00-Python-asyncio并发编程读书笔记/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "第1章 认识 asyncio", link: /kb/language/Python/异步处理/01-第1章-认识-asyncio/ }
knowledgeNote:
  series: "Language"
  group: "异步处理"
---
---
title: Python asyncio并发编程读书笔记
aliases:
  - Python Concurrency with asyncio
  - Python asyncio 并发编程
tags:
  - Python
  - asyncio
  - 并发编程
  - 读书笔记
created: 2026-08-01
---

# 《Python asyncio 并发编程》读书笔记

::: abstract 书籍信息
原书：*Python Concurrency with asyncio*，Matthew Fowler，Manning，2022，ISBN 9781617298660。全书 14 章，从事件循环基础逐步进入网络、数据库、进程、线程、Web、微服务、同步原语、队列、子进程和高级 asyncio。
:::

本系列是按原书章节组织的原创总结，不替代原书。笔记重新提炼了心智模型、API 语义、执行时序、常见错误和实践方法，并增加 Python 3.11+ 的现代结构化并发及异步测试补充。

## 1. 全书主线

全书可以压缩为四条递进主线：

```text
事件循环与协程
  -> 并发 I/O：Socket、HTTP、数据库、Streams、Web
  -> 与其他并发模型协作：多进程、线程、子进程
  -> 正确性与工程化：同步、队列、微服务、上下文、测试和高级机制
```

| 部分 | 解决的问题 | 章节 |
|---|---|---|
| 心智模型 | asyncio 为什么能在单线程中并发 | [第1章 认识 asyncio](/kb/language/Python/异步处理/01-第1章-认识-asyncio/)、[第2章 asyncio 基础](/kb/language/Python/异步处理/02-第2章-asyncio-基础/) |
| 网络与 I/O | 如何并发处理 Socket、HTTP 和数据库 | [第3章 第一个 asyncio 应用](/kb/language/Python/异步处理/03-第3章-第一个-asyncio-应用/)、[第4章 并发 Web 请求](/kb/language/Python/异步处理/04-第4章-并发-Web-请求/)、[第5章 非阻塞数据库驱动](/kb/language/Python/异步处理/05-第5章-非阻塞数据库驱动/) |
| 混合并发 | CPU、阻塞库和 asyncio 如何组合 | [第6章 处理 CPU 密集型任务](/kb/language/Python/异步处理/06-第6章-处理-CPU-密集型任务/)、[第7章 使用线程处理阻塞任务](/kb/language/Python/异步处理/07-第7章-使用线程处理阻塞任务/) |
| 应用协议 | 如何构建网络和 Web 应用 | [第8章 Streams](/kb/language/Python/异步处理/08-第8章-Streams/)、[第9章 Web 应用](/kb/language/Python/异步处理/09-第9章-Web-应用/)、[第10章 微服务](/kb/language/Python/异步处理/10-第10章-微服务/) |
| 协调与高级机制 | 如何约束、通信、管理外部进程并理解底层 | [第11章 同步原语](/kb/language/Python/异步处理/11-第11章-同步原语/)、[第12章 异步队列](/kb/language/Python/异步处理/12-第12章-异步队列/)、[第13章 管理子进程](/kb/language/Python/异步处理/13-第13章-管理子进程/)、[第14章 高级 asyncio](/kb/language/Python/异步处理/14-第14章-高级-asyncio/) |
| 现代工程实践 | 如何使用结构化并发并验证取消、超时和资源清理 | [现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/)、[asyncio 测试与调试](/kb/language/Python/异步处理/16-asyncio-测试与调试/) |

## 2. 章节目录

### [第1章 认识 asyncio](/kb/language/Python/异步处理/01-第1章-认识-asyncio/)

建立全书心智模型：I/O-bound 与 CPU-bound、并发与并行、进程与线程、GIL、非阻塞 Socket、事件循环和协作式多任务。

### [第2章 asyncio 基础](/kb/language/Python/异步处理/02-第2章-asyncio-基础/)

学习 coroutine、`async`/`await`、Task、Future、取消、超时、调试和事件循环管理，并理解“创建协程对象”和“调度执行”不是一回事。

### [第3章 第一个 asyncio 应用](/kb/language/Python/异步处理/03-第3章-第一个-asyncio-应用/)

从阻塞 Socket 到非阻塞 Socket、selectors 和事件循环，构建 Echo Server，处理 Task 异常、信号和优雅停机。

### [第4章 并发 Web 请求](/kb/language/Python/异步处理/04-第4章-并发-Web-请求/)

使用 aiohttp 与异步上下文管理器，比较 `gather()`、`as_completed()`、`wait()`，理解异常、顺序、超时、取消、连接池和限流。

### [第5章 非阻塞数据库驱动](/kb/language/Python/异步处理/05-第5章-非阻塞数据库驱动/)

使用 asyncpg 执行查询、管理连接池和事务，通过异步生成器与游标流式处理结果，并认识数据库并发的容量边界。

### [第6章 处理 CPU 密集型任务](/kb/language/Python/异步处理/06-第6章-处理-CPU-密集型任务/)

使用 multiprocessing 和 `ProcessPoolExecutor` 绕过 GIL，将 CPU 工作交给其他进程，并以 MapReduce 理解任务拆分、序列化和结果归并。

### [第7章 使用线程处理阻塞任务](/kb/language/Python/异步处理/07-第7章-使用线程处理阻塞任务/)

通过线程池兼容同步阻塞库，理解 `run_in_executor()`、`asyncio.to_thread()`、线程锁、死锁、跨线程事件循环调用，以及释放 GIL 的 CPU 库。

### [第8章 Streams](/kb/language/Python/异步处理/08-第8章-Streams/)

从 Transport/Protocol 过渡到高层 `StreamReader`/`StreamWriter`，掌握 `drain()`、EOF、Server 生命周期和聊天应用中的背压。

### [第9章 Web 应用](/kb/language/Python/异步处理/09-第9章-Web-应用/)

理解 aiohttp Server、ASGI 与 WSGI、Starlette 和 Django 异步视图，区分框架会自动隔离的同步函数与应用直接调用的阻塞代码。

### [第10章 微服务](/kb/language/Python/异步处理/10-第10章-微服务/)

通过 Backend-for-Frontend 学习并发聚合、局部失败、超时预算、重试、指数退避、jitter、熔断、幂等和级联故障防护。

### [第11章 同步原语](/kb/language/Python/异步处理/11-第11章-同步原语/)

解释为什么单线程 asyncio 仍会产生竞态，并学习 Lock、Semaphore、BoundedSemaphore、Event 和 Condition 的适用场景及取消安全。

### [第12章 异步队列](/kb/language/Python/异步处理/12-第12章-异步队列/)

使用 Queue、PriorityQueue 和 LifoQueue 构建生产者-消费者系统，理解 `task_done()`、`join()`、sentinel、背压和结构化关闭。

### [第13章 管理子进程](/kb/language/Python/异步处理/13-第13章-管理子进程/)

异步启动和管理外部程序，读取 stdout/stderr、写入 stdin、并发等待和取消，避免 shell 注入及 PIPE 死锁。

### [第14章 高级 asyncio](/kb/language/Python/异步处理/14-第14章-高级-asyncio/)

学习同步/异步双 API、contextvars、主动让出事件循环、替代事件循环、协程与生成器、定制 Awaitable，并通过简化事件循环理解底层机制。

### [现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/)

把原书 API 映射到 Python 3.11–3.13：TaskGroup、ExceptionGroup、`except*`、`asyncio.timeout()`、Runner、eager task factory、Queue shutdown、取消计数和结构化并发。

### [asyncio 测试与调试](/kb/language/Python/异步处理/16-asyncio-测试与调试/)

使用 IsolatedAsyncioTestCase、AsyncMock 和 pytest-asyncio 测试并发、取消、超时与资源清理，并通过 debug、任务栈、循环异常处理器和 event-loop lag 定位运行时问题。

## 3. 推荐阅读方式

### 第一次阅读

按 01–16 顺序阅读。每章先回答“本章解决什么资源等待或协调问题”，再运行完整示例，最后完成复习题。

### 第二次复习

按主题跳读：

| 目标 | 推荐章节 |
|---|---|
| 掌握 Task、取消和超时 | [第2章 asyncio 基础](/kb/language/Python/异步处理/02-第2章-asyncio-基础/)、[现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/) |
| 编写高并发 HTTP 客户端 | [第4章 并发 Web 请求](/kb/language/Python/异步处理/04-第4章-并发-Web-请求/)、[第10章 微服务](/kb/language/Python/异步处理/10-第10章-微服务/) |
| 正确使用异步数据库 | [第5章 非阻塞数据库驱动](/kb/language/Python/异步处理/05-第5章-非阻塞数据库驱动/)、[第11章 同步原语](/kb/language/Python/异步处理/11-第11章-同步原语/) |
| 在 asyncio 中运行同步代码 | [第7章 使用线程处理阻塞任务](/kb/language/Python/异步处理/07-第7章-使用线程处理阻塞任务/) |
| 在 asyncio 中运行 CPU 任务 | [第6章 处理 CPU 密集型任务](/kb/language/Python/异步处理/06-第6章-处理-CPU-密集型任务/) |
| 设计流式网络协议 | [第8章 Streams](/kb/language/Python/异步处理/08-第8章-Streams/)、[第12章 异步队列](/kb/language/Python/异步处理/12-第12章-异步队列/) |
| 设计可靠服务停机 | [第3章 第一个 asyncio 应用](/kb/language/Python/异步处理/03-第3章-第一个-asyncio-应用/)、[第13章 管理子进程](/kb/language/Python/异步处理/13-第13章-管理子进程/)、[现代 asyncio 补遗](/kb/language/Python/异步处理/15-现代-asyncio-补遗/) |
| 测试取消、超时与资源清理 | [第2章 asyncio 基础](/kb/language/Python/异步处理/02-第2章-asyncio-基础/)、[asyncio 测试与调试](/kb/language/Python/异步处理/16-asyncio-测试与调试/) |

## 4. 全书核心结论

1. asyncio 的主要优势是并发等待 I/O，不是让 Python CPU 代码自动并行。
2. `async def` 只定义协程函数；调用它只产生协程对象，必须 `await` 或创建 Task 才会执行。
3. 事件循环依赖协作式让出。任何阻塞调用或长时间不 `await` 的 CPU 循环都会冻结同线程的全部 Task。
4. 取消是一种控制流。协程应在 `finally` 中释放资源，清理后通常要继续传播 `CancelledError`。
5. 超时不是独立机制，通常通过取消实现；被调用代码必须是取消安全的。
6. 并发数量必须有上限。连接池、Semaphore、Queue `maxsize`、Worker 数量和超时共同构成容量控制。
7. `gather()`、`wait()`、`as_completed()` 和 TaskGroup 的完成顺序、失败传播及取消语义不同，不能只按返回类型选择。
8. 阻塞 I/O 适合线程池；纯 Python CPU 密集任务适合进程池；原生库若释放 GIL，线程也可能并行。
9. asyncio 单线程不消除竞态。只要在“读-改-写”之间 `await`，其他 Task 就能插入。
10. 生产系统应优先结构化并发，让子 Task 的创建、失败、取消和等待处于明确作用域内。

## 5. 原书到现代 Python 的迁移速查

| 原书常见方式 | 现代优先方式 | 说明 |
|---|---|---|
| 收集 Task 后 `gather()` | `asyncio.TaskGroup` | 相关子任务需要共同生命周期时优先结构化并发 |
| `asyncio.wait_for()` | `asyncio.timeout()` / `timeout_at()` | 上下文超时更适合包围多个 await；`wait_for` 仍有效 |
| 手动 `new_event_loop()` | `asyncio.run()` / `asyncio.Runner` | 应用入口通常不应手工管理 loop |
| `loop.run_in_executor(None, fn)` | `asyncio.to_thread(fn)` | 同步 I/O 的简洁方式，自动传播当前 contextvars |
| 手动创建任务后逐一清理 | TaskGroup | 减少遗留 Task 和异常未检索 |
| Queue sentinel | `Queue.shutdown()`（Python 3.13+） | sentinel 仍兼容旧版本和复杂多阶段协议 |

迁移不应机械替换。`gather(return_exceptions=True)` 等场景与 TaskGroup 的 fail-fast 语义不同，应先明确所需失败模型。

## 6. 实践检查清单

- 所有网络、数据库、队列和锁等待都有合理超时。
- 所有创建的 Task 都被保存、等待或纳入 TaskGroup。
- 所有资源都由 `async with`、`finally` 或 lifespan 管理。
- 不在事件循环线程执行同步阻塞 I/O 或长 CPU 循环。
- 并发 fan-out 有 Semaphore、池、Queue 或批次上限。
- 取消路径经过测试，清理代码不会吞掉 `CancelledError`。
- 外部重试只作用于瞬时故障，并考虑幂等、退避、jitter 和总预算。
- 队列消费者始终让 `get()` 与 `task_done()` 成对。
- 子进程同时排空 stdout/stderr，并在超时后终止和回收。
- 开启 asyncio debug、slow callback 日志和任务命名，观测事件循环延迟。

## 7. 资料

- [Manning: Python Concurrency with asyncio](https://www.manning.com/books/python-concurrency-with-asyncio)
- [原书配套源码](https://github.com/concurrency-in-python-with-asyncio/concurrency-in-python-with-asyncio)
- [Python asyncio 官方文档](https://docs.python.org/3/library/asyncio.html)
- [Python 并发与多任务文档](https://docs.python.org/3/library/concurrency.html)
