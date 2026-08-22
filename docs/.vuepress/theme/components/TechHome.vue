<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

type Category = 'all' | 'ai' | 'frontend' | 'engineering' | 'thinking'
type Note = {
  category: Exclude<Category, 'all'>
  label: string
  date: string
  title: string
  summary: string
  path: string
  tags: string[]
  read: string
}

const notes: Note[] = [
  { category: 'ai', label: 'AI / RAG', date: '2026.08.01', title: '从 Demo 到生产：构建可靠 RAG 系统的六个层次', summary: '把 RAG 拆成数据生命周期、解析、检索、上下文、评测与安全治理六条可观测链路。', path: '/posts/production-rag/', tags: ['RAG', 'LLM', 'Retrieval'], read: '12 MIN' },
  { category: 'ai', label: 'AI / AGENT', date: '2026.07.24', title: 'AI Agent 工程化：状态、工具调用与可观测性', summary: '从状态机、工具契约、权限与 Trace 出发，构建可恢复、可解释的 Agent Runtime。', path: '/posts/agent-runtime/', tags: ['Agent', 'Runtime', 'Observability'], read: '11 MIN' },
  { category: 'frontend', label: 'VUE / PERF', date: '2026.07.12', title: 'Vue 3 高性能交互：建立 16ms 渲染预算', summary: '定位脚本、布局与绘制开销，缩小响应式更新面，并拆分低优先级工作。', path: '/posts/vue-render-budget/', tags: ['Vue 3', 'Performance', 'Rendering'], read: '10 MIN' },
  { category: 'engineering', label: 'TS / ARCH', date: '2026.06.28', title: 'TypeScript 项目中真正值得设计的类型边界', summary: '用 unknown、解析层和领域模型，阻止不可信数据从系统边界向内部扩散。', path: '/posts/typescript-boundaries/', tags: ['TypeScript', 'Architecture', 'API'], read: '11 MIN' },
  { category: 'frontend', label: 'WEB / RUM', date: '2026.06.15', title: '从 Core Web Vitals 到真实用户监控', summary: '不只采集 LCP、INP、CLS，而是建立能关联版本、路由和发布事件的观测闭环。', path: '/posts/frontend-observability/', tags: ['Web Vitals', 'RUM', 'Metrics'], read: '10 MIN' },
  { category: 'ai', label: 'AI / EVAL', date: '2026.05.30', title: '不靠感觉调 Prompt：建立可重复的评测集', summary: '固定输入、质量标准和回归切片，让每次 Prompt 与模型变更都可以被比较。', path: '/posts/prompt-evaluation/', tags: ['Evaluation', 'Prompt', 'CI'], read: '09 MIN' },
  { category: 'thinking', label: 'THINKING', date: '2024.07.18', title: '当屏幕消失之后，我们还剩下什么？', summary: '当技术逐渐退到环境里，重新思考界面、注意力与人的主动选择。', path: '/posts/screenless-era/', tags: ['Interface', 'Human', 'Future'], read: '06 MIN' },
  { category: 'thinking', label: 'BUILDING', date: '2024.07.02', title: '把想法变成现实的 7 个夜晚', summary: '一个独立产品从零到一的记录，关于原型、取舍和真实反馈。', path: '/posts/seven-nights/', tags: ['Product', 'Prototype', 'Review'], read: '08 MIN' },
  { category: 'thinking', label: 'LIFE', date: '2024.06.21', title: '在城市边缘，寻找一点留白', summary: '暂时离开通知和信息流，让注意力重新恢复完整。', path: '/posts/edge-of-city/', tags: ['Life', 'Attention', 'Space'], read: '04 MIN' },
]

const homeTopics = [
  { name: 'AI 系统工程', summary: '关注模型如何进入可靠的软件系统，而不只停留在一次效果不错的演示。', items: ['RAG 与知识生命周期', 'Agent Runtime', '评测与可观测性'] },
  { name: '前端与交互体验', summary: '从浏览器运行机制到信息结构，把复杂能力做成清楚、快速且可理解的界面。', items: ['Vue 与 TypeScript', '渲染性能', '组件与交互设计'] },
  { name: '软件架构与实践', summary: '记录真实项目中的边界、取舍和失败路径，让工程判断能够被解释和复用。', items: ['类型与接口边界', '系统可靠性', '工具与构建过程'] },
]

const category = ref<Category>('all')
const filteredNotes = computed(() => category.value === 'all' ? notes : notes.filter((note) => note.category === category.value))
const scrollPct = ref(0)
const now = ref('')

let clockTimer = 0
let scrollRaf = 0
let io: IntersectionObserver | null = null

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollPct.value = max > 0 ? (scrollY / max) * 100 : 0
    scrollRaf = 0
  })
}

function randomArticle() {
  window.location.href = withBase(notes[Math.floor(Math.random() * notes.length)].path)
}

