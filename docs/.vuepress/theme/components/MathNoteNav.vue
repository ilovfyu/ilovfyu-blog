<script setup lang="ts">
import { BookOpen, ChevronLeft, ChevronRight, ListTree, Sigma } from '@lucide/vue'
import { computed } from 'vue'
import { usePageData, useRoute, withBase } from 'vuepress/client'
import { mathSeries } from '../data/mathSpecial'

const route = useRoute()
const page = usePageData()
const isMathNote = computed(() => /^\/specials\/math\/notes\//.test(route.path))
const meta = computed(() => page.value.frontmatter.mathSpecial as { series?: string; order?: number; total?: number } | undefined)
const currentSeries = computed(() => mathSeries.find((series) => series.key === meta.value?.series))
const chapters = computed(() => currentSeries.value?.groups.flatMap((group) => group.chapters) ?? [])
const currentIndex = computed(() => chapters.value.findIndex((chapter) => chapter.route === route.path))
const previous = computed(() => currentIndex.value > 0 ? chapters.value[currentIndex.value - 1] : null)
const next = computed(() => currentIndex.value >= 0 && currentIndex.value < chapters.value.length - 1 ? chapters.value[currentIndex.value + 1] : null)
</script>

<template>
  <div v-if="isMathNote && currentSeries" class="math-note-dock">
    <a class="math-note-dock-home" :href="withBase('/specials/math/')" title="返回数学基础专题"><Sigma /></a>
    <div class="math-note-dock-copy">
      <span>{{ currentSeries.code }} / {{ String((meta?.order ?? 0) + 1).padStart(2, '0') }} OF {{ String(meta?.total ?? 0).padStart(2, '0') }}</span>
      <strong>{{ currentSeries.name }}</strong>
    </div>
    <details class="math-note-directory">
      <summary title="打开系列目录"><ListTree /><span>系列目录</span></summary>
      <div class="math-note-directory-panel">
        <header><BookOpen /><div><span>{{ currentSeries.code }} / CURRICULUM</span><strong>{{ currentSeries.name }}</strong></div></header>
        <section v-for="group in currentSeries.groups" :key="group.name">
          <h3>{{ group.name }}</h3>
          <a v-for="chapter in group.chapters" :key="chapter.route" :href="withBase(chapter.route)" :class="{ active: chapter.route === route.path }">
            <span>{{ String(chapter.order).padStart(2, '0') }}</span>{{ chapter.title }}
          </a>
        </section>
      </div>
    </details>
    <nav aria-label="章节翻页">
      <a v-if="previous" :href="withBase(previous.route)" :title="`上一章：${previous.title}`"><ChevronLeft /></a>
      <span v-else><ChevronLeft /></span>
      <a v-if="next" :href="withBase(next.route)" :title="`下一章：${next.title}`"><ChevronRight /></a>
      <span v-else><ChevronRight /></span>
    </nav>
  </div>
</template>
