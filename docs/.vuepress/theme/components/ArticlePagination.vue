<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed } from 'vue'

const props = defineProps<{ current: number; total: number; label: string }>()
const emit = defineEmits<{ change: [page: number] }>()
const pages = computed(() => {
  const visible = new Set([1, props.total, props.current - 1, props.current, props.current + 1])
  if (props.current < 4) [2, 3, 4].forEach(page => visible.add(page))
  if (props.current > props.total - 3) [props.total - 3, props.total - 2, props.total - 1].forEach(page => visible.add(page))
  const ordered = [...visible].filter(page => page > 0 && page <= props.total).sort((a, b) => a - b)
  const result: number[] = []
  ordered.forEach((page, index) => { if (index && page - ordered[index - 1] > 1) result.push(0); result.push(page) })
  return result
})
</script>

<template>
  <nav v-if="total > 1" class="article-pagination catalog-pagination" :aria-label="label">
    <button type="button" class="article-page-arrow" :disabled="current === 1" aria-label="上一页" @click="emit('change', current - 1)"><ChevronLeft aria-hidden="true" /><span>上一页</span></button>
    <div class="article-page-numbers"><template v-for="(page, index) in pages" :key="`${page}-${index}`"><button v-if="page" type="button" :aria-label="`第 ${page} 页`" :aria-current="page === current ? 'page' : undefined" @click="emit('change', page)">{{ String(page).padStart(2, '0') }}</button><span v-else aria-hidden="true">…</span></template></div>
    <button type="button" class="article-page-arrow" :disabled="current === total" aria-label="下一页" @click="emit('change', current + 1)"><span>下一页</span><ChevronRight aria-hidden="true" /></button>
    <span class="article-control-sr" aria-live="polite">第 {{ current }} 页，共 {{ total }} 页</span>
  </nav>
</template>
