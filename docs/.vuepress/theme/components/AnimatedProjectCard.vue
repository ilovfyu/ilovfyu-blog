<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight } from '@lucide/vue'
import { withBase } from 'vuepress/client'
import type { ContentEntry } from '../data/content'
const props = defineProps<{ entry: ContentEntry; index: number }>()
const isCache = computed(() => props.entry.project?.code === 'promptlsm')
const isAnnotation = computed(() => props.entry.project?.code === 'annotation-tool-platform')
const completed = computed(() => props.entry.project?.group === '已完成作品')
</script>

<template>
  <article class="building-card" :data-tone="entry.project?.tone" :style="{ '--build-index': index }">
    <div class="building-cover" aria-hidden="true">
      <div class="building-cover-grid" /><div class="building-cover-light" />
      <div class="building-cover-top"><span>{{ String(index + 1).padStart(2, '0') }} / {{ entry.label }}</span><span class="building-cover-badge">{{ completed ? 'COMPLETED' : 'IN PROGRESS' }}</span></div>
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
      <svg v-else-if="isAnnotation" class="building-diagram annotation-diagram" viewBox="0 0 520 235" fill="none">
        <path class="build-wire" d="M110 123H177M345 123H410" /><path class="build-packet" d="M110 123H177M345 123H410" />
        <rect class="build-block" x="25" y="89" width="85" height="68" rx="6" />
        <path class="build-token" d="M43 107H76M43 122H91M43 137H80" />
        <text class="build-svg-label" x="68" y="185" text-anchor="middle">DATA</text>
        <rect class="build-agent-frame" x="177" y="47" width="168" height="154" rx="6" />
        <path class="build-halo" d="M192 175L224 138L248 158L286 102L330 175Z" />
        <circle class="build-halo" cx="220" cy="80" r="11" />
        <path class="build-annotation-box" d="M264 84H254V96M284 84H294V96M254 143V155H264M284 155H294V143" />
        <path class="build-annotation-scan" d="M244 120H304" />
        <text class="build-svg-label" x="261" y="225" text-anchor="middle">LABEL</text>
        <circle class="build-cache-core" cx="441" cy="123" r="31" />
        <path class="build-token" d="M428 123L437 132L453 113" />
        <text class="build-svg-label" x="441" y="185" text-anchor="middle">REVIEW</text>
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
      <div class="building-cover-bottom"><span>{{ isCache ? 'STABLE CONTEXT · SMART REUSE' : isAnnotation ? 'DATA · LABEL · QUALITY' : 'IDEA · AGENT · DELIVERY' }}</span><span>概念示意</span></div>
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
