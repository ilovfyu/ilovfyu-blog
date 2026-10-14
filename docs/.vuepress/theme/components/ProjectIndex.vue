<script setup lang="ts">
import { computed } from 'vue'
import { projects } from '../data/content'
import AnimatedProjectSection from './AnimatedProjectSection.vue'
import BuildSculpture from './BuildSculpture.vue'
import ProjectLogCard from './ProjectLogCard.vue'
const building = computed(() => projects.filter(project => project.project?.group === '持续构建'))
const completed = computed(() => projects.filter(project => project.project?.group === '已完成作品'))
const planned = computed(() => projects.filter(project => !['持续构建', '已完成作品'].includes(project.project?.group || '')))
const plannedSequence = computed(() => String(1 + Number(!!building.value.length) + Number(!!completed.value.length)).padStart(2, '0'))
const showcases = computed(() => projects.filter(project => project.project?.showcase).length)
</script>

<template>
  <main class="project-index catalog-page">
    <header class="catalog-hero project-lab-hero project-focus-hero">
      <div class="project-lab-intro">
        <p class="catalog-kicker"><i aria-hidden="true" /> PROJECTS / BUILD IN PUBLIC</p>
        <h1>项目<span>让想法，持续生长。</span></h1>
        <p class="catalog-description">正在探索 PromptLSM 的缓存优化与 RoostAI 的智能体应用交付。记录每一次构建，也保留一路走来的实验。</p>
        <dl class="project-lab-stats"><div><dt>项目记录</dt><dd>{{ String(projects.length).padStart(2, '0') }}</dd></div><div><dt>产品展示</dt><dd>{{ String(showcases).padStart(2, '0') }}</dd></div><div><dt>持续构建</dt><dd>{{ String(building.length).padStart(2, '0') }}</dd></div></dl>
      </div>
      <BuildSculpture />
    </header>
    <section class="catalog-body" aria-label="项目目录">
      <AnimatedProjectSection v-if="building.length" :entries="building" />
      <AnimatedProjectSection v-if="completed.length" :entries="completed" variant="completed" :sequence="building.length ? 2 : 1" />
      <div v-if="planned.length" class="project-section-heading project-planned-heading"><p>{{ plannedSequence }} / EXPLORATION LOG</p><h2>计划与构建记录</h2></div>
      <div v-if="planned.length" class="project-catalog-grid">
        <ProjectLogCard v-for="project in planned" :key="project.path" :entry="project" />
      </div>
      <div v-if="!projects.length" class="catalog-empty"><h2>还没有发布项目记录</h2><p>真实的作品与构建过程，将在这里陆续记录。</p></div>
    </section>
  </main>
</template>
