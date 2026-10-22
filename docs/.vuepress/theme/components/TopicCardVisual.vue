<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
import { topicAppearance } from '../data/topics'
import MathTopicVisual from './MathTopicVisual.vue'
import LearningTopicVisual from './LearningTopicVisual.vue'
import DataAnalysisTopicVisual from './DataAnalysisTopicVisual.vue'

const props = defineProps<{ name: string }>()
const appearance = computed(() => topicAppearance(props.name))
const kind = computed(() => appearance.value.kind)
const stage = ref<HTMLElement | null>(null)
const running = useSceneMotion(stage)
</script>

<template>
  <div ref="stage" class="topic-visual" :data-kind="kind" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <MathTopicVisual v-if="kind === 'calculus' || kind === 'algebra' || kind === 'probability'" :kind="kind" :running="running" />
    <LearningTopicVisual v-else-if="kind === 'learning'" :running="running" />
    <DataAnalysisTopicVisual v-else-if="kind === 'analysis'" :running="running" />
    <span v-if="appearance.caption" class="topic-visual-caption">{{ appearance.caption }}</span>
  </div>
</template>

<style scoped>
.topic-visual { position: relative; min-width: 0; width: 100%; max-width: 360px; justify-self: end; padding-bottom: 24px; }
.topic-visual-caption { position: absolute; bottom: 0; width: 100%; text-align: center; font: 9px/1.5 var(--font-code); color: var(--text-2); letter-spacing: .04em; }
</style>
