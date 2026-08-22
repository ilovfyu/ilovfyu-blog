<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vuepress/client'

const router = useRouter()
const active = ref(false)
let timer = 0
let raf = 0
let removeGuard: (() => void) | null = null

function play() {
  active.value = false
  window.clearTimeout(timer)
  window.cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    active.value = true
    timer = window.setTimeout(() => { active.value = false }, 440)
  })
}

onMounted(() => {
  removeGuard = router.beforeEach(() => play())
})

onBeforeUnmount(() => {
  removeGuard?.()
  window.clearTimeout(timer)
  window.cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="page-gate" :class="{ active }" aria-hidden="true">
    <div class="gate-veil" />
    <div class="gate-beam" />
  </div>
</template>
