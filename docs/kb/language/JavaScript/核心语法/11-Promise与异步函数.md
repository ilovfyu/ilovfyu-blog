---
title: "Promise 与异步函数"
permalink: /kb/language/JavaScript/核心语法/11-Promise与异步函数/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "函数", link: /kb/language/JavaScript/核心语法/10-函数/ }
next: { text: "BOM", link: /kb/language/JavaScript/核心语法/12-BOM/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: 11 Promise 与异步函数
tags:
  - javascript
  - js-core
---

# Promise 与异步函数

## 学习目标

- 理解事件循环、任务与微任务对异步代码顺序的影响。
- 掌握 Promise 状态、链式调用、组合方法与错误传播。
- 熟练使用 `async`/`await` 编排并发任务。
- 能处理取消、超时、竞态、未捕获拒绝等工程问题。

## 1. 从回调到 Promise

异步操作不会阻塞后续同步代码。传统回调可以表达异步结果，但多步骤流程容易出现嵌套、错误处理分散和控制反转。Promise 表示一个未来才确定的结果。

Promise 只有三种状态：待定（pending）、兑现（fulfilled）和拒绝（rejected）。从待定转为兑现或拒绝后状态不可再次改变。

```js
function delay(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

delay(100, "完成")
  .then((value) => console.log(value))
  .catch((error) => console.error(error));
```

Promise 构造器的执行器会立即同步执行，异步的是 `.then()`、`.catch()`、`.finally()` 注册的反应任务。

## 2. 事件循环与微任务

同步代码先运行。当前调用栈清空后，运行时会清空微任务队列，然后浏览器才可能渲染并处理下一个任务。Promise 反应和 `queueMicrotask()` 使用微任务；`setTimeout()` 回调属于后续任务。

```js
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve().then(() => console.log("C"));
queueMicrotask(() => console.log("D"));

console.log("E");
// A E C D B
```

不断递归添加微任务可能让计时器和渲染长期得不到执行。大量工作应分片到任务，或使用合适的调度 API。

## 3. Promise 链与值穿透

`.then()` 总是返回一个新 Promise。处理器返回普通值时，下一个 Promise 以该值兑现；返回 Promise 或 thenable 时会吸收其最终状态；抛出异常时则以该异常拒绝。

```js
const result = Promise.resolve(2)
  .then((value) => value * 3)
  .then((value) => delay(50, value + 1))
  .then((value) => {
    if (value !== 7) throw new Error("结果异常");
    return { value };
  });

result.then(console.log).catch(console.error);
```

忘记 `return` 是常见错误：内部异步任务不会被链等待，错误也可能脱离当前链。

```js
function loadCorrectly() {
  return fetch("https://example.com")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
}
```

## 4. 错误传播与 finally

拒绝会沿链向后传播，直到遇到拒绝处理器。`.catch(handler)` 等价于 `.then(undefined, handler)`。`.finally()` 用于无论成功失败都要执行的清理，通常不改变原结果。

```js
let opened = false;

Promise.resolve()
  .then(() => {
    opened = true;
    throw new Error("处理失败");
  })
  .catch((error) => {
    console.error(error.message);
    return "已恢复";
  })
  .finally(() => {
    opened = false;
  })
  .then((value) => console.log(value, opened));
```

如果 `catch` 不再抛出或返回被拒绝的 Promise，链就恢复为兑现状态。不要捕获错误后静默忽略；要恢复、补充上下文后重抛，或交给统一错误边界。

## 5. Promise 组合方法

### Promise.all

等待全部兑现；任一拒绝便立即拒绝。适合结果缺一不可的并发任务，结果顺序与输入顺序一致。

```js
const [user, permissions] = await Promise.all([
  delay(80, { id: 1, name: "Ada" }),
  delay(30, ["read", "write"]),
]);
console.log(user, permissions);
```

### Promise.allSettled

等待全部结束并返回每项状态，适合批量操作、部分失败仍需展示完整报告的场景。

```js
const report = await Promise.allSettled([
  Promise.resolve("ok"),
  Promise.reject(new Error("failed")),
]);

for (const item of report) {
  console.log(item.status, item.status === "fulfilled" ? item.value : item.reason.message);
}
```

### Promise.race 与 Promise.any

`race` 采用第一个结束的结果，无论兑现还是拒绝；`any` 采用第一个兑现结果，全部拒绝时抛出 `AggregateError`。

```js
const fastest = await Promise.any([
  Promise.reject(new Error("节点不可用")),
  delay(40, "镜像 B"),
  delay(80, "镜像 C"),
]);
console.log(fastest);
```

组合方法不会自动取消仍在运行的底层操作。

## 6. async 与 await

`async` 函数总是返回 Promise。`return value` 产生兑现结果，抛出异常产生拒绝结果。`await` 会暂停当前异步函数，并在 Promise 结束后通过微任务继续执行，但不会阻塞线程。

```js
async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  try {
    const data = await fetchJson("https://jsonplaceholder.typicode.com/todos/1");
    console.log(data.title);
  } catch (error) {
    console.error(error);
  }
}

main();
```

顶层 `await` 只可直接用于 ES 模块。它会延迟依赖模块的执行，库代码应避免无必要的顶层网络请求。

## 7. 串行、并行与受限并发

循环中逐次 `await` 会串行执行。如果任务彼此独立，应先启动再统一等待。

```js
const ids = [1, 2, 3];

// 并发启动
const records = await Promise.all(
  ids.map(async (id) => {
    await delay(20);
    return { id };
  }),
);
console.log(records);
```

`forEach` 不会等待异步回调。需要串行时用 `for...of`，需要并行时用 `map` 加 `Promise.all`。

并发任务数量很大时应限流，避免耗尽连接、文件句柄或服务端配额：

```js
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

console.log(await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
  await delay(20);
  return n * n;
}));
```

## 8. 取消与超时

Promise 本身没有通用取消状态。支持取消的 Web API 通常接受 `AbortSignal`，例如 `fetch()`。

```js
async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

现代环境也提供 `AbortSignal.timeout(ms)` 和 `AbortSignal.any(signals)`，使用前应确认目标运行时兼容性。超时竞争若只用 `Promise.race`，底层请求仍可能继续运行，因此应同时发出取消信号。

## 9. 异步迭代

当数据分批到达时，异步迭代器比一次性 Promise 更自然。`for await...of` 会等待每次迭代结果。

```js
async function* countdown(from) {
  for (let value = from; value > 0; value -= 1) {
    await delay(20);
    yield value;
  }
}

for await (const value of countdown(3)) {
  console.log(value);
}
```

## 常见陷阱与最佳实践

1. 始终返回或 `await` 内部 Promise，避免产生无法追踪的悬空任务。
2. `fetch()` 遇到 404、500 默认仍会兑现，要自行检查 `response.ok`。
3. 独立任务使用 `Promise.all` 并发；有先后依赖的任务才逐步 `await`。
4. 不要在 `new Promise()` 中包装已有 Promise API，避免无意义的 Promise 构造器反模式。
5. 在应用边界监听未处理拒绝用于监控，但不要把它当作正常错误恢复机制。
6. 取消要贯穿调用链传递 `AbortSignal`，并区分用户取消与真正故障。
7. 异步函数中 `try...catch` 的范围不宜过大，否则容易把编程错误误当作可恢复网络错误。

## 章节小结

Promise 统一表示异步结果，并通过微任务、链式返回和组合方法提供可靠的控制流。`async`/`await` 改善了可读性，但并未改变 Promise 的状态与错误传播规则。工程实践中还必须明确串并行关系、并发上限、取消机制和错误边界。

## 章节导航

- 上一章：[-函数](/kb/language/JavaScript/核心语法/10-函数/)
- 下一章：[-BOM](/kb/language/JavaScript/核心语法/12-BOM/)
