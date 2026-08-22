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
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import { withBase } from 'vuepress/client'

type PlatformKind = 'sre' | 'relay'
type LinkItem = { label: string; href: string; external?: boolean }
type Feature = { icon: Component; tag: string; title: string; description: string }
type FlowStep = { code: string; title: string; description: string }
type ConsoleRow = { label: string; value: string; state: string; tone: 'cyan' | 'lime' | 'violet' | 'amber' }
type PlatformConfig = {
  kind: PlatformKind
  name: string
  eyebrow: string
  title: string
  accentTitle: string
  description: string
  appUrl: string
  docsUrl: string
  docsLabel: string
  nav: LinkItem[]
  stats: Array<{ value: string; label: string; note: string }>
  features: Feature[]
  flow: FlowStep[]
  consoleTitle: string
  consoleSubtitle: string
  consoleRows: ConsoleRow[]
  consoleFooter: string
  consoleMetric: string
  consoleMetricLabel: string
  standardEyebrow: string
  standardTitle: string
  standardDescription: string
  standards: Array<{ code: string; title: string; description: string }>
  footerLabel: string
}

const props = withDefaults(defineProps<{ kind?: PlatformKind }>(), { kind: 'sre' })

const platformConfigs: Record<PlatformKind, PlatformConfig> = {
  sre: {
    kind: 'sre',
    name: 'ILOVFYU-SRE',
    eyebrow: 'SRE INTELLIGENT OPERATIONS // INCIDENT CONTROL',
    title: '从告警开始，\n让系统更快回到稳定',
    accentTitle: '可观测、可诊断、可处置',
    description: '面向生产系统的智能运维平台，把指标、日志、链路和变更事件组织到同一条故障处理路径中。让值班工程师从噪声里找到真正重要的信号，并用有边界的动作完成恢复。',
    appUrl: 'https://sre.ilovfyu.dev',
    docsUrl: '/projects/sre-platform/',
    docsLabel: '查看项目文档',
    nav: [
      { label: '能力', href: '#platform-features' },
      { label: '闭环', href: '#platform-flow' },
      { label: '项目文档', href: '/projects/sre-platform/' },
    ],
    stats: [
      { value: '4', label: '核心信号', note: '指标 · 日志 · 链路 · 变更' },
      { value: '5', label: '处置阶段', note: '发现 · 关联 · 诊断 · 恢复 · 复盘' },
      { value: '1', label: '故障上下文', note: '围绕事件聚合相关证据' },
      { value: '24/7', label: '值守节奏', note: '保持系统状态持续可见' },
    ],
    features: [
      { icon: Activity, tag: 'OBSERVE', title: '统一观测', description: '接入指标、日志、调用链和发布事件，把分散在不同工具里的系统状态放进同一张运行图。' },
      { icon: GitBranch, tag: 'CORRELATE', title: '告警关联', description: '按服务、时间、拓扑和变更上下文收敛告警，减少重复通知，让真正的根因更早浮现。' },
      { icon: Bot, tag: 'DIAGNOSE', title: '智能诊断', description: '用可解释的证据链辅助定位异常，给出影响范围、可能原因和下一步排查路径。' },
      { icon: Zap, tag: 'RESPOND', title: '有边界处置', description: '把 Runbook、回滚和扩容动作纳入权限、审批与超时控制，自动化速度不牺牲操作安全。' },
      { icon: ShieldCheck, tag: 'AUDIT', title: '变更可审计', description: '记录谁在什么时间基于什么依据执行了什么动作，故障处理过程可以复盘，也可以改进。' },
      { icon: CircleGauge, tag: 'IMPROVE', title: '容量与成本', description: '从历史负载、资源水位和故障趋势中识别容量风险，为扩容和架构调整提供依据。' },
    ],
    flow: [
      { code: '01', title: '接入信号', description: '收集指标、日志、链路与变更事件，形成统一的系统观测面。' },
      { code: '02', title: '关联事件', description: '结合服务拓扑和时间窗口合并相关告警，建立单一事件上下文。' },
      { code: '03', title: '辅助诊断', description: '沿着证据链检查影响范围、异常变化和近期发布，缩小排查范围。' },
      { code: '04', title: '执行处置', description: '调用经过授权的 Runbook，完成回滚、扩容或服务切换。' },
      { code: '05', title: '复盘改进', description: '沉淀时间线、决策和结果，让下一次相似事件更早被识别。' },
    ],
    consoleTitle: 'INCIDENT CONTROL ROOM',
    consoleSubtitle: 'PRODUCTION / EAST-1',
    consoleRows: [
      { label: 'EVENT', value: 'api.latency.p95', state: 'P1 / OPEN', tone: 'amber' },
      { label: 'SCOPE', value: 'checkout-service → payment', state: '3 SERVICES', tone: 'violet' },
      { label: 'SIGNAL', value: 'deploy-2026.08.08.03', state: 'CORRELATED', tone: 'cyan' },
      { label: 'ACTION', value: 'rollback / guarded', state: 'APPROVAL READY', tone: 'lime' },
    ],
    consoleFooter: 'TRACE 7f3a / LAST UPDATE 12s AGO',
    consoleMetric: '04:12',
    consoleMetricLabel: 'INCIDENT AGE',
    standardEyebrow: '// 03 · OPERATING PRINCIPLES',
    standardTitle: '把自动化放在正确的边界内',
    standardDescription: '稳定性不是把所有操作都交给机器，而是让信号、判断、动作和责任都清楚地连接起来。',
    standards: [
      { code: '01 / SIGNAL FIRST', title: '先看证据', description: '告警必须能回到指标、日志、链路或变更，诊断结果必须保留依据。' },
      { code: '02 / GUARDED ACTION', title: '动作有边界', description: '高风险操作经过权限与审批，自动化拥有超时、回退和停止条件。' },
      { code: '03 / LEARN LOOP', title: '复盘可复用', description: '每次事件都沉淀为新的规则、Runbook 或观测改进，持续降低重复故障。' },
    ],
    footerLabel: 'ILOVFYU-SRE © 2026',
  },
  relay: {
    kind: 'relay',
    name: 'ILOVFYU-TOKEN RELAY',
    eyebrow: 'MODEL TOKEN RELAY // CONTROLLED AI TRAFFIC',
    title: '让每一次模型调用，\n都有清晰的边界',
    accentTitle: '统一、可控、可审计',
    description: '面向模型调用的 Token 中转网关，为应用提供稳定的 OpenAI 兼容接口，同时把模型白名单、供应商路由、额度控制和密钥安全留在服务端。',
    appUrl: 'https://relay.ilovfyu.dev',
    docsUrl: '/projects/relay-service/',
    docsLabel: '查看接口契约',
    nav: [
      { label: '能力', href: '#platform-features' },
      { label: '请求链路', href: '#platform-flow' },
      { label: '接口契约', href: '/projects/relay-service/' },
    ],
    stats: [
      { value: '1', label: '统一入口', note: 'OpenAI 兼容请求接口' },
      { value: 'SSE', label: '流式响应', note: '保持生成体验与连接控制' },
      { value: 'N', label: '模型路由', note: '白名单与供应商策略' },
      { value: '0', label: '前端密钥', note: '供应商 Secret 永不下发' },
    ],
    features: [
      { icon: Terminal, tag: 'COMPATIBLE', title: '统一 API', description: '用熟悉的 OpenAI 兼容协议接入应用，减少不同供应商 SDK、错误格式和流式实现带来的适配成本。' },
      { icon: Route, tag: 'ROUTING', title: '模型路由', description: '模型选择、供应商地址和可用范围由服务端配置，客户端不能提交任意 provider 或上游 URL。' },
      { icon: RadioTower, tag: 'STREAMING', title: 'SSE 流式', description: '标准化流式输出、超时、断流和供应商错误，让上游变化不直接暴露给业务前端。' },
      { icon: SlidersHorizontal, tag: 'LIMITS', title: '额度控制', description: '按 IP、用户、模型和全局预算控制请求频率、并发、输出 Token 与每日消耗。' },
      { icon: LockKeyhole, tag: 'SECRETS', title: '密钥隔离', description: '供应商 API Key 只存在服务端密钥管理中，不进入浏览器、前端 bundle 或普通业务日志。' },
      { icon: ShieldCheck, tag: 'AUDIT', title: '调用审计', description: '记录 request ID、模型、耗时、状态码、Token 用量和限流结果，成本与异常流量有迹可循。' },
    ],
    flow: [
      { code: '01', title: '应用请求', description: '业务应用使用统一的模型接口提交经过约束的对话请求。' },
      { code: '02', title: '身份校验', description: '验证会话、来源和请求结构，拒绝未知字段、超大请求与未授权模型。' },
      { code: '03', title: '策略路由', description: '按照模型白名单、供应商健康度和预算策略选择上游。' },
      { code: '04', title: '流式转发', description: '以统一的 SSE 格式传递结果，隔离上游错误、密钥和内部地址。' },
      { code: '05', title: '记录用量', description: '沉淀耗时、状态、Token 与限流结果，为成本和容量管理提供数据。' },
    ],
    consoleTitle: 'TOKEN ROUTING GATEWAY',
    consoleSubtitle: 'OPENAI COMPATIBLE / SSE',
    consoleRows: [
      { label: 'REQUEST', value: 'POST /v1/chat/completions', state: 'AUTHORIZED', tone: 'lime' },
      { label: 'MODEL', value: 'router → provider-a', state: 'ALLOWLISTED', tone: 'violet' },
      { label: 'STREAM', value: 'text/event-stream', state: 'CONNECTED', tone: 'cyan' },
      { label: 'BUDGET', value: 'daily / project / model', state: 'WITHIN LIMIT', tone: 'amber' },
    ],
    consoleFooter: 'REQUEST 9a21 / 1,284 TOKENS / 842ms',
    consoleMetric: '842ms',
    consoleMetricLabel: 'UPSTREAM LATENCY',
    standardEyebrow: '// 03 · GATEWAY CONTRACT',
    standardTitle: '把供应商复杂度留在网关之后',
    standardDescription: '应用只需要理解稳定的接口契约，路由、密钥、预算与故障转换由中转站负责。',
    standards: [
      { code: '01 / FIXED SURFACE', title: '入口固定', description: '只暴露明确的 API 路径和请求字段，不接受客户端传入任意上游地址。' },
      { code: '02 / SERVER SECRETS', title: '密钥留在服务端', description: '浏览器拿不到供应商 Secret，日志和错误响应也不携带敏感凭据。' },
      { code: '03 / BOUNDED COST', title: '消耗可控制', description: '请求、并发、输出 Token 与每日预算都有上限，异常消耗可以快速止损。' },
    ],
    footerLabel: 'ILOVFYU-TOKEN RELAY © 2026',
  },
}

