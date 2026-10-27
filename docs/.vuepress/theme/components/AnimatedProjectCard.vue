<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight } from '@lucide/vue'
import { withBase } from 'vuepress/client'
import type { ContentEntry } from '../data/content'
import ProjectScene from './ProjectScene.vue'
import WyvernProjectVisual from './WyvernProjectVisual.vue'
import FineTuningProjectVisual from './FineTuningProjectVisual.vue'
const props = defineProps<{ entry: ContentEntry; index: number }>()
const isCache = computed(() => ['skillcache', 'promptlsm'].includes(props.entry.project?.code || ''))
const isWyvern = computed(() => props.entry.project?.code === 'wyvern')
const isTraining = computed(() => props.entry.project?.code === 'model-fine-tuning')
const isAnnotation = computed(() => props.entry.project?.code === 'annotation-tool-platform')
const completed = computed(() => props.entry.project?.group === '已完成作品')
const planned = computed(() => !['持续构建', '已完成作品'].includes(props.entry.project?.group || ''))
</script>

<template>
  <article class="building-card" :data-tone="entry.project?.tone" :data-project="entry.project?.code" :style="{ '--build-index': index }">
    <div class="building-cover" :class="{ 'building-process-cover': isWyvern || isTraining }" aria-hidden="true">
      <template v-if="!isWyvern && !isTraining"><div class="building-cover-grid" /><div class="building-cover-light" /><div class="building-edge-orbit" /></template>
      <div class="building-cover-top"><span>{{ String(index + 1).padStart(2, '0') }} / {{ entry.label }}</span><span class="building-cover-badge">{{ completed ? 'COMPLETED' : planned ? 'PLANNED' : 'IN PROGRESS' }}</span></div>
      <WyvernProjectVisual v-if="isWyvern" />
      <FineTuningProjectVisual v-else-if="isTraining" />
      <ProjectScene v-else :kind="isCache ? 'cache' : isAnnotation ? 'annotation' : 'agent'" />
      <div v-if="!isWyvern && !isTraining" class="building-cover-bottom"><span>{{ isCache ? 'STABLE CONTEXT · SMART REUSE' : isAnnotation ? 'DATA · LABEL · QUALITY' : 'IDEA · AGENT · DELIVERY' }}</span><span>概念示意</span></div>
    </div>
    <div class="building-copy">
      <p class="building-stage"><i aria-hidden="true" />{{ entry.project?.status }}</p>
      <h3>{{ entry.title }}</h3>
      <p class="building-summary">{{ entry.summary }}</p>
      <div v-if="entry.project?.stack.length" class="building-stack"><span v-for="item in entry.project.stack" :key="item">{{ item }}</span></div>
      <div class="building-actions"><a v-if="completed && entry.project?.showcase" class="building-record-link" :href="withBase(entry.project.showcase)">产品展示 <ArrowUpRight aria-hidden="true" /></a><a class="building-record-link" :href="withBase(entry.path)">{{ completed ? '项目记录' : '探索项目记录' }} <ArrowUpRight aria-hidden="true" /></a></div>
    </div>
  </article>
</template>
