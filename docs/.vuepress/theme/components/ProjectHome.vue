<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePageData, useRoute } from 'vuepress/client'

const route = useRoute()
const page = usePageData()
const rootEl = ref<HTMLElement | null>(null)
let observer: MutationObserver | null = null
let raf = 0

interface ProjectMeta {
  status?: string
  category?: string
  summary?: string
  links?: Array<{ label: string; link: string }>
  stack?: string[]
  progress?: Array<{ label: string; value: string }>
}

const meta = computed<ProjectMeta>(() => {
  const fm = (page.value.frontmatter ?? {}) as Record<string, unknown>
  const status = typeof fm.projectStatus === 'string' ? fm.projectStatus : typeof fm.status === 'string' ? fm.status : ''
  const category = typeof fm.projectCategory === 'string' ? fm.projectCategory : ''
  const summary = typeof fm.projectSummary === 'string' ? fm.projectSummary : ''
  const links = Array.isArray(fm.projectLinks) ? fm.projectLinks as Array<{ label: string; link: string }> : []
  const stack = Array.isArray(fm.projectStack) ? fm.projectStack as string[] : []
  const progress = Array.isArray(fm.projectProgress) ? fm.projectProgress as Array<{ label: string; value: string }> : []
  return { status, category, summary, links, stack, progress }
})

const statusTone = computed(() => {
  const s = meta.value.status ?? ''
  if (s.includes('开发')) return 'dev'
  if (s.includes('架构')) return 'design'
  if (s.includes('上线') || s.includes('内测')) return 'live'
  return 'plan'
})

const isProjectPage = computed(() => /^\/projects\/[^/]+\/$/.test(route.path))
const isActive = computed(() => isProjectPage.value && Boolean(meta.value.status))

function moveToTop() {
  if (!rootEl.value) return
  // 把横幅放到正文卡片（main）之上、内容容器（vp-doc-container）之内，
  // 让它横跨整个内容区，而不是被正文卡片宽度限制
  const docContainer = document.querySelector('.vp-doc-container') as HTMLElement | null
  if (docContainer && rootEl.value.parentNode !== docContainer) {
    docContainer.insertBefore(rootEl.value, docContainer.firstChild)
  }
}

function ensurePosition() {
  if (raf) return
  raf = window.requestAnimationFrame(() => {
    raf = 0
    if (isProjectPage.value && rootEl.value) moveToTop()
  })
}

onMounted(() => {
  ensurePosition()
  // 页面内容异步渲染，监听 DOM 变化确保插入到正确位置
  observer = new MutationObserver(ensurePosition)
  observer.observe(document.body, { childList: true, subtree: true })
})

