<script setup lang="ts">
import { ref } from 'vue'
import { useSceneMotion } from '../utils/use-scene-motion'
const surface = ref<HTMLElement | null>(null)
const running = useSceneMotion(surface)
const policies = [{ name: 'AI COST', code: 'BUDGET' }, { name: 'AGENT', code: 'CIRCUIT BREAK' }, { name: 'PAYMENT', code: 'GUARDRAIL' }]
</script>

<template>
  <div ref="surface" class="shipgate-visual project-process-visual" data-kind="shipgate" :data-motion="running ? 'running' : 'still'" aria-hidden="true">
    <svg viewBox="0 0 560 320" fill="none">
      <text class="shipgate-kicker" x="32" y="34">SHIP SAFELY.</text>
      <text class="shipgate-note" x="528" y="34" text-anchor="end">APPLICATION SAFETY SDK</text>
      <path class="shipgate-floor" d="M40 236l214-80 265 80-214 66zM85 251l214-81M145 270l214-82M210 289l214-81M93 216l266 80M151 195l265 81" />
      <path class="shipgate-lane" d="M37 152H203M292 152h67q16 0 16-16V91h38M375 152h38M375 152v61h38" />
      <path class="shipgate-block-route" d="M74 205h86q21 0 21-21v-7" />
      <g class="shipgate-request">
        <path d="M45 137h47v30H45z" />
        <path class="shipgate-request-line" d="M53 147h17m-17 9h29" />
      </g>
      <text class="shipgate-note" x="39" y="124">APP / AGENT</text>
      <path class="shipgate-portal-side" d="M210 73l21-12 68 23v128l-21 12-68-23z" />
      <path class="shipgate-portal" d="M210 73l68 23v128l-68-23z" />
      <path class="shipgate-door" d="M222 97l44 15v88l-44-15z" />
      <path class="shipgate-beam" d="M222 123l44 15v23l-44-15z" />
      <path class="shipgate-shield" d="M246 124l15 10v20c0 12-7 19-15 24-8-10-15-20-15-32v-20z" />
      <path class="shipgate-check" d="M237 146l7 10 12-13" />
      <text class="shipgate-gate-label" x="250" y="250" text-anchor="middle">POLICY GATE</text>
      <g v-for="(policy, index) in policies" :key="policy.name" class="shipgate-policy" :style="{ '--policy-delay': `${index * -.8}s` }">
        <rect class="shipgate-policy-panel" x="413" :y="66 + index * 61" width="115" height="48" rx="5" />
        <circle class="shipgate-status" cx="426" :cy="81 + index * 61" r="3" />
        <text class="shipgate-policy-title" x="437" :y="85 + index * 61">{{ policy.name }}</text>
        <text class="shipgate-policy-code" x="425" :y="101 + index * 61">{{ policy.code }}</text>
      </g>
      <circle class="shipgate-reject" cx="181" cy="182" r="11" />
      <path class="shipgate-reject-mark" d="M177 178l8 8m0-8-8 8" />
      <text class="shipgate-block-label" x="124" y="231">BLOCK</text>
      <circle class="shipgate-static-pass" cx="344" cy="152" r="4" />
      <circle class="shipgate-static-block" cx="130" cy="205" r="4" />
      <template v-if="running">
        <circle class="shipgate-pass-packet" r="4"><animateMotion dur="4.8s" repeatCount="indefinite" path="M92 152H359Q375 152 375 136V91H413" /></circle>
        <circle class="shipgate-block-packet" r="4"><animateMotion dur="4.8s" begin="-2.4s" repeatCount="indefinite" path="M74 205H160Q181 205 181 184" /></circle>
      </template>
      <text class="shipgate-footnote" x="32" y="295">INSPECT / ALLOW / BLOCK</text>
      <text class="shipgate-note" x="528" y="295" text-anchor="end">安全策略 / 概念示意</text>
    </svg>
  </div>
</template>

