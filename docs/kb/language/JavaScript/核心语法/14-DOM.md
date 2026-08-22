---
title: "DOM"
permalink: /kb/language/JavaScript/核心语法/14-DOM/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "客户端检测", link: /kb/language/JavaScript/核心语法/13-客户端检测/ }
next: { text: "DOM 扩展", link: /kb/language/JavaScript/核心语法/15-DOM扩展/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: 14 DOM
tags:
  - javascript
  - js-core
---

# DOM

## 学习目标

- 理解 DOM 节点树、节点类型与文档生命周期。
- 掌握元素查询、创建、插入、更新和删除。
- 能正确处理属性、文本、样式、事件与表单。
- 编写安全、高效且可清理的 DOM 交互代码。

## 1. DOM 是文档的对象模型

DOM 将 HTML 或 XML 文档表示为节点树。浏览器解析 HTML 后创建 `Document`，元素、文本和注释都是不同类型的节点。

```js
console.log(document.nodeType === Node.DOCUMENT_NODE);
console.log(document.documentElement.tagName); // HTML
console.log(document.body.parentNode === document.documentElement);
```

常见节点类型包括：

| 节点 | `nodeType` | 常用接口 |
| --- | ---: | --- |
| 文档 | `9` | `Document` |
| 元素 | `1` | `Element`、`HTMLElement` |
| 文本 | `3` | `Text` |
| 注释 | `8` | `Comment` |
| 文档片段 | `11` | `DocumentFragment` |

现代代码通常直接使用 `Node.ELEMENT_NODE` 等常量，而不是记忆数字。

## 2. 查询元素

CSS 选择器 API 通用且直观：`querySelector()` 返回第一个匹配元素或 `null`，`querySelectorAll()` 返回静态 `NodeList`。

```html
<ul id="tasks">
  <li data-status="done">学习 DOM</li>
  <li data-status="todo">编写示例</li>
</ul>

&lt;script&gt;
  const list = document.querySelector("#tasks");
  const pendingItems = list.querySelectorAll('[data-status="todo"]');

  for (const item of pendingItems) {
    console.log(item.textContent);
  }
&lt;/script&gt;
```

`getElementById()` 是清晰高效的 ID 查询方式。`getElementsByClassName()` 等返回动态 `HTMLCollection`，集合会随文档变化；边修改边遍历容易跳项。需要稳定快照时使用 `querySelectorAll()` 或 `Array.from()`。

动态构造选择器时，外部值应通过 `CSS.escape()` 转义：

```js
function findByUserId(id) {
  return document.querySelector(`[data-user-id="${CSS.escape(id)}"]`);
}
```

## 3. 节点关系与遍历

`children`、`firstElementChild`、`nextElementSibling` 只关注元素；`childNodes`、`firstChild` 等包含空白文本和注释。处理 HTML 布局时通常优先元素版本。

```js
const article = document.createElement("article");
article.innerHTML = "<h2>标题</h2>\n<p>正文</p>";

console.log(article.children.length); // 2
console.log(article.childNodes.length); // 包含换行文本节点
console.log(article.firstElementChild.tagName); // H2
```

复杂遍历可使用 `TreeWalker`，按节点类型过滤，避免手写递归：

```js
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
  {
    acceptNode(node) {
      return node.textContent.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  },
);

let textNode;
while ((textNode = walker.nextNode())) {
  console.log(textNode.textContent.trim());
}
```

## 4. 创建与插入内容

优先用 `createElement()`、`textContent`、`append()` 等明确构造节点，尤其当内容含用户输入时。

```js
function createTask(title) {
  const item = document.createElement("li");
  item.className = "task";
  item.dataset.status = "todo";

  const label = document.createElement("span");
  label.textContent = title;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "完成";

  item.append(label, button);
  return item;
}

document.querySelector("#tasks")?.append(createTask("复习 DOM"));
```

现代插入 API 包括：

- `append()`、`prepend()`：在内部末尾或开头插入，可接收节点和字符串。
- `before()`、`after()`：在当前节点前后插入。
- `replaceWith()`：替换当前节点。
- `replaceChildren()`：一次替换所有子节点。
- `remove()`：移除当前节点。

这些方法比 `appendChild()`、`insertBefore()` 更方便，但后两者仍广泛存在于库和旧代码中。

## 5. DocumentFragment 与 template

`DocumentFragment` 是轻量离线容器。插入文档时会移动其子节点，片段自身不会留下。它适合先批量组装节点，也能让代码结构更清晰。

```js
const fragment = document.createDocumentFragment();

for (const name of ["Ada", "Grace", "Lin"]) {
  const item = document.createElement("li");
  item.textContent = name;
  fragment.append(item);
}

document.querySelector("#users")?.append(fragment);
```

`&lt;template&gt;` 的内容不会直接渲染，可以克隆后填充：

```html
&lt;template id="user-template"&gt;
  &lt;article class="user-card"&gt;<h2></h2>&lt;/article&gt;
&lt;/template&gt;

&lt;script&gt;
  const template = document.querySelector("#user-template");
  const card = template.content.cloneNode(true);
  card.querySelector("h2").textContent = "Ada";
  document.body.append(card);
&lt;/script&gt;
```

`cloneNode(true)` 复制节点和属性，但不会复制通过 `addEventListener()` 注册的监听器，也不会自动保证克隆后的 `id` 唯一。

## 6. 文本、HTML 与安全

`textContent` 把输入当作纯文本，适合绝大多数用户内容。`innerHTML` 解析字符串为 HTML，来源不可信时可能导致跨站脚本（XSS）。

```js
const message = document.createElement("p");
const userInput = '<img src=x onerror="alert(1)">';
message.textContent = userInput; // 安全显示为文本
document.body.append(message);
```

确实需要富文本时，应使用经过审计的 HTML 清洗库，配合内容安全策略（CSP）和 Trusted Types 等纵深防御。不要依赖简单正则过滤 HTML。

`innerText` 受布局和 CSS 可见性影响，读取时可能触发布局计算；只关心节点文本时通常使用 `textContent`。

## 7. 属性、property 与 data

HTML 属性是标记中的初始配置，DOM property 是 JavaScript 对象上的当前状态。二者有时相互反射，有时语义不同。

```html
&lt;input id="name" value="initial" data-user-id="42"&gt;

&lt;script&gt;
  const input = document.querySelector("#name");
  input.value = "current";

  console.log(input.getAttribute("value")); // initial
  console.log(input.value); // current
  console.log(input.dataset.userId); // "42"
&lt;/script&gt;
```

布尔属性按“是否存在”判断，`disabled="false"` 依然表示禁用：

```js
const button = document.createElement("button");
button.disabled = true;
console.log(button.hasAttribute("disabled")); // true
button.disabled = false;
```

自定义数据使用 `data-*` 与 `dataset`，复杂业务状态仍应放在 JavaScript 数据模型中，不要把 DOM 当数据库。

## 8. class 与内联样式

通过 `classList` 增删状态类，让 CSS 负责表现：

```js
const panel = document.querySelector(".panel");
panel?.classList.add("is-open");
panel?.classList.toggle("is-loading", false);

if (panel) {
  panel.style.setProperty("--progress", "60%");
  console.log(getComputedStyle(panel).display);
}
```

`element.style` 只表示内联样式；读取最终计算值使用 `getComputedStyle()`。连续读写布局相关属性可能触发布局抖动，应批量读取后再批量写入，并优先使用 class 切换。

## 9. 事件传播与委托

事件通常经过捕获、目标和冒泡阶段。`addEventListener()` 支持 `capture`、`once`、`passive` 和 `signal` 等选项。

事件委托在共同祖先上处理动态子元素，可减少监听器数量：

```js
const list = document.querySelector("#tasks");

list?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !list.contains(button)) return;

  const item = button.closest("li");
  item?.classList.toggle("is-done");
});
```

`event.target` 是事件最初来源，`event.currentTarget` 是当前监听器所在对象。`preventDefault()` 阻止默认行为，`stopPropagation()` 阻止继续传播；不要无理由使用后者，否则会破坏上层委托和可观察性。

使用 `AbortController` 批量清理监听器：

```js
const controller = new AbortController();

window.addEventListener("resize", () => console.log("resize"), {
  signal: controller.signal,
  passive: true,
});

// 组件销毁时：controller.abort();
```

## 10. 表单与用户输入

提交逻辑监听表单的 `submit`，而不是只监听按钮点击，这样键盘提交和辅助技术也能正常工作。

```html
&lt;form id="profile-form"&gt;
  &lt;label&gt;姓名 &lt;input name="name" required&gt;&lt;/label&gt;
  &lt;button&gt;保存&lt;/button&gt;
&lt;/form&gt;

&lt;script&gt;
  document.querySelector("#profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form));
    console.log(data);
  });
&lt;/script&gt;
```

客户端校验用于改善体验，不能替代服务端校验。监听文本变化通常使用 `input`，`change` 更适合值已提交或焦点离开后的变化。

## 11. 尺寸、位置与滚动

- `getBoundingClientRect()` 返回元素相对视口的位置和尺寸。
- `clientWidth`/`clientHeight` 包含内边距，不含边框和滚动条。
- `scrollWidth`/`scrollHeight` 表示完整可滚动内容尺寸。
- `window.scrollX`/`scrollY` 表示页面滚动偏移。

```js
const target = document.querySelector("#target");
if (target) {
  const rect = target.getBoundingClientRect();
  console.log({
    pageTop: rect.top + window.scrollY,
    width: rect.width,
    visible: rect.bottom > 0 && rect.top < window.innerHeight,
  });
}
```

判断元素可见和懒加载通常优先使用 `IntersectionObserver`，避免在 `scroll` 事件中频繁测量布局。

## 12. 观察 DOM 变化

`MutationObserver` 异步汇总 DOM 变化，可用于集成第三方组件或观察外部变更，但不应代替清晰的数据流。

```js
const container = document.querySelector("#tasks");

if (container) {
  const observer = new MutationObserver((records) => {
    const added = records.reduce((count, record) => count + record.addedNodes.length, 0);
    console.log(`新增 ${added} 个节点`);
  });

  observer.observe(container, { childList: true });
  container.append(document.createElement("li"));

  // 不再观察时：observer.disconnect();
}
```

## 13. 性能与可访问性

DOM 操作本身并非都昂贵，真正需要关注的是大规模节点数量、同步布局、复杂样式重算和重复渲染。先通过性能工具测量，再优化。

可访问性不是额外功能：

- 优先使用 `button`、`a`、`input` 等语义元素，不要用 `div` 模拟交互控件。
- 动态更新后管理焦点，但不要无故抢夺用户焦点。
- 图标按钮提供可访问名称，表单控件关联 `label`。
- 状态变化按需要使用 `aria-live`，避免重复或过度播报。
- 保持键盘操作、焦点可见性和 DOM 顺序符合视觉阅读顺序。

## 常见陷阱与最佳实践

1. 查询结果可能是 `null`；在元素确定存在前不要直接访问其属性。
2. 用户输入用 `textContent`，不要直接交给 `innerHTML`。
3. 区分静态 `NodeList` 与动态 `HTMLCollection`，修改 DOM 前确认集合语义。
4. 批量读取布局数据，再批量修改 class 或样式，避免读写交错造成布局抖动。
5. 动态列表优先事件委托，并通过 `closest()` 确认真正操作目标。
6. 组件销毁时移除监听器、断开观察器、取消计时器和请求。
7. 不要用 DOM 属性保存复杂状态；保持数据模型为事实来源，再由状态渲染视图。
8. 使用语义 HTML，再按需添加 ARIA；错误 ARIA 可能比没有 ARIA 更糟。

## 章节小结

DOM 把文档表示为可查询和修改的节点树。现代代码应使用选择器 API、节点构造方法、`template`、事件委托和观察器完成交互；以 `textContent` 和上下文校验保障安全，以语义 HTML、生命周期清理和批量布局操作保证可访问性与性能。

## 章节导航

- 上一章：[-客户端检测](/kb/language/JavaScript/核心语法/13-客户端检测/)
- 下一章：[-DOM扩展](/kb/language/JavaScript/核心语法/15-DOM扩展/)
