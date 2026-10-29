import { notes as postEntries, knowledge as knowledgeEntries, projects as projectEntries } from '@temp/blog-content'

export type Category = 'all' | 'ai' | 'frontend' | 'engineering' | 'thinking'
export type ContentEntry = {
  category: Exclude<Category, 'all'>
  label: string
  date: string
  title: string
  summary: string
  preview?: { heading: string; paragraphs: string[] }
  path: string
  tags: string[]
  series: string
  group: string
  groupPath?: string[]
  project?: ProjectMeta | null
}

export type ProjectMeta = {
  code: string; view: 'record' | 'showcase'; order: number; tone: string; label: string
  status: string; category: string; summary: string; stack: string[]; headline: string[]; intro: string
  showcase: string; record: string
  repository?: string
  group?: string
  features: Array<{ icon: string; title: string; desc: string; tag: string }>
  flow: Array<{ code: string; title: string; desc: string }>
  platforms: Array<{ name: string; note: string }>
  progress: Array<{ label: string; value: string }>
  landing: ProjectLanding
}

export const notes: ContentEntry[] = postEntries
export const knowledge: ContentEntry[] = knowledgeEntries
export const projects: ContentEntry[] = projectEntries

/** Structured SiYuan tables plus optional text fields from 展示配置. */
export type ProjectLanding = {
  kind?: string
  name?: string
  eyebrow?: string
  title?: string
  accentTitle?: string
  description?: string
  docsLabel?: string
  consoleTitle?: string
  consoleSubtitle?: string
  consoleFooter?: string
  consoleMetric?: string
  consoleMetricLabel?: string
  standardEyebrow?: string
  standardTitle?: string
  standardDescription?: string
  footerLabel?: string
  stats: Array<{ value: string; label: string; note: string }>
  consoleRows: Array<{ label: string; value: string; state: string; tone: string }>
  standards: Array<{ code: string; title: string; description: string; desc: string }>
}
