<script setup lang="ts">
import { ArrowUpRight, Sparkles } from '@lucide/vue'
import { withBase } from 'vuepress/client'
import type { ContentEntry } from '../data/content'
defineProps<{ entry: ContentEntry }>()
</script>

<template>
  <article class="project-display-card" :data-tone="entry.project?.tone || 'cyan'">
    <a class="project-display-art" :href="withBase(entry.project?.showcase || entry.path)" :aria-label="`${entry.title}产品展示`">
      <span class="project-display-label">{{ String(entry.project?.order || 1).padStart(2, '0') }} / {{ entry.project?.label || entry.label }}</span>
      <Sparkles class="project-display-spark" aria-hidden="true" />
      <div class="project-art-grid" aria-hidden="true" />
      <div class="project-art-orbits" aria-hidden="true"><i /><i /><i /></div>
      <div class="project-display-emblem" aria-hidden="true"><i /><b /><strong>{{ entry.project?.code.toUpperCase() || entry.title }}</strong></div>
      <div class="project-art-signal" :data-code="entry.project?.code" aria-hidden="true"><i v-for="n in 18" :key="n" :style="{ '--bar': n, '--bar-height': `${15 + ((n * 31) % 48)}px` }" /></div>
      <span class="project-art-caption" aria-hidden="true">{{ entry.project?.code === 'moyin' ? 'MATERIAL → COURSE' : entry.project?.code === 'xiake' ? 'SCRIPT → FRAME' : entry.project?.code === 'yuliao' ? 'VOICE → CONNECTION' : 'STRATEGY → PLAY' }}</span>
    </a>
    <div class="project-display-copy">
      <h2>{{ entry.title }}<span class="project-title-index" aria-hidden="true">{{ String(entry.project?.order || 1).padStart(2, '0') }}</span></h2><p>{{ entry.summary }}</p>
      <div class="project-display-links">
        <a v-if="entry.project?.showcase" class="project-display-primary" :href="withBase(entry.project.showcase)">产品展示 <ArrowUpRight aria-hidden="true" /></a>
        <a :href="withBase(entry.path)">项目记录</a>
      </div>
    </div>
  </article>
</template>
