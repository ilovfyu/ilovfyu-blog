<script setup lang="ts">
import { computed } from 'vue'
import { projects } from '../data/content'
import ProjectCard from './ProjectCard.vue'
import ProjectLogCard from './ProjectLogCard.vue'
const building = computed(() => projects.filter(project => project.project?.group === '持续构建'))
const featured = computed(() => projects.filter(project => project.project?.group !== '持续构建' && project.project?.showcase && project.project.order <= 4))
const planned = computed(() => projects.filter(project => project.project?.group !== '持续构建' && (!project.project?.showcase || project.project.order > 4)))
const showcases = computed(() => projects.filter(project => project.project?.showcase).length)
</script>

<template>
  <main class="project-index catalog-page">
    <header class="catalog-hero project-lab-hero">
      <div class="project-lab-intro">
        <p class="catalog-kicker"><i aria-hidden="true" /> PROJECTS / BUILD IN PUBLIC</p>
        <h1>项目<span>从想法，到作品。</span></h1>
        <p class="catalog-description">记录作品如何从想法走向实现，以及构建过程中的选择与取舍。</p>
        <dl class="project-lab-stats"><div><dt>项目记录</dt><dd>{{ String(projects.length).padStart(2, '0') }}</dd></div><div><dt>产品展示</dt><dd>{{ String(showcases).padStart(2, '0') }}</dd></div><div><dt>持续构建</dt><dd>{{ String(building.length).padStart(2, '0') }}</dd></div></dl>
      </div>
      <div class="project-lab-engine" aria-hidden="true">
        <div class="project-engine-grid" />
        <div class="project-engine-ring"><i /><b /></div><div class="project-engine-ring ring-inner"><i /><b /></div>
        <div class="project-engine-core"><span>ILOVFYU</span><strong>BUILD</strong><small>IDEA → SYSTEM → EXPERIENCE</small></div>
        <span class="project-engine-node node-ai">01 / AI</span><span class="project-engine-node node-code">02 / CODE</span><span class="project-engine-node node-play">03 / PLAY</span>
        <span class="project-engine-caption">PERSONAL LAB / EXPLORATION IN MOTION</span>
      </div>
    </header>
    <section class="catalog-body" aria-label="项目目录">
      <div v-if="featured.length" class="project-section-heading"><p>01 / SELECTED WORK</p><span>作品与实验</span></div>
      <div v-if="featured.length" class="project-display-grid">
        <ProjectCard v-for="project in featured" :key="project.path" :entry="project" />
      </div>
      <section v-if="building.length" class="project-building-section" aria-labelledby="project-building-title">
        <div class="project-section-heading project-planned-heading"><p>02 / BUILD IN PROGRESS</p><h2 id="project-building-title">持续构建</h2></div>
        <div class="project-catalog-grid"><ProjectLogCard v-for="project in building" :key="project.path" :entry="project" /></div>
      </section>
      <div v-if="planned.length" class="project-section-heading project-planned-heading"><p>{{ building.length ? '03' : '02' }} / EXPLORATION LOG</p><h2>计划与构建记录</h2></div>
      <div v-if="planned.length" class="project-catalog-grid">
        <ProjectLogCard v-for="project in planned" :key="project.path" :entry="project" />
      </div>
      <div v-if="!projects.length" class="catalog-empty"><h2>还没有发布项目记录</h2><p>真实的作品与构建过程，将在这里陆续记录。</p></div>
    </section>
  </main>
</template>
