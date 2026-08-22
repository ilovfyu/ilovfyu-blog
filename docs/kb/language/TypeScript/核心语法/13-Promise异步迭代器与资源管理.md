---
title: "Promise、异步迭代器与资源管理"
permalink: /kb/language/TypeScript/核心语法/13-Promise异步迭代器与资源管理/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "声明文件、类型包与库发布", link: /kb/language/TypeScript/核心语法/12-声明文件类型包与库发布/ }
next: { text: "tsconfig 工程实践、测试与 JavaScript 迁移", link: /kb/language/TypeScript/核心语法/14-tsconfig工程实践测试与JS迁移/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
::: abstract 本章目标
掌握 Promise 的精确类型、`async`/`await`、异步迭代协议、取消设计，以及现代 ECMAScript 的显式资源管理。尤其要分清：TypeScript 能检查什么、编译器会转换什么、运行时必须提供什么。
:::

## 1. 三层模型：类型、输出与运行时

学习异步代码最容易犯的错误，是看到编辑器不报错便认为代码一定能运行。

| 层次 | 负责者 | 例子 |
| --- | --- | --- |
| 静态类型检查 | TypeScript | `Promise&lt;User&gt;`、`AsyncIterable&lt;string&gt;`、`Disposable` |
| JavaScript 输出 | `tsc` 或构建工具 | 将部分新语法转换为目标版本可执行的代码 |
| 实际运行能力 | 浏览器、Node.js、Deno、Bun 或 polyfill | `fetch`、`AbortController`、`Symbol.dispose` |

`lib` 只向检查器提供声明，不会安装 API，也不会自动注入 polyfill。例如加入 `"DOM"` 后可以通过 `fetch` 的类型检查，但 Node.js 或旧浏览器是否真的有 `fetch`，仍由运行时决定。

## 2. Promise 的类型模型

### 2.1 `Promise&lt;T&gt;` 表示成功值

```ts
interface User {
  id: string;
  name: string;
}

function loadUser(id: string): Promise&lt;User&gt; {
  return fetch(`/api/users/${id}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // response.json() 的类型通常过宽，真实项目应在边界处校验数据。
    return (await response.json()) as User;
  });
}
```

`T` 只描述 fulfilled 状态的值。标准 `Promise&lt;T&gt;` 没有“拒绝原因”类型参数，因为 JavaScript 可以 `throw` 任意值，链中的其他回调也可能产生新的异常。

```ts
const task: Promise&lt;number&gt; = Promise.reject("network unavailable");
// 类型仍然是 Promise&lt;number&gt;，拒绝原因没有编码进 Promise&lt;number&gt;。
```

若业务必须显式表达可预期失败，可以把结果建模为联合类型，而不是把所有失败都交给 rejection。

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

type LoginError = "INVALID_PASSWORD" | "LOCKED";

async function login(): Promise<Result<User, LoginError>> {
  return { ok: false, error: "LOCKED" };
}
```

### 2.2 Promise 会吸收嵌套 Promise

Promise resolution procedure 会递归采用 thenable 的最终状态，因此 `then` 和 `await` 都会“拍平”嵌套异步值。

```ts
const p = Promise.resolve(Promise.resolve(42));
// Promise&lt;number&gt;，不是 Promise<Promise&lt;number&gt;>

async function answer(): Promise&lt;number&gt; {
  return Promise.resolve(42);
}
```

不要手写 `new Promise(async (resolve, reject) => ...)`。`async` executor 返回的 Promise 不会被 `new Promise` 自动采用，异常流也更难理解。

```ts
// 不推荐
const bad = new Promise&lt;number&gt;(async (resolve) => {
  resolve(await Promise.resolve(42));
});

// 推荐：直接使用 async 函数
const good = async (): Promise&lt;number&gt; => Promise.resolve(42);
```

## 3. `async`、`await` 与 `Awaited`

`async` 函数在运行时总是返回 Promise；显式返回类型应写成 `Promise&lt;T&gt;`，有助于锁定公共 API。

```ts
async function parseCount(text: string): Promise&lt;number&gt; {
  const raw = await Promise.resolve(text);
  return Number.parseInt(raw, 10);
}
```

`await` 会暂停当前 async 函数，而不是阻塞整个线程。它会采用 Promise/thenable，并把异常作为 throw 重新抛入当前函数。

`Awaited&lt;T&gt;` 是 TypeScript 的工具类型，用来模拟 `await` 的类型层展开规则。

