<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { computed } from 'vue'
import { withBase } from 'vuepress/client'
import { projects } from '../data/content'
import ProjectCard from './ProjectCard.vue'
const featured = computed(() => projects.filter(project => project.project?.showcase && project.project.order <= 4))
const planned = computed(() => projects.filter(project => !project.project?.showcase || project.project.order > 4))
</script>

<template>
  <main class="project-index catalog-page">
    <header class="catalog-hero">
      <p class="catalog-kicker">BUILD / PROJECT NOTES</p>
      <h1>项目</h1>
      <p class="catalog-description">记录作品如何从想法走向实现，以及构建过程中的选择与取舍。</p>
      <span class="catalog-count">{{ projects.length }} 个项目</span>
    </header>
    <section class="catalog-body" aria-label="项目目录">
      <div v-if="featured.length" class="project-display-grid">
        <ProjectCard v-for="project in featured" :key="project.path" :entry="project" />
      </div>
      <h2 v-if="planned.length && featured.length" class="project-planned-heading">计划中的项目</h2>
      <div v-if="planned.length" class="project-catalog-grid">
        <article v-for="project in planned" :key="project.path" class="article-card">
          <p class="catalog-kicker">{{ project.label }}</p>
          <h2><a :href="withBase(project.path)">{{ project.title }}</a></h2><p>{{ project.summary }}</p>
          <div class="project-display-links"><a v-if="project.project?.showcase" :href="withBase(project.project.showcase)">产品展示 <ArrowUpRight aria-hidden="true" /></a><a :href="withBase(project.path)">项目记录</a></div>
        </article>
      </div>
      <div v-if="!projects.length" class="catalog-empty"><h2>还没有发布项目记录</h2><p>真实的作品与构建过程，将在这里陆续记录。</p></div>
    </section>
  </main>
</template>
