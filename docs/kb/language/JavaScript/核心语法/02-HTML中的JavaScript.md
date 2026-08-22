---
title: "HTML 中的 JavaScript"
permalink: /kb/language/JavaScript/核心语法/02-HTML中的JavaScript/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "JavaScript 概述", link: /kb/language/JavaScript/核心语法/01-JavaScript概述/ }
next: { text: "JavaScript 语言基础", link: /kb/language/JavaScript/核心语法/03-语言基础/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: HTML 中的 JavaScript
tags:
  - javascript
  - js-core
  - html
---

# HTML 中的 JavaScript

> 章节映射：《JavaScript 高级程序设计》第 4 版第 2 章，重点采用模块脚本与现代加载策略。

## 学习目标

- 掌握 `&lt;script&gt;` 的常用属性及执行时机
- 理解普通脚本、`defer`、`async` 与模块脚本的差异
- 能选择兼顾性能、依赖顺序和安全的加载方式
- 了解无脚本降级与内容安全策略的基本思路

## 1. 脚本的三种放置方式

JavaScript 可以写在元素事件属性、内联 `&lt;script&gt;` 或外部文件中。生产项目应优先使用外部文件：便于缓存、测试、复用，并能配合严格的内容安全策略。

```html
<!doctype html>
&lt;html lang="zh-CN"&gt;
  &lt;head&gt;
    &lt;meta charset="utf-8"&gt;
    &lt;title&gt;模块入口&lt;/title&gt;
    &lt;script type="module" src="./main.js"&gt;&lt;/script&gt;
  &lt;/head&gt;
  &lt;body&gt;
    &lt;button id="save" type="button"&gt;保存&lt;/button&gt;
  &lt;/body&gt;
&lt;/html&gt;
```

```js
// main.js
const button = document.querySelector("#save");
button.addEventListener("click", () => {
  button.textContent = "已保存";
});
```

不要写 `onclick="save()"` 一类内联事件。它会混合结构与行为，依赖全局函数，也更难实施 CSP。

## 2. 普通脚本与解析阻塞

浏览器解析 HTML 遇到不带特殊属性的经典脚本时，通常暂停解析，获取并执行脚本后才继续。这能保证后续 HTML 看到脚本造成的变化，却会延迟页面展示。

```html
<!-- 依赖严格按先后执行，但会阻塞 HTML 解析 -->
&lt;script src="./vendor.js"&gt;&lt;/script&gt;
&lt;script src="./app.js"&gt;&lt;/script&gt;
```

过去常把脚本放在 `&lt;/body&gt;` 前减少阻塞。现代页面更适合在 `&lt;head&gt;` 中配合 `defer` 或 `type="module"`，使加载意图更明确。

## 3. defer：保持顺序，等待文档解析

带 `defer` 的外部经典脚本会并行下载，在 HTML 解析完成后、`DOMContentLoaded` 之前按文档顺序执行。它适合存在依赖顺序的应用脚本。

```html
&lt;script defer src="./config.js"&gt;&lt;/script&gt;
&lt;script defer src="./app.js"&gt;&lt;/script&gt;
```

```js
// app.js 可以访问已经解析出的 DOM
const heading = document.querySelector("h1");
if (heading) heading.dataset.ready = "true";
```

`defer` 对内联经典脚本没有实际意义，因此应与 `src` 一起使用。

## 4. async：下载完成即执行

`async` 脚本并行下载，完成后尽快执行，彼此不保证顺序。它适合独立的统计、监控等脚本，不适合有前后依赖的业务入口。

```html
&lt;script async src="https://example.com/analytics.js"&gt;&lt;/script&gt;
```

如果两个 `async` 脚本都读写同一个全局状态，执行顺序会受网络速度影响，形成偶发故障。正确做法是消除依赖或改用模块依赖图。

## 5. ES 模块是现代默认选择

模块脚本天然使用严格模式，拥有独立作用域，支持静态 `import`/`export`，并默认延后到文档解析完成后执行。模块依赖只执行一次。

```html
&lt;script type="module" src="./main.js"&gt;&lt;/script&gt;
```

```js
// math.js
export function sum(a, b) {
  return a + b;
}
```

```js
// main.js
import { sum } from "./math.js";

console.log(sum(2, 3)); // 5
console.log(document.readyState); // 通常为 interactive
```

浏览器原生模块的相对路径必须写完整，例如 `./math.js`，而不是裸写 `math`。裸模块说明符通常要由构建工具或 import map 解析。

动态导入可延迟加载不常用功能，并返回 Promise：

```js
const button = document.querySelector("#open-editor");
button?.addEventListener("click", async () => {
  const { openEditor } = await import("./editor.js");
  openEditor();
});
```

## 6. 生命周期事件

常见时机由早到晚大致如下：文档解析、延后脚本/模块执行、`DOMContentLoaded`、图片等资源完成、`load`。

```js
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM 已可完整查询");
});

window.addEventListener("load", () => {
  console.log("页面依赖资源已加载");
});
```

模块脚本和 `defer` 脚本通常已经在 DOM 可查询的时机运行，无需机械地再包一层 `DOMContentLoaded`。只有入口可能被以多种方式加载时，才需要检查 `document.readyState`。

## 7. noscript 与渐进增强

`&lt;noscript&gt;` 会在脚本不可用或被禁用时显示内容。它适合给出限制说明，但不应成为基本内容缺失的借口。

```html
&lt;noscript&gt;
  <p>当前浏览器未启用 JavaScript，搜索和阅读仍可使用，在线编辑功能不可用。</p>
&lt;/noscript&gt;
```

渐进增强意味着先提供可访问的 HTML 基础，再用脚本增强体验。提交、导航等核心流程尽可能保留原生语义。

## 8. 安全与完整性

第三方脚本拥有接近页面自身脚本的权限，应减少来源并锁定版本。跨站静态资源可以结合 SRI 校验内容：

```html
&lt;script
  src="https://cdn.example.com/lib.min.js"
  integrity="sha384-替换为真实摘要"
  crossorigin="anonymous"
  defer
&gt;&lt;/script&gt;
```

内容安全策略（CSP）可以限制脚本来源，降低 XSS 后果。真实项目应通过 HTTP 响应头配置，而不是仅依赖 HTML。

## 常见陷阱与最佳实践

- **把业务依赖标为 `async`**：依赖顺序不可控；使用模块导入或 `defer`。
- **内联大量代码**：降低缓存效率并增加 CSP 配置难度；使用外部模块。
- **模块路径漏写扩展名**：原生浏览器通常不会像打包器一样自动补全。
- **重复监听初始化**：热更新或局部导航可能多次执行入口；初始化逻辑应可预测、必要时可清理。
- **直接信任第三方 CDN**：固定版本、使用 SRI，并评估第三方脚本权限。
- **用 `document.write()` 注入内容**：它会干扰解析甚至清空已加载文档，现代代码应避免。
- **忽略按钮类型**：表单内按钮默认可能提交；纯交互按钮显式写 `type="button"`。

## 章节小结

现代 HTML 中应优先以 `type="module"` 加载应用入口；传统脚本若有顺序依赖则使用 `defer`，完全独立的脚本才考虑 `async`。加载策略同时影响性能、初始化时机和可靠性，不能只以“是否能执行”判断正确性。

## 章节导航

- 上一章：[-JavaScript概述](/kb/language/JavaScript/核心语法/01-JavaScript概述/)
- 下一章：[-语言基础](/kb/language/JavaScript/核心语法/03-语言基础/)