```ts
type A = Awaited<Promise&lt;string&gt;>;                  // string
type B = Awaited<Promise<Promise&lt;number&gt;>>;         // number
type C = Awaited&lt;boolean | Promise&lt;Date&gt;>;          // boolean | Date
type D = Awaited&lt;null | Promise&lt;string&gt;>;           // null | string

type AsyncReturn&lt;T extends (...args: never[]) =&gt; unknown> =
  Awaited<ReturnType&lt;T&gt;>;

async function getConfig() {
  return { mode: "production" as const };
}

type Config = AsyncReturn&lt;typeof getConfig&gt;;
```

`Awaited` 只存在于类型系统，编译后被擦除；它既不等待任务，也不改变运行时调度。

### 3.1 串行和并行不能只看语法

```ts
// 串行：第二个请求在第一个结束后才开始
const user = await loadUser("u1");
const team = await loadTeam(user.id);

// 并发启动，再一起等待
const userPromise = loadUser("u1");
const settingsPromise = loadSettings("u1");
const [currentUser, settings] = await Promise.all([
  userPromise,
  settingsPromise,
]);
```

只有任务互不依赖时才适合并发。`await` 的位置决定等待顺序，但任务可能在 Promise 创建时已经开始。

## 4. 错误是 `unknown`

在严格配置中，`useUnknownInCatchVariables` 使 `catch` 变量成为 `unknown`。这是正确模型，因为 JavaScript 允许 `throw "oops"`、`throw null` 或抛出任意对象。

```ts
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return "Unknown error";
  }
}

async function showUser(id: string): Promise&lt;void&gt; {
  try {
    console.log(await loadUser(id));
  } catch (error: unknown) {
    console.error(errorMessage(error));
  }
}
```

常见陷阱：

- `catch (error: Error)` 不安全，而且 catch 注解只允许 `any` 或 `unknown`。
- `Promise&lt;T&gt;` 不保证 rejection 是 `Error`。
- `response.json() as User` 是断言，不是运行时校验；外部数据应由 schema 或类型守卫验证。
- 忘记 `await` 可能让 `try/catch` 捕获不到稍后发生的 rejection。

```ts
async function wrong(): Promise&lt;void&gt; {
  try {
    loadUser("u1"); // 未 return/await，当前 try/catch 不负责其异步失败
  } catch {
    // 通常捕获不到 loadUser 后续的 rejection
  }
}
```

## 5. Promise 组合器

| API | 完成条件 | 失败行为 | 典型用途 |
| --- | --- | --- | --- |
| `Promise.all` | 全部 fulfilled | 任一 rejected 就拒绝 | 全部都必需 |
| `Promise.allSettled` | 全部 settled | 返回每项状态，不整体短路 | 批处理报告 |
| `Promise.race` | 第一项 settled | 第一项可成功也可失败 | 竞争、超时信号 |
| `Promise.any` | 第一项 fulfilled | 全部失败时抛 `AggregateError` | 多镜像择一 |

### 5.1 元组推断

```ts
const result = await Promise.all([
  Promise.resolve("Ada"),
  Promise.resolve(36),
  true,
] as const);
// readonly/tuple 信息使结果按位置推断为 [string, number, boolean]
```

### 5.2 `allSettled` 必须缩窄

```ts
const settled = await Promise.allSettled([
  loadUser("u1"),
  loadUser("u2"),
]);

for (const item of settled) {
  if (item.status === "fulfilled") {
    console.log(item.value.name);
  } else {
    console.error(errorMessage(item.reason));
  }
}
```

`Promise.race([work, timeout])` 不会自动取消输掉竞争的任务。若要释放网络、计时器或流资源，必须把取消信号传给任务。

## 6. `AbortSignal`：协作式取消

取消不是 Promise 的内建状态。`AbortController` 发出信号，任务必须主动监听或把信号转交给支持它的 API。

```ts
async function fetchJson&lt;T&gt;(url: string, signal: AbortSignal): Promise&lt;T&gt; {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

const controller = new AbortController();
const timer = setTimeout(() => controller.abort("timeout"), 5_000);

try {
  const user = await fetchJson&lt;User&gt;("/api/me", controller.signal);
  console.log(user.name);
} finally {
  clearTimeout(timer);
}
```

编写可取消操作时：

- 参数接收 `AbortSignal`，不要在底层函数内部隐藏创建 controller。
- 开始前检查 `signal.throwIfAborted()`，长循环中定期检查。
- 注册 `abort` 监听器时使用 `{ once: true }`，结束后移除监听，避免泄漏。
- 取消是运行时协议；写出 `AbortSignal` 类型不会让计算自动停止。

