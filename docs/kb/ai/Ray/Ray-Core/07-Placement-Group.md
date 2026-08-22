---
title: "Ray Core：Placement Group"
permalink: /kb/ai/Ray/Ray-Core/07-Placement-Group/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Ray Core：资源与调度", link: /kb/ai/Ray/Ray-Core/06-资源与调度/ }
next: { text: "Ray Core：内存与对象溢写", link: /kb/ai/Ray/Ray-Core/08-内存与对象溢写/ }
knowledgeNote:
  series: "AI"
  group: "Ray Core"
---
::: info 文档基线
本文只讨论 Ray Core，依据 2026-08-01 的 Ray latest 官方文档。Placement Group（PG）提供资源组的原子预留和 gang scheduling；它不等于 task/actor，本身不执行代码。
:::

## 1. 为什么需要 PG

逐个创建 4 个 worker actor 时，前 3 个可能先占住资源，第 4 个永远无法启动，形成资源死锁或半启动服务。PG 先原子地预留全部 bundle：全部能放下才预留，否则一个都不占。预留成功后，显式绑定 PG 的 task/actor 才能消费这些资源。

PG 的典型 Core 用途：一组 actor 同时启动、把通信密集组件尽量放近、把副本分散到故障域。它不会替你实现分布式训练协议。

## 2. Bundle 是单节点预留单元

bundle 是资源字典，如 `{"CPU": 2, "GPU": 1, "memory": 2e9}`。每个 bundle 必须完整放在一台节点上，不能拆分。一个 9 CPU bundle 无法放入由 8 CPU 和 4 CPU 两台节点组成的集群。

```python
import ray
from ray.util.placement_group import placement_group

ray.init(num_cpus=4)
pg = placement_group(
    bundles=[{"CPU": 1}, {"CPU": 1}],
    strategy="PACK",
    name="two-workers",
)
ray.get(pg.ready(), timeout=10)
print(pg.bundle_specs)
ray.shutdown()
```

`placement_group()` 异步返回。使用前应等待 `ray.get(pg.ready(), timeout=...)`，也可 `pg.wait(timeout_seconds)`。超时不代表 API 调用失败，通常表示资源暂不可用或永远不可行。

可用资源 key 包括 `CPU`、`GPU`、`memory` 与 custom resource。`object_store_memory` 不能作为 bundle 调度资源。资源模型详见 [资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)。

## 3. 原子预留的精确含义

初次创建时，Ray 为所有 bundle 找到布局后才提交预留；任何 bundle 不可放置，则 PG 保持 PENDING，不会只占其中一部分。Autoscaler 能看到 PG demand 并尝试扩容。

原子性只保证**初次预留**。创建成功后若某节点死亡，PG 可能暂时处于部分丢失状态：存活节点上的 bundle 和工作继续存在，丢失 bundle 等待重建。这一点在故障设计中非常重要。

## 4. 四种放置策略

| 策略 | 语义 | 适用场景 |
| --- | --- | --- |
| `PACK`（默认） | 尽量把 bundle 放同一节点，放不下可跨节点 | 通信 locality，允许退化 |
| `STRICT_PACK` | 所有 bundle 必须在同一节点 | 强 locality；总和必须单节点容纳 |
| `SPREAD` | 尽量分散，不足时可重叠节点 | 降低相关故障，允许退化 |
| `STRICT_SPREAD` | 每个 bundle 必须在不同节点 | 强故障隔离；节点数至少等于 bundle 数 |

选择策略时先检查 bundle 粒度。例如 `STRICT_PACK` 的多个 bundle 总和也必须由一台节点容纳；`STRICT_SPREAD` 的每个 bundle 单独可行且节点数量足够。

## 5. 把 task/actor 绑定到 PG

预留资源不会自动供普通工作使用，必须通过 `PlacementGroupSchedulingStrategy`：

```python
import ray
from ray.util.placement_group import placement_group, remove_placement_group
from ray.util.scheduling_strategies import PlacementGroupSchedulingStrategy

ray.init(num_cpus=4)
pg = placement_group([{"CPU": 1}, {"CPU": 1}], strategy="PACK")
ray.get(pg.ready(), timeout=10)

@ray.remote(num_cpus=1)
class Worker:
    def location(self):
        return ray.get_runtime_context().get_node_id()

workers = [
    Worker.options(
        scheduling_strategy=PlacementGroupSchedulingStrategy(
            placement_group=pg,
            placement_group_bundle_index=i,
        )
    ).remote()
    for i in range(2)
]
print(ray.get([w.location.remote() for w in workers]))

remove_placement_group(pg)
ray.shutdown()
```

