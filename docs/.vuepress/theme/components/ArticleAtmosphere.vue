<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePageData, useRoute } from 'vuepress/client'

const route = useRoute()
const page = usePageData()
const progressBar = ref<HTMLElement | null>(null)
const isArticle = computed(() => String(page.value.frontmatter.pageClass || '').split(/\s+/).includes('article-page'))

let frame = 0

function updateProgress() {
  frame = 0
  if (!isArticle.value || !progressBar.value) return

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0
  progressBar.value.style.transform = `scaleX(${progress})`
}

function requestProgressUpdate() {
  if (!frame) frame = window.requestAnimationFrame(updateProgress)
}

watch(() => route.path, async () => {
  await nextTick()
  requestProgressUpdate()
})

function attachListeners() {
  window.addEventListener('scroll', requestProgressUpdate, { passive: true })
  window.addEventListener('resize', requestProgressUpdate, { passive: true })
}

function detachListeners() {
  window.cancelAnimationFrame(frame)
  frame = 0
  window.removeEventListener('scroll', requestProgressUpdate)
  window.removeEventListener('resize', requestProgressUpdate)
}

onMounted(() => {
  if (isArticle.value) attachListeners()
  requestProgressUpdate()
})

watch(isArticle, (active) => {
  if (active) attachListeners()
  else detachListeners()
})

onBeforeUnmount(() => {
  detachListeners()
})
</script>

<template>
  <div v-if="isArticle" class="article-atmosphere" aria-hidden="true">
    <div class="article-progress-track"><i ref="progressBar" /></div>
    <div class="article-breath-field"><i /><i /><span /></div>
  </div>
</template>
