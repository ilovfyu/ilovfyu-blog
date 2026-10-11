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
}

export const notes: ContentEntry[] = postEntries
export const knowledge: ContentEntry[] = knowledgeEntries
export const projects: ContentEntry[] = projectEntries
