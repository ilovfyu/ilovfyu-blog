<script setup lang="ts">
import { ChevronLeft, ChevronRight, FolderTree, Layers } from '@lucide/vue'
import { computed } from 'vue'
import { usePageData, useRoute, withBase } from 'vuepress/client'
import { knowledgeArticles } from '../data/knowledgeArticles'

const route = useRoute()
const page = usePageData()
const isKnowledgeNote = computed(() => /^\/kb\//.test(route.path))
const meta = computed(() => page.value.frontmatter.knowledgeNote as { series?: string; group?: string } | undefined)

// 同系列同分组的全部笔记（保持知识库数据顺序）
const siblings = computed(() => {
  if (!meta.value?.series) return []
  return knowledgeArticles.filter((article) => article.series === meta.value?.series && article.group === meta.value?.group)
})
const currentIndex = computed(() => siblings.value.findIndex((article) => article.path === route.path))
const previous = computed(() => currentIndex.value > 0 ? siblings.value[currentIndex.value - 1] : null)
const next = computed(() => currentIndex.value >= 0 && currentIndex.value < siblings.value.length - 1 ? siblings.value[currentIndex.value + 1] : null)
const current = computed(() => siblings.value[currentIndex.value])
</script>

<template>
  <div v-if="isKnowledgeNote" class="kb-note-dock">
    <a class="kb-note-dock-home" :href="withBase('/topics/')" title="返回知识库"><FolderTree /></a>
    <div class="kb-note-dock-copy">
      <span>{{ meta?.series ?? '' }} / {{ meta?.group ?? '' }}<template v-if="siblings.length"> · {{ String(currentIndex + 1).padStart(2, '0') }} / {{ String(siblings.length).padStart(2, '0') }}</template></span>
      <strong>{{ current?.title ?? '' }}</strong>
    </div>
    <details class="kb-note-directory">
      <summary title="打开分组目录"><Layers /><span>分组目录</span></summary>
      <div class="kb-note-directory-panel">
        <header><FolderTree /><div><span>{{ meta?.series ?? '' }} / {{ meta?.group ?? '' }}</span><strong>{{ siblings.length }} 篇笔记</strong></div></header>
        <a
          v-for="article in siblings"
          :key="article.path"
          :href="withBase(article.path)"
          :class="{ active: article.path === route.path }"
        >
          <span>{{ String(siblings.indexOf(article) + 1).padStart(2, '0') }}</span>{{ article.title }}
        </a>
      </div>
    </details>
    <nav aria-label="笔记翻页">
      <a v-if="previous" :href="withBase(previous.path)" :title="`上一篇：${previous.title}`"><ChevronLeft /></a>
      <span v-else><ChevronLeft /></span>
      <a v-if="next" :href="withBase(next.path)" :title="`下一篇：${next.title}`"><ChevronRight /></a>
      <span v-else><ChevronRight /></span>
    </nav>
  </div>
</template>
