import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const vaultRoot = resolve(process.env.ILOVFYU_VAULT || '../ilovfyu-final/ilovfyu-final')
const docsRoot = resolve('docs')
const outputRoot = join(docsRoot, 'kb')
const dataFile = resolve('docs/.vuepress/theme/data/knowledgeArticles.ts')

// 需要同步的顶层系列：top = vault 目录名, key = 博客路径段
// 注意：项目整理不在知识库同步范围（项目内容由博客「项目」tab 专门承载）
const series = [
  { top: 'OS', key: 'os', name: 'OS' },
  { top: 'Language', key: 'language', name: 'Language' },
  { top: 'AI', key: 'ai', name: 'AI' },
  { top: '容器', key: 'container', name: '容器' },
]

function stripExtension(file) {
  return basename(file, '.md')
}

function getOrder(file) {
  return Number.parseInt(stripExtension(file).match(/^(\d+)/)?.[1] || '999', 10)
}

function getTitle(content, fallback) {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback
  return title.replace(/^\d+\s*/, '')
}

function slugify(name) {
  return name.trim().replace(/\s+/g, '-').replace(/[\\/:*?"<>|]/g, '')
}

function routeFor(note) {
  const fileSlug = slugify(stripExtension(note.sourcePath))
  return `/kb/${note.seriesKey}/${note.subDirSlug}/${fileSlug}/`
}

function markdownPathFor(note) {
  const fileSlug = slugify(stripExtension(note.sourcePath))
  return join(outputRoot, note.seriesKey, note.subDirSlug, `${fileSlug}.md`)
}

function yamlString(value) {
  return JSON.stringify(value)
}

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(join(directory, entry.name)))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(join(directory, entry.name))
    }
  }
  return files.sort((a, b) => getOrder(a) - getOrder(b) || a.localeCompare(b, 'zh-CN'))
}

function resolveWikiTarget(currentSource, target, noteBySource, noteByName) {
  const normalizedTarget = target.replace(/\\/g, '/').replace(/\.md$/i, '')
  const directSource = resolve(dirname(currentSource), `${normalizedTarget}.md`)
  if (noteBySource.has(directSource)) return noteBySource.get(directSource)

  const targetName = basename(normalizedTarget)
  const matches = noteByName.get(targetName) || []
  return matches.length === 1 ? matches[0] : null
}

function convertWikiLinks(content, currentNote, noteBySource, noteByName, unresolvedLinks) {
  return content.replace(/\[\[([^\]]+)\]\]/g, (full, raw) => {
    const isEmbed = full.startsWith('!')
    const [rawTarget, alias] = raw.split('|')
    const [targetPath, heading] = rawTarget.split('#')
    // Bash 的 [[ ... ]] 测试语法、[[:digit:]] 等 POSIX 字符类不是 wiki 链接：
    // 若目标以冒号开头、为空或无法解析为任何笔记，保留原文（防止破坏代码）。
    if (!targetPath || !targetPath.trim() || targetPath.trim().startsWith(':')) return full
    const note = resolveWikiTarget(currentNote.sourcePath, targetPath.trim(), noteBySource, noteByName)
    const label = (alias || heading || basename(targetPath)).trim().replace(/^\d+\s*/, '')
    if (!note) {
      unresolvedLinks.add(`${currentNote.sourceRelative} -> ${rawTarget.trim()}`)
      return full
    }
    const route = `${note.route}${heading ? `#${encodeURIComponent(heading.trim())}` : ''}`
    return `[${label}](${route})`
  })
}

function convertCallouts(content) {
  const lines = content.split('\n')
  const result = []
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^> \[!([\w-]+)\]([+-])?\s*(.*)$/i)
    if (!match) {
      result.push(lines[index])
      continue
    }

    const type = match[1].toLowerCase()
    const title = match[3].trim()
    const body = []
    index += 1
    while (index < lines.length && /^>($| )/.test(lines[index])) {
      body.push(lines[index].replace(/^> ?/, ''))
      index += 1
    }
    index -= 1
    result.push(`::: ${type}${title ? ` ${title}` : ''}`)
    result.push(...body)
    result.push(':::')
  }
  return result.join('\n')
}

