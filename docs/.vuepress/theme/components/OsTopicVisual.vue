<script setup lang="ts">
defineProps<{ running: boolean }>()
const processes = ['P1', 'P2', 'P3']
const slices = ['P1', 'P2', 'P3', 'P1', 'P2', 'P3']
</script>

<template>
  <svg class="os-visual" :data-running="running" viewBox="0 0 360 240" fill="none">
    <text class="os-heading" x="22" y="20">PROCESS / ROUND ROBIN</text>
    <text class="os-label" x="22" y="46">READY QUEUE</text>
    <g v-for="(process, i) in processes" :key="process">
      <rect class="os-process" :x="22 + i * 40" y="58" width="32" height="30" rx="4" />
      <text class="os-code" :x="38 + i * 40" y="77" text-anchor="middle">{{ process }}</text>
    </g>
    <path class="os-route" d="M136 73H178m-5-4 5 4-5 4" />
    <rect class="os-cpu" x="182" y="48" width="68" height="52" rx="7" />
    <text class="os-cpu-label" x="216" y="71" text-anchor="middle">CPU</text>
    <text class="os-label" x="216" y="87" text-anchor="middle">RUNNING</text>
    <path class="os-return" d="M216 48V33H38V54m-4-4 4 4 4-4" />
    <text class="os-label" x="127" y="30" text-anchor="middle">PREEMPT</text>
    <path class="os-route" d="M252 73H290V116m-4-4 4 4 4-4" />
    <rect class="os-wait" x="248" y="120" width="90" height="34" rx="5" />
    <text class="os-code" x="293" y="134" text-anchor="middle">WAITING</text>
    <text class="os-label" x="293" y="147" text-anchor="middle">IO</text>
    <path class="os-return" d="M248 137H38V92m-4 4 4-4 4 4" />
    <text class="os-label" x="142" y="132" text-anchor="middle">IO COMPLETE → READY</text>
    <g v-if="running" class="os-dispatch">
      <circle r="4" />
      <animateMotion path="M136 73H216V33H38V58" dur="6s" keyPoints="0;.2;.2;1;1" keyTimes="0;.15;.5;.9;1" calcMode="linear" repeatCount="indefinite" />
    </g>
    <text class="os-label" x="22" y="173">CPU TIME SLICES</text>
    <g v-for="(process, i) in slices" :key="i">
      <rect class="os-time-slice" :class="{ 'os-slice-alternate': i % 3 === 1 }" :x="22 + i * 53" y="184" width="49" height="26" rx="3" />
      <text class="os-code" :x="46.5 + i * 53" y="201" text-anchor="middle">{{ process }}</text>
    </g>
    <path class="os-route" d="M22 222H338m-4-3 4 3-4 3" />
    <text class="os-label" x="22" y="236">CONTEXT SWITCH</text>
    <text class="os-label" x="338" y="236" text-anchor="end">TIME →</text>
  </svg>
</template>

<style scoped>
.os-visual { display: block; width: 100%; height: auto; }
.os-heading { fill: var(--topic-accent); font: 10px var(--font-code); letter-spacing: .8px; }
.os-label { fill: var(--text-2); font: 8px var(--font-code); }
.os-code { fill: var(--text-1); font: 9px var(--font-code); }
.os-process, .os-time-slice { fill: var(--topic-accent); fill-opacity: .09; stroke: var(--topic-accent); stroke-opacity: .6; }
.os-cpu { fill: var(--topic-accent); fill-opacity: .12; stroke: var(--topic-accent); stroke-width: 1.5; }
.os-cpu-label { fill: var(--topic-accent); font: 14px var(--font-code); }
.os-route { stroke: var(--topic-accent); stroke-opacity: .7; stroke-linecap: round; stroke-linejoin: round; }
.os-return { stroke: var(--topic-secondary); stroke-opacity: .6; stroke-linecap: round; stroke-linejoin: round; }
.os-wait, .os-slice-alternate { fill: var(--topic-secondary); fill-opacity: .1; stroke: var(--topic-secondary); stroke-opacity: .6; }
.os-dispatch { fill: var(--topic-accent); }
@media (prefers-reduced-motion: reduce) { .os-dispatch { display: none; } }
</style>
