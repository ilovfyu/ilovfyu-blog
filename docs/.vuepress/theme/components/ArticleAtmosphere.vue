<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onContentUpdated, usePageData } from 'vuepress/client'
import { readingProgress } from '../utils/reading-progress'

const page = usePageData()
const isArticle = computed(() => String(page.value.frontmatter.pageClass || '').split(/\s+/).includes('article-page'))
const progress = ref(0)
const progressPercent = computed(() => Math.round(progress.value * 100))
let articleBody: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null
let mounted = false
let frame = 0

function updateProgress() {
  frame = 0
  if (!articleBody?.isConnected) return
  const navHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height')) || 64
  progress.value = readingProgress(articleBody.getBoundingClientRect(), window.innerHeight, navHeight + 48)
}

function requestProgressUpdate() {
  if (articleBody && !frame) frame = window.requestAnimationFrame(updateProgress)
}

function resetArticle() {
  resizeObserver?.disconnect()
  resizeObserver = null
  articleBody = null
  progress.value = 0
  cancelAnimationFrame(frame)
  frame = 0
}

async function observeArticle() {
  await nextTick()
  if (!mounted) return
  resetArticle()
  // Plume's .vp-doc also contains copyright, changelog and previous/next navigation.
  articleBody = isArticle.value ? document.querySelector<HTMLElement>('.article-page .vp-doc > div:first-child') : null
  if (articleBody && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(requestProgressUpdate)
    resizeObserver.observe(articleBody)
  }
  requestProgressUpdate()
}

// Content can mount after the route changes because the theme animates page exits.
onContentUpdated(reason => {
  if (!mounted) return
  if (reason === 'beforeUnmount') resetArticle()
  else void observeArticle()
})
watch(isArticle, active => { if (!active && mounted) resetArticle() })

onMounted(() => {
  mounted = true
  void observeArticle()
  window.addEventListener('scroll', requestProgressUpdate, { passive: true })
  window.addEventListener('resize', requestProgressUpdate, { passive: true })
})

onBeforeUnmount(() => {
  mounted = false
  resetArticle()
  window.removeEventListener('scroll', requestProgressUpdate)
  window.removeEventListener('resize', requestProgressUpdate)
})
</script>

<template>
  <div v-if="isArticle" class="article-progress-track" aria-hidden="true"><i :style="{ transform: `scaleX(${progress})` }" /></div>
  <span v-if="isArticle" class="article-reading-status" aria-hidden="true">正文阅读 · {{ progressPercent }}%</span>
  <div v-if="isArticle" class="article-atmosphere" aria-hidden="true">
    <div class="article-breath-field"><i /><i /><span /></div>
  </div>
</template>
