import test from 'node:test'
import assert from 'node:assert/strict'
import { topicNames } from '../docs/.vuepress/theme/data/topics.ts'
import { catalogOwnsScroll } from '../docs/.vuepress/theme/utils/catalog-scroll-policy.ts'
import { topicReadingPosition } from '../docs/.vuepress/theme/utils/topic-reading-position.ts'
import { knowledgeChapterId, resolveTopicAnchor } from '../docs/.vuepress/theme/utils/topic-anchors.ts'
import { filterKnowledgeNotes, knowledgePage, knowledgeTopicPage, knowledgeNoteId, knowledgeTagFacets, knowledgeTags, knowledgeTopics, knowledgeTopicChapters, flattenKnowledgeChapters, knowledgeTopicPath, normalizeKnowledgeNotes, readKnowledgeFilters } from '../docs/.vuepress/theme/utils/knowledge-index.ts'

const source = [
  { path: '/a/', title: '缓存稳定前缀', summary: 'Skills 动态变化的工程实践', series: 'Agent 工程', group: '缓存', tags: [' Python ', 'KV Cache', 'PYTHON'] },
  { path: '/b/', title: '工具契约', summary: 'Python 接口与 Skills', series: 'Agent 工程', group: '工具', tags: ['Python', 'Skills'] },
  { path: '/c/', title: '缓存稳定前缀', summary: 'Vue 性能分析', series: '前端', group: '性能', tags: ['Vue', 'KV Cache'] },
  { path: '/d/', title: '零散笔记', summary: '', series: ' ', group: '', tags: [] },
]
const notes = normalizeKnowledgeNotes(source)
const all = { topic: null, tags: [], query: '' }

test('article and directory anchors stay short, stable and distinct across full paths', () => {
  assert.equal(knowledgeNoteId('/notes/20261030052454-wallfjx/'), 'note-20261030052454-wallfjx')
  const paths = ['/notes/a/intro/', '/notes/b/intro/', '/notes/a-intro/', '/notes/请求 & 响应/', '/notes/请求#响应/']
  const ids = paths.map(knowledgeNoteId)
  assert.equal(new Set(ids).size, paths.length)
  assert.ok(ids.every(id => /^[a-z0-9-]+$/.test(id) && id.length < 50))
  assert.equal(knowledgeNoteId(paths[0]), ids[0])
  const folders = [['基础', '请求'], ['进阶', '请求'], ['基础 / 请求'], ['基础', '请求', '参数 🚀'.repeat(50)]]
  const groups = folders.map(knowledgeChapterId)
  assert.equal(new Set(groups).size, folders.length)
  assert.ok(groups.every(id => /^[a-z0-9-]+$/.test(id) && id.length < 50))
})

test('legacy article and nested directory links resolve without losing Unicode or hierarchy', () => {
  const hex = text => Array.from(text, char => char.codePointAt(0).toString(16)).join('-')
  const path = '/notes/20261030052454-wallfjx/'
  assert.equal(resolveTopicAnchor(`#topic-note-${hex(path)}`), knowledgeNoteId(path))
  const folders = ['基础', '请求 & 响应 #1?', '输入 🚀']
  assert.equal(resolveTopicAnchor(`#topic-group-${folders.map(hex).join('--')}`), knowledgeChapterId(folders))
  assert.equal(resolveTopicAnchor('#note-20261030052454-wallfjx'), 'note-20261030052454-wallfjx')
  assert.equal(resolveTopicAnchor('#topic-articles'), 'topic-articles')
  assert.equal(resolveTopicAnchor('#topic-ungrouped'), 'topic-ungrouped')
  assert.equal(resolveTopicAnchor('#%E0%A4%A'), '')
  for (const invalid of ['topic-note-110000', 'topic-note-d800', 'topic-group-nope', 'topic-note-2f--2f']) assert.equal(resolveTopicAnchor(`#${invalid}`), invalid)
})

