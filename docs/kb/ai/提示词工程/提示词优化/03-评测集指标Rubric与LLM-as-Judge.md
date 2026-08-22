---
title: "评测集、指标、Rubric 与 LLM-as-Judge"
permalink: /kb/ai/提示词工程/提示词优化/03-评测集指标Rubric与LLM-as-Judge/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "提示词诊断：错误分类与最小修改", link: /kb/ai/提示词工程/提示词优化/02-提示词诊断错误分类与最小修改/ }
next: { text: "A/B 测试、回归测试与版本管理", link: /kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/ }
knowledgeNote:
  series: "AI"
  group: "提示词优化"
---
> 评测的目的不是制造一个漂亮总分，而是降低错误决策的概率。

## 章节导航

- 上一章：[提示词诊断错误分类与最小修改](/kb/ai/提示词工程/提示词优化/02-提示词诊断错误分类与最小修改/)
- 下一章：[A-B测试回归测试与版本管理](/kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/)
- 成本评测：[Token成本延迟稳定性与模型选择](/kb/ai/提示词工程/提示词优化/05-Token成本延迟稳定性与模型选择/)

## 学习目标

- 建立代表性集、挑战集和隐藏集。
- 为任务选择可解释的主指标与护栏指标。
- 区分 accuracy、precision、recall 与 F1。
- 测量 JSON valid rate、groundedness 和 task success。
- 编写原子化 Rubric。
- 校准 LLM-as-Judge。
- 控制盲测、位置偏差与自偏好。
- 对随机输出重复采样并报告置信区间。
- 明确 judge 不是事实真值。

## 一、测量系统在闭环中的位置

闭环仍然是：

1. 定义任务与约束。
2. 建立 baseline。
3. 建立分层测试集。
4. 错误分类。
5. 一次一个变量。
6. 离线评测。
7. 人工复核。
8. 小流量上线。
9. 监控回滚。

评测系统横跨第 3、6、7 步。

它必须先于大规模优化存在。

## 二、评测集的三种角色

### 代表性集

目标是估计真实线上分布下的表现。

要求：

- 按真实流量抽样。
- 保留类别频率。
- 保留语言和长度分布。
- 定期随线上漂移更新。
- 报告采样时间窗口。

### 挑战集

目标是主动暴露脆弱性。

包含：

- 边界输入。
- 稀有高风险输入。
- 历史事故。
- 对抗提示。
- 多意图和冲突证据。
- 超长、空值和噪声。

挑战集分数不能冒充线上平均表现。

### 隐藏集

目标是抑制反复调参造成的过拟合。

要求：

- 优化人员不能看到答案。
- 自动优化器不能访问。
- 低频使用。
- 按组去重。
- 每次使用留下审计记录。

## 三、数据切分与泄漏

| 集合 | 用途 | 可否反复查看 |
|---|---|---|
| Train | 微调或自动优化候选生成 | 可以 |
| Dev | 错误分析和提示词迭代 | 可以 |
| Validation | 候选选择和阈值设定 | 有限 |
| Test | 阶段性无偏评估 | 不应反复 |
| Hidden audit | 发布审计 | 极少 |

### 常见泄漏路径

- 同一会话被拆到不同集合。
- 原文和改写进入不同集合。
- 同一模板仅替换实体后跨集合。
- 测试答案出现在 few-shot 示例。
- judge 提示词含参考答案特征。
- 自动 prompt search 直接查询测试分数。
- 人工根据测试失败逐条加规则。

### 组级切分

应按以下键之一分组：

- 会话 ID。
- 用户 ID。
- 文档 ID。
- 模板族。
- 事件 ID。
- 语义近重复簇。

先分组，再切分。

## 四、Golden Label 的质量

### 标签规范

每个标签需要：

- 定义。
- 包含条件。
- 排除条件。
- 与相邻标签的边界。
- 冲突优先级。
- 正例。
- 反例。
- 不确定时的处理。

### 双人标注流程

1. 两名标注员独立标注。
2. 不展示模型输出来源。
3. 记录理由和证据。
4. 计算一致率。
5. 对分歧做仲裁。
6. 更新标签手册。
7. 必要时重标历史样本。

### 不能强行制造真值的任务

创意、风格和开放问答可能没有唯一答案。

