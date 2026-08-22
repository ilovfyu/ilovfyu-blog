<script setup lang="ts">
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  CircleDot,
  Clock,
  CodeXml,
  Copy,
  GitFork,
  Mail,
  MapPin,
  TerminalSquare,
  Wrench,
} from '@lucide/vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'

const workingNotes = [
  { icon: Braces, title: '先把问题想清楚', text: '比起立刻给出方案，我更愿意先确认真实目标、已有约束，以及失败最可能发生在哪里。' },
  { icon: TerminalSquare, title: '做小而完整的实现', text: '先让核心链路真实可用，再通过数据、反馈和复盘决定下一步，而不是预先堆叠复杂度。' },
  { icon: CodeXml, title: '把过程写下来', text: '写作迫使模糊直觉变成清楚判断，也让一次解决问题的经历有机会被再次使用。' },
]

const hobbies = [
  { icon: BookOpen, title: '阅读与摘录', text: '偏爱技术史、产品、人物传记和长篇访谈。读到值得回看的段落，会整理进自己的笔记。' },
  { icon: MapPin, title: '城市漫步', text: '没有明确目的地地走一段路，观察街道、店铺和人，是我从屏幕里抽离的方式。' },
  { icon: CircleDot, title: '影像与音乐', text: '收藏有明确作者气质的电影、纪录片和专辑，也喜欢从中寻找表达与节奏的灵感。' },
  { icon: Wrench, title: '做点小东西', text: '偶尔写工具、搭服务或做一个小产品。它不一定宏大，但最好能解决一个真实的小问题。' },
]

const collections = [
  { title: '日常工作台', items: ['Obsidian', 'VS Code', 'Raycast', 'GitHub'] },
  { title: '长期阅读', items: ['Hacker News', '少数派', 'The Pragmatic Engineer', 'GitHub Trending'] },
  { title: '偏爱的内容', items: ['工程复盘', '独立产品日志', '长篇访谈', '城市观察'] },
]

const recentNotes = [
  {
    code: 'BUILDING',
    title: '把想法变成现实的 7 个夜晚',
    summary: '一次从原型、取舍到发布的独立构建记录。',
    path: '/posts/seven-nights/',
  },
  {
    code: 'THINKING',
    title: '当屏幕消失之后，我们还剩下什么？',
    summary: '关于界面、注意力，以及技术退到环境之后人的主动选择。',
    path: '/posts/screenless-era/',
  },
  {
    code: 'LIFE',
    title: '在城市边缘，寻找一点留白',
    summary: '暂时离开通知和信息流，让注意力重新恢复完整。',
    path: '/posts/edge-of-city/',
  },
]

const sections = [
  { id: 'story', index: '01', label: '简介' },
  { id: 'hobbies', index: '02', label: '兴趣' },
  { id: 'collections', index: '03', label: '收藏' },
  { id: 'reading', index: '04', label: '文章' },
  { id: 'contact', index: '05', label: '联系' },
]

const stats = [
  { value: 9, suffix: '', label: '随笔文章', hint: 'posts' },
  { value: 20, suffix: '', label: '独立项目', hint: 'projects' },
  { value: 65, suffix: '', label: '专题笔记', hint: 'specials' },
  { value: 4, suffix: '', label: '专题方向', hint: 'tracks' },
]

const marqueeItems = [
  'AI 系统',
  '前端体验',
  '工程架构',
  '技术写作',
  '独立构建',
  '产品思考',
  '阅读摘录',
  '城市观察',
]

const roles = [
  '开发者，也是一名持续写作的人。',
  '在深圳做软件，关注 AI 与前端体验。',
  '把想法变成可运行的东西。',
  '用代码验证想法，用文字留下过程。',
]

const scrollPct = ref(0)
const activeSection = ref('story')
const navVisible = ref(false)
const roleText = ref(roles[0] ?? '')
const localTime = ref('')
const statsValues = ref(stats.map(() => 0))
const copied = ref(false)

let scrollRaf = 0
let navStickyOffset = 120
let revealObserver: IntersectionObserver | null = null
let statsObserver: IntersectionObserver | null = null
let clockTimer: number | undefined
let roleTimer: number | undefined
let copyTimer: number | undefined

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function computeStickyOffset() {
  const themeNavHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height')) || 64
  const isDesktop = window.matchMedia('(min-width: 960px)').matches
  navStickyOffset = (isDesktop ? themeNavHeight : 0) + 60
}