test('SKLearn reading links start with fundamentals and keep new chapters after the planned learning path', () => {
  const titles = ['表格赛', '新增章节', '监督模型', 'pipeline与组合', '数据与预处理']
  const entries = titles.map((title, index) => ({ title, path: `/notes/${index}/`, summary: '', series: 'SKLearn', group: '', tags: [] }))
  const chapters = knowledgeTopicChapters(entries, 'SKLearn')
  const result = knowledgeTopicPage(chapters, 1, 10).entries
  assert.deepEqual(result.map(entry => entry.title), ['数据与预处理', 'pipeline与组合', '监督模型', '表格赛', '新增章节'])
  assert.equal(entries[0].title, '表格赛')
})

test('topic pagination and directory anchors use one catalog scroll owner without taking over topic changes', () => {
  const first = { path: '/topics/', query: { series: '线性代数', page: '1' }, hash: '#topic-articles' }
  assert.equal(catalogOwnsScroll({ ...first, query: { ...first.query, page: '2' }, hash: '#topic-note-book' }, first), true)
  assert.equal(catalogOwnsScroll({ ...first, hash: '#topic-note-vector' }, first), true)
  assert.equal(catalogOwnsScroll({ ...first, query: { ...first.query, q: '矩阵' }, hash: '' }, first), true)
  assert.equal(catalogOwnsScroll({ ...first, query: { series: 'Python' }, hash: '' }, first), false)
  assert.equal(catalogOwnsScroll({ ...first, path: '/notes/vector/' }, first), false)
  assert.equal(catalogOwnsScroll(first, first), false)
  assert.equal(catalogOwnsScroll({ path: '/posts/', query: {}, hash: '#heading' }, { path: '/posts/', query: {}, hash: '' }), false)
})

test('the reading line selects the current article or folder heading, never an unreached last chapter', () => {
  const markers = [
    { id: 'root', chapter: 'root', kind: 'chapter', top: -900 },
    { id: 'quadratic', chapter: 'root', kind: 'note', top: -700 },
    { id: 'gpu', chapter: 'root', kind: 'note', top: 24 },
    { id: 'python', chapter: 'root', kind: 'note', top: 220 },
    { id: 'books', chapter: 'books', kind: 'chapter', top: 500 },
    { id: 'matrix', chapter: 'books', kind: 'note', top: 600 },
  ]
  assert.deepEqual(topicReadingPosition(markers), { chapter: 'root', note: 'gpu' })
  assert.deepEqual(topicReadingPosition(markers, 580), { chapter: 'books', note: '' })
  assert.deepEqual(topicReadingPosition(markers, 868), { chapter: 'books', note: 'matrix' })
  assert.deepEqual(topicReadingPosition(markers.map(marker => ({ ...marker, top: marker.top - 400 }))), { chapter: 'books', note: '' })
  assert.deepEqual(topicReadingPosition(markers.map(marker => ({ ...marker, top: marker.top - 500 }))), { chapter: 'books', note: 'matrix' })
  assert.deepEqual(topicReadingPosition([{ id: 'root', chapter: 'root', kind: 'chapter', top: 100 }, { id: 'first', chapter: 'root', kind: 'note', top: 100 }]), { chapter: 'root', note: 'first' })
  assert.deepEqual(topicReadingPosition(markers.map(marker => ({ ...marker, top: marker.top + 2000 }))), { chapter: '', note: '' })
})

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
test('configured topics exist without articles and merge with their first published note', () => {
  const emptyTopics = knowledgeTopics([], topicNames)
  assert.deepEqual(new Set(emptyTopics.map(topic => topic.name)), new Set(['微积分', '线性代数', '概率', 'MLearn', '数据分析', 'Python', 'Go', 'GBDT', 'SKLearn', '算法与数据结构', '容器', 'OS', '网络']))
  assert.ok(emptyTopics.every(topic => topic.count === 0 && topic.groups.length === 0))
  const entries = normalizeKnowledgeNotes([{ ...source[0], series: '微积分', group: '极限' }])
  const topics = knowledgeTopics(entries, topicNames)
  assert.equal(topics.length, topicNames.length)
  assert.deepEqual(topics.find(topic => topic.name === '微积分'), { name: '微积分', count: 1, groups: ['极限'] })
  assert.deepEqual(knowledgeTopicChapters(entries, '概率'), [])
})
test('topic, tag intersection and search combine; summaries and Unicode tag spelling are searchable', () => {
  assert.deepEqual(filterKnowledgeNotes(notes, { topic: 'Agent 工程', tags: ['python', 'KV Cache'], query: 'Skills 实践' }).map(note => note.path), ['/a/'])
  assert.deepEqual(filterKnowledgeNotes(notes, { ...all, tags: ['Ｐｙｔｈｏｎ', 'Skills'] }).map(note => note.path), ['/b/'])
  assert.equal(filterKnowledgeNotes(notes, { ...all, tags: ['Vue', 'Python'] }).length, 0)
})
test('facet counts reflect the current topic, query and selected tag intersection', () => {
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
  assert.deepEqual(knowledgePage(entries, 4).entries, [{ id: 30 }])
  assert.equal(knowledgePage(entries, 1).entries.length, 10)
  assert.equal(knowledgePage(entries.slice(0, 2), 3).currentPage, 1)
  assert.deepEqual(knowledgePage([], 9), { totalPages: 1, currentPage: 1, entries: [] })
})


