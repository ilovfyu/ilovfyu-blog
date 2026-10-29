<script setup lang="ts">
import { computed } from 'vue'
import { usePageData, withBase } from 'vuepress/client'
import type { ProjectMeta } from '../data/content'
import { projectRepository } from '../data/project-repositories'
import WyvernProjectVisual from './WyvernProjectVisual.vue'
import FineTuningProjectVisual from './FineTuningProjectVisual.vue'
import RuntimeProjectVisual from './RuntimeProjectVisual.vue'
const page = usePageData()
const project = computed(() => page.value.frontmatter.project as ProjectMeta)
const repository = computed(() => projectRepository(project.value))
</script>

<template>
  <header v-if="project" class="project-record-hero" :data-tone="project.tone">
    <div class="project-record-tags"><span>{{ project.status }}</span><span>{{ project.category }}</span><span v-if="project.group && project.group !== project.status">{{ project.group }}</span></div>
    <h1>{{ page.title }}</h1><p>{{ project.summary || page.frontmatter.description }}</p>
    <a v-if="project.showcase" :href="withBase(project.showcase)">产品展示 ↗</a>
    <a v-if="repository" :href="repository" target="_blank" rel="noopener noreferrer" aria-label="GitHub 仓库（新窗口）">GitHub 仓库</a>
    <dl v-if="project.progress.length"><div v-for="item in project.progress" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div></dl>
    <div class="project-record-stack"><span v-for="tech in project.stack" :key="tech">{{ tech }}</span></div>
    <WyvernProjectVisual v-if="project.code === 'wyvern'" />
    <FineTuningProjectVisual v-else-if="project.code === 'model-fine-tuning'" />
    <RuntimeProjectVisual v-else-if="project.code === 'siskin-base-control' || project.code === 'tagline' || project.code === 'shipgate'" :kind="project.code" />
  </header>
</template>
