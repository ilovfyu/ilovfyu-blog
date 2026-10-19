<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { ref, useId } from 'vue'

withDefaults(defineProps<{ modelValue: string; label: string; placeholder?: string; heading?: string; fields?: string }>(), { heading: '文章检索', fields: '标题 / 摘要 / 标签' })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const input = ref<HTMLInputElement | null>(null)
function clear() { emit('update:modelValue', ''); input.value?.focus() }
</script>

<template>
  <div class="article-search">
    <div class="article-search-heading"><label :for="id">{{ heading }}</label><span>{{ fields }}</span></div>
    <div class="article-search-field">
      <Search aria-hidden="true" />
      <input :id="id" ref="input" :value="modelValue" type="search" :aria-label="label" :aria-describedby="`${id}-hint`" :placeholder="placeholder || '输入关键词，发现相关内容…'" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" @keydown.esc.prevent="clear" />
      <button v-if="modelValue" class="article-search-clear" type="button" aria-label="清除搜索" @click="clear"><X aria-hidden="true" /></button>
    </div>
    <span :id="`${id}-hint`" class="article-control-sr">支持片段和近似拼写匹配，多个关键词用空格分隔，按 Escape 清除。</span>
  </div>
</template>
