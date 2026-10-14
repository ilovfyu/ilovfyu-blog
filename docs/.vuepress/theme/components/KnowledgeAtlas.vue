<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
withDefaults(defineProps<{ selectedTags?: number; resultCount?: number; filtered?: boolean }>(), { selectedTags: 0, resultCount: 0, filtered: false })
const scene = ref<HTMLElement | null>(null)
const active = useSceneMotion(scene)
</script>

<template>
  <div ref="scene" class="knowledge-atlas" :class="{ 'atlas-active': active, 'atlas-filtered': filtered }" aria-hidden="true">
    <div class="atlas-aura" />
    <div class="atlas-world">
      <div class="atlas-floor" /><div class="atlas-floor-sweep" />
      <div class="atlas-orbit orbit-one"><i /><b /></div><div class="atlas-orbit orbit-two"><i /></div>
      <div class="atlas-sheet sheet-notes"><b class="atlas-refraction" /><span>NOTES</span><div><i v-for="n in 9" :key="n" /></div></div>
      <div class="atlas-sheet sheet-tags"><span>{{ selectedTags ? `${selectedTags} TAGS` : 'TAGS' }}</span><div><i v-for="n in 6" :key="n" :class="{ 'atlas-selected': n <= selectedTags }" /></div></div>
      <div class="atlas-sheet sheet-topics"><b class="atlas-refraction" /><span>{{ filtered ? `${resultCount} MATCHES` : 'LINKS' }}</span><div><i v-for="n in 3" :key="n" /></div></div>
      <svg class="atlas-bridges" viewBox="0 0 280 280" fill="none"><path d="M40 140C40 40 240 40 240 140S40 240 40 140M80 220L140 60L210 220" /><path class="atlas-packets" d="M40 140C40 40 240 40 240 140S40 240 40 140M80 220L140 60L210 220" /></svg>
    </div>
    <div class="atlas-fiducials"><i /><i /><i /><i /></div><span class="atlas-coordinate">KNOWLEDGE / CONSTELLATION</span><span class="atlas-caption">{{ filtered ? `关联已聚合 · ${resultCount} 篇匹配笔记` : '检索 · 关联 · 沉淀' }}</span>
  </div>
</template>
