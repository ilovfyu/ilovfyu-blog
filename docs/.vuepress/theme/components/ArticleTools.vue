<script setup lang="ts">
import { Check, Link, MessageCircle, Sparkles } from '@lucide/vue'
import { ref, watch } from 'vue'
import { usePageData } from 'vuepress/client'
import { assistantDraft, openAssistant } from '../utils/assistant-state'

const page = usePageData()
const copied = ref(false)
const status = ref('')
watch(() => page.value.path, () => { copied.value = false; status.value = '' })
async function copy() {
  try {
    const url = new URL(location.href)
    url.search = ''; url.hash = ''
    await navigator.clipboard.writeText(url.href)
    copied.value = true; status.value = '文章链接已复制。'
  } catch { status.value = '未能复制，请从浏览器地址栏复制链接。' }
}
function ask(event: MouseEvent) {
  assistantDraft.value = `请解释《${page.value.title}》的核心概念，并给我一个简单的练习。`
  openAssistant(event)
}
</script>

<template>
  <nav class="article-tools" aria-label="文章工具">
    <button type="button" @click="copy"><Check v-if="copied" aria-hidden="true" /><Link v-else aria-hidden="true" />{{ copied ? '已复制' : '复制链接' }}</button>
    <button type="button" @click="ask"><Sparkles aria-hidden="true" />问 AI</button>
    <a v-if="page.frontmatter.comments !== false" href="#article-comments"><MessageCircle aria-hidden="true" />参与讨论</a>
    <span role="status" class="article-tools-status">{{ status }}</span>
  </nav>
</template>
