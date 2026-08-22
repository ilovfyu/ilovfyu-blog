---
title: "Ray Core Runtime Environment 与命名空间"
permalink: /kb/ai/Ray/Ray-Core/10-Runtime-Environment-与命名空间/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Ray Core：容错", link: /kb/ai/Ray/Ray-Core/09-容错/ }
next: { text: "Ray Core 可观测性与调试", link: /kb/ai/Ray/Ray-Core/11-可观测性与调试/ }
knowledgeNote:
  series: "AI"
  group: "Ray Core"
---
---
title: Ray Core Runtime Environment 与命名空间
aliases:
  - Ray Runtime Environment
  - Ray 命名空间
tags:
  - Ray
  - Ray-Core
  - Runtime-Environment
created: 2026-08-01
---

# Ray Core Runtime Environment 与命名空间

::: abstract 本文范围
本文依据 2026-08-01 Ray `latest` 官方文档，专讲 Ray Core 的依赖分发、Runtime Environment、namespace、named actor 与 named placement group 的生命周期。可观测与排错工具见 [可观测性与调试](/kb/ai/Ray/Ray-Core/11-可观测性与调试/)，任务组织方式见 [设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/)。
:::

## 1. 为什么需要 Runtime Environment

Ray 的 Driver、Task 和 Actor 往往运行在不同进程，集群模式下还会分布到不同节点。Driver 本机可以 `import my_package`，不代表 Worker 节点也有该包；Driver 能读取的相对路径，也不一定存在于 Worker。

Runtime Environment，简称 runtime env，是 Ray 为 **Ray 进程**动态准备的依赖描述，主要包含：

| 字段 | 解决的问题 | 典型用法 |
|---|---|---|
| `working_dir` | 分发项目目录，并作为 Worker 当前目录 | 脚本、配置、小型静态文件 |
| `py_modules` | 分发可导入的 Python 模块或 wheel | 本地库开发、多仓库依赖 |
| `pip` | 在 base environment 之上创建 virtualenv 并安装包 | 动态、轻量 Python 依赖 |
| `conda` | 创建隔离 Conda 环境 | Conda 原生包、复杂二进制依赖 |
| `env_vars` | 给 Worker 设置环境变量 | 线程数、开关、非敏感配置 |
| `uv` | 用 `uv pip` 创建依赖环境，当前为 Alpha | pip 兼容的快速安装 |
| `py_executable` | 指定 Worker 启动命令，当前为实验性 | `uv run`、调试器、profiler |
| `image_uri` | 让 Worker 使用指定镜像，当前为实验性 | 特定容器化 Worker 环境 |

Runtime env 叠加在节点已有的基础环境之上，只对 Driver/Worker 等 Ray 进程生效。通过 SSH 登录节点后直接启动普通 Python，并不能自动使用某个 Job 的 runtime env。

安装完整组件：

```bash
python -m pip install -U "ray[default]"
```

## 2. 三种作用域

### 2.1 Job Submission 作用域

推荐在共享或远程集群上通过 Ray Jobs 提交：

```bash
ray job submit \
  --address="http://127.0.0.1:8265" \
  --working-dir . \
  --runtime-env-json='{"pip":["requests==2.32.4"],"env_vars":{"APP_ENV":"prod"}}' \
  -- python main.py
```

这里 runtime env 会在入口命令执行前创建，因此 **Driver 和它创建的 Task/Actor 都能使用依赖**。Python SDK 等价写法：

```python
from ray.job_submission import JobSubmissionClient

client = JobSubmissionClient("http://127.0.0.1:8265")
submission_id = client.submit_job(
    entrypoint="python main.py",
    runtime_env={
        "working_dir": ".",
        "pip": ["requests==2.32.4"],
        "env_vars": {"APP_ENV": "prod"},
    },
)
print(submission_id)
```

### 2.2 `ray.init()` 的 Job 级子任务作用域

```python
import ray

ray.init(
    runtime_env={
        "working_dir": ".",
        "pip": {"packages": ["emoji==2.14.1"], "pip_check": True},
        "env_vars": {"OMP_NUM_THREADS": "1"},
    }
)
```

这会让当前 Job 创建的 Task 和 Actor 继承环境，但 **不会改造已经运行起来的入口 Driver**。因此下面的模块应放到 Task 内导入：

