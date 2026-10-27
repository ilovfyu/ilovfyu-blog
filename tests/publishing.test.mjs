import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { createServer } from 'node:http'
import { execFileSync, spawnSync } from 'node:child_process'
import { sync, createClient, rewriteMarkdown, projectRoot } from '../scripts/siyuan-sync.mjs'
import { publish, publicationStatus } from '../scripts/blog-publish.mjs'

const notebookId = '20261012010624-w61rh3f'
const first = '20261012010000-aaaaaaa', second = '20261012020000-bbbbbbb'
const config = { notebookId, defaultCollection: 'posts', excludePaths: ['/草稿'], sections: [{ path: '/知识库', collection: 'notes', series: '工程知识' }, { path: '/项目', collection: 'projects' }] }
const document = (id, hpath, body, attrs = {}) => ({ id, box: notebookId, hpath, content: hpath.split('/').pop(), body, attrs })
const runGit = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

async function fixture(t, docs = []) {
  const root = await mkdtemp(resolve(tmpdir(), 'blog-publishing-'))
  const state = { docs, assets: new Map([['/data/assets/image.png', Buffer.from('image fixture')]]), blockRoots: new Map(), exportedIds: [], unavailable: false, brokenExport: false }
  const server = createServer(async (request, response) => {
    let raw = ''
    for await (const part of request) raw += part
    const data = JSON.parse(raw || '{}')
    const send = value => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ code: 0, data: value })) }
    if (request.url === '/api/file/getFile') {
      const bytes = state.assets.get(data.path)
      if (bytes) { response.end(bytes); return }
      response.statusCode = 202
      response.end(JSON.stringify({ code: 404, data: null })); return
    }
    if (request.url === '/api/notebook/lsNotebooks') return send({ notebooks: state.unavailable ? [] : [{ id: notebookId, name: '发布笔记本', closed: false }] })
    if (request.url === '/api/query/sql') {
      if (data.stmt.startsWith('SELECT root_id')) {
        const id = /WHERE id='([^']+)'/.exec(data.stmt)?.[1]
        const rootId = state.blockRoots.get(id) || state.docs.find(doc => doc.id === id)?.id
        return send(rootId ? [{ root_id: rootId }] : [])
      }
      const offset = Number(/OFFSET (\d+)/.exec(data.stmt)?.[1] || 0)
      return send(state.docs.slice(offset, offset + 200).map(({ body, attrs, ...doc }) => doc))
    }
    const doc = state.docs.find(item => item.id === data.id)
    if (request.url === '/api/attr/getBlockAttrs') return send(doc.attrs)
    if (request.url === '/api/export/exportMdContent') {
      state.exportOptions = data
      state.exportedIds.push(data.id)
      return send(state.brokenExport ? null : { content: doc.body, hPath: doc.hpath })
    }
    response.statusCode = 404; response.end('{}')
  })
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen))
  t.after(async () => { await new Promise(resolveClose => server.close(resolveClose)); await rm(root, { recursive: true, force: true }) })
  const client = createClient({ url: `http://127.0.0.1:${server.address().port}` })
  const options = { root, config, client }
  return { root, state, options }
}

