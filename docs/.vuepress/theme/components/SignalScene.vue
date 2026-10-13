<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Point = { x: number; y: number; z: number }
type Projected = Point & { scale: number; index: number }

const modes = [
  { code: '01', name: 'CODE', title: '代码', description: '让零散的想法，连接成可以运行的系统。' },
  { code: '02', name: 'BUILD', title: '构建', description: '一层层搭建结构，让想法拥有真实的形状。' },
  { code: '03', name: 'WRITE', title: '写作', description: '把经验串成线，留下每次选择背后的理由。' },
]
const mode = ref(0)
const reduced = ref(false)
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const count = 144

// 固定点集与预计算邻接边：形态切换时只插值坐标，不在每帧重新寻找邻居。
const shapes: Point[][] = [
  Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const angle = i * Math.PI * (3 - Math.sqrt(5))
    return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius }
  }),
  Array.from({ length: count }, (_, i) => {
    const face = i % 6
    const u = ((Math.floor(i / 6) % 4) / 3 - 0.5) * 1.55
    const v = (Math.floor(i / 24) / 5 - 0.5) * 1.55
    if (face < 2) return { x: face === 0 ? -0.78 : 0.78, y: u, z: v }
    if (face < 4) return { x: u, y: face === 2 ? -0.78 : 0.78, z: v }
    return { x: u, y: v, z: face === 4 ? -0.78 : 0.78 }
  }),
  Array.from({ length: count }, (_, i) => {
    const t = Math.floor(i / 2) / (count / 2 - 1)
    const angle = t * Math.PI * 5
    const side = i % 2 ? -1 : 1
    return { x: Math.cos(angle) * 0.6 * side, y: (t - 0.5) * 1.95, z: Math.sin(angle) * 0.6 * side }
  }),
]
const edges = shapes.map((shape, shapeIndex) => {
  const links: [number, number][] = []
  const seen = new Set<string>()
  const add = (a: number, b: number) => {
    const key = Math.min(a, b) + ':' + Math.max(a, b)
    if (!seen.has(key)) { seen.add(key); links.push([a, b]) }
  }
  if (shapeIndex === 2) {
    for (let i = 0; i < count; i++) {
      if (i + 2 < count) add(i, i + 2)
      if (i % 2 === 0) add(i, i + 1)
    }
  }
  else {
    shape.forEach((p, i) => {
      shape.map((q, j) => ({ j, distance: Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) }))
        .filter(q => q.j !== i).sort((a, b) => a.distance - b.distance).slice(0, 3)
        .forEach(q => add(i, q.j))
    })
  }
  return links
})
const points = shapes[0].map(p => ({ ...p }))
let context: CanvasRenderingContext2D | null = null
let frame = 0
let width = 0
let height = 0
let time = 0
let lastFrame = 0
let lastPaint = 0
let visible = true
let light = true
let coarse = false
let finePointer = false
let resizeObserver: ResizeObserver | null = null
let visibilityObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null
let motionQuery: MediaQueryList | null = null
const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

function project(point: Point, index = 0): Projected {
  const yaw = time * 0.16 + pointer.x * 0.42 + 0.3
  const pitch = Math.sin(time * 0.13) * 0.12 + pointer.y * 0.3 - 0.15
  const x = point.x * Math.cos(yaw) - point.z * Math.sin(yaw)
  const z = point.x * Math.sin(yaw) + point.z * Math.cos(yaw)
  const y = point.y * Math.cos(pitch) - z * Math.sin(pitch)
  const depth = point.y * Math.sin(pitch) + z * Math.cos(pitch)
  const scale = 3.8 / (3.8 + depth)
  const size = Math.min(width * 0.34, height * 0.38)
  return { x: width / 2 + x * size * scale, y: height / 2 + y * size * scale, z: depth, scale, index }
}

