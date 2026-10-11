import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'

// Showcase content is authored as ordinary headings and tables in SiYuan.
export function projectMetadata(attrs, body, resolveDocument) {
  const code = attrs['custom-blog-project-code']
  if (!code) return null
  if (!/^[a-z][a-z0-9-]{0,60}$/.test(code)) throw new Error(`项目代码格式不正确：${code}`)
  const view = attrs['custom-blog-project-view'] || 'record'
  if (!['record', 'showcase'].includes(view)) throw new Error('项目视图只能是 record 或 showcase。')
  if (view === 'showcase' && !['moyin', 'xiake', 'yuliao', 'yiji', 'sre-platform', 'relay-service', 'annotation-tool-platform'].includes(code)) throw new Error(`不支持的项目展示模板：${code}`)
  const tree = fromMarkdown(body, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  const text = node => node.value || (node.children || []).map(text).join('')
  const sections = new Map()
  let heading = ''
  for (const node of tree.children) {
    if (node.type === 'heading') { heading = text(node); sections.set(heading, []) }
    else if (heading) sections.get(heading).push(node)
  }
  const paragraph = name => (sections.get(name) || []).filter(n => n.type === 'paragraph').map(text).join('\n')
  const table = name => (sections.get(name) || []).find(n => n.type === 'table')?.children.slice(1).map(row => row.children.map(text)) || []
  const linked = name => {
    const id = attrs[`custom-blog-project-${name}`]
    if (!id) return ''
    const route = resolveDocument(id)
    if (!route) throw new Error(`项目 ${code} 的 ${name} 引用未发布文档：${id}`)
    return route
  }
  const order = Number(attrs['custom-blog-project-order'] || 99)
  if (!Number.isFinite(order)) throw new Error('项目顺序必须是数字。')
  const tone = attrs['custom-blog-project-tone'] || 'cyan'
  if (!['cyan', 'violet', 'rose', 'amber'].includes(tone)) throw new Error('项目颜色只能是 cyan、violet、rose、amber。')
  return {
    code, view, order, tone,
    ...(attrs['custom-blog-project-group'] ? { group: attrs['custom-blog-project-group'] } : {}),
    label: attrs['custom-blog-project-label'] || code.toUpperCase(),
    status: attrs['custom-blog-project-status'] || '计划中',
    category: attrs['custom-blog-project-category'] || 'AI / 产品',
    summary: attrs['custom-blog-project-summary'] || '',
    stack: (attrs['custom-blog-project-stack'] || '').split(/[,，]/).map(s => s.trim()).filter(Boolean),
    headline: paragraph('展示标题').split('\n').filter(Boolean),
    intro: paragraph('简介'),
    features: table('核心能力').map(([icon, title, desc, tag]) => ({ icon, title, desc, tag })),
    flow: table('工作流').map(([code, title, desc]) => ({ code, title, desc })),
    platforms: table('支持平台').map(([name, note]) => ({ name, note })),
    progress: table('项目进度').map(([label, value]) => ({ label, value })),
    landing: {
      ...Object.fromEntries(table('展示配置').map(([key, value]) => [key, value.replace(/\\n/g, '\n')])),
      stats: table('统计').map(([value, label, note]) => ({ value, label, note })),
      consoleRows: table('控制台').map(([label, value, state, tone]) => ({ label, value, state, tone })),
      standards: table('交付标准').map(([code, title, description]) => ({ code, title, description, desc: description })),
    },
    showcase: linked('showcase'), record: linked('record'),
  }
}
