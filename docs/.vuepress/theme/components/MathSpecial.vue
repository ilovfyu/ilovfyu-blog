<script setup lang="ts">
import { ArrowUpRight, BookOpen, CircleDot, Route, Search, Sigma } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vuepress/client'
import { mathSeries, type MathSeriesKey } from '../data/mathSpecial'

const activeKey = ref<MathSeriesKey>('probability')
const query = ref('')

const activeSeries = computed(() => mathSeries.find((series) => series.key === activeKey.value) ?? mathSeries[0])
const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase())
const visibleGroups = computed(() => activeSeries.value.groups.map((group) => ({
  ...group,
  chapters: normalizedQuery.value
    ? group.chapters.filter((chapter) => chapter.title.toLocaleLowerCase().includes(normalizedQuery.value))
    : group.chapters,
})).filter((group) => group.chapters.length))
const visibleCount = computed(() => visibleGroups.value.reduce((count, group) => count + group.chapters.length, 0))
const totalNotes = mathSeries.reduce((count, series) => count + series.total, 0)

function selectSeries(key: MathSeriesKey) {
  activeKey.value = key
  query.value = ''
  const url = new URL(window.location.href)
  url.searchParams.set('track', key)
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

onMounted(() => {
  const track = new URLSearchParams(window.location.search).get('track')
  if (mathSeries.some((series) => series.key === track)) activeKey.value = track as MathSeriesKey
})
</script>

<template>
  <main class="math-special">
    <div class="math-special-fx" aria-hidden="true"><i /><i /><span>∑</span></div>

    <section class="math-special-hero">
      <div class="math-special-hero-inner">
        <p class="math-special-kicker"><CircleDot /> MATHEMATICAL FOUNDATIONS / COURSE MAP</p>
        <h1>数学基础</h1>
        <p>用概率描述不确定性，用线性代数描述表示与变换，用微积分刻画变化与累积。课程从定义和手算出发，最终连接机器学习、深度学习与数值计算。</p>
        <a :href="withBase(mathSeries[0].route)"><BookOpen /> 从概率论路线开始 <ArrowUpRight /></a>
        <dl>
          <div><dt>PUBLISHED NOTES</dt><dd>{{ totalNotes }}</dd></div>
          <div><dt>ACTIVE TRACKS</dt><dd>{{ mathSeries.length }}</dd></div>
          <div><dt>PLANNED TRACKS</dt><dd>00</dd></div>
        </dl>
      </div>
      <div class="math-special-equation" :class="`math-special-equation-${activeSeries.key}`" aria-hidden="true">
        <span>{{ activeSeries.visual.label }}</span>
        <strong>{{ activeSeries.visual.primary }}</strong>
        <i>{{ activeSeries.visual.operator }}</i>
        <b>{{ activeSeries.visual.secondary }}</b>
        <small>{{ activeSeries.visual.caption }}</small>
      </div>
    </section>

    <nav class="math-track-switcher" aria-label="数学课程轨道">
      <button
        v-for="(series, index) in mathSeries"
        :key="series.key"
        type="button"
        :class="{ active: activeKey === series.key }"
        :aria-pressed="activeKey === series.key"
        @click="selectSeries(series.key)"
      >
        <span>{{ String(index + 1).padStart(2, '0') }}</span>
        <strong>{{ series.name }}</strong>
        <small>{{ series.total }} NOTES</small>
      </button>
    </nav>

    <section class="math-curriculum">
      <header class="math-curriculum-head">
        <div><p>// {{ activeSeries.code }} / {{ activeSeries.english }}</p><h2>{{ activeSeries.name }}</h2></div>
        <span>{{ activeSeries.summary }}</span>
      </header>

      <div class="math-curriculum-grid">
        <aside class="math-track-console">
          <div class="math-track-console-code"><Sigma /><span>{{ activeSeries.code }}</span></div>
          <strong>{{ activeSeries.total }}</strong>
          <small>CHAPTERS ONLINE</small>
          <p>{{ activeSeries.summary }}</p>
          <a :href="withBase(activeSeries.route)"><Route /> 打开学习路线 <ArrowUpRight /></a>
          <label>
            <Search />
            <input v-model="query" type="search" :placeholder="`检索${activeSeries.name}章节`" />
            <span>{{ visibleCount }}</span>
          </label>
        </aside>

        <div class="math-chapter-groups">
          <section v-for="(group, groupIndex) in visibleGroups" :key="group.name" class="math-chapter-group">
            <header><span>{{ String(groupIndex + 1).padStart(2, '0') }}</span><h3>{{ group.name }}</h3><small>{{ group.chapters.length }} CHAPTERS</small></header>
            <a v-for="chapter in group.chapters" :key="chapter.route" :href="withBase(chapter.route)" class="math-chapter-row">
              <span>{{ chapter.code }}</span>
              <strong>{{ chapter.title }}</strong>
              <small>READ</small>
              <ArrowUpRight />
            </a>
          </section>

          <div v-if="!visibleGroups.length" class="math-curriculum-empty">
            <Search /><strong>没有匹配章节</strong><button type="button" @click="query = ''">清除检索</button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