test('Markdown assets and references survive nested formatting; code examples remain untouched', async () => {
  const source = '![picture](assets/image.png "标题")\n\n[**article**](siyuan://blocks/id)\n\n[![nested](assets/image.png)](siyuan://blocks/id)\n\n![reference][image]\n\n[image]: assets/image.png\n\n<img src="assets/image.png">\n\n`![code](assets/image.png)`\n\n```md\n![code](assets/image.png)\n```'
  const output = await rewriteMarkdown(source, async url => url.startsWith('assets/') ? '/siyuan/image.png' : url.startsWith('siyuan:') ? '/posts/article/' : url)
  assert.match(output, /\[\*\*article\*\*\]\(<\/posts\/article\/>\)/)
  assert.match(output, /\[!\[nested\]\(<\/siyuan\/image\.png>\)\]\(<\/posts\/article\/>\)/)
  assert.match(output, /\[image\]: <\/siyuan\/image\.png>/)
  assert.match(output, /<img src="\/siyuan\/image\.png">/)
  assert.match(output, /`!\[code\]\(assets\/image\.png\)`/)
  assert.match(output, /```md\n!\[code\]\(assets\/image\.png\)/)
})

test('removed destinations preserve formatted labels, reference labels and nested public assets', async () => {
  const hidden = 'siyuan://blocks/20261012020000-bbbbbbb'
  const source = [
    `[**隐藏项目**](${hidden})`,
    `[![截图](assets/image.png)](${hidden})`,
    '[引用式][hidden]',
    '[shortcut]',
    '![图片替代文字][hidden]',
    `[hidden]: ${hidden}`,
    `[shortcut]: ${hidden}`,
    `<a class="project" href="${hidden}">HTML 项目</a>`,
    `${String.fromCharCode(96)}[代码示例](${hidden})${String.fromCharCode(96)}`,
  ].join('\n\n')
  const output = await rewriteMarkdown(source, async url => url === hidden ? null : url === 'assets/image.png' ? '/siyuan/image.png' : url)
  assert.match(output, /^\*\*隐藏项目\*\*/)
  assert.ok(output.includes('![截图](</siyuan/image.png>)'))
  assert.ok(output.includes('\n\n引用式\n\nshortcut\n\n图片替代文字'))
  assert.ok(output.includes('<a class="project" >HTML 项目</a>'))
  assert.ok(output.includes(`${String.fromCharCode(96)}[代码示例](${hidden})${String.fromCharCode(96)}`))
  assert.equal(output.replace(/\x60[^\x60]*\x60/g, '').includes(hidden), false)
  assert.equal(output.includes('(null)'), false)
})

test('excluded document and child-block links become text without exporting excluded content', async t => {
  const child = '20261012030000-ccccccc'
  const publicId = '20261012040000-ddddddd'
  const nestedId = '20261012050000-eeeeeee'
  const { root, options, state } = await fixture(t, [
    document(first, '/项目/项目总览', `[**RAG 知识库**](siyuan://blocks/${second})\n\n[内部块](siyuan://blocks/${child})\n\n[公开项目](siyuan://blocks/${publicId})`),
    document(second, '/项目/RAG 知识库', '不应导出或发布的正文'),
    document(nestedId, '/项目/RAG 知识库/设计', '不应发布的子文档'),
    document(publicId, '/项目/RAG 知识库公开版', '公开内容'),
  ])
  state.blockRoots.set(child, second)
  const result = await sync({ ...options, config: { ...config, excludePaths: [...config.excludePaths, '/项目/RAG 知识库'] } })
  assert.deepEqual(result.documents.map(doc => doc.id).sort(), [first, publicId].sort())
  assert.equal(result.unlinkedReferences.length, 2)
  assert.equal(state.exportedIds.includes(second), false)
  assert.equal(state.exportedIds.includes(nestedId), false)
  const content = await readFile(resolve(root, `docs/projects/siyuan/${first}.md`), 'utf8')
  assert.match(content, /\*\*RAG 知识库\*\*\n\n内部块/)
  assert.ok(content.includes(`[公开项目](</projects/${publicId}/>)`))
  assert.equal(content.includes('siyuan://'), false)
  assert.equal(content.includes('不应'), false)
  await assert.rejects(readFile(resolve(root, `docs/projects/siyuan/${second}.md`)), { code: 'ENOENT' })
})

test('standalone excluded catalog entries disappear while inline prose and other entries survive', async () => {
  const hidden = 'siyuan://blocks/20261012020000-bbbbbbb'
  const source = [
    `- [**隐藏项目**](${hidden})`,
    '- [公开项目](https://example.com/project)',
    `- 正文提及 [隐藏项目](${hidden})，保留说明。`,
    '- [引用式条目][hidden]',
    '',
    `[hidden]: ${hidden}`,
  ].join('\n')
  const output = await rewriteMarkdown(source, async url => url === hidden ? null : url)
  assert.equal(output.includes('**隐藏项目**'), false)
  assert.equal(output.includes('引用式条目'), false)
  assert.ok(output.includes('- [公开项目](https://example.com/project)\n- 正文提及 隐藏项目，保留说明。'))
  assert.equal(output.includes('siyuan://'), false)
})

