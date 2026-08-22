---
title: "JavaScript 概述"
permalink: /kb/language/JavaScript/核心语法/01-JavaScript概述/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: false
next: { text: "HTML 中的 JavaScript", link: /kb/language/JavaScript/核心语法/02-HTML中的JavaScript/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: JavaScript 概述
tags:
  - javascript
  - js-core
  - web
---

# JavaScript 概述

> 章节映射：《JavaScript 高级程序设计》第 4 版第 1 章。本笔记以现代开发环境重新组织概念。

## 学习目标

- 理解 JavaScript、ECMAScript、DOM 与宿主环境之间的关系
- 知道 JavaScript 从浏览器脚本发展为通用语言的关键原因
- 能区分语言标准、运行时能力与第三方工具
- 建立可复现、可调试的本地练习方式

## 1. JavaScript 不只是一门“网页脚本语言”

JavaScript 最初用于给网页增加交互，如今已经覆盖浏览器、服务器、桌面应用、移动端、自动化脚本等场景。它的核心语言由 ECMAScript 标准定义，而具体环境再提供额外能力。

可以把常见的浏览器 JavaScript 理解成三层：

1. **ECMAScript**：语法、类型、对象、模块、异步机制等语言核心。
2. **Web API**：由浏览器提供的 DOM、Fetch、定时器、存储等接口。
3. **工具生态**：npm、构建工具、测试框架、TypeScript 等，不属于语言标准。

```js
// 纯 ECMAScript：Node.js 与现代浏览器都能运行
const prices = [19, 35, 8];
const total = prices.reduce((sum, price) => sum + price, 0);
console.log(total); // 62

// document 属于浏览器 DOM，不是 ECMAScript 的一部分
if (typeof document !== "undefined") {
  console.log(document.title);
}
```

判断某个 API 能否使用时，不应只问“JavaScript 支不支持”，而应确认目标运行时及版本是否实现了它。

## 2. ECMAScript 与版本演进

ECMAScript 是 ECMA-262 标准中定义的语言规范。JavaScript 是该规范最广泛的实现。现代标准按年度发布，常见写法如 ES2015、ES2020；“ES6”通常特指 ES2015。

现代开发不必背诵每年新增内容，更实用的方法是：

- 根据目标浏览器或 Node.js 版本查询兼容性
- 优先使用已经稳定且普遍实现的语法
- 必要时通过编译转换语法，通过 polyfill 补充运行时 API
- 不把“构建成功”等同于“所有目标环境都能运行”

```js
// 可选链与空值合并：只在 null/undefined 时使用默认值
const profile = { preferences: { theme: "dark" } };
const theme = profile.preferences?.theme ?? "light";
console.log(theme); // dark
```

语法转换与 API 补充是两件事。例如构建工具可以把较新的语法转换为旧语法，但旧环境仍未必拥有 `Promise` 或 `Array.prototype.at`。

## 3. 宿主环境决定可用能力

浏览器和 Node.js 都实现 ECMAScript，但各自的全局对象和系统能力不同：

| 能力 | 浏览器 | Node.js |
| --- | --- | --- |
| 页面操作 | `document`、`location` | 无 |
| 文件系统 | 通常受沙箱限制 | `node:fs` |
| 网络请求 | `fetch` | 现代版本也提供 `fetch` |
| 全局对象 | `globalThis`、`window` | `globalThis`、传统上有 `global` |

`globalThis` 是跨环境访问全局对象的标准入口，但应避免随意向全局对象挂载状态。

```js
console.log(typeof globalThis); // object
console.log({
  hasDOM: typeof document !== "undefined",
  hasProcess: typeof process !== "undefined",
});
```

## 4. JavaScript 的执行模型

JavaScript 通常在一个执行线程上运行代码，通过事件循环协调定时器、网络与用户输入。异步任务并不意味着所有 JavaScript 代码同时执行，而是宿主先处理外部工作，再把后续任务安排回来。

```js
console.log("A");

setTimeout(() => console.log("B: timer"), 0);
Promise.resolve().then(() => console.log("C: microtask"));

console.log("D");
// 通常输出：A、D、C、B
```

Promise 回调属于微任务，当前同步代码结束后会先于下一轮定时器任务执行。理解这一点有助于定位“明明延时为 0，为什么仍然最后执行”的问题。

## 5. 安全模型与同源约束

浏览器中的脚本默认运行在沙箱内，不能任意读取本机文件或其他网站的数据。同源策略会比较协议、主机和端口；跨源访问通常需要服务端通过 CORS 明确许可。

安全边界不是阻碍，而是 Web 能执行第三方代码的前提。实践中要特别注意：

- 不把令牌、私钥或数据库密码打包到前端
- 不把用户输入直接拼接为 HTML 或可执行代码
- 使用 HTTPS，校验外部数据，限制第三方脚本
- 前端校验只改善体验，关键权限必须由服务端再次校验

```js
// 把不可信文本作为文本节点处理，而不是拼接 innerHTML
if (typeof document !== "undefined") {
  const output = document.createElement("p");
  output.textContent = '<img src=x onerror="alert(1)">';
  document.body.append(output);
}
```

## 6. 建立最小练习环境

学习核心语法时，Node.js REPL、浏览器控制台和独立 `.js` 文件都很合适。涉及 DOM 时用浏览器，涉及纯语言特性时优先用 Node.js，减少环境噪声。

```js
// 保存为 demo.mjs 后执行：node demo.mjs
function greet(name = "JavaScript") {
  return `Hello, ${name}!`;
}

console.log(greet());
console.assert(greet("ES") === "Hello, ES!");
```

现代项目建议启用 ESLint、格式化工具与自动测试，但学习阶段应先理解原生行为，再引入抽象层。

## 常见陷阱与最佳实践

- **混淆标准与环境**：`document`、`setTimeout`、`fetch` 由宿主提供，不是所有 JavaScript 环境都一致。
- **只看语法版本**：部署前同时检查语法和内置 API 的兼容性。
- **依赖隐式全局变量**：模块与严格模式下不会容忍未声明赋值；始终用 `const` 或 `let` 声明。
- **把前端当可信边界**：用户可以修改前端代码和请求，安全规则必须落在服务端。
- **一开始就依赖框架**：先掌握类型、作用域、对象、异步和模块，框架行为会更容易解释。
- **忽略错误栈**：保留可读的 source map，在开发工具中从第一条业务栈帧开始排查。

## 章节小结

JavaScript 的语言核心由 ECMAScript 定义，浏览器或 Node.js 等宿主补充具体能力。现代 JavaScript 开发的关键不是记忆版本号，而是明确代码运行在哪里、目标环境支持什么，以及语言、Web API 和工具链各自承担什么职责。下一章将聚焦脚本如何进入 HTML，以及加载策略如何影响页面。

## 章节导航

- 上一章：[总索引](/kb/language/JavaScript/核心语法/README/)
- 下一章：[-HTML中的JavaScript](/kb/language/JavaScript/核心语法/02-HTML中的JavaScript/)
