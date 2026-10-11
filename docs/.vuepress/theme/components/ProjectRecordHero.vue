<script setup lang="ts">
import { computed } from 'vue'
import { usePageData, withBase } from 'vuepress/client'
import type { ProjectMeta } from '../data/content'
const page = usePageData()
const project = computed(() => page.value.frontmatter.project as ProjectMeta)
</script>

<template>
  <header v-if="project" class="project-record-hero" :data-tone="project.tone">
    <div class="project-record-tags"><span>{{ project.status }}</span><span>{{ project.category }}</span><span v-if="project.group && project.group !== project.status">{{ project.group }}</span></div>
    <h1>{{ page.title }}</h1><p>{{ project.summary || page.frontmatter.description }}</p>
    <a v-if="project.showcase" :href="withBase(project.showcase)">产品展示 ↗</a>
    <dl v-if="project.progress.length"><div v-for="item in project.progress" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div></dl>
    <div class="project-record-stack"><span v-for="tech in project.stack" :key="tech">{{ tech }}</span></div>
  </header>
</template>
