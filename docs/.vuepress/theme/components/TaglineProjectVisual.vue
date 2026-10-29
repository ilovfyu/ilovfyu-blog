<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
const surface = ref<HTMLElement | null>(null)
const running = useSceneMotion(surface)
const fixes = [
  { label: 'PREFILL', width: 142 },
  { label: 'DECODE', width: 103 },
  { label: 'MEMORY', width: 66 },
]
</script>

<template>
  <div ref="surface" class="tagline-visual project-process-visual" data-kind="tagline" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <svg viewBox="0 0 560 320" fill="none">
      <path class="tagline-paper-shadow" d="M72 38h428v247H72z" />
      <rect class="tagline-terminal" x="48" y="22" width="456" height="256" rx="10" />
      <path class="tagline-divider" d="M48 51h456" />
      <circle v-for="i in 3" :key="i" class="tagline-window-dot" :cx="60 + i * 12" cy="37" r="3" />
      <text class="tagline-window-label" x="483" y="40" text-anchor="end">tagline / diagnostics</text>
      <text class="tagline-prompt" x="67" y="78">$</text>
      <text class="tagline-command" x="83" y="78">tagline diagnose</text>
      <path class="tagline-cursor" d="M217 67v14" />
      <text class="tagline-section" x="68" y="104">INFERENCE TRACE</text>
      <path class="tagline-chart-grid" d="M68 121h245M68 142h245M68 163h245" />
      <path class="tagline-trace" pathLength="100" d="M69 151l15-7 13 12 20-4 13-24 13 12 10-27 12 42 15-8 19 5 15-30 14 12 13-17 16 27 12-7 16 12 16-14 20 4" />
      <path class="tagline-scan" d="M72 113v54" />
      <path class="tagline-divider" d="M334 96v76" />
      <circle class="tagline-score-track" cx="408" cy="135" r="37" />
      <circle class="tagline-score" cx="408" cy="135" r="37" pathLength="100" />
      <text class="tagline-score-text" x="408" y="134" text-anchor="middle">SCORE</text>
      <text class="tagline-demo" x="408" y="148" text-anchor="middle">REPORT</text>
      <text class="tagline-section" x="68" y="191">FIXES / RANKED BY IMPACT</text>
      <g v-for="(fix, index) in fixes" :key="fix.label" class="tagline-fix" :style="{ '--fix-delay': `${index * .7}s` }">
        <text class="tagline-rank" x="68" :y="212 + index * 22">0{{ index + 1 }}</text>
        <text class="tagline-fix-label" x="95" :y="212 + index * 22">{{ fix.label }}</text>
        <rect class="tagline-bar-track" x="186" :y="204 + index * 22" width="188" height="7" rx="2" />
        <rect class="tagline-impact" x="186" :y="204 + index * 22" :width="fix.width" height="7" rx="2" />
        <path class="tagline-check" :d="`M410 ${208 + index * 22}l4 4 7-8`" />
        <text class="tagline-demo" x="438" :y="212 + index * 22">FIX</text>
      </g>
      <text class="tagline-footnote" x="48" y="300">ONE COMMAND. A CLEAR NEXT STEP.</text>
      <text class="tagline-demo" x="504" y="300" text-anchor="end">诊断报告 / 示意数据</text>
    </svg>
  </div>
</template>

<style scoped>
.tagline-visual { --tagline: #7950aa; --tagline-good: #267354; width: 100%; background: linear-gradient(145deg, color-mix(in srgb, var(--tagline) 7%, var(--space-0)), var(--space-0) 70%); }
:global([data-theme="dark"] .tagline-visual) { --tagline: #c3a0f0; --tagline-good: #95cc9b; }
.tagline-visual svg { display: block; width: 100%; height: var(--project-visual-height, 100%); max-height: 380px; }
.tagline-visual text { font-family: var(--font-code); }
.tagline-paper-shadow { fill: var(--tagline); fill-opacity: .08; }
.tagline-terminal { fill: var(--space-1); stroke: var(--tagline); stroke-opacity: .55; }
.tagline-divider { stroke: var(--tagline); stroke-opacity: .22; }
.tagline-window-dot { fill: var(--tagline); fill-opacity: .5; }
.tagline-window-label, .tagline-demo { fill: var(--text-2); font-size: 9px; }
.tagline-prompt { fill: var(--tagline-good); font-size: 15px; }
.tagline-command { fill: var(--text-1); font-size: 13px; }
.tagline-cursor { stroke: var(--tagline); stroke-width: 6; }
.tagline-section { fill: var(--tagline); font-size: 9px; letter-spacing: 1px; }
.tagline-chart-grid { stroke: var(--tagline); stroke-opacity: .12; }
.tagline-trace { stroke: var(--tagline); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.tagline-scan { stroke: var(--tagline-good); stroke-width: 2; opacity: .7; }
.tagline-score-track { stroke: var(--tagline); stroke-width: 5; stroke-opacity: .12; }
.tagline-score { stroke: var(--tagline); stroke-width: 5; stroke-dasharray: 73 27; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 408px 135px; }
.tagline-score-text { fill: var(--tagline); font-size: 12px; }
.tagline-rank { fill: var(--tagline-good); font-size: 10px; }
.tagline-fix-label { fill: var(--text-2); font-size: 10px; }
.tagline-bar-track { fill: var(--tagline); fill-opacity: .1; }
.tagline-impact { fill: var(--tagline); fill-opacity: .7; transform-box: fill-box; transform-origin: left; }
.tagline-check { stroke: var(--tagline-good); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.tagline-footnote { fill: var(--tagline); font-size: 9px; letter-spacing: .6px; }
.tagline-visual[data-motion="running"] .tagline-cursor { animation: tagline-cursor 1.2s steps(2, jump-none) infinite; }
.tagline-visual[data-motion="running"] .tagline-scan { animation: tagline-scan 7s ease-in-out infinite; }
.tagline-visual[data-motion="running"] .tagline-score { animation: tagline-score 7s ease-in-out infinite; }
.tagline-visual[data-motion="running"] .tagline-impact { animation: tagline-report 7s ease-in-out infinite; animation-delay: var(--fix-delay); }
@keyframes tagline-cursor { 50% { opacity: 0; } }
@keyframes tagline-scan { 0%, 10% { transform: translateX(0); opacity: 0; } 20% { opacity: .8; } 65% { transform: translateX(239px); opacity: .8; } 70%, 100% { transform: translateX(239px); opacity: 0; } }
@keyframes tagline-score { 0%, 15% { stroke-dasharray: 10 90; } 55%, 100% { stroke-dasharray: 73 27; } }
@keyframes tagline-report { 0%, 20% { transform: scaleX(.08); opacity: .25; } 60%, 100% { transform: scaleX(1); opacity: .8; } }
@media (prefers-reduced-motion: reduce) { .tagline-visual * { animation: none !important; } }
</style>
