---
title: "TypeScript 7 版本迁移与最佳实践"
permalink: /kb/language/TypeScript/核心语法/15-TypeScript-7版本迁移与最佳实践/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "tsconfig 工程实践、测试与 JavaScript 迁移", link: /kb/language/TypeScript/核心语法/14-tsconfig工程实践测试与JS迁移/ }
next: false
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
::: abstract 版本基线
TypeScript 7.0 正式版于 **2026-07-08** 宣布发布。本章撰写时，npm `typescript` 包的 `latest` 页面显示稳定版 **7.0.2**。版本会继续变化，安装或升级前应以 npm registry 为准，而不是只依赖本文快照。
:::

## 1. 先理解这次大版本的性质

TypeScript 7 不是简单地在旧编译器上加几个语法特性，而是 TypeScript 工具链的原生 Go 端口。官方发布文称，完整构建通常获得 **8-12 倍**加速，并将其概括为“10x faster”。这是官方在特定真实大型仓库与机器上的典型完整构建结论，不代表每个小项目、增量构建或编辑器操作都固定加速 8-12 倍。

主要变化：

- 原生代码执行，并利用共享内存多线程。
- 解析、类型检查和输出可并行执行。
- `--watch` 基于新的跨平台文件监听基础重建。
- 编辑器服务采用 Language Server Protocol（LSP）。
- CLI、项目引用、检查、JS 输出和声明输出可用于生产。
- 7.0 **不提供稳定的编程 API**；官方预计 7.1 提供新的、且与旧 API 不同的 API。

因此迁移要分开验证：`tsc` CLI、编辑器 LSP、构建插件、框架嵌入式语言服务、直接调用 `typescript` API 的工具。

## 2. 安装与版本核验

```bash
npm install -D typescript@7.0.2
npx tsc --version
npm view typescript version
npm view typescript dist-tags
```

