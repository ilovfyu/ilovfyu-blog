# 文章评论

评论采用 Giscus，连接公开仓库 `ilovfyu/ilovfyu-blog` 的 Announcements 分类。仓库已启用 Discussions，giscus GitHub App 仅获准访问这个仓库的元数据和 Discussions，不授予源码写入权限。

文章底部提供讨论区，支持 GitHub 登录、Markdown、代码片段及表情回应。评论按稳定的页面 pathname 严格匹配，改标题不会创建新讨论；首次评论时由 giscus 创建对应 Discussion。产品展示页、目录页以及 `comments: false` 的文章不显示评论。主题自带的加密解锁判断继续生效。

仓库 ID 和分类 ID 是公开配置，保存在 `docs/.vuepress/config.ts`，也可通过 `GISCUS_REPO_ID`、`GISCUS_CATEGORY_ID` 与 `GISCUS_CATEGORY` 覆盖；不需要 API key 或数据库。`giscus.json` 限定线上来源。评论组件延迟加载并跟随博客明暗主题；网络未能加载时，提供 GitHub Discussions 入口。

维护者可以在 [Discussions](https://github.com/ilovfyu/ilovfyu-blog/discussions) 管理评论。修改站点域名或仓库时同步更新上述配置。开发预览不在生产来源名单中；线上发布后验证真实评论框。

参考：[Giscus 官方说明](https://giscus.app/zh-CN)、[来源限制与严格匹配](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md)。
