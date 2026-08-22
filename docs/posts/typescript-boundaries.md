---
title: TypeScript 项目中真正值得设计的类型边界
createTime: 2026/06/28 10:00:00
permalink: /posts/typescript-boundaries/
tags:
  - TypeScript
  - Architecture
  - Engineering
---

# TypeScript 项目中真正值得设计的类型边界

类型系统最有价值的地方，不是把每个变量都写得很复杂，而是明确“不可信数据从哪里进入系统、经过什么验证、之后由谁负责”。TypeScript 只在编译期工作，接口响应、表单输入、URL 参数和本地存储在运行时都可能不符合声明。若在入口处直接写 `as User`，错误只是被隐藏，最终会在更远的组件或业务分支里爆发。

## 先区分四种边界

外部边界面对的是 `unknown`：JSON、第三方 SDK 和浏览器 API 都应先被视为未知。解析边界负责检查字段、归一化格式并拒绝不合法数据。领域边界表达业务真正关心的状态，例如用户是否可操作，而不是复制后端所有字段。模块边界则通过函数参数、返回值和事件契约约束依赖方向。值得设计的是这些跨越边界的类型，函数内部的临时变量通常交给推断即可。

一个实用原则是“只验证一次，内部保持可信”。解析器成功返回领域类型，后续代码就不必在每个组件里重复判断；解析器失败时返回明确错误或抛出可处理的异常，而不是静默填充一个看似合理的默认值。

```ts
type User = {
  id: string
  displayName: string
  status: 'active' | 'disabled'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseUser(input: unknown): User {
  if (!isRecord(input)) throw new Error('用户数据不是对象')

  const { id, name, status } = input
  if (typeof id !== 'string' || typeof name !== 'string') {
    throw new Error('用户字段缺失或类型错误')
  }
  if (status !== 'active' && status !== 'disabled') {
    throw new Error('用户状态无效')
  }

  return { id, displayName: name.trim(), status }
}

async function loadUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${encodeURIComponent(id)}`)
  if (!response.ok) throw new Error(`请求失败: ${response.status}`)
  return parseUser(await response.json())
}
```

这里的 `User` 不是接口文档的机械副本，而是 UI 和业务都需要的最小契约。若接口返回 `name: null`、增加未知状态，错误会在数据入口暴露。`unknown` 强迫调用者完成检查；相比之下，`any` 会让不安全值继续穿透整个调用链。

## 用状态建模替代布尔组合

异步模块常见的问题是 `loading`、`error`、`data` 三个字段可以任意组合，类型却没有阻止“加载中同时有旧错误”这类歧义。可辨识联合能把状态写成有限集合：

```ts
type UserState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; user: User }
  | { kind: 'failed'; message: string }

function renderState(state: UserState): string {
  switch (state.kind) {
    case 'idle': return '尚未加载'
    case 'loading': return '加载中'
    case 'ready': return state.user.displayName
    case 'failed': return state.message
  }
}
```

新增状态时，`switch` 会提示所有需要更新的消费者。这个边界比给字段添加更多可选属性更稳定，也让 Vue 组件的模板分支与业务状态一一对应。对外暴露的函数还应限制返回值，而不是把 ORM 实体、数据库字段或整个 HTTP 响应对象直接传给页面。

## 设计边界的实践清单

- 为 API、表单、路由和存储等外部输入使用 `unknown`，在入口集中解析。
- 区分 DTO、领域对象和视图模型，避免一个类型贯穿所有层。
- 用联合类型表示互斥状态，减少互相矛盾的布尔字段。
- 只在确有运行时验证后使用类型断言，禁止用 `as` 掩盖接口不确定性。
- 让模块通过小而明确的函数契约通信，避免导出可随意修改的巨大对象。
- 为解析失败、版本变化和缺失字段编写测试，类型检查不能替代运行时测试。
- 保持类型命名描述责任，例如 `UserDto` 与 `User` 不要混用。

## 总结

好的类型设计是在不确定性与确定性之间建立一道可检查的门。系统边缘负责验证和归一化，核心领域保持简洁可信，模块之间用有限状态和小契约沟通。这样做减少的不是类型声明数量，而是错误传播的距离，让重构、测试和协作都有清晰的落点。
