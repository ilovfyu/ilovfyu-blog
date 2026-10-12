# 思源写作与博客发布

## 已对接的链路

```text
思源桌面版写文章
    ↓ blog:sync
笔记本 ID 定位文档 → 导出 Markdown → 自动生成元信息 → 复制图片与附件
    ↓ 浏览器预览
首页 / 随笔 / 知识库 / 项目自动刷新
    ↓ blog:publish
再次同步 → 生产构建 → 提交文章文件 → 推送 origin 的 main/master
    ↓ GitHub Actions
构建静态文件 → GitHub Pages 部署
```

这是单向发布：思源是正文来源。不要直接修改生成的 `docs/*/siyuan/*.md`；脚本发现本地修改会停止并提示，避免覆盖。手工写在其他目录的文章仍可正常使用。

## 1. 本机绑定

当前思源版本为 3.8.6，内核地址为 `http://127.0.0.1:6806`。用户提供的工作空间目录名为 `notebook-ilovfyu`；内核实际返回的笔记本名称是“我的笔记本”，ID 为 `20261012010624-w61rh3f`。绑定保存在 `siyuan.config.json`，笔记本改名不会影响同步。

```bash
npm run blog:doctor
```

这会检查连接并列出笔记本 ID。换工作空间或电脑后，请用输出中的 ID 更新配置。

当前本机接口无需 token 即可访问。若启用了思源 API 鉴权，在项目 `.env` 中设置 `SIYUAN_TOKEN`，地址变化时设置 `SIYUAN_URL`。API token 位于思源设置的鉴权页面；它只由本地脚本使用，不进入网页或 GitHub Actions。不要将 token 提交到 Git。

## 2. 思源里怎样组织文章

当前配置将绑定笔记本作为博客发布源，其中符合下表的文档会导出为公开文章：

| 思源文档位置 | 博客入口 |
| --- | --- |
| 普通根文档、`随笔` 下的文档 | 随笔 |
| `知识库` 下的文档 | 知识库 |
| `项目` 下的文档 | 项目 |
| `草稿` 及其子文档 | 跳过 |

`随笔`、`知识库`、`项目` 本身作为目录文档，不发布目录正文。可以在它们下面继续创建子文档。不建目录也可直接写根文档，默认成为随笔。

文档标题自动成为文章标题，创建日期自动成为发布日期；第一段正文自动生成摘要，文章地址使用稳定文档 ID，改标题不会改 URL。知识库默认系列为“知识笔记”。

思源自带的导出 YAML 和重复一级标题会移除，再生成博客需要的元信息；没有正文的新建空文档会跳过。

需要自定义时，在思源文档属性的自定义页添加以下字段，无需把 YAML 写进正文。属性名必须有 `custom-` 前缀：

| 属性 | 含义 / 示例 |
| --- | --- |
| `custom-blog-status` | `draft` 或 `private`：跳过此文档及其子文档 |
| `custom-blog-title` | 博客标题覆盖 |
| `custom-blog-date` | `2026-10-12` |
| `custom-blog-description` | 目录卡片的摘要 |
| `custom-blog-category` | `ai`、`frontend`、`engineering`、`thinking` |
| `custom-blog-tags` | 标签用逗号分隔，例如 `Vue,工程实践` |
| `custom-blog-series` | 知识库专题（连续的学习系列），例如 `TypeScript` |
| `custom-blog-group` | 知识库分组，例如 `类型系统` |

### 知识库的专题与标签

在思源的「知识库」目录下写笔记，为文档设置 `custom-blog-series`，同名系列会自动汇聚成一张专题卡片；`custom-blog-group` 展示该专题中的章节分组，`custom-blog-tags` 提供可组合的标签筛选。例如：

```text
custom-blog-series = TypeScript
custom-blog-group = 类型系统
custom-blog-tags = TypeScript,类型推导,工程实践
```

发布后，知识库可按专题、多个标签和关键词一起查找；多标签使用交集，同时满足全部已选标签才显示。标签旁的数字表示当前条件下的匹配数量。筛选会保存到网址，刷新、分享链接及浏览器后退都能恢复条件。专题与标签直接由已发布笔记生成，无需另建博客页面。

## 3. 写完后同步和预览

保持思源桌面版打开，执行：

```bash
# 可先查看导出计划，不写文章
npm run blog:sync -- --dry-run

# 同步正文、图片和附件
npm run blog:sync
```

若博客预览已经运行，刷新 `http://127.0.0.1:8092/` 即可看到文章。还没运行预览时，用：

```bash
npm run blog:preview
```

这个命令先同步再启动 8092 预览；保持一个预览进程。后续写完文章再运行 `blog:sync` 即可。同步和发布是手动触发的，不会在写到一半时自动发布。

