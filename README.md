# ilovfyu-blog

基于 VuePress 2 + vuepress-theme-plume 的个人博客。保留首页、随笔、知识库、项目与关于页，以及亮暗主题、搜索、文章阅读和动态交互。

## 开发与构建

需要 Node.js 22.18 或更高版本。

```bash
npm install
npm run docs:dev
npm run docs:build
```

开发预览按端口隔离临时文件，生产构建使用独立目录，避免同时运行时互相覆盖。

本地保持一个开发预览进程。修改临时目录配置后应停止旧进程并重新启动；Plume 的内存缓存可能在目录切换后漏生成内部数据文件。若出现 `@internal/collectionsData` 导入错误，停止旧预览后执行：

```bash
npm run docs:dev -- --port 8092 --clean-temp --clean-cache
```

## 内容目录

旧文章与 mock 内容已清理。当前保留从思源恢复的 8 个项目、7 个产品展示、2 篇设计文档；另新增 SkillCache 与 RoostAI 两个持续构建项目。专题目录预设微积分、线性代数、概率、MLearn 和数据分析，其中数据分析用于整理 NumPy、pandas、Matplotlib 等库的使用，目前不含文章。可以继续在思源里写作后同步，也可以直接使用 Markdown：

| 类型 | 文件位置 | 展示入口 |
| --- | --- | --- |
| 随笔 | `docs/posts/*.md` | 首页和 `/posts/` |
| 知识笔记 | `docs/notes/*.md`，支持子目录 | `/topics/`，按 `series` 分组 |
| 项目记录 | `docs/projects/*.md` | `/projects/`，首页最多显示三个 |

每个目录的 `README.md` 用作页面入口，不进入内容索引。`draft: true` 或 `index: false` 的文件不进入目录索引；这不代表私密内容，仓库和生成页面仍可能可访问。

文章元信息示例（仅说明格式，不会生成演示文章）：

```yaml
---
title: 文章标题
date: 2026-10-12
category: engineering
description: 一句话摘要
tags: [工程实践]
---
```

随笔分类可用 `ai`、`frontend`、`engineering`、`thinking`。知识笔记按 `docs/notes/专题/一级分组/二级分组/文章.md` 的目录层级自动组织，支持继续嵌套。也可以设置 `series` 与 `group`（如 `基础 / 请求与响应`）覆盖自动分组；`permalink` 可指定稳定链接。正文支持标准 Markdown。

`docs/.vuepress/plugins/blog-content.ts` 在构建及开发时根据实际页面生成目录数据。新增、修改、删除文章时无需手工维护数组。空内容时显示空状态，搜索和随机阅读控件只在存在文章时出现。

## 主题代码

修改代码后运行 `npm run check`，统一执行 Vue/TypeScript 严格类型检查和全部回归测试；发布前再运行 `npm run docs:build`。GitHub Actions 也会执行类型检查、回归测试与构建。类型检查覆盖主题组件、内容插件和 AI Worker，`docs/.vuepress/temp.d.ts` 为构建时生成的数据模块声明接口，无需先启动 VuePress。

- `docs/.vuepress/config.ts`：站点、导航、部署与评论配置。
- `docs/.vuepress/client.ts`：博客页面与全局动态组件。
- `docs/.vuepress/theme/components/`：首页、目录、个人介绍和动态效果。
- 新增专题时，在 `theme/data/topics.ts` 注册独立 `kind`，并在 `TopicCardVisual.vue` 接入贴合专题内容的专属动效。数据分析以 NumPy 数组、pandas 均值表格与 Matplotlib 绘图串联；所有专题均需定制图形和运动过程，具体约定见 [AGENTS.md](./AGENTS.md)。
- `docs/.vuepress/theme/styles/theme.css`：博客主题样式，按基础、布局、阅读、动效分段。
- `docs/.vuepress/public/`：Logo、头像等公共资源。

## 思源写作与发布

已通过思源本机 API 绑定现有笔记本，标题、日期和摘要自动生成，图片与附件一起同步。完整配置和发布步骤见 [SIYUAN-PUBLISHING.md](./SIYUAN-PUBLISHING.md)，项目恢复清单与知识库编辑说明见 [SIYUAN-PROJECTS.md](./SIYUAN-PROJECTS.md)。

```bash
npm run blog:doctor                 # 检查本机思源与笔记本
npm run blog:sync                   # 同步已完成的文章；预览运行时自动更新
npm run blog:preview                # 首次同步并启动预览
npm run blog:publish -- --dry-run    # 发布预检
npm run blog:publish                # 同步、构建、提交文章并推送 GitHub
```

日常发布只处理思源生成的文章与附件，存在其他未提交或已暂存的代码改动时会停止；修改主题后先单独提交代码。

## GitHub Pages

`.github/workflows/deploy.yml` 在推送到 `main` 或 `master` 后构建并部署。仓库已创建，Pages 的 Source 已设为 GitHub Actions。

- [代码仓库](https://github.com/ilovfyu/ilovfyu-blog)
- [博客网站](https://ilovfyu.github.io/ilovfyu-blog/)
- [真实思源演示文章](https://ilovfyu.github.io/ilovfyu-blog/posts/20261012014354-eo3fzz7/)

## AI 知识库助手

导航 GitHub 图标旁的 AI 入口打开对话抽屉，支持公开知识库全文检索与来源引用。AI 回答通过 Cloudflare Workers 免费方案调用 DeepSeek，key 仅保存在 Worker Secret；未接入函数时明确展示本地检索摘录。部署、额度与安全边界见 [AI-ASSISTANT.md](./AI-ASSISTANT.md)。

## 评论

使用 Giscus。启用仓库 Discussions 并安装 Giscus App 后配置：

- Actions Secret `GISCUS_REPO_ID`
- Actions Secret `GISCUS_CATEGORY_ID`
- 可选 Actions Variable `GISCUS_CATEGORY`，默认 `Announcements`

本地开发可参照 `.env.example`。未配置两个 ID 时关闭评论。
