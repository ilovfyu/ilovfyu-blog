<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
const surface = ref<HTMLElement | null>(null)
const running = useSceneMotion(surface)
const state = Array.from({ length: 9 }, (_, i) => ({ x: 230 + i % 3 * 16 - Math.floor(i / 3) * 16, y: 104 + i % 3 * 9 + Math.floor(i / 3) * 9 }))
</script>

<template>
  <div ref="surface" class="siskin-visual project-process-visual" data-kind="siskin-base-control" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <svg viewBox="0 0 560 320" fill="none">
      <text class="siskin-kicker" x="32" y="33">GO / STATEFUL RUNTIME</text>
      <text class="siskin-note" x="32" y="53">A SERVICE THAT CAN SLEEP.</text>
      <ellipse class="siskin-orbit" cx="250" cy="193" rx="173" ry="65" />
      <ellipse class="siskin-orbit inner" cx="250" cy="193" rx="143" ry="45" />
      <path class="siskin-orbit-arrow" d="M83 181l-5 14 14-5M407 218l11-9-13-5" />
      <path class="siskin-shadow" d="M152 215l94-54 94 54-94 54z" />
      <g class="siskin-base">
        <path class="siskin-side" d="M166 183l80 46 80-46v18l-80 46-80-46z" />
        <path class="siskin-plane" d="M166 183l80-46 80 46-80 46z" />
        <path class="siskin-grid" d="M190 183l56 32 56-32-56-32zM218 167l56 32M218 199l56-32" />
      </g>
      <g class="siskin-state-layer">
        <path class="siskin-side" d="M166 148l80 46 80-46v16l-80 46-80-46z" />
        <path class="siskin-plane memory" d="M166 148l80-46 80 46-80 46z" />
        <path class="siskin-grid" d="M190 148l56 32 56-32-56-32z" />
        <text class="siskin-memory-label" x="246" y="166" text-anchor="middle">STATE</text>
      </g>
      <g class="siskin-service">
        <path class="siskin-service-side" d="M182 106l64 37 64-37v26l-64 37-64-37z" />
        <path class="siskin-service-top" d="M182 106l64-37 64 37-64 37z" />
        <path v-for="(cell, i) in state" :key="i" class="siskin-state-cell" :d="`M${cell.x} ${cell.y - 12}l9-5 9 5-9 5z`" />
        <path class="siskin-core-line" d="M246 150v10m-47-38v10m94-10v10" />
      </g>
      <path class="siskin-request-path" d="M430 88C397 52 337 46 299 79" />
      <path class="siskin-request-arrow" d="M300 69l-2 11 12-1" />
      <circle class="siskin-request-static" cx="359" cy="62" r="4" />
      <circle v-if="running" class="siskin-request" r="4"><animateMotion dur="10s" repeatCount="indefinite" path="M430 88C397 52 337 46 299 79" /></circle>
      <g class="siskin-sleep">
        <path d="M131 90a18 18 0 1 1-24-23 16 16 0 0 0 24 23Z" />
        <text class="siskin-note" x="102" y="120">SLEEP</text>
      </g>
      <circle class="siskin-wake-light" cx="431" cy="89" r="4" />
      <text class="siskin-label" x="446" y="93">WAKE</text>
      <path class="siskin-label-wire" d="M323 145h53l22 23" />
      <text class="siskin-label" x="394" y="188">ON DEMAND</text>
      <g class="siskin-meter">
        <rect v-for="i in 8" :key="i" class="siskin-meter-bar" :x="397 + i * 10" :y="224 - (i * 7 % 26)" width="5" :height="8 + (i * 7 % 26)" rx="1" :style="{ '--meter-delay': `${i * -.3}s` }" />
        <text class="siskin-note" x="407" y="254">OBSERVE / METER</text>
      </g>
      <text class="siskin-footnote" x="32" y="295">RUN → SLEEP → RESUME</text>
      <text class="siskin-note" x="528" y="295" text-anchor="end">生命周期 / 概念示意</text>
    </svg>
  </div>
</template>

