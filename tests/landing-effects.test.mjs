import test from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, h } from 'vue'
import { useLandingEffects } from '../docs/.vuepress/theme/utils/use-landing-effects.ts'

function mountEffects(t, { reduced = false, observers = true } = {}) {
  const frames = new Map(), intersections = [], resizes = []
  const sections = Array.from({ length: 2 }, () => ({ classList: new Set() }))
  const root = { scrollHeight: 1800 }
  const window = Object.assign(new EventTarget(), { innerHeight: 900, scrollY: 450 })
  const preference = { matches: reduced }
  let nextFrame = 0, scrolled
  class IntersectionObserver {
    observed = new Set()
    constructor(callback) { this.callback = callback; intersections.push(this) }
    observe(target) { this.observed.add(target) }
    unobserve(target) { this.observed.delete(target) }
    disconnect() { this.observed.clear(); this.disconnected = true }
  }
  class ResizeObserver {
    constructor(callback) { this.callback = callback; resizes.push(this) }
    observe(target) { this.target = target }
    disconnect() { this.disconnected = true }
  }
  const globals = {
    window,
    document: {
      documentElement: root,
      querySelectorAll(selector) { assert.equal(selector, '.test-reveal'); return sections },
      querySelector(selector) { return selector === '#target' ? { scrollIntoView(options) { scrolled = options } } : null },
    },
    matchMedia: () => preference,
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame },
    cancelAnimationFrame(id) { frames.delete(id) },
    IntersectionObserver: observers ? IntersectionObserver : undefined,
    ResizeObserver: observers ? ResizeObserver : undefined,
  }
  for (const [name, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name])
  }
  const renderer = createRenderer({
    createElement: () => ({}), insert() {}, remove() {}, patchProp() {}, setElementText() {},
    createText: () => ({}), createComment: () => ({}), setText() {}, parentNode: () => null, nextSibling: () => null,
  })
  let effects
  const app = renderer.createApp({ setup() { effects = useLandingEffects('.test-reveal'); return () => h('div') } })
  app.mount({})
  let mounted = true
  const unmount = () => { if (mounted) { app.unmount(); mounted = false } }
  t.after(unmount)
  return {
    ...effects, window, root, frames, intersections, resizes, sections, preference, unmount,
    get scrolled() { return scrolled },
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()) },
  }
}

test('landing progress coalesces updates, follows viewport and content changes, and releases all resources', t => {
  const state = mountEffects(t)
  assert.equal(state.frames.size, 1)
  state.window.dispatchEvent(new Event('scroll'))
  state.window.dispatchEvent(new Event('scroll'))
  assert.equal(state.frames.size, 1)
  state.flush()
  assert.equal(state.scrollPct.value, 50)
  state.window.innerHeight = 1200
  state.window.dispatchEvent(new Event('resize')); state.flush()
  assert.equal(state.scrollPct.value, 75)
  state.root.scrollHeight = 2100
  state.resizes[0].callback(); state.flush()
  assert.equal(state.scrollPct.value, 50)
  for (const [scroll, expected] of [[-20, 0], [5000, 100]]) {
    state.window.scrollY = scroll
    state.window.dispatchEvent(new Event('scroll')); state.flush()
    assert.equal(state.scrollPct.value, expected)
  }
  state.root.scrollHeight = 100
  state.resizes[0].callback(); state.flush()
  assert.equal(state.scrollPct.value, 0)
  const observer = state.intersections[0], section = state.sections[0]
  observer.callback([{ target: section, isIntersecting: false }])
  assert.equal(section.classList.has('in'), false)
  observer.callback([{ target: section, isIntersecting: true }])
  assert.equal(section.classList.has('in'), true)
  assert.equal(observer.observed.has(section), false)
  state.scrollToId('#target')
  assert.deepEqual(state.scrolled, { behavior: 'smooth', block: 'start' })
  state.preference.matches = true
  state.scrollToId('#target')
  assert.equal(state.scrolled.behavior, 'instant')
  state.window.dispatchEvent(new Event('scroll'))
  assert.equal(state.frames.size, 1)
  state.unmount()
  assert.equal(state.frames.size, 0)
  assert.equal(observer.disconnected, true)
  assert.equal(state.resizes[0].disconnected, true)
  state.window.dispatchEvent(new Event('scroll'))
  state.window.dispatchEvent(new Event('resize'))
  assert.equal(state.frames.size, 0)
})

for (const options of [{ reduced: true }, { observers: false }]) {
  test(`landing sections stay readable with ${options.reduced ? 'reduced motion' : 'unavailable browser observers'}`, t => {
    const state = mountEffects(t, options)
    assert.ok(state.sections.every(section => section.classList.has('in')))
    assert.equal(state.intersections.length, 0)
    state.flush()
    assert.equal(state.scrollPct.value, 50)
    state.unmount()
    assert.equal(state.frames.size, 0)
  })
}
