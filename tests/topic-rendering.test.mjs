import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { knowledgeTopicChapters, flattenKnowledgeChapters, knowledgeNoteId, knowledgeTopicPage } from '../docs/.vuepress/theme/utils/knowledge-index.ts'

// Render the actual recursive SFCs without needing a browser or a VuePress server.
test('nested topic content and directory navigation render all levels with valid anchors', async t => {
  const server = await createServer({
    configFile: false,
    root: resolve(import.meta.dirname, '..'),
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    plugins: [vue(), {
      name: 'topic-test-base',
      enforce: 'pre',
      transform(code, id) { if (id.endsWith('/TopicChapter.vue')) return code.replaceAll("'vuepress/client'", "'virtual:topic-test-base'") },
      resolveId(id) { if (id === 'virtual:topic-test-base') return '\0topic-test-base' },
      load(id) { if (id === '\0topic-test-base') return 'export const withBase = path => "/ilovfyu-blog" + path' },
    }],
  })
  t.after(() => server.close())
  const { default: Chapter } = await server.ssrLoadModule('/docs/.vuepress/theme/components/TopicChapter.vue')
  const { default: Nav } = await server.ssrLoadModule('/docs/.vuepress/theme/components/TopicGroupNav.vue')
  const notes = [
    { title: '01 · 基础导读', summary: '', path: '/notes/intro/', series: 'FastAPI', group: '基础', tags: [] },
    { title: '02 · 参数', summary: '请求数据', path: '/notes/params/', series: 'FastAPI', group: '基础 / 请求 & 响应 / 输入', tags: [] },
    { title: '03 · 进阶', summary: '', path: '/notes/advanced/', series: 'FastAPI', group: '高级 / 请求 & 响应 / 输入', tags: [] },
  ]
  const roots = knowledgeTopicChapters(notes, 'FastAPI')
  const chapters = flattenKnowledgeChapters(roots)
  const activeChapter = chapters.at(-1).id
  const content = await renderToString(createSSRApp({ render: () => h('main', roots.map(chapter => h(Chapter, { chapter, activeChapter }))) }))
  const nav = await renderToString(createSSRApp({ render: () => h('ul', roots.map(chapter => h(Nav, { chapter, activeChapter }))) }))
  for (const chapter of chapters) {
    assert.ok(content.includes(`id="${chapter.id}"`))
    assert.ok(nav.includes(`href="#${chapter.id}"`))
    assert.ok(content.includes(`aria-labelledby="${chapter.id}-title"`))
    if (chapter.children.length) {
      assert.ok(nav.includes(`id="${chapter.id}-children"`))
      assert.ok(nav.includes(`aria-controls="${chapter.id}-children"`))
    }
  }
  for (const note of notes) assert.equal(content.split(`href="/ilovfyu-blog${note.path}"`).length - 1, 1)
  assert.ok(nav.includes('aria-expanded="true"'))
  assert.ok(nav.includes(`href="#${activeChapter}" aria-current="location"`))
  assert.ok(content.includes('请求 &amp; 响应'))
  assert.ok(content.includes('2 篇笔记'))
  assert.ok(content.includes('<h4'))
  const rootNote = { ...notes[0], path: '/notes/root/', title: '根目录笔记', group: '' }
  const root = knowledgeTopicChapters([rootNote], 'FastAPI')[0]
  const rootContent = await renderToString(createSSRApp({ render: () => h(Chapter, { chapter: root, activeChapter: '' }) }))
  const rootNav = await renderToString(createSSRApp({ render: () => h('ul', [h(Nav, { chapter: root, activeChapter: '' })]) }))
  assert.ok(rootContent.includes(`id="${knowledgeNoteId(rootNote.path)}"`))
  assert.ok(rootNav.includes(`href="#${knowledgeNoteId(rootNote.path)}"`))
  assert.ok(!rootContent.includes('未分组') && !rootNav.includes('未分组'))
  const destinations = Object.fromEntries(Object.entries(knowledgeTopicPage(roots, 1, 1).destinations).map(([id, page]) => [id, `/topics/?series=FastAPI&amp;page=${page}#${id}`]))
  const paginatedNav = await renderToString(createSSRApp({ render: () => h('ul', roots.map(chapter => h(Nav, { chapter, activeChapter, destinations }))) }))
  assert.ok(paginatedNav.includes('page=3#'))
  assert.ok(paginatedNav.includes(knowledgeNoteId('/notes/advanced/')))
})