test('draft, private and missing targets still reject sync even when excluded targets exist', async t => {
  const privateId = '20261012030000-ccccccc'
  const draftId = '20261012040000-ddddddd'
  const missingId = '20261012050000-eeeeeee'
  const { options, state } = await fixture(t, [
    document(first, '/文章', '正文'),
    document(second, '/草稿/排除文档', '未发布'),
    document(privateId, '/私有文档', '私有正文', { 'custom-blog-status': 'private' }),
    document(draftId, '/待完成文档', '草稿正文', { 'custom-blog-status': 'draft' }),
  ])
  for (const target of [privateId, draftId, missingId]) {
    state.docs[0].body = `[不可发布](siyuan://blocks/${target})`
    await assert.rejects(sync(options), /未发布的思源块/)
  }
})

test('a child block in a published document resolves to its public route', async t => {
  const child = '20261012030000-ccccccc'
  const { root, options, state } = await fixture(t, [
    document(first, '/文章', `[章节](siyuan://blocks/${child})`),
    document(second, '/知识库/已发布文章', '正文'),
  ])
  state.blockRoots.set(child, second)
  await sync(options)
  const content = await readFile(resolve(root, `docs/posts/siyuan/${first}.md`), 'utf8')
  assert.ok(content.includes(`[章节](</notes/${second}/>)`))
})

test('HTTP export produces stable article routes, metadata, shared images and public document links', async t => {
  const { root, options, state } = await fixture(t, [
    document(first, '/随笔文章', `第一段摘要。\n\n![图片](assets/image.png)\n\n[知识](siyuan://blocks/${second})`, { 'custom-blog-title': 'A &amp; B', 'custom-blog-tags': 'AI，工程' }),
    document(second, '/知识库/知识文章', '知识正文。\n\n![同图](assets/image.png)'),
    document('20261012030000-ccccccc', '/知识库', '目录正文不会发布'),
    document('20261012040000-ddddddd', '/草稿/草稿文章', '草稿正文'),
    document('20261012050000-eeeeeee', '/私人', '私人正文', { 'custom-blog-status': 'private' }),
    document('20261012060000-fffffff', '/私人/子文档', '私人子正文'),
  ])
  const result = await sync(options)
  assert.equal(result.documents.length, 2)
  assert.equal(state.exportOptions.refMode, 2)
  assert.equal(state.exportOptions.yfm, false)
  const firstFile = `docs/posts/siyuan/${first}.md`
  const content = await readFile(resolve(root, firstFile), 'utf8')
  assert.match(content, /title: "A & B"/)
  assert.match(content, /date: "2026-10-12"/)
  assert.match(content, /description: "第一段摘要。"/)
  assert.match(content, /tags: \["AI","工程"\]/)
  assert.match(content, new RegExp(`permalink: "/posts/${first}/"`))
  assert.ok(content.includes(`[知识](</notes/${second}/>)`))
  const manifest = JSON.parse(await readFile(resolve(root, '.siyuan/manifest.json')))
  assert.equal(Object.keys(manifest.files).filter(path => path.includes('/public/')).length, 1)
  assert.match(await readFile(resolve(root, `docs/notes/siyuan/${second}.md`), 'utf8'), /series: "工程知识"/)
  assert.equal((await sync(options)).updated.length, 0)
  state.docs[0].content = '改名文章'
  state.docs[0].attrs = {}
  const update = await sync(options)
  assert.equal(update.documents[0].route, `/posts/${first}/`)
})

test('full pagination imports more than the default SiYuan search limit', async t => {
  const docs = Array.from({ length: 205 }, (_, index) => document(`20261012010000-${index.toString(36).padStart(7, '0')}`, `/文章${index}`, '正文'))
  const { options } = await fixture(t, docs)
  assert.equal((await sync({ ...options, dryRun: true })).documents.length, 205)
})

