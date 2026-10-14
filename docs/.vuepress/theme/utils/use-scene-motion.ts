import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { bookTransitionActive } from './motion-state'

/** Play decorative scenes only while their surface is visible and motion is allowed. */
export function useSceneMotion(surface: Ref<HTMLElement | null>) {
  const running = ref(false)
  let visible = false
  let observer: IntersectionObserver | undefined
  let preference: MediaQueryList | undefined
  const sync = () => { running.value = visible && !document.hidden && !preference?.matches && !bookTransitionActive.value }
  watch(bookTransitionActive, sync)
  onMounted(() => {
    preference = matchMedia('(prefers-reduced-motion: reduce)')
    observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .05 })
    if (surface.value) observer.observe(surface.value)
    preference.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    preference?.removeEventListener('change', sync)
    document.removeEventListener('visibilitychange', sync)
  })
  return running
}
