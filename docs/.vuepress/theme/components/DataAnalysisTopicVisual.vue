<script setup lang="ts">
defineProps<{ running: boolean }>()

// The same sample data runs through all three stages: row means are 3, 6, 8.
const rows = [[2, 4, 3], [6, 5, 7], [8, 7, 9]]
const means = rows.map(row => row.reduce((sum, value) => sum + value, 0) / row.length)
const points = means.map((value, i) => ({ x: 208 + i * 55, y: 164 - value * 10 }))
const line = points.map(({ x, y }, i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
</script>

<template>
  <svg class="analysis-visual" :data-running="running" viewBox="0 0 360 220" fill="none">
    <text class="analysis-heading" x="22" y="24">NumPy</text>
    <text class="analysis-note" x="113" y="24" text-anchor="end">3 × 3</text>
    <g v-for="(row, r) in rows" :key="r">
      <g v-for="(value, c) in row" :key="c" :transform="`translate(${22 + c * 30} ${37 + r * 21})`">
        <rect class="array-cell" width="27" height="18" rx="2" :fill-opacity=".05 + value * .017" />
        <text class="array-value" x="13.5" y="12.5" text-anchor="middle">{{ value }}</text>
      </g>
    </g>
    <path class="analysis-bracket" d="M17 37H14V97H17M114 37H117V97H114" />
    <rect class="array-scan" x="22" y="37" width="87" height="18" rx="2" />

    <text class="analysis-heading" x="22" y="121">pandas</text>
    <rect class="table-surface" x="22" y="132" width="91" height="66" rx="3" />
    <path class="table-header" d="M25 132H110Q113 132 113 135V149H22V135Q22 132 25 132Z" />
    <path class="table-rules" d="M22 149H113M22 165H113M22 181H113M56 132V198" />
    <text class="table-label" x="39" y="144" text-anchor="middle">key</text>
    <text class="table-label" x="84" y="144" text-anchor="middle">mean</text>
    <g v-for="(value, i) in means" :key="i">
      <text class="table-value" x="39" :y="161 + i * 16" text-anchor="middle">{{ ['A', 'B', 'C'][i] }}</text>
      <text class="table-value table-mean" x="84" :y="161 + i * 16" text-anchor="middle">{{ value.toFixed(1) }}</text>
    </g>
    <rect class="table-selection" x="57" y="150" width="55" height="47" rx="1" />

    <path class="analysis-flow" d="M119 67H130Q136 67 136 73V155Q136 161 130 161H119M137 161H159Q166 161 166 154V109Q166 103 172 103H184" />
    <path class="analysis-arrow" d="m122 158-4 3 4 3m58-64 4 3-4 3" />
    <text class="analysis-operation" x="145" y="141" text-anchor="middle" transform="rotate(-90 145 141)">mean(axis=1)</text>

    <text class="analysis-heading plot-heading" x="183" y="24">Matplotlib</text>
    <text class="analysis-note" x="339" y="24" text-anchor="end">ax.plot()</text>
    <path class="plot-grid" d="M184 64H338M184 104H338M184 144H338M208 48V173M263 48V173M318 48V173" />
    <path class="plot-axis" d="M184 46V173H340" />
    <text v-for="value in [2, 6, 10]" :key="value" class="plot-tick" x="176" :y="168 - value * 10" text-anchor="end">{{ value }}</text>
    <g v-for="(point, i) in points" :key="point.x">
      <rect class="plot-bar" :x="point.x - 13" :y="point.y" width="26" :height="173 - point.y" rx="2" />
      <text class="plot-tick" :x="point.x" y="188" text-anchor="middle">{{ ['A', 'B', 'C'][i] }}</text>
    </g>
    <path class="plot-area" :d="`${line} L318 173H208Z`" />
    <path class="plot-line" :d="line" pathLength="1" />
    <g class="plot-points" v-for="(point, i) in points" :key="point.x">
      <circle class="plot-halo" :cx="point.x" :cy="point.y" r="9" />
      <circle class="plot-point" :cx="point.x" :cy="point.y" r="3.5" />
      <text class="plot-value" :x="point.x" :y="point.y - 15" text-anchor="middle">{{ means[i].toFixed(1) }}</text>
    </g>
    <g v-if="running" class="analysis-packet">
      <circle class="packet-halo" r="7" /><circle class="packet-core" r="2.5" />
      <animateMotion path="M119 67H130Q136 67 136 73V155Q136 161 130 161H119L137 161H159Q166 161 166 154V109Q166 103 172 103H184" dur="10s" keyPoints="0;0;.52;.52;1;1" keyTimes="0;.14;.37;.45;.6;1" calcMode="linear" repeatCount="indefinite" />
    </g>
    <path class="analysis-footer-rule" d="M183 201H338" />
    <text class="analysis-footer" x="183" y="215">ARRAY</text>
    <text class="analysis-footer" x="260" y="215" text-anchor="middle">TABLE</text>
    <text class="analysis-footer" x="338" y="215" text-anchor="end">INSIGHT</text>
  </svg>
</template>

<style scoped>
.analysis-visual { --analysis-secondary: var(--fx-violet); display: block; width: 100%; height: auto; overflow: visible; }
.analysis-heading { fill: var(--topic-accent); font: 11px var(--font-code); letter-spacing: .15px; }
.analysis-note { fill: var(--text-2); font: 8px var(--font-code); }
.array-cell { fill: var(--topic-accent); stroke: var(--topic-accent); stroke-width: .65; stroke-opacity: .3; }
.array-value, .table-value { fill: var(--text-1); font: 9px var(--font-code); }
.analysis-bracket { stroke: var(--topic-accent); stroke-opacity: .5; stroke-width: .8; }
.array-scan { fill: var(--topic-accent); opacity: .14; stroke: var(--topic-accent); stroke-opacity: .7; stroke-width: .8; }
.table-surface { fill: var(--space-1); stroke: var(--analysis-secondary); stroke-opacity: .5; stroke-width: .8; }
.table-header { fill: var(--analysis-secondary); opacity: .12; }
.table-rules { stroke: var(--analysis-secondary); stroke-opacity: .25; stroke-width: .65; }
.table-label { fill: var(--text-2); font: 8px var(--font-code); }.table-mean { fill: var(--analysis-secondary); }
.table-selection { fill: var(--analysis-secondary); fill-opacity: .08; stroke: var(--analysis-secondary); stroke-opacity: .65; stroke-width: .8; }
.analysis-flow, .analysis-arrow { stroke: var(--topic-accent); stroke-opacity: .4; stroke-width: 1; stroke-linejoin: round; stroke-linecap: round; }
.analysis-operation { fill: var(--text-2); font: 7px var(--font-code); }
.plot-grid { stroke: var(--topic-accent); opacity: .1; stroke-width: .7; }
.plot-axis { stroke: var(--text-2); opacity: .45; stroke-width: .8; }
.plot-tick { fill: var(--text-2); font: 8px var(--font-code); }
.plot-bar { fill: var(--topic-accent); opacity: .06; }
.plot-area { fill: var(--topic-accent); fill-opacity: .07; }
.plot-line { stroke: var(--topic-accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; }
.plot-halo { fill: var(--topic-accent); opacity: .12; }
.plot-point { fill: var(--topic-accent); stroke: var(--space-1); stroke-width: 1.5; }
.plot-value { fill: var(--topic-accent); font: 9px var(--font-code); }
.packet-halo { fill: var(--topic-accent); opacity: .15; }.packet-core { fill: var(--topic-accent); }
.analysis-packet { opacity: 0; }
.analysis-footer-rule { stroke: var(--text-2); opacity: .2; stroke-width: .6; }
.analysis-footer { fill: var(--text-2); font: 7px var(--font-code); letter-spacing: 1px; }
.analysis-visual[data-running="true"] .array-scan { animation: analysis-array 10s ease-in-out infinite; }
.analysis-visual[data-running="true"] .table-selection { animation: analysis-table 10s ease-in-out infinite; }
.analysis-visual[data-running="true"] .analysis-packet { animation: analysis-packet 10s linear infinite; }
.analysis-visual[data-running="true"] .plot-line { animation: analysis-line 10s ease-in-out infinite; }
.analysis-visual[data-running="true"] :is(.plot-area, .plot-points) { animation: analysis-result 10s ease-in-out infinite; }
@keyframes analysis-array { 0%, 8%, 100% { transform: translateY(0); } 16% { transform: translateY(21px); } 24%, 86% { transform: translateY(42px); } }
@keyframes analysis-table { 0%, 30%, 100% { opacity: .25; } 40%, 82% { opacity: 1; } }
@keyframes analysis-packet { 0%, 12%, 62%, 100% { opacity: 0; } 16%, 57% { opacity: 1; } }
@keyframes analysis-line { 0%, 57% { stroke-dashoffset: 1; opacity: .15; } 77%, 91% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: .15; } }
@keyframes analysis-result { 0%, 57%, 100% { opacity: .16; } 77%, 91% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .analysis-visual * { animation: none !important; transition: none !important; } .analysis-packet { display: none; } }
</style>
