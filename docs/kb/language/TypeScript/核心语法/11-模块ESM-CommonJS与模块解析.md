---
title: "模块 ESM、CommonJS 与模块解析"
permalink: /kb/language/TypeScript/核心语法/11-模块ESM-CommonJS与模块解析/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "类抽象类与面向对象", link: /kb/language/TypeScript/核心语法/10-类抽象类与面向对象/ }
next: { text: "声明文件、类型包与库发布", link: /kb/language/TypeScript/核心语法/12-声明文件类型包与库发布/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
::: info 版本基线
本文以 TypeScript 7.0.2 为基线，默认面向现代 Node.js、浏览器与 bundler。模块能否运行最终由 Node、浏览器、bundler 或其他宿主决定，TypeScript 主要负责模拟宿主解析并检查类型。
:::

## 学习目标

- 使用标准 ESM 导入、导出、类型导入和动态导入。
- 理解 Node 中 ESM/CJS 格式如何由扩展名和 `package.json` 决定。
- 为 Node 应用与 bundler 应用选择正确的模块解析模式。
- 正确配置包的 `exports`、`imports` 和类型入口。
- 避开 `paths`、扩展名、模块副作用及前沿语法的常见陷阱。

## 1. 两套模块系统

### 1.1 ECMAScript Modules（ESM）

ESM 是 JavaScript 标准模块系统，使用静态 `import`/`export`：

```ts
// math.ts
export const pi = Math.PI;

export function add(a: number, b: number): number {
  return a + b;
}

export default class Calculator {}
```

```ts
// app.ts
import Calculator, { add, pi } from "./math.js";

console.log(add(pi, 1), new Calculator());
```

ESM 静态结构便于 tree shaking、循环依赖分析和编辑器导航。新项目优先使用 ESM。

### 1.2 CommonJS（CJS）

CommonJS 是 Node 历史模块系统：

```js
// math.cjs
exports.add = (a, b) => a + b;
module.exports.pi = Math.PI;
```

```js
// app.cjs
const { add, pi } = require("./math.cjs");
```

CJS 导入是运行时函数调用，导出以 `module.exports` 为中心。维护旧项目或兼容旧消费者时仍会遇到它，但不要在同一文件里随意混合 ESM 与 CJS 语法。

## 2. 导出与再导出

```ts
// user.ts
export interface User {
  id: string;
  name: string;
}

export function findUser(id: string): User | undefined {
  return id ? { id, name: "Ada" } : undefined;
}
```

```ts
// index.ts
export { findUser } from "./user.js";
export type { User } from "./user.js";
```

命名导出通常比默认导出更容易重构和自动导入。`export *` 适合明确的小型聚合入口，但大型 barrel 文件可能引入循环依赖、副作用和不必要的模块加载。

## 3. `import type` 与类型擦除

```ts
import { findUser, type User } from "./user.js";
import type { Request } from "./http.js";

export type { User };
```

`import type` 和 `export type` 保证相关绑定不会出现在 JavaScript 输出中：

```ts
import type { User } from "./user.js";

const current: User = { id: "u1", name: "Ada" };
```

擦除后没有导入语句，因此被导入模块也不会因该语句而执行。反过来，值导入可能触发模块初始化副作用。

::: warning 类型和值不能混淆
类、枚举等可能同时有值和类型身份。若通过 `import type` 导入类，只能在类型位置使用，不能 `new`、`instanceof` 或访问静态成员。
:::

现代项目推荐开启 `verbatimModuleSyntax`，显式写出类型导入，使单文件转译器与 TypeScript 对保留哪些导入达成一致。

## 4. 副作用导入

```ts
import "./register-polyfills.js";
import "./instrumentation.js";
```

副作用导入不绑定任何名字，只要求模块求值。常见用途是 polyfill、CSS、遥测注册或全局插件。

问题在于拼写错误过去可能不易被发现。建议开启：

```json
{
  "compilerOptions": {
    "noUncheckedSideEffectImports": true
  }
}
```

对 CSS 等由 bundler 处理的资源，提供精确的环境声明，例如 `declare module "*.css";`。不要用宽泛的 `declare module "*"` 吞掉所有错误。

模块顶层代码应尽量轻量、确定且无隐蔽 I/O。导入一个类型或工具函数不应意外建立数据库连接。

## 5. 动态 `import()`

```ts
async function loadEditor() {
  const module = await import("./editor.js");
  return new module.Editor();
}
```

动态导入返回 Promise，适合代码分割、可选功能和从 CJS 异步加载 ESM。模块说明符仍须能被运行时或 bundler 解析。

```ts
type EditorModule = typeof import("./editor.js");
```

类型位置的 `import("...")` 不会产生动态加载；它只是引用模块类型。

## 6. Node 如何判定 ESM 或 CJS

在 Node 双模块世界中，扩展名最明确：

| TypeScript 源文件 | JavaScript 输出/对应声明 | 格式 |
| --- | --- | --- |
| `.mts` | `.mjs` / `.d.mts` | 始终 ESM |
| `.cts` | `.cjs` / `.d.cts` | 始终 CJS |
| `.ts` | `.js` / `.d.ts` | 由最近的 `package.json` 的 `type` 决定 |

```json
{
  "name": "modern-app",
  "type": "module"
}
```

在该包作用域中，普通 `.js` 是 ESM；没有 `"type": "module"` 或显式写 `"type": "commonjs"` 时，普通 `.js` 按 CJS 处理。`.mjs` 与 `.cjs` 不受 `type` 影响。

文件改名并不是纯类型操作，它会改变运行时格式和可用语义，例如 ESM 没有传统 CJS 的 `__dirname` 与 `require`。

## 7. Node ESM 源码中的 `.js` 扩展名

Node ESM 要求相对导入使用运行时可见的完整扩展名：

```ts
// src/app.ts
import { add } from "./math.js";
```

即使磁盘上源码叫 `math.ts`，也应写 `./math.js`，因为编译后 Node 实际加载的是 `dist/math.js`。在 `nodenext` 解析中，TypeScript 会用扩展名替换规则把 `./math.js` 对应到 `math.ts` 做类型检查。

```ts
import { add } from "./math";    // Node ESM 中通常错误
import { add } from "./math.ts"; // emit 后通常也不是你想要的路径
```

`allowImportingTsExtensions` 只适合运行时确实直接加载 `.ts` 的工具链。在 TypeScript 7.0.2 中，它要求 `moduleResolution: "bundler"`，并且必须同时使用 `noEmit` 或 `emitDeclarationOnly`；不要把它当作普通 Node 编译项目的默认方案。

## 8. `nodenext` 与 `bundler`

模块解析必须匹配真正的宿主。

### 8.1 直接运行于 Node：`nodenext`

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "verbatimModuleSyntax": true,
    "strict": true
  }
}
```

`nodenext` 模拟当前 Node 双格式系统，包括 `package.json` 的 `type`、`exports`、`imports`、条件导出和 ESM/CJS 互操作。它是浮动模式，随现代 Node 行为演进；需要锁定特定 Node 版本语义时，检查当前 TypeScript 7 支持的固定 `node*` 模式。

### 8.2 由 Vite、Rollup、esbuild 等打包：`bundler`

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "strict": true
  }
}
```

