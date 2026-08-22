---
title: "Token 成本、延迟、稳定性与模型选择"
permalink: /kb/ai/提示词工程/提示词优化/05-Token成本延迟稳定性与模型选择/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "A/B 测试、回归测试与版本管理", link: /kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/ }
next: { text: "自动提示词优化与高级方法", link: /kb/ai/提示词工程/提示词优化/06-自动提示词优化与高级方法/ }
knowledgeNote:
  series: "AI"
  group: "提示词优化"
---
> 最好的模型不是单项分数最高的模型，而是在质量门槛内满足预算、延迟、稳定性与治理要求的系统组件。

## 章节导航

- 上一章：[A-B测试回归测试与版本管理](/kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/)
- 下一章：[自动提示词优化与高级方法](/kb/ai/提示词工程/提示词优化/06-自动提示词优化与高级方法/)
- 任务定义：[从模糊需求到可测试提示词](/kb/ai/提示词工程/提示词优化/01-从模糊需求到可测试提示词/)

## 学习目标

- 分解端到端 Token 和货币成本。
- 测量首 token 与完整响应延迟。
- 用重复采样评估输出稳定性。
- 在质量约束下比较模型。
- 设计路由、降级、缓存和预算控制。
- 判断应优化 Prompt、RAG、工具、微调还是换模型。
- 避免只按榜单或单价选型。

## 一、经济性在闭环中的位置

闭环中的每一步都受预算约束：

1. 定义任务与约束时确定成本和 SLA。
2. Baseline 记录质量、成本、延迟。
3. 测试集覆盖长输入和工具失败。
4. 错误分类包含成本、延迟和稳定性。
5. 单变量修改记录 token 差异。
6. 离线评测联合报告质量与经济性。
7. 人工复核高成本异常请求。
8. 小流量验证真实并发和缓存。
9. 监控越界并回滚。

## 二、Token 成本的组成

一次请求可能包含：

- 固定 system prompt。
- 动态 user input。
- Few-shot 示例。
- 检索片段。
- 工具描述和 schema。
- 历史会话。
- 模型隐藏或显式推理预算。
- 输出 token。
- 重试调用。
- Judge 调用。
- 后续验证调用。

### 简化成本公式

```text
request_cost =
  uncached_input_tokens × input_price
  + cached_input_tokens × cached_price
  + output_tokens × output_price
  + tool_cost
  + retry_cost
  + evaluation_amortization
```

价格口径随供应商变化。

必须用当前正式价格页核实，不能把文档示例当报价。

### 每成功任务成本

只看每请求成本会奖励大量失败的便宜请求。

```text
cost_per_success = total_cost / successful_tasks
```

它通常比 `cost_per_request` 更接近业务价值。

## 三、Token 预算设计

### 预算分配表

| 区域 | 预算 | 优先级 | 超限策略 |
|---|---:|---|---|
| 固定指令 | 800 | 高 | 压缩冗余 |
| 用户输入 | 3000 | 高 | 分段或拒绝 |
| 检索证据 | 5000 | 高 | 重排与去重 |
| 工具 schema | 1200 | 中 | 动态暴露工具 |
| 会话历史 | 2000 | 中 | 摘要并保留关键状态 |
| 输出 | 800 | 高 | 结构化限制 |

具体 token 数应通过所用模型 tokenizer 测量。

字符数只能做粗略代理。

### 截断策略

不要简单从末尾截断所有内容。

需要明确：

- 哪些系统约束不可截断。
- 哪些证据按相关性保留。
- 用户问题是否始终保留。
- 会话中的授权和确认是否保留。
- 工具结果是否允许摘要。
- 截断后是否应拒绝任务。

### 上下文越长不一定越好

过长上下文可能：

- 增加成本。
- 增加 prefill 延迟。
- 淹没关键证据。
- 引入冲突来源。
- 放大提示注入面。
- 降低引用精度。

