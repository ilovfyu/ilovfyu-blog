---
title: 从 Core Web Vitals 到真实用户监控
createTime: 2026/06/15 10:00:00
permalink: /posts/frontend-observability/
tags:
  - Frontend
  - Observability
  - Performance
---

# 从 Core Web Vitals 到真实用户监控

实验室测试适合比较改动，真实用户监控（RUM）适合回答“用户实际遇到了什么”。同一页面在本地开发机上很顺畅，到了不同浏览器、设备、网络和页面状态下，加载与交互表现可能完全不同。Core Web Vitals 提供了用户体验的共同语言，当前核心关注 LCP、INP 和 CLS；但单独收集几个数值并不等于可观测性，真正有用的系统还要能关联版本、路由和发布事件，并保护用户隐私。

## 先定义要回答的问题

开始接入前，先写清楚问题：是某次发布让交互变差，还是只有某条路由的首屏变慢？是移动网络普遍受影响，还是某个浏览器的布局偏移异常？问题不同，所需维度和采样策略也不同。LCP 反映主要内容出现的时间，INP 关注用户交互到下一次绘制的延迟，CLS 描述页面视觉稳定性。它们是结果指标，不直接告诉你是哪段代码、哪张图片或哪个第三方脚本造成问题。

同时采集必要的上下文，例如应用版本、路由模板、浏览器类别、设备类别、连接类型和导航类型。维度要有限且可聚合，避免把完整 URL、搜索词、用户输入或个人标识放进标签，防止高基数和隐私风险。

## 在浏览器端采集并可靠上报

可以使用遵循相应规范的 `web-vitals` 库，而不是自行猜测指标结束时机。下面的代码只展示采集层：上报接口应验证数据、限制字段，并在服务端完成聚合。

```ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

type RumPayload = {
  name: Metric['name']
  value: number
  id: string
  route: string
  release: string
  navigationType: Metric['navigationType']
}

const release = document.documentElement.dataset.release ?? 'unknown'

function report(metric: Metric) {
  const payload: RumPayload = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    route: location.pathname,
    release,
    navigationType: metric.navigationType,
  }
  const body = JSON.stringify(payload)
  const data = new Blob([body], { type: 'application/json' })

  if (navigator.sendBeacon('/rum/web-vitals', data)) return
  void fetch('/rum/web-vitals', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  })
}

onLCP(report)
onINP(report)
onCLS(report)
```

`sendBeacon` 适合页面即将离开时发送小型数据，失败时再用带 `keepalive` 的请求兜底。上报本身不能阻塞关键渲染：应控制 payload 大小、按会话或设备抽样，并处理接口不可用的情况。指标回调可能在页面生命周期较晚时触发，服务端要按 `id` 去重，不能把同一指标的每次更新简单相加。

## 从数字走向诊断闭环

服务端不要只存一个全局平均值。按路由、版本、设备类别等维度计算分位数和分布，观察发布前后的变化；平均值容易掩盖少数用户的长尾问题。告警应基于明确的服务目标、样本量和持续时间，阈值应参考当前官方指标定义，并结合业务可接受程度，而不是照搬一组脱离场景的数字。

当某版本的 INP 变差时，先定位受影响的交互和路由，再回到 Performance trace、长任务、组件更新和第三方脚本寻找原因。LCP 异常可进一步检查资源发现顺序、图片尺寸和缓存；CLS 异常则检查未预留空间的媒体、动态插入内容和字体切换。RUM 负责发现范围，浏览器 trace 和日志负责解释原因，两者不能互相替代。

## 实践清单

- 明确每个指标要支持的决策、目标用户范围和采样比例。
- 采集 LCP、INP、CLS，并记录版本、路由和有限的环境维度。
- 使用稳定的指标 `id` 去重，服务端按样本量和分布计算结果。
- 对 URL、输入内容、Cookie 和用户标识做最小化处理，先完成隐私评审。
- 上报采用 `sendBeacon` 或 `keepalive`，失败不影响页面主流程。
- 将指标变化与发布、资源变更和错误日志关联，再用 trace 完成根因分析。
- 监控采集接口本身的成功率、数据延迟和字段质量，防止“看不见”被误认为“没有问题”。

## 总结

Core Web Vitals 是体验观测的起点，不是完整答案。RUM 的价值在于把结果指标放回真实用户、真实版本和真实路由中，再通过聚合、隐私控制和发布关联形成反馈回路。先定义问题，采集最少但足够的上下文，最后用诊断工具验证原因，前端性能才会从一次性优化变成可持续运营的工程能力。
