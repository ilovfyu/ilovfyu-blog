<script setup lang="ts">
import { computed, ref } from 'vue'
import AnimatedProjectCard from './AnimatedProjectCard.vue'
import type { ContentEntry } from '../data/content'
import { useSceneMotion } from '../utils/use-scene-motion'
const props = withDefaults(defineProps<{ entries: ContentEntry[]; variant?: 'building' | 'completed' | 'planned'; sequence?: number }>(), { variant: 'building', sequence: 1 })
const headings = {
  building: { title: '持续构建', caption: '想法正在发生。', kicker: 'BUILD IN PUBLIC' },
  completed: { title: '已完成作品', caption: '让构建，成为作品。', kicker: 'COMPLETED WORK' },
  planned: { title: '计划与构建记录', caption: '从计划，走向实现。', kicker: 'EXPLORATION LOG' },
}
const heading = computed(() => headings[props.variant])
const anchor = computed(() => `project-${props.variant}-title`)
const section = ref<HTMLElement | null>(null)
const running = useSceneMotion(section)
</script>

<template>
  <section :id="anchor" ref="section" class="project-motion-section" :class="[{ 'build-motion-active': running }, `project-${variant}-section`]" :aria-labelledby="`${anchor}-heading`">
    <header class="building-section-head">
      <div><p class="catalog-kicker">{{ String(sequence).padStart(2, '0') }} / {{ heading.kicker }}</p><h2 :id="`${anchor}-heading`">{{ heading.title }}<span>{{ heading.caption }}</span></h2></div>
    </header>
    <div class="building-grid"><AnimatedProjectCard v-for="(entry, index) in entries" :key="entry.path" :entry="entry" :index="index" /></div>
  </section>
</template>