## 四、成本测量标准库示例

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Price:
    input_per_million: float
    output_per_million: float
    cached_input_per_million: float = 0.0


def estimate_cost(input_tokens, output_tokens, cached_tokens, price):
    uncached = max(input_tokens - cached_tokens, 0)
    return (
        uncached * price.input_per_million / 1_000_000
        + cached_tokens * price.cached_input_per_million / 1_000_000
        + output_tokens * price.output_per_million / 1_000_000
    )
```

价格必须作为带日期和来源的配置，不要硬编码为永恒常量。

## 五、延迟分解

### 端到端延迟

```text
T_total =
  T_queue
  + T_retrieval
  + T_rerank
  + T_prompt_build
  + T_model_first_token
  + T_generation
  + T_tools
  + T_parse
  + T_network
```

### 两个关键用户指标

- TTFT：Time To First Token，首 token 延迟。
- TTL：Time To Last Token，完整响应延迟。

流式输出改善感知速度，但不缩短任务真正完成时间。

工具型任务应以可用最终结果为准。

### 百分位

至少报告：

- p50：典型体验。
- p95：大多数用户的尾延迟。
- p99：极端尾部风险。

平均值会掩盖长尾。

## 六、延迟统计代码

```python
from statistics import mean


def percentile(values, q):
    if not values:
        raise ValueError("values must not be empty")
    ordered = sorted(values)
    index = (len(ordered) - 1) * q
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    weight = index - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def latency_report(values):
    return {
        "mean": mean(values),
        "p50": percentile(values, 0.50),
        "p95": percentile(values, 0.95),
        "p99": percentile(values, 0.99),
    }
