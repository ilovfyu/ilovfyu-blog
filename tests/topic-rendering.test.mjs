import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createSSRApp, createRenderer, h, ref, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { knowledgeTopicChapters, flattenKnowledgeChapters, knowledgeNoteId, knowledgeTopicPage } from '../docs/.vuepress/theme/utils/knowledge-index.ts'
import { topicNames, topicAppearance } from '../docs/.vuepress/theme/data/topics.ts'

test('scene motion pauses for reduced motion, offscreen surfaces and hidden documents', async t => {
  const server = await createServer({ configFile: false, root: resolve(import.meta.dirname, '..'), server: { middlewareMode: true, ws: false }, optimizeDeps: { noDiscovery: true } })
  t.after(() => server.close())
  const { useSceneMotion } = await server.ssrLoadModule('/docs/.vuepress/theme/utils/use-scene-motion.ts')
  const originals = Object.fromEntries(['document', 'matchMedia', 'IntersectionObserver'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]))
  const documentMock = Object.assign(new EventTarget(), { hidden: false })
  const preference = Object.assign(new EventTarget(), { matches: false })
  let enter
  let disconnected = false
  Object.assign(globalThis, {
    document: documentMock,
    matchMedia: () => preference,
    IntersectionObserver: class {
      constructor(callback) { enter = value => callback([{ isIntersecting: value }]) }
      observe() {}
      disconnect() { disconnected = true }
    },
  })
  const renderer = createRenderer({
    createElement: () => ({ props: {} }), patchProp: (element, key, _old, value) => { element.props[key] = value },
    insert: (child, parent) => { parent.child = child }, remove() {}, setElementText() {},
    createText: text => ({ text }), createComment: () => ({}), setText() {}, parentNode: () => null, nextSibling: () => null,
  })
  let running
  const surface = ref(null)
  const app = renderer.createApp({ setup() { running = useSceneMotion(surface); return () => h('div') } })
  try {
    app.mount({})
    assert.equal(running.value, false)
    surface.value = {}; await nextTick()
    enter(true); await nextTick(); assert.equal(running.value, true)
    preference.matches = true; preference.dispatchEvent(new Event('change')); await nextTick(); assert.equal(running.value, false)
    preference.matches = false; preference.dispatchEvent(new Event('change')); await nextTick(); assert.equal(running.value, true)
    enter(false); await nextTick(); assert.equal(running.value, false)
    enter(true); documentMock.hidden = true; documentMock.dispatchEvent(new Event('visibilitychange')); await nextTick(); assert.equal(running.value, false)
    documentMock.hidden = false; documentMock.dispatchEvent(new Event('visibilitychange')); await nextTick(); assert.equal(running.value, true)
    surface.value = null; await nextTick(); assert.equal(running.value, false)
    surface.value = {}; await nextTick(); assert.equal(running.value, false)
    enter(true); await nextTick(); assert.equal(running.value, true)
  } finally {
    app.unmount()
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    }
  }
  assert.equal(disconnected, true)
})

