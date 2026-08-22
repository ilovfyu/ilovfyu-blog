---
title: "keyof、typeof、索引访问与类型查询"
permalink: /kb/language/TypeScript/核心语法/07-keyof-typeof索引访问与类型查询/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "泛型约束与类型参数设计", link: /kb/language/TypeScript/核心语法/06-泛型约束与类型参数设计/ }
next: { text: "条件类型、映射类型与模板字面量", link: /kb/language/TypeScript/核心语法/08-条件类型映射类型与模板字面量/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
> 版本基线：TypeScript 7.0.2，默认 `strict`。本章讨论的 `typeof` 主要位于类型位置，不要与运行时 `typeof` 守卫混淆。

[上一章](/kb/language/TypeScript/核心语法/06-泛型约束与类型参数设计/) · [下一章](/kb/language/TypeScript/核心语法/08-条件类型映射类型与模板字面量/)

## 学习目标

- 区分值空间与类型空间，理解同名声明和 `typeof` 的上下文。
- 使用 `keyof` 得到属性键联合，并正确理解索引签名结果。
- 使用索引访问类型 `T[K]` 提取属性、联合和数组元素类型。
- 用 `keyof typeof` 从运行时常量派生类型，避免重复维护。
- 理解 `unique symbol` 作为唯一键和名义化标记的基本用法。
- 编写安全属性 getter，并处理 `noUncheckedIndexedAccess` 的影响。

## 1. 值空间与类型空间

TypeScript 源码里存在彼此相关但不同的两个命名空间：

- 值空间中的名字在 JavaScript 运行时存在，例如变量、函数、类、枚举。
- 类型空间中的名字仅供类型检查，例如 `type`、`interface`、类型参数。
- 类和枚举会同时创建值与类型；普通对象变量只创建值。

```ts
interface User {
  id: string;
}

const user = { id: "u1" };

let a: User;        // User 用作类型
const b = user;     // user 用作值
// let c: user;     // 错误：user 是值，不是类型
let c: typeof user; // 从值查询其静态类型
```

类型注解不会在运行时保留。不能写 `if (value instanceof User)`，因为接口没有运行时值；类则可以。

```ts
class Account {
  constructor(public id: string) {}
}

const AccountCtor = Account; // 值侧：typeof Account，即构造器及静态成员
let account: Account;        // 类型侧：Account 实例
```

## 2. `keyof` 类型运算符

`keyof T` 生成 `T` 的已知属性键联合。

```ts
interface Profile {
  id: string;
  name: string;
  active: boolean;
}

type ProfileKey = keyof Profile;
// "id" | "name" | "active"
```

JavaScript 属性键的完整类型是 `PropertyKey`，即 `string | number | symbol`。对象中数值键在运行时通常会字符串化，但类型系统需要反映索引签名规则。

```ts
type StringMap = { [key: string]: boolean };
type MapKey = keyof StringMap; // string | number

type NumberMap = { [index: number]: string };
type NumberKey = keyof NumberMap; // number
```

字符串索引签名得到 `string | number`，因为 `obj[0]` 与 `obj["0"]` 在 JavaScript 中访问同一属性。不要想当然地把所有 `keyof` 都约束成 `string`；确实只处理字符串键时可用 `Extract&lt;keyof T, string&gt;` 或 `string & keyof T`。

### 2.1 联合类型上的 `keyof`

对联合 `A | B`，可直接安全访问的是所有成员都具备的键，因此 `keyof (A | B)` 反映公共可用键，而不是简单罗列全部键。

```ts
type A = { common: string; a: number };
type B = { common: string; b: boolean };
type CommonKeys = keyof (A | B); // "common"
```

若需要分别取各成员键后合并，可借助分布式条件类型，下一章会展开：

```ts
type KeysOfUnion&lt;T&gt; = T extends unknown ? keyof T : never;
type AllKeys = KeysOfUnion<A | B>; // "common" | "a" | "b"
```

## 3. 类型位置的 `typeof`

运行时表达式 `typeof value` 返回字符串；类型查询 `typeof value` 获取编译器已知的静态类型。

```ts
const settings = {
  theme: "dark",
  pageSize: 20,
};

type Settings = typeof settings;
// { theme: string; pageSize: number }
```

由于普通对象属性可变，字面量通常会拓宽。若需要保留字面量并只读：

```ts
const fixedSettings = {
  theme: "dark",
  pageSize: 20,
} as const;

type FixedSettings = typeof fixedSettings;
// { readonly theme: "dark"; readonly pageSize: 20 }
```

类型位置的 `typeof` 语法有意受限，通常只能查询标识符或属性访问，避免把任意运行时计算伪装成类型级求值。

```ts
function makeUser() {
  return { id: "u1", active: true };
}

type MakeUser = typeof makeUser;
type User = ReturnType&lt;typeof makeUser&gt;;
// type Wrong = typeof makeUser(); // 不合法，应使用 ReturnType
```

## 4. 索引访问类型 `T[K]`

索引访问类型用另一个类型查询属性类型。

```ts
interface Order {
  id: string;
  total: number;
  status: "draft" | "paid";
}

type OrderId = Order["id"]; // string
type OrderSummary = Order["id" | "status"]; // string | "draft" | "paid"
type OrderValue = Order[keyof Order]; // 所有属性值的联合
```

索引必须是类型，而不是值变量；可先用 `typeof` 把常量带到类型空间。

```ts
const key = "status";
type Status = Order[typeof key]; // "draft" | "paid"
```

### 4.1 数组与元组元素类型

`T[number]` 获取数组或元组所有数值索引位置的元素类型。

```ts
const roles = ["admin", "editor", "viewer"] as const;
type Role = (typeof roles)[number];
// "admin" | "editor" | "viewer"

type Pair = readonly [string, number];
type First = Pair[0];      // string
type Element = Pair[number]; // string | number
```

这是“以运行时数据为单一事实来源”的核心模式：维护数组，类型自动同步。

### 4.2 嵌套索引访问

```ts
interface ApiResponse {
  data: {
    users: Array<{ id: string; email: string }>;
  };
}

type UserItem = ApiResponse["data"]["users"][number];
type Email = UserItem["email"];
```

如果链路中存在可选属性，直接索引可能需要先排除 `undefined`：

```ts
interface MaybeResponse {
  data?: { users: string[] };
}

type Data = NonNullable<MaybeResponse["data"]>;
type UserName = Data["users"][number];
```

## 5. `keyof typeof`：从值派生键

`typeof` 先取得对象值的类型，`keyof` 再取得其键联合。

```ts
const permissions = {
  read: "读取",
  write: "写入",
  delete: "删除",
} as const;

type Permission = keyof typeof permissions;
// "read" | "write" | "delete"

type PermissionLabel = (typeof permissions)[Permission];
// "读取" | "写入" | "删除"
```

常见用途包括路由名、功能开关、错误码、配置键和注册表：

```ts
const handlers = {
  start: (id: string) => ({ id, state: "started" as const }),
  stop: (id: string) => ({ id, state: "stopped" as const }),
};

type Command = keyof typeof handlers;
type StartHandler = (typeof handlers)["start"];
type StartResult = ReturnType&lt;StartHandler&gt;;
```

### 5.1 对象值联合

```ts
const httpStatus = {
  ok: 200,
  notFound: 404,
  serverError: 500,
} as const;

type HttpStatusName = keyof typeof httpStatus;
type HttpStatusCode = (typeof httpStatus)[HttpStatusName];
// 200 | 404 | 500
```

若省略 `as const`，值会拓宽为 `number`，`HttpStatusCode` 也只会是 `number`。是否保留字面量取决于 API 是否真的需要封闭集合。

## 6. 类型安全的属性 getter

不安全版本使用 `string` 键，无法证明索引存在，且返回类型丢失：

```ts
function unsafeGet(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}
```

下面的版本为已声明属性建立 `T`、`K` 与 `T[K]` 的关系：

```ts
function get&lt;T extends object, K extends keyof T&gt;(obj: T, key: K): T[K] {
  return obj[key];
}

const product = { sku: "A-1", price: 99, stock: 3 };
const price = get(product, "price"); // number
// get(product, "missing"); // 错误
```

这不保证开放字典中的键在运行时真实存在。对 `Record<string, number>` 而言，`keyof` 允许任意字符串，`get(dictionary, "missing")` 的声明结果仍可能是 `number`。字典 API 应诚实返回 `V | undefined`：

```ts
function getFromDictionary&lt;V&gt;(
  dictionary: Record<string, V>,
  key: string,
): V | undefined {
  return dictionary[key];
}
```

批量选择属性可保留每个键的对应类型：

```ts
function pick&lt;T extends object, K extends keyof T&gt;(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

const summary = pick(product, ["sku", "price"]);
// Pick<{ sku: string; price: number; stock: number }, "sku" | "price">
```

这里的断言局限在实现内部，用于表达逐步构建结果；公开签名仍保持键值关系。更复杂的构建过程应考虑显式初始化或经过验证的库函数。

## 7. `unique symbol` 简述

普通 `symbol` 表示任意符号；`unique symbol` 表示某个声明独有的符号身份。它常由 `const` 声明或 `readonly static` 属性承载。

```ts
const entityId: unique symbol = Symbol("entityId");

interface Entity {
  [entityId]: string;
  name: string;
}

type EntityKeys = keyof Entity; // typeof entityId | "name"

const entity: Entity = {
  [entityId]: "e1",
  name: "demo",
};
```

引用这个唯一类型要写 `typeof entityId`。两个不同的 `unique symbol` 即使描述文本相同也不兼容，适合无碰撞属性键和轻量名义化标记。

```ts
declare const userBrand: unique symbol;
type UserId = string & { readonly [userBrand]: true };
```

品牌断言本身不执行运行时验证；创建 `UserId` 的函数仍应校验格式。

## 8. `noUncheckedIndexedAccess` 的影响

`strict` 默认开启不等于 `noUncheckedIndexedAccess` 必然开启；它是独立选项。启用后，对未声明具体存在性的索引读取会加入 `undefined`。

```ts
interface Environment {
  NAME: string;
  [key: string]: string;
}

declare const env: Environment;
const name = env.NAME;       // string：明确声明
const mode = env["MODE"];   // 启用选项后为 string | undefined
```

数组索引同样受影响：

```ts
const numbers: number[] = [10, 20];
const first = numbers[0]; // 启用后 number | undefined

if (first !== undefined) {
  console.log(first.toFixed(2));
}
```

该选项揭示了真实风险：类型为 `number[]` 不保证任意位置有元素。应使用边界检查、迭代、`.at()` 后判空、非空元组，或让 API 返回 `T | undefined`。

```ts
type NonEmptyArray&lt;T&gt; = readonly [T, ...T[]];

function firstOf&lt;T&gt;(items: NonEmptyArray&lt;T&gt;): T {
  return items[0];
}
```

### 8.1 与泛型 getter 的关系

对已知属性 `K extends keyof T`，返回仍是 `T[K]`。如果属性本身可选，`T[K]` 自然包含 `undefined`。但若 `T` 只有开放索引签名，`K extends keyof T` 只证明该键被类型允许，不能证明运行时属性存在；`noUncheckedIndexedAccess` 也不会自动改写手写的泛型返回类型 `T[K]`。不要用非空断言掩盖差异，应让字典 getter 显式返回 `V | undefined`。

## 9. 常见陷阱

### 9.1 `Object.keys` 不是 `(keyof T)[]`

运行时对象可能有类型声明之外的额外属性，结构类型允许这种情况，因此标准库保守返回 `string[]`。

```ts
const keys = Object.keys(product); // string[]
```

把它直接断言为 `(keyof T)[]` 只有在对象形状封闭且来源受控时才合理。通用库函数不应默认作此承诺。

### 9.2 `keyof` 不代表可枚举字符串键

它可能包含 `number`、`symbol`，也不编码 enumerable、own-property 等运行时特征。`Object.keys`、`Reflect.ownKeys`、`for...in` 的行为不同。

### 9.3 误用值作为索引类型

```ts
const field = "id";
// type Id = Order[field]; // 错误
type Id = Order[typeof field];
```

### 9.4 过早拓宽常量

```ts
const key1: string = "id";
// get(product, key1); // string 太宽，不能证明是 keyof product

const key2 = "sku";
get(product, key2); // 保留 "sku"
```

### 9.5 用包装对象类型作键

避免 `String`、`Number`、`Boolean` 包装对象类型，使用原始类型 `string`、`number`、`boolean`。包装对象通常不能安全充当索引类型。

## 综合示例：配置读取器

```ts
const defaults = {
  host: "localhost",
  port: 8080,
  secure: false,
} as const;

type ConfigKey = keyof typeof defaults;
type Config = {
  [K in ConfigKey]: (typeof defaults)[K] extends string
    ? string
    : (typeof defaults)[K] extends number
      ? number
      : boolean;
};

function readConfig&lt;K extends ConfigKey&gt;(config: Config, key: K): Config[K] {
  return config[key];
}

const config: Config = { host: "example.com", port: 443, secure: true };
const secure = readConfig(config, "secure"); // boolean
```

这里以运行时默认值确定键集合，再派生可覆盖的配置类型。条件类型将在下一章系统讲解。

## 练习

1. 从 `as const` 的错误码对象派生错误码名称、数值联合及安全查询函数。
2. 实现 `pluck<T, K extends keyof T>(items: readonly T[], key: K): T[K][]`。
3. 为一个元组推导首元素、末元素之外的所有元素联合，并观察空元组结果。
4. 开启 `noUncheckedIndexedAccess`，修复数组、字典读取处，而不使用 `!`。
5. 使用 `unique symbol` 为两个结构相同的字符串 ID 创建互不兼容的品牌类型。

## 检查清单

- [ ] 清楚某个名字当前位于值空间还是类型空间。
- [ ] 从值派生类型时使用类型位置的 `typeof`。
- [ ] 使用 `keyof typeof` 避免键集合在值和类型中重复维护。
- [ ] 使用 `T[K]` 保留具体键与返回值的关联。
- [ ] 考虑了 `keyof` 可能包含 `string | number | symbol`。
- [ ] 没有把 `Object.keys` 无条件视为 `(keyof T)[]`。
- [ ] 字典和数组索引读取能处理 `undefined`。
- [ ] 需要非空保证时用非空元组建模，而不是非空断言。
- [ ] 字面量信息未因过早标注 `string`、`number` 而丢失。

## 官方资料

- [TypeScript Handbook：Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)
- [TypeScript Handbook：Typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)
- [TypeScript Handbook：Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [TypeScript Handbook：Symbols](https://www.typescriptlang.org/docs/handbook/symbols.html)
- [TSConfig Reference：noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)

---

[上一章](/kb/language/TypeScript/核心语法/06-泛型约束与类型参数设计/) · [下一章](/kb/language/TypeScript/核心语法/08-条件类型映射类型与模板字面量/)