`placement_group_bundle_index` 从 0 开始。不指定（默认 `-1`）时，Ray 选择任一能容纳请求的 bundle。一个 bundle 可承载多个 task/actor，前提是它们同时占用的资源总和不超过预留量。

::: warning Actor 默认 CPU 陷阱
默认 actor 创建时要求 1 CPU、运行时占 0 CPU，因此 bundle 至少要含 1 CPU 才能创建，但创建后又不持续消费它。为避免资源账本反直觉，PG 内 actor 务必显式声明 `num_cpus`。
:::

请求必须完全适配目标 bundle。把 `num_cpus=2` actor 指到 `{"CPU": 1}` bundle，不会借用相邻 bundle 的 CPU。

## 6. Child task capture

默认情况下，PG 内运行的父 task/actor 创建的 child 不继承 PG。设置 `placement_group_capture_child_tasks=True` 可自动捕获未显式指定策略的后代：

```python
import ray
from ray.util.placement_group import placement_group
from ray.util.scheduling_strategies import PlacementGroupSchedulingStrategy

ray.init(num_cpus=2)
pg = placement_group([{"CPU": 2}])
ray.get(pg.ready())

@ray.remote(num_cpus=1)
def child():
    return "child done"

@ray.remote(num_cpus=1)
def parent():
    return ray.get(child.remote())

strategy = PlacementGroupSchedulingStrategy(
    placement_group=pg,
    placement_group_capture_child_tasks=True,
)
print(ray.get(parent.options(scheduling_strategy=strategy).remote()))
ray.shutdown()
```

需要让某个 child 逃逸到全局资源池时，显式传 `PlacementGroupSchedulingStrategy(placement_group=None)`。

最常见死锁是父 task 占满 bundle 后同步 `ray.get(child.remote())`，而 child 也需要同一 bundle 的资源。解决办法是给 parent+child 留足资源、减少 parent 请求、避免阻塞式嵌套，或让 child 明确逃逸且确保 PG 外仍有资源。

## 7. 生命周期、名称与 detached

默认 PG 的生命周期属于创建者：driver 创建则 driver 退出后删除；detached actor 创建则该 actor 终止后删除。手动 `remove_placement_group(pg)` 是异步操作，并会**强制杀死**仍在使用 bundle 的 actor/task。

命名 PG 可在同一 namespace 的其他 job 中获取：

```python
import ray
from ray.util.placement_group import placement_group

ray.init(address="auto", namespace="core-app")
pg = placement_group(
    [{"CPU": 1}],
    name="service-pg-v1",
    lifetime="detached",
)
ray.get(pg.ready())

# 另一个同 namespace driver：
same_pg = ray.util.get_placement_group("service-pg-v1")
```

`name` 与 `lifetime` 相互独立：只有名字但不 detached，原 driver 结束时仍被删除；detached 却不命名，driver 结束后将难以重新获取和删除。因此 detached PG 应始终命名，并建立回收流程。

## 8. 观测与排错

```python
from pprint import pprint
from ray.util.placement_group import placement_group_table

pprint(placement_group_table(pg))
```

命令行（需 `ray[default]`）：

```bash
ray status
ray list placement-groups
ray list placement-groups --detail
ray list actors --detail
```

`ray status` 同时显示 reserved/used 资源和 pending PG demands。State API 可看 `PENDING`、`CREATED`、`REMOVED` 等状态、bundle 到 node 的映射和创建者。

| 症状 | 可能原因 | 检查与修复 |
| --- | --- | --- |
| `pg.ready()` 超时 | 资源忙或 bundle infeasible | 看 `ray status` demands；检查单 bundle 是否能放入单节点 |
| STRICT_SPREAD 永久 PENDING | 节点数不足 | 增节点、减 bundle 或改 SPREAD |
| STRICT_PACK 不可行 | bundle 总和超过任一节点 | 改 PACK、减资源或用大节点 |
| PG 已 CREATED，actor 仍 PENDING | actor 资源不适配 bundle/索引 | 对照 `required_resources` 与 bundle specs |
| 全局 task 没资源 | PG 已预留但 task 未绑定 | 绑定 PG 或释放预留 |
| 嵌套 task 卡死 | child capture 后 bundle 自死锁 | 为 child 留资源或禁用 capture |
| GPU 排名不连续 | bundle 顺序不等于物理 GPU rank | 从 runtime context 获取实际设备，不猜编号 |

