---
title: "DOM 扩展"
permalink: /kb/language/JavaScript/核心语法/15-DOM扩展/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "DOM", link: /kb/language/JavaScript/核心语法/14-DOM/ }
next: { text: "DOM2 与 DOM3", link: /kb/language/JavaScript/核心语法/16-DOM2与DOM3/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: DOM 扩展
tags:
  - javascript
  - js-core
  - dom
---

# DOM 扩展

> 前一章：[-DOM](/kb/language/JavaScript/核心语法/14-DOM/) ｜ 后一章：[-DOM2与DOM3](/kb/language/JavaScript/核心语法/16-DOM2与DOM3/)

## 学习目标

- 熟练使用选择器 API 查询元素，并理解静态集合与动态集合的区别。
- 掌握现代元素遍历、节点匹配、批量插入和安全内容更新方式。
- 理解元素尺寸、滚动、焦点及自定义数据属性的常用接口。
- 能在可读性、性能、安全性和兼容性之间做出合理选择。

## 1. DOM 扩展的意义

基础 DOM 提供了通用的节点模型，但原始接口往往较繁琐。浏览器随后把 CSS 选择器、HTML5 元素能力和便捷的节点操作纳入平台。今天开发者应优先使用已标准化的现代接口，而不是早期浏览器私有扩展。

DOM 操作通常包括三步：定位节点、读取或修改状态、响应页面变化。频繁访问 DOM 可能触发布局计算，因此应减少无意义查询，并将一组修改尽量集中完成。

## 2. 选择器 API

### 2.1 `querySelector()` 与 `querySelectorAll()`

`querySelector()` 返回第一个匹配元素，没有结果时返回 `null`；`querySelectorAll()` 返回静态 `NodeList`，调用后新增的节点不会自动进入该集合。

```js
const app = document.querySelector('#app');
const activeItems = app.querySelectorAll('.item[data-state="active"]');

for (const item of activeItems) {
  item.classList.add('is-visible');
}
```

选择器语法错误会抛出 `DOMException`。外部输入不能直接拼进选择器，应使用 `CSS.escape()` 转义。

```js
function findByUserId(id) {
  return document.querySelector(`[data-user-id="${CSS.escape(id)}"]`);
}
```

### 2.2 匹配与就近查找

`matches()` 判断元素是否符合选择器，`closest()` 从当前元素开始沿祖先链寻找首个匹配元素。二者尤其适合事件委托。

```js
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button || !document.body.contains(button)) return;

  button.closest('.card')?.remove();
});
```

## 3. 元素遍历与集合

`children`、`firstElementChild`、`lastElementChild`、`nextElementSibling` 和 `previousElementSibling` 只关注元素，避免文本节点干扰。`childNodes` 则包含文本、注释等全部节点。

```js
const list = document.querySelector('.list');

for (const child of list.children) {
  console.log(child.tagName, child.nextElementSibling);
}
```

`getElementsByClassName()`、`getElementsByTagName()` 与 `children` 通常返回动态 `HTMLCollection`。遍历时修改 DOM 会改变集合，可能漏项。需要稳定快照时先转换：

```js
const items = [...document.getElementsByClassName('item')];
items.forEach((item) => item.remove());
```

## 4. 类名与自定义数据

### 4.1 `classList`

`classList` 比字符串拼接更清晰，提供 `add()`、`remove()`、`toggle()`、`replace()` 与 `contains()`。

```js
const panel = document.querySelector('.panel');
const expanded = panel.classList.toggle('is-expanded');
panel.setAttribute('aria-expanded', String(expanded));
```

带第二个参数的 `toggle(name, force)` 可直接表达目标状态，避免先判断后操作。

### 4.2 `dataset`

`data-*` 属性适合保存与元素相关的少量字符串元数据。短横线名称会映射为驼峰属性，赋值时也会转为字符串。

```html
&lt;article data-post-id="42" data-read-only="true"&gt;&lt;/article&gt;
```

```js
const article = document.querySelector('article');
const postId = Number(article.dataset.postId);
const readOnly = article.dataset.readOnly === 'true';
```

复杂业务状态不应全部塞入 `dataset`；对象、权限和敏感信息应由应用状态管理，不能把 DOM 属性当作安全边界。

## 5. 内容与标记

`textContent` 读写纯文本，默认应优先使用。`innerHTML` 会解析字符串为 HTML，适合可信模板，但对不可信数据使用会导致 XSS。`innerText` 受样式和布局影响，读取可能触发布局计算。

```js
const message = document.querySelector('.message');
message.textContent = userSuppliedText;
```

创建结构化内容时可使用节点 API 或 `&lt;template&gt;`：

```js
const template = document.querySelector('#user-template');
const fragment = template.content.cloneNode(true);
fragment.querySelector('.name').textContent = user.name;
document.querySelector('.users').append(fragment);
```

`insertAdjacentHTML(position, html)` 能在指定位置解析标记，但具有与 `innerHTML` 相同的注入风险。现代浏览器还支持 `before()`、`after()`、`prepend()`、`append()`、`replaceWith()` 和 `remove()`。

```js
const badge = document.createElement('span');
badge.className = 'badge';
badge.textContent = 'New';
document.querySelector('.title').append(' ', badge);
```

## 6. 焦点与页面状态

`document.activeElement` 指向当前获得焦点的元素；`document.hasFocus()` 表示文档是否拥有焦点。程序化聚焦前应确保操作符合用户预期。

```js
const input = document.querySelector('#search');
input.focus({ preventScroll: true });
input.select();
```

页面可见性应通过 `document.visibilityState` 和 `visibilitychange` 观察，可用于暂停非必要更新，但不能替代真正的生命周期或持久化策略。

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pausePreview();
  else resumePreview();
});
```

## 7. 尺寸与滚动

- `getBoundingClientRect()` 返回相对视口的几何信息，值可能为小数。
- `clientWidth/clientHeight` 包含内边距，不含边框与滚动条。
- `offsetWidth/offsetHeight` 通常包含边框。
- `scrollWidth/scrollHeight` 表示完整可滚动内容尺寸。
- `window.scrollX/scrollY` 表示页面滚动偏移。

```js
const rect = element.getBoundingClientRect();
const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
```

读取几何属性可能迫使浏览器完成待处理布局。避免在循环中交替“写样式、读尺寸”，应先批量读取，再批量写入。仅判断可见性时通常优先使用 `IntersectionObserver`。

## 8. 低频与过时知识

`document.all`、浏览器私有选择器以及为 IE 编写的 `attachEvent` 不应出现在新代码中。`document.write()` 会阻塞解析，文档加载后调用还可能覆盖页面，仅在理解其同步解析语义的遗留脚本中偶见。

## 常见陷阱与最佳实践

- 不要假设 `querySelector()` 一定返回元素；操作前处理 `null`。
- 不要将用户输入交给 `innerHTML`；优先 `textContent`，富文本则采用经过审计的净化库和 CSP。
- 区分静态 `NodeList` 与动态 `HTMLCollection`，避免边遍历边修改动态集合。
- CSS 状态与无障碍状态应同步，例如展开类名同时更新 `aria-expanded`。
- 缓存频繁使用且生命周期明确的节点，但动态重渲染后要防止持有失效引用。
- 批量插入可使用 `DocumentFragment`；不要为了“性能”过度抽象，先用性能工具验证瓶颈。

## 章节小结

现代 DOM 扩展让选择、遍历、内容更新和几何测量更直接。实践中最重要的是选择正确的集合语义、默认采用安全的文本写入方式、减少布局抖动，并把 DOM 当作视图而不是完整业务状态仓库。

> 前一章：[-DOM](/kb/language/JavaScript/核心语法/14-DOM/) ｜ 后一章：[-DOM2与DOM3](/kb/language/JavaScript/核心语法/16-DOM2与DOM3/)
