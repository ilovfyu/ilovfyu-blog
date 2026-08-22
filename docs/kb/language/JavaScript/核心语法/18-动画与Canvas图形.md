---
title: "动画与 Canvas 图形"
permalink: /kb/language/JavaScript/核心语法/18-动画与Canvas图形/
pageClass: knowledge-note-page
comments: false
editLink: false
lastUpdated: false
contributors: false
readingTime: true
aside: true
outline: [2, 3]
prev: { text: "事件", link: /kb/language/JavaScript/核心语法/17-事件/ }
next: { text: "表单脚本", link: /kb/language/JavaScript/核心语法/19-表单脚本/ }
knowledgeNote:
  series: "Language"
  group: "核心语法"
---
---
title: 动画与 Canvas 图形
tags:
  - javascript
  - js-core
  - canvas
  - animation
---

# 动画与 Canvas 图形

> 前一章：[-事件](/kb/language/JavaScript/核心语法/17-事件/) ｜ 后一章：[-表单脚本](/kb/language/JavaScript/核心语法/19-表单脚本/)

## 学习目标

- 根据场景选择 CSS 动画、Web Animations API 或逐帧 JavaScript。
- 掌握 `requestAnimationFrame()` 的时间驱动动画模型。
- 能正确处理 Canvas 高清缩放、绘制状态、图像与像素安全限制。
- 理解主线程性能、可访问性和资源生命周期对动画的影响。

## 1. 动画方案选择

简单状态过渡优先 CSS `transition`，声明式关键帧优先 CSS Animation；需要运行时控制、组合或等待完成时可用 Web Animations API；游戏、粒子和 Canvas 渲染通常使用 `requestAnimationFrame()`。

CSS 的 `transform` 与 `opacity` 往往能避免布局，但“必然由 GPU 加速”不是保证。不要无节制使用 `will-change`，它会增加内存和合成开销。

```js
const animation = panel.animate(
  [
    { opacity: 0, transform: 'translateY(12px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  { duration: 240, easing: 'ease-out', fill: 'both' },
);

await animation.finished;
panel.classList.add('is-ready');
```

## 2. `requestAnimationFrame()`

回调会在浏览器准备下一次重绘前执行，并收到高精度时间戳。刷新率可能是 60Hz、120Hz 或动态变化，因此动画必须按时间差推进，不能假设每帧固定 16.7ms。

```js
let animationId;
let previousTime;
let x = 0;

function frame(time) {
  const delta = previousTime === undefined ? 0 : Math.min(time - previousTime, 100);
  previousTime = time;
  x += 0.12 * delta;
  sprite.style.transform = `translateX(${x}px)`;

  if (x < 500) animationId = requestAnimationFrame(frame);
}

animationId = requestAnimationFrame(frame);
// cancelAnimationFrame(animationId);
```

后台标签页中帧回调通常会降频或暂停。返回页面时应限制过大的 `delta`，物理模拟可采用固定时间步并设置追赶上限。

## 3. 动画性能与用户偏好

一帧中尽量先读取布局，再集中写样式。大量 JavaScript、样式计算、布局和绘制都会挤压帧预算。使用 DevTools Performance 面板观察长任务、掉帧和 layout shift。

```js
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

function reveal(element) {
  if (reduceMotion.matches) {
    element.classList.add('visible');
    return;
  }
  element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
}
```

减少动态效果不一定意味着删除所有反馈，而是避免大幅位移、视差和持续运动，并保留清晰的状态变化。

## 4. Canvas 基础与高清适配

`&lt;canvas&gt;` 的 CSS 显示尺寸和绘图缓冲区尺寸是两回事。高 DPI 屏幕上应根据 `devicePixelRatio` 放大缓冲区，再缩放坐标系。

```html
&lt;canvas id="chart" width="600" height="300"&gt;
  当前浏览器无法显示图表，请查看后附数据表。
&lt;/canvas&gt;
```

```js
function resizeCanvas(canvas, width, height) {
  const ratio = window.devicePixelRatio || 1;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return context;
}
```

修改 `canvas.width` 或 `height` 会清空画布并重置绘图状态。响应容器尺寸时可用 `ResizeObserver`，但应避免反馈循环。

## 5. 2D 绘图状态与路径

Canvas 是即时模式：绘制后不保留可操作“图形节点”。`save()`/`restore()` 管理变换、裁剪、填充等状态；路径则由 `beginPath()` 开始。

