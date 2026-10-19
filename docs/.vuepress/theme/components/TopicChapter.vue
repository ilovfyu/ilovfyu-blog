<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpRight } from '@lucide/vue'
import { withBase } from 'vuepress/client'
import { flattenKnowledgeChapters, knowledgeNoteId, type KnowledgeChapter } from '../utils/knowledge-index'

const props = withDefaults(defineProps<{ chapter: KnowledgeChapter; activeChapter: string; depth?: number }>(), { depth: 0 })
const visibleCount = computed(() => flattenKnowledgeChapters([props.chapter]).reduce((count, item) => count + item.entries.length, 0))
</script>

<template>
  <section :id="chapter.id" class="topic-chapter" :class="{ 'chapter-active': activeChapter === chapter.id, 'topic-subchapter': depth > 0 }" :aria-labelledby="chapter.path.length ? `${chapter.id}-title` : undefined" :aria-label="!chapter.path.length ? '专题直属文章' : undefined">
    <header v-if="chapter.path.length" class="topic-section-heading topic-directory-heading">
      <div>
        <p v-if="chapter.path.length > 1" class="topic-directory-breadcrumb">{{ chapter.path.slice(0, -1).join(' / ') }}</p>
        <component :is="`h${Math.min(depth + 2, 6)}`" :id="`${chapter.id}-title`" class="topic-directory-title">{{ chapter.name }}</component>
      </div>
      <span>共 {{ chapter.count }} 篇笔记<template v-if="visibleCount < chapter.count"> · 本页 {{ visibleCount }} 篇</template></span>
    </header>
    <div v-if="chapter.entries.length" class="topic-chapter-list">
      <a v-for="note in chapter.entries" :key="note.path" :id="knowledgeNoteId(note.path)" :href="withBase(note.path)" class="topic-reading-link"><div><strong class="topic-note-title">{{ note.title }}</strong><p v-if="note.summary">{{ note.summary }}</p></div><ArrowUpRight aria-hidden="true" /></a>
    </div>
    <div v-if="chapter.children.length" class="topic-subchapters">
      <TopicChapter v-for="child in chapter.children" :key="child.id" :chapter="child" :active-chapter="activeChapter" :depth="depth + 1" />
    </div>
  </section>
</template>
