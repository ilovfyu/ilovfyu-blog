<script setup lang="ts">
import {
  Activity,
  ArrowUpRight,
  Bot,
  Check,
  CircleGauge,
  GitBranch,
  LockKeyhole,
  Network,
  RadioTower,
  Route,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Zap,
} from '@lucide/vue'
import { computed, type Component } from 'vue'
import { withBase, usePageData } from 'vuepress/client'
import type { ProjectMeta } from '../data/content'
import { useLandingEffects } from '../utils/use-landing-effects'
const page = usePageData()
const project = computed(() => page.value.frontmatter.project as ProjectMeta)

type LinkItem = { label: string; href: string }

const icons: Record<string, Component> = { Activity, ArrowUpRight, Bot, Check, CircleGauge, GitBranch, LockKeyhole, Network, RadioTower, Route, ServerCog, ShieldCheck, SlidersHorizontal, Terminal, Zap }
const landing = computed(() => ({ ...project.value.landing,
 features: project.value.features.map(f => ({ ...f, description: f.desc, icon: icons[f.icon] || Activity })),
 flow: project.value.flow.map(f => ({ ...f, description: f.desc })),
 nav: [{ label: '能力', href: '#platform-features' }, { label: '工作流', href: '#platform-flow' }, { label: '项目文档', href: project.value.record }],
 docsUrl: project.value.record, appUrl: withBase(project.value.record),
}))
const { scrollPct, scrollToId } = useLandingEffects('.platform-reveal')

