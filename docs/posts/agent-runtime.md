---
title: AI Agent 工程化：状态、工具调用与可观测性
createTime: 2026/07/24 10:00:00
permalink: /posts/agent-runtime/
tags:
  - AI
  - Agent
  - Engineering
---

# AI Agent 工程化：状态、工具调用与可观测性

一个 Agent 不是“让模型多想几次”的聊天接口，而是一个在不确定输出上运行的控制循环。模型提出下一步，运行时校验并执行，结果再回到上下文。没有明确的状态边界、工具契约和观测记录时，问题会表现为重复调用、任务中断后丢失进度，或无法解释一次错误操作。

## 先建立运行时模型

可以把一次任务建模为 `Run`，把每次模型决策建模为 `Step`。持久状态包括任务目标、已完成动作、工具结果摘要、审批记录和版本信息；临时上下文包括本轮消息、候选工具和模型输出。前者应能从存储恢复，后者可以重新构造。不要让模型直接修改持久状态，它只能提交一个待验证的动作。

最实用的状态机通常包含 `queued`、`running`、`waiting_approval`、`succeeded`、`failed` 和 `cancelled`。每次状态迁移都写入事件，并带上 `runId`、`stepId`、操作者和时间。恢复任务时从最后一个已确认事件继续，而不是简单重放所有副作用操作。

## 工具是有边界的 API

工具描述应像公共 API 一样精确：输入 JSON Schema、输出结构、权限要求、超时、是否幂等，以及失败类型。运行时必须重新校验模型给出的参数，并在服务端注入用户身份、租户和授权信息，不能信任模型传来的这些字段。写操作、外部发送和不可逆操作应设置审批或确认点。

重试也要区分错误。网络超时可以在幂等键不变的前提下有限重试；参数错误应返回结构化错误让模型修正；权限拒绝不应反复调用。每个工具都需要超时和取消信号，单个 Run 还要有最大步数、总耗时和预算上限。

```ts
type State = "running" | "waiting_approval" | "succeeded" | "failed";
type Action = { tool: string; args: Record<string, unknown>; idempotencyKey: string };

async function runAgent(runId: string, signal: AbortSignal) {
  let state: State = "running";
  for (let step = 0; step < 12 && state === "running"; step++) {
    const decision = await model.decide(await buildContext(runId));
    if (decision.kind === "final") {
      await appendEvent(runId, { type: "completed", output: decision.text });
      return decision.text;
    }

    const action: Action = validateAction(decision.action);
    if (requiresApproval(action)) {
      await appendEvent(runId, { type: "approval_required", action });
      state = "waiting_approval";
      break;
    }
    const result = await executeTool(action, { signal });
    await appendEvent(runId, { type: "tool_result", action, result });
  }
  if (state === "running") await appendEvent(runId, { type: "step_limit" });
  return null;
}
```

## 让每次运行可解释

观测至少分三层：Run 记录目标、最终状态和总成本；Step 记录模型决策、提示词版本和状态迁移；Tool Span 记录工具名、参数摘要、结果摘要、耗时和错误类别。敏感参数要脱敏，原始上下文应按数据保留策略存储。日志之外保留结构化事件，才能支持恢复、审计和离线分析。

## 实践清单

- 状态是否能在进程重启后恢复，并区分已确认副作用？
- 每个工具是否有 schema、权限、超时、取消和幂等策略？
- 是否限制步数、循环、并发、总 token 和外部调用预算？
- 高风险动作是否需要用户确认，且确认内容与实际参数一致？
- 是否能按 `runId` 还原“模型为何调用工具、工具返回了什么”？

## 总结

Agent 工程化的重点不是堆更多工具，而是把不确定的模型决策包在确定的运行时里：状态可恢复，动作可校验，副作用可控制，过程可观测。先把状态机和工具契约做扎实，再讨论规划策略和多 Agent 协作，系统才有可靠的演进基础。
