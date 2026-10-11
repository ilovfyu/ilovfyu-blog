<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { projects } from '../data/content'
import ProjectCard from './ProjectCard.vue'
const featured = computed(() => projects.filter(project => project.project?.showcase && project.project.order <= 4))
const planned = computed(() => projects.filter(project => !project.project?.showcase || project.project.order > 4))
const showcases = computed(() => projects.filter(project => project.project?.showcase).length)
</script>

<template>
  <main class="project-index catalog-page">
    <header class="catalog-hero project-lab-hero">
      <div class="project-lab-intro">
        <p class="catalog-kicker"><i aria-hidden="true" /> PROJECTS / BUILD IN PUBLIC</p>
        <h1>项目<span>从想法，到作品。</span></h1>
        <p class="catalog-description">记录作品如何从想法走向实现，以及构建过程中的选择与取舍。</p>
        <dl class="project-lab-stats"><div><dt>项目记录</dt><dd>{{ String(projects.length).padStart(2, '0') }}</dd></div><div><dt>产品展示</dt><dd>{{ String(showcases).padStart(2, '0') }}</dd></div><div><dt>持续构建</dt><dd>∞</dd></div></dl>
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
      <div v-if="planned.length && featured.length" class="project-section-heading project-planned-heading"><p>02 / EXPLORATION LOG</p><h2>计划与构建记录</h2></div>
      <div v-if="planned.length" class="project-catalog-grid">
        <article v-for="project in planned" :key="project.path" class="article-card">
          <p class="catalog-kicker">{{ project.label }}</p>
          <span class="project-log-number" aria-hidden="true">{{ String(project.project?.order || 1).padStart(2, '0') }}</span>
          <h2><a :href="withBase(project.path)">{{ project.title }}</a></h2><p>{{ project.summary }}</p>
          <div class="project-display-links"><a v-if="project.project?.showcase" :href="withBase(project.project.showcase)">产品展示 <ArrowUpRight aria-hidden="true" /></a><a :href="withBase(project.path)">项目记录</a></div>
        </article>
      </div>
      <div v-if="!projects.length" class="catalog-empty"><h2>还没有发布项目记录</h2><p>真实的作品与构建过程，将在这里陆续记录。</p></div>
    </section>
  </main>
</template>
