import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'
import { blogContentPlugin } from './plugins/blog-content'
import { siteFeatures } from './theme/data/features'
import { projectPagePatterns } from './plugins/project-publication'
import { resolve } from 'node:path'

// Public repository/category identifiers, not credentials. Environment overrides remain optional.
const giscusRepoId = process.env.GISCUS_REPO_ID || 'R_kgDOVFFAaA'
const giscusCategoryId = process.env.GISCUS_CATEGORY_ID || 'DIC_kwDOVFFAaM4DJ1NM'
const portOption = process.argv.findIndex(argument => argument === '--port' || argument === '-p')
const devPort = process.argv.find(argument => argument.startsWith('--port='))?.slice('--port='.length)
  || (portOption >= 0 ? process.argv[portOption + 1] : '8080')
const runtimeDirectory = process.env.NODE_ENV === 'production' ? 'build' : `dev-${devPort}`
const pagesBasePath = process.env.PAGES_BASE_PATH
const normalizedPagesBase = pagesBasePath?.replace(/^\/+|\/+$/g, '')
const siteBase: '/' | `/${string}/` = normalizedPagesBase !== undefined
  ? normalizedPagesBase ? `/${normalizedPagesBase}/` : '/'
  : process.env.DEPLOY_ENV === 'gh-pages' ? '/ilovfyu-blog/' : '/'

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'ILOVFYU',
  description: '记录 AI、前端、系统架构与开发实践的个人技术博客。',
  base: siteBase,
  alias: {
    '@theme/VPSocialLinks.vue': resolve('docs/.vuepress/theme/components/BlogSocialLinks.vue'),
    '@theme/VPComment.vue': resolve('docs/.vuepress/theme/components/ArticleComments.vue'),
  },
  pagePatterns: ['*.md', '!(projects)/**/*.md', '!.vuepress', ...projectPagePatterns(), ...(siteFeatures.about ? [] : ['!about/**'])],
  bundler: viteBundler({
    // Absolute public URLs already include the deployment base; keep them out of Vue asset imports.
    vuePluginOptions: { template: { transformAssetUrls: { includeAbsolute: false } } },
  }),
  temp: resolve('docs/.vuepress/.temp', runtimeDirectory),
  cache: resolve('docs/.vuepress/.cache', runtimeDirectory),
  // Keep public asset URLs valid when deployed under a subpath.
  markdown: {
    assets: { absolutePathPrependBase: true },
  },
  plugins: [
    blogContentPlugin(),
    {
      name: 'article-page-class',
      extendsPage(page) {
        if (page.frontmatter.pageLayout === 'home') {
          const classes = String(page.frontmatter.pageClass || '').split(/\s+/).filter(Boolean)
          classes.push('blog-custom-page')
          page.frontmatter.pageClass = [...new Set(classes)].join(' ')
        }
        if (/^(posts|notes|projects)\//.test(page.filePathRelative || '') && page.frontmatter.pageLayout !== 'home') {
          const currentClass = typeof page.frontmatter.pageClass === 'string' ? page.frontmatter.pageClass : ''
          page.frontmatter.pageClass = [...new Set([...currentClass.split(/\s+/), 'article-page'].filter(Boolean))].join(' ')
        }
      },
    },
  ],
  theme: plumeTheme({
    logo: '/logo.svg',
    hostname: process.env.SITE_HOSTNAME || (process.env.DEPLOY_ENV === 'gh-pages' ? 'https://ilovfyu.github.io' : 'https://ilovfyu.dev'),
    appearance: true,
    social: [
      { icon: 'github', link: 'https://github.com/ilovfyu' },
      { icon: 'email', link: 'mailto:hello@ilovfyu.dev' },
    ],
    navbar: [
      { text: '首页', link: '/' },
      { text: '随笔', link: '/posts/' },
      { text: '知识库', link: '/knowledge/', activeMatch: '^/(knowledge|notes)/' },
      { text: '专题', link: '/topics/', activeMatch: '^/topics/' },
      { text: '项目', link: '/projects/', activeMatch: '^/projects/' },
      ...(siteFeatures.about ? [{ text: '关于', link: '/about/' }] : []),
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
      lightTheme: 'light',
      lazyLoading: true,
    } : false,
  }),
})
