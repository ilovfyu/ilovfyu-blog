import test from 'node:test'
import assert from 'node:assert/strict'
import { searchArticles } from '../docs/.vuepress/theme/utils/article-search.ts'
import { readArticlePageSize } from '../docs/.vuepress/theme/utils/article-page-size.ts'
import { knowledgePage, knowledgeTopicChapters, knowledgeTopicPage, flattenKnowledgeChapters, knowledgeNoteId } from '../docs/.vuepress/theme/utils/knowledge-index.ts'

const articles = [
  { title: '缓存稳定前缀', summary: 'Skills 动态更新的工程实践', tags: ['Python', 'KV Cache'], series: 'Agent 工程', group: '缓存' },
  { title: '项目结构与 lifespan', summary: '应用工厂和资源管理', tags: ['FastAPI'], series: 'FastAPI', group: '依赖与结构' },
  { title: 'FastAPI 请求模型', summary: 'Pydantic 校验', tags: ['Python'], series: 'FastAPI', group: '请求与响应' },
]
test('fragments, Latin typos, transpositions and full-width terms find the intended article', () => {
  for (const query of ['缓存前缀', 'Skills 实践', 'ＰＹＴＨＯＮ 缓存', '#KV Cache']) assert.equal(searchArticles(articles, query)[0], articles[0])
  assert.deepEqual(searchArticles(articles, 'lifspan'), [articles[1]])
  assert.deepEqual(searchArticles(articles, 'fastpai').map(item => item.title), [articles[2].title, articles[1].title])
  assert.deepEqual(searchArticles(articles, '请求响应'), [articles[2]])
})
test('all keywords must match and short or unrelated typos do not produce noisy results', () => {
  for (const query of ['lifspan Pydantic', '飞机航线', '缓存删除', 'zzzzzz', 'kz']) assert.deepEqual(searchArticles(articles, query), [])
  assert.deepEqual(searchArticles(articles, 'FastAPI Python'), [articles[2]])
})
test('title matches rank first, ties retain order and searching does not mutate the source', () => {
  const source = [{ title: '资源管理', summary: 'lifespan' }, { title: 'lifespan 入门' }, { title: 'lifespan 实践' }]
  assert.deepEqual(searchArticles(source, 'lifespan'), [source[1], source[2], source[0]])
  assert.equal(searchArticles(source, ' '), source)
  assert.equal(source[0].title, '资源管理')
})
test('page size accepts only supported values and safely restores URL arrays or defaults', () => {
  for (const size of [10, 20, 50]) {
    assert.equal(readArticlePageSize(String(size)), size)
    assert.equal(readArticlePageSize([String(size)]), size)
  }
  for (const value of [null, undefined, [], '', '1e2', '-10', '0', '1000', 'Infinity', {}, NaN]) assert.equal(readArticlePageSize(value, 20), 20)
  assert.equal(readArticlePageSize('invalid', 999), 10)
  assert.equal(readArticlePageSize('10', 50), 10)
})
test('twenty and fifty article pages preserve ancestor directories and locate each article', () => {
  const source = Array.from({ length: 47 }, (_, id) => ({ title: `${String(id).padStart(2, '0')} · API`, path: `/note-${id}/`, series: 'FastAPI', group: '基础 / 请求 / 参数' }))
  const tree = knowledgeTopicChapters(source, 'FastAPI')
  for (const size of [20, 50]) {
    const pages = Array.from({ length: Math.ceil(source.length / size) }, (_, i) => knowledgeTopicPage(tree, i + 1, size))
    assert.deepEqual(pages.flatMap(page => page.entries.map(note => note.path)), source.map(note => note.path))
    for (const page of pages) {
      assert.ok(page.entries.length <= size)
      assert.deepEqual(flattenKnowledgeChapters(page.chapters).map(chapter => chapter.name), ['基础', '请求', '参数'])
      for (const note of page.entries) assert.equal(page.destinations[knowledgeNoteId(note.path)], page.currentPage)
    }
  }
  assert.equal(knowledgePage(source, 3, 20).entries.length, 7)
  assert.equal(knowledgePage(source, 3, 50).currentPage, 1)
})
