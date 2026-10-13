import test from 'node:test'
import assert from 'node:assert/strict'
import { drawArticleBook } from '../docs/.vuepress/theme/scenes/article-book.ts'

function recordingContext() {
  const calls = [], values = []
  let depth = 0
  const ctx = new Proxy({}, {
    set(target, key, value) { target[key] = value; if (typeof value === 'number') values.push(value); return true },
    get(target, key) {
      if (key in target) return target[key]
      return (...args) => {
        calls.push(key); values.push(...args.filter(value => typeof value === 'number'))
        if (key === 'save') depth++
        if (key === 'restore') { depth--; assert.ok(depth >= 0) }
        if (key === 'createLinearGradient') return { addColorStop() {} }
      }
    },
  })
  return { ctx, calls, verify() { assert.equal(depth, 0); assert.ok(values.every(Number.isFinite)) } }
}
const palette = { primary: '#75e4f1', secondary: '#b99bff', ink: '#eeeeee', dark: true }

test('fully transparent book frames only clear the canvas', () => {
  for (const progress of [0, 1]) {
    const recorder = recordingContext()
    drawArticleBook(recorder.ctx, 1440, 900, progress, palette, [{}, {}])
    assert.deepEqual(recorder.calls, ['clearRect'])
  }
})

test('curved lettering stays finite and balanced through both themes and viewport sizes', () => {
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    for (const dark of [true, false]) {
      for (const progress of [.05, .2, .35, .5, .7, .95]) {
        const recorder = recordingContext()
        drawArticleBook(recorder.ctx, width, height, progress, { ...palette, dark }, [{}, {}])
        recorder.verify()
        assert.ok(recorder.calls.includes('stroke'))
        assert.ok(recorder.calls.includes('drawImage'))
      }
    }
  }
})

test('hidden excerpt is not projected under the turning page', () => {
  const recorder = recordingContext()
  drawArticleBook(recorder.ctx, 1440, 900, .2, palette, [{}, {}])
  assert.equal(recorder.calls.filter(call => call === 'drawImage').length, 56)
})
