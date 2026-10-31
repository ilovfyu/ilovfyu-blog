/** Small deterministic keys keep manual paths and nested directory anchors bounded. */
function shortKey(value: string): string {
  let hash = 0xcbf29ce484222325n
  for (const char of value) hash = BigInt.asUintN(64, (hash ^ BigInt(char.codePointAt(0)!)) * 0x100000001b3n)
  return hash.toString(36)
}

const label = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28).replace(/-$/, '')

/** SiYuan IDs already identify articles; encoding their entire path adds no identity. */
export function knowledgeNoteId(path: string): string {
  const documentId = /^\/notes\/(\d{14}-[a-z0-9]{7})\/$/.exec(path)?.[1]
  if (documentId) return `note-${documentId}`
  const name = label(path.split('/').filter(Boolean).at(-1) || '')
  return `note-${name ? `${name}-` : ''}${shortKey(path)}`
}

/** Hash the full path so same-named folders in different branches remain distinct. */
export function knowledgeChapterId(path: string[]): string {
  if (!path.length) return 'topic-ungrouped'
  const name = label(path.at(-1)!)
  return `group-${name ? `${name}-` : ''}${shortKey(JSON.stringify(path))}`
}

function decodeLegacy(value: string): string | null {
  if (value.length > 8192 || !/^[0-9a-f]{1,6}(?:-[0-9a-f]{1,6})*$/i.test(value)) return null
  const points = value.split('-').map(part => Number.parseInt(part, 16))
  if (points.some(point => point > 0x10ffff || point >= 0xd800 && point <= 0xdfff)) return null
  return String.fromCodePoint(...points)
}

/** Old shared links keep working and are replaced with the current short anchor. */
export function resolveTopicAnchor(hash: string): string {
  let id: string
  try { id = decodeURIComponent(hash.replace(/^#/, '')) } catch { return '' }
  if (id.startsWith('topic-note-')) {
    const path = decodeLegacy(id.slice('topic-note-'.length))
    return path?.startsWith('/') ? knowledgeNoteId(path) : id
  }
  if (id.startsWith('topic-group-') && id.length <= 8192) {
    const path = id.slice('topic-group-'.length).split('--').map(decodeLegacy)
    if (path.every((part): part is string => part !== null)) return knowledgeChapterId(path)
  }
  return id
}
