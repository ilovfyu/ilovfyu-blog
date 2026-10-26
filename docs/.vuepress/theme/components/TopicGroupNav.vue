<script setup lang="ts">
import { ChevronRight, FileText, Folder, FolderOpen } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { flattenKnowledgeChapters, knowledgeNoteId, type KnowledgeChapter } from '../utils/knowledge-index'

const props = withDefaults(defineProps<{ chapter: KnowledgeChapter; activeChapter: string; activeNote?: string; reveal?: string; destinations?: Record<string, string> }>(), { activeNote: '', reveal: '', destinations: () => ({}) })
const expanded = ref(true)
const hasChildren = computed(() => !!props.chapter.children.length || !!props.chapter.entries.length)
const descendants = computed(() => flattenKnowledgeChapters([props.chapter]))
const currentFolder = computed(() => props.activeChapter === props.chapter.id && !props.activeNote)
const activeAncestor = computed(() => !currentFolder.value && descendants.value.some(chapter => chapter.id === props.activeChapter))
const href = (id: string) => props.destinations[id] || `#${id}`
watch(() => props.reveal, id => {
  if (descendants.value.some(chapter => chapter.id === id || chapter.entries.some(note => knowledgeNoteId(note.path) === id))) expanded.value = true
})
</script>

<template>
  <!-- Root articles stay at the topic root, without inventing an "ungrouped" source directory. -->
  <template v-if="!chapter.path.length">
    <li v-for="note in chapter.entries" :key="note.path" class="topic-nav-article"><div class="topic-nav-row"><span class="topic-nav-spacer" aria-hidden="true" /><a :href="href(knowledgeNoteId(note.path))" :aria-current="activeNote === knowledgeNoteId(note.path) ? 'location' : undefined"><FileText aria-hidden="true" /><span class="topic-nav-label">{{ note.title }}</span></a></div></li>
  </template>
  <li v-else class="topic-nav-node">
    <div class="topic-nav-row" :class="{ 'topic-nav-ancestor': activeAncestor }">
      <button v-if="hasChildren" class="topic-nav-toggle" type="button" :aria-expanded="expanded" :aria-controls="`${chapter.id}-children`" :aria-label="`${expanded ? '折叠' : '展开'}${chapter.name}`" @click="expanded = !expanded"><ChevronRight aria-hidden="true" /></button>
      <span v-else class="topic-nav-spacer" aria-hidden="true" />
      <a :href="href(chapter.id)" :aria-current="currentFolder ? 'location' : undefined" @click="expanded = true"><component :is="expanded ? FolderOpen : Folder" aria-hidden="true" /><span class="topic-nav-label">{{ chapter.name }}</span><small>{{ chapter.count }}</small></a>
    </div>
    <ul v-if="hasChildren" v-show="expanded" :id="`${chapter.id}-children`" class="topic-nav-children">
      <li v-for="note in chapter.entries" :key="note.path" class="topic-nav-article"><div class="topic-nav-row"><span class="topic-nav-spacer" aria-hidden="true" /><a :href="href(knowledgeNoteId(note.path))" :aria-current="activeNote === knowledgeNoteId(note.path) ? 'location' : undefined"><FileText aria-hidden="true" /><span class="topic-nav-label">{{ note.title }}</span></a></div></li>
      <TopicGroupNav v-for="child in chapter.children" :key="child.id" :chapter="child" :active-chapter="activeChapter" :active-note="activeNote" :reveal="reveal" :destinations="destinations" />
    </ul>
  </li>
</template>
