---
title: "TypeScript 7.0 核心语法教程"
permalink: /kb/language/TypeScript/核心语法/00-TypeScript-7.0-核心语法教程索引/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "安装工具链与第一个项目", link: /kb/language/TypeScript/核心语法/01-安装工具链与第一个项目/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: TypeScript 7.0 核心语法教程
aliases:
  - TypeScript 最新版核心语法教程
  - TS 核心语法教程
tags:
  - TypeScript
  - TypeScript7
  - JavaScript
  - 编程语言
  - 语法教程
created: 2026-08-02
---

# TypeScript 7.0 核心语法教程

::: abstract 版本基线
本系列以 **TypeScript 7.0.2** 为工具链基线。TypeScript 7.0 于 **2026-07-08** 正式发布，npm registry 在本教程编写时将 `7.0.2` 标记为 `latest`。TypeScript Handbook 负责解释长期稳定的语言与类型系统知识；7.0 的原生工具链、默认值和迁移行为以官方发布公告为准。
:::

::: important TypeScript 版本不等于 JavaScript 运行时版本
TypeScript 版本决定检查器、语言服务、配置能力和部分类型语法；`target` 决定输出 JavaScript 的语法级别；`lib` 决定编译器假定运行环境提供哪些 API；Node.js、浏览器或 bundler 才决定代码最终能否解析和运行。类型检查通过不代表外部数据已经在运行时验证。
:::

## 教程定位

