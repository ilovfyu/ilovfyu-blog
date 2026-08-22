---
title: Vue 3 高性能交互：建立 16ms 渲染预算
createTime: 2026/07/12 10:00:00
permalink: /posts/vue-render-budget/
tags:
  - Vue
  - Performance
  - Frontend
---

# Vue 3 高性能交互：建立 16ms 渲染预算

页面“卡顿”通常不是某一行代码慢，而是一次交互在主线程上堆积了太多工作：事件处理、Vue 响应式更新、组件渲染、样式计算、布局和绘制都要争用同一条线程。以 60Hz 屏幕为例，一帧约有 `1000 / 60 = 16.67ms`。把 16ms 当作交互预算，目的不是制造一个绝对指标，而是提醒我们：高频输入的同步路径必须足够小，低优先级工作要被拆分或延后。

## 先找出预算花在哪里

不要先给所有组件加缓存。打开浏览器 Performance 面板，录制一次真实操作，分别观察 Long Task、脚本执行、Recalculate Style、Layout 和 Paint。若脚本占大头，检查事件处理器和组件更新范围；若布局占大头，检查是否在循环中交替读取和写入几何属性；若绘制占大头，检查阴影、滤镜、大面积重绘和频繁变化的 DOM。

交互预算还应按路径拆分。输入框的回显属于高优先级，搜索结果过滤、统计和日志上报可以延后；一个列表中只有一行发生变化，就不应该让整个列表的昂贵子树都重新执行。只有明确了“谁被更新、为什么更新”，优化才不会变成盲目的 `v-if` 或 `v-memo` 堆叠。

## 缩小响应式更新面

组件状态应尽量靠近使用它的地方。大对象或大数组如果只是整体替换，可以使用 `shallowRef`，避免为每个深层属性建立不必要的响应式代理；但替换后必须重新赋值，不能依赖深层变更触发更新。对派生结果使用 `computed`，并保持模板中的计算简单。

下面的例子把列表作为不可变快照替换，并让 `v-memo` 只在行的稳定标识或更新时间变化时重新执行该行。它不是通用开关：如果行内内容依赖了没有写进依赖数组的值，就会显示旧内容，因此必须在验证正确性后使用。

```vue
<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'

type Row = {
  id: string
  title: string
  updatedAt: number
}

const query = ref('')
const rows = shallowRef<Row[]>([])

const visibleRows = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) return rows.value
  return rows.value.filter((row) => row.title.toLowerCase().includes(keyword))
})

function replaceRows(nextRows: Row[]) {
  rows.value = nextRows
}
</script>

<template>
  <input v-model="query" aria-label="搜索" />
  <ul>
    <li
      v-for="row in visibleRows"
      :key="row.id"
      v-memo="[row.id, row.updatedAt]"
    >
      {{ row.title }}
    </li>
  </ul>
</template>
```

## 把重活移出同步路径

大列表应优先考虑分页或虚拟滚动，而不是只优化每个 `li`。昂贵的排序、模糊搜索和格式化可以放到 Web Worker，或拆成小批次在空闲时执行；网络请求要取消过期结果，避免快速输入时旧响应覆盖新状态。事件处理器只更新必要状态，DOM 测量集中在合适的生命周期阶段，避免读写交错造成额外布局。

组件层面的优化也要有证据：稳定的 `key`、避免在模板中创建复杂临时对象、减少深层响应式数据通常比随意添加缓存更可靠。发布版本必须在接近用户的设备和数据规模上验证，开发模式下的警告和源码映射不能代表生产表现。

## 实践清单

- 用一次可复现的点击、输入或拖拽录制 Performance trace。
- 将脚本、布局、绘制和网络等待分开归因，不把所有问题都叫作“Vue 慢”。
- 明确高优先级同步工作，并为低优先级任务设计拆分、取消或降级策略。
- 大集合使用分页、虚拟化或服务端过滤，避免让模板承担全部数据处理。
- 使用 `shallowRef`、`computed`、稳定 `key` 和 `v-memo` 前先确认依赖关系与正确性。
- 在生产构建、目标设备和代表性数据量上复测，并记录优化前后的 trace。

## 总结

16ms 是一个用来管理取舍的预算。高性能 Vue 交互的核心不是某个神奇 API，而是控制一次状态变化的影响范围，缩短主线程同步路径，再把不可避免的工作拆开、取消或迁移。先测量，再按成本归因，最后用真实交互验证，性能优化才会成为可持续的工程流程。
