import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { h, type VNodeChild } from 'vue'

type Node = { type: string; value?: string; children?: Node[]; ordered?: boolean; depth?: number; alt?: string }

/** Build a small allowlist of Vue nodes. Model HTML/URLs are never executed. */
function render(node: Node): VNodeChild {
  const children = () => (node.children || []).map(render)
  switch (node.type) {
    case 'text': case 'html': return node.value || ''
    case 'paragraph': return h('p', children())
    case 'strong': return h('strong', children())
    case 'emphasis': return h('em', children())
    case 'delete': return h('s', children())
    case 'inlineCode': return h('code', node.value || '')
    case 'code': return h('pre', [h('code', node.value || '')])
    case 'heading': return h('h4', children())
    case 'list': return h(node.ordered ? 'ol' : 'ul', children())
    case 'listItem': return h('li', children())
    case 'blockquote': return h('blockquote', children())
    case 'table': return h('div', { class: 'ai-table-scroll' }, [h('table', [h('tbody', children())])])
    case 'tableRow': return h('tr', children())
    case 'tableCell': return h('td', children())
    case 'break': return h('br')
    case 'thematicBreak': return h('hr')
    case 'image': return node.alt || ''
    // Citations use the separately validated source list. Arbitrary model links
    // remain readable labels, without navigation, images or tracking requests.
    default: return children()
  }
}

export function renderAssistantMarkdown(content: string): VNodeChild[] {
  return fromMarkdown(content.slice(0, 12_000), { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }).children.map(node => render(node as Node))
}