const landing = computed(() => platformConfigs[props.kind])
const scrollPct = ref(0)
let scrollRaf = 0
let revealObserver: IntersectionObserver | null = null

function scrollToId(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleNavClick(event: MouseEvent, link: LinkItem) {
  if (!link.href.startsWith('#')) return
  event.preventDefault()
  scrollToId(link.href)
}

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollPct.value = max > 0 ? (scrollY / max) * 100 : 0
    scrollRaf = 0
  })
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
  document.querySelectorAll('.platform-reveal').forEach((el) => revealObserver?.observe(el))
})

onBeforeUnmount(() => {
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  revealObserver?.disconnect()
})
</script>

<template>
  <main class="platform-landing" :class="`platform-landing-${landing.kind}`">
    <div class="platform-progress" :style="{ width: scrollPct + '%' }" />

    <header class="platform-topbar">
      <a class="platform-brand" :href="withBase(landing.kind === 'sre' ? '/sre/' : '/relay/')" target="_blank" rel="noopener noreferrer">
        <span class="platform-brand-mark"><component :is="landing.kind === 'sre' ? ServerCog : Network" /></span>
        <span class="platform-brand-name"><b>{{ landing.name }}</b><i>{{ landing.kind === 'sre' ? 'INTELLIGENT OPERATIONS' : 'MODEL TOKEN GATEWAY' }}</i></span>
      </a>
      <nav class="platform-nav">
        <a
          v-for="link in landing.nav"
          :key="link.label"
          :href="link.external ? link.href : link.href.startsWith('#') ? undefined : withBase(link.href)"
          :target="link.external || !link.href.startsWith('#') ? '_blank' : undefined"
          :rel="link.external || !link.href.startsWith('#') ? 'noopener noreferrer' : undefined"
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