```

生产环境应同时按模型、区域、请求长度和工具路径切片。

## 七、稳定性的多个维度

### 语法稳定性

- JSON valid rate。
- Schema valid rate。
- 必填字段存在率。

### 语义稳定性

- 同一样本多次分类一致率。
- 核心结论一致率。
- 引用集合一致率。
- 工具参数一致率。

### 运行稳定性

- 超时率。
- 5xx 率。
- 限流率。
- 重试率。
- 工具故障率。

### 版本稳定性

- 同版本跨日期差异。
- 模型升级前后差异。
- 检索快照更新差异。

## 八、重复采样设计

单次结果不足以评价随机系统。

### 建议

- 普通离线比较：每样本 3 次。
- 发布候选关键集：5-10 次。
- 高风险工具参数：更多采样或确定性规则验证。

### 指标

```text
agreement = 众数输出次数 / 总次数
all_pass@k = k 次全部通过的样本比例
flip_rate = 同一样本出现两个及以上关键结论的比例
```

### 置信区间

对通过率报告 Wilson 区间。

对模型差异使用按样本配对 bootstrap。

不要把同一输入的 k 次运行视为完全独立数据。

## 九、模型选择不是单指标排名

### 硬约束先筛选

先排除不满足以下要求的候选：

- 数据驻留。
- 隐私与合规。
- 必需语言或模态。
- 上下文窗口。
- 工具调用能力。
- 结构化输出。
- 最低质量。
- 最大延迟。
- 最大成本。

### 再做 Pareto 比较

一个候选若质量更高、成本更低、延迟更短，则支配另一个候选。

现实中常存在 Pareto 前沿：

- 高质量、高成本。
- 中质量、低延迟。
- 低成本、高吞吐。

应按业务路径选择，而非强行合成一个“万能分”。

### 决策表

| 候选 | Task success | Groundedness | 成本/成功 | p95 | all_pass@5 | 结论 |
|---|---:|---:|---:|---:|---:|---|
| A | 91% | 97% | 0.012 | 2.8s | 85% | 高质量路径 |
| B | 89% | 96% | 0.006 | 1.4s | 87% | 默认路径 |
| C | 82% | 92% | 0.003 | 0.9s | 75% | 不过质量门槛 |

## 十、加权评分的使用边界

可定义：

```text
score = wq × quality - wc × normalized_cost - wl × normalized_latency
```

但必须：

- 先应用硬门槛。
- 公开权重。
- 做权重敏感性分析。
- 保留原始指标。
- 不用加权分抵消安全失败。

不同归一化方式会改变排名。

## 十一、模型路由

### 静态路由

按已知任务选择模型：

- 简单分类 -> 小模型。
- 复杂推理 -> 强模型。
- 图片输入 -> 多模态模型。
- 私密任务 -> 内部部署模型。

### 动态路由

先估计难度，再选择路径。

风险：

- 路由器本身会误判。
- 增加延迟和成本。
- 难度标签可能漂移。
- 路由决策需可审计。

### 级联

1. 便宜模型先答。
2. 规则检查结构和硬约束。
3. 不确定或高风险时升级强模型。
4. 仍不满足则人工接管。

升级条件应通过标签校准，而不是只相信模型自报置信度。

## 十二、缓存

### 可缓存内容

- 完全相同的只读问答。
- 固定系统前缀。
- 检索结果。
- Embedding。
- 工具的短期只读结果。

### 缓存风险

- 权限跨用户泄漏。
- 旧政策未失效。
- 个性化状态错误复用。
- 非确定工具结果过期。
- 缓存键漏掉版本。

### 缓存键至少包含

- 输入规范化 hash。
- 用户权限域。
- Model 版本。
- Prompt 版本。
- Config。
- Retrieval 快照。
- Tool 版本。
- 过期策略。

## 十三、压缩 Prompt 的工程方法

### 可做

- 删除重复规则。
- 用表格表达标签边界。
- 动态注入相关工具。
- 只保留相关 few-shot。
- 检索去重与重排。
- 把确定性约束移到代码。
- 缩短无信息的礼貌输出。

### 不可盲做

- 删除安全规则。
- 摘要法律原文后丢掉限定条件。
- 截断用户确认状态。
- 合并互相独立的 Rubric。
- 以质量未知的自动摘要替换证据。

### 每次压缩都要回归

Token 下降只是候选收益。

需要确认：

- Task success 不降。
- Groundedness 不降。
- 关键 recall 不降。
- 稳定性不降。
- 延迟确实改善。

## 十四、输出长度控制

输出 token 往往单价更高且直接增加生成延迟。

方法：

- 定义字数或字段上限。
- 只返回消费方需要的字段。
- 避免要求展示冗长推理过程。
- 把解释设为按需字段。
- 对机器接口使用紧凑 schema。

但不要为了省 token 删除：

- 必要证据。
- 风险提示。
- 用户确认信息。
- 可审计工具结果。

## 十五、重试策略

### 重试适合

- 临时 5xx。
- 限流且服务器提供退避信息。
- 网络中断。
- 可安全重复的只读工具。

### 不应盲重试

- 内容策略拒绝。
- 确定性 schema 错误。
- 权限错误。
- 已产生副作用的工具。
- 上下文超长。

### 指数退避标准库示例

```python
import random
import time


def call_with_backoff(call, attempts=4, base=0.5):
    for attempt in range(attempts):
        try:
            return call()
        except TimeoutError:
            if attempt == attempts - 1:
                raise
            delay = base * (2 ** attempt) + random.random() * base
            time.sleep(delay)
