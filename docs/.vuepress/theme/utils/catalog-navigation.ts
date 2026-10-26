import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vuepress/client'
import type { Router, RouterScrollBehavior } from 'vue-router'
import { catalogOwnsScroll } from './catalog-scroll-policy'

const catalogs = new WeakMap<Router, { paths: Set<string>; positions: Map<string, RouterScrollBehavior> }>()
/** Filtering updates the URL without pulling the active search field out of view. */
export function useCatalogScroll(position?: RouterScrollBehavior) {
  const router = useRouter(), route = useRoute()
  let registeredPath = ''
  onMounted(() => {
    let catalog = catalogs.get(router)
    if (!catalog) {
      catalog = { paths: new Set(), positions: new Map() }; catalogs.set(router, catalog)
      const original = router.options.scrollBehavior, registered = catalog
      router.options.scrollBehavior = async (to, from, saved) => {
        if (saved) return original?.(to, from, saved)
        const resolvePosition = registered.positions.get(to.path)
        if (resolvePosition && to.path === from.path && to.query.series === from.query.series && to.query.topic === from.query.topic) {
          await nextTick()
          return resolvePosition(to, from, saved)
        }
        // A second theme scroll fights the catalog's anchor alignment, including across pages.
        if (registered.paths.has(to.path) && catalogOwnsScroll(to, from)) return false
        return original?.(to, from, saved)
      }
    }
    registeredPath = route.path
    catalog.paths.add(registeredPath)
    if (position) catalog.positions.set(registeredPath, position)
  })
  onBeforeUnmount(() => {
    const positions = catalogs.get(router)?.positions
    if (position && positions?.get(registeredPath) === position) positions.delete(registeredPath)
  })
}
