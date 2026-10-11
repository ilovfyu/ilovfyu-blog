import { execFileSync, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { mkdir, open, unlink } from 'node:fs/promises'
import { readFileSync, realpathSync } from 'node:fs'
import { sync, managedPath, projectRoot } from './siyuan-sync.mjs'

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

export function publicationStatus(root) {
  if (realpathSync(git(root, 'rev-parse', '--show-toplevel')) !== realpathSync(root)) throw new Error('发布必须在博客仓库根目录运行。')
  const branch = git(root, 'branch', '--show-current')
  if (!['main', 'master'].includes(branch)) throw new Error('当前部署流程仅接收 main/master；请先合并博客改动到发布分支。')
  if (git(root, 'diff', '--cached', '--name-only')) throw new Error('暂存区已有改动，请先处理现有暂存内容再发布文章。')
  const raw = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8' })
  const records = raw.split('\0').filter(Boolean)
  const changed = []
  for (let index = 0; index < records.length; index++) {
    const record = records[index]
    changed.push(record.slice(3))
    if (/[RC]/.test(record.slice(0, 2))) changed.push(records[++index])
  }
  const unrelated = changed.filter(path => !managedPath(path))
  return { branch, changed, unrelated, remote: git(root, 'remote', 'get-url', 'origin') }
}

export async function publish({ root = projectRoot, dryRun = false, build = true, syncOptions = {} } = {}) {
  await mkdir(resolve(root, '.siyuan'), { recursive: true })
  const lockPath = resolve(root, '.siyuan/publish.lock')
  let lock
  try { lock = await open(lockPath, 'wx') } catch (error) { if (error.code === 'EEXIST') throw new Error('已有发布任务在运行；若上次进程异常退出，请先确认没有任务运行再移除 .siyuan/publish.lock。'); throw error }
  try {
    await lock.writeFile(String(process.pid))
    const before = publicationStatus(root)
    if (before.unrelated.length) {
      if (dryRun) return { dryRun: true, blocked: true, branch: before.branch, reason: `仓库还有 ${before.unrelated.length} 个主题、配置或其他改动，请先检查并单独提交。` }
      throw new Error(`仓库还有 ${before.unrelated.length} 个文章以外的改动，请先检查并单独提交，再运行 blog:publish。`)
    }
    const exported = await sync({ ...syncOptions, root, dryRun })
    if (dryRun) return { dryRun: true, branch: before.branch, updated: exported.updated, removed: exported.removed, documents: exported.documents.length }
    if (build) {
      const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'docs:build'], { cwd: root, stdio: 'inherit', env: { ...process.env, DEPLOY_ENV: 'gh-pages' } })
      if (result.error || result.status !== 0) throw new Error('博客构建失败，已停止提交和推送；同步文件保留在本地供修复。')
    }
    const after = publicationStatus(root)
    if (after.unrelated.length) throw new Error('构建期间出现了文章以外的改动，已停止发布。')
    if (after.changed.length) {
      const manifest = JSON.parse(gitManifest(root))
      const owned = new Set(Object.keys(manifest.files))
      try {
        const committed = JSON.parse(git(root, 'show', 'HEAD:.siyuan/manifest.json'))
        for (const path of Object.keys(committed.files || {})) if (managedPath(path)) owned.add(path)
      } catch { /* First publication has no committed manifest yet. */ }
      // Removed files are listed by sync; never stage an unowned file merely because it is under a generated directory.
      const allowed = new Set([...owned, ...exported.removed, '.siyuan/manifest.json'])
      if (after.changed.some(path => !allowed.has(path))) throw new Error('同步目录中存在不属于思源清单的文件，已停止发布。')
      const input = Buffer.from(after.changed.join('\0') + '\0')
      execFileSync('git', ['add', '-A', '--pathspec-from-file=-', '--pathspec-file-nul'], { cwd: root, input })
      git(root, 'commit', '-m', 'content: publish SiYuan articles')
    }
    // A failed push can be retried even when sync produces no further changes.
    const pushed = spawnSync('git', ['push', 'origin', `${after.branch}:${after.branch}`], { cwd: root, stdio: 'inherit' })
    if (pushed.error || pushed.status !== 0) throw new Error('GitHub 推送失败。本地提交已保留；检查网络、SSH 和远端分支后重新运行 blog:publish。')
    return { branch: after.branch, documents: exported.documents.length, pushed: true }
  } finally { await lock.close(); await unlink(lockPath) }
}

function gitManifest(root) {
  return readFileSync(resolve(root, '.siyuan/manifest.json'), 'utf8')
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--dry-run')) throw new Error('用法：npm run blog:publish -- [--dry-run]')
  const result = await publish({ dryRun: args.includes('--dry-run') })
  if (result.blocked) console.log(`发布预检：${result.reason}`)
  else if (result.dryRun) console.log(`发布预检：${result.documents} 篇文章，更新 ${result.updated.length} 个文件，移除 ${result.removed.length} 个文件；目标 origin/${result.branch}。未写入文件、提交或推送。`)
  else console.log(`已推送 ${result.branch}。GitHub Actions 将构建并部署静态博客，部署结果请查看仓库 Actions。`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
