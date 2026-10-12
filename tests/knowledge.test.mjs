import test from 'node:test'
import assert from 'node:assert/strict'
import { filterKnowledgeNotes, knowledgePage, knowledgeTagFacets, knowledgeTags, knowledgeTopics, normalizeKnowledgeNotes, readKnowledgeFilters } from '../docs/.vuepress/theme/utils/knowledge-index.ts'

const source = [
  { path: '/a/', title: '缓存稳定前缀', summary: 'Skills 动态变化的工程实践', series: 'Agent 工程', group: '缓存', tags: [' Python ', 'KV Cache', 'PYTHON'] },
  { path: '/b/', title: '工具契约', summary: 'Python 接口与 Skills', series: 'Agent 工程', group: '工具', tags: ['Python', 'Skills'] },
  { path: '/c/', title: '缓存稳定前缀', summary: 'Vue 性能分析', series: '前端', group: '性能', tags: ['Vue', 'KV Cache'] },
  { path: '/d/', title: '零散笔记', summary: '', series: ' ', group: '', tags: [] },
]
const notes = normalizeKnowledgeNotes(source)
const all = { topic: null, tags: [], query: '' }

test('normalization deduplicates tag spelling, keeps unclassified notes and does not mutate the source', () => {
  assert.deepEqual(notes[0].tags, ['PYTHON', 'KV Cache'])
  assert.equal(source[0].tags.length, 3)
  assert.equal(notes[3].series, '未分类')
  assert.equal(notes.length, 4)
  assert.equal(knowledgeTags(notes).length, 4)
})
test('topics derive counts and chapter groups from published notes; duplicate titles remain separate', () => {
  assert.deepEqual(knowledgeTopics(notes).map(topic => [topic.name, topic.count, topic.groups]), [['Agent 工程', 2, ['缓存', '工具']], ['前端', 1, ['性能']]])
  assert.equal(filterKnowledgeNotes(notes, { ...all, query: '缓存稳定前缀' }).length, 2)
})
test('topic, tag intersection and search combine; summaries and Unicode tag spelling are searchable', () => {
  assert.deepEqual(filterKnowledgeNotes(notes, { topic: 'Agent 工程', tags: ['python', 'KV Cache'], query: 'Skills 实践' }).map(note => note.path), ['/a/'])
  assert.deepEqual(filterKnowledgeNotes(notes, { ...all, tags: ['Ｐｙｔｈｏｎ', 'Skills'] }).map(note => note.path), ['/b/'])
  assert.equal(filterKnowledgeNotes(notes, { ...all, tags: ['Vue', 'Python'] }).length, 0)
})
test('facet counts reflect the current topic, query and all other selected tags', () => {
  const facets = knowledgeTagFacets(notes, { topic: 'Agent 工程', tags: ['Python'], query: '' })
  const counts = Object.fromEntries(facets.map(facet => [facet.tag.toLowerCase(), facet.count]))
  assert.deepEqual(counts, { 'kv cache': 1, python: 2, skills: 1, vue: 0 })
  assert.equal(knowledgeTagFacets(notes, { ...all, query: 'no match' }).every(facet => facet.count === 0), true)
})
test('URL filters restore repeated tags and page; unknown values and malformed pages are ignored', () => {
  const topics = knowledgeTopics(notes), tags = knowledgeTags(notes)
  assert.deepEqual(readKnowledgeFilters({ topic: 'Agent 工程', tag: ['python', 'ＰＹＴＨＯＮ', 'Skills', 'missing'], q: '缓存', page: '2' }, topics, tags), { topic: 'Agent 工程', tags: ['Python', 'Skills'], query: '缓存', page: 2 })
  assert.deepEqual(readKnowledgeFilters({ topic: 'missing', tag: null, page: '1e2', q: null }, topics, tags), { topic: null, tags: [], query: '', page: 1 })
  assert.equal(readKnowledgeFilters({ page: '9999999999999999999' }, topics, tags).page, 1)
  assert.equal(readKnowledgeFilters({ q: 'Skills ' }, topics, tags).query, 'Skills ')
})
test('pagination clamps stale pages after filtering and retains all entries across pages', () => {
  const entries = Array.from({ length: 31 }, (_, id) => ({ id }))
  assert.deepEqual(knowledgePage(entries, 3).entries, [{ id: 30 }])
  assert.equal(knowledgePage(entries.slice(0, 2), 3).currentPage, 1)
  assert.deepEqual(knowledgePage([], 9), { totalPages: 1, currentPage: 1, entries: [] })
})
