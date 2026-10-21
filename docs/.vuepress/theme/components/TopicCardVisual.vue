<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
import { topicAppearance } from '../data/topics'
import MathTopicVisual from './MathTopicVisual.vue'
import LearningTopicVisual from './LearningTopicVisual.vue'

const props = defineProps<{ name: string }>()
const appearance = computed(() => topicAppearance(props.name))
const kind = computed(() => appearance.value.kind)
const stage = ref<HTMLElement | null>(null)
const running = useSceneMotion(stage)
</script>

<template>
  <div ref="stage" class="topic-visual" :data-kind="kind" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <MathTopicVisual v-if="kind === 'calculus' || kind === 'algebra' || kind === 'probability'" :kind="kind" :running="running" />
    <LearningTopicVisual v-else-if="kind === 'learning'" :running="running" />
    <svg v-else-if="kind === 'api'" viewBox="0 0 360 220" fill="none">
      <path class="visual-grid" d="M20 170 180 210 340 170M20 150 180 190 340 150M20 130 180 170 340 130M60 180V32M120 196V16M180 210V4M240 196V16M300 180V32" />
      <path class="visual-wire" d="M34 58H96L132 96M228 96 264 58H326M34 162H96L132 124M228 124 264 162H326" />
      <path class="visual-wire visual-wire-secondary" d="M34 58V162M326 58V162" />
      <g class="api-core">
        <path class="visual-core-shadow" d="m180 68 56 32v38l-56 32-56-32v-38z" />
        <path class="visual-core" d="m180 48 56 32v58l-56 32-56-32V80z" />
        <path class="visual-core-side" d="m180 112 56-32v58l-56 32z" />
        <path class="visual-core-inner" d="m180 48 56 32-56 32-56-32z" />
        <path class="visual-core-edge" d="m180 48 56 32-56 32-56-32m56 32v58" />
        <text class="visual-symbol" x="180" y="91" text-anchor="middle">{ }</text>
        <path class="visual-core-slots" d="m193 129 27-16m-27 26 27-16m-27 26 16-9" />
      </g>
      <g class="visual-port"><rect x="6" y="42" width="88" height="30" rx="5" /><text x="50" y="61" text-anchor="middle">GET /tasks</text></g>
      <g class="visual-port"><rect x="260" y="42" width="94" height="30" rx="5" /><text x="307" y="61" text-anchor="middle">200 · JSON</text></g>
      <g class="visual-port visual-port-muted"><rect x="6" y="148" width="88" height="28" rx="5" /><text x="50" y="166" text-anchor="middle">VALIDATE</text></g>
      <g class="visual-port visual-port-muted"><rect x="260" y="148" width="94" height="28" rx="5" /><text x="307" y="166" text-anchor="middle">SCHEMA</text></g>
      <g v-if="running" class="visual-packets">
        <circle r="3"><animateMotion dur="4s" repeatCount="indefinite" path="M94 57H96L132 96" /></circle>
        <circle r="3"><animateMotion dur="4s" begin="-1.5s" repeatCount="indefinite" path="M228 96 264 57H260" /></circle>
        <circle r="2"><animateMotion dur="5s" begin="-2s" repeatCount="indefinite" path="M94 162H96L132 124" /></circle>
      </g>
    </svg>
    <svg v-else-if="kind === 'publish'" viewBox="0 0 360 220" fill="none">
      <path class="visual-grid" d="m16 158 144 56 182-64M42 144l142 54 130-46M68 130l142 52 76-28M112 195l164-60M64 175l164-60M160 212l164-60" />
      <g class="publish-pages">
        <path class="visual-page page-back" d="m50 117 74-43 88 51-74 43z" />
        <path class="visual-page page-middle" d="m50 101 74-43 88 51-74 43z" />
        <path class="visual-page page-front" d="m50 85 74-43 88 51-74 43z" />
        <path class="visual-page-lines" d="m88 85 34-20 52 30m-74 0 24-14 35 20m-47 1 14-8 18 10" />
        <path class="visual-page-spine" d="M50 85v32l88 51v-32" />
      </g>
      <path class="visual-wire" d="M177 151h25q16 0 16-16V95q0-15 16-15h12" />
      <g class="publish-window">
        <path class="visual-window-shadow" d="M252 66h74v108h-74z" />
        <rect class="visual-window" x="240" y="54" width="84" height="108" rx="5" />
        <path class="visual-window-rule" d="M240 73h84" />
        <circle class="visual-window-dot" cx="251" cy="64" r="2" /><circle class="visual-window-dot" cx="259" cy="64" r="2" /><circle class="visual-window-dot" cx="267" cy="64" r="2" />
        <rect class="visual-window-banner" x="251" y="84" width="62" height="28" rx="2" />
        <path class="visual-page-lines" d="M251 124h50m-50 9h62m-62 9h37" />
        <path class="visual-check" d="m273 97 6 6 12-13" />
      </g>
      <text class="visual-label" x="120" y="190" text-anchor="middle">WRITE</text><text class="visual-label" x="282" y="190" text-anchor="middle">PUBLISH</text>
      <circle v-if="running" class="visual-packets" r="3"><animateMotion dur="5s" repeatCount="indefinite" path="M177 151h25q16 0 16-16V95q0-15 16-15h6" /></circle>
    </svg>
    <svg v-else viewBox="0 0 360 220" fill="none">
      <path class="visual-grid" d="m20 165 160 44 160-44M60 152l120 33 120-33M100 140l80 22 80-22" />
      <g v-for="index in 3" :key="index" class="library-volume" :style="{ '--volume': index }" :transform="`translate(${80 + index * 45} ${85 - index * 12})`">
        <path class="visual-core" d="M0 0 32-18 32 72 0 90z" /><path class="visual-page" d="m32-18 24 12v90L32 72z" /><path class="visual-page-lines" d="M8 18 24 9M8 30l16-9M8 65l16-9" />
      </g>
      <text class="visual-label" x="180" y="208" text-anchor="middle">KNOWLEDGE / COLLECTION</text>
    </svg>
    <span class="topic-visual-caption">{{ appearance.caption }}</span>
  </div>
