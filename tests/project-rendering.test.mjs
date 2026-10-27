import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import * as Vue from 'vue'
import { createRenderer, nextTick } from 'vue'
import { parse, compileScript } from '@vue/compiler-sfc'
import ts from 'typescript'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

test('Wyvern keeps its full memory diagram while stopping all motion offscreen, in background and with reduced motion', async t => {
  const server = await createServer({ configFile: false, root: resolve(import.meta.dirname, '..'), server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true }, plugins: [vue()] })
  t.after(() => server.close())
  const { useSceneMotion } = await server.ssrLoadModule('/docs/.vuepress/theme/utils/use-scene-motion.ts')
  // Compile the real client template so lifecycle and SVG animation nodes are exercised together.
  const source = await readFile(resolve('docs/.vuepress/theme/components/WyvernProjectVisual.vue'), 'utf8')
  const { descriptor } = parse(source)
  const compiled = compileScript(descriptor, { id: 'wyvern-test', inlineTemplate: true, templateOptions: { compilerOptions: { hoistStatic: false } } }).content
  const javascript = ts.transpileModule(compiled, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/import \{([^}]+)\} from ['"]vue['"];?/g, (_, names) => `const { ${names.replace(/\bas\b/g, ':')} } = Vue;`)
    .replace(/import \{ useSceneMotion \} from [^\n]+/, '')
    .replace('export default', 'return')
  const Visual = new Function('Vue', 'useSceneMotion', javascript)(Vue, useSceneMotion)
  const { bookTransitionActive } = await server.ssrLoadModule('/docs/.vuepress/theme/utils/motion-state.ts')
  const mediaListeners = new Set(), documentListeners = new Set()
  const preference = { matches: false, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) }
  const document = { hidden: false, addEventListener: (_, fn) => documentListeners.add(fn), removeEventListener: (_, fn) => documentListeners.delete(fn) }
  let observer
  class Observer {
    constructor(callback) { this.callback = callback; observer = this }
    observe(surface) { this.surface = surface }
    disconnect() { this.disconnected = true }
  }
  for (const [key, value] of Object.entries({ document, matchMedia: () => preference, IntersectionObserver: Observer })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key])
  }
  const node = type => ({ type, children: [], props: {}, parent: null })
  const renderer = createRenderer({
    createElement: node, createText: text => ({ ...node('#text'), text }), createComment: text => ({ ...node('#comment'), text }),
    setText: (el, text) => { el.text = text }, setElementText: (el, text) => { el.text = text },
    patchProp: (el, key, _, value) => { el.props[key] = value },
    parentNode: el => el.parent,
    nextSibling: el => el.parent?.children[el.parent.children.indexOf(el) + 1] || null,
    insert(el, parent, anchor = null) { el.parent = parent; const index = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(index < 0 ? parent.children.length : index, 0, el) },
    remove(el) { const index = el.parent?.children.indexOf(el); if (index >= 0) el.parent.children.splice(index, 1); el.parent = null },
  })
  const root = node('root'), app = renderer.createApp(Visual)
  app.mount(root)
  t.after(() => { bookTransitionActive.value = false })
  const all = (el = root) => [el, ...el.children.flatMap(child => all(child))]
  function verify(running) {
    const nodes = all()
    assert.equal(root.children[0].props['data-motion'], running ? 'running' : 'still')
    assert.equal(nodes.filter(el => el.props.class === 'wyvern-cell').length, 64)
    for (const label of ['FROZEN ATTENTION', '02 / δ WRITE', '03 / READ', 'M ← M + β (v − Mk) kᵀ']) assert.ok(nodes.some(el => el.text === label))
    assert.equal(nodes.filter(el => el.type === 'animateMotion').length, running ? 2 : 0)
    assert.equal(nodes.filter(el => el.type === 'animateTransform').length, running ? 1 : 0)
  }
  verify(false)
  assert.ok(observer.surface)
  observer.callback([{ isIntersecting: true }]); await nextTick(); verify(true)
  preference.matches = true; mediaListeners.forEach(fn => fn()); await nextTick(); verify(false)
  preference.matches = false; mediaListeners.forEach(fn => fn()); await nextTick(); verify(true)
  document.hidden = true; documentListeners.forEach(fn => fn()); await nextTick(); verify(false)
  document.hidden = false; documentListeners.forEach(fn => fn()); await nextTick(); verify(true)
  observer.callback([{ isIntersecting: false }]); await nextTick(); verify(false)
  observer.callback([{ isIntersecting: true }]); await nextTick(); verify(true)
  bookTransitionActive.value = true; await nextTick(); verify(false)
  bookTransitionActive.value = false; await nextTick(); verify(true)
  app.unmount()
  assert.equal(observer.disconnected, true)
  assert.equal(mediaListeners.size, 0)
  assert.equal(documentListeners.size, 0)
})
