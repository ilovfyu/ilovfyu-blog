/** Normalize editorial directory segments; this metadata never changes article URLs. */
export function knowledgePath(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.flatMap(item => typeof item === 'string' ? item.split(/[\\/]/) : [])
    .map(part => part.trim()).filter(part => part && part !== '.' && part !== '..')
}

export function knowledgeStructure(directories: string[], series?: unknown, group?: unknown, fallback = '未分类', insideSeries = false) {
  const folders = knowledgePath(directories)
  const explicitSeries = typeof series === 'string' ? series.trim() : ''
  const name = explicitSeries || folders[0] || fallback
  const explicitGroup = knowledgePath(group)
  const groupPath = explicitGroup.length ? explicitGroup
    : insideSeries || explicitSeries && folders[0] !== explicitSeries ? folders : folders.slice(1)
  return { series: name, group: groupPath.join(' / '), groupPath }
}
