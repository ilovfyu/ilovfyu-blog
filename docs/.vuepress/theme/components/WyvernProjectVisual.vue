<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'

const surface = ref<HTMLElement | null>(null)
const running = useSceneMotion(surface)
// Deterministic values keep the whole memory readable before hydration and at rest.
const cells = Array.from({ length: 64 }, (_, index) => ({
  x: 220 + index % 8 * 16,
  y: 104 + Math.floor(index / 8) * 16,
  strength: .15 + ((index * 17 + 11) % 23) / 32,
  delay: `${-(index % 8) * .3}s`,
}))
</script>

<template>
  <div ref="surface" class="wyvern-visual project-process-visual" :data-motion="running ? 'running' : 'still'" data-kind="delta-memory" aria-hidden="true">
    <svg viewBox="0 0 560 320" fill="none">
      <path class="wyvern-backbone" d="M52 47H508" />
      <rect class="wyvern-panel" x="156" y="30" width="248" height="34" rx="8" />
      <text class="wyvern-label" x="280" y="52" text-anchor="middle">FROZEN ATTENTION</text>
      <path class="wyvern-wire" d="M92 47V153M146 170H208M352 170H406M468 153V47M208 219H188V264H94V202" />
      <path class="wyvern-arrow" d="m200 165 8 5-8 5m198-10 8 5-8 5m57-120 5-8 5 8" />

      <text class="wyvern-step" x="92" y="124" text-anchor="middle">01 / PROJECT</text>
      <rect class="wyvern-panel" x="38" y="140" width="108" height="62" rx="8" />
      <text class="wyvern-value" x="92" y="166" text-anchor="middle">k · v · β</text>
      <text class="wyvern-muted" x="92" y="188" text-anchor="middle">INPUT TOKENS</text>

      <rect class="wyvern-memory" x="208" y="92" width="144" height="144" rx="10" />
      <rect v-for="(cell, index) in cells" :key="index" class="wyvern-cell" :x="cell.x" :y="cell.y" width="12" height="12" rx="2" :fill-opacity="cell.strength" :style="{ '--cell-delay': cell.delay }" />
      <text class="wyvern-step" x="280" y="83" text-anchor="middle">02 / δ WRITE</text>
      <text class="wyvern-muted" x="280" y="254" text-anchor="middle">STATE M · 8 × 8</text>

      <text class="wyvern-step" x="468" y="124" text-anchor="middle">03 / READ</text>
      <rect class="wyvern-panel" x="406" y="140" width="124" height="62" rx="8" />
      <text class="wyvern-value" x="468" y="166" text-anchor="middle">ΔQ / ΔO</text>
      <text class="wyvern-muted" x="468" y="188" text-anchor="middle">LOW-RANK</text>

      <text class="wyvern-formula" x="280" y="298" text-anchor="middle">M ← M + β (v − Mk) kᵀ</text>
      <circle class="wyvern-static-token" cx="180" cy="170" r="4" />
      <circle class="wyvern-static-token" cx="379" cy="170" r="4" />
      <template v-if="running">
        <circle class="wyvern-packet" r="4"><animateMotion dur="3.6s" repeatCount="indefinite" path="M146 170H208" /></circle>
        <circle class="wyvern-read-packet" r="4"><animateMotion dur="3.6s" begin="-1.8s" repeatCount="indefinite" path="M352 170H406" /></circle>
        <path class="wyvern-write-band" d="M218 104V228"><animateTransform attributeName="transform" type="translate" values="0 0;112 0;0 0" dur="7.2s" repeatCount="indefinite" /></path>
      </template>
    </svg>
    <div class="wyvern-visual-caption"><span>ONLINE ASSOCIATIVE MEMORY</span><span>δ-mem / 概念示意</span></div>
  </div>
</template>

<style scoped>
.wyvern-visual { --wyvern-accent: #087b77; --wyvern-secondary: #8c5b2a; position: relative; width: 100%; color: var(--text-1); background: radial-gradient(ellipse at 50% 48%, color-mix(in srgb, var(--wyvern-accent) 8%, transparent), transparent 70%); }
:global([data-theme="dark"] .wyvern-visual) { --wyvern-accent: #79ded1; --wyvern-secondary: #e9bd7c; }
.wyvern-visual svg { display: block; width: 100%; height: var(--project-visual-height, 100%); max-height: 360px; }
.wyvern-backbone { stroke: var(--text-3); stroke-width: 2; stroke-dasharray: 4 5; }
.wyvern-wire, .wyvern-arrow { stroke: var(--wyvern-accent); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.wyvern-wire { opacity: .55; }
.wyvern-panel { fill: var(--space-1); stroke: color-mix(in srgb, var(--wyvern-accent) 50%, var(--space-line)); }
.wyvern-memory { fill: var(--space-0); stroke: var(--wyvern-accent); stroke-width: 1.5; }
.wyvern-cell { fill: var(--wyvern-accent); }
.wyvern-visual text { font-family: var(--font-code); }
.wyvern-label { fill: var(--text-2); font-size: 13px; letter-spacing: 1px; }
.wyvern-step { fill: var(--wyvern-accent); font-size: 12px; }
.wyvern-value { fill: var(--text-1); font-size: 19px; }
.wyvern-muted { fill: var(--text-2); font-size: 11px; }
.wyvern-formula { fill: var(--wyvern-secondary); font-size: 18px; }
.wyvern-static-token, .wyvern-packet { fill: var(--wyvern-accent); }
.wyvern-read-packet { fill: var(--wyvern-secondary); }
.wyvern-write-band { stroke: var(--wyvern-secondary); stroke-width: 3; opacity: .8; }
.wyvern-visual[data-motion="running"] .wyvern-cell { animation: wyvern-write 7.2s ease-in-out infinite; animation-delay: var(--cell-delay); }
.wyvern-visual[data-motion="running"] .wyvern-static-token { visibility: hidden; }
.wyvern-visual-caption { display: flex; justify-content: space-between; gap: 12px; padding: 0 22px 18px; color: var(--text-2); font: 9px var(--font-code); letter-spacing: .04em; }
@keyframes wyvern-write { 0%, 100% { opacity: 1; } 45% { opacity: .35; } 60% { opacity: 1; } }
@media (max-width: 400px) { .wyvern-visual-caption { font-size: 8px; padding-inline: 14px; letter-spacing: 0; } }
@media (prefers-reduced-motion: reduce) { .wyvern-cell { animation: none !important; } }
</style>
