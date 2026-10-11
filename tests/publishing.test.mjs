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
  const state = { docs, assets: new Map([['/data/assets/image.png', Buffer.from('image fixture')]]), unavailable: false, brokenExport: false }
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
      if (data.stmt.startsWith('SELECT root_id')) return send([{ root_id: second }])
      const offset = Number(/OFFSET (\d+)/.exec(data.stmt)?.[1] || 0)
      return send(state.docs.slice(offset, offset + 200).map(({ body, attrs, ...doc }) => doc))
    }
    const doc = state.docs.find(item => item.id === data.id)
    if (request.url === '/api/attr/getBlockAttrs') return send(doc.attrs)
    if (request.url === '/api/export/exportMdContent') {
      state.exportOptions = data
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

test('real desktop export metadata and duplicate title are removed; empty new documents stay unpublished', async t => {
  const { root, options } = await fixture(t, [
    document(first, '/文章', '---\ntitle: 文章\ndate: 2026-10-12T01:23:27+08:00\n---\n\n# 文章\n\n正文内容'),
    document(second, '/未命名文档', '---\ntitle: 未命名文档\ndate: 2026-10-12\n---\n\n# 未命名文档\n\n\u200d\n'),
  ])
  const result = await sync(options)
  assert.equal(result.documents.length, 1)
  const content = await readFile(resolve(root, `docs/posts/siyuan/${first}.md`), 'utf8')
  assert.equal((content.match(/^---$/gm) || []).length, 2)
  assert.equal(content.includes('# 文章'), false)
  assert.match(content, /description: "正文内容"/)
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
  const result = spawnSync('npm', ['run', 'docs:build'], { cwd: root, encoding: 'utf8', env: { ...process.env, DEPLOY_ENV: 'gh-pages', SITE_HOSTNAME: 'https://ilovfyu.github.io', PAGES_BASE_PATH: '/ilovfyu-blog' } })
  assert.equal(result.status, 0, result.stdout + result.stderr)
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
