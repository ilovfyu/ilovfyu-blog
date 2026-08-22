---
title: "BOM"
permalink: /kb/language/JavaScript/核心语法/12-BOM/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "Promise 与异步函数", link: /kb/language/JavaScript/核心语法/11-Promise与异步函数/ }
next: { text: "客户端检测", link: /kb/language/JavaScript/核心语法/13-客户端检测/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: 12 BOM
tags:
  - javascript
  - js-core
---

# BOM

## 学习目标

- 理解浏览器环境中 `window`、`globalThis` 与视口的关系。
- 掌握地址、历史、导航器、计时器和窗口通信 API。
- 能安全处理 URL、页面生命周期与跨上下文消息。
- 了解弹窗、旧式窗口属性等低频 BOM 能力的限制。

## 1. BOM 的边界

浏览器对象模型（Browser Object Model，BOM）是浏览器提供的宿主 API，核心入口通常是 `window`。它不同于 JavaScript 语言本身，也不同于描述文档结构的 DOM。

在浏览器主线程中，`window` 同时是全局对象和当前窗口代理；跨环境代码应优先使用 `globalThis` 引用全局对象。

```js
console.log(globalThis === window); // 浏览器主线程中为 true
console.log(window.document === document);

globalThis.appVersion = "1.0.0";
console.log(window.appVersion);
delete globalThis.appVersion;
```

不要随意向全局对象挂载业务变量，以免产生命名冲突和隐式依赖。模块顶层声明默认不会变成 `window` 属性。

## 2. 视口与窗口尺寸

`window.innerWidth`、`innerHeight` 表示布局视口尺寸，`outerWidth`、`outerHeight` 表示整个浏览器窗口外部尺寸。移动端缩放和软键盘场景可关注 `visualViewport`。

```js
function reportViewport() {
  const visual = window.visualViewport;
  console.log({
    layoutWidth: window.innerWidth,
    layoutHeight: window.innerHeight,
    visualWidth: visual?.width,
    visualHeight: visual?.height,
    scale: visual?.scale,
    devicePixelRatio: window.devicePixelRatio,
  });
}

reportViewport();
window.addEventListener("resize", reportViewport, { passive: true });
```

布局适配优先使用 CSS 媒体查询、容器查询和动态视口单位，只有行为逻辑确实依赖尺寸时才用 JavaScript 监听。高频 `resize` 回调要节流，且在组件销毁时移除监听器。

## 3. location 与 URL

`window.location` 描述当前地址。直接给 `location.href` 赋值会导航；`assign()` 增加历史记录，`replace()` 替换当前记录，`reload()` 重新加载。

处理地址字符串应使用 `URL` 与 `URLSearchParams`，避免手工拼接和遗漏编码。

```js
const url = new URL("https://example.com/search?q=javascript#result");
url.searchParams.set("page", "2");
url.searchParams.append("tag", "web api");

console.log(url.href);
console.log(url.searchParams.get("q"));
console.log([...url.searchParams.entries()]);
```

基于当前页面解析相对地址：

```js
const apiUrl = new URL("/api/items", window.location.origin);
apiUrl.searchParams.set("limit", "20");
console.log(apiUrl.toString());
```

URL 查询参数来自外部输入，插入 HTML、SQL 或跳转地址前仍需按目标上下文验证和转义。开放重定向尤其要校验协议和允许的主机。

## 4. History API

`history.pushState()` 和 `replaceState()` 可改变地址而不重新加载页面，是客户端路由基础。用户前进或后退会触发 `popstate`。

```js
function navigate(path, state = {}) {
  const url = new URL(path, location.href);
  if (url.origin !== location.origin) {
    throw new Error("只允许同源导航");
  }
  history.pushState(state, "", url);
  renderRoute(url.pathname);
}

function renderRoute(pathname) {
  console.log(`渲染路由：${pathname}`);
}

window.addEventListener("popstate", () => {
  renderRoute(location.pathname);
});
```

调用 `pushState()` 本身不会触发 `popstate`，应用需要主动渲染新路由。`state` 必须可结构化克隆，且浏览器可能限制大小。服务端也要配置回退入口，否则用户直接访问前端路由可能得到 404。

## 5. navigator 与能力信息

`navigator` 提供用户代理、语言、网络、剪贴板等能力入口。并非所有属性都可靠，也并非所有浏览器都支持。

```js
console.log({
  language: navigator.language,
  languages: navigator.languages,
  online: navigator.onLine,
  cores: navigator.hardwareConcurrency,
});

window.addEventListener("online", () => console.log("网络可能已恢复"));
window.addEventListener("offline", () => console.log("浏览器报告离线"));
```

`navigator.onLine` 只能提示网络接口状态，不能证明目标服务可达。用户代理字符串容易伪装且逐渐缩减，业务逻辑应优先能力检测。高熵设备信息也涉及隐私，不应无目的收集。

剪贴板等敏感 API 通常要求 HTTPS、安全上下文、权限和用户手势：

```js
async function copyText(text) {
  if (!navigator.clipboard) throw new Error("当前环境不支持 Clipboard API");
  await navigator.clipboard.writeText(text);
}
```

## 6. 计时器与调度

`setTimeout()` 和 `setInterval()` 的延迟是最短等待时间，不保证准确执行。主线程繁忙、后台标签页节流和嵌套计时器都会造成延后。

```js
const timeoutId = setTimeout(() => {
  console.log("至少等待约 100ms 后执行");
}, 100);

// 如需取消：clearTimeout(timeoutId)
console.log(timeoutId);
```

需要避免任务执行时间导致的间隔堆积时，递归 `setTimeout` 往往比 `setInterval` 更合适：

```js
let stopped = false;

async function poll() {
  if (stopped) return;
  try {
    console.log("执行一次轮询");
  } finally {
    if (!stopped) setTimeout(poll, 1000);
  }
}

poll();
// 稍后设置 stopped = true 可停止后续轮询
```

视觉动画使用 `requestAnimationFrame()`，空闲低优先级工作可在兼容性允许时考虑 `requestIdleCallback()`，但不要用它执行必须按时完成的任务。

## 7. 页面生命周期

`DOMContentLoaded` 表示 HTML 已解析完成，`load` 还会等待图片等资源。页面离开前持久化状态时，优先考虑 `visibilitychange` 和 `pagehide`，不要依赖经常不触发的 `unload`。

```js
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    navigator.sendBeacon(
      "/analytics",
      JSON.stringify({ event: "page-hidden", at: Date.now() }),
    );
  }
});
```

`beforeunload` 仅适用于确有未保存数据的页面。现代浏览器不允许自定义提示文案，滥用还可能影响往返缓存（bfcache）。

## 8. 跨窗口通信

`window.postMessage()` 可在窗口、iframe 等浏览上下文之间传递可结构化克隆的数据。发送方应指定精确目标源，接收方必须验证 `event.origin`，必要时还要验证 `event.source` 与消息结构。

```js
const allowedOrigin = "https://app.example.com";

window.addEventListener("message", (event) => {
  if (event.origin !== allowedOrigin) return;
  if (!event.data || event.data.type !== "THEME_CHANGE") return;
  document.documentElement.dataset.theme = event.data.theme;
});

// 向已知 iframe 发送时：
// iframe.contentWindow.postMessage(
//   { type: "THEME_CHANGE", theme: "dark" },
//   allowedOrigin,
// );
```

不要在包含敏感信息时使用 `"*"` 作为 `targetOrigin`。

## 9. 弹窗、对话框与历史 API

`alert()`、`confirm()`、`prompt()` 会阻塞主线程，现代产品中通常用非阻塞 UI 替代。`window.open()` 可能被弹窗策略拦截，一般必须由用户手势直接触发；打开不可信页面时应避免让新页面控制原页面，可使用 `noopener`。

传统 BOM 还包含窗口移动、调整尺寸、`frames` 层级等接口。出于安全和用户体验限制，这些能力在普通标签页中常受限，了解概念即可，不宜作为现代应用核心方案。

## 常见陷阱与最佳实践

1. 不要通过 User-Agent 猜功能；先检测 API，再提供降级路径。
2. 不要期待零毫秒计时器立即执行，也不要用计时器测量精确耗时；测量使用 `performance.now()`。
3. `pushState()` 后要主动更新 UI，并确保前进、后退与直接打开 URL 都可工作。
4. `postMessage` 必须校验来源和数据结构，不要把收到的字符串直接写入 `innerHTML`。
5. 页面清理不要只依赖 `unload`；组件资源应在组件生命周期内清理。
6. 查询参数、哈希和历史状态都属于不可信输入。
7. 尽量不污染 `window`，使用 ES 模块组织依赖。

## 章节小结

BOM 连接 JavaScript 与浏览器窗口、地址、历史、设备能力和页面生命周期。现代开发应使用 `URL`、History API、标准生命周期事件和安全的 `postMessage`，同时尊重权限、同源策略、隐私限制与浏览器调度的不确定性。

## 章节导航

- 上一章：[-Promise与异步函数](/kb/language/JavaScript/核心语法/11-Promise与异步函数/)
- 下一章：[-客户端检测](/kb/language/JavaScript/核心语法/13-客户端检测/)
