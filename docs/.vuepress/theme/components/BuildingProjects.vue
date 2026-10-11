<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Pause, Play } from '@lucide/vue'
import BuildingProjectCard from './BuildingProjectCard.vue'
import type { ContentEntry } from '../data/content'
defineProps<{ entries: ContentEntry[] }>()
const section = ref<HTMLElement | null>(null)
const paused = ref(false)
const visible = ref(false)
let observer: IntersectionObserver | null = null
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') { visible.value = true; return }
  observer = new IntersectionObserver(([entry]) => { visible.value = entry.isIntersecting }, { threshold: 0.05 })
  if (section.value) observer.observe(section.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="section" class="project-building-section" :class="{ 'build-motion-active': visible && !paused }" aria-labelledby="project-building-title">
    <header class="building-section-head">
      <div><p class="catalog-kicker">01 / BUILD IN PUBLIC</p><h2 id="project-building-title">持续构建<span>想法正在发生。</span></h2></div>
      <button class="building-motion-toggle" type="button" :aria-pressed="paused" :aria-label="paused ? '播放项目动效' : '暂停项目动效'" @click="paused = !paused"><Play v-if="paused" aria-hidden="true" /><Pause v-else aria-hidden="true" /><span>{{ paused ? '播放动效' : '暂停动效' }}</span></button>
    </header>
    <div class="building-grid"><BuildingProjectCard v-for="(entry, index) in entries" :key="entry.path" :entry="entry" :index="index" /></div>
  </section>
</template>