此时使用：

- 多参考答案。
- Rubric 维度分数。
- 成对偏好。
- 任务成功事件。
- 专家审查。

## 五、分类指标

### 混淆矩阵基础

| | 预测正 | 预测负 |
|---|---:|---:|
| 实际正 | TP | FN |
| 实际负 | FP | TN |

### 公式

```text
accuracy  = (TP + TN) / total
precision = TP / (TP + FP)
recall    = TP / (TP + FN)
F1        = 2PR / (P + R)
```

### 如何选择

- 类别均衡、错误代价近似：accuracy 可作概览。
- 假阳性昂贵：重点看 precision。
- 假阴性昂贵：重点看 recall。
- 两者需平衡：看 F1，但仍报告 P/R。
- 多分类不均衡：看 macro F1 与逐类指标。

### Micro、Macro 与 Weighted

- Micro：汇总所有计数后计算，受大类支配。
- Macro：各类等权，能暴露小类失败。
- Weighted：按类频率加权，接近总体但可能掩盖小类。

任何报告都要注明口径。

## 六、生成与结构指标

### JSON valid rate

```text
JSON valid rate = JSON 可解析输出 / 全部输出
```

它不等于 schema 合法。

### Schema valid rate

检查：

- 必填字段。
- 字段类型。
- 枚举值。
- 额外字段。
- 长度范围。
- 字段间约束。

### Groundedness

建议按 claim 评测：

```text
groundedness = 有来源直接支持的事实主张 / 全部可验证事实主张
```

还应分别测：

- Citation precision：引用是否支持主张。
- Citation recall：应引用的主张是否有引用。
- Source quality：来源是否获准且可信。
- Completeness：答案是否覆盖关键事实。

一个回答可以 grounded 但没用。

例如只回答一个安全但无关的事实。

### Task success

Task success 是端到端成功事件。

例：预订任务要求：

- 参数正确。
- 查询成功。
- 价格真实。
- 付费前获得确认。
- 订单真实创建。
- 没有越权。

其中任一关键条件失败，整体失败。

## 七、非功能指标

质量必须与以下指标联合评估：

- 输入 token。
- 输出 token。
- 总调用次数。
- 平均成本。
- p95 成本。
- 首 token 延迟。
- p50/p95/p99 完整延迟。
- 超时率。
- 重试率。
- 限流率。
- 多次采样一致率。

成本和延迟不是上线后的附加观察项。

它们是候选选择的约束。

## 八、Rubric 原子化

### 什么是原子标准

一个标准只判断一件事。

**坏标准**：

> 回答准确、完整、简洁、专业且有引用，1-5 分。

问题：

- 多个维度混在一起。
- 分数不可解释。
- 评审可能使用不同权重。

**好标准**：

- R1：每个政策事实都由来源直接支持，0/1。
- R2：覆盖生效日期，0/1。
- R3：覆盖适用员工范围，0/1。
- R4：包含正确申请入口，0/1。
- R5：不超过 200 字，0/1。
- R6：没有披露个人信息，0/1。

### Rubric 类型

#### 二元项

适合明确契约。

```text
0 = 不满足
1 = 满足
```

#### 有序等级

适合程度差异。

```text
0 = 完全错误
1 = 部分正确但关键遗漏
2 = 基本正确，仅次要问题
3 = 完全满足
```

#### 硬门槛

一票否决项：

- 泄露隐私。
- 未确认付款。
- 编造订单号。
- 引用被禁止来源。

### Rubric 字段模板

```yaml
id: grounded_claims
question: 每个可验证事实主张是否由允许来源直接支持？
scope: 只评事实支持，不评完整性和文风
score_0: 至少一个主张无支持或与来源冲突
score_1: 所有主张有直接支持，推断被明确标记
evidence_required: 列出不满足的主张及来源编号
not_applicable: 输出没有事实主张时
severity: critical
```

## 九、Rubric 设计流程

1. 从任务契约列出验收条件。
2. 把复合条件拆成原子项。
3. 区分硬门槛与软质量。
4. 为每个分数写锚点。
5. 加入正例、边界例、反例。
6. 让多人试标一小批。
7. 分析分歧。
8. 修改模糊措辞。
9. 冻结 Rubric 版本。
10. 与数据集版本一起保存。