```python
import ray

ray.init(runtime_env={"pip": ["emoji==2.14.1"]})


@ray.remote
def render() -> str:
    import emoji
    return emoji.emojize("Ray is :rocket:")


print(ray.get(render.remote()))
ray.shutdown()
```

如果 Driver 自己也要 `import emoji`，使用 Ray Jobs、预装基础镜像，或用 `uv run` 启动 Driver。

### 2.3 Task/Actor 作用域

装饰器定义默认环境，`.options()` 可覆盖某次 Task 调用或某个 Actor 实例：

```python
import ray

ray.init(runtime_env={"env_vars": {"STAGE": "base", "TRACE": "0"}})


@ray.remote(runtime_env={"pip": ["emoji==2.14.1"]})
def task_version():
    import emoji
    return emoji.__version__


@ray.remote
class Inspector:
    def inspect(self):
        import os
        return dict(os.environ)


ref = task_version.options(
    runtime_env={
        "pip": ["emoji==2.14.1"],
        "env_vars": {"TRACE": "1"},
    }
).remote()

actor = Inspector.options(
    runtime_env={"env_vars": {"ROLE": "inspector"}}
).remote()

print(ray.get(ref))
env = ray.get(actor.inspect.remote())
print(env["STAGE"], env["ROLE"])
ray.shutdown()
```

::: warning 环境不同不等于协议兼容
两个 Task/Actor 若使用同一个 Python 类型的不同包版本，传递对象时可能出现反序列化错误。跨环境边界优先传 JSON、bytes、数组等稳定数据格式，并做版本契约。
:::

## 3. 继承、合并与覆盖

### 3.1 父 Task/Actor 到子级

Runtime env 会沿创建关系继承。子 Task/Actor 显式指定新环境时：

- `env_vars` 按变量名合并，子级同名值覆盖父级。
- `pip`、`conda`、`working_dir`、`py_modules` 等其他字段按整个字段覆盖，而不是拼接列表。

```python
import os
import ray

ray.init(runtime_env={
    "pip": ["requests==2.32.4"],
    "env_vars": {"A": "parent", "B": "parent"},
})


@ray.remote
def child_env():
    import importlib.util
    return {
        "A": os.environ["A"],
        "B": os.environ["B"],
        "C": os.environ["C"],
        "has_requests": importlib.util.find_spec("requests") is not None,
    }


ref = child_env.options(runtime_env={
    # 若指定 pip，这个列表会替换父级 pip 字段，而非追加。
    "pip": ["emoji==2.14.1"],
    "env_vars": {"B": "child", "C": "child"},
}).remote()

print(ray.get(ref))
ray.shutdown()
```

`has_requests` 仍可能因基础镜像已有该包而为真，不能用它证明列表发生了合并。正确心智模型始终是：子级的 `pip` 字段替换父级 `pip` 字段。

### 3.2 Job Submission 与 `ray.init()` 同时指定

二者无冲突时合并；`env_vars` 细化到变量名合并，其他字段细化到字段名合并。若双方给同一键不同值，默认报错，而不是静默选择一方。例如 Job 指定 `pip=["requests"]`，`ray.init()` 又指定 `pip=["torch"]`，会冲突。

环境变量 `RAY_OVERRIDE_JOB_RUNTIME_ENV=1` 可以改为子级覆盖语义，但生产环境更应消除重复配置源，避免部署结果依赖隐藏开关。

## 4. 文件与模块分发

### 4.1 `working_dir`

`working_dir` 被复制或下载到各节点，Worker 的当前目录切换到其节点本地副本：

```python
from pathlib import Path
import ray

# 先在当前目录创建 config.json，再运行本脚本。
ray.init(runtime_env={
    "working_dir": ".",
    "excludes": [".git/", "data/raw/", "*.log"],
})


@ray.remote
def read_config() -> str:
    return Path("config.json").read_text(encoding="utf-8")


print(ray.get(read_config.remote()))
ray.shutdown()
```

边界：

