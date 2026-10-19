<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, BookOpen, Search } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, withBase } from 'vuepress/client'
import { knowledge } from '../data/content'
import { flattenKnowledgeChapters, knowledgeTopicPage, readKnowledgeFilters, knowledgeTopicChapters, knowledgeTopicPath, knowledgeTopics, normalizeKnowledgeNotes } from '../utils/knowledge-index'
import ArticlePageSize from './ArticlePageSize.vue'
import ArticleSearch from './ArticleSearch.vue'
import ArticlePagination from './ArticlePagination.vue'
import { searchArticles } from '../utils/article-search'
import { useArticlePageSize } from '../utils/article-page-size'
import { useCatalogScroll } from '../utils/catalog-navigation'
import CatalogScene from './CatalogScene.vue'
import TopicCardVisual from './TopicCardVisual.vue'
import TopicGroupNav from './TopicGroupNav.vue'
import TopicChapter from './TopicChapter.vue'

const articles = normalizeKnowledgeNotes(knowledge)
const topics = knowledgeTopics(articles)
const route = useRoute()
const router = useRouter()
useCatalogScroll()
const { pageSize, rememberPageSize } = useArticlePageSize(() => route.query.size)
const query = ref('')
const hydrated = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
const requested = computed(() => !hydrated.value ? '' : typeof route.query.series === 'string' ? route.query.series : typeof route.query.topic === 'string' ? route.query.topic : '')
const topic = computed(() => topics.find(item => item.name === requested.value))
const allChapters = computed(() => topic.value ? knowledgeTopicChapters(articles, topic.value.name) : [])
const allFlatChapters = computed(() => flattenKnowledgeChapters(allChapters.value))
const chapters = computed(() => topic.value ? knowledgeTopicChapters(searchArticles(articles.filter(note => note.series === topic.value!.name), query.value), topic.value.name) : [])
const flatChapters = computed(() => flattenKnowledgeChapters(chapters.value))
const page = computed(() => knowledgeTopicPage(chapters.value, query.value === readKnowledgeFilters(route.query, [], []).query ? readKnowledgeFilters(route.query, [], []).page : 1, pageSize.value))
const pageChapters = computed(() => flattenKnowledgeChapters(page.value.chapters))
const destinations = computed(() => Object.fromEntries(Object.entries(page.value.destinations).map(([id, pageNumber]) => {
  const next = { ...route.query, q: query.value.trim() ? query.value : undefined, size: String(pageSize.value), page: pageNumber > 1 ? String(pageNumber) : undefined }
  return [id, router.resolve({ path: route.path, query: next, hash: `#${id}` }).href]
})))
const firstNote = computed(() => flatChapters.value.find(chapter => chapter.entries.length)?.entries[0])
const totalChapters = topics.reduce((count, item) => count + flattenKnowledgeChapters(knowledgeTopicChapters(articles, item.name)).filter(chapter => chapter.path.length).length, 0)
const totalNotes = topics.reduce((count, item) => count + item.count, 0)
const topicSearch = topics.map(item => ({ ...item, title: item.name, summary: item.groups.join(' ') }))
const results = computed(() => searchArticles(topicSearch, query.value))
const activeChapter = ref('')
const readProgress = computed(() => { const index = flatChapters.value.findIndex(chapter => chapter.id === activeChapter.value); return index < 0 ? 0 : (index + 1) / flatChapters.value.length * 100 })
let scrollFrame = 0
function updateChapter() {
  scrollFrame = 0
  const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
  const current = atEnd ? pageChapters.value.at(-1) : pageChapters.value.filter(chapter => (document.getElementById(chapter.id)?.getBoundingClientRect().top ?? Infinity) <= 180).at(-1) || page.value.chapters[0]
  activeChapter.value = current?.id || ''
}
function queueChapter() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateChapter) }
watch(page, async () => { await nextTick(); updateChapter() })
watch([() => route.query.page, () => route.hash, () => route.query.q, () => route.query.size, hydrated], async (current, previous) => {
  await nextTick()
  if (previous[4] && (current[2] !== previous[2] || current[3] !== previous[3])) return
  if (route.hash) {
    let id = route.hash.slice(1)
    try { id = decodeURIComponent(id) } catch { /* Invalid fragments stay inert. */ }
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }
  updateChapter()
})
async function goPage(target: number) {
  const current = knowledgeTopicPage(chapters.value, target, pageSize.value).currentPage
  const next = { ...route.query, size: String(pageSize.value) }
  if (current > 1) next.page = String(current); else delete next.page
  if (query.value.trim()) next.q = query.value; else delete next.q
  clearTimeout(timer)
  await router.push({ path: route.path, query: next, hash: '#topic-articles' }); await nextTick()
  document.getElementById('topic-articles')?.scrollIntoView({ block: 'start' })
}
function changePageSize(value: number) {
  clearTimeout(timer); rememberPageSize(value)
  const next = { ...route.query, size: String(pageSize.value) }; delete next.page
  if (query.value.trim()) next.q = query.value; else delete next.q
  void router.push({ path: route.path, query: next, hash: '' })
}
const digits = (value: number) => String(value).padStart(2, '0')
const overviewPath = computed(() => withBase(`/topics/?size=${pageSize.value}`))
function topicPath(name: string) { return withBase(`${knowledgeTopicPath(name)}&size=${pageSize.value}`) }
function restoreQuery() { clearTimeout(timer); query.value = typeof route.query.q === 'string' ? route.query.q : '' }
watch(() => route.query.q, restoreQuery)
onMounted(() => { restoreQuery(); hydrated.value = true; window.addEventListener('scroll', queueChapter, { passive: true }); window.addEventListener('resize', queueChapter, { passive: true }) })
watch(query, value => {
  clearTimeout(timer)
  if (value === (typeof route.query.q === 'string' ? route.query.q : '')) return
  timer = setTimeout(() => {
    const next = { ...route.query, size: String(pageSize.value) }; delete next.q; delete next.page
    if (value.trim()) next.q = value
    void router.replace({ path: route.path, query: next, hash: '' })
  }, 220)
})
onBeforeUnmount(() => { clearTimeout(timer); cancelAnimationFrame(scrollFrame); window.removeEventListener('scroll', queueChapter); window.removeEventListener('resize', queueChapter) })
</script>

