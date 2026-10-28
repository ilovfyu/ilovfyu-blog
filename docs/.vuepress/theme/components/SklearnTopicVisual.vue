<script setup lang="ts">
defineProps<{ running: boolean }>()
const folds = [0, 1, 2]
</script>

<template>
  <svg class="sklearn-visual" :data-running="running" viewBox="0 0 360 220" fill="none">
    <text class="sklearn-heading" x="18" y="19">SPLIT → PIPELINE → EVALUATE</text>
    <rect class="sklearn-pipeline" x="100" y="34" width="208" height="108" rx="10" />
    <text class="sklearn-label" x="204" y="47" text-anchor="middle">FIT ON TRAIN · REUSE ON TEST</text>
    <g v-for="(lane, i) in ['TRAIN', 'TEST']" :key="lane" :class="['sklearn-lane', i ? 'sklearn-test' : 'sklearn-train']" :transform="`translate(0 ${i * 49})`">
      <text class="sklearn-lane-label" x="18" y="54">{{ lane }}</text>
      <g class="sklearn-samples">
        <rect v-for="n in 6" :key="n" :x="18 + ((n - 1) % 3) * 10" :y="61 + Math.floor((n - 1) / 3) * 9" width="7" height="6" rx="1" />
      </g>
      <path class="sklearn-flow" d="M49 70H110M169 70H216M278 70H330" />
      <path class="sklearn-trace" pathLength="1" d="M49 70H110M169 70H216M278 70H330" />
      <path class="sklearn-arrows" d="m105 67 5 3-5 3m106-6 5 3-5 3m109-6 5 3-5 3" />
      <rect class="sklearn-step" x="110" y="57" width="59" height="26" rx="5" />
      <rect class="sklearn-step" x="216" y="57" width="62" height="26" rx="5" />
      <text class="sklearn-method" x="139.5" y="73" text-anchor="middle">{{ i ? 'transform' : 'fit' }}</text>
      <text class="sklearn-method" x="247" y="73" text-anchor="middle">{{ i ? 'predict' : 'fit' }}</text>
      <circle class="sklearn-result" cx="337" cy="70" r="7" />
    </g>
    <text class="sklearn-label" x="204" y="94" text-anchor="middle">SCALER → ESTIMATOR</text>
    <path class="sklearn-reuse" d="M139.5 84V105m-3-4 3 4 3-4M247 84V105m-3-4 3 4 3-4" />
    <text class="sklearn-label" x="18" y="161">CROSS-VALIDATION / TRAIN PARTITION</text>
    <g v-for="fold in folds" :key="fold" class="sklearn-fold" :transform="`translate(18 ${174 + fold * 12})`" :style="{ '--fold-delay': `${fold * 2}s` }">
      <rect v-for="cell in 5" :key="cell" :x="(cell - 1) * 27" width="23" height="7" rx="1.5" :class="cell === fold + 1 ? 'sklearn-validation' : 'sklearn-fit-fold'" />
      <path class="sklearn-fold-score" d="M139 3.5H155m-4-3 4 3-4 3" />
      <text class="sklearn-label" x="163" y="6">CV {{ fold + 1 }}</text>
    </g>
    <path class="sklearn-holdout" d="M291 155V207" />
    <rect class="sklearn-test-set" x="306" y="176" width="35" height="19" rx="4" />
    <text class="sklearn-label" x="323.5" y="168" text-anchor="middle">HELD OUT</text>
    <text class="sklearn-method" x="323.5" y="188" text-anchor="middle">test</text>
  </svg>
</template>

<style scoped>
.sklearn-visual { display: block; width: 100%; height: auto; }
.sklearn-heading { fill: var(--topic-accent); font: 9px var(--font-code); letter-spacing: .7px; }
.sklearn-label { fill: var(--text-2); font: 6.5px var(--font-code); letter-spacing: .2px; }
.sklearn-pipeline { fill: var(--topic-accent); fill-opacity: .035; stroke: var(--topic-accent); stroke-opacity: .25; stroke-dasharray: 3 3; }
.sklearn-train { --lane: var(--topic-accent); }
.sklearn-test { --lane: var(--topic-secondary); }
.sklearn-lane-label { fill: var(--lane); font: 7px var(--font-code); letter-spacing: .8px; }
.sklearn-samples rect, .sklearn-result { fill: var(--lane); fill-opacity: .6; }
.sklearn-flow, .sklearn-arrows { stroke: var(--lane); stroke-opacity: .4; stroke-width: 1; }
.sklearn-trace { stroke: var(--lane); stroke-width: 1.5; stroke-dasharray: 1; }
.sklearn-step { fill: var(--space-1); stroke: var(--lane); stroke-opacity: .7; }
.sklearn-method { fill: var(--text-1); font: 8px var(--font-code); }
.sklearn-reuse { stroke: var(--text-2); stroke-opacity: .5; stroke-dasharray: 2 2; stroke-width: .8; }
.sklearn-fit-fold { fill: var(--topic-accent); fill-opacity: .3; }
.sklearn-validation { fill: var(--topic-secondary); fill-opacity: .85; }
.sklearn-fold-score { stroke: var(--topic-secondary); stroke-opacity: .5; stroke-width: .8; }
.sklearn-holdout { stroke: var(--text-2); stroke-opacity: .25; stroke-dasharray: 2 3; }
.sklearn-test-set { fill: var(--topic-secondary); fill-opacity: .12; stroke: var(--topic-secondary); stroke-opacity: .6; }
.sklearn-visual[data-running="true"] .sklearn-trace { animation: sklearn-pass 8s ease-in-out infinite; }
.sklearn-visual[data-running="true"] .sklearn-test .sklearn-trace { animation-delay: 3s; }
.sklearn-visual[data-running="true"] .sklearn-validation { animation: sklearn-fold 8s ease-in-out infinite; animation-delay: var(--fold-delay); }
@keyframes sklearn-pass { 0%, 7% { stroke-dashoffset: 1; opacity: .25; } 36%, 80% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: .25; } }
@keyframes sklearn-fold { 0%, 8%, 100% { fill-opacity: .4; } 22%, 64% { fill-opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sklearn-visual * { animation: none !important; } }
</style>
