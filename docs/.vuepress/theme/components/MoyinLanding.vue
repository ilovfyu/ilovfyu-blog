<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

const navLinks = [
  { label: '能力', href: '#moyin-features' },
  { label: '工作流', href: '#moyin-flow' },
]

const features = [
  { icon: '◈', title: '多源资料导入', desc: '书籍 PDF、辅导资料、习题册、网页笔记，一键接入，自动解析成可教学的知识结构。', tag: 'IMPORT' },
  { icon: '✦', title: '智能教学设计', desc: '大模型拆解教学目标、讲稿与分镜，把晦涩文字变成有节奏的授课方案。', tag: 'LLM' },
  { icon: '⌬', title: '矢量板书', desc: '文字、公式与图形以矢量呈现，重点标记、擦除、镜头跟随，可编辑可缩放。', tag: 'BOARD' },
  { icon: '♫', title: '声色俱全', desc: 'TTS 配音、字幕、图表动画与声音驱动的时间轴，让课程真正"讲"出来。', tag: 'AUDIO' },
  { icon: '⇄', title: '随堂互动', desc: '内嵌习题、随堂问答与即时反馈，学习从单向观看变成双向参与。', tag: 'INTERACT' },
  { icon: '⤷', title: '课程交付', desc: '一课多形态输出：网页课、视频课、讲义与习题册，随处可学。', tag: 'DELIVER' },
]

const flow = [
  { code: '01', title: '资料入库', desc: '导入书籍、辅导资料、习题册与网页内容，自动解析章节与知识点。' },
  { code: '02', title: '教学设计', desc: 'LLM 生成教学目标、讲稿与分镜，人工可审核、可编辑。' },
  { code: '03', title: '板书与素材', desc: '生成矢量板书、图表、配音与字幕等课程素材。' },
  { code: '04', title: '合成课程', desc: '音频驱动的统一时间轴，把板书与讲解合成为完整课程。' },
  { code: '05', title: '互动与交付', desc: '加入习题互动，输出网页课、视频课与讲义等多种形态。' },
]

const scrollPct = ref(0)
let scrollRaf = 0
let revealObserver: IntersectionObserver | null = null

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollPct.value = max > 0 ? (scrollY / max) * 100 : 0
    scrollRaf = 0
  })
}

function scrollToId(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('in')
        revealObserver?.unobserve(entry.target)
      })
    },
    { threshold: 0.1 },
  )
  document.querySelectorAll('.moyin-reveal').forEach((el) => revealObserver?.observe(el))
})

onBeforeUnmount(() => {
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  revealObserver?.disconnect()
})
</script>

