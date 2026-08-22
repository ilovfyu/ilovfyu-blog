---
title: "函数类型重载与this"
permalink: /kb/language/TypeScript/核心语法/04-函数类型重载与this/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "对象类型接口与类型别名", link: /kb/language/TypeScript/核心语法/03-对象类型接口与类型别名/ }
next: { text: "联合、交叉、窄化与穷尽检查", link: /kb/language/TypeScript/核心语法/05-联合交叉窄化与穷尽检查/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
> 函数类型描述调用契约：调用方提供什么，函数返回什么，以及函数是否依赖特定的 `this`。

## 学习目标

- 为参数和返回值添加恰当注解
- 利用返回类型推断与上下文类型减少冗余
- 写出函数表达式、调用签名和构造签名
- 正确使用可选、默认、剩余和解构参数
- 避免回调可选参数的经典陷阱
- 在联合参数与函数重载之间做选择
- 使用显式 `this` 参数约束调用方式
- 理解 `void` 在函数兼容性中的特殊行为
- 为异步函数写出正确的 `Promise` 返回类型

## 心智模型：函数类型是输入到输出的契约

最简单的函数类型：

```ts
(input: string) => number
```

它表示任何能接收 `string` 并返回 `number` 的函数。

参数名用于文档和编辑器提示，不参与结构兼容性：

```ts
type ParserA = (text: string) => number;
type ParserB = (source: string) => number;

const parse: ParserA = Number.parseInt;
const same: ParserB = parse;
```

函数声明本身是运行时值，函数类型则在编译后被擦除。

## 参数注解

函数声明的参数通常需要注解：

```ts
function greet(name: string): string {
  return `你好，${name}`;
}

greet("Ada");
// greet(42); // 类型错误
```

没有上下文且无法推断的参数，在严格检查下不能隐式成为 `any`。

```ts
// function bad(value) {
//   return value;
// }
```

## 返回类型推断

TypeScript 会从所有返回路径推断：

```ts
function classify(score: number) {
  if (score >= 60) {
    return "pass";
  }

  return "fail";
}
```

公共函数显式返回类型有助于提前发现实现偏离：

```ts
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("除数不能为 0");
  }

  return a / b;
}
```

局部短函数可依赖推断，公共边界则根据团队规范和稳定性要求决定。

## 上下文类型

函数表达式出现在已知类型的位置时，参数类型来自上下文：

```ts
const names = ["Ada", "Lin", "Grace"];

names.forEach((name) => {
  console.log(name.toUpperCase()); // name 是 string
});
```

显式函数变量类型也提供上下文：

```ts
type Formatter = (value: number) => string;

const format: Formatter = (value) => {
  return value.toFixed(2);
};
```

不要在已有清晰上下文时重复每个参数注解。

## 函数表达式类型

箭头形式：

```ts
type Compare = (left: number, right: number) => number;

const ascending: Compare = (left, right) => left - right;
```

对象成员形式：

```ts
interface Calculator {
  add(left: number, right: number): number;
  subtract: (left: number, right: number) => number;
}
```

两种写法都描述函数成员，但在某些严格函数参数兼容性场景中，方法语法与函数属性语法行为可能不同。

回调属性通常优先使用函数属性形式，以更直接表达“这里存放一个函数值”。

## 调用签名

函数也是对象，可以同时拥有属性：

```ts
interface DescribableFunction {
  description: string;
  (value: number): boolean;
}

function test(fn: DescribableFunction, value: number): boolean {
  console.log(fn.description);
  return fn(value);
}

const isPositive = Object.assign(
  (value: number) => value > 0,
  { description: "判断正数" },
);

test(isPositive, 3);
```

调用签名使用 `:` 连接返回类型，而箭头函数类型使用 `=>`。

## 构造签名

能被 `new` 调用的值使用构造签名：

```ts
interface Clock {
  tick(): string;
}

interface ClockConstructor {
  new (hour: number, minute: number): Clock;
}

function createClock(
  Constructor: ClockConstructor,
  hour: number,
  minute: number,
): Clock {
  return new Constructor(hour, minute);
}
```

类可满足该签名：

```ts
class DigitalClock implements Clock {
  constructor(
    private hour: number,
    private minute: number,
  ) {}

  tick(): string {
    return `${this.hour}:${this.minute}`;
  }
}

const clock = createClock(DigitalClock, 9, 30);
```

既可调用又可构造的值可以同时声明两种签名，但普通业务函数很少需要这种设计。

## 可选参数

```ts
function formatName(first: string, last?: string): string {
  return last === undefined ? first : `${first} ${last}`;
}
```

可选参数在函数体中是 `string | undefined`。

调用方可以省略它：

```ts
formatName("Ada");
formatName("Ada", "Lovelace");
```

必选参数不能位于可选参数之后。

如果后续参数必须提供，考虑对象参数或联合元组。

## 默认参数

```ts
function repeat(text: string, count = 1): string {
  return text.repeat(count);
}
```

`count` 在函数体内是 `number`，调用方可省略或传 `undefined` 触发默认值。

```ts
repeat("ha");
repeat("ha", 3);
repeat("ha", undefined);
```

默认参数可位于必选参数之前，但调用体验通常较差：

```ts
function build(prefix = "item", id: number): string {
  return `${prefix}-${id}`;
}

build(undefined, 1);
```

更推荐把可配置项放入对象参数。

## 剩余参数

```ts
function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

sum();
sum(1, 2, 3);
```

用元组描述固定前缀与剩余参数：

```ts
function logEvent(
  ...args: [name: string, timestamp: number, ...tags: string[]]
): void {
  const [name, timestamp, ...tags] = args;
  console.log(name, timestamp, tags);
}
```

展开普通数组时，数组长度可能不确定：

```ts
const pair = [8, 5] as const;
Math.atan2(...pair);
```

`as const` 让它成为固定长度只读元组。

## 参数解构

对象解构的类型写在整个模式后：

```ts
type DrawOptions = {
  x: number;
  y: number;
  color?: string;
};

function draw(
  { x, y, color = "black" }: DrawOptions,
): void {
  console.log({ x, y, color });
}
```

不要把 JavaScript 解构重命名误写成类型注解：

```ts
const point = { x: 1 };
const { x: horizontal } = point; // horizontal 是变量名
```

元组解构参数：

```ts
type Point = readonly [x: number, y: number];

function distance([x, y]: Point): number {
  return Math.hypot(x, y);
}
```

## 回调可选参数陷阱

假设要遍历数组，错误设计常写成：

```ts
function forEachValue(
  values: string[],
  callback: (value: string, index?: number) => void,
): void {
  values.forEach((value, index) => callback(value, index));
}
```

`index?: number` 的承诺是：实现可以只用一个参数调用回调。

因此回调内部必须把 `index` 当作可能的 `undefined`：

```ts
forEachValue(["a", "b"], (value, index) => {
  console.log(value);
  // console.log(index.toFixed()); // 可能为 undefined
});
```

如果实现总会传索引，应将它声明为必选：

```ts
function forEachValue(
  values: string[],
  callback: (value: string, index: number) => void,
): void {
  values.forEach(callback);
}
```

调用者仍可提供只接收 `value` 的函数，因为 JavaScript 会忽略额外实参：

```ts
forEachValue(["a", "b"], (value) => {
  console.log(value);
});
```

规则：除非确实可能不传，否则不要在回调类型中把参数标成可选。

## 联合参数优先

若所有输入共享同一处理逻辑和返回类型，优先使用联合：

```ts
function formatId(id: string | number): string {
  return typeof id === "string" ? id.toUpperCase() : id.toString();
}
```

调用者持有联合值时也能直接调用：

```ts
declare const id: string | number;
formatId(id);
```

这通常比两个重载更简单。

## 函数重载

当输入类型决定不同返回类型时，重载可以提供精确调用体验：

```ts
function parseInput(input: string): string[];
function parseInput(input: Uint8Array): number[];
function parseInput(input: string | Uint8Array): string[] | number[] {
  if (typeof input === "string") {
    return input.split(",");
  }

  return Array.from(input);
}

const words = parseInput("a,b");     // string[]
const bytes = parseInput(new Uint8Array([1, 2])); // number[]
```

前两行是调用签名，最后一个带实现体的是实现签名。

实现签名必须兼容所有重载，但对外不可直接调用：

```ts
// parseInput(Math.random() ? "a" : new Uint8Array());
```

即使实现签名接受联合，调用解析只看公开重载。

需要接收联合变量时，可以额外公开联合重载，或直接改为联合参数函数。

## 好重载的规则

1. 尽量让重载数量少、差异明确。
2. 更具体的签名通常放在更宽泛签名前。
3. 实现签名覆盖全部输入和输出。
4. 只有返回类型不同、参数列表相同的设计通常难以区分，不应依赖返回上下文选重载。
5. 能用联合参数表达时优先使用联合。

对象参数往往比大量组合重载更易维护：

```ts
type SearchOptions = {
  query: string;
  limit?: number;
  signal?: AbortSignal;
};

function search(options: SearchOptions): Promise<string[]> {
  return Promise.resolve([options.query]);
}
```

## this 参数

JavaScript 的 `this` 由调用方式决定，不由函数定义位置简单决定。

TypeScript 可用一个假的首参数声明 `this` 类型：

```ts
interface User {
  name: string;
}

function greet(this: User, punctuation: string): string {
  return `你好，${this.name}${punctuation}`;
}

const user: User = { name: "Ada" };
greet.call(user, "!");
```

`this` 参数不会出现在生成的 JavaScript 中，也不计入运行时参数数量。

禁止函数依赖 `this`：

```ts
function toUpper(this: void, value: string): string {
  return value.toUpperCase();
}
```

这适合需要安全脱离对象调用的回调。

## 方法与箭头函数的 this

普通方法的 `this` 随调用者变化：

```ts
const counter = {
  value: 0,
  increment() {
    this.value += 1;
  },
};

counter.increment();
```

脱离对象后可能丢失接收者：

```ts
const increment = counter.increment;
// increment(); // 运行时 this 可能是 undefined
```

箭头函数捕获词法 `this`，不适合作为需要动态接收者的方法。

类中若方法常作为回调传递，可用箭头属性固定实例：

```ts
class ButtonController {
  label = "保存";

  handleClick = (): void => {
    console.log(this.label);
  };
}
```

代价是每个实例拥有自己的函数，而不是共享原型方法。

## 对象方法中的 this 类型

```ts
interface Counter {
  value: number;
  increment(this: Counter, step?: number): void;
}

const counter: Counter = {
  value: 0,
  increment(step = 1) {
    this.value += step;
  },
};
```

显式 `this` 能让 API 对调用方式的要求更清楚。

在严格模式下，`noImplicitThis` 会帮助发现缺少上下文的 `this`。

## void 的重要行为

声明返回 `void` 的函数：

```ts
function notify(message: string): void {
  console.log(message);
}
```

它的调用结果不应被当作有意义的值使用。

但当一个函数值被赋给返回 `void` 的上下文类型时，实现可以返回值：

```ts
type Consumer = (value: string) => void;

const collected: string[] = [];
const consume: Consumer = (value) => collected.push(value);
```

`push` 返回 `number`，但调用方通过 `Consumer` 视角忽略该结果。

这正是下面代码合法的原因：

```ts
const source = ["a", "b"];
const target: string[] = [];
source.forEach((value) => target.push(value));
```

注意，显式声明 `(): void` 的函数实现通常不能返回一个具体值：

```ts
function explicitVoid(): void {
  // return 1; // 类型错误
  return;
}
```

“上下文要求忽略返回值”和“函数显式声明只返回 void”是两个相关但不同的场景。

## async 返回值入门

`async` 函数总是返回 `Promise`：

```ts
async function loadName(id: string): Promise&lt;string&gt; {
  const response = await fetch(`/api/users/${id}`);

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  return response.text();
}
```

函数体返回 `string`，调用方收到 `Promise&lt;string&gt;`。

```ts
const promise = loadName("u-1");
const name = await promise;
```

无有意义返回值的异步函数写 `Promise&lt;void&gt;`：

```ts
async function saveLog(message: string): Promise&lt;void&gt; {
  await fetch("/api/logs", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
```

不要把异步回调误标成同步 `() => void` 后期待调用方自动等待它。

某些事件 API 接受返回 `void` 的回调，因此 `async` 回调的 Promise 可能被忽略，错误也可能变成未处理拒绝。

需要顺序和错误处理时，应让 API 显式接受并等待 `Promise&lt;void&gt;`。

```ts
type AsyncTask = () => Promise&lt;void&gt;;

async function run(task: AsyncTask): Promise&lt;void&gt; {
  await task();
}
```

## 实战：类型安全事件分发

```ts
type EventMap = {
  login: { userId: string };
  logout: { userId: string; reason?: string };
};

type EventName = keyof EventMap;

function emit&lt;K extends EventName&gt;(
  name: K,
  payload: EventMap[K],
): void {
  console.log(name, payload);
}

emit("login", { userId: "u-1" });
emit("logout", { userId: "u-1", reason: "timeout" });
```

这里使用泛型关联事件名和参数，比为每个事件堆叠重载更容易扩展。

泛型细节将在后续章节展开；现在重点是观察函数契约如何关联输入。

## 常见陷阱

### 给所有返回值重复注解

短小局部函数让推断工作；公共 API 或需要固定契约时再显式标注。

### 把总会传入的回调参数写成可选

`index?: number` 是对实现调用行为的承诺，不是允许回调实现少写参数的手段。

### 用重载替代简单联合

相同返回类型、相同逻辑优先用联合参数。

### 从实现签名调用重载函数

外部只看公开重载签名；实现签名不是额外公开入口。

### 忽视方法丢失 this

把方法作为值传递前，明确绑定、包装成箭头函数，或使用箭头属性。

### 认为 void 实现绝不能返回值

上下文函数类型 `() => void` 允许实现产生但被忽略的返回值；显式 `function f(): void` 的规则不同。

### 忽略 async 回调的 Promise

确认调用方是否会等待 Promise，并设计明确的错误处理路径。

## 动手练习

1. 为排序比较器定义函数类型，并依赖上下文推断参数。
2. 编写同时具有 `description` 属性和调用签名的函数对象。
3. 用可选、默认和剩余参数各实现一个实用函数。
4. 修复一个错误声明为 `index?: number` 的遍历回调。
5. 先用两个重载处理字符串和数字，再重构为联合参数。
6. 编写输入不同、返回类型也不同的合理重载。
7. 定义一个要求特定 `this` 的函数，并用 `call` 正确调用。
8. 比较 `() => void` 上下文函数与显式 `(): void` 函数的返回行为。
9. 编写返回 `Promise&lt;void&gt;` 的任务执行器并处理异常。

## 本章检查清单

- [ ] 能判断何时依赖返回类型推断
- [ ] 能解释上下文类型来自哪里
- [ ] 能区分箭头函数类型和调用签名语法
- [ ] 能写构造签名并接收类构造器
- [ ] 能正确使用可选、默认、剩余和解构参数
- [ ] 不会为“允许少写形参”而把回调参数标为可选
- [ ] 简单场景优先联合，关联返回类型时再考虑重载
- [ ] 知道实现签名对调用方不可见
- [ ] 能用假 `this` 参数约束接收者
- [ ] 理解返回 `void` 上下文会忽略实现结果
- [ ] 知道 `async` 函数返回 `Promise&lt;T&gt;`

## 官方资料

- [More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [Everyday Types: Functions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#functions)
- [Type Inference: Contextual Typing](https://www.typescriptlang.org/docs/handbook/type-inference.html#contextual-typing)
- [Type Compatibility: Comparing Functions](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#comparing-two-functions)
- [TSConfig noImplicitThis](https://www.typescriptlang.org/tsconfig/noImplicitThis.html)
- [TSConfig strictFunctionTypes](https://www.typescriptlang.org/tsconfig/strictFunctionTypes.html)

---

上一章：[对象类型接口与类型别名](/kb/language/TypeScript/核心语法/03-对象类型接口与类型别名/) | 下一章：[联合交叉窄化与穷尽检查](/kb/language/TypeScript/核心语法/05-联合交叉窄化与穷尽检查/)
