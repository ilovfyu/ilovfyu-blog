<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
const surface = ref<HTMLElement | null>(null)
const running = useSceneMotion(surface)
</script>

<template>
  <div ref="surface" class="writing-trail" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <span>思考，仍在继续。</span>
    <svg viewBox="0 0 760 94" fill="none">
      <path class="writing-guides" d="M0 64h760M340 35v45m60-53v60m60-64v54m60-34v36m60-20v16" />
      <path class="writing-ink" d="M12 64h226c20 0 24-32 39-32s-6 51 15 51 20-65 36-65 4 67 23 67 10-41 28-41 0 34 20 34 7-20 28-20 11 13 38 13 40-7 67-7h216" />
      <path class="writing-ink-flow" d="M12 64h226c20 0 24-32 39-32s-6 51 15 51 20-65 36-65 4 67 23 67 10-41 28-41 0 34 20 34 7-20 28-20 11 13 38 13 40-7 67-7h216" />
      <path class="writing-flakes" d="M552 37h12m-6-6v12M620 72h6m-3-3v6M193 42h6" />
    </svg>
    <small>NOTES / IN THE MAKING</small>
  </div>
</template>
