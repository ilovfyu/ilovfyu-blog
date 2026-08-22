<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

const navLinks = [
  { label: '玩法', href: '#yiji-play' },
  { label: '下载', href: '#yiji-download' },
]

const features = [
  { icon: '♞', title: 'AI 生成每一局', desc: '地图、事件、词缀与敌人由 AI 动态生成，每一局都不重样。', tag: 'PROCEDURAL' },
  { icon: '⚔', title: '策略构筑', desc: '选择武器、技能与遗物，在随机事件中做出影响走向的决策。', tag: 'BUILD' },
  { icon: '♟', title: '会学习的对手', desc: 'AI 对手根据你的打法调整战术，越到后期越有挑战。', tag: 'ADAPTIVE' },
  { icon: '✧', title: '多线结局', desc: '每一次抉择都会导向不同的剧情与结局，值得反复挑战。', tag: 'MULTI-END' },
  { icon: '◈', title: '像素美学', desc: '精心打磨的像素画风与氛围音乐，沉浸感拉满。', tag: 'AESTHETIC' },
  { icon: '⚡', title: '手机即玩', desc: '碎片时间一局，离线也能随时开始。', tag: 'MOBILE' },
]

const platforms = [
  { name: 'iOS', note: 'App Store', icon: '' },
  { name: 'Android', note: 'APK 下载', icon: '' },
  { name: 'PC', note: 'Steam / 网页版', icon: '' },
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
      <a class="yiji-brand" :href="withBase('/yiji/')">
        <span class="yiji-brand-mark">弈</span>
        <span class="yiji-brand-name"><b>弈机</b><i>YIJI · AI ROGUELIKE</i></span>
      </a>
      <nav class="yiji-nav">
        <a v-for="link in navLinks" :key="link.label" :href="link.href" @click.prevent="scrollToId(link.href)">
          {{ link.label }}
        </a>
      </nav>
      <a class="yiji-top-cta" :href="withBase('/yiji/#yiji-download')" @click.prevent="scrollToId('#yiji-download')">立即下载 ↗</a>
    </header>

    <section class="yiji-hero">
      <div class="yiji-grid-bg" aria-hidden="true" />
      <div class="yiji-orb" aria-hidden="true" />
      <div class="yiji-hero-inner">
        <p class="yiji-eyebrow"><i /> YIJI // AI ROGUELIKE</p>
        <h1 class="yiji-title">
          每一局，<br />
          <span>都是新的棋局</span>
        </h1>
        <p class="yiji-sub">
          弈机是一款 AI 肉鸽游戏。地图、敌人与事件由 AI 实时生成，每一次踏入都是全新的挑战与故事。策略、运气与决策，铺就你的每一局棋路。
        </p>
        <div class="yiji-ctas">
          <a class="yiji-btn yiji-btn-primary" :href="withBase('/yiji/#yiji-download')" @click.prevent="scrollToId('#yiji-download')">
            免费下载 <b>↗</b>
          </a>
          <a class="yiji-btn yiji-btn-ghost" :href="withBase('/yiji/#yiji-play')" @click.prevent="scrollToId('#yiji-play')">
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
            <span>扫码下载</span>
            <small>微信 / 浏览器扫码</small>
          </div>
          <div class="yiji-platforms">
            <a v-for="platform in platforms" :key="platform.name" class="yiji-platform yiji-reveal" href="#" @click.prevent>
              <span class="yiji-platform-icon">{{ platform.name === 'iOS' ? '' : platform.name === 'Android' ? '▣' : '🖥' }}</span>
              <div><b>{{ platform.name }}</b><small>{{ platform.note }}</small></div>
              <em>↗</em>
            </a>
            <p class="yiji-version">当前版本 v1.0.0 · 支持 Android 8.0+ / iOS 14+</p>
          </div>
        </div>
      </div>
      <footer class="yiji-footer">
        <span><b>弈机 YIJI © 2026</b></span>
        <span>PLAY · BUILD · END</span>
        <a :href="withBase('/')">返回博客首页 ↗</a>
      </footer>
    </section>
  </main>
</template>
