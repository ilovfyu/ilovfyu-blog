export type SearchableArticle = { title: string; summary?: string; tags?: string[]; series?: string; group?: string; label?: string }
type Field = { text: string; compact: string; words: string[]; weight: number }
const index = new WeakMap<SearchableArticle, Field[]>()
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, ' ').trim()

function fields(article: SearchableArticle) {
  let cached = index.get(article)
  if (!cached) {
    cached = [[article.title, 4], [(article.tags || []).join(' '), 3], [article.series, 2], [article.group, 2], [article.summary, 1], [article.label, 1]].filter(([value]) => !!value).map(([value, weight]) => {
      const text = normalize(String(value))
      return { text, compact: text.replaceAll(' ', ''), words: text.match(/[a-z0-9+#]+/g) || [], weight: Number(weight) }
    })
    index.set(article, cached)
  }
  return cached
}

/** Short edit distance including adjacent transpositions, bounded to technical words. */
function nearWord(a: string, b: string, limit: number) {
  if (Math.abs(a.length - b.length) > limit || a.length > 48 || b.length > 48) return false
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i), beforePrevious = previous
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], beforePrevious[j - 2] + 1)
    }
    beforePrevious = previous; previous = row
  }
  return previous[b.length] <= limit
}

/** Fragment matching tolerates small gaps without matching unrelated distant characters. */
function fragment(text: string, token: string) {
  if (token.length < 2) return false
  const allowance = Math.max(2, Math.floor(token.length * .75))
  for (let start = text.indexOf(token[0]); start !== -1; start = text.indexOf(token[0], start + 1)) {
    let position = start, matched = true
    for (let i = 1; i < token.length; i++) {
      position = text.indexOf(token[i], position + 1)
      if (position < 0 || position - start + 1 > token.length + allowance) { matched = false; break }
    }
    if (matched) return true
  }
  return false
}

export function articleSearchScore(article: SearchableArticle, query: string) {
  const tokens = normalize(query.replace(/(^|\s)#(?=\p{L})/gu, '$1')).split(/\s+/).filter(Boolean)
  if (!tokens.length) return 0
  let score = 0
  for (const token of tokens) {
    let best = 0
    for (const field of fields(article)) {
      let match = field.text === token ? 120 : field.text.includes(token) ? 100 : field.compact.includes(token) ? 90 : fragment(field.compact, token) ? 55 : 0
      if (!match && /^[a-z][a-z0-9+#]{3,47}$/.test(token) && field.words.some(word => nearWord(token, word, token.length >= 8 ? 2 : 1))) match = 40
      best = Math.max(best, match * field.weight)
    }
    if (!best) return -1
    score += best
  }
  return score
}

/** All query tokens must match; equal scores retain the original reading order. */
export function searchArticles<T extends SearchableArticle>(articles: T[], query: string): T[] {
  if (!query.trim()) return articles
  return articles.map((article, order) => ({ article, order, score: articleSearchScore(article, query) })).filter(item => item.score >= 0).sort((a, b) => b.score - a.score || a.order - b.order).map(item => item.article)
}
