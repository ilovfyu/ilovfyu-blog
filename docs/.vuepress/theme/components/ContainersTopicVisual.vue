<script setup lang="ts">
defineProps<{ running: boolean }>()
const containers = [{ x: 22, name: 'CONTAINER A' }, { x: 195, name: 'CONTAINER B' }]
const layers = [{ y: 151, name: 'APP / DEPENDENCIES' }, { y: 173, name: 'BASE FILESYSTEM' }]
</script>

<template>
  <svg class="containers-visual" :data-running="running" viewBox="0 0 360 240" fill="none">
    <text class="container-heading" x="22" y="20">IMAGE / ISOLATION</text>
    <g v-for="container in containers" :key="container.name">
      <rect class="container-namespace" :x="container.x" y="36" width="143" height="86" rx="7" />
      <text class="container-label" :x="container.x + 71.5" y="51" text-anchor="middle">{{ container.name }}</text>
      <rect class="container-process" :x="container.x + 12" y="61" width="119" height="22" rx="3" />
      <text class="container-code" :x="container.x + 71.5" y="76" text-anchor="middle">isolated process</text>
      <rect class="container-writable" :x="container.x + 12" y="91" width="119" height="20" rx="3" />
      <text class="container-label" :x="container.x + 71.5" y="104" text-anchor="middle">WRITABLE / CoW</text>
    </g>
    <path class="container-copy-route" d="M93 151V123m-4 4 4-4 4 4M266 151V123m-4 4 4-4 4 4" />
    <text class="container-label" x="180" y="138" text-anchor="middle">SHARED IMAGE</text>
    <g v-for="layer in layers" :key="layer.name">
      <rect class="container-image-layer" x="22" :y="layer.y" width="316" height="18" rx="3" />
      <text class="container-label" x="180" :y="layer.y + 12" text-anchor="middle">{{ layer.name }} / READ ONLY</text>
    </g>
    <g v-if="running" class="container-copy">
      <rect x="-4" y="-3" width="8" height="6" rx="1" />
      <animateMotion path="M93 160V101" dur="5s" keyPoints="0;0;1;1" keyTimes="0;.15;.65;1" calcMode="linear" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.15;.65;.7;1" dur="5s" repeatCount="indefinite" />
    </g>
    <rect class="container-kernel" x="22" y="201" width="316" height="25" rx="4" />
    <text class="container-code" x="180" y="217" text-anchor="middle">SHARED KERNEL / namespaces + cgroups</text>
  </svg>
</template>

<style scoped>
.containers-visual { display: block; width: 100%; height: auto; }
.container-heading { fill: var(--topic-accent); font: 10px var(--font-code); letter-spacing: .8px; }
.container-label { fill: var(--text-2); font: 8px var(--font-code); }
.container-code { fill: var(--text-1); font: 9px var(--font-code); }
.container-namespace { stroke: var(--topic-accent); stroke-dasharray: 4 3; stroke-opacity: .65; }
.container-process { fill: var(--topic-accent); fill-opacity: .09; stroke: var(--topic-accent); stroke-opacity: .5; }
.container-writable { fill: var(--topic-secondary); fill-opacity: .12; stroke: var(--topic-secondary); stroke-opacity: .7; }
.container-copy-route { stroke: var(--topic-secondary); stroke-linecap: round; stroke-linejoin: round; }
.container-image-layer { fill: var(--topic-accent); fill-opacity: .07; stroke: var(--topic-accent); stroke-opacity: .45; }
.container-kernel { fill: var(--space-2); stroke: var(--topic-accent); stroke-opacity: .5; }
.container-copy { fill: var(--topic-secondary); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .container-copy { display: none; } }
</style>
