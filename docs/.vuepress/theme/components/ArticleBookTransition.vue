<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter, withBase } from 'vuepress/client'
import { knowledge, notes, projects } from '../data/content'
import { createBookTextures, drawArticleBook, type BookContent, type BookPalette, type BookTextures } from '../scenes/article-book'

const router = useRouter()
const entries = [...notes, ...knowledge, ...projects.filter(entry => entry.project?.view !== 'showcase')]
const findArticle = (path: string) => entries.find(item => item.path === path || withBase(item.path) === path)
const active = ref(false), phase = ref('materializing'), title = ref('')
const canvas = ref<HTMLCanvasElement | null>(null), stage = ref<HTMLElement | null>(null)
const duration = 2400
let textures: BookTextures | undefined
let bookContent: BookContent | undefined, compact = false
let frame = 0, releaseTimer = 0, watchdog = 0, generation = 0, started = 0, painted = 0, progress = 0
let navigated = false, skipped = false
let release: (() => void) | null = null
let removeGuard: (() => void) | undefined, removeAfter: (() => void) | undefined, removeError: (() => void) | undefined
let motion: MediaQueryList | undefined, context: CanvasRenderingContext2D | null = null, palette: BookPalette | null = null
let historyTime = -Infinity, width = 0, height = 0
function resume() { clearTimeout(releaseTimer); if (release) { const resolve = release; release = null; resolve() } }
function cleanup(focus = false) {
  generation++; resume(); cancelAnimationFrame(frame); clearTimeout(watchdog)
  frame = 0; active.value = false; context = null; palette = null; textures = undefined; bookContent = undefined
  document.body.classList.remove('book-transition-active', 'book-revealing')
  if (focus) {
    const heading = document.querySelector<HTMLElement>('.article-page h1, .project-record-page h1')
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }) }
  }
}
function skip() { skipped = true; resume(); if (navigated) cleanup(true) }
function resize() {
  if (!canvas.value || !context) return
  width = innerWidth; height = innerHeight
  if (palette && bookContent && (!textures || compact !== (width < 640))) {
    compact = width < 640; textures = createBookTextures(bookContent, palette, compact)
  }
  const dpr = Math.min(devicePixelRatio || 1, 1.5)
  canvas.value.width = Math.round(width * dpr); canvas.value.height = Math.round(height * dpr)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (palette) drawArticleBook(context, width, height, progress, palette, textures)
}
function paint(now: number) {
  frame = requestAnimationFrame(paint)
  if (now - painted < 25 || !context || !palette) return
  painted = now; progress = Math.min(1, (now - started) / duration)
  phase.value = progress < .3 ? 'materializing' : progress < .65 ? 'turning' : 'dissolving'
  if (progress >= .65) document.body.classList.add('book-revealing')
  try { drawArticleBook(context, width, height, progress, palette, textures) }
  catch { cancelAnimationFrame(frame); frame = 0; skip(); return }
  if (progress === 1) { cancelAnimationFrame(frame); frame = 0; if (navigated) cleanup(true) }
}
function historyNavigation() { historyTime = performance.now() }
function preferences() { if (motion?.matches && active.value) skip() }
function hidden() { if (document.hidden && active.value) skip() }
function keyboard(event: KeyboardEvent) {
  if (!active.value) return
  if (event.key === 'Escape') { event.preventDefault(); skip() }
  if (event.key === 'Tab') { event.preventDefault(); stage.value?.focus({ preventScroll: true }) }
}
function followArticle(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('a[href]')
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
  const url = new URL(link.href, location.href), entry = findArticle(url.pathname)
  if (url.origin !== location.origin || !entry || url.pathname === location.pathname) return
  event.preventDefault(); event.stopPropagation()
  void router.push(entry.path + url.search + url.hash)
}
onMounted(() => {
  motion = matchMedia('(prefers-reduced-motion: reduce)'); motion.addEventListener('change', preferences)
  window.addEventListener('popstate', historyNavigation); window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', hidden); document.addEventListener('keydown', keyboard, true); document.addEventListener('click', followArticle, true)
  removeGuard = router.beforeEach(async (to, from) => {
    const entry = findArticle(to.path)
    if (!entry || to.path === from.path || motion?.matches || document.hidden || performance.now() - historyTime < 300) { if (active.value) cleanup(); return }
    cleanup(); const token = generation
    title.value = entry.title; active.value = true; phase.value = 'materializing'; progress = 0; navigated = skipped = false
    document.body.classList.add('book-transition-active')
    await nextTick()
    if (token !== generation) return false
    context = canvas.value?.getContext('2d') || null
    if (!context || !canvas.value) { cleanup(); return }
    const style = getComputedStyle(canvas.value), color = (name: string) => style.getPropertyValue(name).trim()
    palette = { primary: color('--fx-cyan'), secondary: color('--fx-violet'), ink: color('--text-1'), dark: document.documentElement.dataset.theme === 'dark' }
    bookContent = entry
    try { resize() } catch { cleanup(); return }
    started = performance.now(); painted = 0; frame = requestAnimationFrame(paint); stage.value?.focus({ preventScroll: true })
    watchdog = window.setTimeout(() => cleanup(), 5000)
    // Enter the article while the spectral book is still unfolding over the screen.
    await new Promise<void>(resolve => { release = resolve; releaseTimer = window.setTimeout(resume, 240) })
    return token === generation ? undefined : false
  })
  removeAfter = router.afterEach((_to, _from, failure) => {
    if (!active.value) return
    if (failure) { cleanup(); return }
    navigated = true
    if (skipped || progress === 1) cleanup(true)
  })
  removeError = router.onError(() => cleanup())
})
onBeforeUnmount(() => {
  cleanup(); removeGuard?.(); removeAfter?.(); removeError?.()
  motion?.removeEventListener('change', preferences); window.removeEventListener('popstate', historyNavigation); window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', hidden); document.removeEventListener('keydown', keyboard, true); document.removeEventListener('click', followArticle, true)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="active" ref="stage" class="article-book-transition" :data-phase="phase" tabindex="-1" @wheel.prevent @touchmove.prevent>
      <canvas ref="canvas" aria-hidden="true" />
      <span class="book-transition-status" role="status" aria-live="polite">正在打开 {{ title }}</span>
    </div>
  </Teleport>
</template>