<template>
  <main class="moyin-landing">
    <div class="moyin-progress" :style="{ width: scrollPct + '%' }" />

    <header class="moyin-topbar">
      <a class="moyin-brand" :href="withBase('/moyin/')">
        <span class="moyin-brand-mark">墨</span>
        <span class="moyin-brand-name"><b>墨影</b><i>MOYIN · COURSE WORKFLOW</i></span>
      </a>
      <nav class="moyin-nav">
        <a v-for="link in navLinks" :key="link.label" :href="link.href" @click.prevent="scrollToId(link.href)">
          {{ link.label }}
        </a>
      </nav>
      <a class="moyin-top-cta" :href="withBase('/moyin/#moyin-flow')" @click.prevent="scrollToId('#moyin-flow')">了解工作流 ↘</a>
    </header>

    <section class="moyin-hero">
      <div class="moyin-grid-bg" aria-hidden="true" />
      <div class="moyin-orb" aria-hidden="true" />
      <div class="moyin-hero-inner">
        <p class="moyin-eyebrow"><i /> MOYIN // COURSE GENERATION</p>
        <h1 class="moyin-title">
          把一本书，<br />
          <span>讲成一门课</span>
        </h1>
        <p class="moyin-sub">
          墨影把书籍、辅导资料、习题册与网上资料，通过工作流系统生成声色俱全、带板书与互动的教学课程。晦涩文字变成看得见、听得懂、学得进的一堂课。
        </p>
        <div class="moyin-ctas">
          <a class="moyin-btn moyin-btn-primary" :href="withBase('/moyin/#moyin-flow')" @click.prevent="scrollToId('#moyin-flow')">
            查看工作流 <b>↘</b>
          </a>
          <a class="moyin-btn moyin-btn-ghost" :href="withBase('/moyin/#moyin-features')" @click.prevent="scrollToId('#moyin-features')">
            了解能力
          </a>
        </div>
        <ul class="moyin-hero-points">
          <li>资料→课程</li>
          <li>矢量板书</li>
          <li>声色俱全</li>
        </ul>
      </div>

      <div class="moyin-board-wrap moyin-reveal">
        <div class="moyin-screen">
          <div class="moyin-screen-head">
            <span>MOYIN // COURSE: 线性代数 · 特征值</span>
            <i>● RECORDING</i>
          </div>
          <div class="moyin-stage">
            <div class="moyin-board">
              <p class="moyin-board-title">特征值与特征向量</p>
              <div class="moyin-eq">A<span>v</span> = <span>λ</span>v</div>
              <div class="moyin-axiom">
                <i v-for="n in 4" :key="n" />
                <b>det(A − λI) = 0</b>
              </div>
              <span class="moyin-marker" aria-hidden="true" />
            </div>
            <div class="moyin-voice">
              <span class="moyin-wave" aria-hidden="true"><i v-for="n in 18" :key="n" /></span>
              <span class="moyin-caption">「λ 是 A 的特征值，当且仅当存在非零向量 v…」</span>
            </div>
          </div>
          <div class="moyin-screen-foot">
            <span>TTS · 板书动画 · 字幕</span>
            <span class="quiz">随堂题 3/5 ✓</span>
          </div>
        </div>
        <span class="moyin-chip chip-a" aria-hidden="true">PDF → COURSE</span>
        <span class="moyin-chip chip-b" aria-hidden="true">VECTOR BOARD</span>
        <span class="moyin-chip chip-c" aria-hidden="true">INTERACTIVE QUIZ</span>
      </div>

      <div class="moyin-hero-status">
        <span>MOYIN: <em>WEB PLATFORM</em></span>
        <span>MISSION: <em>MATERIAL → COURSE → UNDERSTAND</em></span>
        <span class="moyin-hero-scroll">SCROLL TO EXPLORE <i>↓</i></span>
      </div>
    </section>

    <div class="moyin-ticker">
      <div class="moyin-ticker-track">
        <span v-for="n in 5" :key="n">资料入库 <i>✦</i> 教学设计 <i>✦</i> 矢量板书 <i>✦</i> 声色俱全 <i>✦</i> 互动课程 <i>✦</i>&nbsp;</span>
      </div>
    </div>

    <section id="moyin-features" class="moyin-section">
      <header class="moyin-section-head moyin-reveal">
        <p class="moyin-eyebrow"><i /> // 01 · CAPABILITIES</p>
        <h2>从资料到课堂，一条流水线</h2>
        <p class="moyin-section-sub">把分散的书籍与资料，交给一条可审核、可编辑、可重建的课程生成工作流。</p>
      </header>
      <div class="moyin-features">
        <article v-for="feature in features" :key="feature.title" class="moyin-feature moyin-reveal">
          <span class="moyin-feature-tag">{{ feature.tag }}</span>
          <span class="moyin-feature-icon" aria-hidden="true">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
        </article>
      </div>
    </section>

    <section id="moyin-flow" class="moyin-flow-section">
      <div class="moyin-flow moyin-reveal">
        <header class="moyin-flow-head">
          <p class="moyin-eyebrow"><i /> // 02 · WORKFLOW</p>
          <h2>五步，生成一堂完整的课</h2>
          <p>每一步的产物都可检查、可编辑、可局部重建，质量始终在掌控中。</p>
        </header>
        <ol class="moyin-flow-list">
          <li v-for="item in flow" :key="item.code">
            <span class="moyin-flow-num">{{ item.code }}</span>
            <div><h3>{{ item.title }}</h3><p>{{ item.desc }}</p></div>
            <i aria-hidden="true">→</i>
          </li>
        </ol>
      </div>
      <footer class="moyin-footer">
        <span><b>墨影 MOYIN © 2026</b></span>
        <span>MATERIAL · COURSE · UNDERSTAND</span>
        <a :href="withBase('/')">返回博客首页 ↗</a>
      </footer>
    </section>
  </main>
</template>
