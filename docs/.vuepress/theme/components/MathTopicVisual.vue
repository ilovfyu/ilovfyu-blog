<script setup lang="ts">
defineProps<{ kind: 'calculus' | 'algebra' | 'probability'; running: boolean }>()

const curveY = (x: number) => 170 - (x - 48) ** 2 / 600
const integralBars = Array.from({ length: 8 }, (_, i) => ({ x: 118 + i * 18, y: curveY(127 + i * 18) }))
const bellY = (x: number) => 178 - 112 * Math.exp(-.5 * ((x - 183) / 45) ** 2)
const bellPoints = Array.from({ length: 65 }, (_, i) => [39 + i * 4.5, bellY(39 + i * 4.5)])
const bellCurve = bellPoints.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
const bellArea = `M138,178 L138,${bellY(138)} ${bellPoints.filter(([x]) => x > 138 && x < 228).map(([x, y]) => `L${x},${y}`).join(' ')} L228,${bellY(228)} L228,178Z`
const distributionBars = Array.from({ length: 15 }, (_, i) => ({ x: 48 + i * 18, y: Math.min(176, bellY(56 + i * 18) + 5) }))
const samples = [120, 174, 210].map((x, i) => ({ x, y: bellY(x) + 8, delay: `${-i * 1.4}s` }))
</script>

<template>
  <svg v-if="kind === 'calculus'" class="math-visual calculus-visual" viewBox="0 0 360 220" fill="none">
    <path class="math-grid" d="M48 46H324M48 90H324M48 134H324M92 38V180M136 38V180M180 38V180M224 38V180M268 38V180M312 38V180" />
    <path class="math-axis" d="M38 180H330m-6-4 6 4-6 4M48 190V32m-4 6 4-6 4 6" />
    <path class="math-area" d="M118 180V161.833Q193 144.333 268 89.333V180Z" />
    <g class="integral-bars"><rect v-for="bar in integralBars" :key="bar.x" :x="bar.x" :y="bar.y" width="17" :height="180 - bar.y" /></g>
    <path class="math-guide" d="M118 160V184M268 88V184" />
    <path class="math-curve" d="M48 170Q178 170 308 57.333" />
    <g class="calculus-tracer" :transform="running ? undefined : 'translate(198 132.5) rotate(-26.565)'">
      <path class="math-tangent" d="M-50 0H50" />
      <circle class="math-halo" r="11" /><circle class="math-point" r="4" />
      <animateMotion v-if="running" dur="9s" repeatCount="indefinite" path="M128 159.333Q198 140.667 268 89.333" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" rotate="auto" />
    </g>
    <text class="math-formula" x="76" y="53">∫ f(x) dx</text>
    <text class="math-annotation" x="272" y="45">f(x)</text>
    <text class="math-annotation math-secondary-text" x="242" y="150">f′(x)</text>
    <text class="math-tick" x="118" y="200" text-anchor="middle">a</text><text class="math-tick" x="268" y="200" text-anchor="middle">b</text>
    <text class="math-tick" x="334" y="198">x</text><text class="math-tick" x="31" y="34">y</text>
  </svg>

  <svg v-else-if="kind === 'algebra'" class="math-visual algebra-visual" viewBox="0 0 360 220" fill="none">
    <text class="math-formula" x="32" y="30">A : ℝ² → ℝ²</text>
    <g transform="translate(140 152)">
      <path class="math-grid algebra-original" d="M-68-102V34M-34-102V34M0-102V34M34-102V34M68-102V34M102-102V34M-68-102H102M-68-68H102M-68-34H102M-68 0H102M-68 34H102" />
      <path class="math-guide" d="M0 0H68V-68H0Z" />
      <path class="math-axis" d="M-88 0H162m-6-4 6 4-6 4M0 45V-114m-4 6 4-6 4 6" />
      <g class="algebra-transform" transform="skewX(-20)">
        <path class="algebra-grid" d="M-68-102V34M-34-102V34M34-102V34M68-102V34M102-102V34M-68-102H102M-68-68H102M-68-34H102M-68 34H102" />
        <path class="algebra-plane" d="M0 0H68V-68H0Z" />
        <path class="math-vector" d="M0 0H68m-8-4 8 4-8 4" />
        <path class="math-vector math-secondary-stroke" d="M0 0V-68m-4 8 4-8 4 8" />
        <circle class="math-point" cx="68" cy="-68" r="3" />
        <animateTransform v-if="running" attributeName="transform" type="skewX" values="0;-28;0" dur="9s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".42 0 .58 1;.42 0 .58 1" />
      </g>
      <circle class="math-origin" r="3" />
      <text class="math-tick" x="71" y="18">e₁</text><text class="math-tick math-secondary-text" x="-21" y="-72">e₂</text>
    </g>
    <g class="algebra-matrix" transform="translate(269 38)">
      <path class="math-guide" d="M0 0H-5V43H0M51 0H56V43H51" />
      <text class="math-annotation" x="10" y="15">1</text><text class="math-annotation" x="35" y="15">k</text>
      <text class="math-annotation" x="10" y="36">0</text><text class="math-annotation" x="35" y="36">1</text>
    </g>
    <text class="math-label" x="180" y="212" text-anchor="middle">VECTOR → TRANSFORMATION</text>
  </svg>

  <svg v-else class="math-visual probability-visual" viewBox="0 0 360 220" fill="none">
    <path class="math-grid" d="M39 66H327M39 104H327M39 142H327M93 48V178M138 48V178M183 48V178M228 48V178M273 48V178" />
    <text class="math-formula" x="43" y="30">P(a ≤ X ≤ b)</text>
    <path class="math-area probability-area" :d="bellArea" />
    <g class="distribution-bars"><rect v-for="bar in distributionBars" :key="bar.x" :x="bar.x" :y="bar.y" width="13" :height="178 - bar.y" rx="1" /></g>
    <path class="math-guide" d="M138 111V178M228 111V178" />
    <path class="math-curve" :d="bellCurve" />
    <path class="math-axis" d="M33 178H332m-6-4 6 4-6 4" />
    <g class="probability-samples">
      <circle v-for="sample in samples" :key="sample.x" class="math-sample" :cx="sample.x" :cy="sample.y - 12" r="3">
        <animate v-if="running" attributeName="cy" :values="`42;${sample.y - 4};${sample.y - 4}`" keyTimes="0;.85;1" dur="4.2s" :begin="sample.delay" repeatCount="indefinite" />
        <animate v-if="running" attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.75;1" dur="4.2s" :begin="sample.delay" repeatCount="indefinite" />
      </circle>
    </g>
    <text class="math-tick" x="93" y="198" text-anchor="middle">−2σ</text><text class="math-tick" x="183" y="198" text-anchor="middle">μ</text><text class="math-tick" x="273" y="198" text-anchor="middle">+2σ</text>
    <text class="math-annotation" x="292" y="66">f(x)</text>
  </svg>