- 本地目录或本地压缩包的总大小/解压后大小上限为 500 MiB；远程 URI 不由 Ray 强制此上限，但下载成本仍存在。
- 可使用本地目录、本地 `.zip`/`.tar.gz`/`.tgz`，或 HTTPS、S3、GS、Azure 上的归档。
- 本地 `working_dir` 目前只能按 Job 设置，不能按 Task/Actor 设置。
- `.gitignore`、`.rayignore` 与 `excludes` 会影响上传；符号链接会被跟随，谨防把大目录或秘密意外打包。
- 大数据集、模型权重和频繁变化的大文件不适合 `working_dir`，应放对象存储、共享文件系统或镜像层。

Runtime env 总是先准备 `working_dir`，创建其他环境时可通过 `${RAY_RUNTIME_ENV_CREATE_WORKING_DIR}` 引用其中的 wheel、`requirements.txt` 或 `environment.yml`。

### 4.2 `py_modules`

```python
import ray
import my_local_package

ray.init(runtime_env={"py_modules": [my_local_package]})


@ray.remote
def use_package():
    import my_local_package
    return my_local_package.__file__


print(ray.get(use_package.remote()))
ray.shutdown()
```

条目可为本地文件/目录、已导入的 module 对象、本地 wheel，或远程归档/wheel URI。module 对象、本地路径和本地 wheel 目前只支持 Job 级设置。生产发布优先构建版本化 wheel 或镜像，不要把开发机的隐式目录结构当成部署协议。

## 5. `pip`、`conda`、`env_vars` 与 `uv`

### 5.1 `pip`

`pip` 支持包列表、requirements 文件路径，或带选项的字典：

```python
runtime_env = {
    "pip": {
        "packages": ["requests==2.32.4", "pydantic==2.11.7"],
        "pip_check": True,
        "pip_install_options": ["--disable-pip-version-check", "--no-cache-dir"],
    }
}
```

它在基础环境之上使用 virtualenv，因此基础镜像中的包通常仍可导入。锁定直接和间接依赖，避免每次安装得到不同结果；含源码编译的大包会显著增加启动时间，应进入容器镜像。

### 5.2 `conda`

```python
runtime_env = {
    "conda": {
        "channels": ["conda-forge"],
        "dependencies": [
            "python=3.11",
            "numpy=2.2.*",
            "pip",
            {"pip": ["requests==2.32.4"]},
        ],
    }
}
```

Conda 环境更隔离，但创建通常更慢。要求 Python 与集群兼容；Ray 会注入所需 Ray 依赖，不应手动给出不同版本的 `ray`。同一个 runtime env 不能同时包含顶层 `conda` 和顶层 `pip`；需要混合时，将 pip 依赖写进 Conda YAML 的 `pip` 段。

### 5.3 `env_vars`

```python
runtime_env = {
    "env_vars": {
        "OMP_NUM_THREADS": "1",
        "LD_LIBRARY_PATH": "${LD_LIBRARY_PATH}:/opt/acme/lib",
    }
}
```

同名变量默认覆盖节点环境；`${NAME}` 可引用已有值，不存在时展开为空字符串。不要把长期凭证直接写进代码或 State API 可见的 runtime env 描述；优先使用平台 Secret 注入、短期凭证和最小权限。

### 5.4 `uv` 的两条路径

官方优先推荐 `uv run`，它同步 Driver 与 Worker 的 `pyproject.toml`/`uv.lock` 环境：

```bash
uv lock
uv run main.py

# Ray Job：把项目和 lockfile 一并上传
ray job submit --working-dir . -- uv run main.py
```

Ray 底层通过实验性的 `py_executable` 和 `working_dir` 让 Worker 以相同 `uv run` 命令启动。Driver、Worker 与集群的 Python/Ray 版本必须匹配。

另一种是 runtime env 的 `uv` 字段：

```python
ray.init(runtime_env={
    "uv": {
        "packages": ["requests==2.32.4"],
        "uv_check": True,
    }
})
```

该字段是 Alpha，语义类似 `pip` 插件，但不是完整的 `uv run`/`pyproject.toml` 工作流。生产上优先使用锁文件和镜像；使用 Alpha/实验字段前固定 Ray 版本并做升级验证。

## 6. 安装时机、缓存与回收

Job 级 runtime env 默认在 `ray.init()` 时 eager install 到所有节点。可改成首次 Task/Actor 使用时再创建：

```python
ray.init(runtime_env={
    "pip": ["emoji==2.14.1"],
    "config": {
        "eager_install": False,
        "setup_timeout_seconds": 300,
    },
})
```

