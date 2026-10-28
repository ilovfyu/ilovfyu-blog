<script setup lang="ts">
import type { SocialLink } from 'vuepress-theme-plume/shared'
import VPSocialLink from 'vuepress-theme-plume/components/VPSocialLink.vue'
import { computed, useAttrs } from 'vue'
import AIChatTrigger from './AIChatTrigger.vue'

defineProps<{ links: SocialLink[] }>()
const attrs = useAttrs()
const inNavigation = computed(() => /vp-navbar-social-links|vp-nav-screen-social-links|social-links-list/.test(String(attrs.class || '')))
</script>

<template>
  <div class="vp-social-links blog-social-links">
    <template v-for="{ link, icon } in links" :key="link">
      <VPSocialLink :icon="icon" :link="link" />
      <AIChatTrigger v-if="inNavigation && /github\.com\//.test(link)" />
    </template>
  </div>
</template>

<style scoped>
.blog-social-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; }
</style>
