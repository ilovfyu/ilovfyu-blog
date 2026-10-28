<script setup lang="ts">
import { Layout } from 'vuepress-theme-plume/client'
import AIChatTrigger from './AIChatTrigger.vue'
</script>

<template>
  <Layout><template #nav-bar-content-after><AIChatTrigger class="ai-compact-trigger" /></template></Layout>
</template>
