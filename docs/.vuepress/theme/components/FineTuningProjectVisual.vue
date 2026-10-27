<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'

const surface = ref<HTMLElement | null>(null)
const running = useSceneMotion(surface)
const weights = Array.from({ length: 25 }, (_, index) => ({
  x: 233 + index % 5 * 19,
  y: 104 + Math.floor(index / 5) * 19,
  strength: .2 + ((index * 7 + 3) % 13) / 18,
  delay: `${-(index % 5) * .6}s`,
}))
</script>

<template>
  <div ref="surface" class="fine-tuning-visual project-process-visual" :data-motion="running ? 'running' : 'still'" data-kind="fine-tuning" aria-hidden="true">
    <svg viewBox="0 0 560 320" fill="none">
      <text class="training-label" x="280" y="40" text-anchor="middle">FORWARD → LOSS → BACKWARD</text>
      <path class="training-wire" d="M148 150H218M344 150H405M460 205V240H280V208" />
      <path class="training-arrow" d="M210 145l8 5-8 5M397 145l8 5-8 5M275 216l5-8 5 8" />
      <text class="training-step" x="94" y="85" text-anchor="middle">01 / SAMPLES</text>
      <rect class="training-panel" x="40" y="100" width="108" height="105" rx="8" />
      <g v-for="row in 4" :key="row">
        <rect class="training-sample" x="53" :y="107 + row * 18" width="11" height="7" rx="2" />
        <path class="training-sample-line" :d="`M74 ${110 + row * 18}H${128 - row % 2 * 14}`" />
      </g>
      <text class="training-step" x="280" y="85" text-anchor="middle">02 / WEIGHTS θ</text>
      <rect class="training-model" x="218" y="92" width="126" height="116" rx="10" />
      <rect v-for="(weight, index) in weights" :key="index" class="training-weight" :x="weight.x" :y="weight.y" width="13" height="13" rx="2" :fill-opacity="weight.strength" :style="{ '--weight-delay': weight.delay }" />
      <text class="training-step" x="460" y="85" text-anchor="middle">03 / LOSS</text>
      <rect class="training-panel" x="405" y="100" width="110" height="105" rx="8" />
      <path class="training-axis" d="M420 117V187H501" />
      <path class="training-loss" d="M426 125C438 125 435 151 448 150S456 169 468 168S483 180 498 181" />
      <circle class="training-loss-point" cx="498" cy="181" r="3" />
      <text class="training-step training-gradient" x="371" y="259" text-anchor="middle">GRADIENT / Δθ</text>
      <text class="training-formula" x="280" y="296" text-anchor="middle">θ ← θ − η ∇θ L</text>
      <circle class="training-static-packet" cx="183" cy="150" r="4" />
      <circle class="training-static-gradient" cx="371" cy="240" r="4" />
      <template v-if="running">
        <circle class="training-packet" r="4"><animateMotion dur="4s" repeatCount="indefinite" path="M148 150H405" /></circle>
        <circle class="training-gradient-packet" r="4"><animateMotion dur="4s" begin="-2s" repeatCount="indefinite" path="M460 205V240H280V208" /></circle>
      </template>
    </svg>
    <div class="training-caption"><span>MODEL FINE-TUNING</span><span>训练过程 / 概念示意</span></div>
  </div>
</template>

<style scoped>
.fine-tuning-visual { --training-accent: #08778a; --training-secondary: #8c5b2a; width: 100%; color: var(--text-1); background: radial-gradient(ellipse at 50% 48%, color-mix(in srgb, var(--training-accent) 8%, transparent), transparent 70%); }
:global([data-theme="dark"] .fine-tuning-visual) { --training-accent: #6ad7e5; --training-secondary: #e9bd7c; }
.fine-tuning-visual svg { display: block; width: 100%; height: var(--project-visual-height, 100%); max-height: 360px; }
.fine-tuning-visual text { font-family: var(--font-code); }
.training-label { fill: var(--text-2); font-size: 13px; letter-spacing: .8px; }
.training-step { fill: var(--training-accent); font-size: 12px; }
.training-wire, .training-arrow { stroke: var(--training-accent); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.training-wire { opacity: .55; }
.training-panel { fill: var(--space-1); stroke: color-mix(in srgb, var(--training-accent) 50%, var(--space-line)); }
.training-model { fill: var(--space-0); stroke: var(--training-accent); stroke-width: 1.5; }
.training-sample, .training-weight, .training-static-packet, .training-packet { fill: var(--training-accent); }
.training-sample-line { stroke: var(--training-accent); stroke-width: 3; opacity: .5; stroke-linecap: round; }
.training-axis { stroke: var(--text-3); opacity: .6; }
.training-loss { stroke: var(--training-secondary); stroke-width: 2; stroke-linecap: round; }
.training-gradient, .training-formula { fill: var(--training-secondary); }
.training-formula { font-size: 20px; }
.training-loss-point, .training-static-gradient, .training-gradient-packet { fill: var(--training-secondary); }
.fine-tuning-visual[data-motion="running"] .training-weight { animation: training-update 8s ease-in-out infinite; animation-delay: var(--weight-delay); }
.fine-tuning-visual[data-motion="running"] :is(.training-static-packet, .training-static-gradient) { visibility: hidden; }
.training-caption { display: flex; justify-content: space-between; gap: 12px; padding: 0 22px 18px; color: var(--text-2); font: 9px var(--font-code); letter-spacing: .04em; }
@keyframes training-update { 0%, 100% { opacity: 1; } 45% { opacity: .35; } 60% { opacity: 1; } }
@media (max-width: 400px) { .training-caption { font-size: 8px; padding-inline: 14px; letter-spacing: 0; } }
@media (prefers-reduced-motion: reduce) { .training-weight { animation: none !important; } }
</style>
