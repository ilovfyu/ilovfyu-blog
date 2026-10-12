<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, BookOpen, Search } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, withBase } from 'vuepress/client'
import { knowledge } from '../data/content'
import { knowledgeTopicChapters, knowledgeTopicPath, knowledgeTopics, normalizeKnowledgeNotes } from '../utils/knowledge-index'
import TopicJourney from './TopicJourney.vue'

const articles = normalizeKnowledgeNotes(knowledge)
const topics = knowledgeTopics(articles)
const route = useRoute()
const router = useRouter()
const query = ref('')
const hydrated = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
const requested = computed(() => !hydrated.value ? '' : typeof route.query.series === 'string' ? route.query.series : typeof route.query.topic === 'string' ? route.query.topic : '')
const topic = computed(() => topics.find(item => item.name === requested.value))
const chapters = computed(() => topic.value ? knowledgeTopicChapters(articles, topic.value.name) : [])
const firstNote = computed(() => chapters.value[0]?.entries[0])
const totalChapters = topics.reduce((count, item) => count + knowledgeTopicChapters(articles, item.name).length, 0)
const totalNotes = topics.reduce((count, item) => count + item.count, 0)
const results = computed(() => {
  const tokens = query.value.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return topics.filter(item => tokens.every(token => `${item.name} ${item.groups.join(' ')}`.normalize('NFKC').toLocaleLowerCase().includes(token)))
})
const journeySteps = computed(() => {
  if (topic.value) return chapters.value.map(chapter => ({ name: chapter.name, href: `#${chapter.id}` }))
  const featured = topics[0]
  return featured ? knowledgeTopicChapters(articles, featured.name).map(chapter => ({ name: chapter.name, href: `${topicPath(featured.name)}#${chapter.id}` })) : []
})
const activeChapter = ref('')
const readProgress = computed(() => { const index = chapters.value.findIndex(chapter => chapter.id === activeChapter.value); return index < 0 ? 0 : (index + 1) / chapters.value.length * 100 })
let scrollFrame = 0
function updateChapter() {
  scrollFrame = 0
  const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
  const current = atEnd ? chapters.value.at(-1) : chapters.value.filter(chapter => (document.getElementById(chapter.id)?.getBoundingClientRect().top ?? Infinity) <= 180).at(-1) || chapters.value[0]
  activeChapter.value = current?.id || ''
}
function queueChapter() { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateChapter) }
watch(chapters, async () => { await nextTick(); updateChapter() })
const digits = (value: number) => String(value).padStart(2, '0')
const overviewPath = computed(() => withBase(`/topics/${query.value ? `?q=${encodeURIComponent(query.value)}` : ''}`))
function topicPath(name: string) { return withBase(`${knowledgeTopicPath(name)}${query.value ? `&q=${encodeURIComponent(query.value)}` : ''}`) }
function restoreQuery() { clearTimeout(timer); query.value = typeof route.query.q === 'string' ? route.query.q : '' }
watch(() => route.query.q, restoreQuery)
onMounted(() => { restoreQuery(); hydrated.value = true; window.addEventListener('scroll', queueChapter, { passive: true }); window.addEventListener('resize', queueChapter, { passive: true }) })
watch(query, value => {
  clearTimeout(timer)
  if (value === (typeof route.query.q === 'string' ? route.query.q : '') || requested.value) return
  timer = setTimeout(() => {
    const next = { ...route.query }; delete next.q
    if (value.trim()) next.q = value
    void router.replace({ path: route.path, query: next, hash: route.hash })
  }, 220)
})
onBeforeUnmount(() => { clearTimeout(timer); cancelAnimationFrame(scrollFrame); window.removeEventListener('scroll', queueChapter); window.removeEventListener('resize', queueChapter) })
</script>

