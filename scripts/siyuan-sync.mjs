import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, unlink, lstat, open } from 'node:fs/promises'
import { resolve, dirname, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { projectMetadata } from './project-metadata.mjs'
import { knowledgeStructure } from '../docs/.vuepress/theme/utils/knowledge-path.ts'

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const managedPath = path => /^(?:docs\/(?:posts|notes|projects)\/siyuan\/\d{14}-[a-z0-9]{7}\.md|docs\/\.vuepress\/public\/siyuan\/[a-f0-9]{64}(?:\.[a-z0-9]+)?|\.siyuan\/manifest\.json)$/.test(path)
const idPattern = /^\d{14}-[a-z0-9]{7}$/
const hash = value => createHash('sha256').update(value).digest('hex')
const under = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`)
const collections = new Set(['posts', 'notes', 'projects'])

async function readOptional(path) {
  try { return await readFile(path) } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

export function createClient({ url = process.env.SIYUAN_URL || 'http://127.0.0.1:6806', token = process.env.SIYUAN_TOKEN || '' } = {}) {
  const origin = new URL(url)
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) throw new Error('SIYUAN_URL 必须是 HTTP 地址，凭证请放在 SIYUAN_TOKEN。')
  return {
    async request(endpoint, body = {}, binary = false) {
      let response
      try {
        response = await fetch(new URL(endpoint, origin), {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Token ${token}` } : {}) },
          body: JSON.stringify(body), signal: AbortSignal.timeout(30000), redirect: 'error',
        })
      } catch { throw new Error('无法连接思源，请打开思源并检查 SIYUAN_URL。') }
      if (response.status === 401 || response.status === 403) throw new Error('思源鉴权失败，请在 .env 中配置 SIYUAN_TOKEN。')
      if (binary && response.status === 200) return Buffer.from(await response.arrayBuffer())
      let result
      try { result = await response.json() } catch { throw new Error(`思源接口 ${endpoint} 返回了非 JSON 响应（HTTP ${response.status}）。`) }
      if (!response.ok || result.code !== 0) throw new Error(`思源接口 ${endpoint} 失败（HTTP ${response.status}，code ${result.code}）。`)
      if (binary) throw new Error(`思源资源不存在：${body.path}`)
      return result.data
    },
  }
}

function selectSection(doc, config) {
  if (config.excludePaths.some(path => under(doc.hpath, path))) return null
  const section = config.sections.filter(item => under(doc.hpath, item.path)).sort((a, b) => b.path.length - a.path.length)[0]
  if (section?.path === doc.hpath) return null // Section documents are folders in the publishing layout.
  return section || { collection: config.defaultCollection }
}

function readConfig(input) {
  const config = { defaultCollection: 'posts', excludePaths: ['/草稿'], sections: [], ...input }
  if (!idPattern.test(config.notebookId)) throw new Error('请在 siyuan.config.json 中配置实际笔记本 ID；blog:doctor 会列出可用笔记本。')
  if (!collections.has(config.defaultCollection) || !Array.isArray(config.sections) || !Array.isArray(config.excludePaths)) throw new Error('思源目录配置不正确。')
  for (const prefix of [...config.excludePaths, ...config.sections.map(section => section.path)]) {
    if (typeof prefix !== 'string' || !prefix.startsWith('/') || prefix.endsWith('/')) throw new Error('目录路径须以 / 开头且不以 / 结尾。')
  }
  for (const section of config.sections) if (!collections.has(section.collection)) throw new Error('collection 只能是 posts、notes 或 projects。')
  return config
}

