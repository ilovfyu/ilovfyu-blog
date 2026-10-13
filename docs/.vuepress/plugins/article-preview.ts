import { fromMarkdown } from 'mdast-util-from-markdown'
import type { Nodes } from 'mdast'

const plainText = (node: Nodes): string => {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value
  if (node.type === 'break') return ' '
  return 'children' in node ? node.children.map(plainText).join('') : ''
}

/** A bounded, text-only excerpt for the reading transition. Never ship raw Markdown or HTML. */
export function articlePreview(markdown: string) {
  const content = markdown.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
  const tree = fromMarkdown(content)
  const paragraphs: string[] = []
  let heading = '', remaining = 360
  for (const node of tree.children) {
    if (!heading && node.type === 'heading' && node.depth > 1) heading = plainText(node).slice(0, 48)
    if (node.type !== 'paragraph' || !remaining || paragraphs.length === 3) continue
    const text = plainText(node).replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    paragraphs.push(text.slice(0, remaining) + (text.length > remaining ? '…' : ''))
    remaining -= Math.min(remaining, text.length)
  }
  return { heading, paragraphs }
}
