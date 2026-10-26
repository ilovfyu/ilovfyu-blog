<script setup lang="ts">
defineProps<{ running: boolean }>()
const values = [1, 2, 3, 4]
</script>

<template>
  <svg class="python-visual" :data-running="running" viewBox="0 0 360 220" fill="none">
    <text class="python-label" x="22" y="20">LIST COMPREHENSION</text>
    <text class="python-code" x="22" y="43">[<tspan class="python-expression">x ** 2</tspan> for x in range(1, 5)]</text>
    <path class="python-bracket" d="M32 61H25V89H32M328 61H335V89H328M32 151H25V179H32M328 151H335V179H328" />
    <g v-for="(value, i) in values" :key="value" :transform="`translate(${48 + i * 76} 0)`" :style="{ '--step-delay': `${i * 1.5}s` }">
      <rect class="python-input" y="61" width="36" height="28" rx="4" />
      <text class="python-value" x="18" y="80" text-anchor="middle">{{ value }}</text>
      <path class="python-thread" d="M18 90V107M18 128V149m-3-4 3 4 3-4" />
      <circle class="python-operation" cx="18" cy="118" r="11" />
      <text class="python-op-label" x="18" y="121" text-anchor="middle">x²</text>
      <g class="python-result">
        <rect class="python-output" y="151" width="36" height="28" rx="4" />
        <text class="python-value python-result-value" x="18" y="170" text-anchor="middle">{{ value ** 2 }}</text>
      </g>
    </g>
    <rect class="python-cursor" x="44" y="57" width="44" height="126" rx="7" />
    <path class="python-rule" d="M22 196H338" />
    <text class="python-label" x="22" y="214">ITERATE</text>
    <text class="python-label" x="180" y="214" text-anchor="middle">EVALUATE</text>
    <text class="python-label" x="338" y="214" text-anchor="end">COLLECT</text>
  </svg>
</template>

<style scoped>
.python-visual { display: block; width: 100%; height: auto; }
.python-label { fill: var(--text-2); font: 8px var(--font-code); letter-spacing: 1px; }
.python-code { fill: var(--text-1); font: 11px var(--font-code); }
.python-expression { fill: var(--topic-accent); }
.python-bracket { stroke: var(--topic-accent); stroke-width: 1.3; }
.python-input { fill: var(--topic-accent); fill-opacity: .09; stroke: var(--topic-accent); stroke-opacity: .45; }
.python-value { fill: var(--text-1); font: 13px var(--font-code); }
.python-thread { stroke: var(--topic-accent); stroke-opacity: .4; stroke-linecap: round; stroke-linejoin: round; }
.python-operation { fill: var(--space-1); stroke: var(--topic-secondary); stroke-opacity: .6; }
.python-op-label { fill: var(--topic-secondary); font: 10px var(--font-code); }
.python-output { fill: var(--topic-secondary); fill-opacity: .1; stroke: var(--topic-secondary); stroke-opacity: .55; }
.python-result-value { fill: var(--topic-secondary); }
.python-cursor { stroke: var(--topic-accent); fill: var(--topic-accent); fill-opacity: .04; opacity: 0; }
.python-rule { stroke: var(--text-2); stroke-opacity: .2; stroke-width: .6; }
.python-visual[data-running="true"] .python-cursor { animation: python-iterate 8s ease-in-out infinite; }
.python-visual[data-running="true"] .python-result { animation: python-collect 8s ease-in-out infinite; animation-delay: var(--step-delay); }
@keyframes python-iterate {
  0%, 4% { transform: translateX(0); opacity: 0; }
  7%, 18% { transform: translateX(0); opacity: 1; }
  25%, 36% { transform: translateX(76px); opacity: 1; }
  44%, 55% { transform: translateX(152px); opacity: 1; }
  63%, 74% { transform: translateX(228px); opacity: 1; }
  82%, 100% { transform: translateX(228px); opacity: 0; }
}
@keyframes python-collect { 0%, 7% { opacity: .25; } 15%, 90% { opacity: 1; } 100% { opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .python-visual * { animation: none !important; } .python-cursor { display: none; } }
</style>