<style scoped>
.siskin-visual { --siskin: #087c74; --siskin-warm: #9a6a23; width: 100%; background: radial-gradient(ellipse at 44% 47%, color-mix(in srgb, var(--siskin) 11%, transparent), transparent 65%); }
:global([data-theme="dark"] .siskin-visual) { --siskin: #67ddbf; --siskin-warm: #eac480; }
.siskin-visual svg { display: block; width: 100%; height: var(--project-visual-height, 100%); max-height: 380px; }
.siskin-visual text { font-family: var(--font-code); }
.siskin-kicker, .siskin-label { fill: var(--siskin); font-size: 11px; letter-spacing: 1px; }
.siskin-note { fill: var(--text-2); font-size: 9px; }
.siskin-orbit { stroke: var(--siskin); stroke-opacity: .3; stroke-dasharray: 3 7; }
.siskin-orbit.inner { stroke-opacity: .12; stroke-dasharray: none; }
.siskin-orbit-arrow, .siskin-grid, .siskin-core-line { stroke: var(--siskin); stroke-width: 1.2; }
.siskin-shadow { fill: var(--siskin); fill-opacity: .05; }
.siskin-side { fill: color-mix(in srgb, var(--siskin) 10%, var(--space-0)); stroke: var(--siskin); stroke-opacity: .45; }
.siskin-plane { fill: var(--space-1); stroke: var(--siskin); stroke-opacity: .6; }
.siskin-grid { opacity: .35; }
.siskin-plane.memory { fill: color-mix(in srgb, var(--siskin-warm) 10%, var(--space-0)); stroke: var(--siskin-warm); }
.siskin-memory-label { fill: var(--siskin-warm); font-size: 10px; letter-spacing: 2px; }
.siskin-service-side { fill: color-mix(in srgb, var(--siskin) 24%, var(--space-0)); stroke: var(--siskin); }
.siskin-service-top { fill: color-mix(in srgb, var(--siskin) 9%, var(--space-0)); stroke: var(--siskin); stroke-width: 1.5; }
.siskin-state-cell { fill: var(--siskin); fill-opacity: .65; }
.siskin-request-path, .siskin-request-arrow { stroke: var(--siskin-warm); stroke-width: 1.5; }
.siskin-request-path { stroke-dasharray: 4 6; stroke-opacity: .6; }
.siskin-request, .siskin-request-static, .siskin-wake-light { fill: var(--siskin-warm); }
.siskin-sleep > path { fill: color-mix(in srgb, var(--siskin) 15%, transparent); stroke: var(--siskin); }
.siskin-label-wire { stroke: var(--siskin); stroke-opacity: .4; }
.siskin-meter-bar { fill: var(--siskin); fill-opacity: .65; }
.siskin-footnote { fill: var(--siskin); font-size: 10px; letter-spacing: 1px; }
.siskin-visual[data-motion="running"] .siskin-service { animation: siskin-suspend 10s ease-in-out infinite; }
.siskin-visual[data-motion="running"] .siskin-sleep { animation: siskin-sleep 10s ease-in-out infinite; }
.siskin-visual[data-motion="running"] .siskin-wake-light { animation: siskin-wake 10s ease-in-out infinite; }
.siskin-visual[data-motion="running"] .siskin-meter-bar { animation: siskin-meter 3s ease-in-out infinite; animation-delay: var(--meter-delay); transform-box: fill-box; transform-origin: bottom; }
.siskin-visual[data-motion="running"] .siskin-request-static { visibility: hidden; }
@keyframes siskin-suspend { 0%, 15%, 80%, 100% { transform: translateY(0); opacity: 1; } 35%, 60% { transform: translateY(23px); opacity: .25; } }
@keyframes siskin-sleep { 0%, 15%, 80%, 100% { opacity: .3; } 35%, 60% { opacity: 1; } }
@keyframes siskin-wake { 0%, 60%, 100% { opacity: .3; } 70%, 85% { opacity: 1; } }
@keyframes siskin-meter { 50% { transform: scaleY(.45); opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .siskin-visual * { animation: none !important; } }
</style>
