<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Point = [number, number]
type Zodiac = { key: string; name: string; latin: string; symbol: string; dates: string; points: Point[]; edges: [number, number][] }

const ZODIACS: Zodiac[] = [
  { key: 'ARIES', name: '白羊座', latin: 'ARIES', symbol: '♈', dates: '03.21 — 04.19', points: [[16,54],[30,45],[43,49],[55,39],[70,25],[82,34]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5]] },
  { key: 'TAURUS', name: '金牛座', latin: 'TAURUS', symbol: '♉', dates: '04.20 — 05.20', points: [[11,26],[29,36],[44,49],[57,46],[72,29],[88,21],[68,63],[51,72]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[3,6],[6,7],[7,2]] },
  { key: 'GEMINI', name: '双子座', latin: 'GEMINI', symbol: '♊', dates: '05.21 — 06.21', points: [[25,18],[29,38],[32,62],[27,81],[68,17],[65,39],[62,63],[69,82],[29,38],[65,39],[32,62],[62,63]], edges: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[8,9],[10,11]] },
  { key: 'CANCER', name: '巨蟹座', latin: 'CANCER', symbol: '♋', dates: '06.22 — 07.22', points: [[15,60],[31,49],[46,54],[60,42],[75,50],[87,37],[45,73]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[2,6]] },
  { key: 'LEO', name: '狮子座', latin: 'LEO', symbol: '♌', dates: '07.23 — 08.22', points: [[15,67],[28,51],[44,55],[58,44],[68,28],[80,31],[87,44],[65,70],[47,77]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[3,7],[7,8],[8,2]] },
  { key: 'VIRGO', name: '处女座', latin: 'VIRGO', symbol: '♍', dates: '08.23 — 09.22', points: [[9,34],[24,43],[38,35],[47,54],[63,44],[75,57],[89,48],[62,73],[45,80],[26,70]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[4,7],[7,8],[8,9],[9,3]] },
  { key: 'LIBRA', name: '天秤座', latin: 'LIBRA', symbol: '♎', dates: '09.23 — 10.23', points: [[16,67],[27,43],[45,31],[62,43],[77,29],[86,58],[65,72],[42,68]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[3,7]] },
  { key: 'SCORPIO', name: '天蝎座', latin: 'SCORPIO', symbol: '♏', dates: '10.24 — 11.22', points: [[9,25],[20,36],[31,32],[38,48],[52,54],[63,68],[75,64],[85,74],[91,60]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]] },
  { key: 'SAGITTARIUS', name: '射手座', latin: 'SAGITTARIUS', symbol: '♐', dates: '11.23 — 12.21', points: [[13,76],[28,61],[42,51],[58,38],[78,21],[63,22],[77,38],[39,29],[42,51],[66,70]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6],[2,7],[8,9]] },
  { key: 'CAPRICORN', name: '摩羯座', latin: 'CAPRICORN', symbol: '♑', dates: '12.22 — 01.19', points: [[11,36],[28,29],[42,40],[57,31],[76,42],[87,64],[69,77],[49,67],[31,75],[42,40]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]] },
  { key: 'AQUARIUS', name: '水瓶座', latin: 'AQUARIUS', symbol: '♒', dates: '01.20 — 02.18', points: [[9,32],[24,42],[37,29],[50,41],[64,30],[79,43],[91,32],[21,67],[38,57],[56,69],[74,59]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[7,8],[8,9],[9,10],[3,8]] },
  { key: 'PISCES', name: '双鱼座', latin: 'PISCES', symbol: '♓', dates: '02.19 — 03.20', points: [[10,39],[25,27],[41,35],[50,51],[61,67],[77,74],[90,61],[24,69],[39,62]], edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[3,8],[8,7]] },
]

const AMBIENT_STARS = Array.from({ length: 42 }, (_, index) => ({
  x: 3 + (index * 37) % 94,
  y: 4 + (index * 53) % 88,
  r: 0.16 + (index % 4) * 0.07,
  delay: `${-(index % 9) * 0.38}s`,
}))