function stripEmbedAttachments(content) {
  // 移除 ![[xxx]] 形式的资源嵌入（视频/图片/附件），保留为链接文本
  return content.replace(/!\[\[([^\]]+)\]\]/g, (full, raw) => {
    const [target, alias] = raw.split('|')
    return `[${alias || target}]`
  })
}

// 合法的内联 HTML 标签白名单（VuePress 会原样保留），其余 <xxx> 一律转义为文本，
// 避免 `<pid>`、`<T>` 等占位符被 vue SFC 编译器当作未闭合标签导致构建失败。
const HTML_TAG_WHITELIST = new Set([
  'br', 'hr', 'details', 'summary', 'b', 'i', 'em', 'strong', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'a', 'img',
  'span', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'sup', 'sub',
])

function escapePseudoHtml(content) {
  return content.replace(/<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?\/?>/g, (full, tagName) => {
    const name = tagName.toLowerCase()
    if (HTML_TAG_WHITELIST.has(name)) return full
    // 闭合标签与非白名单标签统一转义为实体
    return full.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  })
}

function transformContent(content, note, noteBySource, noteByName, unresolvedLinks) {
  let transformed = stripEmbedAttachments(content)
  transformed = transformed.replace(/^#\s+.+\n+/, '')
  // 先整体转义伪 HTML：代码块内也转义（无 mermaid 渲染，字面文本更安全），
  // 避免 `<pid>`、`<br/>` 等被 vue SFC 编译器当作未闭合标签。
  transformed = escapePseudoHtml(transformed)
  transformed = transformed.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g).map((segment, index) => {
    if (index % 2) return segment
    return convertCallouts(convertWikiLinks(segment, note, noteBySource, noteByName, unresolvedLinks))
  }).join('')
  return transformed.trim()
}

function extractSummary(content, fallback) {
  const lines = content.split('\n')
  let depth = 0
  for (const line of lines) {
    if (/^```|^~~~/.test(line)) { depth = depth ? 0 : 1; continue }
    if (depth) continue
    if (/^#/.test(line)) continue
    if (/^>/.test(line)) continue
    if (/^---$/.test(line)) continue
    if (/^!\[\[/.test(line)) continue
    if (!line.trim()) continue
    const text = line.replace(/[#*_`>[\]]/g, '').trim()
    if (text.length > 12) return text.length > 90 ? `${text.slice(0, 90)}…` : text
  }
  return fallback
}

async function fileDate(file) {
  try {
    const s = await stat(file)
    const d = new Date(s.mtimeMs)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  } catch {
    return ''
  }
}

function buildFrontmatter(note, previous, next) {
  return [
    '---',
    `title: ${yamlString(note.title)}`,
    `permalink: ${note.route}`,
    'pageClass: knowledge-note-page',
    'comments: false',
    'editLink: false',
    'lastUpdated: false',
    'contributors: false',
    'readingTime: true',
    'aside: true',
    'outline: [2, 3]',
    previous ? `prev: { text: ${yamlString(previous.title)}, link: ${previous.route} }` : 'prev: false',
    next ? `next: { text: ${yamlString(next.title)}, link: ${next.route} }` : 'next: false',
    'knowledgeNote:',
    `  series: ${yamlString(note.seriesName)}`,
    `  group: ${yamlString(note.groupName)}`,
    '---',
    '',
  ].join('\n')
}