## 9. 节点故障后的行为

节点死亡时，Ray 优先尝试在其他节点恢复丢失 bundle。恢复中的 bundle 比新 PG 有更高调度优先级。资源不足时，PG 可无限保持部分创建状态，等待 Autoscaler 或资源释放；存活 bundle 上的 actor/task 不会仅因另一个 bundle 丢失而被统一停止。

丢失 bundle 恢复后，其 actor/task 是否回来取决于各自容错策略：task 看 `max_retries`，actor 看 `max_restarts` 与 `max_task_retries`。PG 只恢复资源槽，不恢复应用状态，详见 [容错](/kb/ai/Ray/Ray-Core/09-容错/)。

## 10. Label selector 与 label locality

PG 可给每个 bundle 配 label selector：

```python
pg = placement_group(
    bundles=[{"CPU": 1}, {"GPU": 1}],
    bundle_label_selector=[
        {"ray.io/market-type": "spot"},
        {"ray.io/accelerator-type": "H100"},
    ],
)
```

::: warning Beta / Experimental
Ray labels 整体为 Beta，而相关 Python 参数在部分 API 参考中仍标为 Experimental。节点必须实际具有标签，否则 PG 会保持不可调度。
:::

::: danger Alpha：label locality scheduling
2026-08-01 latest 文档中的 PG label locality 是 Alpha，API 与约束可能变化。目前仅针对所有 bundle 都选择 `ray.io/accelerator-type=GB200` 或 `GB300` 的场景，在 `ray.io/gpu-domain` 域级做 STRICT_PACK；节点级策略仍在域内生效。Ray 不自动设置 `ray.io/gpu-domain`。
:::

Alpha 行为摘要：部分域故障时，丢失 bundle 只在原域恢复；资源不足会等待，若要迁域需删除并重建 PG，且删除会杀死全部使用者。整个域死亡时，Ray 才清除域绑定并尝试在另一域重建整个 PG。可在 Dashboard 的 Label Domain 或 `ray list placement-groups --detail` 的 `label_domain_key`/`label_domain_assignments` 观察。

## 11. 最佳实践

1. 只在需要 gang scheduling 或 bundle 间放置约束时使用 PG，单个 task 不必套 PG。
2. bundle 按可单节点容纳来设计；提交前静态检查最大节点规格。
3. 为 PG 的 `ready()` 设置超时并输出 `ray status`，不要无限静默等待。
4. PG 内所有 actor 显式声明资源和 bundle index，避免默认 CPU 语义。
5. 谨慎开启 child capture，先画出父子资源占用，防止嵌套 `ray.get` 死锁。
6. detached PG 一定命名、指定 namespace，并在部署系统中负责删除。
7. 把 PG 故障恢复与 task/actor 的重试、checkpoint 一起设计，而不是把预留恢复误认为应用恢复。

## 系列导航

- 上一篇：[资源与调度](/kb/ai/Ray/Ray-Core/06-资源与调度/)
- 下一篇：[内存与对象溢写](/kb/ai/Ray/Ray-Core/08-内存与对象溢写/)
- 相关：[Actor 深入](/kb/ai/Ray/Ray-Core/05-Actor-深入/) · [容错](/kb/ai/Ray/Ray-Core/09-容错/)

## 官方依据

- [Placement Groups](https://docs.ray.io/en/latest/ray-core/scheduling/placement-group.html)
- [Scheduling](https://docs.ray.io/en/latest/ray-core/scheduling/index.html)
- [Resources](https://docs.ray.io/en/latest/ray-core/scheduling/resources.html)
- [Task Fault Tolerance](https://docs.ray.io/en/latest/ray-core/fault_tolerance/tasks.html)
- [Actor Fault Tolerance](https://docs.ray.io/en/latest/ray-core/fault_tolerance/actors.html)