onMounted(() => {
  const updateClock = () => {
    now.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Shanghai' })
  }
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)

  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('in')
      io?.unobserve(entry.target)
    })
  }, { threshold: 0.1 })
  document.querySelectorAll('.reveal').forEach((el) => io?.observe(el))
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  io?.disconnect()
})
</script>

<template>
  <main class="cosmic-home technical-home">
    <div class="scroll-progress" :style="{ width: scrollPct + '%' }" />

    <section class="hero tech-hero">
      <div class="hero-content">
        <div class="hero-left">
          <p class="eyebrow">个人技术博客</p>
          <h1 class="hero-title">写代码，<br />也写下为什么。</h1>
          <p class="hero-desc">一个关于 AI、前端、系统架构与开发实践的个人技术博客。记录解决问题的过程，也保留代码之外的产品与生活思考。</p>
          <div class="hero-actions">
            <a class="btn btn-primary" :href="withBase('/posts/')">阅读最新文章 <b>↗</b></a>
            <a class="btn btn-ghost" :href="withBase('/about/')">关于我</a>
          </div>
        </div>
      </div>
    </section>

    <section class="featured-section section">
      <header class="section-head reveal"><h2>本期随笔</h2><p class="sub">最近最值得分享的一篇文章，记录问题背景、工程约束和实践过程。</p></header>
      <div class="featured-article featured-article--single reveal">
        <a :href="withBase(notes[0].path)" class="featured-copy">
          <div class="article-meta"><b>{{ notes[0].label }}</b><span>{{ notes[0].date }} · {{ notes[0].read }}</span></div>
          <h3>{{ notes[0].title }}</h3>
          <p>{{ notes[0].summary }}</p>
          <div class="article-tags"><span v-for="tag in notes[0].tags" :key="tag">#{{ tag }}</span></div>
          <span class="read-link">阅读全文 <b>↗</b></span>
        </a>
      </div>
    </section>

    <section class="article-section section">
      <header class="section-head reveal"><h2>最近随笔</h2><p class="sub">不追逐资讯更新，只记录值得反复回看的原理、实践与思考。</p></header>
      <div class="article-toolbar reveal">
        <div class="log-tabs">
          <button v-for="item in (['all', 'ai', 'frontend', 'engineering', 'thinking'] as Category[])" :key="item" :class="{ active: category === item }" @click="category = item">
            {{ { all: '全部', ai: 'AI 与数据', frontend: '语言与前端', engineering: '系统与架构', thinking: '产品与思考' }[item] }}
            <sup>{{ item === 'all' ? notes.length : notes.filter((note) => note.category === item).length }}</sup>
          </button>
        </div>
        <button class="random-btn" @click="randomArticle">随机阅读 <span>⤨</span></button>
      </div>
      <div class="article-grid">
        <a v-for="note in filteredNotes" :key="note.path" :href="withBase(note.path)" class="article-card reveal">
          <div class="article-meta"><b :class="`tag-${note.category}`">{{ note.label }}</b><time>{{ note.date }} · {{ note.read }}</time></div>
          <h3>{{ note.title }}</h3><p>{{ note.summary }}</p>
          <div class="article-tags"><span v-for="tag in note.tags" :key="tag">#{{ tag }}</span></div>
          <span class="article-arrow">↗</span>
        </a>
      </div>
    </section>

    <section class="home-topic-section section">
      <header class="section-head reveal"><h2>持续整理的技术主题</h2><p class="sub">不追求覆盖所有名词，只整理正在实践、值得长期积累的方向。</p></header>
      <div class="home-topic-grid reveal">
        <article v-for="topic in homeTopics" :key="topic.name" class="home-topic">
          <h3>{{ topic.name }}</h3>
          <p>{{ topic.summary }}</p>
          <ul><li v-for="item in topic.items" :key="item">{{ item }}</li></ul>
        </article>
      </div>
      <div class="home-topic-footer reveal">
        <p>更细的标签、笔记和已发布文章统一收录在知识库中。</p>
        <a :href="withBase('/topics/')">浏览完整知识库 <b>↗</b></a>
      </div>
    </section>

    <section class="author-section section">
      <header class="section-head reveal"><h2>关于博主</h2><p class="sub">代码是工作的一部分，写作是整理思考的方式。</p></header>
      <div class="author-spread reveal">
        <div class="author-identity">
          <div class="author-portrait"><img :src="withBase('/avatar.svg')" alt="ILOVFYU" /></div>
          <div class="author-copy">
            <h3>你好，我是 <strong>ILOVFYU</strong><br /><span>在代码与文字之间，持续构建。</span></h3>
            <div class="author-bio">关注 AI 应用、现代前端、TypeScript 架构和开发者工具。这里记录工程实践中的问题、方案与取舍，也保留产品构建和日常生活中的观察。</div>
            <div class="author-links"><a :href="withBase('/about/')">更多关于我 <b>↗</b></a></div>
          </div>
        </div>
      </div>
      <footer class="cosmic-footer"><span><b>ILOVFYU</b></span><span>记录代码、系统与思考</span><span>深圳 · {{ now }}</span></footer>
    </section>
  </main>
</template>
