<script setup lang="ts">
import { useSceneMotion } from '../utils/use-scene-motion'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { drawCatalogScene, type CatalogSceneKind, type CatalogScenePalette } from '../scenes/catalog-scene'
const props = defineProps<{ kind: CatalogSceneKind }>()
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const motionAllowed = useSceneMotion(stage)
const running = computed(() => ready.value && motionAllowed.value)
let context: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null, themeObserver: MutationObserver | null = null
let finePointer: MediaQueryList | null = null
let palette: CatalogScenePalette = { primary: '#7559af', secondary: '#08778a', text: '#625442', surface: '#f2ede4', dark: false }
let width = 0, height = 0, frame = 0, elapsed = 0, previous = 0, painted = 0
const pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 }
function paint() { if (context && width && height) drawCatalogScene(context, width, height, props.kind, elapsed, pointer, palette) }
function tick(now: number) {
  frame = requestAnimationFrame(tick)
  elapsed += Math.min((now - previous) / 1000, .05); previous = now
  if (now - painted < 32) return
  painted = now; pointer.x += (target.x - pointer.x) * .08; pointer.y += (target.y - pointer.y) * .08; paint()
}
function sync() {
  if (running.value && !frame) { previous = performance.now(); frame = requestAnimationFrame(tick) }
  else if (!running.value) { cancelAnimationFrame(frame); frame = 0; pointer.x = pointer.y = target.x = target.y = 0; paint() }
}
function refreshPalette() {
  if (!stage.value) return
  const style = getComputedStyle(stage.value)
  const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  palette = { primary: color(props.kind === 'topics' ? '--fx-violet' : '--fx-cyan', palette.primary), secondary: color(props.kind === 'topics' ? '--fx-cyan' : '--cyan', palette.secondary), text: color('--text-2', palette.text), surface: color('--space-1', palette.surface), dark: document.documentElement.dataset.theme === 'dark' }
  paint()
}
function resize() {
  if (!canvas.value || !context) return
  width = canvas.value.clientWidth; height = canvas.value.clientHeight
  const dpr = Math.min(devicePixelRatio || 1, 1.5)
  canvas.value.width = Math.round(width * dpr); canvas.value.height = Math.round(height * dpr); context.setTransform(dpr, 0, 0, dpr, 0, 0)
  refreshPalette()
}
function move(event: PointerEvent) {
  if (!stage.value || !running.value || !finePointer?.matches || event.pointerType === 'touch') return
  const bounds = stage.value.getBoundingClientRect()
  target.x = (event.clientX - bounds.left) / bounds.width * 2 - 1; target.y = (event.clientY - bounds.top) / bounds.height * 2 - 1
}
function leave() { target.x = target.y = 0 }
watch(() => props.kind, refreshPalette)
watch(running, sync)
onMounted(() => {
  if (!canvas.value) return
  context = canvas.value.getContext('2d'); if (!context) return
  ready.value = true; finePointer = matchMedia('(hover: hover) and (pointer: fine)'); resize()
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas.value)
  themeObserver = new MutationObserver(refreshPalette); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); resizeObserver?.disconnect(); themeObserver?.disconnect()
})
</script>

<template>
  <div ref="stage" class="catalog-scene" :class="{ 'catalog-scene-ready': ready }" :data-kind="kind" :data-motion="running ? 'running' : 'still'" aria-hidden="true" @pointermove="move" @pointerleave="leave">
    <div class="catalog-scene-aura" /><div class="catalog-scene-calibration"><i v-for="tick in 12" :key="tick" :style="{ '--tick': tick }" /></div><canvas ref="canvas" />
    <div class="catalog-scene-fallback"><i /><b /><span>{{ kind === 'topics' ? 'READ' : 'WRITE' }}</span></div>
    <span class="catalog-scene-coordinate">{{ kind === 'topics' ? 'CHAPTER / PRISM' : 'WRITING / IN MOTION' }}</span>
    <span class="catalog-scene-caption">{{ kind === 'topics' ? '探索 · 关联 · 深入' : '观察 · 构建 · 记录' }}</span>
  </div>
</template>
