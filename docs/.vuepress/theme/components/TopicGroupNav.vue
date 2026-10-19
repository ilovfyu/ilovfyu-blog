<script setup lang="ts">
import { ChevronRight, FileText } from '@lucide/vue'
import { computed, ref } from 'vue'
import { knowledgeNoteId, type KnowledgeChapter } from '../utils/knowledge-index'

const props = withDefaults(defineProps<{ chapter: KnowledgeChapter; activeChapter: string; destinations?: Record<string, string> }>(), { destinations: () => ({}) })
const expanded = ref(true)
const hasChildren = computed(() => !!props.chapter.children.length || !!props.chapter.entries.length)
const href = (id: string) => props.destinations[id] || `#${id}`
</script>

<template>
  <!-- Root articles stay at the topic root, without inventing an "ungrouped" source directory. -->
  <template v-if="!chapter.path.length">
    <li v-for="note in chapter.entries" :key="note.path" class="topic-nav-article"><a :href="href(knowledgeNoteId(note.path))"><FileText aria-hidden="true" /><span>{{ note.title }}</span></a></li>
  </template>
  <li v-else class="topic-nav-node">
    <div class="topic-nav-row">
      <button v-if="hasChildren" class="topic-nav-toggle" type="button" :aria-expanded="expanded" :aria-controls="`${chapter.id}-children`" :aria-label="`${expanded ? '折叠' : '展开'}${chapter.name}`" @click="expanded = !expanded"><ChevronRight aria-hidden="true" /></button>
      <span v-else class="topic-nav-leaf" aria-hidden="true" />
      <a :href="href(chapter.id)" :aria-current="activeChapter === chapter.id ? 'location' : undefined"><span>{{ chapter.name }}</span><small>{{ chapter.count }}</small></a>
    </div>
    <ul v-if="hasChildren" v-show="expanded" :id="`${chapter.id}-children`" class="topic-nav-children">
      <li v-for="note in chapter.entries" :key="note.path" class="topic-nav-article"><a :href="href(knowledgeNoteId(note.path))"><FileText aria-hidden="true" /><span>{{ note.title }}</span></a></li>
      <TopicGroupNav v-for="child in chapter.children" :key="child.id" :chapter="child" :active-chapter="activeChapter" :destinations="destinations" />
    </ul>
  </li>
</template>