function paint(delta = 0) {
  if (!context || !width || !height) return
  const ctx = context
  ctx.clearRect(0, 0, width, height)
  const target = shapes[mode.value]
  const easing = delta ? 1 - Math.exp(-delta * 7) : 1
  points.forEach((point, i) => {
    point.x += (target[i].x - point.x) * easing
    point.y += (target[i].y - point.y) * easing
    point.z += (target[i].z - point.z) * easing
  })
  const colors = light ? ['8,123,146', '117,89,175', '154,97,27'] : ['117,228,241', '185,155,255', '240,180,90']
  const projected = points.map(project)
  const alpha = light ? 0.34 : 0.36

  // 透视地平线与两道空间轨道，为点阵提供前后层次。
  ctx.lineWidth = 0.65
  for (let ring = 0; ring < 2; ring++) {
    ctx.beginPath()
    for (let i = 0; i <= 100; i++) {
      const angle = (i / 100) * Math.PI * 2
      const radius = ring ? 1.2 : 1.27
      const p = project({ x: Math.cos(angle) * radius, y: Math.sin(angle) * (ring ? 0.25 : 0.12), z: Math.sin(angle) * radius })
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.strokeStyle = 'rgba(' + colors[ring] + ',' + (light ? 0.2 : 0.22) + ')'
    ctx.stroke()
  }
  edges[mode.value].forEach(([from, to], index) => {
    const a = projected[from]
    const b = projected[to]
    const depth = Math.max(0.25, 1 - (a.z + b.z + 2) / 5)
    ctx.strokeStyle = 'rgba(' + colors[mode.value] + ',' + alpha * depth + ')'
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    if (index % 13 === 0) {
      const progress = (time * 0.35 + index * 0.17) % 1
      ctx.fillStyle = 'rgba(' + colors[(mode.value + 1) % 3] + ',0.85)'
      ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress, 1.5, 0, Math.PI * 2); ctx.fill()
    }
  })
  projected.sort((a, b) => b.z - a.z).forEach(point => {
    const front = Math.max(0.2, 1 - (point.z + 1) / 3)
    const accent = point.index % 17 === 0
    const radius = (accent ? 2.7 : 1.2) * point.scale
    ctx.fillStyle = 'rgba(' + colors[accent ? (mode.value + 1) % 3 : mode.value] + ',' + (accent ? 0.9 : front * 0.85) + ')'
    if (accent) {
      ctx.beginPath(); ctx.arc(point.x, point.y, radius * 3.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(' + colors[(mode.value + 1) % 3] + ',0.075)'; ctx.fill()
      ctx.fillStyle = 'rgba(' + colors[(mode.value + 1) % 3] + ',0.9)'
    }
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill()
  })
}

function stop() { cancelAnimationFrame(frame); frame = 0; lastFrame = 0; lastPaint = 0 }
function tick(timestamp: number) {
  const interval = coarse ? 1000 / 30 : 1000 / 60
  if (!lastPaint || timestamp - lastPaint >= interval - 0.5) {
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 1 / 60
    time += delta
    pointer.x += (pointer.tx - pointer.x) * 0.09
    pointer.y += (pointer.ty - pointer.y) * 0.09
    paint(delta)
    lastFrame = timestamp; lastPaint = timestamp
  }
  frame = requestAnimationFrame(tick)
}
function start() {
  if (frame || reduced.value || !visible || document.hidden) return
  frame = requestAnimationFrame(tick)
}
function syncPlayback() { stop(); if (reduced.value) paint(); else start() }
function syncTheme() { light = document.documentElement.dataset.theme !== 'dark'; paint(1 / 60) }
function syncMotion() { reduced.value = !!motionQuery?.matches; pointer.tx = pointer.ty = 0; syncPlayback() }
function onVisibility() { if (document.hidden) stop(); else start() }
function resize() {
  if (!stage.value || !canvas.value) return
  width = stage.value.clientWidth; height = stage.value.clientHeight
  coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 760
  finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches
  const dpr = Math.min(devicePixelRatio || 1, coarse ? 1.35 : 2)
  canvas.value.width = Math.round(width * dpr); canvas.value.height = Math.round(height * dpr)
  context = canvas.value.getContext('2d')
  context?.setTransform(dpr, 0, 0, dpr, 0, 0)
  paint(1 / 60)
}
function onPointer(event: PointerEvent) {
  if (!finePointer || reduced.value || !stage.value) return
  const bounds = stage.value.getBoundingClientRect()
  pointer.tx = (event.clientX - bounds.left) / bounds.width - 0.5
  pointer.ty = (event.clientY - bounds.top) / bounds.height - 0.5
}
function resetPointer() { pointer.tx = pointer.ty = 0 }

watch(mode, () => { if (reduced.value) paint(); else start() })
onMounted(() => {
  motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
  reduced.value = motionQuery.matches
  motionQuery.addEventListener('change', syncMotion)
  resize(); syncTheme()
  resizeObserver = new ResizeObserver(resize)
  if (stage.value) resizeObserver.observe(stage.value)
  visibilityObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false
    if (visible) start(); else stop()
  }, { rootMargin: '80px' })
  if (stage.value) visibilityObserver.observe(stage.value)
  themeObserver = new MutationObserver(syncTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', onVisibility)
  start()
})
onBeforeUnmount(() => {
  stop(); resizeObserver?.disconnect(); visibilityObserver?.disconnect(); themeObserver?.disconnect()
  motionQuery?.removeEventListener('change', syncMotion)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div class="signal-scene" :data-signal-mode="modes[mode].name.toLowerCase()">
    <div ref="stage" class="signal-stage" @pointermove="onPointer" @pointerleave="resetPointer">
      <canvas ref="canvas" class="signal-canvas" aria-hidden="true" />
      <div class="signal-core" aria-hidden="true"><strong>FYU</strong><span>{{ modes[mode].name }} / {{ reduced ? 'STILL' : 'IN MOTION' }}</span></div>
      <span class="signal-coordinate" aria-hidden="true">{{ modes[mode].code }} / {{ ['CONNECTED FIELD', 'SPATIAL STRUCTURE', 'CONTINUOUS THREAD'][mode] }}</span>
    </div>
    <p class="signal-description" aria-live="polite">{{ modes[mode].description }}</p>
    <div class="signal-controls" role="group" aria-label="切换个人信号形态">
      <button v-for="(item, index) in modes" :key="item.code" type="button" :aria-pressed="mode === index" :aria-label="'切换到' + item.title + '信号'" @click="mode = index"><span>{{ item.code }}</span><strong>{{ item.name }}</strong><i aria-hidden="true" /></button>
    </div>
  </div>
</template>