const active = ref(0)
const paused = ref(false)
const reduced = ref(false)
const current = computed(() => ZODIACS[active.value])
let timer = 0

function select(index: number) {
  active.value = (index + ZODIACS.length) % ZODIACS.length
}

function restartTimer() {
  clearInterval(timer)
  if (!reduced.value && !paused.value) timer = window.setInterval(() => select(active.value + 1), 5000)
}

function selectAndRestart(index: number) {
  select(index)
  restartTimer()
}

function pause() {
  paused.value = true
  clearInterval(timer)
}

function resume() {
  paused.value = false
  restartTimer()
}

onMounted(() => {
  reduced.value = matchMedia('(prefers-reduced-motion: reduce)').matches
  restartTimer()
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="zodiac-carousel" @pointerenter="pause" @pointerleave="resume" @focusin="pause" @focusout="resume">
    <div class="zodiac-head"><span>CELESTIAL_PARTICLE_MAP / {{ String(active + 1).padStart(2, '0') }}</span><i>{{ paused ? 'PAUSED' : 'AUTO · 05S' }}</i></div>
    <svg class="zodiac-svg" viewBox="0 0 100 100" role="img" :aria-label="`${current.name} ${current.latin} 星座粒子图`">
      <defs>
        <linearGradient id="zodiac-line" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e0a348" /><stop offset="1" stop-color="#9a7e60" /></linearGradient>
        <radialGradient id="zodiac-core"><stop offset="0" stop-color="#ffffff" /><stop offset="0.35" stop-color="#f2cf9a" /><stop offset="1" stop-color="#e0a348" stop-opacity="0" /></radialGradient>
        <filter id="zodiac-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.25" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <g class="zodiac-ambient">
        <circle v-for="(star, index) in AMBIENT_STARS" :key="index" :cx="star.x" :cy="star.y" :r="star.r" :style="{ animationDelay: star.delay }" />
      </g>
      <Transition name="zodiac-shape" mode="out-in">
        <g :key="current.key" class="zodiac-shape">
          <text class="zodiac-symbol" x="50" y="59" text-anchor="middle">{{ current.symbol }}</text>
          <g class="zodiac-lines">
            <template v-for="(edge, index) in current.edges" :key="`${current.key}-${index}`">
              <line :x1="current.points[edge[0]][0]" :y1="current.points[edge[0]][1]" :x2="current.points[edge[1]][0]" :y2="current.points[edge[1]][1]" pathLength="1" :style="{ animationDelay: `${index * 0.08}s` }" />
              <line class="zodiac-energy" :x1="current.points[edge[0]][0]" :y1="current.points[edge[0]][1]" :x2="current.points[edge[1]][0]" :y2="current.points[edge[1]][1]" pathLength="1" :style="{ animationDelay: `${index * -0.29}s` }" />
            </template>
          </g>
          <g class="zodiac-points" filter="url(#zodiac-glow)">
            <g v-for="(point, index) in current.points" :key="`${current.key}-point-${index}`" :style="{ animationDelay: `${index * 0.065}s` }">
              <circle class="zodiac-halo" :cx="point[0]" :cy="point[1]" :r="index % 4 === 0 ? 2.8 : 2.1" />
              <circle class="zodiac-point" :cx="point[0]" :cy="point[1]" :r="index % 4 === 0 ? 0.86 : 0.62" />
            </g>
          </g>
        </g>
      </Transition>
    </svg>
    <div class="zodiac-controls">
      <button aria-label="上一个星座" @click="selectAndRestart(active - 1)">←</button>
      <div><button v-for="(item, index) in ZODIACS" :key="item.key" :class="{ active: active === index }" :aria-label="item.name" @click="selectAndRestart(index)" /></div>
      <button aria-label="下一个星座" @click="selectAndRestart(active + 1)">→</button>
    </div>
  </div>
</template>
