declare module '@temp/blog-content' {
  import type { ContentEntry } from './theme/data/content'
  export const notes: ContentEntry[]
  export const knowledge: ContentEntry[]
  export const projects: ContentEntry[]
}

declare module '@temp/assistant-knowledge' {
  import type { KnowledgeChunk } from './theme/utils/assistant-knowledge'
  export const chunks: KnowledgeChunk[]
}

declare module '@temp/assistant-config' { export const endpoint: string }
