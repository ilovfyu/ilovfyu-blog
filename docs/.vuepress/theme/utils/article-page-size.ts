import { onMounted, ref, watch } from 'vue'
export const ARTICLE_PAGE_SIZE = 10
export const ARTICLE_PAGE_SIZES = [10, 20, 50] as const
const storageKey = 'blog:article-page-size'
export function readArticlePageSize(value: unknown, fallback = ARTICLE_PAGE_SIZE): number {
  const raw = Array.isArray(value) ? value[0] : value
  const number = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN
  return ARTICLE_PAGE_SIZES.some(size => size === number) ? number : ARTICLE_PAGE_SIZES.some(size => size === fallback) ? fallback : ARTICLE_PAGE_SIZE
}

/** Static SSR starts at ten; explicit URLs win over the reader's saved default after mount. */
export function useArticlePageSize(urlValue: () => unknown) {
  const pageSize = ref(ARTICLE_PAGE_SIZE)
  const restore = () => {
    let fallback = ARTICLE_PAGE_SIZE
    try { fallback = readArticlePageSize(localStorage.getItem(storageKey)) } catch { /* Storage may be unavailable. */ }
    pageSize.value = readArticlePageSize(urlValue(), fallback)
  }
  onMounted(restore)
  watch(urlValue, restore)
  function rememberPageSize(value: number) {
    pageSize.value = readArticlePageSize(value)
    try { localStorage.setItem(storageKey, String(pageSize.value)) } catch { /* URL state remains available. */ }
  }
  return { pageSize, rememberPageSize }
}
