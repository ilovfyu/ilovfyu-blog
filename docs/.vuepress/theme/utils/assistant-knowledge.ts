export type KnowledgeChunk = { id: string; title: string; path: string; series: string; text: string; ready: boolean }
export type KnowledgeMatch = KnowledgeChunk & { score: number }
export type ChatTurn = { role: 'user' | 'assistant'; content: string }

const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/([a-z])(?=\d)/g, '$1 ').replace(/[^\p{L}\p{N}.+#]+/gu, ' ').trim()
const stopWords = new Set(['的', '了', '和', '与', '是', '在', '吗', '呢', '我', '你', '请', '请问', '可以', '帮我', '一下', '什么', '怎么', '如何', '为什么', '哪些', '介绍', '解释', '知识库', '文章', 'the', 'a', 'an', 'is', 'are', 'what', 'how', 'please'])

export function knowledgeQueryTerms(query: string) {
  const normalized = normalize(query).slice(0, 600)
  const segments = new Intl.Segmenter('zh', { granularity: 'word' }).segment(normalized)
  return [...new Set([...segments].filter(segment => segment.isWordLike).map(segment => segment.segment).filter(word => !stopWords.has(word) && (word.length > 1 || /^\d$/.test(word))))]
}

/** Lightweight lexical retrieval over public article text, not an embedding search. */
export function retrieveKnowledge(chunks: KnowledgeChunk[], question: string, limit = 4): KnowledgeMatch[] {
  const terms = knowledgeQueryTerms(question)
  if (!terms.length) return []
  const versions = question.match(/\b\d+\.\d+(?:\.\d+)?\b/g) || []
  const hasExactVersion = versions.length && chunks.some(chunk => versions.some(version => chunk.title.includes(version)))
  const ranked = chunks.map((chunk, order) => {
    const title = normalize(chunk.title), series = normalize(chunk.series), body = normalize(chunk.text)
    const matched = terms.filter(term => title.includes(term) || series.includes(term) || body.includes(term))
    const score = matched.reduce((sum, term) => sum + (title.includes(term) ? 12 : series.includes(term) ? 5 : 3), 0)
    return { ...chunk, score: score * (matched.length / terms.length), order }
  }).filter(chunk => chunk.score > 0 && (!hasExactVersion || versions.some(version => chunk.title.includes(version))))
    .sort((a, b) => b.score - a.score || a.order - b.order)
  const candidates = ranked[0]?.ready ? ranked.filter(chunk => chunk.ready) : ranked
  const seen = new Set<string>()
  return candidates.filter(chunk => !seen.has(chunk.path) && !!seen.add(chunk.path)).slice(0, Math.max(0, Math.min(limit, 6)))
}

export function localKnowledgeReply(matches: KnowledgeMatch[]) {
  const published = matches.filter(match => match.ready)
  if (published.length) return `找到了 ${published.length} 篇相关笔记，可以从下方来源继续阅读。\n\n${published.slice(0, 3).map((match, index) => `[${index + 1}] ${match.title}\n${match.text.slice(0, 240)}${match.text.length > 240 ? '…' : ''}`).join('\n\n')}\n\n当前展示的是知识库检索摘录；AI 回答服务连接后，会根据这些资料整理回答。`
  if (matches.length) return '找到了相关目录，但这些笔记的正文还在整理中。可以先打开下方文章查看进度，或换一个已有正文的主题。'
  return '知识库暂时没有找到相关正文。试试更具体的概念、技术名称或版本号，也可以从知识库目录继续查找。'
}

export function safeKnowledgePath(path: string) {
  return /^\/notes\/[a-zA-Z0-9_\-/%\p{Script=Han}.]+\/?$/u.test(path) && !path.includes('..') && !/%(?:2e|2f|5c)/i.test(path)
}
