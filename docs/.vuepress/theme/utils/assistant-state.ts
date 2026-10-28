import { ref } from 'vue'

export const assistantOpen = ref(false)
export const assistantOpener = ref<HTMLElement | null>(null)
export const assistantDraft = ref('')

export function openAssistant(event: MouseEvent) {
  assistantOpener.value = event.currentTarget as HTMLElement
  assistantOpen.value = true
}
