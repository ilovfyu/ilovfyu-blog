<script setup lang="ts">
import { ARTICLE_PAGE_SIZES } from '../utils/article-page-size'
defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
</script>

<template>
  <label class="article-page-size"><span>每页</span><select :value="modelValue" aria-label="每页文章数" @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"><option v-for="size in ARTICLE_PAGE_SIZES" :key="size" :value="size">{{ size }} 篇</option></select></label>
</template>
