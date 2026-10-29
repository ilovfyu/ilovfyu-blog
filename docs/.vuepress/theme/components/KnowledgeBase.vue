<script setup lang="ts">
import type { LocationQueryRaw } from 'vue-router'
import { ArrowUpRight, RotateCcw } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, withBase } from 'vuepress/client'
import { knowledge } from '../data/content'
import ArticlePageSize from './ArticlePageSize.vue'
import ArticleSearch from './ArticleSearch.vue'
import ArticlePagination from './ArticlePagination.vue'
import { useArticlePageSize } from '../utils/article-page-size'
import { useCatalogScroll } from '../utils/catalog-navigation'
import KnowledgeAtlas from './KnowledgeAtlas.vue'
import KnowledgeTagFilter from './KnowledgeTagFilter.vue'
import { filterKnowledgeNotes, knowledgePage, knowledgeTagFacets, knowledgeTags, normalizeKnowledgeNotes, readKnowledgeFilters } from '../utils/knowledge-index'

const articles = normalizeKnowledgeNotes(knowledge)
const tags = knowledgeTags(articles)
const route = useRoute()
const router = useRouter()
useCatalogScroll()
const { pageSize, rememberPageSize } = useArticlePageSize(() => route.query.size)
const activeTags = ref<string[]>([])
const query = ref('')
const currentPage = ref(1)
const resultSection = ref<HTMLElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
const filters = computed(() => ({ topic: null, tags: activeTags.value, query: query.value }))
const results = computed(() => filterKnowledgeNotes(articles, filters.value))
const facets = computed(() => knowledgeTagFacets(articles, filters.value))
const page = computed(() => knowledgePage(results.value, currentPage.value, pageSize.value))
const filtered = computed(() => !!activeTags.value.length || !!query.value.trim())
const digits = (value: number) => String(value).padStart(2, '0')

function restore() {
  clearTimeout(searchTimer)
  const state = readKnowledgeFilters(route.query, [], tags)
  activeTags.value = state.tags; query.value = state.query
  currentPage.value = knowledgePage(results.value, state.page, pageSize.value).currentPage
}
watch(() => route.query, restore)
onMounted(restore)
function persist(replace = false) {
  clearTimeout(searchTimer)
  const next: LocationQueryRaw = { ...route.query, size: String(pageSize.value) }
  for (const property of ['topic', 'series', 'tag', 'q', 'page']) delete next[property]
  if (activeTags.value.length) next.tag = [...activeTags.value]
  if (query.value.trim()) next.q = query.value
  if (page.value.currentPage > 1) next.page = String(page.value.currentPage)
  return router[replace ? 'replace' : 'push']({ path: route.path, query: next, hash: replace ? '' : route.hash })
}
watch(query, value => {
  clearTimeout(searchTimer)
  if (value === readKnowledgeFilters(route.query, [], tags).query) return
  currentPage.value = 1
  searchTimer = setTimeout(() => persist(true), 220)
})
function changePageSize(value: number) { rememberPageSize(value); currentPage.value = 1; persist() }
function toggleTag(tag: string) {
  activeTags.value = activeTags.value.includes(tag) ? activeTags.value.filter(item => item !== tag) : [...activeTags.value, tag]
  currentPage.value = 1; persist()
}
function clearTags() { activeTags.value = []; currentPage.value = 1; persist() }
function reset() { activeTags.value = []; query.value = ''; currentPage.value = 1; persist() }
async function goPage(target: number) {
  currentPage.value = knowledgePage(results.value, target, pageSize.value).currentPage
  await persist(); await nextTick()
  resultSection.value?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <main class="knowledge-page catalog-page">
    <header class="catalog-hero knowledge-hero">
      <div class="knowledge-hero-copy">
        <p class="catalog-kicker">KNOWLEDGE / CONNECTED NOTES</p><h1>知识库</h1>
        <p class="catalog-description">用标签串起关联，用关键词快速定位。把学习与实践沉淀成可以随时查阅的知识笔记。</p>
        <dl class="knowledge-metrics"><div><dt>已发布笔记</dt><dd>{{ digits(articles.length) }}</dd></div><div><dt>关联标签</dt><dd>{{ digits(tags.length) }}</dd></div></dl>
      </div>
      <KnowledgeAtlas :selected-tags="activeTags.length" :result-count="results.length" :filtered="filtered" />
    </header>
    <div v-if="articles.length" class="catalog-body knowledge-workspace">
      <section ref="resultSection" id="knowledge-notes" class="knowledge-note-results" aria-label="知识笔记筛选与结果">
        <div class="knowledge-filter-panel">
          <div class="knowledge-search-row article-discovery"><ArticleSearch v-model="query" label="搜索知识笔记" placeholder="查找知识、概念与灵感…" /><ArticlePageSize :model-value="pageSize" @update:model-value="changePageSize" /><button v-if="filtered" type="button" class="catalog-button knowledge-reset" aria-label="清除筛选" @click="reset"><RotateCcw aria-hidden="true" /><span>清除筛选</span></button></div>
          <KnowledgeTagFilter v-if="tags.length" :facets="facets" :selected="activeTags" @toggle="toggleTag" @clear="clearTags" />
        </div>
        <header class="knowledge-result-title"><div><p class="catalog-kicker">LIBRARY / ALL NOTES</p><h2>全部笔记</h2><p v-if="activeTags.length" class="knowledge-current-tags">同时匹配 {{ activeTags.length }} 个已选标签</p></div><span class="catalog-result" role="status" aria-live="polite">{{ results.length }} 篇{{ filtered ? '匹配笔记' : '笔记' }}</span></header>
        <TransitionGroup v-if="page.entries.length" class="knowledge-note-list" name="catalog-list" tag="div">
          <a v-for="(note, index) in page.entries" :key="note.path" :href="withBase(note.path)" class="knowledge-note-row">
            <span class="knowledge-note-number">{{ digits((page.currentPage - 1) * pageSize + index + 1) }}</span>
            <div class="knowledge-note-copy"><small>{{ note.label }}<template v-if="note.date"> · {{ note.date }}</template></small><h3>{{ note.title }}</h3><p v-if="note.summary" class="knowledge-note-summary">{{ note.summary }}</p><div v-if="note.tags.length" class="knowledge-note-tags"><span v-for="tag in note.tags" :key="tag" :class="{ 'tag-matched': activeTags.includes(tag) }">#{{ tag }}</span></div></div><ArrowUpRight aria-hidden="true" />
          </a>
        </TransitionGroup>
        <div v-else class="catalog-empty"><h3>暂时没有匹配的笔记</h3><p>尝试移除一个标签、换个关键词，或查看全部笔记。</p><button type="button" class="catalog-button" @click="reset">重置筛选</button></div>
        <ArticlePagination :current="page.currentPage" :total="page.totalPages" label="知识笔记分页" @change="goPage" />
      </section>
    </div>
    <section v-else class="catalog-body"><div class="catalog-empty"><h2>还没有发布知识笔记</h2><p>思源中的知识笔记发布后，会自动整理标签与检索内容。</p></div></section>
  </main>
</template>