### Rubric 不能补救任务定义缺失

如果业务方无法决定“怎样算成功”，judge 也不能替业务方决定。

## 十、LLM-as-Judge 的适用边界

### 适合

- 大规模初筛。
- 风格和相关性初评。
- 对开放输出应用明确 Rubric。
- 成对比较候选答案。
- 辅助发现错误模式。

### 不适合单独决定

- 法律、医疗、资金等高风险结论。
- 精确事实真值。
- 安全上线批准。
- Rubric 本身含糊的任务。
- judge 无法访问必要证据的任务。

### 核心原则

LLM-as-Judge 是一个有误差的测量仪器。

它不是 ground truth。

它必须：

- 校准。
- 版本化。
- 盲测。
- 监控漂移。
- 由人工抽查。

## 十一、Judge 校准

### 校准集

校准集应包含：

- 清晰通过样本。
- 清晰失败样本。
- 边界样本。
- 高风险样本。
- 长短输出。
- 不同文风。
- 位置互换对。
- 人类专家已仲裁答案。

### 校准指标

- 与专家一致率。
- 每个 Rubric 项 precision/recall/F1。
- 混淆矩阵。
- 成对偏好一致率。
- 位置交换一致率。
- 重复调用一致率。

若 judge 用来筛选失败，关注其失败类 recall。

若 judge 用来自动通过，关注其通过类 precision。

### 校准流程

1. 人类先独立建立标签。
2. 冻结校准集。
3. 运行 judge。
4. 分析分歧。
5. 修改 judge Rubric，而非修改人类答案迎合 judge。
6. 在独立验证集复测。
7. 设定人工复核区间。

## 十二、盲测与偏差控制

### 盲测

Judge 不应看到：

- 系统名称。
- 模型供应商。
- A/B 版本标签。
- 团队偏好的候选。
- 历史总分。
- 人类评语。

### 位置偏差

成对评测中，judge 可能偏好第一或第二答案。

控制方法：

1. 随机答案顺序。
2. 交换顺序再评一次。
3. 顺序交换后结论不一致则标记不确定。
4. 报告 position consistency。

### 长度偏差

Judge 可能偏好更长、看似详细的答案。

控制方法：

- Rubric 明确只评目标维度。
- 长度单独作为指标。
- 加入冗长但错误的校准反例。
- 检查分数与长度相关性。

### 自偏好与同源偏差

Judge 可能偏好与自己风格或模型家族相似的输出。

控制方法：

- 使用不同模型家族交叉检查。
- 与人工专家比较。
- 使用规则评测覆盖确定项。
- 不让同一模型独占生成、优化和裁判。

## 十三、Judge 提示词模板

```text
你是评测员，只按给定 Rubric 判断。
不要补充 Rubric，不评未指定维度。

你会收到：
&lt;input&gt;原始任务输入&lt;/input&gt;
&lt;sources&gt;允许使用的来源&lt;/sources&gt;
&lt;answer&gt;待评答案&lt;/answer&gt;
&lt;rubric&gt;原子评分项&lt;/rubric&gt;

逐项输出：
- criterion_id
- score
- evidence：引用答案和来源中的最短必要片段
- confidence：high/medium/low

若证据不足以判断，返回 not_applicable 或 needs_human，
不得猜测。

只输出规定 JSON。
```

Judge 的 `confidence` 仍不是校准概率。

## 十四、成对比较与单点评分

### 单点评分

优点：

- 可对照固定阈值。
- 能独立评价单个输出。

缺点：

- 标尺容易漂移。
- 3 分和 4 分边界模糊。

### 成对比较

优点：

- 相对判断通常更容易。
- 适合 A/B 候选选择。

缺点：

- 有位置偏差。
- 不说明绝对是否可上线。
- 候选集合变化会影响排序。

实践中可组合：

- 硬门槛采用规则或单点评分。
- 软质量采用成对比较。
- 最终高风险样本人工审查。

## 十五、随机输出与重复采样

### 采样设计

每个样本运行 k 次时，应保存：

- 样本 ID。
- repetition ID。
- 所有版本信息。
- 原始输出。
- 规则分数。
- judge 分数。
- 成本与延迟。

### 不同稳定性定义

