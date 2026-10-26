import { readArticlePageSize } from './article-page-size.ts'

type CatalogLocation = { path: string; hash: string; query: Record<string, unknown> }

/** Catalog components own in-place navigation; route changes still use the theme. */
export function catalogOwnsScroll(to: CatalogLocation, from: CatalogLocation) {
  if (to.path !== from.path || to.query.series !== from.query.series || to.query.topic !== from.query.topic) return false
  const filters = (query: CatalogLocation['query']) => JSON.stringify([query.q || '', query.category || '', query.tag || [], readArticlePageSize(query.size)])
  const topic = to.query.series || to.query.topic
  return filters(to.query) !== filters(from.query) || to.query.page !== from.query.page || !!topic && to.hash !== from.hash
}