<style scoped>
.shipgate-visual { --shipgate: #986016; --shipgate-pass: #1d736d; --shipgate-stop: #b04439; width: 100%; background: radial-gradient(ellipse at 44% 52%, color-mix(in srgb, var(--shipgate) 12%, transparent), transparent 60%); }
:global([data-theme="dark"] .shipgate-visual) { --shipgate: #efba67; --shipgate-pass: #7ad4c4; --shipgate-stop: #f28e7b; }
.shipgate-visual svg { display: block; width: 100%; height: var(--project-visual-height, 100%); max-height: 380px; }
.shipgate-visual text { font-family: var(--font-code); }
.shipgate-kicker { fill: var(--shipgate); font-size: 17px; letter-spacing: 3px; }
.shipgate-note { fill: var(--text-2); font-size: 9px; }
.shipgate-floor { stroke: var(--shipgate); stroke-opacity: .1; stroke-width: .8; }
.shipgate-lane { stroke: var(--shipgate-pass); stroke-width: 1.5; stroke-opacity: .6; }
.shipgate-block-route { stroke: var(--shipgate-stop); stroke-dasharray: 3 5; stroke-opacity: .6; }
.shipgate-request { fill: var(--space-1); stroke: var(--shipgate); stroke-opacity: .7; }
.shipgate-request-line { stroke-width: 2; }
.shipgate-portal-side { fill: color-mix(in srgb, var(--shipgate) 24%, var(--space-0)); stroke: var(--shipgate); stroke-opacity: .6; }
.shipgate-portal { fill: color-mix(in srgb, var(--shipgate) 9%, var(--space-0)); stroke: var(--shipgate); stroke-width: 1.5; }
.shipgate-door { fill: var(--space-0); stroke: var(--shipgate); stroke-opacity: .35; }
.shipgate-beam { fill: var(--shipgate); fill-opacity: .15; }
.shipgate-shield { fill: color-mix(in srgb, var(--shipgate) 18%, var(--space-0)); stroke: var(--shipgate); stroke-width: 1.3; }
.shipgate-check { stroke: var(--shipgate); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.shipgate-gate-label { fill: var(--shipgate); font-size: 10px; letter-spacing: 1.5px; }
.shipgate-policy-panel { fill: var(--space-1); stroke: color-mix(in srgb, var(--shipgate-pass) 45%, var(--space-line)); }
.shipgate-status, .shipgate-static-pass, .shipgate-pass-packet { fill: var(--shipgate-pass); }
.shipgate-policy-title { fill: var(--shipgate-pass); font-size: 10px; }
.shipgate-policy-code { fill: var(--text-2); font-size: 8px; }
.shipgate-reject { fill: var(--space-0); stroke: var(--shipgate-stop); }
.shipgate-reject-mark { stroke: var(--shipgate-stop); stroke-width: 1.5; }
.shipgate-block-label { fill: var(--shipgate-stop); font-size: 10px; letter-spacing: 1px; }
.shipgate-static-block, .shipgate-block-packet { fill: var(--shipgate-stop); }
.shipgate-footnote { fill: var(--shipgate); font-size: 10px; letter-spacing: 1px; }
.shipgate-visual[data-motion="running"] .shipgate-beam { animation: shipgate-inspect 4.8s ease-in-out infinite; }
.shipgate-visual[data-motion="running"] .shipgate-reject { animation: shipgate-reject 4.8s ease-in-out infinite; }
.shipgate-visual[data-motion="running"] .shipgate-status { animation: shipgate-allow 4.8s ease-in-out infinite; animation-delay: var(--policy-delay); }
.shipgate-visual[data-motion="running"] :is(.shipgate-static-pass, .shipgate-static-block) { visibility: hidden; }
@keyframes shipgate-inspect { 0%, 100% { transform: translateY(-17px); opacity: .25; } 50% { transform: translateY(30px); opacity: 1; } }
@keyframes shipgate-reject { 0%, 35%, 100% { stroke-width: 1; } 50%, 65% { stroke-width: 3; } }
@keyframes shipgate-allow { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .shipgate-visual * { animation: none !important; } }
</style>