```ts
function delay(ms: number, signal: AbortSignal): Promise&lt;void&gt; {
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(finish, ms);

    function finish() {
      signal.removeEventListener("abort", abort);
      resolve();
    }

    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }

    signal.addEventListener("abort", abort, { once: true });
  });
}
```

## 7. 异步迭代协议

`AsyncIterable&lt;T&gt;` 表示对象提供 `[Symbol.asyncIterator]()`；TypeScript 7 标准库中的 `AsyncIterator&lt;T&gt;.next()` 返回 `Promise<IteratorResult&lt;T&gt;>`。`for await...of` 每轮等待结果，并在提前退出时尝试调用迭代器的 `return()`。

```ts
async function consume(source: AsyncIterable&lt;string&gt;): Promise&lt;void&gt; {
  for await (const chunk of source) {
    console.log(chunk);
  }
}
```

`for await...of` 也能消费同步 iterable，但每个值都会经过 await 语义；纯同步数据优先使用普通 `for...of`。

### 7.1 异步生成器

异步生成器同时简化了状态机和清理逻辑。

```ts
interface Page&lt;T&gt; {
  items: T[];
  nextCursor?: string;
}

async function* listUsers(signal: AbortSignal): AsyncGenerator<User, void, void> {
  let cursor: string | undefined;

  do {
    signal.throwIfAborted();
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page = await fetchJson<Page&lt;User&gt;>(`/api/users${query}`, signal);

    yield* page.items;
    cursor = page.nextCursor;
  } while (cursor !== undefined);
}

for await (const user of listUsers(controller.signal)) {
  if (user.name === "Ada") break;
}
```

`AsyncGenerator<Yield, Return, Next>` 的三个类型参数分别描述 `yield` 值、生成器最终 `return` 值和外部传回 `next(value)` 的值。大多数消费型生成器使用 `AsyncGenerator<T, void, void>`。

### 7.2 自定义异步 iterable

```ts
const ticks: AsyncIterable&lt;number&gt; = {
  async *[Symbol.asyncIterator]() {
    for (let i = 0; i < 3; i += 1) {
      await new Promise&lt;void&gt;((resolve) => setTimeout(resolve, 100));
      yield i;
    }
  },
};
```

流式处理能提供背压：消费者每次请求下一项，生产者不必一次性把全部结果装入内存。具体网络流是否真正遵循背压，仍取决于宿主 API 的实现。

## 8. `using` 与 `await using`

显式资源管理是现代 ECMAScript 能力。TypeScript 从 5.2 起支持其语法与类型；在支持的目标下，编译器也可生成辅助代码，但资源对象和相关内建能力仍必须由运行时提供。

### 8.1 同步资源：`Disposable`

```ts
class Trace implements Disposable {
  constructor(private readonly name: string) {
    console.log(`start: ${name}`);
  }

  [Symbol.dispose](): void {
    console.log(`end: ${this.name}`);
  }
}

function run(): void {
  using trace = new Trace("compile");
  console.log("working");
} // 离开作用域时自动调用 trace[Symbol.dispose]()
```

`using` 的绑定类似 `const`。资源按后创建先释放（LIFO）；正常结束、`return` 或抛异常都会触发清理。

### 8.2 异步资源：`AsyncDisposable`

```ts
class Connection implements AsyncDisposable {
  async query(sql: string): Promise<unknown[]> {
    return [{ sql }];
  }

  async [Symbol.asyncDispose](): Promise&lt;void&gt; {
    await Promise.resolve();
    console.log("connection closed");
  }
}

async function report(): Promise&lt;void&gt; {
  await using connection = new Connection();
  await connection.query("select 1");
} // 在函数继续完成前等待异步释放
```

`await using` 必须位于允许 `await` 的上下文。它优先使用 `Symbol.asyncDispose`，也可以管理仅实现同步 `Symbol.dispose` 的资源。

### 8.3 释放异常

若业务代码和释放过程都抛错，规范使用 `SuppressedError` 保存两个错误。不要假定最终捕获到的永远是原始业务异常；日志和监控应识别 `error` 与 `suppressed` 字段。

对于动态数量的资源，可考虑 `DisposableStack` / `AsyncDisposableStack`：

```ts
function temporaryWork(): void {
  using cleanup = new DisposableStack();
  const timer = setInterval(() => console.log("tick"), 1_000);
  cleanup.defer(() => clearInterval(timer));

  // 还可使用 cleanup.use(resource) 或 cleanup.adopt(value, disposer)。
}
```