test('standalone topic links encode names without leaking reserved URL characters', () => {
  const name = '缓存 / Skills & KV? #1'
  const url = new URL(knowledgeTopicPath(name), 'https://example.com')
  assert.equal(url.pathname, '/topics/')
  assert.equal(url.searchParams.get('series'), name)
  assert.equal(url.hash, '')
  assert.equal([...url.searchParams].length, 1)
})
test('topic chapters use natural reading order, preserve distinct articles and handle ungrouped notes', () => {
  const entries = normalizeKnowledgeNotes([
    { ...source[0], title: '10 · 复用', group: '进阶' },
    { ...source[1], title: '02 · 技能', group: '基础' },
    { ...source[0], path: '/a2/', title: '01 · 前缀', group: '基础' },
    { ...source[1], path: '/b2/', title: '03 · 补充', group: '' },
    source[2],
  ])
  const chapters = knowledgeTopicChapters(entries, 'Agent 工程')
  assert.deepEqual(chapters.map(chapter => [chapter.name, chapter.count, chapter.entries.map(note => note.path)]), [
    ['未分组', 1, ['/b2/']],
    ['基础', 2, ['/a2/', '/b/']],
    ['进阶', 1, ['/a/']],
  ])
  assert.deepEqual(knowledgeTopicChapters(entries, '尚未发布'), [])
})

test('tag counts preserve AND selection, Unicode spelling, topic and search constraints', () => {
  const counts = filters => Object.fromEntries(knowledgeTagFacets(notes, filters).map(facet => [facet.tag.toLowerCase(), facet.count]))
  assert.deepEqual(counts({ ...all, tags: ['Python', 'KV Cache'] }), { 'kv cache': 1, python: 1, skills: 0, vue: 0 })
  assert.deepEqual(counts({ ...all, tags: ['Python', 'Skills'] }), { 'kv cache': 0, python: 1, skills: 1, vue: 0 })
  assert.deepEqual(counts({ ...all, tags: ['Python', 'Vue'] }), { 'kv cache': 0, python: 0, skills: 0, vue: 0 })
  assert.deepEqual(counts({ topic: 'Agent 工程', query: '接口', tags: ['Ｐｙｔｈｏｎ', 'Skills'] }), { 'kv cache': 0, python: 1, skills: 1, vue: 0 })
})


test('nested directories preserve direct articles, all descendants, and distinct same-named folders', () => {
  const entries = normalizeKnowledgeNotes([
    { ...source[0], path: '/intro/', series: 'FastAPI', group: '', title: '00 · 概览' },
    { ...source[0], path: '/basic/', series: 'FastAPI', group: '基础', title: '01 · 基础导读' },
    { ...source[0], path: '/request/', series: 'FastAPI', group: '基础 / 请求 / 参数', title: '02 · 参数' },
    { ...source[0], path: '/response/', series: 'FastAPI', group: '高级 / 请求 / 参数', title: '03 · 进阶参数' },
  ])
  const chapters = knowledgeTopicChapters(entries, 'FastAPI')
  assert.deepEqual(chapters.map(chapter => [chapter.name, chapter.count]), [['未分组', 1], ['高级', 1], ['基础', 2]])
  const basic = chapters.find(chapter => chapter.name === '基础')
  assert.deepEqual(basic.entries.map(note => note.path), ['/basic/'])
  assert.deepEqual(basic.children[0].children[0].entries.map(note => note.path), ['/request/'])
  const flat = flattenKnowledgeChapters(chapters)
  assert.equal(flat.length, 7)
  assert.equal(flat.flatMap(chapter => chapter.entries).length, entries.length)
  assert.equal(new Set(flat.map(chapter => chapter.id)).size, flat.length)
  const originalIds = new Map(flat.map(chapter => [chapter.path.join('/'), chapter.id]))
  const added = { ...entries[0], path: '/new/', title: '00 · 新笔记', group: '新增目录', groupPath: ['新增目录'] }
  for (const chapter of flattenKnowledgeChapters(knowledgeTopicChapters([added, ...entries], 'FastAPI'))) {
    const original = originalIds.get(chapter.path.join('/'))
    if (original) assert.equal(chapter.id, original)
  }
})

