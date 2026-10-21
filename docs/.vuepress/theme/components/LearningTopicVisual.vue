<script setup lang="ts">
defineProps<{ running: boolean }>()

const layers = [
  { x: 46, ys: [61, 101, 141] },
  { x: 128, ys: [41, 81, 121, 161] },
  { x: 214, ys: [61, 101, 141] },
  { x: 300, ys: [81, 121] },
]
const connections = layers.slice(0, -1).flatMap((layer, i) => layer.ys.flatMap((y, from) => layers[i + 1].ys.map((nextY, to) => ({
  path: `M${layer.x} ${y}L${layers[i + 1].x} ${nextY}`,
  opacity: .13 + ((from * 3 + to + i) % 4) * .06,
}))))
const routes = ['M46 61L128 81L214 101L300 81', 'M46 141L128 121L214 61L300 121']
</script>

<template>
  <svg class="learning-visual" :data-running="running" viewBox="0 0 360 220" fill="none">
    <path class="learning-grid" d="M25 41H327M25 81H327M25 121H327M25 161H327M46 29V170M128 29V170M214 29V170M300 29V170" />
    <text class="learning-formula" x="28" y="21">ŷ = f<tspan baseline-shift="sub" font-size="10">θ</tspan>(x)</text>
    <text class="learning-label" x="322" y="20" text-anchor="end">NEURAL NETWORK</text>
    <g class="learning-connections"><path v-for="edge in connections" :key="edge.path" :d="edge.path" :opacity="edge.opacity" /></g>
    <path v-for="route in routes" :key="route" class="learning-route" :d="route" />
    <g v-for="(layer, index) in layers" :key="layer.x" class="learning-layer" :style="{ '--layer-delay': `${index * 2.2}s` }">
      <g v-for="y in layer.ys" :key="y">
        <circle class="learning-node-halo" :cx="layer.x" :cy="y" r="13" />
        <circle class="learning-node" :class="{ 'learning-output': index === layers.length - 1 }" :cx="layer.x" :cy="y" r="6" />
        <circle class="learning-node-center" :cx="layer.x" :cy="y" r="2" />
      </g>
    </g>
    <g v-if="running" class="learning-signals">
      <g v-for="(route, index) in routes" :key="route" :class="{ 'learning-signal-secondary': index === 1 }">
        <circle class="learning-signal-glow" r="8" /><circle class="learning-signal" r="3" />
        <animateMotion :path="route" dur="7.2s" :begin="`${index * -3.6}s`" repeatCount="indefinite" />
      </g>
    </g>
    <text class="learning-label" x="46" y="183" text-anchor="middle">INPUT</text>
    <text class="learning-label" x="171" y="183" text-anchor="middle">HIDDEN LAYERS</text>
    <text class="learning-label" x="300" y="183" text-anchor="middle">OUTPUT</text>
    <path class="learning-divider" d="M28 197H327" />
    <text class="learning-label learning-loss-label" x="30" y="215">LOSS ↓</text>
    <path class="learning-loss-axis" d="M87 203V217H191" />
    <path class="learning-loss" d="M91 204C100 204 99 213 112 210S119 216 132 214S150 217 184 216" />
    <circle class="learning-loss-point" cx="184" cy="216" r="2" />
    <text class="learning-label" x="325" y="214" text-anchor="end">LEARN → PREDICT</text>
  </svg>
</template>

<style scoped>
.learning-visual { --learning-secondary: var(--fx-cyan); display: block; width: 100%; height: auto; overflow: visible; }
.learning-grid { stroke: var(--topic-accent); stroke-width: .7; opacity: .08; }
.learning-formula { fill: var(--topic-accent); font: italic 17px Georgia, 'Times New Roman', serif; }
.learning-label { fill: var(--text-2); font: 8px var(--font-code); letter-spacing: 1px; }
.learning-connections path { stroke: var(--topic-accent); stroke-width: .9; }
.learning-route { stroke: var(--topic-accent); stroke-width: 1.2; opacity: .35; transition: opacity .3s; }
.learning-node { fill: var(--space-1); stroke: var(--topic-accent); stroke-width: 1.2; }
.learning-node-center { fill: var(--topic-accent); }.learning-output { stroke: var(--learning-secondary); }
.learning-node-halo { fill: var(--topic-accent); opacity: .06; animation: learning-activation 7.2s ease-in-out infinite; animation-delay: var(--layer-delay); animation-play-state: paused; }
.learning-visual[data-running="true"] .learning-node-halo { animation-play-state: running; }
.learning-signal { fill: var(--topic-accent); stroke: var(--space-1); stroke-width: .8; }.learning-signal-glow { fill: var(--topic-accent); opacity: .16; }
.learning-signal-secondary :is(.learning-signal, .learning-signal-glow) { fill: var(--learning-secondary); }
.learning-divider, .learning-loss-axis { stroke: var(--text-2); stroke-width: .6; opacity: .2; }
.learning-loss { stroke: var(--learning-secondary); stroke-width: 1.2; stroke-linecap: round; }.learning-loss-point { fill: var(--learning-secondary); }
.learning-loss-label { fill: var(--learning-secondary); }
:global(.topic-card:is(:hover, :focus-visible)) .learning-route { opacity: .7; }
@keyframes learning-activation { 0%, 35%, 100% { opacity: .06; } 14% { opacity: .24; } }
@media (prefers-reduced-motion: reduce) { .learning-visual * { animation: none !important; transition: none !important; } }
</style>
