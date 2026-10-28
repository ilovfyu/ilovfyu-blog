import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import type { KnowledgeChunk } from '../theme/utils/assistant-knowledge'
import { safeKnowledgePath } from '../theme/utils/assistant-knowledge.ts'

type PublicPage = { filePathRelative?: string; path: string; title: string; content: string; frontmatter: Record<string, unknown>; data?: { encrypt?: boolean } }
type TextNode = { type: string; value?: string; children?: TextNode[] }
function text(node: TextNode): string {
  if (['html', 'yaml', 'image', 'imageReference', 'definition', 'thematicBreak'].includes(node.type)) return ''
  if (node.value !== undefined) return node.value
  return (node.children || []).map(text).join(['paragraph', 'heading', 'tableCell'].includes(node.type) ? ' ' : '\n')
}

export function assistantCorpus(pages: PublicPage[]): KnowledgeChunk[] {
  return pages.flatMap(page => {
    const fm = page.frontmatter
    const source = (page.filePathRelative || '').replaceAll('\\', '/')
    if (!source.startsWith('notes/') || /(?:^|\/)README\.md$/i.test(source) || !safeKnowledgePath(page.path)
      || fm.draft === true || fm.index === false || fm.search === false || fm.private === true || fm.password || fm.encrypt || page.data?.encrypt) return []
    const body = page.content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
    const tree = fromMarkdown(body, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
    const plain = tree.children.map(node => text(node as TextNode)).join('\n').replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\n{3,}/g, '\n\n').trim()
    const ready = !!plain && !/^(?:正文待补充[。.]?\s*)+$/.test(plain)
    const base = { title: page.title, path: page.path, series: typeof fm.series === 'string' ? fm.series : '', ready }
    if (!ready) return [{ ...base, id: `${page.path}#0`, text: '' }]
    const chunks: KnowledgeChunk[] = []
    // Keep paragraph/line boundaries so excerpts don't begin halfway through a word.
    let current = ''
    const append = () => { if (current.trim()) chunks.push({ ...base, id: `${page.path}#${chunks.length}`, text: current.trim() }); current = '' }
    for (const line of plain.split('\n')) {
      if (current.length + line.length + 1 > 1080) append()
      for (let start = 0; start < line.length; start += 1080) {
        const piece = line.slice(start, start + 1080)
        if (current.length + piece.length + 1 > 1080) append()
        current += `${current ? '\n' : ''}${piece}`
      }
    }
    append()
    return chunks
  })
}