watch(route.path, () => {
  nextTick(() => {
    ensurePosition()
    if (!isProjectPage.value && rootEl.value?.parentNode) {
      document.body.appendChild(rootEl.value)
    }
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.cancelAnimationFrame(raf)
})
</script>

<template>
  <section v-if="isActive" ref="rootEl" class="project-home-hero">
    <div class="project-hero-glow" aria-hidden="true" />
    <div class="project-hero-inner">
      <div class="project-hero-tags">
        <span v-if="meta.status" class="project-status" :class="statusTone">{{ meta.status }}</span>
        <span v-if="meta.category" class="project-category">{{ meta.category }}</span>
      </div>
      <h1 class="project-hero-title">{{ page.title }}</h1>
      <p v-if="meta.summary" class="project-hero-summary">{{ meta.summary }}</p>

      <div v-if="meta.links && meta.links.length" class="project-hero-links">
        <a
          v-for="link in meta.links"
          :key="link.label"
          class="project-link"
          :href="link.link.startsWith('http') ? link.link : link.link"
          :target="link.link.startsWith('http') ? '_blank' : undefined"
          :rel="link.link.startsWith('http') ? 'noopener noreferrer' : undefined"
        >
          {{ link.label }} <b>↗</b>
        </a>
      </div>

      <dl v-if="meta.progress && meta.progress.length" class="project-hero-progress">
        <div v-for="item in meta.progress" :key="item.label">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>

      <div v-if="meta.stack && meta.stack.length" class="project-hero-stack">
        <span v-for="tech in meta.stack" :key="tech">{{ tech }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.project-home-hero {
  position: relative;
  overflow: hidden;
  width: min(880px, 100%);
  margin: 0 auto 12px;
  padding: clamp(52px, 11vh, 100px) clamp(20px, 4vw, 40px) 52px;
  border: none;
  border-bottom: 1px solid var(--space-line, rgba(150, 138, 118, 0.14));
  background:
    radial-gradient(ellipse 90% 70% at 50% -20%, rgba(154, 126, 96, 0.1), transparent 62%),
    radial-gradient(ellipse 60% 50% at 85% 18%, rgba(224, 163, 72, 0.07), transparent 60%),
    linear-gradient(180deg, rgba(150, 138, 118, 0.045), transparent 55%);
}
.project-home-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(0deg, rgba(180, 168, 146, 0.012) 0, rgba(180, 168, 146, 0.012) 1px, transparent 1px, transparent 5px);
  opacity: 0.55;
}
.project-home-hero::after {
  content: '';
  position: absolute;
  left: 14%;
  right: 14%;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(150, 142, 88, 0.5), rgba(167, 139, 110, 0.5), transparent);
}
.project-hero-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(150, 138, 118, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(150, 138, 118, 0.05) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at 50% 0%, #000 0%, transparent 78%);
}
.project-hero-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 0 auto;
}
.project-hero-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}
.project-status {
  padding: 5px 14px;
  border-radius: 20px;
  font: 500 11px var(--font-code, monospace);
  letter-spacing: 0.08em;
}
.project-status.plan { color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); background: rgba(251, 191, 36, 0.1); }
.project-status.design { color: #b89b7a; border: 1px solid rgba(167, 139, 110, 0.4); background: rgba(167, 139, 110, 0.1); }
.project-status.dev { color: #e0a348; border: 1px solid rgba(224, 163, 72, 0.4); background: rgba(224, 163, 72, 0.1); }
.project-status.live { color: #968e58; border: 1px solid rgba(150, 142, 88, 0.4); background: rgba(150, 142, 88, 0.1); }
.project-category {
  padding: 5px 14px;
  border-radius: 20px;
  color: var(--text-2, rgba(168, 158, 140, 0.68));
  border: 1px solid rgba(150, 138, 118, 0.18);
  background: rgba(150, 138, 118, 0.06);
  font-size: 11px;
}
.project-hero-title {
  margin: 0;
  font: 700 clamp(38px, 6vw, 62px) / 1.05 var(--font-disp, sans-serif);
  letter-spacing: -0.045em;
  background: linear-gradient(120deg, #f2ece1 10%, var(--lime, #968e58) 52%, var(--violet, #b89b7a) 95%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.project-hero-summary {
  max-width: 620px;
  margin: 20px 0 0;
  color: var(--text-2, rgba(168, 158, 140, 0.68));
  font-size: 15px;
  line-height: 1.9;
}
.project-hero-links {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}
.project-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 20px;
  border: 1px solid rgba(224, 163, 72, 0.35);
  border-radius: 5px;
  color: #e0a348;
  background: rgba(224, 163, 72, 0.06);
  font-size: 13px;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}
.project-link:hover { background: rgba(224, 163, 72, 0.14); border-color: rgba(224, 163, 72, 0.6); transform: translateY(-2px); }
.project-link b { font-weight: 500; }
.project-hero-progress {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 36px;
  margin: 34px 0 0;
  padding: 22px 0 0;
  border-top: 1px solid rgba(150, 138, 118, 0.12);
}
.project-hero-progress div { min-width: 90px; }
.project-hero-progress dt {
  color: var(--text-3, rgba(168, 158, 140, 0.4));
  font: 9px var(--font-code, monospace);
  letter-spacing: 0.14em;
}
.project-hero-progress dd {
  margin: 6px 0 0;
  color: #e0a348;
  font: 600 22px var(--font-code, monospace);
}
.project-hero-stack {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 26px;
}
.project-hero-stack span {
  padding: 4px 11px;
  border: 1px solid rgba(150, 138, 118, 0.16);
  border-radius: 3px;
  color: var(--text-3, rgba(168, 158, 140, 0.4));
  background: rgba(150, 138, 118, 0.04);
  font: 9px var(--font-code, monospace);
}
@media (max-width: 719px) {
  .project-home-hero {
    margin: 0 0 26px;
    padding: 48px 18px 42px;
    border-radius: 0;
  }
}
</style>
