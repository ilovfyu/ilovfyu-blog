import { searchArticles } from './article-search.ts'
import { ARTICLE_PAGE_SIZE } from './article-page-size.ts'
export { ARTICLE_PAGE_SIZE } from './article-page-size.ts'
import { knowledgePath } from './knowledge-path.ts'
import { topicReadingRank } from '../data/topics.ts'
import { knowledgeChapterId, knowledgeNoteId } from './topic-anchors.ts'
export { knowledgeNoteId } from './topic-anchors.ts'

export type KnowledgeNote = {
  title: string; summary: string; path: string; series: string; group: string; groupPath?: string[]; tags: string[]
}
export type KnowledgeFilters = { topic: string | null; tags: string[]; query: string }
export type KnowledgeTopic = { name: string; count: number; groups: string[] }
const key = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase()
const distinct = (values: string[]) => [...new Map(values.filter(value => value.trim()).map(value => [key(value), value.trim()])).values()]

export function normalizeKnowledgeNotes<T extends KnowledgeNote>(notes: T[]): T[] {
  return notes.map(note => {
    const groupPath = knowledgePath(note.groupPath ?? note.group)
    return { ...note, series: note.series.trim() || '未分类', group: groupPath.join(' / '), groupPath, tags: distinct(note.tags) }
  })
}
export function knowledgeTopics(notes: KnowledgeNote[], configuredNames: string[] = []): KnowledgeTopic[] {
  const topics = new Map<string, KnowledgeTopic>()
  for (const name of distinct(configuredNames)) {
    if (name !== '未分类') topics.set(name, { name, count: 0, groups: [] })
  }
  for (const note of notes) {
    if (note.series === '未分类') continue
    const topic = topics.get(note.series) || { name: note.series, count: 0, groups: [] }
    topic.count++
    const path = knowledgePath(note.groupPath ?? note.group)
    topic.groups = distinct([...topic.groups, ...path.map((_, index) => path.slice(0, index + 1).join(' / '))])
    topics.set(note.series, topic)
  }
  return [...topics.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
}
export function knowledgeTags(notes: KnowledgeNote[]): string[] {
  return distinct(notes.flatMap(note => note.tags)).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}
export function filterKnowledgeNotes<T extends KnowledgeNote>(notes: T[], filters: KnowledgeFilters): T[] {
  const tags = filters.tags.map(key)
  return searchArticles(notes.filter(note => {
    const noteTags = new Set(note.tags.map(key))
    return (!filters.topic || note.series === filters.topic) && tags.every(tag => noteTags.has(tag))
  }), filters.query)
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
export function knowledgePage<T>(notes: T[], page: number, pageSize = ARTICLE_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(notes.length / pageSize))
  const currentPage = Math.min(Math.max(1, (Number.isFinite(page) ? Math.floor(page) : 1)), totalPages)
  return { totalPages, currentPage, entries: notes.slice((currentPage - 1) * pageSize, currentPage * pageSize) }
}

export function knowledgeTopicPath(name: string): string {
  return `/topics/?series=${encodeURIComponent(name)}`
}
export type KnowledgeChapter<T extends KnowledgeNote = KnowledgeNote> = {
  id: string; name: string; path: string[]; entries: T[]; children: KnowledgeChapter<T>[]; count: number
}

/** Build every directory level; a folder can contain both articles and subfolders. */
export function knowledgeTopicChapters<T extends KnowledgeNote>(notes: T[], topic: string): KnowledgeChapter<T>[] {
  const ordered = notes.filter(note => note.series === topic).sort((a, b) => topicReadingRank(topic, a.title) - topicReadingRank(topic, b.title)
    || a.title.localeCompare(b.title, 'zh-CN', { numeric: true }) || a.path.localeCompare(b.path))
  const chapters: KnowledgeChapter<T>[] = []
  const byPath = new Map<string, KnowledgeChapter<T>>()
  for (const note of ordered) {
    const path = knowledgePath(note.groupPath ?? note.group)
    let siblings = chapters
    let parent: KnowledgeChapter<T> | undefined
    // Ungrouped articles keep their own section alongside directory roots.
    for (let depth = 0; depth < Math.max(1, path.length); depth++) {
      const current = path.slice(0, depth + 1)
      const identity = JSON.stringify(current)
      let chapter = byPath.get(identity)
      if (!chapter) {
        chapter = { id: knowledgeChapterId(current), name: current.at(-1) || '未分组', path: current, entries: [], children: [], count: 0 }
        byPath.set(identity, chapter)
        siblings.push(chapter)
      }
      chapter.count++
      parent = chapter
      siblings = chapter.children
    }
    parent!.entries.push(note)
  }
  const sort = (items: KnowledgeChapter<T>[]) => {
    items.sort((a, b) => Number(!!a.path.length) - Number(!!b.path.length) || a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
    items.forEach(chapter => sort(chapter.children))
  }
  sort(chapters)
  return chapters
}

/** Preorder is shared by the first-reading link, scroll tracking and chapter counts. */
export function flattenKnowledgeChapters<T extends KnowledgeNote>(chapters: KnowledgeChapter<T>[]): KnowledgeChapter<T>[] {
  return chapters.flatMap(chapter => [chapter, ...flattenKnowledgeChapters(chapter.children)])
}

/** Paginate articles once, then retain only their ancestor directories on the current page. */
export function knowledgeTopicPage<T extends KnowledgeNote>(chapters: KnowledgeChapter<T>[], requestedPage: number, pageSize = ARTICLE_PAGE_SIZE) {
  const ordered = flattenKnowledgeChapters(chapters).flatMap(chapter => chapter.entries)
  const page = knowledgePage(ordered, requestedPage, pageSize)
  const selected = new Set(page.entries.map(note => note.path))
  const destinations: Record<string, number> = {}
  ordered.forEach((note, index) => { destinations[knowledgeNoteId(note.path)] = Math.floor(index / pageSize) + 1 })
  const prune = (items: KnowledgeChapter<T>[]): KnowledgeChapter<T>[] => items.flatMap(chapter => {
    const entries = chapter.entries.filter(note => selected.has(note.path))
    const children = prune(chapter.children)
    const first = chapter.entries[0]
    const firstChild = chapter.children.find(child => destinations[child.id])
    if (first || firstChild) destinations[chapter.id] = first ? destinations[knowledgeNoteId(first.path)] : destinations[firstChild!.id]
    return entries.length || children.length ? [{ ...chapter, entries, children }] : []
  })
  return { ...page, total: ordered.length, chapters: prune(chapters), destinations }
}
