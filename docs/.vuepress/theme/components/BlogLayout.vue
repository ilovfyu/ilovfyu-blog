<script setup lang="ts">
import { Layout } from 'vuepress-theme-plume/client'
import AIChatTrigger from './AIChatTrigger.vue'
import ArticleTools from './ArticleTools.vue'
import { computed } from 'vue'
import { usePageData } from 'vuepress/client'
const page = usePageData()
const isArticle = computed(() => String(page.value.frontmatter.pageClass || '').split(/\s+/).includes('article-page'))
</script>

<template>
  <Layout>
    <template #nav-bar-content-after><AIChatTrigger class="ai-compact-trigger" /></template>
    <template #doc-meta-bottom><ArticleTools v-if="isArticle" /></template>
  </Layout>
</template>
