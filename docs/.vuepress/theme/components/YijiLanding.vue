<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePageData } from 'vuepress/client'
import type { ProjectMeta } from '../data/content'
const page = usePageData()
const project = computed(() => page.value.frontmatter.project as ProjectMeta)
import { withBase } from 'vuepress/client'

const navLinks = [
  { label: '玩法', href: '#yiji-play' },
  { label: '下载', href: '#yiji-download' },
]

const features = computed(() => project.value.features)

const platforms = computed(() => project.value.platforms)

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
  document.querySelector(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
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
  document.querySelectorAll('.yiji-reveal').forEach((el) => revealObserver?.observe(el))
})

onBeforeUnmount(() => {
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  revealObserver?.disconnect()
})
</script>

<template>
  <main class="yiji-landing">
    <div class="yiji-progress" :style="{ width: scrollPct + '%' }" />

    <header class="yiji-topbar">
      <a class="yiji-brand" :href="withBase(page.path)">
        <span class="yiji-brand-mark">弈</span>
        <span class="yiji-brand-name"><b>弈机</b><i>YIJI · AI ROGUELIKE</i></span>
      </a>
      <nav class="yiji-nav">
        <a v-for="link in navLinks" :key="link.label" :href="link.href" @click.prevent="scrollToId(link.href)">
          {{ link.label }}
        </a>
      </nav>
      <a class="yiji-top-cta" :href="'#yiji-download'" @click.prevent="scrollToId('#yiji-download')">立即下载 ↗</a>
    </header>

    <section class="yiji-hero">
      <div class="yiji-grid-bg" aria-hidden="true" />
      <div class="yiji-orb" aria-hidden="true" />
      <div class="yiji-hero-inner">
        <p class="yiji-eyebrow"><i /> YIJI // AI ROGUELIKE</p>
        <h1 class="yiji-title">{{ project.headline[0] }}<br /><span>{{ project.headline[1] }}</span></h1>
        <p class="yiji-sub">{{ project.intro }}</p>
        <div class="yiji-ctas">
          <a class="yiji-btn yiji-btn-primary" :href="'#yiji-download'" @click.prevent="scrollToId('#yiji-download')">
            免费下载 <b>↗</b>
          </a>
          <a class="yiji-btn yiji-btn-ghost" :href="'#yiji-play'" @click.prevent="scrollToId('#yiji-play')">
            查看玩法
          </a>
        </div>
        <ul class="yiji-hero-points">
          <li>AI 生成</li>
          <li>策略构筑</li>
          <li>多线结局</li>
        </ul>
      </div>

      <div class="yiji-board-wrap yiji-reveal">
        <div class="yiji-board">
          <div class="yiji-board-head">
            <span>YIJI // RUN 042</span>
            <i>FLOOR 07 · BOSS</i>
          </div>
          <div class="yiji-map">
            <span v-for="n in 12" :key="n" class="yiji-node" :class="{ 'is-boss': n === 12, 'is-current': n === 7, 'is-done': n < 7 }">
              <b>{{ n }}</b>
            </span>
          </div>
          <div class="yiji-battle">
            <div class="yiji-hero-card">
              <span class="yiji-sprite sprite-a" aria-hidden="true">⚔</span>
              <div><b>剑客</b><small>HP 46/52 · 盾 8</small></div>
            </div>
            <span class="yiji-vs">VS</span>
            <div class="yiji-enemy-card">
              <span class="yiji-sprite sprite-b" aria-hidden="true">☠</span>
              <div><b>雾影魔</b><small>HP 120 · 攻 14</small></div>
            </div>
          </div>
          <div class="yiji-cards">
            <span v-for="n in 3" :key="n" class="yiji-hand" :class="{ strong: n === 2 }"><b>{{ n === 1 ? '斩击' : n === 2 ? 'AI 逆转' : '防御' }}</b><small>{{ n === 1 ? '12 DMG' : n === 2 ? '反制 20%' : '+8 盾' }}</small></span>
          </div>
          <div class="yiji-hud">
            <span>GOLD 128</span><span>COMBOS ×3</span><span class="ai">AI 预测: 回避</span>
          </div>
        </div>
        <span class="yiji-chip chip-a" aria-hidden="true">RANDOM EVENT</span>
        <span class="yiji-chip chip-b" aria-hidden="true">BUILD: 流血流</span>
        <span class="yiji-chip chip-c" aria-hidden="true">AI DIRECTOR ON</span>
      </div>

      <div class="yiji-hero-status">
        <span>YIJI GAME: <em>ANDROID / iOS / PC</em></span>
        <span>MISSION: <em>EVERY RUN UNIQUE</em></span>
        <span class="yiji-hero-scroll">SCROLL TO EXPLORE <i>↓</i></span>
      </div>
    </section>

    <div class="yiji-ticker">
      <div class="yiji-ticker-track">
        <span v-for="n in 5" :key="n">AI 生成 <i>✦</i> 策略构筑 <i>✦</i> 随机事件 <i>✦</i> 多线结局 <i>✦</i> 永不过时的挑战 <i>✦</i>&nbsp;</span>
      </div>
    </div>

    <section id="yiji-play" class="yiji-section">
      <header class="yiji-section-head yiji-reveal">
        <p class="yiji-eyebrow"><i /> // 01 · HOW TO PLAY</p>
        <h2>肉鸽的尽头，是 AI 的无限可能</h2>
        <p class="yiji-section-sub">没有两局相同的弈机。AI 导演根据你的选择实时编织地图、事件与对手，让每次挑战都独一无二。</p>
      </header>
      <div class="yiji-features">
        <article v-for="feature in features" :key="feature.title" class="yiji-feature yiji-reveal">
          <span class="yiji-feature-tag">{{ feature.tag }}</span>
          <span class="yiji-feature-icon" aria-hidden="true">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
        </article>
      </div>
    </section>

    <section id="yiji-download" class="yiji-download-section">
      <div class="yiji-download yiji-reveal">
        <header class="yiji-download-head">
          <p class="yiji-eyebrow"><i /> // 02 · DOWNLOAD</p>
          <h2>现在开始你的棋局</h2>
          <p>在手机或电脑上，随时踏入一场由 AI 编织的全新冒险。</p>
        </header>
        <div class="yiji-download-grid">
          <div class="yiji-qr">
            <div class="yiji-qr-code"><i v-for="n in 64" :key="n" :style="{ opacity: 0.25 + (n * 7) % 55 / 100 }" /></div>
            <span>下载展示</span>
            <small>演示图案，不是下载二维码</small>
          </div>
          <div class="yiji-platforms">
            <a v-for="platform in platforms" :key="platform.name" class="yiji-platform yiji-reveal" :href="withBase(project.record)">
              <span class="yiji-platform-icon">{{ platform.name === 'iOS' ? '' : platform.name === 'Android' ? '▣' : '🖥' }}</span>
              <div><b>{{ platform.name }}</b><small>{{ platform.note }}</small></div>
              <em>↗</em>
            </a>
            <p class="yiji-version">产品展示演示 · 发布计划见项目记录</p>
          </div>
        </div>
      </div>
      <footer class="yiji-footer">
        <span><b>弈机 YIJI © 2026</b></span>
        <span>PLAY · BUILD · END</span>
        <a :href="withBase(project.record)">查看项目记录 ↗</a>
      </footer>
    </section>
  </main>
</template>
