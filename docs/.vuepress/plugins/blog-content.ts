import type { App, Plugin } from 'vuepress/core'
import { articlePreview } from './article-preview'

const categoryLabels: Record<string, string> = {
  ai: 'AI 与数据', frontend: '前端体验', engineering: '工程架构', thinking: '产品与生活',
}

// Catalogs are derived from real Markdown pages; draft and index pages never become entries.
async function writeCatalog(app: App) {
  const catalogs: Record<string, unknown[]> = { notes: [], knowledge: [], projects: [] }
  for (const page of app.pages) {
    const source = page.filePathRelative?.replaceAll('\\', '/') || ''
    const collection = /^(posts|notes|projects)\/(?!README\.md$).+\.md$/i.exec(source)?.[1]
    const fm = page.frontmatter
    if (!collection || fm.draft === true || fm.index === false || /(?:^|\/)README\.md$/i.test(source)) continue
    const category = typeof fm.category === 'string' && fm.category in categoryLabels ? fm.category : 'engineering'
    const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : typeof fm.date === 'string' ? fm.date.slice(0, 10) : ''
    const entry = {
      title: page.title,
      path: page.path,
      summary: typeof fm.description === 'string' ? fm.description : typeof fm.summary === 'string' ? fm.summary : '',
      preview: articlePreview(page.content),
      date,
      category,
      label: typeof fm.label === 'string' ? fm.label : (fm.project as { label?: string })?.label || categoryLabels[category],
      tags: Array.isArray(fm.tags) ? fm.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      series: typeof fm.series === 'string' ? fm.series : '未分类',
      group: typeof fm.group === 'string' ? fm.group : '',
      project: fm.project || null,
    }
    catalogs[collection === 'posts' ? 'notes' : collection === 'notes' ? 'knowledge' : 'projects'].push(entry)
  }
  for (const entries of Object.values(catalogs)) {
    (entries as { date: string; title: string; project?: { order: number } }[]).sort((a, b) => (a.project?.order ?? 99) - (b.project?.order ?? 99) || b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'))
  }
  await app.writeTemp('blog-content.js', Object.entries(catalogs).map(([key, entries]) => `export const ${key} = ${JSON.stringify(entries)};`).join('\n'))
}

export const blogContentPlugin = (): Plugin => ({
  name: 'blog-content-catalog',
  extendsMarkdown(md) {
    // VuePress prefixes Markdown image/src URLs. Raw HTML href/poster need the same treatment.
    for (const rule of ['html_block', 'html_inline']) {
      const render = md.renderer.rules[rule]!
      md.renderer.rules[rule] = (tokens, index, options, env, renderer) => {
        const html = render(tokens, index, options, env, renderer)
        const base = String(env.base || '/').replace(/\/$/, '')
        return html.replace(/(\b(?:src|href|poster)=)(["'])(\/(?:siyuan\/|(?:posts|notes|projects)\/\d{14}-[a-z0-9]{7}\/)[^"']*)\2/g,
          (_, attribute, quote, path) => `${attribute}${quote}${base}${path}${quote}`)
      }
    }
  },
  onPrepared: writeCatalog,
  onPageUpdated: (app, ..._change) => writeCatalog(app),
})
