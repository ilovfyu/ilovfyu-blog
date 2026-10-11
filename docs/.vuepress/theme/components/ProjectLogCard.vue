<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { withBase } from 'vuepress/client'
import type { ContentEntry } from '../data/content'
defineProps<{ entry: ContentEntry }>()
</script>

<template>
  <article class="article-card project-log-card" :data-tone="entry.project?.tone">
    <p class="catalog-kicker">{{ entry.label }}</p>
    <span class="project-log-number" aria-hidden="true">{{ String(entry.project?.order || 1).padStart(2, '0') }}</span>
    <h2><a :href="withBase(entry.path)">{{ entry.title }}</a></h2>
    <p>{{ entry.summary }}</p>
    <div v-if="entry.project?.group === '持续构建'" class="project-build-meta"><span class="project-build-status"><i aria-hidden="true" />持续构建</span><span>{{ entry.project.stack.slice(0, 3).join(' / ') }}</span></div>
    <div class="project-display-links"><a v-if="entry.project?.showcase" :href="withBase(entry.project.showcase)">产品展示 <ArrowUpRight aria-hidden="true" /></a><a :href="withBase(entry.path)">项目记录 <ArrowUpRight aria-hidden="true" /></a></div>
  </article>
</template>
