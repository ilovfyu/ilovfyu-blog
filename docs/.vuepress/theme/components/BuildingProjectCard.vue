<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight } from '@lucide/vue'
import { withBase } from 'vuepress/client'
import type { ContentEntry } from '../data/content'
const props = defineProps<{ entry: ContentEntry; index: number }>()
const isCache = computed(() => props.entry.project?.code === 'promptlsm')
</script>

<template>
  <article class="building-card" :data-tone="entry.project?.tone" :style="{ '--build-index': index }">
    <div class="building-cover" aria-hidden="true">
      <div class="building-cover-grid" /><div class="building-cover-light" />
      <div class="building-cover-top"><span>{{ String(index + 1).padStart(2, '0') }} / {{ entry.label }}</span><span class="building-cover-badge">IN PROGRESS</span></div>
      <svg v-if="isCache" class="building-diagram cache-diagram" viewBox="0 0 520 235" fill="none">
        <path class="build-wire" d="M70 82H198Q218 82 218 102V122H356M70 174H198Q218 174 218 154V142H356" />
        <path class="build-packet" d="M70 82H198Q218 82 218 102V122H356M70 174H198Q218 174 218 154V142H356" />
        <rect class="build-block" x="40" y="53" width="136" height="58" rx="6" />
        <text class="build-svg-label" x="56" y="76">STABLE PREFIX</text><path class="build-token" d="M56 92H85M93 92H121M129 92H158" />
        <rect class="build-block build-skill-block" x="40" y="145" width="136" height="58" rx="6" />
        <text class="build-svg-label" x="56" y="168">DYNAMIC SKILLS</text><path class="build-token build-changing-token" d="M56 185H75M83 185H116M124 185H157" />
        <circle class="build-halo" cx="391" cy="132" r="69" /><circle class="build-orbit" cx="391" cy="132" r="83" />
        <circle class="build-cache-core" cx="391" cy="132" r="51" /><text class="build-core-label" x="391" y="133" text-anchor="middle">KV</text><text class="build-svg-label" x="391" y="155" text-anchor="middle">CACHE</text>
        <text class="build-svg-note" x="237" y="213">PREFIX / CHANGE / REUSE</text>
      </svg>
      <svg v-else class="building-diagram agent-diagram" viewBox="0 0 520 235" fill="none">
        <ellipse class="build-orbit" cx="260" cy="126" rx="200" ry="82" />
        <path class="build-wire" d="M116 126H404M260 64V188" /><path class="build-packet" d="M116 126H404" />
        <path class="build-agent-frame" d="M260 50L326 88V164L260 202L194 164V88Z" />
        <circle class="build-halo" cx="260" cy="126" r="51" /><text class="build-core-label" x="260" y="128" text-anchor="middle">AI</text><text class="build-svg-label" x="260" y="151" text-anchor="middle">COMPOSE</text>
        <rect class="build-block" x="33" y="104" width="113" height="44" rx="6" /><text class="build-svg-label" x="90" y="131" text-anchor="middle">BUILD</text>
        <rect class="build-block" x="374" y="104" width="113" height="44" rx="6" /><text class="build-svg-label" x="430" y="131" text-anchor="middle">DELIVER</text>
        <circle class="build-orbit-node" cx="260" cy="44" r="4" /><circle class="build-orbit-node" cx="260" cy="208" r="4" />
        <text class="build-svg-note" x="190" y="225">DEBUG → OPERATE</text>
      </svg>
      <div class="building-cover-bottom"><span>{{ isCache ? 'STABLE CONTEXT · SMART REUSE' : 'IDEA · AGENT · DELIVERY' }}</span><span>概念示意</span></div>
    </div>
    <div class="building-copy">
      <p class="building-stage"><i aria-hidden="true" />{{ entry.project?.status }}</p>
      <h3>{{ entry.title }}</h3>
      <p class="building-summary">{{ entry.summary }}</p>
      <div class="building-stack"><span v-for="item in entry.project?.stack" :key="item">{{ item }}</span></div>
      <a class="building-record-link" :href="withBase(entry.path)">探索项目记录 <ArrowUpRight aria-hidden="true" /></a>
    </div>
  </article>
</template>
