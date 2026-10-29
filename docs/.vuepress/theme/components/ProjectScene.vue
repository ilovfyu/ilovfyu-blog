<script setup lang="ts">
import { useSceneMotion } from '../utils/use-scene-motion'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { drawProjectScene, type SceneKind, type ScenePalette } from '../scenes/project-scene'
const props = defineProps<{ kind: SceneKind }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const motionAllowed = useSceneMotion(canvas)
const running = computed(() => ready.value && motionAllowed.value)
let context: CanvasRenderingContext2D | null = null
let cover: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
let finePointer: MediaQueryList | null = null
let palette: ScenePalette = { accent: '#08778a', secondary: '#987039', text: '#625442', dark: false }
let width = 0, height = 0, frame = 0, elapsed = 0, previous = 0, paintTime = 0
const pointer = { x: 0, y: 0 }
const target = { x: 0, y: 0 }
function paint() {
  if (context && width && height) drawProjectScene(context, width, height, props.kind, elapsed, pointer, palette)
}
function tick(now: number) {
  frame = requestAnimationFrame(tick)
  elapsed += Math.min((now - previous) / 1000, .05); previous = now
  if (now - paintTime < 32) return
  paintTime = now
  pointer.x += (target.x - pointer.x) * .1
  pointer.y += (target.y - pointer.y) * .1
  paint()
}
function sync() {
  if (running.value && !frame) { previous = performance.now(); frame = requestAnimationFrame(tick) }
  else if (!running.value) { cancelAnimationFrame(frame); frame = 0; pointer.x = pointer.y = target.x = target.y = 0; paint() }
}
function refreshPalette() {
  if (!cover) return
  const style = getComputedStyle(cover)
  palette = { accent: style.getPropertyValue('--build-accent').trim(), secondary: style.getPropertyValue('--build-secondary').trim(), text: style.getPropertyValue('--text-2').trim(), dark: document.documentElement.dataset.theme === 'dark' }
  paint()
}
function resize() {
  if (!canvas.value || !context) return
  width = canvas.value.clientWidth; height = canvas.value.clientHeight
  const ratio = Math.min(devicePixelRatio || 1, 1.5)
  canvas.value.width = Math.round(width * ratio); canvas.value.height = Math.round(height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  refreshPalette()
}
function onMove(event: PointerEvent) {
  if (!cover || !running.value || !finePointer?.matches || event.pointerType === 'touch') return
  const bounds = cover.getBoundingClientRect()
  target.x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
  target.y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
}
function onLeave() { target.x = target.y = 0 }
watch(running, sync)
onMounted(() => {
  if (!canvas.value) return
  context = canvas.value.getContext('2d')
  if (!context) return
  cover = canvas.value.closest<HTMLElement>('.building-cover')
  finePointer = matchMedia('(hover: hover) and (pointer: fine)')
  ready.value = true
  resize()
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas.value)
  themeObserver = new MutationObserver(refreshPalette)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  cover?.addEventListener('pointermove', onMove, { passive: true })
  cover?.addEventListener('pointerleave', onLeave, { passive: true })
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect(); themeObserver?.disconnect()
  cover?.removeEventListener('pointermove', onMove); cover?.removeEventListener('pointerleave', onLeave)
})
</script>

<template>
  <div class="project-scene" :class="{ 'scene-ready': ready }" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <div class="scene-atmosphere" /><div class="scene-horizon" />
    <div class="scene-fallback"><i /><b /><span>{{ kind === 'cache' ? 'KV' : kind === 'agent' ? 'AI' : 'DATA' }}</span></div>
    <canvas ref="canvas" />
    <span class="scene-coordinate coordinate-left">{{ kind === 'cache' ? 'MEMORY ARCHITECTURE' : kind === 'agent' ? 'AGENT CONSTELLATION' : 'DATA INSPECTION' }}</span>
    <span class="scene-coordinate coordinate-right">{{ kind === 'cache' ? 'P / LSM' : kind === 'agent' ? 'R / AI' : 'LABEL / QA' }}</span>
  </div>
</template>
