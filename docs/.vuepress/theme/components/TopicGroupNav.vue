<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { ref } from 'vue'
import type { KnowledgeChapter } from '../utils/knowledge-index'

withDefaults(defineProps<{ chapter: KnowledgeChapter; activeChapter: string; depth?: number }>(), { depth: 0 })
const expanded = ref(true)
</script>

<template>
  <li class="topic-nav-node" :class="{ 'topic-nav-deep': depth >= 3 }">
    <div class="topic-nav-row">
      <button v-if="chapter.children.length" class="topic-nav-toggle" type="button" :aria-expanded="expanded" :aria-controls="`${chapter.id}-children`" :aria-label="`${expanded ? '折叠' : '展开'}${chapter.name}`" @click="expanded = !expanded"><ChevronRight aria-hidden="true" /></button>
      <span v-else class="topic-nav-leaf" aria-hidden="true" />
      <a :href="`#${chapter.id}`" :aria-current="activeChapter === chapter.id ? 'location' : undefined"><span>{{ chapter.name }}</span><small>{{ chapter.count }}</small></a>
    </div>
    <ul v-if="chapter.children.length" v-show="expanded" :id="`${chapter.id}-children`" class="topic-nav-children">
      <TopicGroupNav v-for="child in chapter.children" :key="child.id" :chapter="child" :active-chapter="activeChapter" :depth="depth + 1" />
    </ul>
  </li>
</template>
