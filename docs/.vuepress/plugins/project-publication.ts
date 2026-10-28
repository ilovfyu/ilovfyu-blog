import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** One explicit list controls both SiYuan export and VuePress page discovery. */
export function projectPagePatterns() {
  const config = JSON.parse(readFileSync(resolve('siyuan.config.json'), 'utf8'))
  const ids = config.projectDocumentIds ?? []
  const manual = config.projectManualFiles ?? []
  if (!Array.isArray(ids) || !ids.every((id: unknown) => typeof id === 'string' && /^\d{14}-[a-z0-9]{7}$/.test(id))
    || !Array.isArray(manual) || !manual.every((file: unknown) => typeof file === 'string' && /^[a-z0-9-]+\.md$/.test(file))) throw new Error('项目发布名单格式不正确。')
  const allowed = ['README.md', ...manual, ...ids.map((id: string) => `siyuan/${id}.md`)]
  return allowed.map(file => `projects/${file}`)
}