// Render the actual recursive SFCs without needing a browser or a VuePress server.
test('nested topic content and directory navigation render all levels with valid anchors', async t => {
  const server = await createServer({
    configFile: false,
    root: resolve(import.meta.dirname, '..'),
    server: { middlewareMode: true, ws: false },
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
  const activeNote = knowledgeNoteId('/notes/advanced/')
  const selectedNav = await renderToString(createSSRApp({ render: () => h('ul', roots.map(chapter => h(Nav, { chapter, activeChapter, activeNote }))) }))
  assert.equal((selectedNav.match(/aria-current="location"/g) || []).length, 1)
  assert.ok(selectedNav.includes(`href="#${activeNote}" aria-current="location"`))
  assert.ok(selectedNav.includes('topic-nav-ancestor'))
  const selectedRoot = await renderToString(createSSRApp({ render: () => h('ul', [h(Nav, { chapter: root, activeChapter: root.id, activeNote: knowledgeNoteId(rootNote.path) })]) }))
  assert.equal((selectedRoot.match(/aria-current="location"/g) || []).length, 1)
  assert.ok(selectedRoot.includes(`href="#${knowledgeNoteId(rootNote.path)}" aria-current="location"`))
})

test('every configured topic renders a distinct subject visual with a complete static state', async t => {
  const server = await createServer({
    configFile: false,
    root: resolve(import.meta.dirname, '..'),
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [vue()],
  })
  t.after(() => server.close())
  const { default: Visual } = await server.ssrLoadModule('/docs/.vuepress/theme/components/TopicCardVisual.vue')
  const kinds = new Set()
  for (const name of topicNames) {
    const { kind } = topicAppearance(name)
    assert.ok(!kinds.has(kind), `${name} must have its own subject-specific visual`)
    kinds.add(kind)
    const html = await renderToString(createSSRApp({ render: () => h(Visual, { name }) }))
    assert.match(html, /<svg[\s>]/, `${name} needs a visual renderer`)
    assert.ok(html.includes(`data-kind="${kind}"`))
    assert.ok(html.includes('aria-hidden="true"'))
    assert.ok(html.includes('data-motion="still"'))
    assert.ok(!html.includes('<animateMotion') && !html.includes('<animate '), `${name} must stop computing animation in its static state`)
    assert.ok(!html.includes('library-volume'))
  }
  const { default: Analysis } = await server.ssrLoadModule('/docs/.vuepress/theme/components/DataAnalysisTopicVisual.vue')
  const still = await renderToString(createSSRApp({ render: () => h(Analysis, { running: false }) }))
  for (const label of ['NumPy', 'pandas', 'Matplotlib', 'mean(axis=1)', '3.0', '6.0', '8.0']) assert.ok(still.includes(label))
  assert.ok(still.includes('class="plot-line"'))
  assert.ok(!still.includes('<animateMotion'))
  const running = await renderToString(createSSRApp({ render: () => h(Analysis, { running: true }) }))
  assert.ok(running.includes('<animateMotion'))
  assert.ok(running.includes('data-running="true"'))

  const boosting = await renderToString(createSSRApp({ render: () => h(Visual, { name: 'GBDT' }) }))
  for (const label of ['XGBoost', 'LightGBM', 'CatBoost', 'GRADIENT BOOSTING', 'SQUARED LOSS', 'ROUND 1', 'ROUND 2', 'ROUND 3']) assert.ok(boosting.includes(label), `GBDT must show ${label} without animation`)
  assert.ok(boosting.includes('class="boosting-visual"'))
  assert.equal((boosting.match(/class="boosting-root"/g) || []).length, 3)
  assert.equal((boosting.match(/class="boosting-residual-bars"/g) || []).length, 3)

  const subjectVisuals = [
    { name: 'SKLearn', file: 'SklearnTopicVisual', graphic: 'sklearn-visual', labels: ['PIPELINE', 'EVALUATE', 'TRAIN', 'TEST', 'SCALER', 'ESTIMATOR', 'fit', 'transform', 'predict', 'CROSS-VALIDATION', 'HELD OUT'], shapes: ['sklearn-pipeline', 'sklearn-samples', 'sklearn-step', 'sklearn-validation', 'sklearn-test-set'], motion: false },
    { name: 'Python', file: 'PythonTopicVisual', graphic: 'python-visual', labels: ['LIST COMPREHENSION', 'range(1, 5)', 'ITERATE', 'COLLECT'], shapes: ['python-input', 'python-operation', 'python-output'], motion: false },
    { name: 'Go', file: 'GoTopicVisual', graphic: 'go-visual', labels: ['go fetch()', 'go parse()', 'go save()', 'chan Result', 'receive'], shapes: ['go-worker', 'go-channel', 'go-consumer'], motion: true },
    { name: '算法与数据结构', file: 'AlgorithmsTopicVisual', graphic: 'algorithms-visual', labels: ['BINARY SEARCH', 'target = 23', 'COMPARE', 'NARROW', 'FOUND', 'O(log n)'], shapes: ['algorithm-cell', 'algorithm-probe', 'algorithm-found', 'algorithm-bounds'], motion: false },
    { name: '容器', file: 'ContainersTopicVisual', graphic: 'containers-visual', labels: ['CONTAINER A', 'CONTAINER B', 'WRITABLE / CoW', 'SHARED IMAGE', 'READ ONLY', 'namespaces + cgroups'], shapes: ['container-namespace', 'container-process', 'container-writable', 'container-image-layer', 'container-kernel'], motion: true },
    { name: 'OS', file: 'OsTopicVisual', graphic: 'os-visual', labels: ['ROUND ROBIN', 'READY QUEUE', 'CPU', 'RUNNING', 'WAITING', 'IO COMPLETE', 'CONTEXT SWITCH'], shapes: ['os-process', 'os-cpu', 'os-wait', 'os-time-slice'], motion: true },
    { name: '网络', file: 'NetworkTopicVisual', graphic: 'network-visual', labels: ['ENCAPSULATION', 'ETH', 'IP', 'TCP', 'DATA', 'SENDER', 'ROUTER', 'RECEIVER', 'ACK = 2', '1 BYTE OF TCP DATA'], shapes: ['network-header', 'network-endpoint', 'network-router', 'network-packet', 'network-ack-route'], motion: true },
  ]
  for (const { name, file, graphic, labels, shapes, motion } of subjectVisuals) {
    const card = await renderToString(createSSRApp({ render: () => h(Visual, { name }) }))
    assert.ok(card.includes(`class="${graphic}"`), `${name} must select its dedicated renderer`)
    const { default: Subject } = await server.ssrLoadModule(`/docs/.vuepress/theme/components/${file}.vue`)
    const still = await renderToString(createSSRApp({ render: () => h(Subject, { running: false }) }))
    for (const label of labels) assert.ok(still.includes(label), `${name} needs ${label} even when motion is disabled`)
    for (const shape of shapes) assert.ok(still.includes(`class="${shape}"`), `${name} needs its own ${shape} graphic`)
    if (name === 'Python') {
      for (const value of [1, 4, 9, 16]) assert.ok(still.includes(`>${value}</text>`))
    }
    const active = await renderToString(createSSRApp({ render: () => h(Subject, { running: true }) }))
    assert.ok(active.includes('data-running="true"'))
    assert.equal(active.includes('<animateMotion'), motion)
  }
})
