<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase, usePageData } from 'vuepress/client'
import type { ProjectMeta } from '../data/content'
const page = usePageData()
const project = computed(() => page.value.frontmatter.project as ProjectMeta)

const PLATFORM_URL = computed(() => withBase(project.value.record))

const navLinks = [
  { label: '功能', href: '#features' },
  { label: '工作流', href: '#workflow' },
]

const stats = computed(() => project.value.landing.stats)

const features = computed(() => project.value.features)

const workflow = computed(() => project.value.flow.map(f => ({ ...f, step: f.code })))

const deliveryStandards = computed(() => project.value.landing.standards)

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
  document.querySelectorAll('.annotate-reveal').forEach((el) => revealObserver?.observe(el))
})

onBeforeUnmount(() => {
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  revealObserver?.disconnect()
})
</script>

<template>
  <main class="annotate-landing">
    <div class="annotate-progress" :style="{ width: scrollPct + '%' }" />

    <header class="annotate-topbar">
      <a class="annotate-brand" :href="withBase(page.path)" target="_blank" rel="noopener noreferrer">
        <span class="annotate-brand-mark">T</span>
        <span class="annotate-brand-name"><b>ILOVFYU-TAGFINDER</b><i>DATA ANNOTATION PLATFORM</i></span>
      </a>
      <nav class="annotate-nav">
        <a
          v-for="link in navLinks"
          :key="link.label"
          :href="link.href"
          :target="link.href.startsWith('#') ? undefined : '_blank'"
          :rel="link.href.startsWith('#') ? undefined : 'noopener noreferrer'"
          @click.prevent="link.href.startsWith('#') && scrollToId(link.href)"
        >
          {{ link.label }}
        </a>
      </nav>
      <a class="annotate-top-cta" :href="PLATFORM_URL" target="_blank" rel="noopener noreferrer">进入平台 ↗</a>
    </header>

    <section class="annotate-hero">
      <div class="annotate-grid-bg" aria-hidden="true" />
      <div class="annotate-orb" aria-hidden="true" />
      <div class="annotate-hero-inner">
        <p class="annotate-eyebrow"><i /> ILOVFYU-TAGFINDER // AI TRAINING DATA</p>
        <h1 class="annotate-title">{{ project.headline[0] }}<br /><span>{{ project.headline[1] }}</span></h1>
        <p class="annotate-sub">{{ project.intro }}</p>
        <div class="annotate-ctas">
          <a class="annotate-btn annotate-btn-primary" :href="PLATFORM_URL" target="_blank" rel="noopener noreferrer">
            进入标注平台 <b>↗</b>
          </a>
          <a class="annotate-btn annotate-btn-ghost" :href="withBase(project.record)" target="_blank" rel="noopener noreferrer">
            查看项目文档
          </a>
        </div>
        <ul class="annotate-hero-points">
          <li>数据管理</li>
          <li>智能标注</li>
          <li>质量审核</li>
          <li>团队协作</li>
        </ul>
      </div>
      <div class="annotate-console-wrap annotate-reveal">
        <div class="annotate-console">
          <div class="annotate-console-head">
            <span>ANNOTATE / WORKBENCH</span><i class="annotate-live">● LIVE</i>
          </div>
          <div class="annotate-console-body">
            <div class="annotate-console-row"><span>DATASET</span><code>autonomous-driving-v3</code><b>1,284 IMAGES</b></div>
            <div class="annotate-console-row"><span>MODE</span><code>smart-assisted</code><b>PRE-LABEL 82%</b></div>
            <div class="annotate-console-row"><span>QUALITY</span><code>review-pass</code><b>98.6%</b></div>
            <div class="annotate-console-progress"><i v-for="n in 40" :key="n" :style="{ animationDelay: `${n * 0.07}s` }" /></div>
          </div>
        </div>
        <span class="annotate-bbox" aria-hidden="true"><i /><i /><i /><i /></span>
        <span class="annotate-chip chip-a" aria-hidden="true">CLASS: VEHICLE</span>
        <span class="annotate-chip chip-b" aria-hidden="true">BOUNDING BOX</span>
        <span class="annotate-chip chip-c" aria-hidden="true">QA: PASSED</span>
      </div>
      <div class="annotate-hero-status">
        <span>PLATFORM: <em>{{ PLATFORM_URL.replace('http://', '') }}</em></span>
        <span>DATA PIPELINE: <em>IMPORT → LABEL → REVIEW → EXPORT</em></span>
        <span class="annotate-hero-scroll">SCROLL TO EXPLORE <i>↓</i></span>
      </div>
    </section>

    <div class="annotate-ticker">
      <div class="annotate-ticker-track">
        <span v-for="n in 6" :key="n">DATA MANAGEMENT <i>✦</i> SMART LABELING <i>✦</i> QUALITY REVIEW <i>✦</i> TEAM COLLABORATION <i>✦</i> SECURE EXPORT <i>✦</i>&nbsp;</span>
      </div>
    </div>

    <section id="stats" class="annotate-section">
      <div class="annotate-stats annotate-reveal">
        <div v-for="stat in stats" :key="stat.label" class="annotate-stat">
          <b>{{ stat.value }}</b>
          <span>{{ stat.label }}</span>
          <p>{{ stat.note }}</p>
        </div>
      </div>
    </section>

    <section id="features" class="annotate-section">
      <header class="annotate-section-head annotate-reveal">
        <p class="annotate-eyebrow"><i /> // 01 · CORE CAPABILITIES</p>
        <h2>平台核心能力</h2>
        <p class="annotate-section-sub">从数据进入到数据交付，把标注流程的每个环节都做成清晰、可管理的模块。</p>
      </header>
      <div class="annotate-features">
        <a
          v-for="feature in features"
          :key="feature.title"
          class="annotate-feature annotate-reveal"
          :href="PLATFORM_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="annotate-feature-tag">{{ feature.tag }}</span>
          <span class="annotate-feature-icon" aria-hidden="true">{{ feature.icon }}</span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
          <span class="annotate-feature-link">OPEN IN PLATFORM <b>↗</b></span>
        </a>
      </div>
    </section>

    <section id="workflow" class="annotate-section">
      <header class="annotate-section-head annotate-reveal">
        <p class="annotate-eyebrow"><i /> // 02 · DATA PIPELINE</p>
        <h2>完整标注工作流</h2>
        <p class="annotate-section-sub">五步闭环，从原始数据到可直接投入训练的标准数据集。</p>
      </header>
      <ol class="annotate-workflow annotate-reveal">
        <li v-for="item in workflow" :key="item.step">
          <span class="annotate-workflow-num">{{ item.step }}</span>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>
          <i aria-hidden="true">→</i>
        </li>
      </ol>
    </section>

    <section class="annotate-delivery-section">
      <div class="annotate-delivery annotate-reveal">
        <header class="annotate-delivery-head">
          <p class="annotate-eyebrow"><i /> // 03 · DELIVERY STANDARD</p>
          <h2>一份数据集，必须经得起训练</h2>
          <p>ILOVFYU-TAGFINDER 以一致、可追溯、可接入为交付标准，让标注结果真正进入模型生产流程。</p>
        </header>
        <dl class="annotate-delivery-grid">
          <div v-for="item in deliveryStandards" :key="item.code">
            <dt>{{ item.code }}</dt>
            <dd><strong>{{ item.title }}</strong><span>{{ item.desc }}</span></dd>
          </div>
        </dl>
      </div>
      <footer class="annotate-footer">
        <span><b>ILOVFYU-TAGFINDER © 2026</b></span>
        <span>DATA · LABEL · REVIEW · DELIVER</span>
        <a :href="withBase('/')" target="_blank" rel="noopener noreferrer">返回博客首页 ↗</a>
      </footer>
    </section>
  </main>
</template>
