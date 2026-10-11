import { notes as postEntries, knowledge as knowledgeEntries, projects as projectEntries } from '@temp/blog-content'

export type Category = 'all' | 'ai' | 'frontend' | 'engineering' | 'thinking'
export type ContentEntry = {
  category: Exclude<Category, 'all'>
  label: string
  date: string
  title: string
  summary: string
  path: string
  tags: string[]
  series: string
  group: string
  project?: ProjectMeta | null
}

export type ProjectMeta = {
  code: string; view: 'record' | 'showcase'; order: number; tone: string; label: string
  status: string; category: string; summary: string; stack: string[]; headline: string[]; intro: string
  showcase: string; record: string
  features: Array<{ icon: string; title: string; desc: string; tag: string }>
  flow: Array<{ code: string; title: string; desc: string }>
  platforms: Array<{ name: string; note: string }>
  progress: Array<{ label: string; value: string }>
  landing: Record<string, any>
}

export const notes: ContentEntry[] = postEntries
export const knowledge: ContentEntry[] = knowledgeEntries
export const projects: ContentEntry[] = projectEntries
