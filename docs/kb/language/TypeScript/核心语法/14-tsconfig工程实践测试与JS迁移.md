---
title: "tsconfig 工程实践、测试与 JavaScript 迁移"
permalink: /kb/language/TypeScript/核心语法/14-tsconfig工程实践测试与JS迁移/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Promise、异步迭代器与资源管理", link: /kb/language/TypeScript/核心语法/13-Promise异步迭代器与资源管理/ }
next: { text: "TypeScript 7 版本迁移与最佳实践", link: /kb/language/TypeScript/核心语法/15-TypeScript-7版本迁移与最佳实践/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
::: abstract 本章目标
从“让编辑器不报错”升级到“构建一个边界明确、可复现、适合 Node.js 或 bundler 的 TypeScript 工程”，并理解 TypeScript 7 的现代默认值、并行参数、项目引用、测试类型检查与渐进式 JS 迁移。
:::

## 1. `tsconfig.json` 定义一个 Program

`tsconfig.json` 不只是选项集合。它同时回答两个问题：

1. 哪些文件进入 TypeScript Program？
2. 这些文件按什么宿主、模块和严格度规则检查或输出？

查看最终配置和实际文件集合：

```bash
npx tsc --showConfig
npx tsc --explainFiles
npx tsc --listFilesOnly
```

## 2. 文件选择：`files`、`include`、`exclude`

### 2.1 `files` 是显式白名单

```jsonc
{
  "files": ["src/index.ts", "src/global.d.ts"]
}
```

适合入口极少且要求精确的项目。列出的文件不存在时会报错。

### 2.2 `include` 是 glob 入口集合

```jsonc
{
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

模式相对于配置文件所在目录解析。开启 `allowJs` 后，相应模式也可纳入 `.js` / `.jsx`。

### 2.3 `exclude` 只过滤 `include` 的发现结果

```jsonc
{
  "include": ["src/**/*"],
  "exclude": ["src/generated/**/*"]
}
```

如果 `src/index.ts` 导入了 `src/generated/client.ts`，后者仍会进入 Program。`exclude` 不是模块防火墙；import、`files`、`types`、三斜线引用都可能把文件带回来。

常见陷阱：

- 只写 `exclude: ["tests"]`，却从生产代码导入了测试工具。
- 把 `outDir` 放进源码目录，引发输出再次被扫描。
- 误以为 `rootDir` 决定输入文件；它主要控制输入到输出的目录映射和边界。
- 没有写 `files` 时，`include` 默认近似 `**/*`，可能意外纳入脚本。

## 3. `extends`：共享配置但保留环境边界

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

```jsonc
// packages/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2025", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

后一个配置覆盖前一个配置。特别注意，派生配置中的 `files`、`include`、`exclude` 会覆盖而不是拼接基配置中的同名字段；`references` 不从基配置继承。相对路径按“声明该路径的配置文件”解析。

## 4. TypeScript 7 的现代默认值

TypeScript 7 沿用 6.0 引入的现代默认方向。即使默认存在，团队配置仍建议显式写出关键意图，避免升级或工具差异造成误解。

| 选项 | TS 7 默认 | 工程含义 |
| --- | --- | --- |
| `strict` | `true` | 开启严格检查家族 |
| `module` | `esnext` | 默认保留现代 ESM |
| `target` | `esnext` 前一个稳定 ECMAScript 版本 | 随版本变化的现代输出基线；7.0 时是 ES2025 |
| `noUncheckedSideEffectImports` | `true` | 检查仅副作用 import 是否可解析 |
| `rootDir` | `./` | 默认是配置文件目录，不再推断共同源码目录 |
| `types` | `[]` | 不再自动枚举全部可见 `@types` 包 |
| `stableTypeOrdering` | `true` 且不可关闭 | 保证适合并行检查的确定性类型顺序 |

推荐把环境依赖写清楚：

```jsonc
{
  "compilerOptions": {
    "target": "ES2025",
    "module": "ESNext",
    "strict": true,
    "noUncheckedSideEffectImports": true,
    "rootDir": "./src",
    "types": []
  },
  "include": ["src"]
}
```

`target` 默认是浮动值，应用若需要可复现的部署基线，应显式固定。库作者也应根据消费者环境选择基线，而不是无条件追逐 `ESNext`。

## 5. 高价值严格选项

`strict` 很重要，但不包含所有有价值的检查。

### 5.1 `noUncheckedIndexedAccess`

```ts
const scores: Record<string, number> = {};
const score = scores["Ada"]; // number | undefined

if (score !== undefined) {
  console.log(score.toFixed(1));
}
```

它让数组越界和未知键访问更符合运行时事实。迁移时应补边界判断，不要到处加 `!`。

### 5.2 `exactOptionalPropertyTypes`

```ts
interface Options {
  theme?: "light" | "dark";
}

const a: Options = {};                    // 属性缺失
// const b: Options = { theme: undefined }; // 除非类型显式包含 undefined
```

“属性不存在”和“属性存在且值为 `undefined`”在 `in`、对象展开、序列化中并不等价。

### 5.3 `useUnknownInCatchVariables`

严格模式默认启用。错误必须先缩窄：

```ts
try {
  await runJob();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
}
```

### 5.4 `noImplicitOverride`

```ts
class BaseStore {
  save(): void {}
}

class UserStore extends BaseStore {
  override save(): void {}
}
```

基类重命名成员时，子类不会悄悄留下一个看似覆写、实际无关的方法。

可按团队需要再评估 `noImplicitReturns`、`noFallthroughCasesInSwitch`、`noPropertyAccessFromIndexSignature`。不要一次开启所有风格类选项后用大量抑制注释“修复”。

## 6. `target`、`lib`、`types`、`module` 各管什么

| 选项 | 核心问题 | 不负责什么 |
| --- | --- | --- |
| `target` | 输出使用哪个 ECMAScript 语法基线 | 不保证运行时存在某个 Web/Node API |
| `lib` | 哪些标准库/宿主全局声明可见 | 不安装 polyfill，不改变模块解析 |
| `types` | 哪些 `@types/*` 包注入全局作用域 | 不限制正常 import 的包类型解析 |
| `module` | 模块语义及/或输出格式 | 不等同于 `package.json` 的 `type` |
| `moduleResolution` | TypeScript 如何模拟宿主解析 import | 不会让运行时理解 `paths` 别名 |

浏览器项目示例：

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "types": ["vite/client"]
  }
}
```

Node 项目通常不应加入 `DOM` 只为“借到”某个同名全局类型。应安装与运行时版本匹配的 `@types/node`，并显式写 `types: ["node"]`。

## 7. Node.js 与 bundler 配置

### 7.1 直接由现代 Node.js 执行

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "strict": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

配合 `package.json` 的 `"type": "module"`、文件扩展名和包 `exports` 使用。Node ESM 的相对 import 通常需要运行时扩展名，例如源码中写 `./util.js`，TypeScript 会解析到对应 `.ts` 源文件。

### 7.2 由 Vite、Rollup、esbuild 等打包

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "isolatedModules": true,
    "types": ["vite/client"],
    "strict": true
  },
  "include": ["src", "vite.config.ts"]
}
```

此时 bundler 负责转译、资源 import 和产物，`tsc` 负责类型检查。不要用 TypeScript 的 `paths` 假装配置了运行时别名；bundler、测试运行器和 Node 都要有一致映射，或优先使用 `package.json#imports`。

## 8. `noEmit` 与构建职责分离

前端常见脚本：

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "build": "npm run typecheck && vite build"
  }
}
```

`noEmit` 表示 TypeScript 不写 JS、声明和 sourcemap；它不代表“跳过检查”。构建器若只做逐文件转译，通常不会执行完整类型检查，所以 CI 必须单独运行 `tsc`。

## 9. Project References 与 `tsc -b`

大型仓库可把 Program 拆成有向无环图。

```jsonc
// tsconfig.json（solution config）
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/app" }
  ]
}
```

```jsonc
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

```jsonc
// packages/app/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "references": [{ "path": "../core" }],
  "include": ["src"]
}
```

常用命令：

```bash
npx tsc -b
npx tsc -b --watch
npx tsc -b --clean
npx tsc -b --verbose
```

`composite` 让项目满足可引用约束并生成增量元数据。引用描述构建顺序，不应循环。包的运行时解析仍应通过 workspace 包、`exports` 或实际产物设计完成。

## 10. Watch 与 TypeScript 7 并行控制

TypeScript 7 重建了 `--watch`，并默认并行执行解析、检查和输出。它提供三个实验性 CLI 参数用于容量调优：

```bash
npx tsc --watch
npx tsc --checkers 4
npx tsc -b --checkers 2 --builders 2
npx tsc --singleThreaded
```

| 参数 | 作用 | 注意事项 |
| --- | --- | --- |
| `--checkers N` | 类型检查 worker 数，默认 4 | 增加可能更快，也会增加内存和重复工作 |
| `--builders N` | `--build` 下并行项目 builder 数 | 与 checkers 有乘法效应 |
| `--singleThreaded` | 解析、检查和输出全部单线程 | 适合调试、受限环境和外部并行编排 |

例如 `--checkers 4 --builders 4` 最多可能同时运行 16 个 checker，CI 小机器容易内存紧张。先记录基线，再按 CPU、内存和项目依赖图测量；这些参数在 7.0 是实验性参数，不要把经验值当永久默认。

少数项目可能因顺序敏感推断而随 checker 数出现差异。团队可固定 checker 数，并通过显式类型参数或变量注解消除脆弱推断。

## 11. 测试也必须进入类型检查

生产代码与测试的宿主全局不同，推荐独立配置：

```jsonc
// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

```json
{
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "typecheck:test": "tsc -p tsconfig.test.json --noEmit",
    "test": "vitest run",
    "ci": "npm run typecheck && npm run typecheck:test && npm test"
  }
}
```

运行测试不等于测试通过类型检查。许多测试 runner 使用快速转译器，会忽略跨文件类型错误。

### 11.1 测试类型本身

可使用 `satisfies` 和 `@ts-expect-error` 编写类型契约测试：

```ts
type UserId = string & { readonly __brand: unique symbol };
declare function findUser(id: UserId): Promise&lt;User&gt;;

// @ts-expect-error 普通 string 不应被当作 UserId
findUser("u1");
```

`@ts-expect-error` 在下一行不再报错时会反向报错，适合验证拒绝案例；不要用不会自校验的 `@ts-ignore` 替代。类型测试仍需由 `tsc` 或专门类型测试工具执行。

## 12. `allowJs`、`checkJs` 与分阶段迁移

### 阶段一：把 JS 纳入项目但暂不全面检查

```jsonc
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

TypeScript 能解析模块图并为 JS 提供部分编辑器能力。

### 阶段二：开启 JS 检查并用 JSDoc 补边界

```js
// @ts-check

/**
 * @typedef {{ id: string, name: string }} User
 */

/**
 * @param {string} id
 * @returns {Promise&lt;User&gt;}
 */
export async function loadUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

全局可设置 `checkJs: true`，单文件使用 `// @ts-check` 提前试点；遗留文件可临时 `// @ts-nocheck`，但应记录清理计划。

### 阶段三：按叶子模块迁移到 `.ts`

优先迁移无环依赖底部、数据边界和高变更模块。保持运行时行为不变，先用 JSDoc 稳定契约，再改扩展名和消除 `any`。

### 12.1 JSDoc 注意事项

- JSDoc 能表达泛型、联合、导入类型和 typedef，但不等于完整 TS 语法。
- `checkJs` 下对象属性、构造函数和 CommonJS 模式有 JS 专属推断规则。
- TypeScript 7 收紧并统一了部分 JS/JSDoc 行为，升级前应查阅 `typescript-go/CHANGES.md`。
- 类型注释会在运行时被忽略，外部 JSON 仍需真实校验。

## 13. 单文件命令与 TS 7 `--ignoreConfig`

历史上在含 `tsconfig.json` 的目录运行 `tsc file.ts` 会悄悄忽略配置，导致 `strict`、`lib`、`module` 等规则完全不同。TypeScript 7 将这种歧义作为错误。

```bash
# 检查配置定义的整个项目
npx tsc -p tsconfig.json --noEmit

# 明确忽略当前目录的 tsconfig，用 CLI 默认/显式参数处理单文件
npx tsc --ignoreConfig scratch.ts --noEmit --target ES2022
```

不能把 `-p` 与源文件参数混用。若只想长期检查一个文件，创建专用配置并使用 `files`，比依赖一长串 CLI 参数更可复现。

## 14. 一个可落地的配置拆分

```text
project/
├── tsconfig.base.json
├── tsconfig.json
├── tsconfig.test.json
├── src/
└── tests/
```

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noUncheckedSideEffectImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

`skipLibCheck` 只跳过声明文件内部一致性检查，不会让应用代码变安全，也不修复重复依赖类型。遇到类型冲突应先统一依赖版本，把它作为性能/迁移权衡而不是万能开关。

## 15. 排错路径

1. 用 `npx tsc --version` 确认实际编译器版本。
2. 用 `--showConfig` 确认继承后的最终选项。
3. 用 `--explainFiles` 查明意外文件为何进入 Program。
4. 用 `--traceResolution` 诊断模块和类型包解析。
5. 区分 TypeScript 解析成功与 Node/bundler 运行时解析成功。
6. 用 `--extendedDiagnostics` 建立性能基线，再调整并行参数。
7. 在 CI 中分别运行源码类型检查、测试类型检查、运行时测试和真实构建。

## 16. 练习

1. 为一个 Node ESM 项目编写 `NodeNext` 配置，并解释源码 import 为什么写 `.js` 后缀。
2. 为同一仓库拆分 browser 与 test 配置，使 `document` 只在 browser 项目可见，`describe` 只在 test 项目可见。
3. 开启 `noUncheckedIndexedAccess` 和 `exactOptionalPropertyTypes`，修复错误但禁止使用非空断言。
4. 创建两个带 Project References 的包，用 `tsc -b --verbose` 观察构建顺序。
5. 选择一份 JS 模块，依次经历 `allowJs`、`checkJs`、JSDoc、重命名 `.ts` 四个阶段。

## 17. 工程检查清单

- [ ] `include` / `files` 明确，`exclude` 没被误当防火墙。
- [ ] 环境配置通过 `extends` 复用规则，但各自声明 `lib` 与 `types`。
- [ ] 显式固定部署所需 `target`，不盲从浮动默认值。
- [ ] Node 使用 `NodeNext`，bundler 项目使用匹配其行为的 `Bundler`。
- [ ] bundler 构建之外单独执行 `tsc --noEmit`。
- [ ] 测试源码也经过类型检查。
- [ ] 大仓库根据测量采用 Project References 和并行参数。
- [ ] JS 迁移以边界和模块为单位，不靠全局 `any` 一次过关。
- [ ] 单文件检查在 TS 7 中明确使用 `--ignoreConfig` 或专用配置。

## 18. 官方资料

- [TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [TypeScript Handbook: What is a tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [TypeScript Handbook: Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TypeScript Handbook: Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [TypeScript Handbook: Type Checking JavaScript Files](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

---

← [Promise异步迭代器与资源管理](/kb/language/TypeScript/核心语法/13-Promise异步迭代器与资源管理/) | [返回索引](/kb/language/TypeScript/核心语法/00-TypeScript-7.0-核心语法教程索引/) | [TypeScript 7版本迁移与最佳实践](/kb/language/TypeScript/核心语法/15-TypeScript-7版本迁移与最佳实践/) →
