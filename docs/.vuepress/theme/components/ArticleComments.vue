<script setup lang="ts">
import { computed } from 'vue'
import { MessageCircle } from '@lucide/vue'
import VPComment from 'vuepress-theme-plume/components/VPComment.vue'
import { useData, useEncrypt } from 'vuepress-theme-plume/composables'

const { frontmatter } = useData()
const { isPageDecrypted } = useEncrypt()
const visible = computed(() => String(frontmatter.value.pageClass || '').split(/\s+/).includes('article-page') && frontmatter.value.comments !== false && isPageDecrypted.value)
</script>

<template>
  <section v-if="visible" id="article-comments" class="article-comments" aria-labelledby="article-comments-title">
    <header><div><span>CONTINUE THE CONVERSATION</span><h2 id="article-comments-title"><MessageCircle aria-hidden="true" />一起讨论</h2></div><a href="https://github.com/ilovfyu/ilovfyu-blog/discussions" target="_blank" rel="noopener noreferrer">在 GitHub 中查看 ↗</a></header>
    <p>欢迎提问、补充或指出错误。登录 GitHub 即可评论，支持 Markdown 与代码片段。</p>
    <VPComment />
    <p class="article-comments-help">评论由 GitHub Discussions 保存。若评论框未加载，可在 GitHub 中参与讨论。</p>
  </section>
</template>
