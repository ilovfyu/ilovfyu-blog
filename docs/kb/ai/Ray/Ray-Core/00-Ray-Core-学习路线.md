---
title: "Ray Core 学习路线"
permalink: /kb/ai/Ray/Ray-Core/00-Ray-Core-学习路线/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "Ray Core 架构与运行时", link: /kb/ai/Ray/Ray-Core/01-架构与运行时/ }
knowledgeNote:
  series: "AI"
  group: "Ray Core"
---
::: abstract 系列定位
这套教程系统覆盖 Ray Core 的公开概念、主要 Python API、运行机制和工程实践。内容依据 2026-08-01 可访问的 Ray `latest` 官方文档整理，不展开 Ray Data、Train、Tune、Serve、RLlib 等上层库。
:::

当前目录中的专题文章适合系统学习和按问题检索；从本页按推荐顺序阅读即可。

## 1. 知识地图

| 主线 | 核心问题 | 对应教程 |
|---|---|---|
| 执行 | Python 函数和类如何在分布式 Worker 中运行 | [架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)、[Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)、[Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/) |
| 数据 | 结果如何跨进程和节点流动 | [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)、[Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)、[内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/) |
| 调度 | 计算为什么运行在这个节点和设备上 | [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)、[Placement Group](/kb/ai/Ray/Ray-Core/07-Placement-Group/) |
| 可靠性 | Worker、Actor、节点和对象丢失后发生什么 | [容错](/kb/ai/Ray/Ray-Core/09-容错/) |
| 工程化 | 依赖、命名、观测、排错和程序组织 | [Runtime Environment 与命名空间](/kb/ai/Ray/Ray-Core/10-Runtime-Environment-与命名空间/)、[可观测性与调试](/kb/ai/Ray/Ray-Core/11-可观测性与调试/)、[设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/) |

三个最基础的抽象：

```text
Task      = 无状态的远程函数调用
Actor     = 有状态的远程类实例
ObjectRef = 指向不可变远程对象的引用，也是计算依赖的句柄
```

Task 和 Actor method 产生 ObjectRef，下游调用通过 ObjectRef 表达数据依赖，调度器根据逻辑资源、调度策略和数据位置选择运行节点。

## 2. 推荐阅读顺序

### 第一阶段：运行时模型

1. [架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)
2. [Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)
3. [Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)
4. [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)

完成后应能解释：

- `.remote()` 为什么不是普通函数调用；
- Driver、Worker、raylet、GCS 和 object store 各自负责什么；
- 顶层 ObjectRef 参数为什么会自动解引用；
- Task 与 Actor 在状态、进程、调度和故障上的差别；
- Object owner 与对象数据所在节点为什么不是同一概念。

### 第二阶段：流式数据与调度

1. [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)
2. [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)
3. [Placement Group](/kb/ai/Ray/Ray-Core/07-Placement-Group/)
4. [内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/)

完成后应能解释：

- Generator 能降低哪部分内存，为什么它不天然提供消费端背压；
- `num_cpus=1` 为什么是逻辑准入请求而不是物理隔离；
- feasible、unavailable 和 infeasible 有何区别；
- Placement Group 的 bundle 为什么必须能装入单个节点；
- Worker heap、object store 和共享内存分别是什么；
- 为什么删除 ObjectRef 后对象仍可能被 pin 住。

### 第三阶段：生产工程

1. [容错](/kb/ai/Ray/Ray-Core/09-容错/)
2. [Runtime Environment 与命名空间](/kb/ai/Ray/Ray-Core/10-Runtime-Environment-与命名空间/)
3. [可观测性与调试](/kb/ai/Ray/Ray-Core/11-可观测性与调试/)
4. [设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/)

完成后应能解释：

- Task retry、Actor restart、Actor task retry 和对象重建的区别；
- 为什么重试要求幂等，而 Ray 不提供 exactly-once 事务语义；
- Runtime Environment 在 Job、Task、Actor 间如何继承；
- named 和 detached 为什么不等于持久化；
- 如何定位 PENDING、hang、OOM、导入失败和对象泄漏；
- 如何用 `ray.wait()`、Generator、资源声明和 Actor tree 组织大型应用。

## 3. 专题目录

### [架构与运行时](/kb/ai/Ray/Ray-Core/01-架构与运行时/)

Driver、Worker、raylet、GCS、对象存储、owner、Job、Node、Cluster，以及一次 Task 从提交到对象回收的生命周期。

### [Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)

Remote function、参数、多返回值、任务 DAG、嵌套 Task、取消、重试、Task Events、背压和任务粒度。