推荐锁定确切版本或使用 lockfile，CI 中用 `npm ci`。`npm view typescript version` 和 [npm 的 typescript 包页](https://www.npmjs.com/package/typescript) 是核验 `latest` 的直接来源；博客发布日期不是“当前最新补丁版本”的来源。

::: warning 不要把 `typescript@next` 当稳定版
`next` 是 nightly 通道，适合提前发现回归，不适合在未固定和未验证时直接进入生产流水线。
:::

## 3. LSP 与编辑器迁移

TypeScript 7 的编辑器基础是 LSP，可被 VS Code、Visual Studio、WebStorm 等现代编辑器集成。CLI 升级成功不代表编辑器正在使用同一版本。

验证事项：

- 编辑器是否启用了 TypeScript 7 语言服务器。
- 工作区 `npx tsc --version` 与编辑器状态栏/日志显示的版本是否一致。
- 自动导入、重命名、查找引用、语义高亮、inlay hints 等关键工作流是否正常。
- 团队成员和 CI 是否固定同一工具链，而不是混用全局 `tsc`。

在 7.0 发布时，VS Code 可使用官方 TypeScript 7 扩展；Visual Studio 可按工作区自动启用。具体入口可能随编辑器更新变化，应查看编辑器当前文档。

## 4. 7.0 没有稳定 API 的生态影响

许多工具不是执行 `tsc`，而是 `import "typescript"` 后调用 Compiler API 或 Language Service API。7.0 尚未提供该稳定 API，因此这些工具不能仅通过替换包版本完成迁移。

受影响类别包括：

- ESLint parser 或规则中的类型感知能力。
- 自定义 AST 转换器、codemod、文档生成器。
- webpack loader 或依赖 Compiler API 的插件。
- 嵌入 TypeScript 的框架编译器与语言服务。

官方预计 7.1 提供新的 API，但“预计”不是当前契约。不要为 7.0 编造或依赖未发布 API。

## 5. Vue、MDX、Astro、Svelte、Angular 的时间点限制

以下判断是 **2026-07-08 的 7.0 发布公告时间点** 状态，而不是永久结论：

- Vue、MDX、Astro、Svelte 等依赖 Volar 或其他嵌入式语言能力的工作流，通常暂时仍需 TypeScript 6.0。
- Angular 模板内的专门类型检查通常也不会直接使用 TypeScript 7。
- Angular 项目可尝试以 TypeScript 7 CLI 做项目级快速错误检测，同时编辑器/模板工具继续使用 TypeScript 6。
- Vue、MDX、Astro、Svelte 等项目在官方公告时更适合整体继续使用 6.0，等待生态明确支持。

升级前查看框架、语言插件和构建插件的兼容矩阵。不要仅因 `.ts` 文件能被 `tsc` 检查，就认定 `.vue`、`.astro`、`.svelte` 或模板表达式已由 TS 7 完整检查。

## 6. TypeScript 6 与 7 并存

官方提供 `@typescript/typescript6` 兼容包。它导出 TypeScript 6 API，并提供 `tsc6` 可执行文件，避免与 TS 7 的 `tsc` 冲突。

### 6.1 直接安装兼容包

```bash
npm install -D typescript@^7.0.2 @typescript/typescript6@^6.0.2
npx tsc --version
npx tsc6 --version
```

适合工具能明确导入 `@typescript/typescript6` 的情况。

### 6.2 让依赖仍从 `typescript` 导入 TS 6 API

某些工具通过 peer dependency 强制导入包名 `typescript`，可使用 npm alias：

```bash
npm install -D typescript@npm:@typescript/typescript6
```

```json
{
  "devDependencies": {
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

此方案只留下 `tsc6`，没有 TS 7 的 `tsc`。要同时获得两者，可再给 TS 7 建别名：

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "typecheck:legacy": "tsc6 -p tsconfig.json --noEmit"
  }
}
```

这里 npm 为 `@typescript/native` 安装的实际包仍是 TS 7，因此其 `tsc` binary 可用；名为 `typescript` 的依赖则满足仍需 6.0 API 的工具。安装后务必实际运行两个 `--version`，不要仅凭 `package.json` 推断 binary 链接结果。

## 7. 最稳妥的桥接版本：先到 6，再到 7

官方兼容目标是：能在 TypeScript 6.0 下通过、开启 `stableTypeOrdering`、且不依赖 `ignoreDeprecations` 的项目，原则上应与 7.0 有一致的检查和命令行行为。

推荐桥接步骤：

```jsonc
// TypeScript 6 过渡阶段
{
  "compilerOptions": {
    "stableTypeOrdering": true
  }
}
```

然后：

1. 在 TS 6 中删除 `ignoreDeprecations`，修完所有 6.0 弃用。
2. 开启 `stableTypeOrdering`，比较错误和 `.d.ts` 输出。
3. 对顺序敏感的推断增加显式变量注解或类型参数。
4. 再切换 TS 7，双跑检查、声明输出、测试和运行时构建。

`stableTypeOrdering` 在 TS 6 中可能让检查变慢，官方称某些代码库可达约 25%；它是迁移诊断工具，不是 6.x 长期性能优化项。TS 7 中该行为默认开启且不能关闭。

## 8. TS 7 现代默认值

| 配置 | TS 7 行为 | 迁移动作 |
| --- | --- | --- |
| `strict` | 默认 `true` | 修复严格错误；不得已时局部、暂时降级 |
| `module` | 默认 `esnext` | 根据 Node 或 bundler 显式配置 |
| `target` | 默认 `esnext` 前一个稳定 ES | 7.0 时为 ES2025；需要可复现时显式固定 |
| `noUncheckedSideEffectImports` | 默认 `true` | 修复拼错的副作用 import，补资源声明 |
| `libReplacement` | 默认 `false` | 仅确有自定义 lib 替换时配置 |
| `stableTypeOrdering` | 默认 `true`，不可关闭 | 接受确定性顺序并修复脆弱推断 |
| `rootDir` | 默认 `./` | 源码在 `src` 时显式写 `./src` |
| `types` | 默认 `[]` | 显式列出 `node`、`jest`、`vitest/globals` 等 |

典型迁移：

```diff
 {
   "compilerOptions": {
+    "rootDir": "./src",
+    "types": ["node"]
   },
   "include": ["src"]
 }
```

`types: ["*"]` 可恢复 TS 5.9 及以前自动枚举所有可见 `@types` 的行为，但会降低可预测性并可能增加检查成本。优先列出真实需要的全局类型包。

## 9. 已硬移除或成为硬错误的旧配置与语法

TypeScript 6 的迁移期弃用在 TypeScript 7 中不再可用。不要通过 `ignoreDeprecations` 继续拖延。

### 9.1 输出目标和迭代

- `target: "ES5"` 不再支持；最低转向 ES2015。仍需 ES5 时使用外部转译链，或暂留旧版 TS。
- `downlevelIteration` 不再支持，因为它只服务于 ES5 降级输出。

### 9.2 模块解析

- `moduleResolution: "node"` / `"node10"` 不再支持；直接运行于现代 Node 时选 `NodeNext`，交给 bundler/Bun 时通常选 `Bundler`。
- `moduleResolution: "classic"` 不再支持。
- `baseUrl` 不再支持。`paths` 不需要 `baseUrl`，把前缀写进每个映射值。

```diff
 {
   "compilerOptions": {
-    "baseUrl": "./src",
     "paths": {
-      "@app/*": ["app/*"]
+      "@app/*": ["./src/app/*"]
     }
   }
 }
```

TypeScript `paths` 仍不会重写输出 import；运行时/bundler 必须理解相同别名，或改用包 `exports` / `imports`。

### 9.3 模块输出

- `module: "amd"`、`"umd"`、`"systemjs"`、`"none"` 不再支持。
- 现代 bundler 一般使用 `ESNext` 或 `Preserve`；Node 使用 `NodeNext`。
- `outFile` 已移除；单文件打包交给 Rollup、esbuild、Vite、webpack 等 bundler。

### 9.4 互操作与严格模式

- `esModuleInterop: false` 不允许，安全互操作行为始终启用。
- `allowSyntheticDefaultImports: false` 不允许。
- `alwaysStrict: false` 不允许，代码按严格模式处理。

不要机械删除配置后忽略 import 行为变化。运行真实测试，特别检查 CommonJS 默认导入和 ESM 边界。

### 9.5 旧命名空间语法

```ts
// 错误：旧式内部模块写法
module Legacy {
  export const value = 1;
}

// 正确：namespace
namespace Legacy {
  export const value = 1;
}

// 仍支持：声明外部模块
declare module "virtual-module" {
  export const value: number;
}
```

### 9.6 import assertions 改为 import attributes

```ts
// 旧语法：不再支持
// import data from "./data.json" assert { type: "json" };

// 新语法
import data from "./data.json" with { type: "json" };
```

用户有时会写成 `asserts`，但 ECMAScript 旧语法关键字实际是 `assert`；迁移结论相同：统一改为 `with`。同时验证目标运行时或 bundler 是否支持 import attributes。

## 10. `rootDir` 与 `types` 的高频故障

### 10.1 输出目录突然多一层 `src`

```jsonc
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

TS 7 不再根据全部输入推断共同源码目录。测试若位于 `tests`，应使用单独 `noEmit` 测试配置，或把 `rootDir` 调整为能覆盖全部需要输出的源文件。

### 10.2 `process`、`describe` 或内建模块类型消失

```jsonc
{
  "compilerOptions": {
    "types": ["node", "vitest/globals"]
  }
}
```

先安装对应类型包，再列入 `types`。普通模块 import 的类型通常仍按模块解析加载；`types` 主要控制哪些 `@types` 包向全局作用域注入声明。

## 11. Unicode 模板字面量类型变化

TypeScript 7 的模板字面量推断按 Unicode code point 更自然地拆分，而不是把代理对拆成两个 UTF-16 code unit。

```ts
type HeadTail&lt;S&gt; = S extends `${infer Head}${infer Tail}`
  ? [Head, Tail]
  : never;

type Result = HeadTail<"😀abc">;
// TS 7: ["😀", "abc"]
// 旧行为: ["\ud83d", "\ude00abc"]
```

这更接近 `for...of` 和 `[...text]`。但故意模拟 JS 字符串索引或 UTF-16 code unit 长度的类型体操会改变结果。搜索模板字面量递归、字符串 `Length`、`Split`、`CamelCase` 等工具，并增加 emoji、组合字符和非 BMP 字符测试。

注意：code point 仍不等于用户看到的 grapheme cluster。例如某些旗帜、肤色修饰或家庭 emoji 由多个 code point 组成。

## 12. JavaScript 与 JSDoc 差异

TypeScript 7 重做 JS 支持，使其更接近 `.ts` 文件分析，并移除一些 Closure/JSDoc 历史特例。

| 旧写法/行为 | TS 7 迁移方向 |
| --- | --- |
| 在类型位置直接使用值 | 写 `typeof someValue` |
| `@enum` 特殊识别 | 用 `@typedef` 从值对象导出联合类型 |
| 独立 `?` 表示类型 | 使用 `any` |
| `@class` 把函数变构造器 | 改为真正 `class` 声明 |
| JSDoc 类型后缀 `!` | 直接使用 `T` |
| typedef 名写在相邻标识符上 | 在 `@typedef` tag 内声明名称 |
| Closure `function(string): void` | 改为 `(s: string) => void` |

示例：

```js
const Status = /** @type {const} */ ({
  ready: "ready",
  failed: "failed",
});

/** @typedef {(typeof Status)[keyof typeof Status]} StatusValue */

/** @param {StatusValue} status */
export function render(status) {
  return status.toUpperCase();
}
```

此外，给 `this` 建别名、整体重写函数 `prototype` 等旧模式不再获得某些特殊推断。JS 项目应先在 TS 7 分支运行 `allowJs` + `checkJs`，并查阅官方 [`CHANGES.md`](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md) 的最新差异。

## 13. 单文件编译行为

当当前目录存在 `tsconfig.json` 时，直接传文件路径会导致配置被忽略。TS 7 不再允许这种静默歧义：

```bash
# 正常：按项目检查
npx tsc -p tsconfig.json --noEmit

# 正常：明确忽略配置，以 CLI 规则检查单文件
npx tsc --ignoreConfig scratch.ts --noEmit --target ES2022
```

不要在脚本中依赖 `tsc src/index.ts` 恰好采用某些默认值。为长期任务创建明确的 project config。

## 14. 并行性能参数不是越大越好

```bash
npx tsc --checkers 4
npx tsc -b --checkers 2 --builders 2
npx tsc --singleThreaded
```

- `--checkers` 控制类型检查 worker，7.0 默认 4。
- `--builders` 控制 `--build` 时并行项目数。
- 两者并发量可相乘，必须监控峰值内存。
- `--singleThreaded` 适合调试、外层已经并行或资源很少的 CI。
- 这些是 7.0 实验性控制项；先基准测试，再固定团队值。

比较性能时应固定依赖、冷/热缓存、机器、checker 数和构建模式。不要拿 TS 6 单线程冷构建与 TS 7 热缓存高并发结果作不透明宣传。

## 15. 分层升级策略

### 阶段 A：盘点

```bash
npx tsc --version
npx tsc --showConfig
npm ls typescript
```

记录：

- 所有直接导入 `typescript` 的工具。
- 框架、编辑器插件、测试 runner、loader 与 lint parser。
- 所有 tsconfig 的继承和 Project References。
- JS/JSDoc 文件比例、声明输出、旧模块目标和路径别名。

### 阶段 B：在 TypeScript 6 清债

- 删除 `ignoreDeprecations` 并修复弃用。
- 开启 `stableTypeOrdering`。
- 显式设置 `rootDir`、`types`、`target`、模块策略。
- 将 ES5 或单文件 bundle 需求移交外部构建工具。

### 阶段 C：双跑

```json
{
  "scripts": {
    "typecheck:7": "tsc -p tsconfig.json --noEmit",
    "typecheck:6": "tsc6 -p tsconfig.json --noEmit"
  }
}
```

比较诊断、`.d.ts`、JS 输出、测试和构建产物。不要要求错误或类型展示文本字符级完全相同；应判断语义差异，并把可疑最小复现提交官方 issue。

### 阶段 D：先迁 CLI，再迁生态工具

- 先让 TS 7 负责无 API 依赖的 CLI 类型检查。
- 需 Compiler API 的工具继续使用 TS 6 兼容包。
- 嵌入式语言等待框架官方支持。
- 观察一段时间的 CI 内存、耗时、watch 稳定性和编辑器崩溃率。

### 阶段 E：收口

- 固定 TS 7 补丁版本和 lockfile。
- 删除临时双跑脚本前保留回滚分支/变更记录。
- 7.1 发布后重新评估 API 工具，而不是自动移除 TS 6。
- 更新贡献文档和 IDE 设置，确保新成员使用同一 LSP。

## 16. 回滚策略

回滚不是 `git reset` 式的粗暴操作，而是预先设计的依赖切换：

- 保留能在 TS 6 `stableTypeOrdering` 下通过的配置。
- 将 TS 版本变更单独提交，避免与大规模业务重构混合。
- lockfile 与配置一起评审。
- 对框架项目保留 TS 6 alias 或独立检查命令。
- 声明输出库保存 API 报告或 `.d.ts` 快照，发现破坏时可快速比较。

## 17. 常见误区

::: failure “Go 端口意味着生成 Go 或改变 JS 运行时”
错。Go 用来实现 TypeScript 编译器/语言服务；你的应用仍输出并运行 JavaScript。
:::

::: failure “CLI 快 10 倍，所以所有插件都自动兼容”
错。7.0 无稳定 API，嵌入式语言和 Compiler API 工具是独立迁移面。
:::

::: failure “`lib: ["ESNext"]` 会给旧 Node 安装新 API”
错。`lib` 只提供类型声明，运行时需要真实实现或 polyfill。
:::

::: failure “删除 `baseUrl` 后 `paths` 就能在 Node 运行”
错。TypeScript 路径解析与运行时解析仍须对齐。
:::

::: failure “升级失败就加 `ignoreDeprecations`”
错。TS 7 已硬移除相关选项，迁移应在 TS 6 阶段完成。
:::

## 18. 升级检查清单

- [ ] 从 npm `latest` / registry 核验当前稳定版，并锁定补丁版本。
- [ ] 在 TS 6 下清除弃用，开启 `stableTypeOrdering`。
- [ ] 审计 `typescript` Compiler API 的直接和间接消费者。
- [ ] 为 Vue、MDX、Astro、Svelte、Angular 核对当下官方兼容状态。
- [ ] 显式配置 `rootDir` 与所需 `types`。
- [ ] 固定合适的 `target`、`module`、`moduleResolution`。
- [ ] 删除 ES5、`downlevelIteration`、旧 module/moduleResolution、`baseUrl`、`outFile` 等旧配置。
- [ ] 将 import `assert` 改为 `with`，并验证运行时支持。
- [ ] 测试 Unicode 模板字面量类型工具。
- [ ] 在 JS/JSDoc 项目中修复 TS 7 的分析差异。
- [ ] 双跑 CLI 检查、声明输出、测试和真实构建。
- [ ] 基于 CPU/内存测量调整 `checkers` / `builders`。
- [ ] 分开验证 CLI 与编辑器 LSP 的版本和功能。
- [ ] 准备 TS 6 并存或可逆切换，而不是阻塞整个升级。

## 19. 练习

1. 找一份 TS 5/6 风格配置，移除 `baseUrl`、`node10` 和 `outFile`，设计现代替代链。
2. 在 TS 6 开启 `stableTypeOrdering`，对比声明文件并为不稳定推断增加显式注解。
3. 使用 npm alias 同时安装 TS 7 CLI 与 TS 6 API，写脚本打印两个编译器版本。
4. 为一个包含 emoji 的模板字面量类型工具增加 TS 7 测试，并说明 code point 与 grapheme 的区别。
5. 审计一个 Vue/Svelte/Angular 项目，列出 CLI、编辑器、模板检查、lint 四条链各自使用的 TS 版本。

## 20. 官方资料与版本来源

- [Announcing TypeScript 7.0（2026-07-08）](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [npm: typescript（核验 latest 与补丁版本）](https://www.npmjs.com/package/typescript)
- [npm registry dist-tags](https://registry.npmjs.org/-/package/typescript/dist-tags)
- [TypeScript 6.0 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [TypeScript Native Port / typescript-go](https://github.com/microsoft/typescript-go)
- [typescript-go CHANGES.md](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md)
- [VS Code TypeScript 7 Extension](https://marketplace.visualstudio.com/items?itemName=TypeScriptTeam.native-preview)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig/)

::: info 时效说明
本章关于 7.0.2、编辑器扩展和嵌入式语言限制的描述以 2026-08-02 可查资料为基线。版本号和生态兼容性具有时效性；升级实施时应再次核验 npm、TypeScript 官方公告及框架维护者文档。
:::

---

← [tsconfig工程实践测试与JS迁移](/kb/language/TypeScript/核心语法/14-tsconfig工程实践测试与JS迁移/) | [TypeScript 7.0 核心语法教程索引](/kb/language/TypeScript/核心语法/00-TypeScript-7.0-核心语法教程索引/) →
