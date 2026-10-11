<script setup lang="ts">
import { computed } from 'vue'
import { usePageData } from 'vuepress/client'
import MoyinLanding from './MoyinLanding.vue'
import YuliaoLanding from './YuliaoLanding.vue'
import YijiLanding from './YijiLanding.vue'
import XiakeShowcase from './XiakeShowcase.vue'
import PlatformLanding from './PlatformLanding.vue'
import AnnotationLanding from './AnnotationLanding.vue'
import type { ProjectMeta } from '../data/content'
const page = usePageData()
const templates = { moyin: MoyinLanding, xiake: XiakeShowcase, yuliao: YuliaoLanding, yiji: YijiLanding, 'sre-platform': PlatformLanding, 'relay-service': PlatformLanding, 'annotation-tool-platform': AnnotationLanding }
const selected = computed(() => templates[(page.value.frontmatter.project as ProjectMeta)?.code as keyof typeof templates])
</script>

<template><div class="project-showcase"><component :is="selected" v-if="selected" :key="page.path" /></div></template>