function decodeAttributes(attrs) {
  // SiYuan stores attribute values as HTML-escaped strings.
  return Object.fromEntries(Object.entries(attrs || {}).map(([key, value]) => [key, String(value).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')]))
}

function frontmatter(doc, attrs, section, body, permalink, project, structure) {
  const title = attrs['custom-blog-title'] || doc.content || doc.hpath.split('/').pop()
  const date = attrs['custom-blog-date'] || `${doc.id.slice(0, 4)}-${doc.id.slice(4, 6)}-${doc.id.slice(6, 8)}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error(`${doc.id} 的 custom-blog-date 须为有效的 YYYY-MM-DD。`)
  const tree = fromMarkdown(body, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  const text = node => node.value || (node.children || []).map(text).join('')
  const firstParagraph = tree.children.find(node => node.type === 'paragraph')
  const data = {
    title, date, permalink,
    description: attrs['custom-blog-description'] || (firstParagraph ? text(firstParagraph).replace(/\s+/g, ' ').slice(0, 140) : ''),
    category: attrs['custom-blog-category'] || section.category || 'engineering',
    tags: (attrs['custom-blog-tags'] || '').split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
    ...(section.collection === 'notes' ? structure : {}),
    ...(attrs['custom-blog-index'] === 'false' ? { index: false } : {}),
    ...(project ? { project, ...(project.view === 'showcase' ? { pageLayout: 'home', config: [{ type: 'custom' }], comments: false, index: false } : { pageClass: 'project-record-page' }) } : {}),
  }
  const rendered = project?.view === 'showcase' ? '<project-showcase />' : project ? `<project-record-hero />\n\n${body.trim()}` : body.trim()
  return `---\n${Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${rendered}\n`
}

function exportedBody(content, doc) {
  // Desktop export can include its own YAML metadata, title and invisible empty-block markers.
  let body = content.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '').trim()
  const first = fromMarkdown(body).children[0]
  const text = node => node.value || (node.children || []).map(text).join('')
  if (first?.type === 'heading' && first.depth === 1 && text(first) === doc.content) body = body.slice(first.position.end.offset).trim()
  if (!body.replace(/[\s\u200b-\u200d\ufeff\u00ad\u2060]/g, '')) return ''
  return body
}

function localAsset(url) {
  const path = url.split(/[?#]/)[0]
  if (!/^\/?assets\//.test(path)) return null
  let decoded
  try { decoded = decodeURIComponent(path).replace(/^\//, '') } catch { throw new Error(`资源路径编码错误：${path}`) }
  if (decoded.split('/').some(part => !part || part === '.' || part === '..') || /[\\\0]/.test(decoded)) throw new Error(`资源路径不合法：${path}`)
  return decoded
}

export async function rewriteMarkdown(body, resolveUrl) {
  const tree = fromMarkdown(body, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
  const edits = []
  const title = value => value ? ` ${JSON.stringify(value)}` : ''
  async function visit(node) {
    if (['link', 'image', 'definition'].includes(node.type)) {
      const target = await resolveUrl(node.url)
      if (target !== node.url) {
        const start = node.position.start.offset, end = node.position.end.offset
        if (node.type === 'image') edits.push({ start, end, text: `![${node.alt.replace(/[\\\[\]]/g, '\\$&')}](<${target}>${title(node.title)})` })
        else if (node.type === 'definition') edits.push({ start, end, text: `[${node.label}]: <${target}>${title(node.title)}` })
        else {
          const label = await rewriteMarkdown(node.children.length ? body.slice(node.children[0].position.start.offset, node.children.at(-1).position.end.offset) : '', resolveUrl)
          edits.push({ start, end, text: `[${label}](<${target}>${title(node.title)})` })
        }
        return
      }
    }
    if (node.type === 'html') {
      let value = node.value
      const replacements = []
      for (const match of value.matchAll(/\b(?:src|href|poster)\s*=\s*(["'])(.*?)\1/gi)) {
        const next = await resolveUrl(match[2].replace(/&amp;/g, '&'))
        if (next !== match[2]) {
          const offset = match.index + match[0].indexOf(match[1]) + 1
          replacements.push({ start: offset, end: offset + match[2].length, text: next.replace(/&/g, '&amp;').replace(/"/g, '&quot;') })
        }
      }
      for (const edit of replacements.reverse()) value = value.slice(0, edit.start) + edit.text + value.slice(edit.end)
      if (value !== node.value) edits.push({ start: node.position.start.offset, end: node.position.end.offset, text: value })
    }
    for (const child of node.children || []) await visit(child)
  }
  await visit(tree)
  for (const edit of edits.sort((a, b) => b.start - a.start)) body = body.slice(0, edit.start) + edit.text + body.slice(edit.end)
  return body
}

async function safeDestination(root, relative) {
  if (!managedPath(relative)) throw new Error(`拒绝写入非同步目录：${relative}`)
  const parts = relative.split('/')
  for (let index = 1; index <= parts.length; index++) {
    try { if ((await lstat(resolve(root, ...parts.slice(0, index)))).isSymbolicLink()) throw new Error(`同步目录不能是符号链接：${relative}`) }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return resolve(root, relative)
}

async function performSync({ root, config, client, dryRun }) {
  config = readConfig(config)
  const notebooks = (await client.request('/api/notebook/lsNotebooks'))?.notebooks
  const notebook = notebooks?.find(item => item.id === config.notebookId)
  if (!notebook || notebook.closed || notebook.encrypted) throw new Error('绑定的笔记本不存在、已关闭或已加密；请先在思源中检查，并运行 blog:doctor。')
  const docs = []
  for (let offset = 0; ; offset += 200) {
    const page = await client.request('/api/query/sql', { stmt: `SELECT id, box, hpath, content FROM blocks WHERE type='d' AND box='${config.notebookId}' ORDER BY id LIMIT 200 OFFSET ${offset}` })
    if (!Array.isArray(page)) throw new Error('思源文档查询返回异常。')
    docs.push(...page)
    if (page.length < 200) break
  }
  const candidates = []
  const draftPaths = []
  for (const doc of docs) {
    if (!idPattern.test(doc.id) || doc.box !== config.notebookId || typeof doc.hpath !== 'string') throw new Error('思源返回了不合法的文档记录。')
    if (config.excludePaths.some(path => under(doc.hpath, path))) continue
    const attrs = decodeAttributes(await client.request('/api/attr/getBlockAttrs', { id: doc.id }))
    if (['draft', 'private'].includes(attrs['custom-blog-status'])) draftPaths.push(doc.hpath)
    const section = selectSection(doc, config)
    if (!section) continue
    candidates.push({ doc, section, attrs })
  }
  const directoryPaths = new Set(docs.flatMap(doc => {
    const parts = doc.hpath.split('/').filter(Boolean)
    return parts.slice(0, -1).map((_, index) => '/' + parts.slice(0, index + 1).join('/'))
  }))
  const selected = []
  for (const candidate of candidates.filter(({ doc }) => !draftPaths.some(path => under(doc.hpath, path)))) {
    // Export block references as links, regardless of the user's desktop export settings.
    // Footnote mode otherwise embeds entire referenced documents in every article.
    const exported = await client.request('/api/export/exportMdContent', { id: candidate.doc.id, refMode: 2, yfm: false })
    if (typeof exported?.content !== 'string') throw new Error(`文档 ${candidate.doc.id} 导出失败。`)
    const body = exportedBody(exported.content, candidate.doc)
    if (body) selected.push({ ...candidate, body })
  }
  const routes = new Map(selected.map(({ doc, section }) => [doc.id, `/${section.collection}/${doc.id}/`]))
  const files = new Map()
  const documents = []
  const assetCache = new Map()
  for (const { doc, section, attrs, body } of selected) {
    const content = await rewriteMarkdown(body, async url => {
      const asset = localAsset(url)
      if (asset) {
        const key = `${doc.box}/${asset}`
        if (!assetCache.has(key)) {
          let bytes
          try { bytes = await client.request('/api/file/getFile', { path: `/data/${asset}` }, true) }
          catch { bytes = await client.request('/api/file/getFile', { path: `/data/${doc.box}/${asset}` }, true) }
          const extension = extname(asset).toLowerCase()
          if (!/^(?:\.[a-z0-9]+)?$/.test(extension)) throw new Error(`资源扩展名不支持：${asset}`)
          const output = `docs/.vuepress/public/siyuan/${hash(bytes)}${extension}`
          files.set(output, bytes)
          assetCache.set(key, `/siyuan/${hash(bytes)}${extension}`)
        }
        const suffix = url.match(/[?#].*$/)?.[0] || ''
        return assetCache.get(key) + suffix
      }
      const block = /^siyuan:\/\/blocks\/(\d{14}-[a-z0-9]{7})\/?$/.exec(url)
      if (block) {
        let route = routes.get(block[1])
        if (!route) {
          const rows = await client.request('/api/query/sql', { stmt: `SELECT root_id FROM blocks WHERE id='${block[1]}' LIMIT 1` })
          route = routes.get(rows?.[0]?.root_id)
        }
        if (!route) throw new Error(`文档 ${doc.id} 引用了未发布的思源块 ${block[1]}，请改为普通文字、公开链接，或把被引用文档放进发布目录。`)
        return route
      }
      if (/^(?:file:|siyuan:|https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$))/i.test(url)) throw new Error(`文档 ${doc.id} 包含无法用于静态博客的本地链接，请改为思源 assets 附件或公开链接。`)
      return url
    })
    const path = `docs/${section.collection}/siyuan/${doc.id}.md`
    const project = section.collection === 'projects' ? projectMetadata(attrs, content, id => routes.get(id)) : null
    const folders = doc.hpath.slice(section.path?.length || 0).split('/').filter(Boolean)
    if (!directoryPaths.has(doc.hpath)) folders.pop()
    // Published hierarchy follows the notebook tree. Legacy article attributes must not create phantom folders.
    const structure = section.collection === 'notes'
      ? knowledgeStructure(folders, section.series, undefined, '知识笔记', !!section.series)
      : undefined
    files.set(path, Buffer.from(frontmatter(doc, attrs, section, content, routes.get(doc.id), project, structure)))
    documents.push({ id: doc.id, path, title: attrs['custom-blog-title'] || doc.content, route: routes.get(doc.id) })
  }
  const manifestPath = '.siyuan/manifest.json'
  const previousBytes = await readOptional(resolve(root, manifestPath))
  const previous = previousBytes ? JSON.parse(previousBytes) : { version: 1, files: {} }
  if (previous.version !== 1 || !previous.files || typeof previous.files !== 'object') throw new Error('同步清单格式不正确。')
  const manifest = { version: 1, notebookId: config.notebookId, documents, files: Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => [path, hash(bytes)])) }
  files.set(manifestPath, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`))
  const writes = [], removals = []
  for (const path of new Set([...Object.keys(previous.files), ...files.keys()])) {
    const absolute = await safeDestination(root, path)
    const existing = await readOptional(absolute)
    const next = files.get(path)
    if (existing && next?.equals(existing)) continue
    if (existing && path !== manifestPath && hash(existing) !== previous.files[path]) throw new Error(`本地文件曾被手动修改，已停止同步：${path}。请先保存到思源或恢复该文件。`)
    if (next) writes.push({ path, absolute, bytes: next })
    else if (existing) removals.push({ path, absolute })
  }
  if (!dryRun) {
    // Fetch and validate the whole export before touching published content.
    for (const file of writes.filter(file => file.path !== manifestPath)) {
      await mkdir(dirname(file.absolute), { recursive: true })
      await writeFile(file.absolute, file.bytes)
    }
    for (const file of removals) await unlink(file.absolute)
    const manifestFile = writes.find(file => file.path === manifestPath)
    if (manifestFile) { await mkdir(dirname(manifestFile.absolute), { recursive: true }); await writeFile(manifestFile.absolute, manifestFile.bytes) }
  }
  return { notebook: notebook.name, documents, updated: writes.map(file => file.path), removed: removals.map(file => file.path), dryRun }
}

export async function sync(options = {}) {
  const root = options.root || projectRoot
  const directory = resolve(root, '.siyuan')
  await mkdir(directory, { recursive: true })
  const publicationLock = await readOptional(resolve(directory, 'publish.lock'))
  if (publicationLock && publicationLock.toString() !== String(process.pid)) throw new Error('正在构建并发布博客，请等待发布结束后再同步。')
  const lockPath = resolve(directory, 'sync.lock')
  let lock
  try { lock = await open(lockPath, 'wx') } catch (error) { if (error.code === 'EEXIST') throw new Error('已有同步任务在运行；若上次进程异常退出，请确认没有任务运行后移除 .siyuan/sync.lock。'); throw error }
  try {
    const config = options.config || JSON.parse(await readFile(resolve(root, 'siyuan.config.json'), 'utf8'))
    return await performSync({ root, config, client: options.client || createClient(), dryRun: options.dryRun || false })
  } finally { await lock.close(); await unlink(lockPath) }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => !['--dry-run', '--doctor'].includes(arg))) throw new Error('用法：npm run blog:sync -- [--dry-run]；npm run blog:doctor')
  if (args.includes('--doctor')) {
    const client = createClient()
    console.log(`思源版本：${await client.request('/api/system/version')}`)
    console.table((await client.request('/api/notebook/lsNotebooks')).notebooks.map(({ id, name, closed }) => ({ id, name, closed })))
    const config = JSON.parse(await readFile(resolve(projectRoot, 'siyuan.config.json'), 'utf8'))
    console.log(`绑定笔记本：${config.notebookId}`)
    return
  }
  const result = await sync({ dryRun: args.includes('--dry-run') })
  console.log(`${result.dryRun ? '预览同步' : '同步完成'}：${result.notebook}，${result.documents.length} 篇文章，更新 ${result.updated.length} 个文件，移除 ${result.removed.length} 个文件。`)
  if (result.documents.length) console.table(result.documents.map(({ title, route }) => ({ title, route })))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
