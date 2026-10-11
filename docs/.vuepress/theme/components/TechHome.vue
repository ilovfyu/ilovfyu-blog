<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'
import SignalScene from './SignalScene.vue'
import AnimatedProjectSection from './AnimatedProjectSection.vue'

import { notes, knowledge, projects } from '../data/content'

const featuredProjects = projects.filter(project => project.project?.group === '持续构建')

const recentNotes = notes.slice(1, 4)
const scrollPct = ref(0)
const now = ref('')

let clockTimer = 0
let scrollRaf = 0
let io: IntersectionObserver | null = null
let ambientIo: IntersectionObserver | null = null

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollPct.value = max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 0
    scrollRaf = 0
  })
}

onMounted(() => {
  const updateClock = () => {
    now.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Shanghai' })
  }
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)

  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  const page = document.querySelector('.technical-home')
  const revealItems = [...document.querySelectorAll<HTMLElement>('.technical-home .reveal')]
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
    revealItems.forEach(el => el.classList.add('in'))
  }
  else {
    io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('in')
        io?.unobserve(entry.target)
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' })
    revealItems.forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.94) el.classList.add('in')
      else io?.observe(el)
    })
  }
  page?.classList.add('motion-ready')
  if (typeof IntersectionObserver !== 'undefined') {
    ambientIo = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('ambient-in-view', entry.isIntersecting)))
    document.querySelectorAll('.technical-home .knowledge-constellation').forEach(el => ambientIo?.observe(el))
  }
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  io?.disconnect()
  ambientIo?.disconnect()
})
</script>

<template>
  <main class="cosmic-home technical-home">
    <div class="scroll-progress" :style="{ transform: `scaleX(${scrollPct / 100})` }" aria-hidden="true" />

    <section class="hero tech-hero">
      <div class="hero-grid" aria-hidden="true" />
      <div class="hero-content">
        <div class="hero-left">
          <p class="eyebrow"><span class="pulse-dot" /> ILOVFYU / DIGITAL GARDEN</p>
          <h1 class="hero-title">写代码，<br />也写下为什么。</h1>
          <p class="hero-desc">做可运行的系统，也记录每次选择背后的理由。这里是我在 AI、前端、工程架构与生活之间持续更新的工作现场。</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#latest">{{ notes.length ? '开始阅读' : '探索博客' }} <b>↓</b></a>
          </div>
          <p class="hero-coordinate">SHENZHEN, CN <span>／</span> CODE · SYSTEMS · LIFE</p>
        </div>
        <div class="hero-signal" aria-label="代码、构建与写作">
          <div class="hero-signal-heading"><span>PERSONAL SIGNAL / 001</span><i aria-hidden="true" /> <span>LIVE IDEAS</span></div>
          <SignalScene />
        </div>
      </div>
      <div class="hero-bottom-rail" aria-hidden="true"><span>SCROLL TO EXPLORE</span><i /><span>TRANSMITTING IDEAS · EST. 2024</span></div>
    </section>

    <section id="latest" class="featured-section section">
      <header class="section-head reveal"><h2>最新随笔</h2><p class="sub">记录问题背景、工程约束与实践过程。</p></header>
      <div v-if="notes.length" class="featured-article featured-article--single reveal">
        <a :href="withBase(notes[0].path)" class="featured-copy">
          <div class="article-meta"><b>{{ notes[0].label }}</b><span>{{ notes[0].date }}</span></div>
          <h3>{{ notes[0].title }}</h3>
          <p>{{ notes[0].summary }}</p>
          <div class="article-tags"><span v-for="tag in notes[0].tags" :key="tag">#{{ tag }}</span></div>
          <span class="read-link">阅读全文 <b>↗</b></span>
        </a>
      </div>
      <div v-else class="catalog-empty reveal"><p class="catalog-kicker">A NEW CHAPTER</p><h3>新的记录，从这里开始。</h3><p>目前还没有发布随笔，之后的文章会出现在这里。</p></div>
    </section>

    <section v-if="recentNotes.length" class="article-section section">
      <header class="section-head reveal"><h2>最近随笔</h2><p class="sub">不追逐资讯更新，只记录值得反复回看的原理、实践与思考。</p></header>
      <div class="article-grid">
        <a v-for="note in recentNotes" :key="note.path" :href="withBase(note.path)" class="article-card reveal">
          <div class="article-meta"><b :class="`tag-${note.category}`">{{ note.label }}</b><time>{{ note.date }}</time></div>
          <h3>{{ note.title }}</h3><p>{{ note.summary }}</p>
          <div class="article-tags"><span v-for="tag in note.tags" :key="tag">#{{ tag }}</span></div>
          <span class="article-arrow">↗</span>
        </a>
      </div>
      <a class="home-project-all reveal" :href="withBase('/posts/')">全部随笔 <b aria-hidden="true">↗</b></a>
    </section>

    <section class="home-study section">
      <div class="home-study-copy reveal"><p class="catalog-kicker">KNOWLEDGE / CONTINUOUS STUDY</p><h2>沿着一条线，学深一点。</h2><p>{{ knowledge.length ? `${knowledge.length} 篇笔记，串起持续学习与实践的路径。` : '整理值得反复查阅的知识，让零散的想法逐渐连成线。' }}</p><a class="home-project-all" :href="withBase('/topics/')">进入知识库 <b aria-hidden="true">↗</b></a></div>
      <div class="knowledge-constellation reveal" aria-hidden="true">
        <svg viewBox="0 0 440 230" fill="none">
          <path class="knowledge-grid" d="M20 55H420M20 115H420M20 175H420M80 25V205M160 25V205M240 25V205M320 25V205M400 25V205" />
          <path class="knowledge-connection" d="M65 125C105 125 125 60 180 60S260 170 315 170S370 105 400 105" />
          <path class="knowledge-packet" d="M65 125C105 125 125 60 180 60S260 170 315 170S370 105 400 105" />
          <path class="knowledge-branch" d="M65 125L110 180L180 60L260 75L315 170L365 40L400 105" />
          <g class="knowledge-point"><circle cx="65" cy="125" r="22" /><circle cx="65" cy="125" r="4" /><text x="43" y="89">IDEA</text></g>
          <g class="knowledge-point"><circle cx="180" cy="60" r="22" /><circle cx="180" cy="60" r="4" /><text x="170" y="109">LINK</text></g>
          <g class="knowledge-point"><circle cx="315" cy="170" r="22" /><circle cx="315" cy="170" r="4" /><text x="301" y="133">NOTE</text></g>
          <g class="knowledge-satellite"><circle cx="110" cy="180" r="3" /><circle cx="260" cy="75" r="3" /><circle cx="365" cy="40" r="3" /><circle cx="400" cy="105" r="3" /></g>
        </svg>
        <div><span>01 / EXPLORE</span><span>02 / CONNECT</span><span>03 / REMEMBER</span></div>
      </div>
    </section>

    <section v-if="featuredProjects.length" class="home-project-section section">
      <AnimatedProjectSection :entries="featuredProjects" />
      <a class="home-project-all" :href="withBase('/projects/')">查看全部项目 <b aria-hidden="true">↗</b></a>
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
