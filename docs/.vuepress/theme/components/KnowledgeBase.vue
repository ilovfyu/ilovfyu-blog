<script setup lang="ts">
import { ArrowUpRight, BookOpen, Check, Hash, Layers, RotateCcw, Search } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter, withBase } from 'vuepress/client'
import { knowledge } from '../data/content'
import KnowledgeAtlas from './KnowledgeAtlas.vue'
import { filterKnowledgeNotes, knowledgePage, knowledgeTagFacets, knowledgeTags, knowledgeTopics, normalizeKnowledgeNotes, readKnowledgeFilters } from '../utils/knowledge-index'

const articles = normalizeKnowledgeNotes(knowledge)
const topics = knowledgeTopics(articles)
const tags = knowledgeTags(articles)
const route = useRoute()
const router = useRouter()
const activeTopic = ref<string | null>(null)
const activeTags = ref<string[]>([])
const query = ref('')
const currentPage = ref(1)
const resultSection = ref<HTMLElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
const filters = computed(() => ({ topic: activeTopic.value, tags: activeTags.value, query: query.value }))
const results = computed(() => filterKnowledgeNotes(articles, filters.value))
const facets = computed(() => knowledgeTagFacets(articles, filters.value))
const scopeCount = computed(() => filterKnowledgeNotes(articles, { ...filters.value, tags: [] }).length)
const page = computed(() => knowledgePage(results.value, currentPage.value))
const filtered = computed(() => !!activeTopic.value || !!activeTags.value.length || !!query.value.trim())
const digits = (value: number) => String(value).padStart(2, '0')

