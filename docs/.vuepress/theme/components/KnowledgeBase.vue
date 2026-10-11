<script setup lang="ts">
import { ArrowUpRight, BookOpen, Search } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { withBase } from 'vuepress/client'
import { knowledge as articles } from '../data/content'

const series = [...new Set(articles.map(article => article.series))]
const activeSeries = ref('all')
const query = ref('')
const currentPage = ref(1)
const resultSection = ref<HTMLElement | null>(null)
const pageSize = 15
const results = computed(() => articles.filter(article =>
  (activeSeries.value === 'all' || article.series === activeSeries.value) &&
  `${article.title} ${article.group} ${article.series}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
))
const totalPages = computed(() => Math.max(1, Math.ceil(results.value.length / pageSize)))
const pageNotes = computed(() => results.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
watch([activeSeries, query], () => { currentPage.value = 1 })
function reset() { activeSeries.value = 'all'; query.value = '' }
function goPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  resultSection.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <main class="knowledge-page catalog-page">
    <header class="catalog-hero">
      <p class="catalog-kicker">KNOWLEDGE / CONNECTED NOTES</p>
      <h1>知识库</h1>
      <p class="catalog-description">把零散知识连成可以反复查阅的路径。这里收录学习与实践笔记，按系列查找，也可以直接检索一个问题。</p>
      <div class="catalog-hero-meta"><span class="catalog-count">{{ articles.length }} 篇笔记 · {{ series.length }} 个系列</span></div>
    </header>
    <div v-if="articles.length" class="catalog-body knowledge-browser">
      <aside class="knowledge-sidebar" aria-label="按知识系列筛选">
        <p class="catalog-kicker">COLLECTIONS / 系列</p>
        <button type="button" :aria-pressed="activeSeries === 'all'" @click="activeSeries = 'all'">全部笔记 <span>{{ articles.length }}</span></button>
        <button v-for="item in series" :key="item" type="button" :aria-pressed="activeSeries === item" @click="activeSeries = item">{{ item }}<span>{{ articles.filter(article => article.series === item).length }}</span></button>
        <p class="knowledge-sidebar-note"><BookOpen aria-hidden="true" /> 随笔收录工程实践与个人观察，知识库保留连续的学习笔记。</p>
      </aside>
      <section ref="resultSection" class="knowledge-note-results" aria-label="知识笔记">
        <label class="catalog-search"><Search aria-hidden="true" /><input v-model="query" type="search" aria-label="搜索知识笔记" placeholder="搜索概念、章节或关键词" /></label>
        <div class="knowledge-result-title"><h2>{{ activeSeries === 'all' ? '全部笔记' : activeSeries }}</h2><span class="catalog-result" role="status">{{ results.length }} 篇笔记</span></div>
        <TransitionGroup v-if="pageNotes.length" class="knowledge-note-list" name="catalog-list" tag="div">
          <a v-for="(note, index) in pageNotes" :key="note.path" :href="withBase(note.path)" class="knowledge-note-row">
            <span class="knowledge-note-number">{{ String((currentPage - 1) * pageSize + index + 1).padStart(2, '0') }}</span>
            <div><small>{{ note.series }} / {{ note.group }}</small><h3>{{ note.title }}</h3></div><ArrowUpRight aria-hidden="true" />
          </a>
        </TransitionGroup>
        <div v-else class="catalog-empty"><h3>暂时没有匹配的笔记</h3><p>换一个关键词，或查看全部笔记。</p><button type="button" class="catalog-button" @click="reset">重置筛选</button></div>
        <nav v-if="totalPages > 1" class="catalog-pagination" aria-label="知识笔记分页"><button type="button" class="catalog-button" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">上一页</button><span aria-live="polite">{{ currentPage }} / {{ totalPages }}</span><button type="button" class="catalog-button" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">下一页</button></nav>
      </section>
    </div>
    <section v-else class="catalog-body"><div class="catalog-empty"><h2>还没有发布知识笔记</h2><p>新的笔记发布后，会按系列整理在这里。</p></div></section>
  </main>
</template>
