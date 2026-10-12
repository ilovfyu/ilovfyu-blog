<script setup lang="ts">
import { Check, ChevronDown, Hash, Search, X } from '@lucide/vue'
import { computed, nextTick, ref, useId } from 'vue'

const props = defineProps<{ facets: { tag: string; count: number }[]; selected: string[] }>()
const emit = defineEmits<{ toggle: [tag: string]; clear: [] }>()
const open = ref(false)
const query = ref('')
const sort = ref('popular')
const trigger = ref<HTMLButtonElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const selectedList = ref<HTMLElement | null>(null)
const panelId = useId()
const normalize = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase()
const popular = computed(() => [...props.facets].filter(item => item.count > 0).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN')).slice(0, 4))
const options = computed(() => {
  const tokens = normalize(query.value).split(/\s+/).filter(Boolean)
  return props.facets.filter(item => tokens.every(token => normalize(item.tag).includes(token))).sort((a, b) => sort.value === 'popular' ? b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN') : a.tag.localeCompare(b.tag, 'zh-CN'))
})
async function togglePanel() {
  if (open.value) { close(); return }
  open.value = true
  await nextTick(); search.value?.focus()
}
function close() { open.value = false; query.value = ''; trigger.value?.focus() }
async function remove(tag: string, index: number) {
  emit('toggle', tag)
  await nextTick()
  const buttons = selectedList.value?.querySelectorAll('button')
  if (buttons?.length) buttons[Math.min(index, buttons.length - 1)].focus()
  else trigger.value?.focus()
}
function clear() { emit('clear'); trigger.value?.focus() }
</script>

<template>
  <div class="knowledge-tag-filter" @keydown.esc.stop.prevent="close">
    <div class="knowledge-tag-toolbar">
      <button ref="trigger" type="button" class="knowledge-tag-trigger" :aria-expanded="open" :aria-controls="panelId" @click="togglePanel"><Hash aria-hidden="true" />标签筛选<span>{{ selected.length ? `已选 ${selected.length}` : `${facets.length} 个` }}</span><ChevronDown aria-hidden="true" /></button>
      <div v-if="selected.length" ref="selectedList" class="knowledge-selected-tags" aria-label="已选标签">
        <button v-for="(tag, index) in selected" :key="tag" type="button" class="knowledge-selected-tag" :title="tag" :aria-label="`移除标签 ${tag}`" @click="remove(tag, index)"><span>#{{ tag }}</span><X aria-hidden="true" /></button>
      </div>
      <div v-else-if="!open" class="knowledge-popular-tags" aria-label="常用标签"><span>常用</span><button v-for="facet in popular" :key="facet.tag" type="button" @click="emit('toggle', facet.tag)">#{{ facet.tag }}</button></div>
      <button v-if="selected.length" type="button" class="knowledge-clear-tags" @click="clear">清空标签</button>
    </div>
    <Transition name="knowledge-filter">
      <section v-if="open" :id="panelId" class="knowledge-tag-browser" aria-label="全部标签">
        <div class="knowledge-tag-browser-tools">
          <label class="catalog-search"><Search aria-hidden="true" /><input ref="search" v-model="query" type="search" aria-label="搜索标签" placeholder="输入标签名称，快速定位" /></label>
          <select v-model="sort" aria-label="标签排序"><option value="popular">热门优先</option><option value="name">名称排序</option></select>
          <button type="button" class="knowledge-tag-close" aria-label="收起标签筛选" @click="close"><X aria-hidden="true" /></button>
        </div>
        <div class="knowledge-tag-browser-meta"><p>可多选，笔记需同时匹配所有已选标签</p><span role="status" aria-live="polite">{{ options.length }} / {{ facets.length }} 个标签</span></div>
        <div v-if="options.length" class="knowledge-tag-options" role="group" aria-label="可选标签">
          <button v-for="facet in options" :key="facet.tag" type="button" class="knowledge-tag" :title="facet.tag" :aria-pressed="selected.includes(facet.tag)" :disabled="!facet.count && !selected.includes(facet.tag)" @click="emit('toggle', facet.tag)"><Check v-if="selected.includes(facet.tag)" aria-hidden="true" /><span v-else aria-hidden="true" class="knowledge-tag-hash">#</span><span class="knowledge-tag-name">{{ facet.tag }}</span><span class="knowledge-tag-count">{{ facet.count }}</span></button>
        </div>
        <div v-else class="knowledge-tag-empty"><p>没有找到这个标签</p><button type="button" @click="query = ''">查看全部标签</button></div>
        <div class="knowledge-tag-browser-footer"><span>筛选结果实时更新</span><button type="button" @click="close">完成筛选 · 收起</button></div>
      </section>
    </Transition>
  </div>
</template>
