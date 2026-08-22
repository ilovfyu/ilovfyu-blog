<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

const navLinks = [
  { label: '功能', href: '#yuliao-features' },
  { label: '下载', href: '#yuliao-download' },
]

const features = [
  { icon: '◉', title: '数字人视频陪伴', desc: '实时视频语音对话，数字人像你面前的朋友，看得见表情与回应。', tag: 'LIVE VIDEO' },
  { icon: '❋', title: '自然语音交流', desc: '说出你的烦恼，用声音表达情绪，愈语用语音和表情回应你。', tag: 'VOICE' },
  { icon: '⚿', title: '隐私安全', desc: '视频与对话内容端到端保护，你的心事只属于你。', tag: 'PRIVATE' },
  { icon: '⇄', title: '多端视频', desc: '手机、平板、电脑都能视频通话，陪伴随身带。', tag: 'SYNC' },
  { icon: '✦', title: '情绪陪伴', desc: '数字人感知语气与情绪，不只是回答，也真正接住你。', tag: 'EMOTIONAL' },
  { icon: '⚡', title: '极速响应', desc: '低延迟实时对话，像真人聊天一样自然流畅。', tag: 'LOW-LATENCY' },
]

const platforms = [
  { name: 'iOS', note: 'App Store', icon: '' },
  { name: 'Android', note: 'APK 下载', icon: '' },
  { name: 'Web', note: '浏览器即开即用', icon: '' },
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
  document.querySelectorAll('.yuliao-reveal').forEach((el) => revealObserver?.observe(el))
})

onBeforeUnmount(() => {
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  revealObserver?.disconnect()
})
</script>