<template>
  <main class="topic-page catalog-page">
    <header class="catalog-hero topic-hero">
      <div class="topic-hero-copy">
        <a v-if="requested" class="topic-back" :href="overviewPath"><ArrowLeft aria-hidden="true" />全部专题</a>
        <p class="catalog-kicker">{{ topic ? 'SERIES / READING PATH' : 'TOPICS / DEEP EXPLORATION' }}</p>
        <h1>{{ topic?.name || '专题' }}</h1>
        <p class="catalog-description">{{ topic ? '从第一篇开始，沿章节逐步深入。在连续阅读中，建立完整的理解。' : '围绕一个方向，走完一条学习路径。按专题探索，从章节出发，把知识组织成连续的理解。' }}</p>
        <dl class="topic-metrics"><div v-if="!topic"><dt>学习专题</dt><dd>{{ digits(topics.length) }}</dd></div><div><dt>{{ topic ? '专题笔记' : '收录笔记' }}</dt><dd>{{ digits(topic?.count ?? totalNotes) }}</dd></div><div><dt>章节分组</dt><dd>{{ digits(topic ? chapters.length : totalChapters) }}</dd></div></dl>
        <a v-if="firstNote" class="catalog-button topic-start" :href="withBase(firstNote.path)">开始阅读 <ArrowUpRight aria-hidden="true" /></a>
      </div>
      <TopicJourney v-if="journeySteps.length && (!requested || topic)" :steps="journeySteps" :label="`${topic?.name || topics[0]?.name || '专题'} / 章节航线`" />
    </header>
    <div v-if="topic" class="catalog-body topic-reading-layout">
      <aside class="topic-chapter-nav" aria-label="专题章节导航"><p class="catalog-kicker">READING / CHAPTERS</p><div class="topic-navigation-progress" aria-hidden="true"><i :style="{ width: `${readProgress}%` }" /></div><a v-for="(chapter, index) in chapters" :key="chapter.id" :href="`#${chapter.id}`" :aria-current="activeChapter === chapter.id ? 'location' : undefined"><span>{{ digits(index + 1) }}</span><strong>{{ chapter.name }}</strong><small>{{ chapter.entries.length }}</small></a></aside>
      <div class="topic-reading-content">
        <section v-for="(chapter, index) in chapters" :id="chapter.id" :key="chapter.id" class="topic-chapter" :class="{ 'chapter-active': activeChapter === chapter.id }" :aria-labelledby="`${chapter.id}-title`">
          <header class="topic-section-heading"><div><p class="catalog-kicker">{{ digits(index + 1) }} / CHAPTER</p><h2 :id="`${chapter.id}-title`">{{ chapter.name }}</h2></div><span>{{ chapter.entries.length }} 篇笔记</span></header>
          <div class="topic-chapter-list"><a v-for="note in chapter.entries" :key="note.path" :href="withBase(note.path)" class="topic-reading-link"><div><h3>{{ note.title }}</h3><p v-if="note.summary">{{ note.summary }}</p></div><ArrowUpRight aria-hidden="true" /></a></div>
        </section>
      </div>
    </div>
    <section v-else-if="requested" class="catalog-body"><div class="catalog-empty"><h2>暂时没有这个专题</h2><p>专题名称可能已调整，查看当前已发布的学习系列。</p><a class="catalog-button" :href="withBase('/topics/')">返回专题目录</a></div></section>
    <section v-else class="catalog-body topic-catalog" aria-labelledby="topic-catalog-heading">
      <header class="topic-section-heading"><div><p class="catalog-kicker">EXPLORE / LEARNING SERIES</p><h2 id="topic-catalog-heading">专题目录</h2></div><span role="status" aria-live="polite">{{ results.length }} 个专题</span></header>
      <label v-if="topics.length" class="catalog-search topic-search"><Search aria-hidden="true" /><input v-model="query" type="search" aria-label="搜索专题" placeholder="搜索专题名称或章节" /></label>
      <div v-if="results.length" class="topic-card-grid"><a v-for="(item, index) in results" :key="item.name" class="topic-card" :data-tone="index % 2 ? 'cyan' : 'violet'" :href="topicPath(item.name)"><div class="topic-card-copy"><span class="topic-card-code"><BookOpen aria-hidden="true" />{{ digits(index + 1) }} / SERIES</span><h3>{{ item.name }}</h3><p>{{ item.count }} 篇笔记<span v-if="item.groups.length"> · {{ item.groups.length }} 个章节分组</span></p></div><div class="topic-card-route" aria-hidden="true"><div v-for="(group, step) in (item.groups.length ? item.groups : ['阅读笔记']).slice(0, 5)" :key="group"><span>{{ digits(step + 1) }}</span><i /><strong>{{ group }}</strong></div><small v-if="item.groups.length > 5">+{{ item.groups.length - 5 }} 章节</small></div><span class="topic-card-action">进入专题 <ArrowUpRight aria-hidden="true" /></span></a></div>
      <div v-else class="catalog-empty"><h3>{{ topics.length ? '暂时没有匹配的专题' : '还没有发布学习专题' }}</h3><p>{{ topics.length ? '试试其他关键词，或查看全部专题。' : '连续的学习笔记发布后，会汇聚成专题阅读路径。' }}</p><button v-if="topics.length" type="button" class="catalog-button" @click="query = ''">查看全部专题</button></div>
    </section>
  </main>
</template>
