import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Shared lifecycle for project progress bars and one-time section reveals. */
export function useLandingEffects(revealSelector: string) {
  const scrollPct = ref(0)
  let frame = 0
  let observer: IntersectionObserver | undefined
  let resizeObserver: ResizeObserver | undefined

  function update() {
    frame = 0
    const distance = document.documentElement.scrollHeight - window.innerHeight
    scrollPct.value = distance > 0 ? Math.min(100, Math.max(0, window.scrollY / distance * 100)) : 0
  }
  function queueUpdate() {
    if (!frame) frame = requestAnimationFrame(update)
  }
  function scrollToId(id: string) {
    document.querySelector(id)?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
  }

  onMounted(() => {
    queueUpdate()
    window.addEventListener('scroll', queueUpdate, { passive: true })
    window.addEventListener('resize', queueUpdate, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(queueUpdate)
      resizeObserver.observe(document.documentElement)
    }
    const sections = document.querySelectorAll(revealSelector)
    if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sections.forEach(section => section.classList.add('in'))
      return
    }
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('in')
        observer?.unobserve(entry.target)
      }
    }, { threshold: 0.1 })
    sections.forEach(section => observer?.observe(section))
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', queueUpdate)
    window.removeEventListener('resize', queueUpdate)
    observer?.disconnect()
    resizeObserver?.disconnect()
  })
  return { scrollPct, scrollToId }
}