<template>
  <main class="topic-page catalog-page">
    <header class="catalog-hero catalog-split-hero topic-hero">
      <div class="topic-hero-copy">
        <a v-if="requested" class="topic-back" :href="overviewPath"><ArrowLeft aria-hidden="true" />全部专题</a>
        <p class="catalog-kicker">{{ topic ? 'SERIES / READING PATH' : 'TOPICS / DEEP EXPLORATION' }}</p>
        <h1>{{ topic?.name || '专题' }}</h1>
        <p class="catalog-description">{{ topic ? '按目录展开学习路径，从基础到进阶，也可以进入更细的子分组。' : '围绕一个方向，走完一条学习路径。按专题探索，从章节出发，把知识组织成连续的理解。' }}</p>
        <dl class="topic-metrics"><div v-if="!topic"><dt>学习专题</dt><dd>{{ digits(topics.length) }}</dd></div><div><dt>{{ topic ? '专题笔记' : '收录笔记' }}</dt><dd>{{ digits(topic?.count ?? totalNotes) }}</dd></div><div><dt>目录分组</dt><dd>{{ digits(topic ? allFlatChapters.filter(chapter => chapter.path.length).length : totalChapters) }}</dd></div></dl>
        <a v-if="firstNote" class="catalog-button topic-start" :href="withBase(firstNote.path)">开始阅读 <ArrowUpRight aria-hidden="true" /></a>
      </div>
      <CatalogScene kind="topics" />
    </header>
    <div v-if="topic" class="catalog-body topic-reading-layout">
      <nav :key="topic.name" class="topic-chapter-nav" aria-label="专题目录导航">
        <p class="catalog-kicker">READING / DIRECTORY</p>
        <div class="topic-navigation-progress" aria-hidden="true"><i :style="{ width: `${readProgress}%` }" /></div>
        <p v-if="!chapters.length" class="article-search-hint">没有匹配目录</p>
        <ul class="topic-nav-tree"><TopicGroupNav v-for="chapter in chapters" :key="chapter.id" :chapter="chapter" :active-chapter="activeChapter" :destinations="destinations" /></ul>
      </nav>
      <div id="topic-articles" class="topic-reading-content">
        <div class="article-list-controls article-discovery"><ArticleSearch v-model="query" label="搜索专题文章" placeholder="在这个专题里，找点什么…" /><ArticlePageSize :model-value="pageSize" @update:model-value="changePageSize" /></div>
        <header class="topic-page-summary"><span role="status" aria-live="polite">{{ query.trim() ? '匹配' : '共' }} {{ page.total }} 篇<template v-if="query.trim()"> / 共 {{ topic.count }} 篇</template> · 每页 {{ pageSize }} 篇</span><span>第 {{ page.currentPage }} / {{ page.totalPages }} 页</span></header>
        <div v-if="!page.total" class="catalog-empty"><h2>暂时没有匹配的文章</h2><p>换一个片段或更短的关键词，或查看专题全部文章。</p><button type="button" class="catalog-button" @click="query = ''">清除搜索</button></div>
        <TopicChapter v-for="chapter in page.chapters" :key="chapter.id" :chapter="chapter" :active-chapter="activeChapter" />
        <ArticlePagination :current="page.currentPage" :total="page.totalPages" label="专题文章分页" @change="goPage" />
      </div>
    </div>
    <section v-else-if="requested" class="catalog-body"><div class="catalog-empty"><h2>暂时没有这个专题</h2><p>专题名称可能已调整，查看当前已发布的学习系列。</p><a class="catalog-button" :href="withBase('/topics/')">返回专题目录</a></div></section>
    <section v-else class="catalog-body topic-catalog" aria-labelledby="topic-catalog-heading">
      <header class="topic-section-heading"><div><p class="catalog-kicker">EXPLORE / LEARNING SERIES</p><h2 id="topic-catalog-heading">专题目录</h2></div><span role="status" aria-live="polite">{{ results.length }} 个专题</span></header>
      <label v-if="topics.length" class="catalog-search topic-search"><Search aria-hidden="true" /><input v-model="query" type="search" aria-label="搜索专题" placeholder="搜索专题名称或目录" /></label>
      <div v-if="results.length" class="topic-card-grid">
        <a v-for="(item, index) in results" :key="item.name" class="topic-card" :data-tone="/博客/.test(item.name) ? 'cyan' : 'violet'" :href="topicPath(item.name)">
          <div class="topic-card-copy">
            <span class="topic-card-code"><BookOpen aria-hidden="true" />{{ digits(index + 1) }} / SERIES</span>
            <h3>{{ item.name }}</h3>
            <p>{{ item.count }} 篇笔记<span v-if="item.groups.length"> · {{ item.groups.length }} 个目录分组</span></p>
          </div>
          <TopicCardVisual :name="item.name" />
          <div class="topic-card-chapters"><span v-for="(group, step) in item.groups.slice(0, 5)" :key="group"><small>{{ digits(step + 1) }}</small>{{ group }}</span><span v-if="item.groups.length > 5">+{{ item.groups.length - 5 }} 章节</span></div>
          <span class="topic-card-action">进入专题 <ArrowUpRight aria-hidden="true" /></span>
        </a>
      </div>
      <div v-else class="catalog-empty"><h3>{{ topics.length ? '暂时没有匹配的专题' : '还没有发布学习专题' }}</h3><p>{{ topics.length ? '试试其他关键词，或查看全部专题。' : '连续的学习笔记发布后，会汇聚成专题阅读路径。' }}</p><button v-if="topics.length" type="button" class="catalog-button" @click="query = ''">查看全部专题</button></div>
    </section>
  </main>
</template>
