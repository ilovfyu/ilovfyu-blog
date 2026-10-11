<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AnimatedProjectCard from './AnimatedProjectCard.vue'
import type { ContentEntry } from '../data/content'
const props = withDefaults(defineProps<{ entries: ContentEntry[]; variant?: 'building' | 'completed'; sequence?: number }>(), { variant: 'building', sequence: 1 })
const completed = computed(() => props.variant === 'completed')
const anchor = computed(() => completed.value ? 'project-completed-title' : 'project-building-title')
const section = ref<HTMLElement | null>(null)
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
  <section :id="anchor" ref="section" class="project-motion-section" :class="{ 'build-motion-active': visible, 'project-completed-section': completed, 'project-building-section': !completed }" :aria-labelledby="`${anchor}-heading`">
    <header class="building-section-head">
      <div><p class="catalog-kicker">{{ String(sequence).padStart(2, '0') }} / {{ completed ? 'COMPLETED WORK' : 'BUILD IN PUBLIC' }}</p><h2 :id="`${anchor}-heading`">{{ completed ? '已完成作品' : '持续构建' }}<span>{{ completed ? '让构建，成为作品。' : '想法正在发生。' }}</span></h2></div>
    </header>
    <div class="building-grid"><AnimatedProjectCard v-for="(entry, index) in entries" :key="entry.path" :entry="entry" :index="index" /></div>
  </section>
</template>
