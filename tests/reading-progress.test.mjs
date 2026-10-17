import test from 'node:test'
import assert from 'node:assert/strict'
import { readingProgress } from '../docs/.vuepress/theme/utils/reading-progress.ts'

const viewport = 900, offset = 112

test('reading progress starts below the header and finishes at the end of Markdown', () => {
  assert.equal(readingProgress({ top: 300, bottom: 3300 }, viewport, offset), 0)
  assert.equal(readingProgress({ top: offset, bottom: 3112 }, viewport, offset), 0)
  assert.equal(readingProgress({ top: -994, bottom: 2006 }, viewport, offset), .5)
  assert.equal(readingProgress({ top: -2100, bottom: viewport }, viewport, offset), 1)
  // Scrolling into comments/footer keeps completion rather than extending the range.
  assert.equal(readingProgress({ top: -2500, bottom: 500 }, viewport, offset), 1)
})

test('short and empty articles avoid division by zero and complete when visible', () => {
  assert.equal(readingProgress({ top: 400, bottom: 1000 }, viewport, offset), 0)
  assert.equal(readingProgress({ top: 200, bottom: 800 }, viewport, offset), 1)
  assert.equal(readingProgress({ top: 1000, bottom: 1000 }, viewport, offset), 0)
  assert.equal(readingProgress({ top: 200, bottom: 200 }, viewport, offset), 1)
})

test('viewport resizing and header size use the same content bounds without stale page height', () => {
  const bounds = { top: -994, bottom: 2006 }
  assert.equal(readingProgress(bounds, 900, 112), .5)
  assert.ok(readingProgress(bounds, 1200, 112) > .5)
  assert.ok(readingProgress(bounds, 900, 160) > .5)
})
