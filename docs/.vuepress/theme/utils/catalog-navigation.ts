import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vuepress/client'
import type { Router } from 'vue-router'
import { readArticlePageSize } from './article-page-size'

const catalogs = new WeakMap<Router, Set<string>>()
/** Filtering updates the URL without pulling the active search field out of view. */
export function useCatalogScroll() {
  const router = useRouter(), route = useRoute()
  onMounted(() => {
    let paths = catalogs.get(router)
    if (!paths) {
      paths = new Set<string>(); catalogs.set(router, paths)
      const original = router.options.scrollBehavior, knownPaths = paths
      const filters = (query: typeof route.query) => JSON.stringify([query.q || '', query.category || '', query.tag || [], readArticlePageSize(query.size)])
      router.options.scrollBehavior = (to, from, saved) => {
        if (!saved && to.path === from.path && knownPaths.has(to.path) && filters(to.query) !== filters(from.query)) return false
        // Page buttons position the rendered list themselves; avoid the theme's delayed top scroll.
        if (!saved && to.path === from.path && knownPaths.has(to.path) && to.query.page !== from.query.page && (!to.hash || ['#topic-articles', '#post-articles'].includes(to.hash))) return false
        return original?.(to, from, saved)
      }
    }
    paths.add(route.path)
  })
}