- `mean pass rate`：所有运行平均通过率。
- `sample majority pass`：每样本多数运行通过。
- `all_pass@k`：每样本全部运行通过。
- `any_pass@k`：每样本至少一次通过。
- `semantic agreement`：主结论一致比例。

选择必须匹配线上行为。

线上只调用一次，就不能用 `any_pass@10` 宣传质量。

## 十六、置信区间与 Bootstrap

### Wilson 区间

```python
from math import sqrt


def wilson(successes, total, z=1.96):
    p = successes / total
    d = 1 + z * z / total
    center = (p + z * z / (2 * total)) / d
    margin = z * sqrt((p * (1 - p) + z * z / (4 * total)) / total) / d
    return center - margin, center + margin
```

### 配对 Bootstrap

```python
import random
from statistics import mean


def paired_bootstrap(a, b, rounds=5000, seed=7):
    if len(a) != len(b):
        raise ValueError("paired arrays must have equal length")
    rng = random.Random(seed)
    n = len(a)
    diffs = []
    for _ in range(rounds):
        indices = [rng.randrange(n) for _ in range(n)]
        diffs.append(mean(b[i] - a[i] for i in indices))
    diffs.sort()
    return diffs[int(rounds * 0.025)], diffs[int(rounds * 0.975)]
```

按样本聚合后 bootstrap，避免把同一样本多次采样误当独立样本。

## 十七、评测运行器骨架

```python
import json
import time
from pathlib import Path


def evaluate_case(case, call_model, judge):
    started = time.perf_counter()
    raw = call_model(case["input"])
    latency = time.perf_counter() - started

    try:
        parsed = json.loads(raw)
        json_valid = True
    except json.JSONDecodeError:
        parsed = None
        json_valid = False

    scores = judge(case, raw) if json_valid else {}
    return {
        "id": case["id"],
        "raw": raw,
        "json_valid": json_valid,
        "scores": scores,
        "latency_seconds": latency,
    }


def append_jsonl(path, row):
    with Path(path).open("a", encoding="utf-8") as file:
        file.write(json.dumps(row, ensure_ascii=False) + "\n")
```

Judge 调用失败应记为评测基础设施失败，不能自动算候选失败。

## 十八、评测设计文档模板

```markdown
# 评测设计

## 任务与风险
- 任务：
- 决策用途：
- 高风险错误：

## 数据
- 来源与时间范围：
- 授权与脱敏：
- 分层结构：
- 切分与去重：
- 隐藏集管理：

## 指标
- 主指标：
- 护栏指标：
- 切片指标：
- 成本与延迟：
- 稳定性：

## Rubric
- 原子项：
- 硬门槛：
- 评分锚点：
- 版本：

## Judge
- model/version/config：
- 校准集：
- 人类一致率：
- 位置偏差测试：
- 人工复核条件：

## 统计
- 采样次数：
- 置信区间：
- 配对方法：
- 最小实际效应：
```

## 十九、评测报告表

| 维度 | Baseline | Candidate | 差值 | 区间 | 结论 |
|---|---:|---:|---:|---:|---|
| Accuracy | | | | | |
| Macro F1 | | | | | |
| Critical recall | | | | | |
| JSON valid rate | | | | | |
| Groundedness | | | | | |
| Task success | | | | | |
| Mean cost | | | | | |
| p95 latency | | | | | |
| all_pass@5 | | | | | |

### 必须附带的切片

- 标签。
- 严重度。
- 输入来源。
- 语言。
- 长度桶。
- 正常/边界/困难/对抗。
- 新旧数据时间段。
- 工具成功/失败。
- 检索命中/未命中。

## 二十、常见误区

### 误区 1：Judge 就是真值

Judge 会犯错、漂移并受提示影响。

### 误区 2：一个 1-10 分解决全部问题

复合分数无法定位错误。

### 误区 3：只报告平均分

高风险切片可能完全失败。

### 误区 4：只运行一次

随机输出的稳定性无法观察。

### 误区 5：A 永远放左边

位置偏差会污染结论。

### 误区 6：用开发集当测试集

长期迭代后分数会过拟合。

### 误区 7：把合法 JSON 当正确答案

结构正确不代表语义正确。

### 误区 8：忽略人类分歧

人类低一致可能说明 Rubric 或任务本身不清楚。

### 误区 9：Judge 版本不固定

