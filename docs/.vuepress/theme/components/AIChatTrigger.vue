<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { inject } from 'vue'
import { assistantOpen, openAssistant } from '../utils/assistant-state'

const closeScreen = inject<(() => void) | undefined>('close-screen', undefined)
function open(event: MouseEvent) { closeScreen?.(); openAssistant(event) }
</script>

<template>
  <button class="ai-chat-trigger" type="button" title="与知识库对话" aria-label="打开 AI 知识库助手" aria-controls="ai-knowledge-drawer" :aria-expanded="assistantOpen" @click="open"><Sparkles aria-hidden="true" /></button>
</template>
