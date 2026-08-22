---
title: "JavaScript API"
permalink: /kb/language/JavaScript/核心语法/20-JavaScript-API/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "表单脚本", link: /kb/language/JavaScript/核心语法/19-表单脚本/ }
next: { text: "错误处理与调试", link: /kb/language/JavaScript/核心语法/21-错误处理与调试/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: JavaScript API
tags:
  - javascript
  - js-core
  - web-api
---

# JavaScript API

> 前一章：[-表单脚本](/kb/language/JavaScript/核心语法/19-表单脚本/) ｜ 后一章：[-错误处理与调试](/kb/language/JavaScript/核心语法/21-错误处理与调试/)

## 学习目标

- 理解浏览器 API 的权限、安全上下文与渐进增强模型。
- 掌握拖放、文件、剪贴板、媒体、观察器等实用 API。
- 能正确处理异步调用、能力检测、取消操作和资源释放。
- 了解 IndexedDB、Worker 等适合大型任务或离线场景的能力边界。

## 1. Web API 的共同模型

JavaScript 语言本身不包含 DOM、网络、存储或设备接口，这些由宿主环境提供。现代 API 常具有以下特征：Promise 异步结果、仅 HTTPS 安全上下文可用、需要用户手势或权限、受同源策略和 Permissions Policy 限制。

能力检测应针对具体接口，并保留可用的降级路径：

```js
async function shareArticle(data) {
  if (navigator.share && navigator.canShare?.(data)) {
    await navigator.share(data);
    return;
  }

  await navigator.clipboard.writeText(data.url);
  showMessage('链接已复制');
}
```

API 存在不代表调用一定成功。用户拒绝授权、设备缺失、策略禁止和页面失焦都可能导致 Promise 拒绝。

## 2. `URL`、Blob 与对象 URL

`URL` 比字符串拼接更安全地处理地址和查询参数。它不会替你完成业务级 URL 白名单验证。

```js
const url = new URL('/search', location.origin);
url.searchParams.set('q', 'JavaScript API');
url.searchParams.set('page', '1');

history.pushState({ query: 'JavaScript API' }, '', url);
```

`Blob` 表示不可变二进制数据，对象 URL 为 Blob 提供临时本地地址。使用后必须释放。

```js
const blob = new Blob(['name,score\nAda,100'], { type: 'text/csv;charset=utf-8' });
const objectUrl = URL.createObjectURL(blob);

downloadLink.href = objectUrl;
downloadLink.download = 'scores.csv';
downloadLink.addEventListener('click', () => {
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}, { once: true });
```

## 3. File API 与拖放

拖放目标必须在 `dragover` 中取消默认行为才会接收 `drop`。读取文件时优先使用 Blob 自带的 `text()`、`arrayBuffer()`、`stream()`；`FileReader` 仍可用，但 Promise 风格通常更自然。

```js
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
});

dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  const files = [...event.dataTransfer.files];

  for (const file of files) {
    if (file.type === 'application/json') {
      const data = JSON.parse(await file.text());
      importData(data);
    }
  }
});
```

拖放不是移动端和键盘用户的完整方案，应同时提供文件选择按钮。不要信任文件名、扩展名和客户端 MIME 类型。

## 4. Clipboard API

异步 Clipboard API 通常要求 HTTPS、页面聚焦和用户激活。权限行为因浏览器而异，调用时必须捕获异常。

```js
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(codeBlock.textContent);
    showMessage('复制成功');
  } catch (error) {
    showMessage('无法访问剪贴板，请手动复制');
    console.error(error);
  }
});
```

读取剪贴板比写入限制更严格。旧的 `document.execCommand('copy')` 已废弃，只可作为确有目标浏览器需求时的有限降级。

## 5. 媒体设备与屏幕捕获

`getUserMedia()` 返回 `MediaStream`，必须在结束时停止轨道，否则摄像头或麦克风可能继续占用。

```js
let stream;

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
}

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  video.srcObject = null;
  stream = undefined;
}
```

约束是请求偏好，不保证获得完全一致的设备参数。权限应在用户理解用途后请求，并提供拒绝后的替代流程。屏幕捕获 `getDisplayMedia()` 通常必须由用户手势触发。

## 6. 地理位置与权限

地理位置属于敏感权限。只在功能确实需要时请求，并提供手动输入地点的替代方案。

```js
const position = await new Promise((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    timeout: 8_000,
    maximumAge: 60_000,
  });
});

console.log(position.coords.latitude, position.coords.longitude);
```

高精度定位耗电更高，也可能耗时更长。持续观察返回的 watch ID 要传给 `clearWatch()` 清理。

## 7. Observer API

观察器让浏览器在合适时机批量报告变化，通常优于滚动或轮询。

```js
const lazyObserver = new IntersectionObserver((entries, observer) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const image = entry.target;
    image.src = image.dataset.src;
    observer.unobserve(image);
  }
}, { rootMargin: '200px' });

document.querySelectorAll('img[data-src]').forEach((image) => lazyObserver.observe(image));
```

```js
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    updateLayout(entry.target, entry.contentRect.width);
  }
});

resizeObserver.observe(document.querySelector('.dashboard'));
```

回调内改变被观察尺寸可能造成循环警告。尽量用 CSS 容器查询解决纯样式需求，并在组件销毁时 `disconnect()`。

## 8. 通信：页面、Worker 与频道

`postMessage()` 可跨窗口通信。发送时使用明确目标源，接收时检查 `origin`、`source` 和消息结构。

```js
childWindow.postMessage({ type: 'theme', value: 'dark' }, 'https://child.example');

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.example') return;
  if (event.data?.type !== 'result') return;
  handleResult(event.data.payload);
});
```

Web Worker 适合 CPU 密集任务，不能直接操作 DOM。结构化克隆会复制多数数据，较大的 `ArrayBuffer` 可作为 transferable 转移所有权。

```js
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
worker.postMessage(buffer, [buffer]);
worker.addEventListener('message', ({ data }) => renderResult(data));
// worker.terminate();
```

同源标签页通信可考虑 `BroadcastChannel`。敏感操作仍需鉴权，频道名称不是权限控制。

## 9. 客户端存储概览

- `localStorage` 同步、容量小，适合少量非敏感偏好，不适合高频或大型数据。
- `sessionStorage` 生命周期限于标签页会话。
- IndexedDB 异步、事务化，适合结构化数据和离线缓存。
- Cache API 保存 Request/Response，常与 Service Worker 配合。

```js
const request = indexedDB.open('notes', 1);

request.onupgradeneeded = () => {
  request.result.createObjectStore('documents', { keyPath: 'id' });
};

request.onsuccess = () => {
  const transaction = request.result.transaction('documents', 'readwrite');
  transaction.objectStore('documents').put({ id: 'n-1', title: 'DOM' });
};
```

浏览器存储可能被清理或受配额限制，不能作为唯一备份。不要存放可被 XSS 轻易窃取的长期敏感凭据。

## 10. 其他实用能力

Web Notifications、Fullscreen、Web Share、Wake Lock 等 API 通常需要用户激活、权限或可见页面。应围绕用户动作发起，而不是页面加载即弹出权限请求。

网络状态 `navigator.onLine` 只能提供提示，不能证明某个服务可达。真正的离线与重试逻辑应依据请求结果，采用退避和幂等设计。

## 11. 低频与过时知识

Application Cache、Web SQL、同步 File API、插件接口和 `execCommand()` 已废弃或不应在新项目采用。早期专有电池、网络与文件系统接口也应由标准能力替代。Web Bluetooth、USB、Serial 等设备 API 能力强但支持面和安全要求特殊，应按具体产品评估。

## 常见陷阱与最佳实践

- API 调用始终处理拒绝、超时和用户取消，不能只检测属性是否存在。
- 权限按需请求，并说明用途；拒绝权限后仍提供基本流程。
- 释放对象 URL、媒体轨道、Worker、观察器和频道等资源。
- 跨窗口消息永远验证 `origin` 和数据结构，不使用 `*` 发送敏感数据。
- 大任务移出主线程，大数据传输优先 transferable，但注意所有权被转移。
- 浏览器存储不是可信数据库或安全保险箱，要处理配额、清理与数据迁移。
- 使用渐进增强，让不支持新 API 的环境仍能完成核心任务。

## 章节小结

Web API 把网页连接到文件、媒体、设备、存储和多线程能力。现代用法的重点不是记忆接口列表，而是统一处理权限、异步失败、安全来源、生命周期和降级路径，在能力增强的同时守住核心体验。

> 前一章：[-表单脚本](/kb/language/JavaScript/核心语法/19-表单脚本/) ｜ 后一章：[-错误处理与调试](/kb/language/JavaScript/核心语法/21-错误处理与调试/)