function computeActiveSection() {
  const firstBand = document.getElementById('story')
  navVisible.value = firstBand ? firstBand.getBoundingClientRect().top <= navStickyOffset + 4 : false

  let current = sections[0].id
  for (const section of sections) {
    const el = document.getElementById(section.id)
    if (el && el.getBoundingClientRect().top <= navStickyOffset) current = section.id
  }
  // 接近页面底部时，将最后一个章节锁定为当前项
  if (innerHeight + Math.ceil(scrollY) >= document.documentElement.scrollHeight - 8) {
    current = sections[sections.length - 1].id
  }
  activeSection.value = current
}

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    const max = document.documentElement.scrollHeight - innerHeight
    scrollPct.value = max > 0 ? (scrollY / max) * 100 : 0
    computeActiveSection()
    scrollRaf = 0
  })
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const behavior = reducedMotion ? 'auto' : 'smooth'
  el.scrollIntoView({ behavior, block: 'start' })
}

/* 打字机角色标题 */
const roleIndex = ref(0)
const rolePhase = ref<'typing' | 'pausing' | 'deleting'>('typing')

function typeRole() {
  const full = roles[roleIndex.value] ?? roles[0]
  const current = roleText.value
  if (rolePhase.value === 'typing') {
    if (current.length < full.length) {
      roleText.value = full.slice(0, current.length + 1)
      roleTimer = window.setTimeout(typeRole, 58)
    }
    else {
      rolePhase.value = 'pausing'
      roleTimer = window.setTimeout(typeRole, 2100)
    }
  }
  else if (rolePhase.value === 'pausing') {
    rolePhase.value = 'deleting'
    roleTimer = window.setTimeout(typeRole, 60)
  }
  else {
    if (current.length > 0) {
      roleText.value = current.slice(0, -1)
      roleTimer = window.setTimeout(typeRole, 26)
    }
    else {
      rolePhase.value = 'typing'
      roleIndex.value = (roleIndex.value + 1) % roles.length
      roleTimer = window.setTimeout(typeRole, 380)
    }
  }
}

/* 实时时钟 */
function updateClock() {
  localTime.value = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(new Date())
}

/* 数据统计数字滚动 */
function animateStats() {
  const duration = 1400
  const start = performance.now()
  function tick(now: number) {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - (1 - t) ** 3
    statsValues.value = stats.map(s => Math.round(s.value * eased))
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/* 卡片鼠标聚光灯 */
function onCardMove(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--my', `${e.clientY - rect.top}px`)
}

/* 头像 3D 倾斜 */
function onPortraitMove(e: MouseEvent) {
  if (reducedMotion) return
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width - 0.5
  const py = (e.clientY - rect.top) / rect.height - 0.5
  el.style.setProperty('--rx', `${(-py * 8).toFixed(2)}deg`)
  el.style.setProperty('--ry', `${(px * 12).toFixed(2)}deg`)
}

function onPortraitLeave(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
}

/* 复制邮箱 */
async function copyEmail() {
  try {
    await navigator.clipboard.writeText('hello@ilovfyu.dev')
    copied.value = true
    if (copyTimer) window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => { copied.value = false }, 2200)
  }
  catch {
    window.location.href = 'mailto:hello@ilovfyu.dev'
  }
}

onMounted(() => {
  document.body.classList.add('about-active')
  computeStickyOffset()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', computeStickyOffset, { passive: true })

  if (reducedMotion) {
    roleText.value = roles[0]
  }
  else {
    roleText.value = ''
    roleTimer = window.setTimeout(typeRole, 350)
  }

  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)

  nextTick(() => {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('in')
        revealObserver?.unobserve(entry.target)
      })
    }, { threshold: 0.1 })
    document.querySelectorAll('.profile-reveal').forEach((element) => {
      const rect = element.getBoundingClientRect()
      if (rect.top < innerHeight * 1.15) element.classList.add('in')
      else revealObserver?.observe(element)
    })

    const statsEl = document.getElementById('stats')
    if (statsEl) {
      statsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          animateStats()
          statsObserver?.disconnect()
        })
      }, { threshold: 0.3 })
      statsObserver.observe(statsEl)
    }
  })
})

