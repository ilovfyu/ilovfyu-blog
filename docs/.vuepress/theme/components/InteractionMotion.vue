<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vuepress/client'

const route = useRoute()
const cards = '.featured-article, .article-card, .home-project-card, .building-card'
const rows = '.post-index-row, .knowledge-note-row'
const magnets = '.hero-actions .btn-primary, .profile-actions > a'
const controls = '.catalog-button, .catalog-filters button'
let active: HTMLElement | null = null
let bounds: DOMRect | null = null
let frame = 0
let enabled = false
let pointerX = 0
let pointerY = 0
let motionQuery: MediaQueryList | null = null
let pointerQuery: MediaQueryList | null = null
const timers = new Map<HTMLElement, number>()

function reset() {
  cancelAnimationFrame(frame); frame = 0
  if (active) {
    active.classList.remove('motion-tracking')
    for (const property of ['--motion-rx', '--motion-ry', '--motion-px', '--motion-py']) active.style.removeProperty(property)
  }
  active = null; bounds = null
}
function syncPreferences() {
  enabled = !motionQuery?.matches && !!pointerQuery?.matches
  document.body.classList.toggle('interaction-motion', enabled)
  if (!enabled) reset()
}
function applyPointer() {
  frame = 0
  if (!active || !bounds || !enabled) return
  const x = Math.max(0, Math.min(1, (pointerX - bounds.left) / bounds.width))
  const y = Math.max(0, Math.min(1, (pointerY - bounds.top) / bounds.height))
  active.style.setProperty('--pointer-x', (x * 100).toFixed(2) + '%')
  active.style.setProperty('--pointer-y', (y * 100).toFixed(2) + '%')
  active.style.setProperty('--motion-rx', ((0.5 - y) * 4.8).toFixed(2) + 'deg')
  active.style.setProperty('--motion-ry', ((x - 0.5) * 6.4).toFixed(2) + 'deg')
  active.style.setProperty('--motion-px', ((x - 0.5) * 5).toFixed(2) + 'px')
  active.style.setProperty('--motion-py', ((y - 0.5) * 5).toFixed(2) + 'px')
}
function onMove(event: PointerEvent) {
  if (!enabled || event.pointerType === 'touch' || !(event.target instanceof Element)) return
  const target = event.target.closest<HTMLElement>(cards + ', ' + rows + ', ' + magnets)
  if (target !== active) {
    reset()
    active = target
    if (active) { bounds = active.getBoundingClientRect(); active.classList.add('motion-tracking') }
  }
  pointerX = event.clientX; pointerY = event.clientY
  if (active && !frame) frame = requestAnimationFrame(applyPointer)
}
function onOut(event: PointerEvent) {
  if (active && (!(event.relatedTarget instanceof Node) || !active.contains(event.relatedTarget))) reset()
}
function onPress(event: MouseEvent) {
  if (motionQuery?.matches || !(event.target instanceof Element)) return
  const control = event.target.closest<HTMLElement>(controls)
  if (!control) return
  const rect = control.getBoundingClientRect()
  control.style.setProperty('--press-x', (event.detail ? event.clientX - rect.left : rect.width / 2) + 'px')
  control.style.setProperty('--press-y', (event.detail ? event.clientY - rect.top : rect.height / 2) + 'px')
  control.classList.add('motion-pressed')
  clearTimeout(timers.get(control))
  timers.set(control, window.setTimeout(() => { control.classList.remove('motion-pressed'); timers.delete(control) }, 560))
}
watch(() => route.path, reset)
onMounted(() => {
  motionQuery = matchMedia('(prefers-reduced-motion: reduce)')
  pointerQuery = matchMedia('(hover: hover) and (pointer: fine)')
  syncPreferences()
  motionQuery.addEventListener('change', syncPreferences)
  pointerQuery.addEventListener('change', syncPreferences)
  document.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerout', onOut, { passive: true })
  document.addEventListener('click', onPress, { passive: true })
  window.addEventListener('scroll', reset, { passive: true })
  window.addEventListener('resize', reset, { passive: true })
  window.addEventListener('blur', reset)
})
onBeforeUnmount(() => {
  reset(); document.body.classList.remove('interaction-motion')
  timers.forEach((timer, control) => { clearTimeout(timer); control.classList.remove('motion-pressed') }); timers.clear()
  motionQuery?.removeEventListener('change', syncPreferences)
  pointerQuery?.removeEventListener('change', syncPreferences)
  document.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerout', onOut)
  document.removeEventListener('click', onPress)
  window.removeEventListener('scroll', reset)
  window.removeEventListener('resize', reset)
  window.removeEventListener('blur', reset)
})
</script>

<template><span class="interaction-motion-root" aria-hidden="true" /></template>