async function main() {
  const allNotes = []
  const seriesList = []

  for (const definition of series) {
    const sourceRootDir = join(vaultRoot, definition.top)
    if (!(await readdir(sourceRootDir).catch(() => null))) continue
    const files = await listMarkdownFiles(sourceRootDir)
    const notes = []
    for (const file of files) {
      const content = await readFile(file, 'utf8')
      const subDir = relative(sourceRootDir, dirname(file))
      const subDirSlug = subDir === '' ? '总览' : subDir.split(sep).map(slugify).join('/')
      // 完整标签路径：系列名 + 每一级目录名（如 容器 → Docker → 镜像优化），
      // 保证任何一级标签（如 "Docker"）都能命中其下所有笔记。
      const tagPath = [definition.name]
      if (subDir !== '') tagPath.push(...subDir.split(sep))
      notes.push({
        sourcePath: resolve(file),
        sourceRelative: relative(vaultRoot, file).split(sep).join('/'),
        fileName: stripExtension(file),
        title: getTitle(content, stripExtension(file)),
        order: getOrder(file),
        seriesKey: definition.key,
        seriesName: definition.name,
        groupName: subDir === '' ? definition.name : basename(subDir),
        tagPath,
        subDirSlug,
        content,
        date: await fileDate(file),
      })
    }
    notes.forEach((note, index) => {
      note.route = routeFor(note)
      note.total = notes.length
      note.index = index
      note.previous = null
      note.next = null
    })
    // 仅在同一子目录（group）内按顺序取 prev/next，避免跨组串联
    const byGroup = new Map()
    for (const note of notes) {
      const key = `${note.seriesKey}/${note.subDirSlug}`
      if (!byGroup.has(key)) byGroup.set(key, [])
      byGroup.get(key).push(note)
    }
    for (const groupNotes of byGroup.values()) {
      groupNotes.forEach((note, groupIndex) => {
        note.previous = groupIndex > 0 ? groupNotes[groupIndex - 1] : null
        note.next = groupIndex < groupNotes.length - 1 ? groupNotes[groupIndex + 1] : null
      })
    }
    allNotes.push(...notes)
    seriesList.push({
      key: definition.key,
      name: definition.name,
      top: definition.top,
      total: notes.length,
    })
  }

  const noteBySource = new Map(allNotes.map((note) => [note.sourcePath, note]))
  const noteByName = new Map()
  for (const note of allNotes) {
    const matches = noteByName.get(note.fileName) || []
    matches.push(note)
    noteByName.set(note.fileName, matches)
  }

  const unresolvedLinks = new Set()
  const outputs = []
  const articles = []
  for (const note of allNotes) {
    const body = transformContent(note.content, note, noteBySource, noteByName, unresolvedLinks)
    const output = `${buildFrontmatter(note, note.previous, note.next)}${body}\n`
    outputs.push({ path: markdownPathFor(note), content: output })
    articles.push({
      title: note.title,
      date: note.date || '',
      path: note.route,
      summary: extractSummary(note.content, note.title),
      tags: [...new Set(note.tagPath)],
      topics: [],
      series: note.seriesName,
      group: note.groupName,
    })
  }

  if (unresolvedLinks.size) {
    const sample = [...unresolvedLinks].slice(0, 30).join('\n')
    process.stdout.write(`[warn] ${unresolvedLinks.size} unresolved wiki links (kept as text):\n${sample}\n`)
  }

  await rm(outputRoot, { recursive: true, force: true })
  for (const output of outputs) {
    await mkdir(dirname(output.path), { recursive: true })
    await writeFile(output.path, output.content, 'utf8')
  }
  await mkdir(dirname(dataFile), { recursive: true })
  const serialized = JSON.stringify(articles, null, 2)
  await writeFile(dataFile, `export type KnowledgeArticle = {\n  title: string\n  date: string\n  path: string\n  summary: string\n  tags: string[]\n  topics: string[]\n  series: string\n  group: string\n}\n\nexport const knowledgeArticles = ${serialized} as const\n`, 'utf8')
  process.stdout.write(`Synced ${allNotes.length} knowledge notes from ${vaultRoot}\n`)
  for (const s of seriesList) process.stdout.write(`  - ${s.top}: ${s.total} notes\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