本系列根据官方 [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)、[Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/introduction.html)、[TSConfig Reference](https://www.typescriptlang.org/tsconfig/) 和 TypeScript 7.0 发布公告编写，目标是建立一套可以直接用于现代 Node.js、浏览器和 bundler 项目的类型系统与工程心智模型。

TypeScript 是 JavaScript 的静态类型检查层。大部分类型语法会在输出时被擦除，运行时仍遵循 JavaScript 语义。因此学习重点不只是“给变量标类型”，还包括：让控制流缩小类型、从已有类型构造新类型、准确建模模块与声明文件，以及让编译器配置匹配真实运行环境。

## 章节目录

### [安装工具链与第一个项目](/kb/language/TypeScript/核心语法/01-安装工具链与第一个项目/)

安装并锁定 TypeScript 7.0.2，使用 `npx tsc`、npm scripts、`tsconfig.json` 完成检查与输出，并理解类型擦除和 TS 7 原生 Go 工具链。

### [基础类型变量与类型推断](/kb/language/TypeScript/核心语法/02-基础类型变量与类型推断/)

学习基本类型、数组、字面量、类型推断与拓宽，以及 `any`、`unknown`、`never`、`void`、空值、类型断言、`as const` 和 `satisfies`。

### [对象类型接口与类型别名](/kb/language/TypeScript/核心语法/03-对象类型接口与类型别名/)

使用对象类型、可选与只读属性、索引签名、interface、type、交叉类型和 tuple 建模数据，并理解结构化类型系统和多余属性检查。

### [函数类型重载与this](/kb/language/TypeScript/核心语法/04-函数类型重载与this/)

掌握函数类型表达式、调用/构造签名、上下文类型、可选与 rest 参数、回调、重载、显式 `this` 和 `void` 的特殊可赋值规则。

### [联合交叉窄化与穷尽检查](/kb/language/TypeScript/核心语法/05-联合交叉窄化与穷尽检查/)

通过 `typeof`、相等判断、`in`、`instanceof`、类型谓词和断言函数窄化联合类型，使用可辨识联合与 `never` 完成穷尽检查。

### [泛型约束与类型参数设计](/kb/language/TypeScript/核心语法/06-泛型约束与类型参数设计/)

使用泛型表达输入与输出关系，掌握约束、推断、默认参数、`keyof` 约束、const 类型参数和可维护的类型参数设计原则。

### [keyof typeof索引访问与类型查询](/kb/language/TypeScript/核心语法/07-keyof-typeof索引访问与类型查询/)

区分值空间和类型空间，组合 `keyof`、类型位置的 `typeof` 与索引访问类型，从真实常量和对象安全地产生类型。

### [条件类型映射类型与模板字面量](/kb/language/TypeScript/核心语法/08-条件类型映射类型与模板字面量/)

使用条件类型、`infer`、分布式条件、映射修饰符、键重映射和模板字面量类型构建可复用类型转换，并了解 TS 7 的 Unicode 推断变化。

### [工具类型与类型体操实践](/kb/language/TypeScript/核心语法/09-工具类型与类型体操实践/)

系统使用 `Partial`、`Pick`、`Omit`、`Record`、`Awaited`、`ReturnType`、`NoInfer` 等内置工具类型，并控制类型体操的复杂度。

### [类抽象类与面向对象](/kb/language/TypeScript/核心语法/10-类抽象类与面向对象/)

学习字段初始化、可见性、`#private`、继承、实现、抽象类、`override`、访问器、静态成员、this 类型和类的值/类型双重身份。

### [模块ESM CommonJS与模块解析](/kb/language/TypeScript/核心语法/11-模块ESM-CommonJS与模块解析/)

理解 ESM 与 CommonJS、类型导入、NodeNext 与 Bundler 解析、文件扩展名、package `exports`/`imports`、import attributes 和路径别名边界。

### [声明文件类型包与库发布](/kb/language/TypeScript/核心语法/12-声明文件类型包与库发布/)

编写和消费 `.d.ts`、ambient declaration、`@types`、模块扩充与全局声明，生成声明输出并正确发布现代 TypeScript 库。

### [Promise异步迭代器与资源管理](/kb/language/TypeScript/核心语法/13-Promise异步迭代器与资源管理/)

为 Promise、`async`/`await`、异步迭代器、生成器、取消信号和 `using`/`await using` 资源管理建立准确的类型与运行时模型。

### [tsconfig工程实践测试与JS迁移](/kb/language/TypeScript/核心语法/14-tsconfig工程实践测试与JS迁移/)

设计 Node 与 bundler 配置，使用严格检查、project references、`--build`、`--watch` 和 TS 7 并行选项，并通过 `allowJs`、`checkJs`、JSDoc 渐进迁移 JavaScript。

### [TypeScript 7版本迁移与最佳实践](/kb/language/TypeScript/核心语法/15-TypeScript-7版本迁移与最佳实践/)

梳理 TS 7 原生端口、LSP、生态兼容限制、6/7 并存方案、现代默认值、已移除选项、Unicode 变化和完整升级检查清单。

## 推荐路线

| 学习目标 | 推荐章节 |
|---|---|
| 从 JavaScript 入门 TypeScript | 01 → 02 → 03 → 04 → 05 |
| 掌握类型系统进阶能力 | 05 → 06 → 07 → 08 → 09 |
| 开发 Node.js 或 Web 应用 | 01、02、04、05、11、13、14 |
| 编写和发布 npm 库 | 03、04、06、08、11、12、14 |
| 从 TypeScript 5.x/6.x 升级 | 11、12、14、15 |
| 从 JavaScript 渐进迁移 | 02、03、05、12、14 |

## TypeScript 核心心智模型

1. TypeScript 在编译期检查 JavaScript；类型通常被擦除，不会自动产生运行时校验。
2. 优先利用推断，只在公共边界、复杂结构或需要稳定契约的位置显式标注。
3. `unknown` 表示“值未知，使用前必须检查”；`any` 表示退出检查，应限制在明确隔离的迁移边界。
4. TypeScript 采用结构化类型系统：兼容性主要取决于成员形状，而非类型声明名称。
5. 联合类型表示值可能属于多个集合；使用 JavaScript 控制流把它窄化后，才能安全使用成员专有能力。
6. 可辨识联合让状态与其数据保持关联，通常比“一个对象加许多可选字段”更安全。
7. 泛型用于保存多个位置之间的类型关系，不是给所有函数机械添加 `&lt;T&gt;`。
8. `keyof`、索引访问、条件类型和映射类型应从既有契约派生新类型，避免重复维护同一事实。
9. 模块配置必须模拟实际运行环境；`paths` 只影响 TypeScript 解析，不会替你重写运行时 import。
10. `.d.ts` 描述 JavaScript 的静态形状，每个声明都必须与真实运行时导出一致。
11. `target`、`lib`、`module`、`moduleResolution` 和 `types` 解决不同问题，不能用一个选项代替另一个。
12. 外部输入、JSON、环境变量和网络响应在运行时仍是未知数据，应先验证，再让类型系统传播已验证事实。

## TypeScript 7.0 重点

- 编译器与语言服务采用原生 Go 实现，官方在大型项目完整构建中报告通常约 8-12 倍加速。
- 解析、检查、输出和 project reference 构建可以并行，`--watch` 也采用新的文件监听基础。
- 7.0 提供 CLI 与 LSP，但没有稳定的程序化 Compiler API；直接嵌入旧 TypeScript API 的工具需要保留 6.x 或等待生态适配。
- `strict`、`noUncheckedSideEffectImports` 默认开启，`module` 默认 `esnext`，`types` 默认 `[]`，`rootDir` 默认配置目录 `./`。
- ES5 输出、旧模块模式、`node10`/`classic` 解析、`baseUrl`、`outFile` 等旧配置在 7.0 中不再支持。

## 官方资料

- [TypeScript 官方文档入口](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Type Manipulation](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/introduction.html)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript npm package](https://www.npmjs.com/package/typescript)
- [TypeScript GitHub repository](https://github.com/microsoft/TypeScript)

## 使用建议

每章示例默认采用严格类型检查。标注为错误示例的代码用于解释诊断，不应直接与可运行示例混在同一个项目中。遇到版本或运行环境差异时，先运行：

```bash
node --version
npm view typescript version
npx tsc --version
npx tsc --showConfig
```

然后分别核对编译器版本、最终合并配置和真实运行时能力。
