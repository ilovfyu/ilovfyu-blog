import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { bookTransitionActive } from './motion-state'

/** Play decorative scenes only while their surface is visible and motion is allowed. */
export function useSceneMotion(surface: Ref<HTMLElement | null>) {
  const running = ref(false)
  let visible = false
  let observer: IntersectionObserver | undefined
  let preference: MediaQueryList | undefined
  let observedSurface: HTMLElement | null | undefined
  const sync = () => { running.value = !!preference && visible && !document.hidden && !preference.matches && !bookTransitionActive.value }
  const observeSurface = () => {
    if (!preference || observedSurface === surface.value) return
    observer?.disconnect()
    observedSurface = surface.value
    visible = false
    sync()
    if (surface.value) observer?.observe(surface.value)
  }
  watch(bookTransitionActive, sync)
  watch(surface, observeSurface, { flush: 'post' })
  onMounted(() => {
    preference = matchMedia('(prefers-reduced-motion: reduce)')
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .05 })
    }
    observeSurface()
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