模型升级会改变测量标尺。

### 误区 10：分数提高即有业务价值

变化可能小于最小实际效应，或以成本大增换来。

## 二十一、检查表

### 数据

- [ ] 有代表性集。
- [ ] 有挑战集。
- [ ] 有隐藏审计集。
- [ ] 按会话或文档分组切分。
- [ ] 检查近重复泄漏。
- [ ] 标签含理由和证据。
- [ ] 关键样本经专家仲裁。

### 指标

- [ ] 主指标对应业务目标。
- [ ] precision/recall 取舍明确。
- [ ] 报告 macro 和逐类指标。
- [ ] JSON 与 schema 分开测。
- [ ] groundedness 按 claim 测。
- [ ] task success 有明确事件。
- [ ] cost/latency 是护栏。

### Rubric

- [ ] 每项只判断一件事。
- [ ] 每档有清楚锚点。
- [ ] 硬门槛独立定义。
- [ ] 提供边界正反例。
- [ ] Rubric 有版本。

### Judge

- [ ] Judge 在专家集上校准。
- [ ] 测量 judge precision/recall。
- [ ] 候选身份被隐藏。
- [ ] 答案顺序随机且交换复评。
- [ ] 长度偏差被检查。
- [ ] 同源偏差被检查。
- [ ] 不确定样本进入人工复核。
- [ ] Judge 不被视为真值。

### 统计

- [ ] 随机输出多次采样。
- [ ] 采样口径匹配线上调用。
- [ ] 比例指标有置信区间。
- [ ] A/B 使用配对比较。
- [ ] 重复采样按样本聚合。
- [ ] 报告实际效应而非只看显著性。

## 二十二、练习

### 练习 1：拆 Rubric

把“答案准确、完整、简洁”拆成原子项。

<details>
<summary>参考答案</summary>

- 所有事实主张与给定来源一致。
- 覆盖问题要求的三个必答点。
- 不包含与问题无关的段落。
- 字数不超过规定上限。

准确、完整、相关和长度分别计分。

</details>

### 练习 2：指标选择

欺诈筛查漏报损失很高，应优先看什么？

<details>
<summary>参考答案</summary>

优先看欺诈类 recall，同时设置 precision、人工复核量和成本护栏，避免通过全量报警获得虚高 recall。

</details>

### 练习 3：位置偏差

Judge 在 A 左 B 右时选 A，交换后选 B，怎样处理？

<details>
<summary>参考答案</summary>

标记为位置不一致或平局，不能算 A 或 B 获胜。

进入人工复核，并把该比例作为 judge 稳定性指标。

</details>

### 练习 4：JSON 指标

JSON valid rate 为 100%，能否上线自动执行？

<details>
<summary>参考答案</summary>

不能。

还需 schema、字段语义、权限、task success 和安全护栏评测。

</details>

### 练习 5：重复采样

线上每请求只调用一次，离线报告 any_pass@10 是否合适？

<details>
<summary>参考答案</summary>

不合适作为主指标。

它衡量十次中至少成功一次，会显著高估单次体验。

应报告单次通过率和稳定性。

</details>

## 二十三、本章小结

可靠评测由五部分组成：

- 分层且防泄漏的数据。
- 与业务风险对应的指标。
- 原子化 Rubric。
- 经校准、有偏差控制的 judge。
- 人工复核与统计不确定性。

Judge 是测量工具，不是真值。

离线分数是发布证据，不是发布许可。

下一章将把评测嵌入 A/B、回归和版本管理：[A-B测试回归测试与版本管理](/kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/)。

## 参考资料

- Google Cloud，Generative AI evaluation：<https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview>
- OpenAI，Evals 指南：<https://platform.openai.com/docs/guides/evals>
- Anthropic，Develop tests：<https://docs.anthropic.com/en/docs/test-and-evaluate/develop-tests>
- The Prompt Report：<https://arxiv.org/abs/2406.06608>
- NIST AI RMF：<https://www.nist.gov/itl/ai-risk-management-framework>

## 前后链接

- 上一章：[提示词诊断错误分类与最小修改](/kb/ai/提示词工程/提示词优化/02-提示词诊断错误分类与最小修改/)
- 下一章：[A-B测试回归测试与版本管理](/kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/)
