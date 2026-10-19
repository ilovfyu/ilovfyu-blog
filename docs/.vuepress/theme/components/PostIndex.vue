<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowUpRight, Shuffle } from '@lucide/vue'
import { withBase, useRoute, useRouter } from 'vuepress/client'
import { knowledgePage, readKnowledgeFilters } from '../utils/knowledge-index'
import { searchArticles } from '../utils/article-search'
import { useArticlePageSize } from '../utils/article-page-size'
import { useCatalogScroll } from '../utils/catalog-navigation'
import ArticlePageSize from './ArticlePageSize.vue'
import ArticleSearch from './ArticleSearch.vue'
import ArticlePagination from './ArticlePagination.vue'
import { notes, type Category } from '../data/content'
import WritingTrail from './WritingTrail.vue'
import CatalogScene from './CatalogScene.vue'

const router = useRouter(), route = useRoute()
useCatalogScroll()
const { pageSize, rememberPageSize } = useArticlePageSize(() => route.query.size)
const category = ref<Category>('all'), query = ref(''), currentPage = ref(1)
let timer: ReturnType<typeof setTimeout> | undefined
const publishedDirections = new Set(notes.map(note => note.category)).size
const digits = (value: number) => String(value).padStart(2, '0')
const categories: { key: Category; label: string }[] = [
  { key: 'all', label: '全部' }, { key: 'ai', label: 'AI 与数据' },
  { key: 'frontend', label: '前端体验' }, { key: 'engineering', label: '工程架构' },
  { key: 'thinking', label: '产品与生活' },
]
const routeCategory = () => categories.some(item => item.key === route.query.category) ? route.query.category as Category : 'all'
const visibleNotes = computed(() => searchArticles(notes.filter(note => category.value === 'all' || note.category === category.value), query.value))
const page = computed(() => knowledgePage(visibleNotes.value, currentPage.value, pageSize.value))
function restore() {
  clearTimeout(timer)
  query.value = readKnowledgeFilters(route.query, [], []).query; category.value = routeCategory()
  currentPage.value = knowledgePage(visibleNotes.value, readKnowledgeFilters(route.query, [], []).page, pageSize.value).currentPage
}
watch(() => route.query, restore)
onMounted(restore)
function persist(replace = false, hash = '') {
  clearTimeout(timer)
  const next = { ...route.query, size: String(pageSize.value) }
  for (const property of ['q', 'category', 'page']) delete next[property]
  if (query.value.trim()) next.q = query.value
  if (category.value !== 'all') next.category = category.value
  if (page.value.currentPage > 1) next.page = String(page.value.currentPage)
  return router[replace ? 'replace' : 'push']({ path: route.path, query: next, hash })
}
async function goPage(target: number) {
  currentPage.value = knowledgePage(visibleNotes.value, target, pageSize.value).currentPage
  await persist(false, '#post-articles'); await nextTick()
  document.getElementById('post-articles')?.scrollIntoView({ block: 'start' })
}
watch(query, value => {
  clearTimeout(timer)
  if (value === readKnowledgeFilters(route.query, [], []).query) return
  currentPage.value = 1; timer = setTimeout(() => { void persist(true) }, 220)
})
watch(category, value => { if (value !== routeCategory()) { currentPage.value = 1; void persist() } })
function changePageSize(value: number) { rememberPageSize(value); currentPage.value = 1; void persist() }
function randomArticle() {
  const list = visibleNotes.value
  if (list.length) void router.push(list[Math.floor(Math.random() * list.length)].path)
}
function reset() { clearTimeout(timer); void router.push({ path: route.path, query: { size: String(pageSize.value) }, hash: '' }) }
onBeforeUnmount(() => clearTimeout(timer))
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
      <div v-if="notes.length" class="catalog-toolbar article-discovery">
        <ArticleSearch v-model="query" label="搜索随笔" placeholder="寻找一段思考、一篇随笔…" />
        <ArticlePageSize :model-value="pageSize" @update:model-value="changePageSize" />
        <button class="catalog-button" type="button" aria-label="随机阅读" :disabled="!visibleNotes.length" @click="randomArticle"><Shuffle aria-hidden="true" /><span>随机阅读</span></button>
      </div>
      <nav v-if="notes.length" class="catalog-filters" aria-label="按随笔主题筛选">
        <button v-for="item in categories" :key="item.key" type="button" :aria-pressed="category === item.key" @click="category = item.key">{{ item.label }}<span>{{ item.key === 'all' ? notes.length : notes.filter(note => note.category === item.key).length }}</span></button>
      </nav>
      <p v-if="notes.length" class="catalog-result" role="status">{{ visibleNotes.length }} 篇匹配的文章 · 每页 {{ pageSize }} 篇</p>
      <TransitionGroup v-if="visibleNotes.length" class="post-index-list" name="catalog-list" tag="div">
        <a v-for="note in page.entries" :key="note.path" class="post-index-row" :href="withBase(note.path)">
          <time :datetime="note.date.replaceAll('.', '-')">{{ note.date }}</time>
          <div><span class="catalog-kicker">{{ note.label }}</span><h2>{{ note.title }}</h2><p>{{ note.summary }}</p><div class="post-index-tags"><span v-for="tag in note.tags" :key="tag">{{ tag }}</span></div></div>
          <ArrowUpRight aria-hidden="true" />
        </a>
      </TransitionGroup>
      <div v-else class="catalog-empty"><h2>{{ notes.length ? '暂时没有匹配的随笔' : '还没有发布随笔' }}</h2><p>{{ notes.length ? '换一个关键词，或回到全部文章。' : '新的文章发布后，会出现在这里。' }}</p><button v-if="notes.length" type="button" class="catalog-button" @click="reset">重置筛选</button></div>
      <ArticlePagination :current="page.currentPage" :total="page.totalPages" label="随笔分页" @change="goPage" />
      <WritingTrail />
    </section>
  </main>
</template>
