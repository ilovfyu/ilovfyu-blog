<script setup lang="ts">
defineProps<{ running: boolean }>()
const workers = [
  { name: 'go fetch()', y: 44, route: 'M118 62H145Q158 62 158 75V97Q158 110 171 110H275', delay: '0s' },
  { name: 'go parse()', y: 92, route: 'M118 110H275', delay: '-2s' },
  { name: 'go save()', y: 140, route: 'M118 158H145Q158 158 158 145V123Q158 110 171 110H275', delay: '-4s' },
]
</script>

<template>
  <svg class="go-visual" :data-running="running" viewBox="0 0 360 220" fill="none">
    <text class="go-heading" x="22" y="22">CONCURRENT / FAN-IN</text>
    <text class="go-label" x="22" y="37">goroutines</text>
    <path v-for="worker in workers" :key="worker.name" class="go-route" :d="worker.route" />
    <g v-for="(worker, i) in workers" :key="worker.name">
      <rect class="go-worker" x="22" :y="worker.y" width="96" height="36" rx="6" />
      <circle class="go-worker-dot" cx="33" :cy="worker.y + 18" r="2" />
      <text class="go-code" x="42" :y="worker.y + 21">{{ worker.name }}</text>
      <g v-if="running" class="go-message">
        <circle class="go-message-halo" r="7" /><rect class="go-message-core" x="-3" y="-3" width="6" height="6" rx="1.5" />
        <animateMotion :path="worker.route" dur="6s" :begin="worker.delay" keyPoints="0;0;.4;.4;1;1" keyTimes="0;.08;.46;.58;.86;1" calcMode="linear" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.08;.86;.9;1" dur="6s" :begin="worker.delay" repeatCount="indefinite" />
      </g>
    </g>
    <text class="go-label" x="215" y="77" text-anchor="middle">chan Result</text>
    <rect class="go-channel" x="181" y="91" width="68" height="38" rx="19" />
    <path class="go-channel-slots" d="M203 97V123M226 97V123" />
    <path class="go-arrow" d="m266 106 6 4-6 4" />
    <rect class="go-consumer" x="275" y="86" width="64" height="48" rx="6" />
    <text class="go-code go-result" x="307" y="106" text-anchor="middle">&lt;-ch</text>
    <text class="go-label" x="307" y="121" text-anchor="middle">receive</text>
    <text class="go-label" x="215" y="151" text-anchor="middle">send → receive</text>
    <path class="go-rule" d="M22 193H338" />
    <text class="go-label" x="22" y="213">N TASKS</text>
    <text class="go-label" x="180" y="213" text-anchor="middle">1 CHANNEL</text>
    <text class="go-label" x="338" y="213" text-anchor="end">JOIN</text>
  </svg>
</template>

<style scoped>
.go-visual { display: block; width: 100%; height: auto; }
.go-heading { fill: var(--topic-accent); font: 10px var(--font-code); letter-spacing: .8px; }
.go-label { fill: var(--text-2); font: 8px var(--font-code); }
.go-route { stroke: var(--topic-accent); stroke-opacity: .4; stroke-width: 1.2; }
.go-worker { fill: var(--space-1); stroke: var(--topic-accent); stroke-opacity: .6; }
.go-worker-dot { fill: var(--topic-accent); }
.go-code { fill: var(--text-1); font: 10px var(--font-code); }
.go-channel { fill: var(--topic-accent); fill-opacity: .08; stroke: var(--topic-accent); stroke-width: 1.3; }
.go-channel-slots { stroke: var(--topic-accent); stroke-opacity: .25; }
.go-consumer { fill: var(--topic-secondary); fill-opacity: .08; stroke: var(--topic-secondary); stroke-opacity: .65; }
.go-result { fill: var(--topic-secondary); font-size: 13px; }
.go-arrow { stroke: var(--topic-accent); stroke-linecap: round; stroke-linejoin: round; }
.go-message { opacity: 0; }.go-message-core { fill: var(--topic-accent); }.go-message-halo { fill: var(--topic-accent); opacity: .15; }
.go-rule { stroke: var(--text-2); stroke-opacity: .2; stroke-width: .6; }
@media (prefers-reduced-motion: reduce) { .go-message { display: none; } }
</style>
