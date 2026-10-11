<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { withBase } from 'vuepress/client'
import { projects } from '../data/content'
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
      <div v-if="projects.length" class="project-catalog-grid">
        <a v-for="project in projects" :key="project.path" class="article-card" :href="withBase(project.path)">
          <p class="catalog-kicker">{{ project.label }}</p>
          <h2>{{ project.title }}</h2><p>{{ project.summary }}</p>
          <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
      <div v-else class="catalog-empty"><h2>还没有发布项目记录</h2><p>真实的作品与构建过程，将在这里陆续记录。</p></div>
    </section>
  </main>
</template>
