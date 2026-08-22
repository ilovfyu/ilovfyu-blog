import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const vaultRoot = resolve(process.env.ILOVFYU_VAULT || '../ilovfyu-final/ilovfyu-final')
const sourceRoot = join(vaultRoot, '数学基础')
const docsRoot = resolve('docs/specials/math')
const generatedRoot = join(docsRoot, 'notes')
const dataFile = resolve('docs/.vuepress/theme/data/mathSpecial.ts')

const seriesDefinitions = [
  {
    key: 'probability',
    code: 'PROB',
    name: '概率论',
    english: 'PROBABILITY & STATISTICS',
    source: '概率论',
    summary: '从概率公理、随机变量和分布走向统计推断、信息论与概率模型。',
    visual: {
      label: 'FOUNDATION / 01',
      primary: 'P(A|B)',
      operator: '=',
      secondary: 'P(B|A)P(A) / P(B)',
      caption: 'PROBABILITY · CONDITION · INFERENCE',
    },
    groups: [
      { name: '学习路线', range: [0, 0] },
      { name: '概率语言', range: [1, 3] },
      { name: '随机变量与分布', range: [4, 10] },
      { name: '极限定理与统计推断', range: [11, 15] },
      { name: '信息、结构与序列', range: [16, 20] },
    ],
  },
  {
    key: 'linear-algebra',
    code: 'LALG',
    name: '线性代数',
    english: 'LINEAR ALGEBRA FOR ML',
    source: '线性代数',
    summary: '从向量和矩阵出发，串起空间、分解、表示学习、反向传播与数值稳定性。',
    excludeDirs: ['考研专用'],
    visual: {
      label: 'VECTOR / 01',
      primary: 'A x',
      operator: '=',
      secondary: 'lambda x',
      caption: 'VECTOR · MATRIX · TRANSFORMATION',
    },
    groups: [
      { name: '学习路线', range: [0, 0] },
      { name: '对象与基本运算', range: [1, 3] },
      { name: '方程、空间与映射', range: [4, 8] },
      { name: '几何与最佳拟合', range: [9, 10] },
      { name: '矩阵分解与表示', range: [11, 15] },
      { name: '深度学习计算基础', range: [16, 19] },
    ],
  },
  {
    key: 'exam-linear-algebra',
    code: 'EXAM',
    name: '考研线性代数',
    english: 'EXAM LINEAR ALGEBRA',
    source: join('线性代数', '考研专用'),
    summary: '以九讲和三轮复习为主线，强化定理条件、手算流程与综合题入口。',
    visual: {
      label: 'EXAM / 01',
      primary: 'det(A - lambda I)',
      operator: '=',
      secondary: '0',
      caption: 'DETERMINANT · RANK · EIGENVALUE',
    },
    groups: [
      { name: '复习路线', range: [0, 0] },
      { name: '行列式', range: [1, 2] },
      { name: '矩阵、向量与方程组', range: [3, 6] },
      { name: '特征结构与二次型', range: [7, 9] },
    ],
  },
  {
    key: 'calculus',
    code: 'CALC',
    name: '高等数学',
    english: 'CALCULUS & ANALYSIS',
    source: '高数',
    summary: '从极限、导数与积分出发，串起微分方程、多元微积分、曲线曲面积分与无穷级数。',
    visual: {
      label: 'CALCULUS / 01',
      primary: '∫ f(x) dx',
      operator: '=',
      secondary: 'F(b) − F(a)',
      caption: 'LIMIT · DERIVATIVE · INTEGRAL',
    },
    orderOverrides: { '附录-常用公式与结论速查': 13 },
    groups: [
      { name: '学习路线', range: [0, 0] },
      { name: '函数与极限', range: [1, 1] },
      { name: '导数与微分', range: [2, 3] },
      { name: '一元积分', range: [4, 6] },
      { name: '微分方程', range: [7, 7] },
      { name: '多元微积分', range: [8, 10] },
      { name: '曲线积分与级数', range: [11, 12] },
      { name: '附录速查', range: [13, 13] },
    ],
  },
]

function stripExtension(file) {
  return basename(file, '.md')
}

function getOrder(file, orderOverrides = {}) {
  const name = stripExtension(file)
  if (orderOverrides[name] !== undefined) return orderOverrides[name]
  return Number.parseInt(name.match(/^(\d+)/)?.[1] || '999', 10)
}

function getTitle(content, fallback) {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback
  return title.replace(/^\d+\s*/, '')
}

function routeFor(series, order) {
  return `/specials/math/notes/${series.key}/${String(order).padStart(2, '0')}/`
}

function markdownPathFor(series, order) {
  return join(generatedRoot, series.key, `${String(order).padStart(2, '0')}.md`)
}

function yamlString(value) {
  return JSON.stringify(value)
}