Bundler 通常允许相对导入省略扩展名，并能处理资源导入和别名。`bundler` 模式模拟这类能力，但最终配置仍必须与 bundler 一致。

::: tip 选择原则
JavaScript 由谁解析模块，就选择模拟谁的模式。直接交给 Node 用 `nodenext`；交给现代 bundler 用 `bundler`。不要为了消除报错选择更宽松但与运行时不符的模式。
:::

## 9. ESM 与 CJS 互操作

从 ESM 导入 CJS 时，Node 通常把 `module.exports` 暴露为默认导入，并可能通过静态分析提供命名导入。命名导入不一定在运行时成功，TypeScript 无法从 `.d.ts` 完全预测 Node 的分析结果。

```ts
import legacy from "legacy-cjs-package";
```

从 CJS 使用 ESM 时，动态 `import()` 是最可移植的桥梁：

```js
async function main() {
  const modern = await import("modern-esm-package");
  modern.run();
}
```

较新 Node 允许部分 `require(esm)` 场景，但含 top-level `await` 的模块图可能失败，且支持取决于 Node 版本。库作者不要仅凭 TypeScript 检查通过就承诺所有 Node 版本互操作。

## 10. `paths` 不会改写运行时导入

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["./src/*"]
    }
  }
}
```

```ts
import { config } from "@app/config";
```

`paths` 只告诉 TypeScript“这个说明符应到哪里找类型/源码”，不会把输出 JavaScript 中的 `@app/config` 改写成相对路径。若 Node 或 bundler 没有配置同一别名，代码会在运行时失败。

发布库尤其不应通过 `paths` 假装包内裸说明符可用。优先使用标准 `package.json#imports`；monorepo 包之间优先使用 npm/pnpm/yarn workspace，让开发环境走真实的包解析。

## 11. `package.json` 的 `exports` 与 `imports`

### 11.1 `exports`：公开入口白名单

```json
{
  "name": "@acme/math",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./advanced": {
      "types": "./dist/advanced.d.ts",
      "import": "./dist/advanced.js"
    }
  }
}
```

一旦定义 `exports`，未列出的深层路径通常不再可访问。`types` 条件应放在相关条件对象前面，并确保每个公开运行时子路径都有匹配的声明入口。

双 ESM/CJS 包常见结构：

```json
{
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  }
}
```

同一个声明文件不能总是同时准确描述两个格式；特别是默认导出和 `module.exports` 语义不同时，应分别生成/提供 `.d.mts` 与 `.d.cts`。

### 11.2 `imports`：包内部别名

```json
{
  "imports": {
    "#core/*": "./dist/core/*.js"
  }
}
```

```ts
import { parse } from "#core/parser";
```

`imports` 键必须以 `#` 开头，是 Node 标准能力，也能被现代 TypeScript 模块解析理解。它比只对编译器生效的 `paths` 更接近端到端方案。