惰性安装降低未使用节点的启动成本，但首个请求延迟更高。Task/Actor 级环境本来就是使用时安装。

每个节点按 `working_dir`、`py_modules`、`pip` 等字段分别缓存，默认每类 10 GB。启动 Ray 前可调整，例如：

```bash
export RAY_RUNTIME_ENV_WORKING_DIR_CACHE_SIZE_GB=2
export RAY_RUNTIME_ENV_PIP_CACHE_SIZE_GB=20
ray start --head
```

超过容量时，Ray 只回收当前没有 Job、Task 或 Actor 使用的资源。环境内容哈希变化会形成新缓存项；不断生成未锁定或带时间戳的环境会造成缓存抖动。缓存通常位于 `/tmp/ray/session_latest/runtime_resources`，它是实现位置而不是持久 API。

排错重点：

```bash
ray list runtime-envs --detail
ray logs cluster runtime_env_agent.log
ray logs cluster 'runtime_env_setup-*'
```

具体日志文件名和目录布局不承诺向后兼容，CLI/Dashboard 优先于直接解析文件。更多见 [. Import 与 Runtime Environment 错误](/kb/ai/Ray/Ray-Core/11-可观测性与调试/#8.%20Import%20%E4%B8%8E%20Runtime%20Environment%20%E9%94%99%E8%AF%AF)。

## 7. 容器与生产部署建议

容器镜像和 runtime env 不是二选一：

- 镜像放操作系统库、CUDA/驱动兼容层、编译工具、大型且稳定的 Python 依赖。
- runtime env 放项目代码、小而动态的 Python 包、Job 特定环境变量。
- 生产镜像用 digest 或不可变 tag；Python、Ray、CUDA 和 ABI 在所有节点一致。
- 不要依赖 Task 启动时在线编译大型 wheel；网络或包仓库抖动会变成调度失败。
- 预热常用 runtime env，或保留 eager install，以换取可预测的首请求延迟。
- `image_uri` 当前实验性。常规生产部署优先在 Ray 集群层统一指定容器镜像，而不是把 Worker 容器化职责全部交给 runtime env。
- 容器内 Dashboard 要监听外部地址时，启动 head 使用 `--dashboard-host=0.0.0.0`，但不要把 8265 未鉴权地暴露到公网。

## 8. Namespace：名称的逻辑边界

Namespace 是 Job 与命名资源的逻辑分组。它不是安全边界、网络隔离或资源配额；它主要解决多 Job 如何用稳定名字找到同一个 Actor/placement group。

```python
import ray

ray.init(address="auto", namespace="payments-prod")
print(ray.get_runtime_context().namespace)
```

未指定 namespace 时，Job 进入 UUID 形式的匿名 namespace。不同 Job 默认互相看不到命名 Actor，因此需要跨 Job 协作时应显式使用稳定 namespace。

### 8.1 Named Actor

```python
import ray

ray.init(address="auto", namespace="demo")


@ray.remote
class Counter:
    def __init__(self):
        self.value = 0

    def increment(self):
        self.value += 1
        return self.value


try:
    counter = ray.get_actor("counter")
except ValueError:
    counter = Counter.options(
        name="counter",
        lifetime="detached",
    ).remote()

print(ray.get(counter.increment.remote()))
ray.shutdown()
```

名字在 namespace 内唯一。也可显式跨 namespace 创建或查询：

```python
actor = Counter.options(
    name="shared-counter",
    namespace="platform",
    lifetime="detached",
).remote()

same_actor = ray.get_actor("shared-counter", namespace="platform")
```

“先 `get_actor`，失败再创建”存在并发竞态：两个 Job 可能同时判断不存在，其中一个创建时报重名。生产控制面应把创建动作收敛到单一部署者，或捕获重名错误后重新 `get_actor`。

### 8.2 生命周期：非 detached 与 detached

| 类型 | 默认所有者与生命周期 | 适合场景 |
|---|---|---|
| 普通 Actor | 由引用计数和创建它的 Job 管理；所有者退出会使其终止 | Job 内临时状态 |
| `lifetime="detached"` Actor | 脱离创建 Job，可跨 Job 存活，直到显式 kill 或集群终止 | 长期共享控制 Actor |

删除 detached actor：

```python
actor = ray.get_actor("counter", namespace="demo")
ray.kill(actor, no_restart=True)
```

Detached 不是持久化：集群重启后状态消失；Actor 进程故障后的恢复还取决于 `max_restarts` 和状态恢复设计。需要业务持久性时把权威状态写入外部持久存储。

### 8.3 Named Placement Group

Placement group 也可命名并通过 namespace 查找：

```python
import ray
from ray.util.placement_group import placement_group, get_placement_group

ray.init(address="auto", namespace="analytics")

pg = placement_group(
    [{"CPU": 1}, {"CPU": 1}],
    strategy="PACK",
    name="batch-workers",
    lifetime="detached",
)
ray.get(pg.ready())

same_pg = get_placement_group("batch-workers")
print(same_pg.id)
```

普通 placement group 随创建 Job 结束；detached placement group 跨 Job 存活并继续占用逻辑资源，必须治理和回收：

```python
from ray.util.placement_group import get_placement_group, remove_placement_group

pg = get_placement_group("batch-workers")
remove_placement_group(pg)
```

::: danger 名称不是租约
Named/detached 资源不会因为“暂时无人调用”自动变成可回收容量。给名称加入服务和环境维度，建立 owner、TTL/清理流程与告警，并定期用 `ray list actors`、`ray list placement-groups` 审计。
:::

## 9. 常见错误与定位顺序

### `ModuleNotFoundError`

1. 判断错误发生在 Driver 还是 Worker；`ray.init(runtime_env=...)` 不处理 Driver。
2. 检查 Task/Actor 子环境是否用新的 `pip`/`py_modules` 整字段覆盖了父环境。
3. 检查 Python/Ray 版本以及 wheel 平台标签。
4. 查看 `runtime_env_setup-*` 和 `runtime_env_agent` 日志。
5. 固定版本并启用 `pip_check`/`uv_check`。

### `FileNotFoundError`

1. 相对路径是否应来自 `working_dir`。
2. 文件是否被 `.gitignore`、`.rayignore`、默认排除项或 `excludes` 排除。
3. 是否错误地把本机绝对路径传给远端 Worker。
4. 大文件是否应该转移到共享存储，而不是继续扩大上传包。

### 环境创建慢或超时

1. 首次安装与缓存命中要分开测量。
2. 避免源码编译；构建 wheel 或镜像。
3. 检查包仓库、DNS、代理、证书、磁盘空间。
4. 合理增大 `setup_timeout_seconds`，但不要用无限超时掩盖安装挂死。
5. 稳定环境描述，减少无意义的新哈希和缓存项。

### 找不到 named actor

1. Job 是否连接到相同 cluster。
2. namespace 是否一致，大小写是否一致。
3. Actor 是否 detached；创建 Job 是否已退出。
4. Actor 是否被 kill、崩溃且超过重启次数。
5. 用 `ray list actors --detail` 检查 `name`、`ray_namespace`、`state` 和 `death_cause`。

## 10. 生产检查清单

- 基础镜像固定 Ray、Python、系统 ABI 和大依赖。
- Runtime env 固定包版本并提交 lockfile；升级先做兼容测试。
- Driver 需要依赖时使用 Job Submission 或 `uv run`，不误以为 `ray.init` 会安装到 Driver。
- `working_dir` 小而明确，设置 `.rayignore`/`excludes`，不包含数据集、秘密和本地虚拟环境。
- 用 `setup_timeout_seconds`、安装日志和 runtime-env State 监控冷启动。
- 高稳定性服务采用显式 namespace；不要把 namespace 当权限边界。
- Detached actor/placement group 有明确 owner、清理机制和外部持久化策略。
- 环境变量不承载长期明文秘密；跨不同依赖版本只传稳定数据协议。

## 11. 延伸阅读

- [可观测性与调试](/kb/ai/Ray/Ray-Core/11-可观测性与调试/)：State API、日志、runtime context 与依赖故障定位。
- [设计模式与反模式](/kb/ai/Ray/Ray-Core/12-设计模式与反模式/)：如何组织 Task/Actor 并避免对象和调度反模式。
- [Ray Core 学习路线](/kb/ai/Ray/Ray-Core/00-Ray-Core-学习路线/)：完整系列目录和推荐阅读顺序。