test('hierarchies accept normalized path arrays and keep reserved characters safe in anchors', () => {
  const entries = normalizeKnowledgeNotes([
    { ...source[0], series: 'FastAPI', group: 'ignored', groupPath: [' 基础 ', '请求 & 响应 #1?', '输入'] },
    { ...source[1], series: 'FastAPI', group: '基础\\请求 & 响应 #1?\\输出' },
  ])
  const chapters = knowledgeTopicChapters(entries, 'FastAPI')
  const flat = flattenKnowledgeChapters(chapters)
  assert.equal(chapters[0].count, 2)
  assert.equal(chapters[0].children.length, 1)
  assert.equal(chapters[0].children[0].children.length, 2)
  assert.ok(flat.every(chapter => /^[a-z0-9-]+$/.test(chapter.id)))
  assert.equal(filterKnowledgeNotes(entries, { ...all, query: '响应 输入' }).length, 1)
})


test('topic pagination caps articles at ten across folders and retains full ancestor paths', () => {
  const entries = Array.from({ length: 27 }, (_, index) => ({ ...source[0], path: `/note-${index}/`, title: `${String(index).padStart(2, '0')} · 正文`, group: index < 2 ? '' : index < 14 ? '01 基础 / 请求 / 参数' : '02 进阶 / 请求 / 参数' }))
  const tree = knowledgeTopicChapters(entries, 'Agent 工程')
  const flattened = flattenKnowledgeChapters(tree)
  const pages = [1, 2, 3].map(number => knowledgeTopicPage(tree, number))
  assert.deepEqual(pages.map(page => page.entries.length), [10, 10, 7])
  assert.equal(new Set(pages.flatMap(page => page.entries.map(note => note.path))).size, entries.length)
  assert.deepEqual(pages.flatMap(page => page.entries.map(note => note.path)), entries.map(note => note.path))
  for (const page of pages) {
    assert.equal(flattenKnowledgeChapters(page.chapters).flatMap(chapter => chapter.entries).length, page.entries.length)
    for (const note of page.entries) {
      const group = flattenKnowledgeChapters(page.chapters).find(chapter => chapter.entries.some(entry => entry.path === note.path))
      assert.deepEqual(group.path, knowledgeTopicChapters([note], 'Agent 工程').flatMap(root => flattenKnowledgeChapters([root])).at(-1).path)
      assert.equal(page.destinations[knowledgeNoteId(note.path)], page.currentPage)
    }
  }
  const advanced = flattened.find(chapter => chapter.path.join('/') === '02 进阶/请求/参数')
  assert.equal(pages[0].destinations[advanced.id], 2)
  assert.equal(knowledgeTopicPage(tree, 999).currentPage, 3)
  assert.equal(knowledgeTopicPage(tree, NaN).currentPage, 1)
  assert.equal(flattenKnowledgeChapters(tree).flatMap(chapter => chapter.entries).length, 27)
})

test('folder order is independent of the title of its first article', () => {
  const tree = knowledgeTopicChapters([
    { ...source[0], title: '99 · 基础', group: '01 基础' },
    { ...source[1], title: '01 · 进阶', group: '10 进阶' },
  ], 'Agent 工程')
  assert.deepEqual(tree.map(chapter => chapter.name), ['01 基础', '10 进阶'])
})
