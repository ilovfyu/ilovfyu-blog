---
title: "DOM2 与 DOM3"
permalink: /kb/language/JavaScript/核心语法/16-DOM2与DOM3/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "DOM 扩展", link: /kb/language/JavaScript/核心语法/15-DOM扩展/ }
next: { text: "事件", link: /kb/language/JavaScript/核心语法/17-事件/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: DOM2 与 DOM3
tags:
  - javascript
  - js-core
  - dom
---

# DOM2 与 DOM3

> 前一章：[-DOM扩展](/kb/language/JavaScript/核心语法/15-DOM扩展/) ｜ 后一章：[-事件](/kb/language/JavaScript/核心语法/17-事件/)

## 学习目标

- 理解 DOM 由核心、样式、遍历、范围等模块逐步演进的背景。
- 掌握样式表、元素几何、节点遍历和 `Range` 的现代用法。
- 了解命名空间与旧式 DOM 模块检测的适用边界。
- 能识别强制布局、样式注入和迭代期间修改树结构等风险。

## 1. 从规范分级到现代 Living Standard

DOM Level 2/3 曾按 Core、HTML、Style、Traversal、Range、Events 等模块描述能力。今天 WHATWG DOM、HTML 和 CSSOM 多以持续更新的 Living Standard 维护，“DOM2/DOM3”更多是知识分类，而非开发时需要检测的版本号。

早期 `document.implementation.hasFeature()` 结果不可靠，现代代码应直接检测具体 API：

```js
if ('ResizeObserver' in window) {
  const observer = new ResizeObserver(handleResize);
  observer.observe(document.querySelector('.panel'));
}
```

## 2. 命名空间与多种文档类型

HTML 文档通常无需关心命名空间，但 SVG、MathML 或 XML 中会用到 `createElementNS()`、`getAttributeNS()` 等接口。

```js
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(SVG_NS, 'svg');
const circle = document.createElementNS(SVG_NS, 'circle');

circle.setAttribute('cx', '50');
circle.setAttribute('cy', '50');
circle.setAttribute('r', '40');
svg.append(circle);
```

在 HTML 中使用普通 `document.createElement('svg')` 不能可靠创建 SVG 语义元素。命名空间前缀本身不等于命名空间 URI，处理 XML 时应区分二者。

## 3. CSSOM 与元素样式

### 3.1 内联样式

`element.style` 只反映内联声明，不代表最终渲染结果。带连字符的属性可用驼峰形式或 `setProperty()`。

```js
const box = document.querySelector('.box');
box.style.backgroundColor = 'tomato';
box.style.setProperty('--progress', '72%');
box.style.removeProperty('width');
```

批量视觉状态通常用类名表达，内联样式更适合运行时计算值和 CSS 自定义属性。

### 3.2 计算样式

`getComputedStyle()` 返回解析级联后的只读样式。返回值可能是解析后的颜色、像素值或平台相关结果，不应依赖其文本格式做严格比较。

```js
const styles = getComputedStyle(box);
console.log(styles.display, styles.getPropertyValue('--progress'));
```

读取计算样式可能触发布局。动画循环中应避免写入样式后立刻读取几何信息。

### 3.3 样式表

`document.styleSheets` 暴露文档样式表；同源样式表可读取 `cssRules`，跨源样式表通常因同源策略抛出 `SecurityError`。

```js
const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  :host { display: block; }
  .notice { color: var(--notice-color, crimson); }
`);
shadowRoot.adoptedStyleSheets = [sheet];
```

可构造样式表与 `adoptedStyleSheets` 适合 Shadow DOM 共享样式，但使用前应确认目标浏览器范围。动态拼接不可信 CSS 同样存在数据泄漏与界面欺骗风险。

## 4. 元素几何与滚动

DOM 中不存在一个适用于所有场景的“尺寸”属性。选择接口前先明确坐标系和是否包含边框、滚动内容。

```js
const card = document.querySelector('.card');
const rect = card.getBoundingClientRect();