<template>
  <main class="yuliao-landing">
    <div class="yuliao-progress" :style="{ width: scrollPct + '%' }" />

    <header class="yuliao-topbar">
      <a class="yuliao-brand" :href="withBase('/yuliao/')">
        <span class="yuliao-brand-mark">愈</span>
        <span class="yuliao-brand-name"><b>愈语</b><i>YULIAO · AI VIDEO COMPANION</i></span>
      </a>
      <nav class="yuliao-nav">
        <a
          v-for="link in navLinks"
          :key="link.label"
          :href="link.href"
          @click.prevent="scrollToId(link.href)"
        >
          {{ link.label }}
        </a>
      </nav>
      <a class="yuliao-top-cta" :href="withBase('/yuliao/#yuliao-download')" @click.prevent="scrollToId('#yuliao-download')">立即下载 ↗</a>
    </header>

    <section class="yuliao-hero">
      <div class="yuliao-grid-bg" aria-hidden="true" />
      <div class="yuliao-orb" aria-hidden="true" />
      <div class="yuliao-hero-inner">
        <p class="yuliao-eyebrow"><i /> YULIAO // AI VIDEO COMPANION</p>
        <h1 class="yuliao-title">
          打开视频，<br />
          <span>数字人就在你身边</span>
        </h1>
        <p class="yuliao-sub">
          愈语是一款数字人实时视频聊天应用。轻触开启视频通话，一个看得见表情、听得懂语气、愿意陪你慢慢聊的数字人就在面前——不只是助手，更像是随时都在的朋友。
        </p>
        <div class="yuliao-ctas">
          <a class="yuliao-btn yuliao-btn-primary" :href="withBase('/yuliao/#yuliao-download')" @click.prevent="scrollToId('#yuliao-download')">
            免费下载 <b>↗</b>
          </a>
          <a class="yuliao-btn yuliao-btn-ghost" :href="withBase('/yuliao/#yuliao-features')" @click.prevent="scrollToId('#yuliao-features')">
            了解功能
          </a>
        </div>
        <ul class="yuliao-hero-points">
          <li>实时视频</li>
          <li>语音对话</li>
          <li>情绪陪伴</li>
        </ul>
      </div>

      <div class="yuliao-phone-wrap yuliao-reveal">
        <div class="yuliao-phone">
          <div class="yuliao-phone-notch" />
          <div class="yuliao-video">
            <div class="yuliao-video-avatar">
              <span class="yuliao-video-face" aria-hidden="true"><i /><i /><b /></span>
            </div>
            <div class="yuliao-video-meta"><b>愈语</b><span>视频陪伴中 · 02:14</span></div>
            <span class="yuliao-video-badge">● LIVE</span>
          </div>
          <div class="yuliao-video-bar">
            <button>✕</button>
            <button>◉</button>
            <button class="mute">◍</button>
            <button>✇</button>
          </div>
          <div class="yuliao-phone-chat">
            <div class="msg msg-ai"><p>我在呢。你今晚看起来有点疲惫，是没睡好吗？慢慢说，我听着。</p></div>
            <div class="msg msg-user"><p>嗯…最近总失眠，心里乱乱的。</p></div>
            <div class="msg msg-ai"><p>辛苦了。要不要先做个深呼吸？我们试试吸气四秒，屏住四秒，慢慢呼气。</p></div>
          </div>
          <div class="yuliao-phone-input"><span>想对愈语说…</span><i>➤</i></div>
        </div>
        <span class="yuliao-chip chip-a" aria-hidden="true">LIVE VIDEO CALL</span>
        <span class="yuliao-chip chip-b" aria-hidden="true">VOICE · EMOTION</span>
        <span class="yuliao-chip chip-c" aria-hidden="true">PRIVATE · ENCRYPTED</span>
      </div>

      <div class="yuliao-hero-status">
        <span>YULIAO APP: <em>ANDROID / iOS / WEB</em></span>
        <span>MISSION: <em>WATCH · LISTEN · CARE</em></span>
        <span class="yuliao-hero-scroll">SCROLL TO EXPLORE <i>↓</i></span>
      </div>
    </section>

    <div class="yuliao-ticker">
      <div class="yuliao-ticker-track">
        <span v-for="n in 5" :key="n">数字人视频 <i>✦</i> 实时语音 <i>✦</i> 情绪陪伴 <i>✦</i> 隐私安全 <i>✦</i> 多端视频 <i>✦</i>&nbsp;</span>
      </div>
    </div>

    <section id="yuliao-features" class="yuliao-section">
      <header class="yuliao-section-head yuliao-reveal">
        <p class="yuliao-eyebrow"><i /> // 01 · CORE EXPERIENCE</p>
        <h2>不只是聊天，是陪伴</h2>
        <p class="yuliao-section-sub">愈语把对话、记忆与情绪放在一起，让每一次打开应用都像回到一个懂你的地方。</p>
      </header>
      <div class="yuliao-features">
        <article v-for="feature in features" :key="feature.title" class="yuliao-feature yuliao-reveal">
          <span class="yuliao-feature-tag">{{ feature.tag }}</span>
          <span class="yuliao-feature-icon" aria-hidden="true">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
        </article>
      </div>
    </section>

    <section id="yuliao-download" class="yuliao-download-section">
      <div class="yuliao-download yuliao-reveal">
        <header class="yuliao-download-head">
          <p class="yuliao-eyebrow"><i /> // 02 · DOWNLOAD</p>
          <h2>现在就下载愈语</h2>
          <p>在你习惯的设备上，随时打开视频，让数字人陪你说说话。</p>
        </header>
        <div class="yuliao-download-grid">
          <div class="yuliao-qr">
            <div class="yuliao-qr-code"><i v-for="n in 64" :key="n" :style="{ opacity: 0.25 + (n * 7) % 55 / 100 }" /></div>
            <span>扫码下载</span>
            <small>微信 / 浏览器扫码</small>
          </div>
          <div class="yuliao-platforms">
            <a v-for="platform in platforms" :key="platform.name" class="yuliao-platform yuliao-reveal" href="#" @click.prevent>
              <span class="yuliao-platform-icon">{{ platform.name === 'iOS' ? '' : platform.name === 'Android' ? '▣' : '◉' }}</span>
              <div><b>{{ platform.name }}</b><small>{{ platform.note }}</small></div>
              <em>↗</em>
            </a>
            <p class="yuliao-version">当前版本 v1.0.0 · 支持 Android 8.0+ / iOS 14+</p>
          </div>
        </div>
      </div>
      <footer class="yuliao-footer">
        <span><b>愈语 YULIAO © 2026</b></span>
        <span>VIDEO · LISTEN · CARE</span>
        <a :href="withBase('/')">返回博客首页 ↗</a>
      </footer>
    </section>
  </main>
</template>