async function listMarkdownFiles(directory, excludeDirs = [], orderOverrides = {}) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) files.push(...await listMarkdownFiles(join(directory, entry.name), excludeDirs, orderOverrides))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(join(directory, entry.name))
    }
  }
  return files.sort((a, b) => getOrder(a, orderOverrides) - getOrder(b, orderOverrides) || a.localeCompare(b, 'zh-CN'))
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
    const [rawTarget, alias] = raw.split('|')
    const [targetPath, heading] = rawTarget.split('#')
    const note = resolveWikiTarget(currentNote.sourcePath, targetPath.trim(), noteBySource, noteByName)
    const label = (alias || heading || basename(targetPath)).trim().replace(/^\d+\s*/, '')
    if (!note) {
      unresolvedLinks.add(`${currentNote.sourceRelative} -> ${rawTarget.trim()}`)
      return label
    }
    return `[${label}](${note.route}${heading ? `#${encodeURIComponent(heading.trim())}` : ''})`
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

function transformContent(content, note, noteBySource, noteByName, unresolvedLinks) {
  let transformed = content.replace(/^#\s+.+\n+/, '')
  transformed = transformed.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g).map((segment, index) => {
    if (index % 2) return segment
    return convertCallouts(convertWikiLinks(segment, note, noteBySource, noteByName, unresolvedLinks))
  }).join('')
  return transformed.trim()
}

function buildFrontmatter(note, previous, next) {
  return [
    '---',
    `title: ${yamlString(note.title)}`,
    `permalink: ${note.route}`,
    'pageClass: math-note-page',
    'comments: false',
    'editLink: false',
    'lastUpdated: false',
    'contributors: false',
    'readingTime: true',
    'aside: true',
    'outline: [2, 3]',
    previous ? `prev: { text: ${yamlString(previous.title)}, link: ${previous.route} }` : 'prev: false',
    next ? `next: { text: ${yamlString(next.title)}, link: ${next.route} }` : 'next: false',
    'mathSpecial:',
    `  series: ${yamlString(note.seriesKey)}`,
    `  seriesName: ${yamlString(note.seriesName)}`,
    `  code: ${yamlString(note.code)}`,
    `  order: ${note.order}`,
    `  total: ${note.total}`,
    '---',
    '',
  ].join('\n')
}

function toTypeScript(series) {
  const serialized = JSON.stringify(series, null, 2)
  return `export type MathSeriesKey = 'probability' | 'linear-algebra' | 'exam-linear-algebra' | 'calculus'\n\nexport const mathSeries = ${serialized} as const\n`
}

async function main() {
  const allSeries = []
  const allNotes = []

  for (const definition of seriesDefinitions) {
    const sourceDirectory = join(sourceRoot, definition.source)
    const files = await listMarkdownFiles(sourceDirectory, definition.excludeDirs, definition.orderOverrides)
    const notes = []
    for (const file of files) {
      const content = await readFile(file, 'utf8')
      const order = getOrder(file, definition.orderOverrides)
      notes.push({
        sourcePath: resolve(file),
        sourceRelative: relative(vaultRoot, file).split(sep).join('/'),
        fileName: stripExtension(file),
        title: getTitle(content, stripExtension(file)),
        order,
        code: `${definition.code}.${String(order).padStart(2, '0')}`,
        route: routeFor(definition, order),
        seriesKey: definition.key,
        seriesName: definition.name,
        content,
      })
    }

    const groups = definition.groups.map((group) => ({
      name: group.name,
      chapters: notes
        .filter((note) => note.order >= group.range[0] && note.order <= group.range[1])
        .map((note) => ({ title: note.title, order: note.order, code: note.code, route: note.route })),
    }))

    notes.forEach((note) => { note.total = notes.length })
    allNotes.push(...notes)
    allSeries.push({
      key: definition.key,
      code: definition.code,
      name: definition.name,
      english: definition.english,
      summary: definition.summary,
      visual: definition.visual,
      total: notes.length,
      route: notes[0]?.route,
      groups,
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
  for (const note of allNotes) {
    const siblings = allNotes.filter((item) => item.seriesKey === note.seriesKey)
    const index = siblings.findIndex((item) => item.sourcePath === note.sourcePath)
    const previous = index > 0 ? siblings[index - 1] : null
    const next = index < siblings.length - 1 ? siblings[index + 1] : null
    const body = transformContent(note.content, note, noteBySource, noteByName, unresolvedLinks)
    const output = `${buildFrontmatter(note, previous, next)}${body}\n`
    outputs.push({ path: markdownPathFor({ key: note.seriesKey }, note.order), content: output })
  }

  if (unresolvedLinks.size) {
    throw new Error(`Unresolved math wiki links:\n${[...unresolvedLinks].join('\n')}`)
  }

  await rm(generatedRoot, { recursive: true, force: true })
  for (const output of outputs) {
    await mkdir(dirname(output.path), { recursive: true })
    await writeFile(output.path, output.content, 'utf8')
  }
  await mkdir(dirname(dataFile), { recursive: true })
  await writeFile(dataFile, toTypeScript(allSeries), 'utf8')
  process.stdout.write(`Synced ${allNotes.length} math notes from ${sourceRoot}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
