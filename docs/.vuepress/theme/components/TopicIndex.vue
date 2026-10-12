<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, BookOpen, Layers, Search } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, withBase } from 'vuepress/client'
import { knowledge } from '../data/content'
import { knowledgeTopicChapters, knowledgeTopicPath, knowledgeTopics, normalizeKnowledgeNotes } from '../utils/knowledge-index'
import KnowledgeAtlas from './KnowledgeAtlas.vue'

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
const digits = (value: number) => String(value).padStart(2, '0')
const overviewPath = computed(() => withBase(`/topics/${query.value ? `?q=${encodeURIComponent(query.value)}` : ''}`))
function topicPath(name: string) { return withBase(`${knowledgeTopicPath(name)}${query.value ? `&q=${encodeURIComponent(query.value)}` : ''}`) }
function restoreQuery() { clearTimeout(timer); query.value = typeof route.query.q === 'string' ? route.query.q : '' }
watch(() => route.query.q, restoreQuery)
onMounted(() => { restoreQuery(); hydrated.value = true })
watch(query, value => {
  clearTimeout(timer)
  if (value === (typeof route.query.q === 'string' ? route.query.q : '') || requested.value) return
  timer = setTimeout(() => {
    const next = { ...route.query }; delete next.q
    if (value.trim()) next.q = value
    void router.replace({ path: route.path, query: next, hash: route.hash })
  }, 220)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <main class="topic-page catalog-page">
    <header class="catalog-hero knowledge-hero topic-hero">
      <div class="knowledge-hero-copy">
        <a v-if="requested" class="topic-back" :href="overviewPath"><ArrowLeft aria-hidden="true" />全部专题</a>
        <p class="catalog-kicker">{{ topic ? 'SERIES / READING PATH' : 'TOPICS / DEEP EXPLORATION' }}</p>
        <h1>{{ topic?.name || '专题' }}</h1>
        <p class="catalog-description">{{ topic ? '从第一篇开始，沿章节逐步深入。在连续阅读中，建立完整的理解。' : '围绕一个方向，走完一条学习路径。按专题探索，从章节出发，把知识组织成连续的理解。' }}</p>
        <dl class="knowledge-metrics"><div v-if="!topic"><dt>学习专题</dt><dd>{{ digits(topics.length) }}</dd></div><div><dt>{{ topic ? '专题笔记' : '收录笔记' }}</dt><dd>{{ digits(topic?.count ?? totalNotes) }}</dd></div><div><dt>章节分组</dt><dd>{{ digits(topic ? chapters.length : totalChapters) }}</dd></div></dl>
        <a v-if="firstNote" class="catalog-button topic-start" :href="withBase(firstNote.path)">开始阅读 <ArrowUpRight aria-hidden="true" /></a>
      </div>
      <KnowledgeAtlas mode="topics" />
    </header>
    <div v-if="topic" class="catalog-body topic-reading-layout">
      <aside class="topic-chapter-nav" aria-label="专题章节导航"><p class="catalog-kicker">READING / CHAPTERS</p><a v-for="(chapter, index) in chapters" :key="chapter.id" :href="`#${chapter.id}`" :aria-current="route.hash === `#${chapter.id}` || (!route.hash && index === 0) ? 'location' : undefined"><span>{{ digits(index + 1) }}</span><strong>{{ chapter.name }}</strong><small>{{ chapter.entries.length }}</small></a></aside>
      <div class="topic-reading-content">
        <section v-for="(chapter, index) in chapters" :id="chapter.id" :key="chapter.id" class="topic-chapter" :aria-labelledby="`${chapter.id}-title`">
          <header class="topic-section-heading"><div><p class="catalog-kicker">{{ digits(index + 1) }} / CHAPTER</p><h2 :id="`${chapter.id}-title`">{{ chapter.name }}</h2></div><span>{{ chapter.entries.length }} 篇笔记</span></header>
          <div class="topic-chapter-list"><a v-for="note in chapter.entries" :key="note.path" :href="withBase(note.path)" class="topic-reading-link"><div><h3>{{ note.title }}</h3><p v-if="note.summary">{{ note.summary }}</p></div><ArrowUpRight aria-hidden="true" /></a></div>
        </section>
      </div>
    </div>
    <section v-else-if="requested" class="catalog-body"><div class="catalog-empty"><h2>暂时没有这个专题</h2><p>专题名称可能已调整，查看当前已发布的学习系列。</p><a class="catalog-button" :href="withBase('/topics/')">返回专题目录</a></div></section>
    <section v-else class="catalog-body topic-catalog" aria-labelledby="topic-catalog-heading">
      <header class="topic-section-heading"><div><p class="catalog-kicker">EXPLORE / LEARNING SERIES</p><h2 id="topic-catalog-heading">专题目录</h2></div><span role="status" aria-live="polite">{{ results.length }} 个专题</span></header>
      <label v-if="topics.length" class="catalog-search topic-search"><Search aria-hidden="true" /><input v-model="query" type="search" aria-label="搜索专题" placeholder="搜索专题名称或章节" /></label>
      <div v-if="results.length" class="topic-card-grid"><a v-for="(item, index) in results" :key="item.name" class="topic-card" :data-tone="index % 2 ? 'cyan' : 'violet'" :href="topicPath(item.name)"><div class="topic-card-copy"><span class="topic-card-code"><BookOpen aria-hidden="true" />{{ digits(index + 1) }} / SERIES</span><h3>{{ item.name }}</h3><p>{{ item.count }} 篇笔记<span v-if="item.groups.length"> · {{ item.groups.length }} 个章节分组</span></p><div v-if="item.groups.length" class="topic-card-groups"><span v-for="group in item.groups.slice(0, 4)" :key="group">{{ group }}</span><span v-if="item.groups.length > 4">+{{ item.groups.length - 4 }}</span></div></div><div class="topic-card-art" aria-hidden="true"><i /><b /><span /><Layers /></div><span class="topic-card-action">进入专题 <ArrowUpRight aria-hidden="true" /></span></a></div>
      <div v-else class="catalog-empty"><h3>{{ topics.length ? '暂时没有匹配的专题' : '还没有发布学习专题' }}</h3><p>{{ topics.length ? '试试其他关键词，或查看全部专题。' : '连续的学习笔记发布后，会汇聚成专题阅读路径。' }}</p><button v-if="topics.length" type="button" class="catalog-button" @click="query = ''">查看全部专题</button></div>
    </section>
  </main>
</template>