function handleNavClick(event: MouseEvent, link: LinkItem) {
  if (!link.href.startsWith('#') || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  scrollToId(link.href)
}
</script>

<template>
  <main class="platform-landing" :class="`platform-landing-${landing.kind}`">
    <div class="platform-progress" :style="{ width: scrollPct + '%' }" />

    <header class="platform-topbar">
      <a class="platform-brand" :href="withBase(page.path)" target="_blank" rel="noopener noreferrer">
        <span class="platform-brand-mark"><component :is="landing.kind === 'sre' ? ServerCog : Network" /></span>
        <span class="platform-brand-name"><b>{{ landing.name }}</b><i>{{ landing.kind === 'sre' ? 'INTELLIGENT OPERATIONS' : 'MODEL TOKEN GATEWAY' }}</i></span>
      </a>
      <nav class="platform-nav">
        <a
          v-for="link in landing.nav"
          :key="link.label"
          :href="link.href.startsWith('#') ? link.href : withBase(link.href)"
          :target="!link.href.startsWith('#') ? '_blank' : undefined"
          :rel="!link.href.startsWith('#') ? 'noopener noreferrer' : undefined"
          @click="handleNavClick($event, link)"
        >
          {{ link.label }}
        </a>
      </nav>
      <a class="platform-top-cta" :href="landing.appUrl" target="_blank" rel="noopener noreferrer">进入平台 <ArrowUpRight /></a>
    </header>

    <section class="platform-hero">
      <div class="platform-grid-bg" aria-hidden="true" />
      <div class="platform-hero-glow" aria-hidden="true" />
      <div class="platform-stage" aria-hidden="true">
        <template v-if="landing.kind === 'sre'">
          <span class="platform-radar">
            <i class="platform-radar-ring" /><i class="platform-radar-ring" /><i class="platform-radar-ring" />
            <b class="platform-radar-sweep" />
            <em class="platform-blip" /><em class="platform-blip" /><em class="platform-blip" />
          </span>
        </template>
        <template v-else>
          <span class="platform-wire" />
          <i v-for="n in 16" :key="n" class="platform-packet" :style="{ animationDelay: `${n * 0.18}s` }" />
        </template>
      </div>
      <div class="platform-hero-inner">
        <div class="platform-hero-copy">
          <p class="platform-eyebrow"><i /> {{ landing.eyebrow }}</p>
          <h1 class="platform-title">{{ landing.title }}<br /><span>{{ landing.accentTitle }}</span></h1>
          <p class="platform-description">{{ landing.description }}</p>
          <div class="platform-hero-actions">
            <a class="platform-btn platform-btn-primary" :href="landing.appUrl" target="_blank" rel="noopener noreferrer">打开平台 <ArrowUpRight /></a>
            <a class="platform-btn platform-btn-ghost" :href="withBase(landing.docsUrl)" target="_blank" rel="noopener noreferrer">{{ landing.docsLabel }} <ArrowUpRight /></a>
          </div>
          <ul class="platform-proof-points">
            <li v-for="item in landing.kind === 'sre' ? ['信号归一', '处置有界', '变更留痕'] : ['兼容 OpenAI', '密钥不出端', '预算可控']" :key="item"><Check /> {{ item }}</li>
          </ul>
        </div>

        <div class="platform-console platform-reveal">
          <div class="platform-console-head"><span>{{ landing.consoleTitle }}</span><i>● LIVE</i></div>
          <div class="platform-console-meta"><span>{{ landing.consoleSubtitle }}</span><span>{{ landing.kind === 'sre' ? 'CONTROL PLANE' : 'EDGE GATEWAY' }}</span></div>
          <div class="platform-console-rows">
            <div v-for="row in landing.consoleRows" :key="row.label" class="platform-console-row">
              <span>{{ row.label }}</span><code>{{ row.value }}</code><b :class="`tone-${row.tone}`">{{ row.state }}</b>
            </div>
          </div>
          <div class="platform-console-chart" aria-hidden="true"><i v-for="n in 34" :key="n" :style="{ animationDelay: `${n * 0.07}s`, height: `${18 + (n * 17) % 48}%` }" /></div>
          <div class="platform-console-footer"><span>{{ landing.consoleFooter }}</span><strong>{{ landing.consoleMetric }} <small>{{ landing.consoleMetricLabel }}</small></strong></div>
        </div>
      </div>
      <div class="platform-hero-status">
        <span>SERVICE: <em>{{ landing.appUrl.replace('https://', '') }}</em></span>
        <span>CONTROL LOOP: <em>{{ landing.kind === 'sre' ? 'OBSERVE → DIAGNOSE → RESPOND → LEARN' : 'AUTH → ROUTE → STREAM → AUDIT' }}</em></span>
        <span class="platform-hero-scroll">SCROLL TO EXPLORE <i>↓</i></span>
      </div>
    </section>

    <div class="platform-ticker"><div class="platform-ticker-track"><span v-for="n in 5" :key="n">{{ landing.kind === 'sre' ? 'OBSERVE' : 'UNIFIED API' }} <i>✦</i> {{ landing.kind === 'sre' ? 'CORRELATE' : 'MODEL ROUTING' }} <i>✦</i> {{ landing.kind === 'sre' ? 'DIAGNOSE' : 'TOKEN CONTROL' }} <i>✦</i> {{ landing.kind === 'sre' ? 'RESPOND' : 'SSE STREAMING' }} <i>✦</i> {{ landing.kind === 'sre' ? 'LEARN' : 'AUDIT TRAIL' }} <i>✦</i>&nbsp;</span></div></div>

    <section class="platform-section platform-stats-section">
      <div class="platform-stats platform-reveal">
        <div v-for="stat in landing.stats" :key="stat.label" class="platform-stat"><b>{{ stat.value }}</b><span>{{ stat.label }}</span><p>{{ stat.note }}</p></div>
      </div>
    </section>

    <section id="platform-features" class="platform-section">
      <header class="platform-section-head platform-reveal"><p class="platform-eyebrow"><i /> // 01 · CORE CAPABILITIES</p><h2>{{ landing.kind === 'sre' ? '稳定性，需要一条完整链路' : '模型调用，需要一个控制面' }}</h2><p>{{ landing.kind === 'sre' ? '把告警、上下文、动作和复盘连接起来，让运维从被动响应走向持续改进。' : '让应用面对稳定的接口契约，把供应商、密钥、限流和预算留在服务端。' }}</p></header>
      <div class="platform-features">
        <a v-for="feature in landing.features" :key="feature.title" class="platform-feature platform-reveal" :href="landing.appUrl" target="_blank" rel="noopener noreferrer"><span class="platform-feature-tag">{{ feature.tag }}</span><span class="platform-feature-icon"><component :is="feature.icon" /></span><h3>{{ feature.title }}</h3><p>{{ feature.description }}</p><span class="platform-feature-link">OPEN IN PLATFORM <ArrowUpRight /></span></a>
      </div>
    </section>

    <section id="platform-flow" class="platform-section">
      <header class="platform-section-head platform-reveal"><p class="platform-eyebrow"><i /> // 02 · {{ landing.kind === 'sre' ? 'INCIDENT LOOP' : 'REQUEST PATH' }}</p><h2>{{ landing.kind === 'sre' ? '从异常到复盘的运维闭环' : '从应用到模型的请求链路' }}</h2><p>{{ landing.kind === 'sre' ? '每个阶段都保留上下文与边界，工程师能知道系统发生了什么，也知道下一步应该做什么。' : '每个请求都经过明确的身份、策略、路由和审计边界，供应商差异不会扩散到业务代码。' }}</p></header>
      <ol class="platform-flow platform-reveal"><li v-for="(step, index) in landing.flow" :key="step.code"><span>{{ step.code }}</span><div><h3>{{ step.title }}</h3><p>{{ step.description }}</p></div><i v-if="index < landing.flow.length - 1"><ArrowUpRight /></i></li></ol>
    </section>

    <section class="platform-standard-section">
      <div class="platform-standard platform-reveal">
        <header class="platform-standard-head"><p class="platform-eyebrow"><i /> {{ landing.standardEyebrow }}</p><h2>{{ landing.standardTitle }}</h2><p>{{ landing.standardDescription }}</p></header>
        <dl class="platform-standard-grid"><div v-for="item in landing.standards" :key="item.code"><dt>{{ item.code }}</dt><dd><strong>{{ item.title }}</strong><span>{{ item.description }}</span></dd></div></dl>
      </div>
      <footer class="platform-footer"><span><b>{{ landing.footerLabel }}</b></span><span>{{ landing.kind === 'sre' ? 'SIGNAL · SYSTEM · STABILITY' : 'MODEL · ROUTE · CONTROL' }}</span><a :href="withBase('/')" target="_blank" rel="noopener noreferrer">返回博客首页 <ArrowUpRight /></a></footer>
    </section>
  </main>
</template>