watch(() => route.query, () => {
  clearTimeout(searchTimer)
  const state = readKnowledgeFilters(route.query, topics, tags)
  activeTopic.value = state.topic; activeTags.value = state.tags; query.value = state.query
  currentPage.value = knowledgePage(results.value, state.page).currentPage
}, { immediate: true })
function persist(replace = false) {
  clearTimeout(searchTimer)
  const next = { ...route.query }
  for (const property of ['topic', 'tag', 'q', 'page']) delete next[property]
  if (activeTopic.value) next.topic = activeTopic.value
  if (activeTags.value.length) next.tag = [...activeTags.value]
  if (query.value.trim()) next.q = query.value
  if (page.value.currentPage > 1) next.page = String(page.value.currentPage)
  void router[replace ? 'replace' : 'push']({ path: route.path, query: next, hash: route.hash })
}
watch(query, value => {
  clearTimeout(searchTimer)
  if (value === readKnowledgeFilters(route.query, topics, tags).query) return
  currentPage.value = 1
  searchTimer = setTimeout(() => persist(true), 220)
})
function selectTopic(topic: string | null) {
  activeTopic.value = activeTopic.value === topic ? null : topic
  currentPage.value = 1; persist()
}
function toggleTag(tag: string) {
  activeTags.value = activeTags.value.includes(tag) ? activeTags.value.filter(item => item !== tag) : [...activeTags.value, tag]
  currentPage.value = 1; persist()
}
function clearTags() { activeTags.value = []; currentPage.value = 1; persist() }
function reset() { activeTopic.value = null; activeTags.value = []; query.value = ''; currentPage.value = 1; persist() }
function goPage(target: number) {
  currentPage.value = knowledgePage(results.value, target).currentPage; persist()
  resultSection.value?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <main class="knowledge-page catalog-page">
    <header class="catalog-hero knowledge-hero">
      <div class="knowledge-hero-copy">
        <p class="catalog-kicker">KNOWLEDGE / CONNECTED NOTES</p><h1>知识库</h1>
        <p class="catalog-description">沿着专题深入，用标签串起关联。把学习与实践沉淀成可以反复查阅的知识路径。</p>
        <dl class="knowledge-metrics"><div><dt>已发布笔记</dt><dd>{{ digits(articles.length) }}</dd></div><div><dt>学习专题</dt><dd>{{ digits(topics.length) }}</dd></div><div><dt>关联标签</dt><dd>{{ digits(tags.length) }}</dd></div></dl>
      </div>
      <KnowledgeAtlas />
    </header>
    <div v-if="articles.length" class="catalog-body knowledge-workspace">
      <section v-if="topics.length" class="knowledge-topics" aria-labelledby="knowledge-topics-heading">
        <header class="knowledge-section-heading"><div><p class="catalog-kicker">01 / LEARNING PATHS</p><h2 id="knowledge-topics-heading">专题航线</h2></div><button type="button" class="catalog-button" :aria-pressed="!activeTopic" @click="selectTopic(null)">全部笔记 <span>{{ articles.length }}</span></button></header>
        <div class="knowledge-topic-grid">
          <button v-for="(topic, index) in topics" :key="topic.name" type="button" class="knowledge-topic-card" :data-tone="index % 2 ? 'violet' : 'cyan'" :aria-pressed="activeTopic === topic.name" @click="selectTopic(topic.name)">
            <div class="knowledge-topic-copy"><span class="knowledge-topic-code"><BookOpen aria-hidden="true" />{{ digits(index + 1) }} / TOPIC</span><h3>{{ topic.name }}</h3><p>{{ topic.count }} 篇笔记<span v-if="topic.groups.length"> · {{ topic.groups.length }} 个章节分组</span></p><div v-if="topic.groups.length" class="knowledge-topic-groups"><span v-for="group in topic.groups.slice(0, 4)" :key="group">{{ group }}</span><span v-if="topic.groups.length > 4">+{{ topic.groups.length - 4 }}</span></div></div>
            <div class="knowledge-topic-art" aria-hidden="true"><i /><b /><span /><Layers /></div>
            <span class="knowledge-topic-action"><Check v-if="activeTopic === topic.name" aria-hidden="true" /><ArrowUpRight v-else aria-hidden="true" />{{ activeTopic === topic.name ? '已选专题' : '探索专题' }}</span>
          </button>
        </div>
      </section>
      <section ref="resultSection" id="knowledge-notes" class="knowledge-note-results" aria-label="知识笔记筛选与结果">
        <div class="knowledge-filter-panel">
          <div class="knowledge-search-row"><label class="catalog-search"><Search aria-hidden="true" /><input v-model="query" type="search" aria-label="搜索知识笔记" placeholder="搜索标题、摘要、概念或标签" /></label><button v-if="filtered" type="button" class="catalog-button knowledge-reset" @click="reset"><RotateCcw aria-hidden="true" />清除筛选</button></div>
          <fieldset v-if="tags.length" class="knowledge-tag-filter"><legend><Hash aria-hidden="true" />标签筛选</legend><p class="knowledge-filter-hint">可多选，同时匹配所有已选标签</p><div class="knowledge-tag-options"><button type="button" class="knowledge-tag" :aria-pressed="!activeTags.length" @click="clearTags">全部标签<span>{{ scopeCount }}</span></button><button v-for="facet in facets" :key="facet.tag" type="button" class="knowledge-tag" :aria-pressed="activeTags.includes(facet.tag)" :disabled="!facet.count && !activeTags.includes(facet.tag)" @click="toggleTag(facet.tag)"><Check v-if="activeTags.includes(facet.tag)" aria-hidden="true" /><span v-else aria-hidden="true" class="knowledge-tag-hash">#</span>{{ facet.tag }}<span class="knowledge-tag-count">{{ facet.count }}</span></button></div></fieldset>
        </div>
        <header class="knowledge-result-title"><div><p class="catalog-kicker">{{ activeTopic ? 'TOPIC / LEARNING NOTES' : 'LIBRARY / ALL NOTES' }}</p><h2>{{ activeTopic || '全部笔记' }}</h2><p v-if="activeTags.length" class="knowledge-current-tags">标签交集：{{ activeTags.map(tag => `#${tag}`).join(' · ') }}</p></div><span class="catalog-result" role="status" aria-live="polite">{{ results.length }} 篇{{ filtered ? '匹配笔记' : '笔记' }}</span></header>
        <TransitionGroup v-if="page.entries.length" class="knowledge-note-list" name="catalog-list" tag="div">
          <a v-for="(note, index) in page.entries" :key="note.path" :href="withBase(note.path)" class="knowledge-note-row">
            <span class="knowledge-note-number">{{ digits((page.currentPage - 1) * 15 + index + 1) }}</span>
            <div class="knowledge-note-copy"><small>{{ note.series }}<template v-if="note.group"> / {{ note.group }}</template></small><h3>{{ note.title }}</h3><p v-if="note.summary" class="knowledge-note-summary">{{ note.summary }}</p><div v-if="note.tags.length" class="knowledge-note-tags"><span v-for="tag in note.tags" :key="tag" :class="{ 'tag-matched': activeTags.includes(tag) }">#{{ tag }}</span></div></div><ArrowUpRight aria-hidden="true" />
          </a>
        </TransitionGroup>
        <div v-else class="catalog-empty"><h3>暂时没有匹配的笔记</h3><p>尝试移除一个标签、换个关键词，或查看全部笔记。</p><button type="button" class="catalog-button" @click="reset">重置筛选</button></div>
        <nav v-if="page.totalPages > 1" class="catalog-pagination" aria-label="知识笔记分页"><button type="button" class="catalog-button" :disabled="page.currentPage === 1" @click="goPage(page.currentPage - 1)">上一页</button><span aria-live="polite">{{ page.currentPage }} / {{ page.totalPages }}</span><button type="button" class="catalog-button" :disabled="page.currentPage === page.totalPages" @click="goPage(page.currentPage + 1)">下一页</button></nav>
      </section>
    </div>
    <section v-else class="catalog-body"><div class="catalog-empty"><h2>还没有发布知识笔记</h2><p>思源中的知识笔记发布后，会自动汇聚专题与标签。</p></div></section>
  </main>
</template>
