/** Keep repository links outside SiYuan snapshots so the next export preserves them. */
const repositories: Readonly<Record<string, string>> = {
  promptlsm: 'https://github.com/ilovfyu/SkillCache',
  roostai: 'https://github.com/RoostBase/RoostAI',
  wyvern: 'https://github.com/ilovfyu/Wyvern',
}

export function projectRepository(project?: { code: string; repository?: string } | null) {
  return project?.repository || repositories[project?.code || '']
}
