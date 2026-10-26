<script setup lang="ts">
defineProps<{ running: boolean }>()

// A squared-loss example: each weak learner corrects part of the remaining residual.
const rounds = [
  { x: 65, residuals: [18, -10, 14] },
  { x: 180, residuals: [9, -5, 7] },
  { x: 295, residuals: [4.5, -2.5, 3.5] },
]
</script>

<template>
  <svg class="boosting-visual" :data-running="running" viewBox="0 0 360 220" fill="none">
    <text class="boosting-heading" x="22" y="21">GRADIENT BOOSTING</text>
    <text class="boosting-formula" x="22" y="43">F<tspan baseline-shift="sub" font-size="8">m</tspan> = F<tspan baseline-shift="sub" font-size="8">m−1</tspan> + η · h<tspan baseline-shift="sub" font-size="8">m</tspan></text>
    <text class="boosting-label" x="338" y="42" text-anchor="end">ADD A TREE</text>
    <g v-for="(round, i) in rounds" :key="round.x" class="boosting-round" :transform="`translate(${round.x} 0)`" :style="{ '--boost-delay': `${i * 2.2}s` }">
      <path class="boosting-tree-edge" d="M0 65V77L-24 95M0 77L24 95" />
      <path class="boosting-tree-trace" pathLength="1" d="M0 65V77L-24 95M0 77L24 95" />
      <rect class="boosting-root" x="-7" y="56" width="14" height="14" rx="3" />
      <rect class="boosting-leaf" x="-33" y="93" width="18" height="12" rx="2" />
      <rect class="boosting-leaf" x="15" y="93" width="18" height="12" rx="2" />
      <text class="boosting-tree-name" x="0" y="123" text-anchor="middle">η · h{{ ['₁', '₂', '₃'][i] }}</text>
      <text v-if="i < rounds.length - 1" class="boosting-plus" x="57.5" y="92" text-anchor="middle">+</text>
      <g :transform="'translate(0 178)'">
        <path class="boosting-zero" d="M-33 0H33" />
        <g class="boosting-residual-bars">
          <g v-for="(residual, j) in round.residuals" :key="j" :transform="`translate(${(j - 1) * 19} 0)`">
            <path class="boosting-residual" :d="`M0 0V${-residual}`" />
            <circle class="boosting-residual-point" cy="0" :transform="`translate(0 ${-residual})`" r="2.5" />
          </g>
        </g>
      </g>
      <text class="boosting-label" x="0" y="204" text-anchor="middle">ROUND {{ i + 1 }}</text>
    </g>
    <path class="boosting-divider" d="M22 136H338" />
    <text class="boosting-label" x="22" y="150">RESIDUAL / SQUARED LOSS</text>
    <text class="boosting-label" x="338" y="150" text-anchor="end">CORRECT → ADD</text>
    <path class="boosting-residual-flow" d="M108 178H135m-4-3 4 3-4 3M223 178H250m-4-3 4 3-4 3" />
  </svg>
</template>

<style scoped>
.boosting-visual { display: block; width: 100%; height: auto; }
.boosting-heading { fill: var(--topic-accent); font: 10px var(--font-code); letter-spacing: .8px; }
.boosting-formula { fill: var(--text-1); font: 12px var(--font-code); }
.boosting-label { fill: var(--text-2); font: 7px var(--font-code); letter-spacing: .3px; }
.boosting-tree-edge { stroke: var(--topic-accent); stroke-opacity: .35; stroke-width: 1.3; stroke-linejoin: round; }
.boosting-tree-trace { stroke: var(--topic-accent); stroke-width: 1.8; stroke-dasharray: 1; stroke-linejoin: round; }
.boosting-root { fill: var(--space-1); stroke: var(--topic-accent); stroke-width: 1.2; }
.boosting-leaf { fill: var(--topic-accent); fill-opacity: .16; stroke: var(--topic-accent); stroke-opacity: .7; }
.boosting-tree-name { fill: var(--topic-accent); font: 11px var(--font-code); }
.boosting-plus { fill: var(--topic-secondary); font: 20px var(--font-code); }
.boosting-divider { stroke: var(--text-2); stroke-opacity: .2; stroke-width: .6; }
.boosting-zero { stroke: var(--text-2); stroke-opacity: .35; stroke-width: .7; }
.boosting-residual { stroke: var(--topic-secondary); stroke-width: 2; stroke-linecap: round; }
.boosting-residual-point { fill: var(--topic-secondary); }
.boosting-residual-flow { stroke: var(--text-2); stroke-opacity: .4; stroke-width: .8; stroke-linecap: round; stroke-linejoin: round; }
.boosting-visual[data-running="true"] .boosting-tree-trace { animation: boosting-grow 10s ease-in-out infinite; animation-delay: var(--boost-delay); }
.boosting-visual[data-running="true"] .boosting-leaf { animation: boosting-leaf 10s ease-in-out infinite; animation-delay: var(--boost-delay); }
.boosting-visual[data-running="true"] .boosting-residual-bars { animation: boosting-correct 10s ease-in-out infinite; animation-delay: var(--boost-delay); }
@keyframes boosting-grow { 0%, 4% { stroke-dashoffset: 1; opacity: .2; } 16%, 80% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: .2; } }
@keyframes boosting-leaf { 0%, 12%, 100% { fill-opacity: .08; } 22%, 80% { fill-opacity: .35; } }
@keyframes boosting-correct { 0%, 14% { transform: scaleY(1.5); opacity: .35; } 28%, 80%, 100% { transform: scaleY(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .boosting-visual * { animation: none !important; } }
</style>
