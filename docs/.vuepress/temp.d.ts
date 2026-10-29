// Contracts for modules written by blog-contentPlugin; no build is needed to check types.
declare module '@temp/blog-content' {
  export const notes: import('./theme/data/content').ContentEntry[]
  export const knowledge: import('./theme/data/content').ContentEntry[]
  export const projects: import('./theme/data/content').ContentEntry[]
}

declare module '@temp/assistant-knowledge' {
  export const chunks: import('./theme/utils/assistant-knowledge').KnowledgeChunk[]
}

declare module '@temp/assistant-config' {
  export const endpoint: string
}
