<script setup lang="ts">
defineProps<{ running: boolean }>()
</script>

<template>
  <svg class="typescript-visual" :data-running="running" viewBox="0 0 360 220" fill="none">
    <text class="ts-heading" x="22" y="21">TYPE NARROWING</text>
    <rect class="ts-union" x="63" y="34" width="234" height="30" rx="5" />
    <text class="ts-code" x="180" y="54" text-anchor="middle">value: <tspan class="ts-string">string</tspan> | <tspan class="ts-number">number</tspan></text>
    <path class="ts-stem" d="M180 65V79" />
    <path class="ts-guard" d="m180 79 111 30-111 30-111-30Z" />
    <text class="ts-guard-code" x="180" y="112" text-anchor="middle">typeof value === "string"</text>
    <g class="ts-branch ts-true">
      <path class="ts-branch-line" pathLength="1" d="M111 121H89Q80 121 80 130V155m-3-4 3 4 3-4" />
      <text class="ts-label" x="32" y="141">true</text>
      <rect class="ts-type" x="22" y="156" width="144" height="41" rx="5" />
      <text class="ts-type-name" x="94" y="171" text-anchor="middle">string</text>
      <text class="ts-method" x="94" y="187" text-anchor="middle">value.toUpperCase()</text>
    </g>
    <g class="ts-branch ts-false">
      <path class="ts-branch-line" pathLength="1" d="M249 121H271Q280 121 280 130V155m-3-4 3 4 3-4" />
      <text class="ts-label" x="303" y="141">false</text>
      <rect class="ts-type" x="194" y="156" width="144" height="41" rx="5" />
      <text class="ts-type-name" x="266" y="171" text-anchor="middle">number</text>
      <text class="ts-method" x="266" y="187" text-anchor="middle">value.toFixed(2)</text>
    </g>
    <text class="ts-label" x="180" y="215" text-anchor="middle">UNION → GUARD → SAFE ACCESS</text>
  </svg>
</template>

<style scoped>
.typescript-visual { display: block; width: 100%; height: auto; }
.ts-heading { fill: var(--topic-accent); font: 10px var(--font-code); letter-spacing: .8px; }
.ts-union { fill: var(--space-1); stroke: var(--topic-accent); stroke-opacity: .45; }
.ts-code { fill: var(--text-1); font: 11px var(--font-code); }
.ts-string { fill: var(--topic-accent); }.ts-number { fill: var(--topic-secondary); }
.ts-stem { stroke: var(--text-2); stroke-opacity: .4; }
.ts-guard { stroke: var(--topic-accent); stroke-opacity: .7; fill: var(--topic-accent); fill-opacity: .05; }
.ts-guard-code { fill: var(--text-1); font: 10px var(--font-code); }
.ts-branch { --branch-color: var(--topic-accent); }.ts-false { --branch-color: var(--topic-secondary); }
.ts-branch-line { stroke: var(--branch-color); stroke-opacity: .65; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; }
.ts-label { fill: var(--text-2); font: 8px var(--font-code); }
.ts-type { fill: var(--branch-color); fill-opacity: .07; stroke: var(--branch-color); stroke-opacity: .6; }
.ts-type-name { fill: var(--branch-color); font: 11px var(--font-code); }
.ts-method { fill: var(--text-1); font: 9px var(--font-code); }
.typescript-visual[data-running="true"] .ts-branch-line { animation: ts-narrow-path 9s ease-in-out infinite; }
.typescript-visual[data-running="true"] .ts-type { animation: ts-narrow-type 9s ease-in-out infinite; }
.typescript-visual[data-running="true"] .ts-false :is(.ts-branch-line, .ts-type) { animation-delay: -4.5s; }
@keyframes ts-narrow-path { 0%, 5% { stroke-dashoffset: 1; stroke-opacity: .2; } 24%, 43% { stroke-dashoffset: 0; stroke-opacity: 1; } 52%, 100% { stroke-dashoffset: 0; stroke-opacity: .25; } }
@keyframes ts-narrow-type { 0%, 19%, 60%, 100% { fill-opacity: .04; stroke-opacity: .35; } 29%, 43% { fill-opacity: .2; stroke-opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .typescript-visual * { animation: none !important; } }
</style>