```

重试会增加尾延迟和成本，必须单独统计。

## 十六、并发与批处理

### 并发收益

- 降低批量任务总墙钟时间。
- 并行独立检索或 judge。

### 并发风险

- 限流。
- 瞬时成本峰值。
- 结果顺序错乱。
- 工具锁竞争。
- 下游数据库压力。

### 批处理适合

- 离线评测。
- 无即时交互需求。
- 供应商提供更经济的异步路径时。

必须保持样本 ID 与结果可追踪。

## 十七、降级策略

### 可选降级

- 强模型不可用 -> 小模型处理低风险任务。
- RAG 不可用 -> 明确告知证据不足。
- 工具不可用 -> 返回不可执行，不伪造结果。
- 超预算 -> 缩短非关键解释。
- 超时 -> 人工接管。

### 错误降级

- 用旧缓存回答高时效问题。
- 工具失败后编造订单。
- 无证据时切换闭卷猜测。
- 安全模型不可用时绕过检查。

降级目标是更安全，不一定是“仍给答案”。

## 十八、方案边界决策树

### 提示优化

选择它，当：

- 规则不清。
- 输出格式漂移。
- 示例能表达边界。
- 当前模型已具备能力。

### RAG

选择它，当：

- 缺少更新频繁的知识。
- 需要私有事实和引用。
- 上下文可检索。

### 工具

选择它，当：

- 需要精确计算。
- 需要实时状态。
- 需要执行动作。

### 微调

选择它，当：

- 有足够高质量训练数据。
- 行为模式稳定且大量重复。
- 长 few-shot 成本高。

### 换模型

选择它，当：

- 能力、语言或模态上限不足。
- 当前部署边界不满足。
- 质量/成本/延迟 Pareto 明显落后。

这些手段可以组合，但每项都要独立验证贡献。

## 十九、模型选型实验模板

```markdown
# 模型选型设计

## 任务
- 流量与峰值：
- 风险等级：
- 自动执行范围：

## 硬约束
- 数据驻留：
- 最低 task success：
- 最低 groundedness：
- 最大 p95：
- 最大成本/成功：

## 候选
- 模型版本：
- Prompt 适配策略：统一 / 分别优化
- 工具与 RAG：

## 实验
- 数据集：
- 重复采样：
- 置信区间：
- 并发负载：