macOS 也可以双击项目根目录的 `同步思源文章.command`。确认本地预览后，双击 `发布博客.command` 执行同步、构建和推送，不必输入命令。思源内的插件按钮尚未实现；目前快捷入口在项目目录。

生成位置：

- 文章：`docs/posts/siyuan/`、`docs/notes/siyuan/`、`docs/projects/siyuan/`。
- 资源：`docs/.vuepress/public/siyuan/`，按文件内容摘要命名，重复资源复用。
- 清单：`.siyuan/manifest.json`，跟随文章提交，记录脚本拥有的文件和内容摘要。

文档移出发布范围、改为草稿或删除后，下次同步会移除相应的生成文件；只删除同步清单记录的文件。已经部署的页面需再执行发布才会撤下，Git 历史中的旧内容仍然保留。

## 4. 推送并部署

先检查：

```bash
npm run blog:publish -- --dry-run
```

确认本地预览后发布：

```bash
npm run blog:publish
```

它会同步最新正文，按 GitHub Pages 的站点前缀构建，再提交文章和附件并推送当前 `main` 或 `master` 分支。构建失败不会提交或推送；推送失败会保留本地提交，修复 SSH/网络后可重试。远端有新提交时 Git 会拒绝推送，请自行拉取并解决冲突后重试。

现有远端为 `git@github.com:ilovfyu/ilovfyu-blog.git`，发布分支当前为 `master`。SSH 需要具有这个仓库的写权限。仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。完成部署后默认地址为 `https://ilovfyu.github.io/ilovfyu-blog/`；实际部署状态和地址以仓库 Actions / Pages 为准。

仓库 `ilovfyu/ilovfyu-blog` 已创建，Pages 来源已配置为 GitHub Actions。首次主题、清理、同步脚本与工作流随初始化提交发布。以后日常只需 `blog:sync` 预览、`blog:publish` 发布；修改主题代码后请先单独提交代码，文章发布命令会提示未提交代码，不会混入现有暂存内容。

GitHub Actions 只读取仓库里的 Markdown 与资源，无需连接你的本机思源，也无需配置思源 token。推送成功不等于部署成功，请在仓库 Actions 查看结果。

工作流会读取 Pages 实际域名和路径前缀，生成正确的资源路径与 sitemap/canonical 地址。默认使用仓库子路径；如在 Pages 中配置自定义域名，云端构建会使用对应地址。本地生产构建需要模拟自定义地址时，可设置 `SITE_HOSTNAME` 和 `PAGES_BASE_PATH`。

## 5. 内容兼容边界

标准 Markdown 正文、列表、代码块、表格、图片、附件可通过导出后同步。脚本按 Markdown 语法树处理链接，代码示例中的 `assets/...` 不会被改写；HTML 的 `src`、`href`、`poster` 附件地址也会处理。

思源文档链接可以转换为已发布文章链接；指向文章内部块的链接目前定位到文章页。引用未发布文档、残留思源专有 URL 或本机文件 URL 时会停止同步并指出文档 ID，请改为文字、公开链接或让引用目标进入发布范围。思源导出结果受思源的引用导出设置影响，请在预览中确认引用内容。

数据库视图、挂件、嵌入查询和思源插件交互不会自动成为静态博客组件。需要展示时先在思源中整理为普通正文或截图；图片应使用思源管理的附件。直接写入 HTML 的 `srcset`、CSS 外部资源和特殊插件资源当前不在同步范围内。

本地接口与导出能力依据[思源官方 API 文档](https://github.com/siyuan-note/siyuan/blob/master/docs/API.zh-CN.md)，部署依据[GitHub Pages 自定义工作流文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 6. 直接体验演示

思源中已经创建真实文档：**随笔 → 博客发布流程演示**，文档 ID 为 `20261012014354-eo3fzz7`。

- 本地文章：`http://127.0.0.1:8092/posts/20261012014354-eo3fzz7/`。
- 在线文章：[博客发布流程演示](https://ilovfyu.github.io/ilovfyu-blog/posts/20261012014354-eo3fzz7/)。
- 部署进度：[GitHub Actions](https://github.com/ilovfyu/ilovfyu-blog/actions)。

体验一次更新：

1. 在思源这篇文档里修改一段正文。
2. 双击项目里的 `同步思源文章.command`，查看本地预览。
3. 双击 `发布博客.command`，等 Actions 变绿后刷新在线文章。

不需要进入 GitHub 手动上传文章，也不需要重新配置 Pages。熟悉后可删除思源里的这篇演示文章，再发布一次从网站撤下。

## 7. 项目与知识库演示

已恢复旧项目资料到思源「项目」目录，知识库「博客使用手册」包含三篇演示笔记。编辑位置、展示表格格式及完整文档清单见 [SIYUAN-PROJECTS.md](./SIYUAN-PROJECTS.md)。
