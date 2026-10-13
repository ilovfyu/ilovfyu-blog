<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { usePageData } from 'vuepress/client'
import type { ProjectMeta } from '../data/content'
const MoyinLanding = defineAsyncComponent(() => import('./MoyinLanding.vue'))
const YuliaoLanding = defineAsyncComponent(() => import('./YuliaoLanding.vue'))
const YijiLanding = defineAsyncComponent(() => import('./YijiLanding.vue'))
const XiakeShowcase = defineAsyncComponent(() => import('./XiakeShowcase.vue'))
const PlatformLanding = defineAsyncComponent(() => import('./PlatformLanding.vue'))
const AnnotationLanding = defineAsyncComponent(() => import('./AnnotationLanding.vue'))
const page = usePageData()
const templates = { moyin: MoyinLanding, xiake: XiakeShowcase, yuliao: YuliaoLanding, yiji: YijiLanding, 'sre-platform': PlatformLanding, 'relay-service': PlatformLanding, 'annotation-tool-platform': AnnotationLanding }
const selected = computed(() => templates[(page.value.frontmatter.project as ProjectMeta)?.code as keyof typeof templates])
</script>

<template><div class="project-showcase"><component :is="selected" v-if="selected" :key="page.path" /></div></template>
