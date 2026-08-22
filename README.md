# ilovfyu-blog

基于 VuePress 2 + [vuepress-theme-plume](https://theme-plume.vuejs.press/) 的个人博客。

## 开发

```bash
npm install
npm run docs:dev
```

## 构建

```bash
npm run docs:build
```

## GitHub Pages

项目已配置 `.github/workflows/deploy.yml`。将代码推送到 `main` 或 `master` 后，GitHub Actions 会自动构建并部署。

首次部署前，请在仓库 `Settings → Pages → Build and deployment` 中将 `Source` 设置为 `GitHub Actions`。

文章位于 `docs/posts/`，后续可以将 Obsidian 笔记同步到该目录，再由 VuePress 构建发布。

## 评论

文章评论使用 Giscus。仓库启用 Discussions 并安装 Giscus App 后，在 GitHub 仓库中配置：

- Actions Secret `GISCUS_REPO_ID`
- Actions Secret `GISCUS_CATEGORY_ID`
- 可选 Actions Variable `GISCUS_CATEGORY`，默认使用 `Announcements`

本地开发可以复制 `.env.example` 中的变量。两个 ID 未配置时评论插件会安全关闭，不影响构建。

## AI 聊天

`/xiake/` 是多 Agent 协同平台的登录主页。GitHub、手机号、邮箱登录与注册请求通过 `VITE_XIAKE_AUTH_BASE_URL` 发送到独立的认证服务，成功后跳转到 `VITE_XIAKE_POST_LOGIN_URL`。OAuth Client Secret 和会话 Secret 不应放在本仓库或前端环境变量中。FastAPI 认证接口、Cookie、CSRF、限流和防攻击要求见 [`docs/projects/relay-service.md`](docs/projects/relay-service.md)。

GitHub Pages 部署时，在 Actions Variables 中配置：

- `XIAKE_AUTH_BASE_URL`
- `XIAKE_POST_LOGIN_URL`
- `TAGFINDER_URL`（标注工具平台入口地址，默认 `http://localhost:5173`）

这些值是公开的 FastAPI 路由或登录后跳转地址，不是密钥。认证基址建议设置为 `https://api.ilovfyu.dev/api/xiake/auth`，`XIAKE_POST_LOGIN_URL` 设置为多 Agent 协同平台的真实访问地址。
