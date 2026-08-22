---
title: "JavaScript 核心语法完整教程"
permalink: /kb/language/JavaScript/核心语法/README/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "未来展望", link: /kb/language/JavaScript/核心语法/28-未来展望/ }
next: false
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: JavaScript 核心语法完整教程
tags:
  - javascript
  - js-core
  - index
aliases:
  - JavaScript 核心语法
  - JavaScript 完整教程
---

# JavaScript 核心语法完整教程

> 本教程参考《JavaScript 高级程序设计（第 4 版）》的章节体系重新整理，使用原创表述，重点讲解现代开发中高频、稳定且可迁移的知识。旧版浏览器兼容技巧、低频 XML API 等内容仅保留必要背景。

## 如何使用

- **首次系统学习**：按照 01 → 28 的顺序阅读，并在浏览器控制台或 Node.js 中运行示例。
- **已有基础查漏补缺**：优先阅读第 3～11、17、21、23～27 章。
- **前端开发专题学习**：重点阅读第 2、12～24、26 章。
- **复习**：先看每章的“学习目标”“常见陷阱/最佳实践”和“章节小结”，再回看不熟悉的示例。
- **验证平台 API**：浏览器能力持续演进，实际使用前同时检查 MDN、Can I Use 和目标运行时文档。

## 学习路线

```mermaid
flowchart LR
  A[运行环境] --> B[语言基础]
  B --> C[引用类型与集合]
  C --> D[对象与函数]
  D --> E[异步编程]
  E --> F[DOM 与事件]
  F --> G[网络与存储]
  G --> H[模块与 Worker]
  H --> I[质量、性能与安全]
```

## 第一部分：认识 JavaScript

1. [-JavaScript概述](/kb/language/JavaScript/核心语法/01-JavaScript概述/)：语言组成、宿主环境、标准与现代运行方式。
2. [-HTML中的JavaScript](/kb/language/JavaScript/核心语法/02-HTML中的JavaScript/)：`script`、模块脚本、加载顺序与资源性能。

## 第二部分：语言核心

3. [-语言基础](/kb/language/JavaScript/核心语法/03-语言基础/)：声明、类型、转换、运算符、控制流与严格模式。
4. [-变量作用域与内存](/kb/language/JavaScript/核心语法/04-变量作用域与内存/)：执行上下文、作用域链、闭包、垃圾回收与内存管理。
5. [-基本引用类型](/kb/language/JavaScript/核心语法/05-基本引用类型/)：对象包装、日期、正则表达式与原始值包装类型。
6. [-集合引用类型](/kb/language/JavaScript/核心语法/06-集合引用类型/)：Object、Array、Map、Set、WeakMap、WeakSet 与类型化数组。
7. [-迭代器与生成器](/kb/language/JavaScript/核心语法/07-迭代器与生成器/)：迭代协议、自定义迭代器、生成器与惰性序列。
8. [-对象类与面向对象编程](/kb/language/JavaScript/核心语法/08-对象类与面向对象编程/)：属性描述符、原型链、继承、类与组合设计。
9. [-代理与反射](/kb/language/JavaScript/核心语法/09-代理与反射/)：Proxy、Reflect、拦截器、不变量与常见应用。
10. [-函数](/kb/language/JavaScript/核心语法/10-函数/)：参数、`this`、闭包、递归、高阶函数与函数式技巧。
11. [-Promise与异步函数](/kb/language/JavaScript/核心语法/11-Promise与异步函数/)：事件循环、Promise、微任务、async/await、并发与取消。

## 第三部分：浏览器对象与 DOM