test('real desktop export metadata and duplicate title are removed; empty documents publish a placeholder', async t => {
  const { root, options, state } = await fixture(t, [
    document(first, '/文章', '---\ntitle: 文章\ndate: 2026-10-12T01:23:27+08:00\n---\n\n# 文章\n\n正文内容'),
    document(second, '/未命名文档', '---\ntitle: 未命名文档\ndate: 2026-10-12\n---\n\n# 未命名文档\n\n\u200d\n'),
  ])
  const result = await sync(options)
  assert.equal(result.documents.length, 2)
  const content = await readFile(resolve(root, `docs/posts/siyuan/${first}.md`), 'utf8')
  assert.equal((content.match(/^---$/gm) || []).length, 2)
  assert.equal(content.includes('# 文章'), false)
  assert.match(content, /description: "正文内容"/)
  const placeholder = await readFile(resolve(root, `docs/posts/siyuan/${second}.md`), 'utf8')
  assert.match(placeholder, /description: "正文待补充。"/)
  assert.match(placeholder, /> 正文待补充。/)
  assert.doesNotMatch(placeholder, /# 未命名文档|\u200d/)
  assert.equal((await sync(options)).updated.length, 0)
  state.docs[1].body = '# 未命名文档\n\n补充后的真实正文。'
  const updated = await sync(options)
  const completed = await readFile(resolve(root, `docs/posts/siyuan/${second}.md`), 'utf8')
  assert.equal(updated.documents.find(doc => doc.id === second).route, result.documents.find(doc => doc.id === second).route)
  assert.match(completed, /补充后的真实正文。/)
  assert.doesNotMatch(completed, /正文待补充/)
})

test('topic roots stay out of articles and their document links resolve to topic pages', async t => {
  const nested = '20261012030000-ccccccc'
  const { root, options } = await fixture(t, [
    document(first, '/知识库/GBDT', '# GBDT\n\n\u200d\n'),
    document(second, '/知识库/Python', ''),
    document(nested, '/知识库/Python/fastapi', `# fastapi\n\n[GBDT](siyuan://blocks/${first})`),
    document('20261012040000-ddddddd', '/知识库', ''),
    document('20261012050000-eeeeeee', '/草稿/空草稿', ''),
    document('20261012060000-fffffff', '/私有空文档', '', { 'custom-blog-status': 'private' }),
  ])
  const automatic = { ...options, config: { ...config, sections: [{ path: '/知识库', collection: 'notes' }] } }
  const result = await sync(automatic)
  assert.deepEqual(result.documents.map(doc => doc.id), [nested])
  for (const id of [first, second]) await assert.rejects(readFile(resolve(root, `docs/notes/siyuan/${id}.md`)), { code: 'ENOENT' })
  const child = await readFile(resolve(root, `docs/notes/siyuan/${nested}.md`), 'utf8')
  assert.match(child, /series: "Python"/)
  assert.ok(child.includes('[GBDT](</topics/?series=GBDT>)'))
})

test('resync removes directory articles, preserves empty leaves and resolves child-block references to directories', async t => {
  const folder = '20261012030000-ccccccc', book = '20261012040000-ddddddd', block = '20261012050000-eeeeeee'
  const { root, options, state } = await fixture(t, [
    document(first, '/知识库/线性代数/旧文章', '目录介绍'),
    document(second, '/知识库/线性代数/向量', ''),
    document(folder, '/知识库/线性代数/读书笔记', '原导读'),
    document(book, '/知识库/线性代数/读书笔记/矩阵力量', ''),
  ])
  const automatic = { ...options, config: { ...config, sections: [{ path: '/知识库', collection: 'notes' }] } }
  await sync(automatic)
  state.docs[0].hpath = '/知识库/线性代数'
  state.docs[0].content = '线性代数'
  state.docs[2].body = ''
  state.docs[3].body = `[专题](siyuan://blocks/${first})\n\n[读书目录中的块](siyuan://blocks/${block})`
  state.blockRoots.set(block, folder)
  const result = await sync(automatic)
  assert.deepEqual(result.documents.map(doc => doc.id), [second, book])
  for (const id of [first, folder]) {
    const path = `docs/notes/siyuan/${id}.md`
    assert.ok(result.removed.includes(path))
    await assert.rejects(readFile(resolve(root, path)), { code: 'ENOENT' })
  }
  assert.match(await readFile(resolve(root, `docs/notes/siyuan/${second}.md`), 'utf8'), /> 正文待补充。/)
  const article = await readFile(resolve(root, `docs/notes/siyuan/${book}.md`), 'utf8')
  assert.match(article, /series: "线性代数"\ngroup: "读书笔记"/)
  assert.equal(article.split('</topics/?series=%E7%BA%BF%E6%80%A7%E4%BB%A3%E6%95%B0>').length - 1, 2)
  assert.equal((await sync(automatic)).updated.length, 0)
})

test('SiYuan project tables select a real showcase template and resolve record links, without duplicating catalog entries', async t => {
  const { root, options, state } = await fixture(t, [
    document(first, '/项目/墨影', '项目定位与系统流水线。', { 'custom-blog-project-code': 'moyin', 'custom-blog-project-showcase': second }),
    document(second, '/项目/墨影/产品展示', '## 展示标题\n\n把一本书，\n\n讲成一门课\n\n## 简介\n\n课程生成工作流。\n\n## 核心能力\n\n| 图标 | 能力 | 说明 | 标识 |\n| --- | --- | --- | --- |\n| ✦ | 教学设计 | 讲稿与分镜 | LLM |', { 'custom-blog-project-code': 'moyin', 'custom-blog-project-view': 'showcase', 'custom-blog-project-record': first }),
  ])
  await sync(options)
  const showcase = await readFile(resolve(root, `docs/projects/siyuan/${second}.md`), 'utf8')
  assert.match(showcase, /pageLayout: "home"/)
  assert.match(showcase, /config: \[{"type":"custom"}\]/)
  assert.match(showcase, /index: false/)
  assert.match(showcase, /<project-showcase \/>/)
  assert.match(showcase, /"headline":\["把一本书，","讲成一门课"\]/)
  assert.match(showcase, /"title":"教学设计"/)
  assert.match(showcase, new RegExp(`"record":"/projects/${first}/"`))
  const record = await readFile(resolve(root, `docs/projects/siyuan/${first}.md`), 'utf8')
  assert.match(record, /<project-record-hero \/>/)
  state.docs[1].attrs['custom-blog-project-record'] = '20261012000000-xxxxxxx'
  await assert.rejects(sync(options), /引用未发布文档/)
  assert.equal(await readFile(resolve(root, `docs/projects/siyuan/${second}.md`), 'utf8'), showcase)
})

test('a concurrent publication prevents synchronization from changing the built content', async t => {
  const { root, options } = await fixture(t, [document(first, '/文章', '正文')])
  await mkdir(resolve(root, '.siyuan'))
  await writeFile(resolve(root, '.siyuan/publish.lock'), 'another-process')
  await assert.rejects(sync(options), /正在构建/)
})

test('dry-run writes no manifest or article; missing attachments abort without changing prior content', async t => {
  const { root, options, state } = await fixture(t, [document(first, '/文章', '原始正文')])
  const planned = await sync({ ...options, dryRun: true })
  assert.equal(planned.documents.length, 1)
  await assert.rejects(readFile(resolve(root, '.siyuan/manifest.json')), { code: 'ENOENT' })
  await sync(options)
  const prior = await readFile(resolve(root, `docs/posts/siyuan/${first}.md`))
  state.docs[0].body = '修改后正文\n\n![缺失图](assets/missing.png)'
  await assert.rejects(sync(options), /getFile/)
  assert.deepEqual(await readFile(resolve(root, `docs/posts/siyuan/${first}.md`)), prior)
})

test('unpublication prunes owned files and assets, while keeping manual articles', async t => {
  const { root, options, state } = await fixture(t, [document(first, '/文章', '正文\n\n![图](assets/image.png)')])
  await sync(options)
  const manual = resolve(root, 'docs/posts/manual.md')
  await writeFile(manual, '# 手写文章')
  state.docs[0].attrs = { 'custom-blog-status': 'draft' }
  const result = await sync(options)
  assert.equal(result.documents.length, 0)
  assert.equal(result.removed.length, 2)
  await assert.rejects(readFile(resolve(root, `docs/posts/siyuan/${first}.md`)), { code: 'ENOENT' })
  assert.equal(await readFile(manual, 'utf8'), '# 手写文章')
})

test('manual edits, unsafe asset traversal and symlink output paths are rejected', async t => {
  const { root, options, state } = await fixture(t, [document(first, '/文章', '原始正文')])
  await sync(options)
  const path = resolve(root, `docs/posts/siyuan/${first}.md`)
  await writeFile(path, '手工修改')
  state.docs[0].body = '新的正文'
  await assert.rejects(sync(options), /手动修改/)
  assert.equal(await readFile(path, 'utf8'), '手工修改')
  state.docs[0].body = '![图](assets/%2e%2e/private.txt)'
  await assert.rejects(sync(options), /路径不合法/)
  await rm(resolve(root, 'docs/posts/siyuan'), { recursive: true })
  await symlink(tmpdir(), resolve(root, 'docs/posts/siyuan'))
  state.docs[0].body = '正文'
  await assert.rejects(sync(options), /符号链接/)
})

test('unavailable notebook or malformed export cannot erase an existing publication', async t => {
  const { root, options, state } = await fixture(t, [document(first, '/文章', '正文')])
  await sync(options)
  const prior = await readFile(resolve(root, '.siyuan/manifest.json'))
  state.unavailable = true
  await assert.rejects(sync(options), /笔记本不存在/)
  state.unavailable = false; state.brokenExport = true
  await assert.rejects(sync(options), /导出失败/)
  assert.deepEqual(await readFile(resolve(root, '.siyuan/manifest.json')), prior)
})

test('unpublished references and local-only links stop publication', async t => {
  const { options, state } = await fixture(t, [document(first, '/文章', `[私有引用](siyuan://blocks/${second})`)])
  await assert.rejects(sync(options), /未发布/)
  state.docs[0].body = '[本机](http://127.0.0.1:6806/assets/file.png)'
  await assert.rejects(sync(options), /本地链接/)
})

async function initGit(root) {
  runGit(root, 'init', '-b', 'master')
  runGit(root, 'config', 'user.name', 'Publishing Test')
  runGit(root, 'config', 'user.email', 'test@example.invalid')
  await writeFile(resolve(root, '.gitignore'), '.siyuan/*.lock\n')
  await writeFile(resolve(root, 'README.md'), '# Test repository')
  runGit(root, 'add', '.')
  runGit(root, 'commit', '-m', 'initial')
  const remote = resolve(root, 'remote.git')
  execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' })
  await writeFile(resolve(root, '.git/info/exclude'), 'remote.git/\n')
  runGit(root, 'remote', 'add', 'origin', remote)
  return remote
}

test('publishing refuses unrelated files and staged work, and dry-run makes no commit', async t => {
  const { root, options } = await fixture(t, [document(first, '/文章', '正文')])
  await initGit(root)
  const original = runGit(root, 'rev-parse', 'HEAD')
  await writeFile(resolve(root, 'theme.css'), 'theme work')
  const result = await publish({ root, dryRun: true, syncOptions: options })
  assert.equal(result.blocked, true)
  assert.equal(runGit(root, 'rev-parse', 'HEAD'), original)
  runGit(root, 'add', 'theme.css')
  assert.throws(() => publicationStatus(root), /暂存区/)
})

test('Git publication pushes only generated content; deletion synced earlier can be published and retried', async t => {
  const { root, options, state } = await fixture(t, [document(first, '/文章', '正文\n\n![图](assets/image.png)')])
  const remote = await initGit(root)
  await publish({ root, syncOptions: options, build: false })
  assert.equal(runGit(root, 'rev-parse', 'HEAD'), execFileSync('git', ['--git-dir', remote, 'rev-parse', 'master'], { encoding: 'utf8' }).trim())
  state.docs[0].attrs = { 'custom-blog-status': 'draft' }
  await sync(options) // Common workflow: synchronize for preview, then publish later.
  await publish({ root, syncOptions: options, build: false })
  assert.equal(runGit(root, 'ls-tree', '-r', '--name-only', 'HEAD').includes(first), false)
  const prior = runGit(root, 'rev-parse', 'HEAD')
  await publish({ root, syncOptions: options, build: false })
  assert.equal(runGit(root, 'rev-parse', 'HEAD'), prior)
})

test('a failed production build leaves HEAD and remote unchanged', async t => {
  const { root, options } = await fixture(t, [document(first, '/文章', '正文')])
  const remote = await initGit(root)
  await writeFile(resolve(root, 'package.json'), JSON.stringify({ scripts: { 'docs:build': 'node -e "process.exit(1)"' } }))
  runGit(root, 'add', 'package.json'); runGit(root, 'commit', '-m', 'failing build fixture')
  const prior = runGit(root, 'rev-parse', 'HEAD')
  await assert.rejects(publish({ root, syncOptions: options }), /构建失败/)
  assert.equal(runGit(root, 'rev-parse', 'HEAD'), prior)
  assert.throws(() => execFileSync('git', ['--git-dir', remote, 'rev-parse', 'master'], { stdio: 'pipe' }))
})

test('exported articles build with the real blog theme and valid GitHub Pages image/link prefixes', async t => {
  const { root, options } = await fixture(t, [
    document(first, '/文章', `正文摘要。\n\n![图](assets/image.png)\n\n[知识](siyuan://blocks/${second})\n\n| 表头 | 数值 |\n| --- | --- |\n| 示例 | 42 |\n\n<img src="assets/image.png">\n\n<video poster="assets/image.png"></video>\n\n<a href="assets/image.png">下载附件</a>`),
    document(second, '/知识库/文章', '知识正文。'),
  ])
  await cp(resolve(projectRoot, 'docs'), resolve(root, 'docs'), { recursive: true, filter: path => !/(?:^|\/)\.(?:temp|cache)(?:\/|$)|(?:^|\/)dist(?:\/|$)/.test(path) })
  await symlink(resolve(projectRoot, 'node_modules'), resolve(root, 'node_modules'))
  await cp(resolve(projectRoot, 'package.json'), resolve(root, 'package.json'))
  await sync(options)
  const manualDirectory = resolve(root, 'docs/notes/目录测试/基础/请求与响应')
  await mkdir(manualDirectory, { recursive: true })
  await writeFile(resolve(manualDirectory, '参数校验.md'), '---\ntitle: 目录分组测试\npermalink: /notes/directory-fixture/\n---\n\n目录推导正文。')
  const result = spawnSync('npm', ['run', 'docs:build'], { cwd: root, encoding: 'utf8', env: { ...process.env, DEPLOY_ENV: 'gh-pages', SITE_HOSTNAME: 'https://ilovfyu.github.io', PAGES_BASE_PATH: '/ilovfyu-blog' } })
  assert.equal(result.status, 0, result.stdout + result.stderr)
  const catalog = await readFile(resolve(root, 'docs/.vuepress/.temp/build/blog-content.js'), 'utf8')
  assert.match(catalog, /"title":"目录分组测试"[^\n]+?"series":"目录测试","group":"基础 \/ 请求与响应","groupPath":\["基础","请求与响应"\]/)
  const projects = JSON.parse(catalog.match(/export const projects = (.+);/)[1])
  assert.deepEqual(projects.filter(entry => !['持续构建', '已完成作品'].includes(entry.project?.group)).map(entry => entry.title), ['模型微调训练'])
  assert.equal(projects.length, 5)
  assert.equal(projects.find(entry => entry.title === 'Wyvern')?.project.group, '持续构建')
  for (const path of ['projects', 'projects/wyvern']) {
    const projectHtml = await readFile(resolve(root, `docs/.vuepress/dist/${path}/index.html`), 'utf8')
    assert.ok(projectHtml.includes('data-kind="delta-memory"'))
    assert.ok(projectHtml.includes('FROZEN ATTENTION'))
    assert.ok(!projectHtml.includes('<animateMotion'))
  }
  const html = await readFile(resolve(root, `docs/.vuepress/dist/posts/${first}/index.html`), 'utf8')
  assert.match(html, /<table>/)
  assert.match(html, /src="\/ilovfyu-blog\/siyuan\/[a-f0-9]{64}\.png"/)
  assert.equal((html.match(/src="\/ilovfyu-blog\/siyuan\//g) || []).length, 2)
  assert.match(html, /poster="\/ilovfyu-blog\/siyuan\/[a-f0-9]{64}\.png"/)
  assert.match(html, /href="\/ilovfyu-blog\/siyuan\/[a-f0-9]{64}\.png"/)
  assert.ok(html.includes(`href="/ilovfyu-blog/notes/${second}/"`))
  assert.ok(html.includes(`https://ilovfyu.github.io/ilovfyu-blog/posts/${first}/`))
  assert.equal(html.includes('siyuan://'), false)
  const manifest = JSON.parse(await readFile(resolve(projectRoot, '.siyuan/manifest.json'), 'utf8'))
  for (const doc of manifest.documents.filter(doc => doc.path.includes('/projects/'))) {
    const source = await readFile(resolve(projectRoot, doc.path), 'utf8')
    if (!source.includes('<project-showcase />')) continue
    const productHtml = await readFile(resolve(root, `docs/.vuepress/dist${doc.route}index.html`), 'utf8')
    assert.match(productHtml, /class="project-showcase"/, doc.title)
    assert.doesNotMatch(productHtml, /<h1[^>]*>Theme Plume<\/h1>/, doc.title)
  }
})

test('SiYuan directory nesting and moves update topic metadata while retaining article URLs', async t => {
  const { root, options, state } = await fixture(t, [
    document(first, '/知识库/FastAPI/基础/请求/01 · 参数', '参数正文'),
    document(second, '/知识库/FastAPI/高级/异步/02 · 并发', '并发正文'),
    document('20261012030000-ccccccc', '/知识库/FastAPI/基础', '基础导读正文'),
    document('20261012040000-ddddddd', '/知识库/FastAPI', '专题介绍正文'),
    document('20261012050000-eeeeeee', '/知识库/FastAPI/空目录', ''),
  ])
  const automatic = { ...options, config: { ...config, sections: [{ path: '/知识库', collection: 'notes' }] } }
  const result = await sync(automatic)
  assert.equal(result.documents.length, 4)
  const content = id => readFile(resolve(root, `docs/notes/siyuan/${id}.md`), 'utf8')
  assert.match(await content(first), /series: "FastAPI"\ngroup: "基础 \/ 请求"\ngroupPath: \["基础","请求"\]/)
  assert.match(await content('20261012030000-ccccccc'), /groupPath: \["基础"\]/)
  await assert.rejects(content('20261012040000-ddddddd'), { code: 'ENOENT' })
  state.docs[0].hpath = '/知识库/FastAPI/高级/请求/01 · 参数'
  const moved = await sync(automatic)
  assert.match(await content(first), /groupPath: \["高级","请求"\]/)
  assert.equal(moved.documents.find(doc => doc.id === first).route, `/notes/${first}/`)
  state.docs[0].attrs = { 'custom-blog-series': 'API 实践', 'custom-blog-group': '认证 / 依赖' }
  await sync(automatic)
  assert.match(await content(first), /series: "FastAPI"\ngroup: "高级 \/ 请求"\ngroupPath: \["高级","请求"\]/)
  assert.doesNotMatch(await content(first), /API 实践|认证 \/ 依赖/)
})

test('a configured series keeps every directory below its section as a group', async t => {
  const { root, options } = await fixture(t, [document(first, '/知识库/FastAPI/基础/路由/01 · 路由', '正文')])
  await sync({ ...options, config: { ...config, sections: [{ path: '/知识库/FastAPI', collection: 'notes', series: 'FastAPI' }] } })
  assert.match(await readFile(resolve(root, `docs/notes/siyuan/${first}.md`), 'utf8'), /series: "FastAPI"\ngroup: "基础 \/ 路由"\ngroupPath: \["基础","路由"\]/)
})
