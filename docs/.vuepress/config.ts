import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'

const giscusRepoId = process.env.GISCUS_REPO_ID
const giscusCategoryId = process.env.GISCUS_CATEGORY_ID
const tagfinderUrl = process.env.VITE_TAGFINDER_URL?.trim() || 'http://localhost:5173'
const moyinUrl = process.env.VITE_MOYIN_URL?.trim() || 'http://localhost:5174'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'ILOVFYU',
  description: '记录 AI、前端、系统架构与开发实践的个人技术博客。',
  base: process.env.DEPLOY_ENV === 'gh-pages' ? '/ilovfyu-blog/' : '/',
  bundler: viteBundler(),
  plugins: [
    {
      name: 'article-page-class',
      extendsPage(page) {
        if (/^\/posts\/[^/]+\/$/.test(page.path)) {
          const currentClass = typeof page.frontmatter.pageClass === 'string' ? page.frontmatter.pageClass : ''
          page.frontmatter.pageClass = [...new Set([...currentClass.split(/\s+/), 'article-page'].filter(Boolean))].join(' ')
        }
      },
    },
    {
      name: 'math-note-page-class',
      extendsPage(page) {
        if (/^\/specials\/math\/notes\//.test(page.path)) {
          const currentClass = typeof page.frontmatter.pageClass === 'string' ? page.frontmatter.pageClass : ''
          page.frontmatter.pageClass = [...new Set([...currentClass.split(/\s+/), 'math-note-page'].filter(Boolean))].join(' ')
        }
      },
    },
    {
      name: 'project-home-page',
      extendsPage(page) {
        if (!/^\/projects\/[^/]+\/$/.test(page.path)) return
        const fm = page.frontmatter as Record<string, unknown>
        const currentClass = typeof fm.pageClass === 'string' ? fm.pageClass : ''
        fm.pageClass = [...new Set([...currentClass.split(/\s+/), 'project-home-page'].filter(Boolean))].join(' ')

        fm.projectStatus = fm.status ?? '计划中'
        fm.projectCategory = fm.category ?? ''
        fm.projectSummary = fm.summary ?? ''
        fm.projectLinks = fm.links ?? []
        fm.projectStack = fm.stack ?? []
        fm.projectProgress = fm.progress ?? []

        if (fm.layout === 'hero') {
          fm.homePage = true
        }
      },
    },
  ],
  theme: plumeTheme({
    logo: '/logo.svg',
    hostname: 'https://ilovfyu.dev',
    appearance: true,
    navbar: [
      {
        text: '项目链接',
        items: [
          { text: 'SRE 智能运维平台', link: '/sre/' },
          { text: '中转站', link: '/relay/' },
          { text: '标注工具平台', link: tagfinderUrl },
          { text: '愈语', link: '/yuliao/' },
          { text: '弈机', link: '/yiji/' },
          { text: '墨影', link: moyinUrl },
        ],
      },
      { text: '首页', link: '/' },
      {
        text: '项目',
        items: [
          {
            text: 'AI 系统',
            items: [
              { text: 'RAG 知识库', link: '/projects/rag-knowledge-base/' },
              { text: '多 Agent 管理平台', link: '/projects/multi-agent-platform/' },
              { text: 'SRE 智能运维平台', link: '/projects/sre-platform/' },
              { text: '模型微调训练', link: '/projects/model-fine-tuning/' },
              { text: '知识问答工作流', link: '/projects/qa-workflow/' },
              { text: 'AIRec', link: '/projects/airec/' },
            ],
          },
          {
            text: '多模态与智能应用',
            items: [
              { text: '数字人', link: '/projects/digital-human/' },
              { text: 'AI 影视漫剧', link: '/projects/ai-media/' },
              { text: 'AI 游戏互动', link: '/projects/ai-game/' },
              { text: '具身智能', link: '/projects/embodied-ai/' },
              { text: '自动驾驶', link: '/projects/autonomous-driving/' },
              { text: '模型客流量去重', link: '/projects/traffic-deduplication/' },
            ],
          },
          {
            text: '平台与服务',
            items: [
              { text: '量化交易平台', link: '/projects/quant-trading/' },
              { text: '应用管理平台', link: '/projects/app-platform/' },
              { text: '标注工具平台', link: '/projects/annotation-tool-platform/' },
              { text: '中转站', link: '/projects/relay-service/' },
            ],
          },
          {
            text: 'C端服务',
            items: [
              { text: '虾壳', link: '/projects/xiake/' },
              { text: '愈语', link: '/projects/yuliao/' },
              { text: '弈机', link: '/projects/yiji/' },
              { text: '墨影', link: '/projects/moyin/' },
            ],
          },
        ],
      },
      { text: '虾壳', link: '/xiake/' },
      { text: '知识库', link: '/topics/' },
      {
        text: '专题',
        items: [
          { text: '专题总览', link: '/specials/' },
          { text: '数学基础', link: '/specials/math/' },
          { text: '算法', link: '/specials/algorithm/' },
          { text: 'OS', link: '/specials/os/' },
          { text: '网络', link: '/specials/network/' },
        ],
      },
      { text: '随笔', link: '/posts/' },
      { text: '关于博主', link: '/about/' },
    ],
    profile: {
      name: 'ILOVFYU',
      description: 'Code / Systems / Architecture / Intelligence',
      avatar: '/avatar.svg',
      circle: true,
    },
    footer: { message: 'CODE · SYSTEMS · ARCHITECTURE · ESSAYS', copyright: 'Copyright © 2026 ILOVFYU' },
    comment: giscusRepoId && giscusCategoryId ? {
      provider: 'Giscus',
      repo: 'ilovfyu/ilovfyu-blog',
      repoId: giscusRepoId,
      category: process.env.GISCUS_CATEGORY || 'Announcements',
      categoryId: giscusCategoryId,
      mapping: 'pathname',
      strict: true,
      reactionsEnabled: true,
      inputPosition: 'top',
      darkTheme: 'transparent_dark',
      lightTheme: 'transparent_dark',
      lazyLoading: true,
    } : false,
  }),
})
