<script setup lang="ts">
import { ARTICLE_PAGE_SIZES } from '../utils/article-page-size'
defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <div class="article-page-size" role="group" aria-label="每页文章数">
    <span class="article-size-label">每页篇数</span>
    <div class="article-size-options"><button v-for="size in ARTICLE_PAGE_SIZES" :key="size" type="button" :aria-label="`每页 ${size} 篇`" :aria-pressed="modelValue === size" @click="emit('update:modelValue', size)">{{ size }}</button></div>
  </div>
</template>