const documentTop = rect.top + window.scrollY;
const borderBoxWidth = rect.width;
const visibleInnerWidth = card.clientWidth;
const contentScrollWidth = card.scrollWidth;
```

`offsetParent` 和 `offsetTop` 受定位上下文影响，不适合简单累加计算页面绝对坐标。变换、缩放、垂直书写模式与子像素也会使结果更复杂。

滚动推荐使用对象参数：

```js
window.scrollTo({ top: 0, behavior: 'smooth' });
card.scrollIntoView({ block: 'center', inline: 'nearest' });
```

尊重用户的减少动态效果设置，避免强制平滑滚动造成不适：

```js
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
```

## 5. 节点遍历

`NodeIterator` 适合顺序扫描符合条件的节点，`TreeWalker` 还允许显式移动到父、子和兄弟节点。它们比递归处理大型树更便于过滤。

```js
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
  {
    acceptNode(node) {
      return node.nodeValue.trim()
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  },
);

while (walker.nextNode()) {
  console.log(walker.currentNode.nodeValue);
}
```

过滤器必须保持轻量。遍历期间大规模修改节点树会使逻辑难以推断，通常先收集目标，再统一修改。

## 6. `Range` 范围

`Range` 表示文档中的连续范围，可选择节点、提取内容、克隆内容或获取文本选区几何信息。边界由“容器节点 + 偏移量”组成。

```js
const paragraph = document.querySelector('p');
const text = paragraph.firstChild;
const range = document.createRange();

range.setStart(text, 0);
range.setEnd(text, Math.min(10, text.length));
console.log(range.toString());
```

配合用户选择：

```js
const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(range);
```

插入节点会拆分文本边界，提取内容则会改变原 DOM。执行编辑操作前应确认范围仍连接在文档中，并考虑焦点与无障碍体验。

```js
const mark = document.createElement('mark');
mark.append(range.extractContents());
range.insertNode(mark);
```

## 7. MutationObserver：现代树变化观察

早期突变事件同步触发且性能差，已废弃。`MutationObserver` 将变化记录批量放入微任务阶段回调。

```js
const observer = new MutationObserver((records) => {
  for (const record of records) {
    console.log(record.type, record.addedNodes.length);
  }
});

observer.observe(document.querySelector('#app'), {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['aria-expanded'],
});

// 生命周期结束时释放引用
observer.disconnect();
```

不要用观察器代替应用自身明确的数据流。观察整个文档及所有属性成本较高，应收窄根节点和观察选项。

## 8. 低频与过时知识

DOM 模块版本检测、`DOMAttrModified` 等 Mutation Events、IE 专有样式接口均属遗留内容。XML 命名空间 API 在普通 Web 应用中低频，但在内联 SVG、XML 编辑器和文档转换场景仍有价值。

## 常见陷阱与最佳实践

- 用类名控制离散状态，用 CSS 自定义属性传递动态数值，避免散落大量内联样式。
- 将 DOM 写操作和布局读操作分组，减少 forced reflow 与 layout thrashing。
- 不要假定 `getComputedStyle()` 的值与源码字符串一致。
- 访问 `cssRules` 时处理跨源限制；不要通过关闭安全策略规避问题。
- 遍历或观察器完成后释放引用，长生命周期单页应用尤其要注意。
- `Range` 修改内容前先验证边界，用户选择变化后旧范围可能不再符合业务意图。

## 章节小结

DOM2/DOM3 的核心价值是把 DOM 从基础节点树扩展到样式、几何、遍历和范围操作。现代开发无需纠结规范级别，而应针对能力做检测，并重点控制布局成本、跨源边界与观察器生命周期。

> 前一章：[-DOM扩展](/kb/language/JavaScript/核心语法/15-DOM扩展/) ｜ 后一章：[-事件](/kb/language/JavaScript/核心语法/17-事件/)
