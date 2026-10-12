export type KnowledgeNote = {
  title: string; summary: string; path: string; series: string; group: string; tags: string[]
}
export type KnowledgeFilters = { topic: string | null; tags: string[]; query: string }
export type KnowledgeTopic = { name: string; count: number; groups: string[] }
const key = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase()
const distinct = (values: string[]) => [...new Map(values.filter(value => value.trim()).map(value => [key(value), value.trim()])).values()]

export function normalizeKnowledgeNotes<T extends KnowledgeNote>(notes: T[]): T[] {
  return notes.map(note => ({ ...note, series: note.series.trim() || '未分类', group: note.group.trim(), tags: distinct(note.tags) }))
}
export function knowledgeTopics(notes: KnowledgeNote[]): KnowledgeTopic[] {
  const topics = new Map<string, KnowledgeTopic>()
  for (const note of notes) {
    if (note.series === '未分类') continue
    const topic = topics.get(note.series) || { name: note.series, count: 0, groups: [] }
    topic.count++
    topic.groups = distinct([...topic.groups, note.group])
    topics.set(note.series, topic)
  }
  return [...topics.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
}
export function knowledgeTags(notes: KnowledgeNote[]): string[] {
  return distinct(notes.flatMap(note => note.tags)).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}
export function filterKnowledgeNotes<T extends KnowledgeNote>(notes: T[], filters: KnowledgeFilters): T[] {
  const tokens = key(filters.query).split(/\s+/).filter(Boolean)
  const tags = filters.tags.map(key)
  return notes.filter(note => {
    const noteTags = new Set(note.tags.map(key))
    const text = key(`${note.title} ${note.summary} ${note.series} ${note.group} ${note.tags.join(' ')}`)
    return (!filters.topic || note.series === filters.topic) && tags.every(tag => noteTags.has(tag)) && tokens.every(token => text.includes(token))
  })
}
export function knowledgeTagFacets(notes: KnowledgeNote[], filters: KnowledgeFilters) {
  const counts = new Map<string, number>()
  for (const note of filterKnowledgeNotes(notes, filters)) {
    for (const tag of new Set(note.tags.map(key))) counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return knowledgeTags(notes).map(tag => ({ tag, count: counts.get(key(tag)) || 0 }))
}
export function readKnowledgeFilters(query: Record<string, unknown>, topics: KnowledgeTopic[], tags: string[]) {
  const first = (value: unknown) => typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : ''
  const topic = first(query.topic)
  const rawTags = Array.isArray(query.tag) ? query.tag : [query.tag]
  const knownTags = new Map(tags.map(tag => [key(tag), tag]))
  const selected = distinct(rawTags.filter((tag): tag is string => typeof tag === 'string')).map(tag => knownTags.get(key(tag))).filter((tag): tag is string => !!tag)
  const rawPage = first(query.page)
  return {
    topic: topics.some(item => item.name === topic) ? topic : null,
    tags: selected,
    query: first(query.q),
    page: /^\d+$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)) ? Math.max(1, Number(rawPage)) : 1,
  }
}
export function knowledgePage<T>(notes: T[], page: number, pageSize = 15) {
  const totalPages = Math.max(1, Math.ceil(notes.length / pageSize))
  const currentPage = Math.min(Math.max(1, Math.floor(page)), totalPages)
  return { totalPages, currentPage, entries: notes.slice((currentPage - 1) * pageSize, currentPage * pageSize) }
}

export function knowledgeTopicPath(name: string): string {
  return `/topics/?series=${encodeURIComponent(name)}`
}
/** Numbered titles define reading order; chapter groups retain their first appearance. */
export function knowledgeTopicChapters<T extends KnowledgeNote>(notes: T[], topic: string) {
  const ordered = notes.filter(note => note.series === topic).sort((a, b) => a.title.localeCompare(b.title, 'zh-CN', { numeric: true }) || a.path.localeCompare(b.path))
  const chapters = new Map<string, T[]>()
  for (const note of ordered) {
    const group = note.group || '学习笔记'
    const entries = chapters.get(group) || []
    entries.push(note); chapters.set(group, entries)
  }
  return [...chapters].map(([name, entries], index) => ({ id: `topic-chapter-${index + 1}`, name, entries }))
}