</template>

<style scoped>
.topic-visual { position: relative; min-width: 0; width: 100%; max-width: 360px; justify-self: end; padding-bottom: 24px; }
.topic-visual svg { display: block; width: 100%; height: auto; overflow: visible; }
.visual-grid { stroke: var(--topic-accent); opacity: .08; stroke-width: .7; }
.visual-wire { stroke: var(--topic-accent); opacity: .5; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; }
.visual-wire-secondary { opacity: .15; stroke-dasharray: 3 7; }
.visual-core-shadow, .visual-window-shadow { fill: var(--topic-accent); opacity: .08; }
.visual-core { fill: color-mix(in srgb, var(--topic-accent) 14%, var(--space-1)); stroke: var(--topic-accent); stroke-width: 1.3; }
.visual-core-side { fill: var(--topic-accent); opacity: .12; }
.visual-core-inner { fill: color-mix(in srgb, var(--topic-accent) 9%, var(--space-1)); stroke: var(--topic-accent); stroke-opacity: .7; transition: translate .6s; }
.visual-core-edge { stroke: var(--topic-accent); stroke-opacity: .3; }
.visual-symbol { fill: var(--topic-accent); font: 26px var(--font-code); transition: translate .6s; }
.visual-core-slots { stroke: var(--topic-accent); stroke-opacity: .5; stroke-width: 2; }
.visual-port rect { fill: var(--space-1); stroke: var(--topic-accent); stroke-opacity: .45; }
.visual-port text { fill: var(--topic-accent); font: 11px var(--font-code); }
.visual-port-muted rect { stroke-opacity: .2; }.visual-port-muted text { fill: var(--text-2); font-size: 10px; }
.visual-packets { fill: var(--topic-accent); }
.visual-page { fill: color-mix(in srgb, var(--topic-accent) 7%, var(--space-1)); stroke: var(--topic-accent); stroke-opacity: .45; stroke-linejoin: round; }
.page-back { fill: color-mix(in srgb, var(--topic-accent) 18%, var(--space-1)); }.page-middle { fill: color-mix(in srgb, var(--topic-accent) 12%, var(--space-1)); }
.page-front, .page-middle, .visual-page-lines { transition: translate .6s; }
.visual-page-lines { stroke: var(--topic-accent); stroke-opacity: .5; stroke-width: 1.5; stroke-linecap: round; }.visual-page-spine { stroke: var(--topic-accent); stroke-opacity: .3; }
.visual-window { fill: var(--space-1); stroke: var(--topic-accent); stroke-opacity: .6; }.visual-window-rule { stroke: var(--topic-accent); stroke-opacity: .25; }
.visual-window-dot { fill: var(--topic-accent); opacity: .6; }.visual-window-banner { fill: var(--topic-accent); opacity: .12; }.visual-check { stroke: var(--topic-accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.visual-label { fill: var(--text-2); font: 10px var(--font-code); letter-spacing: 2px; }
.topic-visual-caption { position: absolute; bottom: 0; width: 100%; text-align: center; font: 9px/1.5 var(--font-code); color: var(--text-2); letter-spacing: .04em; }
.api-core { transform-origin: 180px 110px; animation: api-core-breathe 6s ease-in-out infinite; }
.publish-pages { animation: publish-pages-drift 6s ease-in-out infinite; }.publish-window { animation: publish-window-drift 6s ease-in-out -3s infinite; }
.library-volume { animation: publish-pages-drift 6s ease-in-out infinite; animation-delay: calc(var(--volume) * -.8s); }
.topic-visual[data-motion="still"] :is(.api-core, .publish-pages, .publish-window, .library-volume) { animation-play-state: paused; }
:global(.topic-card:is(:hover, :focus-visible)) :is(.visual-core-inner, .visual-symbol) { translate: 0 -9px; }
:global(.topic-card:is(:hover, :focus-visible)) .publish-pages :is(.page-front, .visual-page-lines) { translate: 0 -9px; }
:global(.topic-card:is(:hover, :focus-visible)) .publish-pages .page-middle { translate: 0 -4px; }
@keyframes api-core-breathe { 0%,100% { transform: translateY(2px); } 50% { transform: translateY(-5px); } }
@keyframes publish-pages-drift { 0%,100% { translate: 0 2px; } 50% { translate: 0 -5px; } }
@keyframes publish-window-drift { 0%,100% { translate: 0 0; } 50% { translate: 0 -4px; } }
@media (prefers-reduced-motion: reduce) { .topic-visual * { animation: none !important; } }
</style>
