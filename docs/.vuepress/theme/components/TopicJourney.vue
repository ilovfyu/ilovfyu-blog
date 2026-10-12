<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { drawTopicJourney, type JourneyPalette } from '../scenes/topic-journey'
const props = defineProps<{ steps: { name: string; href: string }[]; label?: string }>()
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const running = ref(false)
const selected = ref(-1)
let context: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null, visibilityObserver: IntersectionObserver | null = null, themeObserver: MutationObserver | null = null
let motion: MediaQueryList | null = null, finePointer: MediaQueryList | null = null
let palette: JourneyPalette = { primary: '#7559af', secondary: '#08778a', text: '#625442', surface: '#f2ede4', dark: false }
let width = 0, height = 0, frame = 0, elapsed = 0, previous = 0, painted = 0, visible = false
const pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 }
function paint() { if (context && width && height) drawTopicJourney(context, width, height, elapsed, props.steps.length, selected.value, pointer, palette) }
function tick(now: number) {
  frame = requestAnimationFrame(tick)
  elapsed += Math.min((now - previous) / 1000, .05); previous = now
  if (now - painted < 32) return
  painted = now; pointer.x += (target.x - pointer.x) * .08; pointer.y += (target.y - pointer.y) * .08; paint()
}
function sync() {
  running.value = ready.value && visible && !document.hidden && !motion?.matches
  if (running.value && !frame) { previous = performance.now(); frame = requestAnimationFrame(tick) }
  else if (!running.value) { cancelAnimationFrame(frame); frame = 0; pointer.x = pointer.y = target.x = target.y = 0; paint() }
}
function refreshPalette() {
  if (!stage.value) return
  const style = getComputedStyle(stage.value)
  palette = { primary: style.getPropertyValue('--fx-violet').trim(), secondary: style.getPropertyValue('--fx-cyan').trim(), text: style.getPropertyValue('--text-2').trim(), surface: style.getPropertyValue('--space-1').trim(), dark: document.documentElement.dataset.theme === 'dark' }
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
  if (!stage.value || motion?.matches || !finePointer?.matches || event.pointerType === 'touch') return
  const bounds = stage.value.getBoundingClientRect()
  target.x = (event.clientX - bounds.left) / bounds.width * 2 - 1; target.y = (event.clientY - bounds.top) / bounds.height * 2 - 1
}
function leave() { target.x = target.y = 0; selected.value = -1 }
watch(() => props.steps, paint)
watch(selected, paint)
onMounted(() => {
  if (!canvas.value) return
  context = canvas.value.getContext('2d'); if (!context) return
  ready.value = true; motion = matchMedia('(prefers-reduced-motion: reduce)'); finePointer = matchMedia('(hover: hover) and (pointer: fine)'); resize()
  resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas.value)
  visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .01 }); visibilityObserver.observe(canvas.value)
  themeObserver = new MutationObserver(refreshPalette); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  motion.addEventListener('change', sync); document.addEventListener('visibilitychange', sync)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); resizeObserver?.disconnect(); visibilityObserver?.disconnect(); themeObserver?.disconnect()
  motion?.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync)
})
</script>

<template>
  <div ref="stage" class="topic-journey" :class="{ 'journey-ready': ready }" :data-motion="running ? 'running' : 'still'" @pointermove="move" @pointerleave="leave">
    <div class="journey-scene" aria-hidden="true"><canvas ref="canvas" /><svg class="journey-fallback" viewBox="0 0 800 220" fill="none"><path d="M70 155C230 0 450 210 730 70M70 164C230 9 450 219 730 79" /></svg><div class="journey-coordinate"><span>{{ label || 'CHAPTER / FLIGHTPATH' }}</span><span>01 → {{ String(Math.max(steps.length, 1)).padStart(2, '0') }}</span></div><span class="journey-depth">FOLLOW THE THREAD</span></div>
    <nav v-if="steps.length" class="journey-stops" aria-label="专题航线入口"><a v-for="(step, index) in steps" :key="step.href + index" :href="step.href" @pointerenter="selected = index" @focus="selected = index" @blur="selected = -1"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ step.name }}</strong><span aria-hidden="true">↗</span></a></nav>
  </div>
</template>
