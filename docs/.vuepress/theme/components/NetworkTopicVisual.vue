<script setup lang="ts">
defineProps<{ running: boolean }>()
const headers = [{ x: 22, width: 48, label: 'ETH' }, { x: 70, width: 48, label: 'IP' }, { x: 118, width: 48, label: 'TCP' }, { x: 166, width: 172, label: 'DATA' }]
</script>

<template>
  <svg class="network-visual" :data-running="running" viewBox="0 0 360 240" fill="none">
    <text class="network-heading" x="22" y="20">PACKET / ROUTE / ACK</text>
    <text class="network-label" x="22" y="42">ENCAPSULATION</text>
    <g v-for="header in headers" :key="header.label">
      <rect class="network-header" :x="header.x" y="51" :width="header.width" height="25" />
      <text class="network-code" :x="header.x + header.width / 2" y="67" text-anchor="middle">{{ header.label }}</text>
    </g>
    <text class="network-label" x="22" y="99">SENDER</text>
    <text class="network-label" x="180" y="99" text-anchor="middle">ROUTER</text>
    <text class="network-label" x="338" y="99" text-anchor="end">RECEIVER</text>
    <rect class="network-endpoint" x="22" y="111" width="40" height="32" rx="5" />
    <path class="network-device" d="M31 119H53V133H31ZM36 138H48M42 133V138" />
    <path class="network-route" d="M62 127H160M200 127H298m-5-4 5 4-5 4" />
    <circle class="network-router" cx="180" cy="127" r="20" />
    <path class="network-device" d="M168 127H192m-4-4 4 4-4 4M180 115V139m-4-4 4 4 4-4" />
    <rect class="network-endpoint" x="298" y="111" width="40" height="32" rx="5" />
    <path class="network-device" d="M307 119H329V133H307ZM312 138H324M318 133V138" />
    <rect class="network-packet" x="104" y="122" width="14" height="10" rx="2" />
    <rect class="network-packet" x="242" y="122" width="14" height="10" rx="2" />
    <text class="network-label" x="111" y="152" text-anchor="middle">seq = 1</text>
    <text class="network-label" x="249" y="152" text-anchor="middle">FORWARD</text>
    <path class="network-ack-route" d="M318 146V179H42V146m-4 4 4-4 4 4" />
    <text class="network-ack-label" x="180" y="173" text-anchor="middle">ACK = 2 / NEXT BYTE</text>
    <g v-if="running" class="network-moving-packet">
      <rect x="-6" y="-4" width="12" height="8" rx="2" />
      <animateMotion path="M62 127H298" dur="6s" keyPoints="0;0;1;1" keyTimes="0;.05;.45;1" calcMode="linear" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.05;.45;.46;1" dur="6s" repeatCount="indefinite" />
    </g>
    <g v-if="running" class="network-moving-ack">
      <circle r="3.5" />
      <animateMotion path="M318 146V179H42V146" dur="6s" keyPoints="0;0;1;1" keyTimes="0;.5;.95;1" calcMode="linear" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.49;.5;.95;1" dur="6s" repeatCount="indefinite" />
    </g>
    <path class="network-rule" d="M22 210H338" />
    <text class="network-label" x="22" y="229">1 BYTE OF TCP DATA</text>
    <text class="network-label" x="338" y="229" text-anchor="end">END-TO-END</text>
  </svg>
</template>

<style scoped>
.network-visual { display: block; width: 100%; height: auto; }
.network-heading { fill: var(--topic-accent); font: 10px var(--font-code); letter-spacing: .8px; }
.network-label { fill: var(--text-2); font: 8px var(--font-code); }
.network-code { fill: var(--text-1); font: 9px var(--font-code); }
.network-header { fill: var(--topic-accent); fill-opacity: .08; stroke: var(--topic-accent); stroke-opacity: .55; }
.network-endpoint, .network-router { fill: var(--space-1); stroke: var(--topic-accent); stroke-opacity: .8; }
.network-device, .network-route { stroke: var(--topic-accent); stroke-linecap: round; stroke-linejoin: round; }
.network-packet { fill: var(--topic-accent); fill-opacity: .2; stroke: var(--topic-accent); }
.network-ack-route { stroke: var(--topic-secondary); stroke-dasharray: 4 3; stroke-linecap: round; stroke-linejoin: round; }
.network-ack-label { fill: var(--topic-secondary); font: 8px var(--font-code); }
.network-moving-packet { fill: var(--topic-accent); opacity: 0; }
.network-moving-ack { fill: var(--topic-secondary); opacity: 0; }
.network-rule { stroke: var(--text-2); stroke-opacity: .2; }
@media (prefers-reduced-motion: reduce) { .network-moving-packet, .network-moving-ack { display: none; } }
</style>
