import test from 'node:test'
import assert from 'node:assert/strict'
import { articlePreview } from '../docs/.vuepress/plugins/article-preview.ts'

test('book excerpts contain visible prose, without frontmatter, HTML, code blocks or image paths', () => {
  const preview = articlePreview('---\ntitle: Hidden metadata\n---\n\n# Title\n\nAn **actual** [article](https://example.com) with `code`.\n\n<script>privateImplementation()</script>\n\n![image](/private-path.png)\n\n```js\nconst secret = 1\n```\n\n## First chapter\n\nMore prose.')
  assert.deepEqual(preview, { heading: 'First chapter', paragraphs: ['An actual article with code.', 'More prose.'] })
})
test('excerpts remain bounded for very long articles and empty component-only pages', () => {
  const preview = articlePreview('## Chapter\n\n' + '正文'.repeat(500))
  assert.equal(preview.paragraphs[0].length, 361)
  assert.ok(preview.paragraphs[0].endsWith('…'))
  assert.deepEqual(articlePreview('<ProjectShowcase />'), { heading: '', paragraphs: [] })
})