onBeforeUnmount(() => {
  document.body.classList.remove('about-active')
  cancelAnimationFrame(scrollRaf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', computeStickyOffset)
  revealObserver?.disconnect()
  statsObserver?.disconnect()
  if (clockTimer) window.clearInterval(clockTimer)
  if (roleTimer) window.clearTimeout(roleTimer)
  if (copyTimer) window.clearTimeout(copyTimer)
})
</script>

<template>
  <main class="profile-page">
    <div class="profile-progress" :style="{ transform: `scaleX(${scrollPct / 100})` }" />

    <section class="profile-hero">
      <div class="profile-hero-lines" aria-hidden="true"><i /><i /><span /></div>
      <div class="profile-hero-inner">
        <div class="profile-intro profile-reveal">
          <p class="profile-kicker"><CircleDot /> 关于博主</p>
          <h1>ILOVFYU</h1>
          <p class="profile-role">
            <span class="profile-role-text">{{ roleText }}</span><span class="profile-role-caret" aria-hidden="true" />
          </p>
          <p class="profile-lead">我在深圳做软件，关注 AI 系统、前端体验与工程架构。这里记录工作中真正遇到的问题，也收留阅读、产品和日常生活带来的想法。</p>
          <div class="profile-actions">
            <a :href="withBase('/posts/')"><BookOpen /> 阅读文章 <ArrowUpRight /></a>
            <a href="mailto:hello@ilovfyu.dev"><Mail /> 和我联系</a>
            <button type="button" :class="{ copied }" @click="copyEmail">
              <component :is="copied ? Check : Copy" /> {{ copied ? '已复制邮箱' : '复制邮箱' }}
            </button>
          </div>
          <div class="profile-identity-line">
            <span><MapPin /> 深圳</span>
            <span><TerminalSquare /> 软件工程</span>
            <span><CodeXml /> 技术写作</span>
          </div>
        </div>

        <figure class="profile-portrait profile-reveal" @mousemove="onPortraitMove" @mouseleave="onPortraitLeave">
          <div class="profile-portrait-image"><img :src="withBase('/avatar.svg')" alt="ILOVFYU" /></div>
          <figcaption>
            <span>一句自我提醒</span>
            <blockquote>代码让我把想法变成可运行的东西，写作让我确认自己是否真正理解它。</blockquote>
          </figcaption>
          <strong aria-hidden="true">FYU</strong>
        </figure>
      </div>

      <div class="profile-statusbar" aria-label="当前状态">
        <div class="profile-statusbar-left">
          <span class="profile-status-pill"><i /> 开放交流</span>
          <span class="profile-status-clock"><Clock /> {{ localTime }} · UTC+8</span>
        </div>
        <span class="profile-statusbar-note">CODE · SYSTEMS · AI · NOTES</span>
      </div>

      <button class="profile-scroll" type="button" aria-label="继续了解博主" @click="scrollToSection('story')"><ArrowDown /></button>
    </section>

    <section id="stats" class="profile-stats">
      <div class="profile-stats-inner">
        <header class="profile-stats-head profile-reveal">
          <p>数字一览</p>
          <span>这里的一切，都在持续累积。</span>
        </header>
        <div class="profile-stats-grid">
          <div v-for="(stat, i) in stats" :key="stat.label" class="profile-stat profile-reveal">
            <strong><span>{{ statsValues[i] }}</span>{{ stat.suffix }}</strong>
            <p>{{ stat.label }}</p>
            <small>{{ stat.hint }}</small>
          </div>
        </div>
      </div>
    </section>

    <nav class="profile-local-nav" :class="{ visible: navVisible }" aria-label="页面章节导航">
      <div>
        <button
          v-for="section in sections"
          :key="section.id"
          type="button"
          :class="{ active: activeSection === section.id }"
          :aria-current="activeSection === section.id ? 'true' : undefined"
          @click="scrollToSection(section.id)"
        >
          <span>{{ section.index }}</span>
          <strong>{{ section.label }}</strong>
        </button>
      </div>
    </nav>

    <section id="story" class="profile-story profile-band">
      <header class="profile-section-head profile-reveal">
        <p>壹 · 简介</p>
        <h2>你好，我是<br />ILOVFYU。</h2>
      </header>
      <div class="profile-story-grid">
        <blockquote class="profile-reveal">“比起展示一个完美答案，我更想记录问题如何被理解，以及选择为什么在当时成立。”</blockquote>
        <div class="profile-story-copy profile-reveal">
          <p>我是一名软件开发者，目前生活和工作在深圳。日常工作横跨 AI 应用、前端交互和系统工程，也经常需要在尚不清楚的问题里找到一条能够落地的路径。</p>
          <p>我喜欢把一件事完整地做完：理解问题、做出最小版本、放进真实环境、观察结果，再回头整理其中有效与无效的判断。代码负责验证想法，文字负责留下过程。</p>
          <p>这个博客不是一份静态履历。它会随着我的工作和兴趣继续变化，既有技术实践，也有独立构建、阅读摘录和生活观察。</p>
        </div>
      </div>

      <dl class="profile-facts profile-reveal">
        <div><dt>所在地</dt><dd>深圳，中国</dd></div>
        <div><dt>正在做</dt><dd>软件工程与 AI 应用</dd></div>
        <div><dt>长期关注</dt><dd>系统、交互与产品</dd></div>
        <div><dt>持续习惯</dt><dd>构建、阅读和写作</dd></div>
      </dl>

      <div class="profile-working-notes">
        <article v-for="note in workingNotes" :key="note.title" class="profile-working-note profile-spotlight profile-reveal" @mousemove="onCardMove">
          <component :is="note.icon" />
          <h3>{{ note.title }}</h3>
          <p>{{ note.text }}</p>
        </article>
      </div>
    </section>

    <section id="hobbies" class="profile-hobbies profile-band">
      <header class="profile-section-head profile-reveal">
        <p>贰 · 兴趣</p>
        <h2>代码之外，<br />我也喜欢这些。</h2>
      </header>
      <div class="profile-hobby-grid">
        <article v-for="hobby in hobbies" :key="hobby.title" class="profile-hobby profile-spotlight profile-reveal" @mousemove="onCardMove">
          <component :is="hobby.icon" />
          <h3>{{ hobby.title }}</h3>
          <p>{{ hobby.text }}</p>
        </article>
      </div>
    </section>

    <section id="collections" class="profile-collections profile-band">
      <header class="profile-section-head profile-reveal">
        <p>叁 · 收藏</p>
        <h2>一些长期留下来<br />的收藏。</h2>
      </header>
      <p class="profile-collection-lead profile-reveal">收藏夹里真正留下来的，多半不是短暂的热点，而是能反复使用的工具、值得长期阅读的信息源，以及我偏爱的内容形式。</p>
      <div class="profile-collection-shelf profile-reveal">
        <div v-for="group in collections" :key="group.title" class="profile-collection-row">
          <strong>{{ group.title }}</strong>
          <div><span v-for="item in group.items" :key="item">{{ item }}</span></div>
        </div>
      </div>
    </section>

    <section id="reading" class="profile-reading profile-band">
      <header class="profile-section-head profile-reveal">
        <p>肆 · 文章</p>
        <h2>最近写下的<br />几篇记录。</h2>
      </header>
      <div class="profile-reading-list">
        <a v-for="(item, index) in recentNotes" :key="item.path" :href="withBase(item.path)" class="profile-reading-row profile-reveal">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <div><small>{{ item.code }}</small><h3>{{ item.title }}</h3><p>{{ item.summary }}</p></div>
          <ArrowUpRight />
        </a>
      </div>
    </section>

    <section id="contact" class="profile-contact profile-band">
      <div class="profile-contact-intro profile-reveal">
        <p>伍 · 联系</p>
        <h2>欢迎来打个<br />招呼。</h2>
        <span>无论是技术讨论、项目反馈、文章勘误，还是恰好在思考相似的问题，都可以通过邮件或 GitHub 找到我。</span>
      </div>
      <div class="profile-contact-links profile-reveal">
        <a href="mailto:hello@ilovfyu.dev"><span><Mail /> EMAIL</span><strong>hello@ilovfyu.dev</strong><ArrowUpRight /></a>
        <a href="https://github.com/ilovfyu" target="_blank" rel="noopener noreferrer"><span><GitFork /> GITHUB</span><strong>github.com/ilovfyu</strong><ArrowUpRight /></a>
      </div>
      <footer class="profile-footer">
        <span>ILOVFYU / DEVELOPER & WRITER</span>
        <span>CODE · SYSTEMS · BUILDING · NOTES</span>
        <span><MapPin /> SHENZHEN, CHINA</span>
      </footer>
    </section>
  </main>
</template>