```js
const canvas = document.querySelector('#chart');
const ctx = resizeCanvas(canvas, 600, 300);

ctx.clearRect(0, 0, 600, 300);
ctx.save();
ctx.translate(100, 100);
ctx.rotate(Math.PI / 8);
ctx.fillStyle = '#2563eb';
ctx.fillRect(-40, -40, 80, 80);
ctx.restore();

ctx.beginPath();
ctx.arc(300, 150, 60, 0, Math.PI * 2);
ctx.strokeStyle = '#0f172a';
ctx.lineWidth = 3;
ctx.stroke();
```

忘记 `beginPath()` 会让后续 `stroke()` 重绘此前子路径；忘记恢复状态会污染后续绘制。

## 6. 文本、渐变与变换

```js
const gradient = ctx.createLinearGradient(0, 0, 240, 0);
gradient.addColorStop(0, '#06b6d4');
gradient.addColorStop(1, '#8b5cf6');

ctx.fillStyle = gradient;
ctx.font = '600 20px system-ui';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Canvas', 120, 50);

const metrics = ctx.measureText('Canvas');
console.log(metrics.width);
```

Canvas 文本不是 DOM 文本，不能自然选择、搜索或被辅助技术完整理解。信息图表应提供等价文字、数据表或可访问的 DOM 结构。

## 7. 图像与异步解码

图像加载和解码是异步的。`createImageBitmap()` 可在支持的场景中提前解码并得到适合绘制的位图。

```js
const response = await fetch('/assets/photo.webp');
if (!response.ok) throw new Error(`Image request failed: ${response.status}`);

const bitmap = await createImageBitmap(await response.blob());
ctx.drawImage(bitmap, 0, 0, 320, 180);
bitmap.close();
```

跨源图片若缺少正确 CORS 响应，会污染画布。污染后仍能显示，但调用 `getImageData()`、`toBlob()` 等读取像素的接口会抛出安全异常。

## 8. 像素处理与导出

`getImageData()` 返回 RGBA 字节数组。逐像素处理成本高，应缩小处理区域，避免每帧读回 GPU/绘图结果。

```js
const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

for (let i = 0; i < image.data.length; i += 4) {
  const average = (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3;
  image.data[i] = average;
  image.data[i + 1] = average;
  image.data[i + 2] = average;
}

ctx.putImageData(image, 0, 0);
```

导出优先异步 `toBlob()`，避免 `toDataURL()` 生成巨大的内存字符串。

```js
const blob = await new Promise((resolve, reject) => {
  canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Export failed')), 'image/png');
});
```

## 9. 离屏与大型渲染

`OffscreenCanvas` 可把部分渲染工作移到 Worker，减少主线程压力；支持程度和字体、DOM 依赖等限制需要实测。静态复杂路径可使用 `Path2D` 复用。WebGL/WebGPU 更适合大量 3D 或并行图形任务，不应强行用 2D Canvas 实现所有图形需求。

## 10. 低频与过时知识

`setInterval()` 曾常用于动画，但它不与浏览器绘制同步，后台节流和任务阻塞会造成堆积。新动画应优先 `requestAnimationFrame()`。旧版 IE 的 VML、插件式图形方案仅有历史意义。

## 常见陷阱与最佳实践

- 不以固定帧数表示速度，使用回调时间戳计算进度。
- 动画停止或组件销毁时取消帧请求和观察器。
- 尊重 `prefers-reduced-motion`，避免动画成为获取信息的唯一方式。
- Canvas 初始化时处理 DPR，尺寸变化后完整重绘。
- 成对使用 `save()`/`restore()`，每个独立路径前调用 `beginPath()`。
- 绘制跨源图片前配置 CORS；不要在绘制后才期望绕过画布污染。
- 为 Canvas 内容提供语义化替代信息和键盘交互层。

## 章节小结

现代动画应优先使用声明式能力，并在需要逐帧控制时按真实时间推进。Canvas 提供高效即时绘图，但开发者必须自行管理分辨率、状态、重绘、命中测试和可访问性；性能问题应通过帧分析和任务拆分解决。

> 前一章：[-事件](/kb/language/JavaScript/核心语法/17-事件/) ｜ 后一章：[-表单脚本](/kb/language/JavaScript/核心语法/19-表单脚本/)
