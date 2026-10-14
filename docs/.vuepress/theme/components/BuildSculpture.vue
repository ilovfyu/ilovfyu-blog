<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
const surface = ref<HTMLElement | null>(null)
const running = useSceneMotion(surface)
</script>

<template>
  <div ref="surface" class="build-sculpture" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <div class="build-sculpture-aura" />
    <svg viewBox="0 0 480 320" fill="none">
      <path class="sculpture-ground" d="m32 238 208 70 208-70-208-70zM80 222l208 70M128 206l208 70M176 190l208 70M80 254l208-70M128 270l208-70M176 286l208-70" />
      <path class="sculpture-conduit" d="M34 138h54l50 30M446 122h-48l-62 42M34 248h55l53-33M446 236h-58l-49-29" />
      <path class="sculpture-data" d="M34 138h54l50 30M446 122h-48l-62 42" />
      <path class="sculpture-data reverse" d="M34 248h55l53-33M446 236h-58l-49-29" />
      <g class="sculpture-layer layer-foundation">
        <path class="sculpture-depth" d="m112 223 128 52 128-52v10l-128 52-128-52z" />
        <path class="sculpture-pane" d="m112 223 128-52 128 52-128 52z" />
        <path class="sculpture-rule" d="m144 223 96 39 96-39m-144-19 96 39m-64-52 96 39M192 256l96-39m-128 26 96-39" />
        <path class="sculpture-bright" d="m112 223 128 52 128-52" />
      </g>
      <g class="sculpture-layer layer-architecture">
        <path class="sculpture-depth" d="m132 166 108 44 108-44v8l-108 44-108-44z" />
        <path class="sculpture-pane secondary" d="m132 166 108-44 108 44-108 44z" />
        <path class="sculpture-rule" d="m158 166 82-33 82 33-82 33zM158 166l82 33m0-66 82 33" />
        <path class="sculpture-slot" d="m188 165 35-14 27 11-35 14zm42 17 35-14 27 11-35 14z" />
        <path class="sculpture-bright secondary" d="m132 166 108 44 108-44" />
      </g>
      <path class="sculpture-thread" d="M240 62v211M153 184v51M327 184v51" />
      <path class="sculpture-thread sculpture-data vertical" d="M240 62v211" />
      <g class="sculpture-layer layer-idea">
        <path class="sculpture-volume" d="m190 89 50-27 50 27v44l-50 27-50-27z" />
        <path class="sculpture-pane" d="m190 89 50-27 50 27-50 27z" />
        <path class="sculpture-side" d="m240 116 50-27v44l-50 27z" />
        <path class="sculpture-bright" d="m190 89 50 27 50-27m-50 27v44" />
        <path class="sculpture-core" d="m210 89 30-16 30 16-30 16z" />
        <path class="sculpture-glyph" d="m224 86-7 4 7 4m32-8 7 4-7 4m-14-12-5 16" />
      </g>
      <g class="sculpture-markers"><path d="M24 106v-10h25M456 254v10h-25M24 270h7m9 0h7M449 84h7m-16 0h-7" /><text x="24" y="84">IDEA / STRUCTURE</text><text x="300" y="300">BUILD / IN MOTION</text></g>
      <g class="sculpture-sparks"><path d="M88 186h8m-4-4v8M391 178h8m-4-4v8M304 62h6m-3-3v6" /></g>
    </svg>
    <span class="build-sculpture-caption">想法成形，层层构建。</span>
  </div>
</template>