</template>

<style scoped>
.math-visual { --math-secondary: var(--fx-violet); display: block; width: 100%; height: auto; overflow: visible; }
.algebra-visual { --math-secondary: var(--fx-cyan); }.probability-visual { --math-secondary: var(--fx-cyan); }
.math-grid { stroke: var(--topic-accent); stroke-width: .75; opacity: .12; }
.math-axis { stroke: var(--text-2); stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; opacity: .5; }
.math-area { fill: var(--topic-accent); opacity: .1; transition: opacity .4s; }
.math-curve { stroke: var(--topic-accent); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.math-guide { stroke: var(--topic-accent); stroke-width: 1; stroke-dasharray: 3 5; opacity: .5; }
.math-tangent { stroke: var(--math-secondary); stroke-width: 1.6; stroke-linecap: round; }
.math-halo { fill: var(--math-secondary); opacity: .14; }.math-point { fill: var(--topic-accent); stroke: var(--space-1); stroke-width: 1.5; }
.calculus-tracer .math-point { fill: var(--math-secondary); }
.integral-bars rect { fill: var(--topic-accent); fill-opacity: .12; stroke: var(--topic-accent); stroke-opacity: .35; stroke-width: .7; }
.math-formula { fill: var(--topic-accent); font: italic 18px Georgia, 'Times New Roman', serif; letter-spacing: .5px; }
.math-annotation { fill: var(--topic-accent); font: italic 14px Georgia, 'Times New Roman', serif; }
.math-tick { fill: var(--text-2); font: 11px var(--font-code); }.math-label { fill: var(--text-2); font: 8px var(--font-code); letter-spacing: 1.3px; }
.math-secondary-text { fill: var(--math-secondary); }.math-vector.math-secondary-stroke { stroke: var(--math-secondary); }
.algebra-original { stroke: var(--text-2); opacity: .15; }.algebra-grid { stroke: var(--topic-accent); stroke-width: .8; opacity: .3; }
.algebra-plane { fill: var(--topic-accent); fill-opacity: .13; stroke: var(--topic-accent); stroke-width: 1.4; }
.math-vector { stroke: var(--topic-accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.math-origin { fill: var(--text-1); }.algebra-matrix .math-guide { stroke-dasharray: none; opacity: .65; }
.distribution-bars rect { fill: var(--topic-accent); fill-opacity: .12; stroke: var(--topic-accent); stroke-opacity: .45; stroke-width: .8; }
.probability-area { opacity: .15; }.math-sample { fill: var(--math-secondary); stroke: var(--space-1); stroke-width: 1; }
:global(.topic-card:is(:hover, :focus-visible)) .math-area { opacity: .23; }
@media (prefers-reduced-motion: reduce) { .math-visual * { transition: none !important; } }
</style>
