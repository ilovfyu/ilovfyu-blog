<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
const scene = ref<HTMLElement | null>(null)
const active = ref(false)
let observer: IntersectionObserver | null = null
let visible = false
function sync() { active.value = visible && !document.hidden }
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .05 })
  if (scene.value) observer.observe(scene.value)
  document.addEventListener('visibilitychange', sync)
})
onBeforeUnmount(() => { observer?.disconnect(); document.removeEventListener('visibilitychange', sync) })
</script>

<template>
  <div ref="scene" class="knowledge-atlas" :class="{ 'atlas-active': active }" aria-hidden="true">
    <div class="atlas-aura" />
    <div class="atlas-world">
      <div class="atlas-floor" />
      <div class="atlas-orbit orbit-one"><i /><b /></div><div class="atlas-orbit orbit-two"><i /></div>
      <div class="atlas-sheet sheet-notes"><span>NOTES</span><div><i v-for="n in 9" :key="n" /></div></div>
      <div class="atlas-sheet sheet-tags"><span>TAGS</span><div><i v-for="n in 6" :key="n" /></div></div>
      <div class="atlas-sheet sheet-topics"><span>TOPICS</span><div><i v-for="n in 3" :key="n" /></div></div>
      <svg class="atlas-bridges" viewBox="0 0 280 280" fill="none"><path d="M40 140C40 40 240 40 240 140S40 240 40 140M80 220L140 60L210 220" /><path class="atlas-packets" d="M40 140C40 40 240 40 240 140S40 240 40 140M80 220L140 60L210 220" /></svg>
    </div>
    <span class="atlas-coordinate">KNOWLEDGE / CONSTELLATION</span><span class="atlas-caption">探索 · 关联 · 沉淀</span>
  </div>
</template>
