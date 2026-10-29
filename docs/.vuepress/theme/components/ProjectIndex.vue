<script setup lang="ts">
import { computed } from 'vue'
import { projects } from '../data/content'
import AnimatedProjectSection from './AnimatedProjectSection.vue'
import BuildSculpture from './BuildSculpture.vue'
const building = computed(() => projects.filter(project => project.project?.group === '持续构建'))
const completed = computed(() => projects.filter(project => project.project?.group === '已完成作品'))
const planned = computed(() => projects.filter(project => !['持续构建', '已完成作品'].includes(project.project?.group || '')))
const plannedSequence = computed(() => 1 + Number(!!building.value.length) + Number(!!completed.value.length))
const showcases = computed(() => projects.filter(project => project.project?.showcase).length)
</script>

<template>
  <main class="project-index catalog-page">
    <header class="catalog-hero project-lab-hero project-focus-hero">
      <div class="project-lab-intro">
        <p class="catalog-kicker"><i aria-hidden="true" /> PROJECTS / BUILD IN PUBLIC</p>
        <h1>项目<span>让想法，持续生长。</span></h1>
        <p class="catalog-description">从提示词缓存、δ-mem 算子，到有状态 Serverless 运行时、推理性能分诊与 AI 应用安全。记录构建过程，让每个想法都有清晰的实现路径。</p>
        <dl class="project-lab-stats"><div><dt>项目记录</dt><dd>{{ String(projects.length).padStart(2, '0') }}</dd></div><div><dt>产品展示</dt><dd>{{ String(showcases).padStart(2, '0') }}</dd></div><div><dt>持续构建</dt><dd>{{ String(building.length).padStart(2, '0') }}</dd></div></dl>
      </div>
      <BuildSculpture />
    </header>
    <section class="catalog-body" aria-label="项目目录">
      <AnimatedProjectSection v-if="building.length" :entries="building" />
      <AnimatedProjectSection v-if="completed.length" :entries="completed" variant="completed" :sequence="building.length ? 2 : 1" />
      <AnimatedProjectSection v-if="planned.length" :entries="planned" variant="planned" :sequence="plannedSequence" />
      <div v-if="!projects.length" class="catalog-empty"><h2>还没有发布项目记录</h2><p>真实的作品与构建过程，将在这里陆续记录。</p></div>
    </section>
  </main>
</template>