## 12. Import Attributes：`with`

现代语法使用 `with` 附加导入属性：

```ts
import data from "./data.json" with { type: "json" };

const lazyData = await import("./data.json", {
  with: { type: "json" },
});
```

旧的 `assert { type: "json" }` 已被标准方向的 import attributes 取代。是否必须写属性、允许哪些键以及 JSON 模块如何返回，由目标运行时决定。TypeScript 能解析/检查语法，不代表旧版 Node、浏览器或 bundler 能执行；应在 CI 中用实际目标版本测试。

## 13. TypeScript 5.9 起的 `import defer`

```ts
import defer * as feature from "./expensive-feature.js";

// 模块已加载并链接，但求值推迟到首次读取命名空间成员。
feature.start();
```

限制与语义：

- 只允许命名空间导入：`import defer * as ns from "..."`。
- 不能使用默认导入或具名绑定。
- 它延迟模块求值，不等于动态 `import()`；模块仍会被加载和链接。
- TypeScript 不降级转换该语法，只在保留原语法的模块模式中使用。
- 首次访问命名空间成员时才触发模块及依赖求值。

::: warning 运行时支持
`import defer` 源于仍需关注落地状态的 ECMAScript 提案。TypeScript 5.9/7 能接受语法不等于你的 Node、浏览器或 bundler 已支持。未核实生产运行时与构建工具前，不要发布依赖它的代码；需要广泛兼容时使用动态 `import()`。
:::

## 14. TypeScript 7 迁移提醒

TypeScript 7 的原生编译器清理了面向历史加载器的旧模块模式和旧解析选项。迁移时应注意：

- 不再围绕 AMD、UMD、SystemJS 等旧 `module` 输出模式设计新配置；需要这些格式时交给专门 bundler 转换。
- `moduleResolution: "node10"`（旧称 `node`）属于已移除的遗留解析模型；现代 Node 使用 `nodenext`，bundler 使用 `bundler`。
- `baseUrl` 已从 TypeScript 7 配置面清理。`paths` 的目标直接相对 `tsconfig.json` 解析；更推荐运行时也理解的包 `imports`、workspace 或 bundler alias。
- 不要机械复制 TypeScript 5.x 的旧 `tsconfig`。让 TypeScript 7 检查配置，并逐项确认与真实宿主一致。

旧模式被移除不是说 CJS 文件不能存在。Node 双格式项目仍可通过 `nodenext`、`package.json#type`、`.mts`/`.cts` 精确建模 ESM 与 CJS。

## 常见陷阱

- 在 Node ESM 的 `.ts` 源文件中省略相对导入的 `.js` 扩展名。
- 以为 `paths` 会改写输出或让 Node 自动认识别名。
- 将 `import type` 改成值导入，意外执行有副作用的模块。
- 包定义了 `exports`，却忘记公开子路径或对应 `types` 条件。
- 用单个 `.d.ts` 同时描述语义不同的 ESM 与 CJS 入口。
- 依赖 CJS 命名导入，而目标 Node 的静态分析无法识别它。
- 看到 TypeScript 接受 import attributes 或 `import defer`，就假定所有运行时支持。
- 让 barrel 文件形成循环依赖或扩大初始化副作用。

## 练习

1. 创建 `math.ts` 与 `app.ts`，使用符合 Node ESM 的 `.js` 相对说明符。
2. 分别为直接运行的 Node 项目和 Vite 项目写最小 `tsconfig.json`。
3. 将一个 `paths` 别名改为 `package.json#imports` 的 `#` 别名。
4. 为库设计根入口和 `./testing` 子路径的 `exports` 与类型条件。
5. 用动态 `import()` 实现可选功能，并说明它与 `import defer` 的加载/求值差异。

## 检查清单

- [ ] `moduleResolution` 与真正的运行时或 bundler 一致。
- [ ] Node ESM 相对说明符使用了运行时 `.js` 扩展名。
- [ ] 类型依赖使用 `import type`/`export type`。
- [ ] `paths` 别名在运行时有对应实现，或已改用标准 `imports`。
- [ ] 包的每个公开子路径同时存在运行时代码和声明入口。
- [ ] ESM/CJS 互操作在最低支持 Node 版本上经过真实测试。
- [ ] 前沿模块语法已核实运行时和构建工具支持。
- [ ] TypeScript 7 配置中没有遗留的 `baseUrl`、`node10` 或旧加载器模式。

## 官方资料

- [Modules - Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [ESM/CJS Interoperability](https://www.typescriptlang.org/docs/handbook/modules/appendices/esm-cjs-interop.html)
- [TypeScript 5.9: import defer](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html#support-for-import-defer)
- [Node.js ECMAScript Modules](https://nodejs.org/api/esm.html)
- [Node.js Packages: exports/imports](https://nodejs.org/api/packages.html)
- [MDN import attributes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with)

## 导航

← [类抽象类与面向对象](/kb/language/TypeScript/核心语法/10-类抽象类与面向对象/) | [声明文件类型包与库发布](/kb/language/TypeScript/核心语法/12-声明文件类型包与库发布/) →
