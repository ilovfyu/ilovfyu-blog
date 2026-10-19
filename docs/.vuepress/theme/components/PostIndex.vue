<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowUpRight, Search, Shuffle } from '@lucide/vue'
import { withBase, useRoute, useRouter } from 'vuepress/client'
import { ARTICLE_PAGE_SIZE, knowledgePage, readKnowledgeFilters } from '../utils/knowledge-index'
import { notes, type Category } from '../data/content'
import WritingTrail from './WritingTrail.vue'
import CatalogScene from './CatalogScene.vue'

const router = useRouter()
const route = useRoute()
const category = ref<Category>('all')
const query = ref('')
const publishedDirections = new Set(notes.map(note => note.category)).size
const digits = (value: number) => String(value).padStart(2, '0')
const categories: { key: Category; label: string }[] = [
  { key: 'all', label: '全部' }, { key: 'ai', label: 'AI 与数据' },
  { key: 'frontend', label: '前端体验' }, { key: 'engineering', label: '工程架构' },
  { key: 'thinking', label: '产品与生活' },
]
const visibleNotes = computed(() => notes.filter(note =>
  (category.value === 'all' || note.category === category.value) &&
  `${note.title} ${note.summary} ${note.tags.join(' ')}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
))
const page = computed(() => knowledgePage(visibleNotes.value, readKnowledgeFilters(route.query, [], []).page))
function goPage(target: number) {
  const next = { ...route.query }
  const number = knowledgePage(visibleNotes.value, target).currentPage
  if (number > 1) next.page = String(number); else delete next.page
  void router.push({ path: route.path, query: next, hash: '#post-articles' })
}
watch([category, query], () => {
  if (!route.query.page) return
  const next = { ...route.query }; delete next.page
  void router.replace({ path: route.path, query: next, hash: route.hash })
})
function randomArticle() {
  const list = visibleNotes.value
  if (list.length) void router.push(list[Math.floor(Math.random() * list.length)].path)
}
function reset() { category.value = 'all'; query.value = '' }
</script>

<template>
  <main class="post-index catalog-page">
    <header class="catalog-hero catalog-split-hero post-hero">
      <div class="post-hero-copy">
        <p class="catalog-kicker">WRITING / FIELD NOTES</p>
        <h1>随笔</h1>
        <p class="catalog-description">记录问题如何被理解，也留下构建、阅读与生活中的观察。每篇文章，都从一个具体的问题开始。</p>
        <dl class="post-metrics"><div><dt>已发布随笔</dt><dd>{{ digits(notes.length) }}</dd></div><div><dt>内容方向</dt><dd>{{ digits(publishedDirections) }}</dd></div></dl>
      </div>
      <CatalogScene kind="writing" />
    </header>
    <section id="post-articles" class="catalog-body" aria-label="随笔目录">
      <div v-if="notes.length" class="catalog-toolbar">
        <label class="catalog-search"><Search aria-hidden="true" /><input v-model="query" type="search" aria-label="搜索随笔" placeholder="搜索标题、内容或标签" /></label>
        <button class="catalog-button" type="button" :disabled="!visibleNotes.length" @click="randomArticle"><Shuffle aria-hidden="true" /> 随机阅读</button>
      </div>
      <nav v-if="notes.length" class="catalog-filters" aria-label="按随笔主题筛选">
        <button v-for="item in categories" :key="item.key" type="button" :aria-pressed="category === item.key" @click="category = item.key">{{ item.label }}<span>{{ item.key === 'all' ? notes.length : notes.filter(note => note.category === item.key).length }}</span></button>
      </nav>
      <p v-if="notes.length" class="catalog-result" role="status">{{ visibleNotes.length }} 篇匹配的文章 · 每页 {{ ARTICLE_PAGE_SIZE }} 篇</p>
      <TransitionGroup v-if="visibleNotes.length" class="post-index-list" name="catalog-list" tag="div">
        <a v-for="note in page.entries" :key="note.path" class="post-index-row" :href="withBase(note.path)">
          <time :datetime="note.date.replaceAll('.', '-')">{{ note.date }}</time>
          <div><span class="catalog-kicker">{{ note.label }}</span><h2>{{ note.title }}</h2><p>{{ note.summary }}</p><div class="post-index-tags"><span v-for="tag in note.tags" :key="tag">{{ tag }}</span></div></div>
          <ArrowUpRight aria-hidden="true" />
        </a>
      </TransitionGroup>
      <div v-else class="catalog-empty"><h2>{{ notes.length ? '暂时没有匹配的随笔' : '还没有发布随笔' }}</h2><p>{{ notes.length ? '换一个关键词，或回到全部文章。' : '新的文章发布后，会出现在这里。' }}</p><button v-if="notes.length" type="button" class="catalog-button" @click="reset">重置筛选</button></div>
      <nav v-if="page.totalPages > 1" class="catalog-pagination" aria-label="随笔分页"><button type="button" class="catalog-button" :disabled="page.currentPage === 1" @click="goPage(page.currentPage - 1)">上一页</button><span aria-live="polite">{{ page.currentPage }} / {{ page.totalPages }}</span><button type="button" class="catalog-button" :disabled="page.currentPage === page.totalPages" @click="goPage(page.currentPage + 1)">下一页</button></nav>
      <WritingTrail />
    </section>
  </main>
</template>