12. [-BOM](/kb/language/JavaScript/核心语法/12-BOM/)：window、location、history、navigator、计时器与页面生命周期。
13. [-客户端检测](/kb/language/JavaScript/核心语法/13-客户端检测/)：功能检测、渐进增强、兼容策略与用户代理的边界。
14. [-DOM](/kb/language/JavaScript/核心语法/14-DOM/)：节点模型、查询、创建、修改、遍历与 DOM 性能。
15. [-DOM扩展](/kb/language/JavaScript/核心语法/15-DOM扩展/)：Selectors API、元素遍历、HTML5 DOM 扩展与滚动能力。
16. [-DOM2与DOM3](/kb/language/JavaScript/核心语法/16-DOM2与DOM3/)：样式、尺寸、遍历、Range 以及现代替代方案。
17. [-事件](/kb/language/JavaScript/核心语法/17-事件/)：事件流、委托、默认行为、指针与键盘事件、监听器管理。
18. [-动画与Canvas图形](/kb/language/JavaScript/核心语法/18-动画与Canvas图形/)：requestAnimationFrame、Web Animations 与 Canvas 2D。
19. [-表单脚本](/kb/language/JavaScript/核心语法/19-表单脚本/)：表单事件、约束验证、FormData、可访问性与安全提交。
20. [-JavaScript-API](/kb/language/JavaScript/核心语法/20-JavaScript-API/)：剪贴板、拖放、文件、媒体、观察器与其他 Web API。

## 第四部分：数据、网络与工程化

21. [-错误处理与调试](/kb/language/JavaScript/核心语法/21-错误处理与调试/)：异常边界、自定义错误、调试、日志与 Source Map。
22. [-XML与JSON](/kb/language/JavaScript/核心语法/22-XML与JSON/)：JSON 序列化、数据校验、安全边界与 XML 维护知识。
23. [-网络请求与远程资源](/kb/language/JavaScript/核心语法/23-网络请求与远程资源/)：fetch、HTTP、跨域、取消、超时、重试与流。
24. [-客户端存储](/kb/language/JavaScript/核心语法/24-客户端存储/)：Cookie、Web Storage、IndexedDB、缓存与隐私安全。
25. [-模块](/kb/language/JavaScript/核心语法/25-模块/)：ES Modules、导入导出、动态加载、模块设计与打包边界。
26. [-工作者线程](/kb/language/JavaScript/核心语法/26-工作者线程/)：Web Worker、消息通信、任务拆分、共享内存与并发安全。
27. [-最佳实践](/kb/language/JavaScript/核心语法/27-最佳实践/)：可维护性、性能、安全、测试、工具链与代码审查。
28. [-未来展望](/kb/language/JavaScript/核心语法/28-未来展望/)：标准化、兼容策略、类型生态、WebAssembly 与平台演进。

## 高频知识清单

完成教程后，应能够清楚解释并实际运用以下内容：

- `const`、`let`、块级作用域、暂时性死区和闭包。
- 原始值与引用值、浅拷贝与深拷贝、垃圾回收和内存泄漏。
- 数组迭代、Map/Set、解构、剩余参数、展开语法和可迭代协议。
- 原型链、类、组合优于继承，以及 `this` 的绑定规则。
- Promise 状态传播、微任务、async/await、串行与并行、超时与取消。
- DOM 查询与更新、事件委托、表单验证、观察器 API。
- fetch 的 HTTP 错误处理、CORS、流、重试与幂等性。
- JSON、Web Storage、IndexedDB、Cookie 的适用场景与安全边界。
- ES Modules、动态导入、Worker 消息模型和结构化克隆。
- 错误处理、调试、性能测量、XSS/CSRF 防护和渐进增强。

## 建议练习

1. 实现一个支持链式处理、超时和取消的请求函数。
2. 使用事件委托完成可动态增删项目的待办列表。
3. 使用 Map、Set 和数组方法统计一组订单数据。
4. 使用 IndexedDB 保存离线草稿，并处理版本升级。
5. 将 CPU 密集型数据计算移入 Worker，比较主线程响应性。
6. 编写一个 ES Module 小项目，并使用动态导入拆分低频功能。
7. 为上述项目补充错误边界、输入校验、性能测量和基础测试。

## 参考边界

这套笔记用于建立稳定的 JavaScript 知识体系，不替代规范与运行时文档。以下情况应查阅一手资料：

- 需要确认某个 API 在特定浏览器或 Node.js 版本中的支持情况。
- 涉及安全、隐私、跨域、Cookie 或权限策略。
- 使用仍处于提案阶段的 ECMAScript 特性。
- 依赖框架、构建工具或服务端运行时的特有行为。

开始阅读：[第 1 章 JavaScript 概述](/kb/language/JavaScript/核心语法/01-JavaScript概述/)