### [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/)

`ObjectRefGenerator`、同步与异步消费、`ray.wait()`、取消、异常、GC、Actor Generator 和 API 限制。

### [Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)

不可变对象、分布式引用计数、ownership、对象重建边界、Pickle 5、cloudpickle、NumPy zero-copy、自定义序列化和排错。

### [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)

普通、Async、Threaded Actor，GIL、调用顺序、并发组、ActorHandle、named/detached、终止、重启和状态恢复。

### [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)

CPU、GPU、memory、自定义和分数资源，DEFAULT/SPREAD、数据本地性、节点亲和、标签和加速器调度。

### [Placement Group](/kb/ai/Ray/Ray-Core/07-Placement-Group/)

Bundle、原子预留、gang scheduling、PACK/SPREAD、子任务捕获、生命周期、故障恢复和观测。

### [内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/)

Worker heap、object store、共享内存、引用 pinning、spilling、memory-aware scheduling、OOM prevention 和 `ray memory`。

### [容错](/kb/ai/Ray/Ray-Core/09-容错/)

应用/系统故障、Task retry、Actor restart、Actor task retry、lineage reconstruction、owner/node/GCS 故障和幂等。

### [Runtime Environment 与命名空间](/kb/ai/Ray/Ray-Core/10-Runtime-Environment-与命名空间/)

依赖作用域、文件与包分发、pip/conda/uv、继承与缓存、容器、namespace、named resource 和 detached 生命周期。

### [可观测性与调试](/kb/ai/Ray/Ray-Core/11-可观测性与调试/)

Dashboard、State API、`ray status`、日志、Runtime Context、性能分析、内存诊断和生产故障 Runbook。

### [设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/)

Nested parallelism、Generator、背压、资源节流、Async Actor、Supervisor、pipelining 和官方主要反模式。

## 4. 按问题查阅

| 问题 | 优先阅读 |
|---|---|
| Task 提交后为什么不运行 | [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)、[可观测性与调试](/kb/ai/Ray/Ray-Core/11-可观测性与调试/) |
| `ray.get()` 后内存为什么不释放 | [Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)、[内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/) |
| Actor 方法为什么相互阻塞 | [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/) |
| Async Actor 为什么没有提升 CPU 性能 | [Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/)、[设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/) |
| 如何限制 pending Task 数量 | [Task 深入](/kb/ai/Ray/Ray-Core/02-Task-深入/)、[设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/) |
| 大结果如何边生成边消费 | [Ray Generator](/kb/ai/Ray/Ray-Core/03-Ray-Generator/) |
| 资源够但 PG 为什么一直 pending | [Placement Group](/kb/ai/Ray/Ray-Core/07-Placement-Group/) |
| Task 或 Actor 崩溃后会不会重复执行 | [容错](/kb/ai/Ray/Ray-Core/09-容错/) |
| Worker 找不到本地包或文件 | [Runtime Environment 与命名空间](/kb/ai/Ray/Ray-Core/10-Runtime-Environment-与命名空间/) |
| 如何查哪个引用 pin 住对象 | [内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/)、[可观测性与调试](/kb/ai/Ray/Ray-Core/11-可观测性与调试/) |
| 如何避免 Driver 成为数据中转站 | [Object 与序列化](/kb/ai/Ray/Ray-Core/04-Object-与序列化/)、[设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/) |

## 5. 范围与版本原则

- 以 Python API 为主；Java/C++ 跨语言 API 不作为主线。
- Ray Jobs 和集群部署只在理解 Ray Core 边界所必需的位置说明。
- Ray Client、Direct Transport、标签调度等受限或成熟度变化的功能，不作为默认设计基础。
- 内部环境变量、私有 API 和实现细节仅用于解释或排错，不视为稳定契约。
- 生产项目应固定 Ray 版本，并对照对应版本文档验证默认值和实验 API。

## 6. 官方入口

- [Ray Core walkthrough](https://docs.ray.io/en/latest/ray-core/walkthrough.html)
- [Ray Core key concepts](https://docs.ray.io/en/latest/ray-core/key-concepts.html)
- [Ray Core API](https://docs.ray.io/en/latest/ray-core/api/index.html)
- [Design patterns and anti-patterns](https://docs.ray.io/en/latest/ray-core/patterns/index.html)
- [Fault tolerance](https://docs.ray.io/en/latest/ray-core/fault-tolerance.html)
- [Scheduling](https://docs.ray.io/en/latest/ray-core/scheduling/index.html)