## 9. 配置与运行时兼容性

按实际宿主配置 `lib`，不要为了消除报错盲目选择 `ESNext`：

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "ESNext.Disposable", "DOM"],
    "strict": true
  }
}
```

检查清单：

- `Promise`、`AsyncIterable`、`AbortSignal`、`Disposable` 的声明是否包含在所选 `lib` 中？
- 目标 Node.js/浏览器是否真的实现对应 API？
- 构建工具是否识别并正确转换 `using` / `await using`？
- 是否需要 `Symbol.dispose`、`Symbol.asyncDispose`、`DisposableStack`、`AsyncDisposableStack`、`SuppressedError` 的 polyfill？
- 第三方资源是否真的实现标准 symbol，而不只是拥有同名 `close()` 或 `dispose()` 方法？

::: warning 类型兼容不等于协议兼容
一个具有 `close()` 方法的对象不会自动成为 `Disposable`；它必须提供 `[Symbol.dispose]()`。类型断言只能压过检查器，不能在运行时添加该方法。
:::

## 10. 综合示例：可取消的流式资源

```ts
class EventSubscription implements AsyncDisposable, AsyncIterable&lt;string&gt; {
  constructor(private readonly signal: AbortSignal) {}

  async *[Symbol.asyncIterator](): AsyncGenerator<string, void, void> {
    let index = 0;
    while (!this.signal.aborted) {
      await delay(200, this.signal);
      yield `event-${index++}`;
    }
  }

  async [Symbol.asyncDispose](): Promise&lt;void&gt; {
    // 真实实现可在此取消 reader、关闭 socket 或发送 unsubscribe。
    await Promise.resolve();
  }
}

async function main(signal: AbortSignal): Promise&lt;void&gt; {
  await using events = new EventSubscription(signal);

  for await (const event of events) {
    console.log(event);
    if (event === "event-2") break;
  }
}
```

这个例子组合了四个独立概念：`AsyncIterable` 负责拉取，`AbortSignal` 负责取消通知，`AsyncDisposable` 负责确定性清理，TypeScript 负责检查协议形状。真正的定时器、socket 和清理动作都发生在 JavaScript 运行时。

## 11. 练习

1. 实现 `mapAsync<T, U>(source: AsyncIterable&lt;T&gt;, mapper: (value: T) => U | PromiseLike&lt;U&gt;): AsyncGenerator&lt;U&gt;`。
2. 为 `delay` 增加测试，覆盖调用前已取消、等待中取消、正常完成三种情况。
3. 用 `Promise.allSettled` 实现批量导入报告，分别统计成功项和 `unknown` 失败原因。
4. 编写一个实现 `AsyncDisposable` 的临时目录类，并说明类型检查与真实文件删除各由哪一层负责。
5. 比较顺序 `await` 与 `Promise.all` 的耗时，并解释为什么后者不等同于多线程执行 JavaScript。

## 12. 本章检查清单

- [ ] 公共 async API 明确返回 `Promise&lt;T&gt;`。
- [ ] 不把 rejection 错误类型误认为 `Promise&lt;T&gt;` 的一部分。
- [ ] `catch` 中先缩窄 `unknown`。
- [ ] 根据依赖关系选择串行或并发。
- [ ] 知道各 Promise 组合器的短路条件。
- [ ] 可取消 API 接收并传播 `AbortSignal`。
- [ ] 大数据流优先考虑 `AsyncIterable` 和背压。
- [ ] 资源离开作用域时通过标准协议确定性释放。
- [ ] 在部署目标上验证 API、转换和 polyfill，而不只验证类型。

## 13. 官方资料

- [TypeScript Handbook: Utility Types - Awaited](https://www.typescriptlang.org/docs/handbook/utility-types.html#awaitedtype)
- [TypeScript Handbook: Iterators and Generators](https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html)
- [TypeScript 5.2: using Declarations and Explicit Resource Management](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management)
- [ECMAScript Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)
- [MDN: Promise concurrency](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#promise_concurrency)
- [MDN: AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [MDN: for await...of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of)

---

← [声明文件类型包与库发布](/kb/language/TypeScript/核心语法/12-声明文件类型包与库发布/) | [返回索引](/kb/language/TypeScript/核心语法/00-TypeScript-7.0-核心语法教程索引/) | [tsconfig工程实践测试与JS迁移](/kb/language/TypeScript/核心语法/14-tsconfig工程实践测试与JS迁移/) →
