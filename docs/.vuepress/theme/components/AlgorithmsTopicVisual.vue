<script setup lang="ts">
defineProps<{ running: boolean }>()
const values = [2, 5, 8, 12, 16, 23, 38, 56]
const steps = [
  { y: 52, label: '01 / COMPARE', low: 0, high: 7, mid: 3 },
  { y: 110, label: '02 / NARROW', low: 4, high: 7, mid: 5 },
  { y: 168, label: '03 / FOUND', low: 5, high: 5, mid: 5 },
]
</script>

<template>
  <svg class="algorithms-visual" :data-running="running" viewBox="0 0 360 240" fill="none">
    <text class="algorithm-heading" x="22" y="20">BINARY SEARCH</text>
    <text class="algorithm-label" x="338" y="20" text-anchor="end">target = 23</text>
    <g v-for="(step, row) in steps" :key="step.label" class="algorithm-step" :style="{ '--step-delay': `${row * 2}s` }">
      <text class="algorithm-label" x="22" :y="step.y - 10">{{ step.label }}</text>
      <g v-for="(value, i) in values" :key="i" :class="{ 'algorithm-discarded': i < step.low || i > step.high }">
        <rect class="algorithm-cell" :x="22 + i * 40" :y="step.y" width="34" height="30" rx="4" />
        <text class="algorithm-value" :x="39 + i * 40" :y="step.y + 20" text-anchor="middle">{{ value }}</text>
      </g>
      <rect :class="row === 2 ? 'algorithm-found' : 'algorithm-probe'" :x="20 + step.mid * 40" :y="step.y - 2" width="38" height="34" rx="5" />
      <path class="algorithm-bounds" :d="`M${22 + step.low * 40} ${step.y + 37}v3h${(step.high - step.low) * 40 + 34}v-3`" />
    </g>
    <path class="algorithm-rule" d="M22 220H338" />
    <text class="algorithm-label" x="22" y="236">ORDERED ARRAY</text>
    <text class="algorithm-label" x="338" y="236" text-anchor="end">O(log n)</text>
  </svg>
</template>

<style scoped>
.algorithms-visual { display: block; width: 100%; height: auto; }
.algorithm-heading { fill: var(--topic-accent); font: 10px var(--font-code); letter-spacing: .8px; }
.algorithm-label { fill: var(--text-2); font: 8px var(--font-code); }
.algorithm-cell { fill: var(--topic-accent); fill-opacity: .07; stroke: var(--topic-accent); stroke-opacity: .45; }
.algorithm-value { fill: var(--text-1); font: 11px var(--font-code); }
.algorithm-discarded { opacity: .25; }
.algorithm-probe { stroke: var(--topic-accent); stroke-width: 1.8; }
.algorithm-found { stroke: var(--topic-secondary); stroke-width: 2; fill: var(--topic-secondary); fill-opacity: .13; }
.algorithm-bounds { stroke: var(--topic-accent); stroke-opacity: .6; }
.algorithm-rule { stroke: var(--text-2); stroke-opacity: .2; }
.algorithms-visual[data-running="true"] .algorithm-step { animation: algorithm-inspect 6s ease-in-out infinite; animation-delay: var(--step-delay); }
@keyframes algorithm-inspect { 0%, 30% { opacity: 1; } 40%, 90% { opacity: .4; } 100% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .algorithm-step { animation: none !important; } }
</style>