## 决策
- Pareto 前沿：
- 默认模型：
- 升级模型：
- 降级路径：
- 回滚版本：
```

## 二十、Prompt 是否应为每个模型适配

两个公平性问题：

### 固定同一 Prompt

测量“替换模型”的直接效果。

优点是变量更少。

缺点是可能低估需要不同指令风格的模型。

### 各自优化 Prompt

测量每个模型可达到的系统最优效果。

优点更贴近部署。

缺点是优化预算和方法必须公平。

建议分两阶段：

1. 同 Prompt 初筛。
2. 对入围模型给相同优化预算后复赛。

## 二十一、线上预算监控

### 指标

- 每分钟 token。
- 每用户成本。
- 每功能成本。
- 每成功任务成本。
- 缓存命中率。
- 重试成本占比。
- Judge/评测摊销成本。
- 预算消耗速度。

### 预算保护

- 单请求最大 token。
- 单会话最大调用数。
- 单用户速率限制。
- 日预算和月预算告警。
- 异常输出长度熔断。
- 工具循环上限。

不要在高风险任务中静默截断到错误答案。

预算不足时应安全失败或人工接管。

## 二十二、常见误区

### 误区 1：只看每百万 Token 价格

忽略输出长度、重试、成功率和工具成本。

### 误区 2：只看平均延迟

尾延迟决定大量真实投诉。

### 误区 3：上下文窗口越大越好

容量不是免费质量。

### 误区 4：Temperature 0 就稳定

仍需重复采样和版本监控。

### 误区 5：小模型一定更便宜

若失败、重试和升级过多，每成功任务成本可能更高。

### 误区 6：流式输出等于任务更快完成

工具结果和完整 JSON 仍需等待结束。

### 误区 7：缓存键只用用户问题

会造成版本、权限和知识污染。

### 误区 8：压缩 Prompt 不做回归

删除少量限定词也可能改变风险边界。

### 误区 9：用模型自报置信度路由

自报值未经校准。

### 误区 10：榜单第一就是生产最优

公开榜单不代表你的数据、工具和约束。

## 二十三、检查表

### 成本

- [ ] 统计输入、输出和缓存 token。
- [ ] 统计重试和工具成本。
- [ ] 报告每请求与每成功任务成本。
- [ ] 价格配置带日期与来源。
- [ ] 长输入切片被覆盖。
- [ ] 有请求和会话预算上限。

### 延迟

- [ ] 测量 TTFT 与 TTL。
- [ ] 报告 p50/p95/p99。
- [ ] 分解检索、模型和工具时间。
- [ ] 在真实并发下压测。
- [ ] 重试延迟单独统计。
- [ ] 小流量验证尾延迟。

### 稳定性

- [ ] 每个关键样本多次采样。
- [ ] 报告 all_pass@k 和 flip rate。
- [ ] 比例指标有置信区间。
- [ ] 结构与语义稳定性分开。
- [ ] 跨日期和升级前后比较。

### 选型

- [ ] 先应用质量和治理硬门槛。
- [ ] 使用自有分层评测集。
- [ ] 比较 task success 与 groundedness。
- [ ] 比较 cost per success。
- [ ] 检查 Pareto 前沿。
- [ ] 路由器本身已评测。
- [ ] 降级不会伪造事实或动作。
- [ ] 完整版本束可回滚。

## 二十四、练习

### 练习 1：成本口径

模型 A 每请求 0.01 元，成功率 50%；模型 B 每请求 0.015 元，成功率 90%。哪个更经济？

<details>
<summary>参考答案</summary>

A 的粗略每成功成本为 0.02 元，B 约为 0.0167 元。

在其他条件相近时，B 每次更贵但每成功任务更便宜。

</details>

### 练习 2：尾延迟

平均延迟下降，但 p95 从 2 秒升到 5 秒，能否认为体验改善？

<details>
<summary>参考答案</summary>

不能直接认为改善。

长尾用户显著变差，应按请求路径和输入长度定位，并依据 SLA 决策。

</details>

### 练习 3：缓存键

为什么缓存键需要 retrieval snapshot？

<details>
<summary>参考答案</summary>

知识库更新后，同一问题的正确答案可能变化。

缺少快照会继续返回旧知识生成的缓存结果。

</details>

### 练习 4：选择手段

模型无法回答昨天更新的内部政策，应继续改 Prompt 吗？

<details>
<summary>参考答案</summary>

应优先建设或修复 RAG，让最新授权资料进入上下文。

提示词只能规定怎样使用证据，不能创造缺失知识。

</details>

### 练习 5：稳定性

候选平均准确率更高，但同一输入五次有三种标签，是否适合自动执行？

<details>
<summary>参考答案</summary>

风险较高。

应检查 flip rate、关键切片和决策代价，考虑确定性规则、人工确认、换模型或降低采样随机性。

</details>

## 二十五、本章小结

模型选择是约束优化问题：

```text
在质量、安全和治理硬门槛内，
最小化每成功任务成本与尾延迟，
并保证随机输出和系统运行足够稳定。
```

必须联合测量：

- Accuracy / precision / recall / F1。
- JSON valid rate。
- Groundedness。
- Task success。
- Cost。
- Latency。
- Stability。

下一章讨论如何在这些约束下自动搜索提示词：[自动提示词优化与高级方法](/kb/ai/提示词工程/提示词优化/06-自动提示词优化与高级方法/)。

## 参考资料

- Google Cloud，Generative AI evaluation：<https://cloud.google.com/vertex-ai/generative-ai/docs/models/evaluation-overview>
- Google Cloud，Prompt optimizer：<https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/prompt-optimizer>
- OpenAI，Evals 指南：<https://platform.openai.com/docs/guides/evals>
- Anthropic，Prompt engineering：<https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview>
- The Prompt Report：<https://arxiv.org/abs/2406.06608>
- NIST AI RMF：<https://www.nist.gov/itl/ai-risk-management-framework>

## 前后链接

- 上一章：[A-B测试回归测试与版本管理](/kb/ai/提示词工程/提示词优化/04-A-B测试回归测试与版本管理/)
- 下一章：[自动提示词优化与高级方法](/kb/ai/提示词工程/提示词优化/06-自动提示词优化与高级方法/)
