# 博客知识库助手

导航中的 AI 图标与 GitHub 相邻，点击打开对话抽屉。窄屏导航保留独立入口。模型固定为 DeepSeek Flash，不提供模型选择。

## 当前链路

```text
GitHub Pages：博客与公开知识库索引
     ↓ 浏览器只发送问题和近期对话
Cloudflare Worker：检查来源、请求格式、每日限额
     ↓ 服务端检索公开索引、携带服务端 Secret
DeepSeek：根据检索资料回答
     ↓ 文本与经过校验的文章来源
博客抽屉：显示回答、引用与文章链接
```

未配置 Worker 地址时，抽屉直接展示本地全文检索摘录，并明确标记为“知识库检索”；不会把摘录伪装成模型回答。没有正文的占位文章只作为目录入口，不能作为回答证据。当前检索为中文分词与关键词召回，不是向量检索。

公开索引由构建产生，地址为 `assistant/knowledge.json`，与正文一同部署。只收录知识库 `notes/` 中可索引的公开文章，跳过草稿、关闭索引/搜索的页面、受保护页面与 README；模型不读取思源本机接口或未发布教程。

## 免费套餐与用量

采用 Workers Free 和 SQLite-backed Durable Object；不需要付费版、独立服务器、向量数据库或自定义域名。Workers 和计数存储有各自的免费额度，超出免费限制会导致服务不可用，不应依赖它们提供无限访问。DeepSeek 的模型 token 费用独立产生。

默认限制：全站每天 50 次有效请求、单个 IP 每天 5 次、两次请求至少间隔 10 秒。使用一个持久化 Durable Object 原子扣减，重启、多实例和并发不会重置额度；每天 UTC 00:00（北京时间 08:00）重置。

模型输出最多 768 tokens，并关闭思考模式。问题最多 600 字符，近期历史最多 6 条、每条 800 字符；只取最多 4 段公开资料，每段最多 1080 字符。失败请求也可能消耗本地调用额度，采用保守计数。请求次数上限不是精确货币预算；建议使用独立低余额的 DeepSeek 账户/凭证，并留意供应商账单。

## 首次启用

1. 注册并登录 Cloudflare 免费账号。在本机终端执行 `npx wrangler login`，完成浏览器授权。
2. 在仓库根目录执行 `npm run ai:deploy`。首次部署会创建名为 `ilovfyu-knowledge-assistant` 的 Worker 和免费版支持的 SQLite 计数对象。未设置 Secret 时接口保持关闭。
3. 在 Cloudflare 控制台打开该 Worker → Settings → Variables and Secrets，以 **Secret** 类型新增：
   - `DEEPSEEK_API_KEY`：你的 DeepSeek API key。
   - `IP_HASH_SECRET`：独立随机字符串，至少 32 个随机字节。只用于对 IP 和日期进行 HMAC，计数不保存原始 IP。
4. 将部署后得到的 `https://ilovfyu-knowledge-assistant.你的子域.workers.dev/chat` 填入 `docs/.vuepress/theme/data/assistant.ts` 的公开地址配置。也可在 GitHub 仓库 Settings → Secrets and variables → Actions → **Variables** 设置 `BLOG_AI_ENDPOINT` 来覆盖这个地址。这里只放公开接口地址，**不要放 DeepSeek key**。
5. 重新运行 `Deploy VuePress site` 工作流。打开博客 AI 抽屉，状态应显示 DeepSeek；在有正文的知识主题上提问，检查回答与来源。

也可在本机用 CLI 交互设置 Secret，输入值不会成为命令历史中的参数：

```bash
npx wrangler secret put DEEPSEEK_API_KEY --config workers/knowledge-assistant/wrangler.jsonc
npx wrangler secret put IP_HASH_SECRET --config workers/knowledge-assistant/wrangler.jsonc
```

API key 不需要提交 GitHub，也不需要配置为 GitHub Actions Secret；页面构建只读取公开的 Worker 地址。重新部署代码会保留 Worker 的既有 Secret。

`/health` 返回 `configured` 状态，不返回密钥。健康检查只代表所需配置存在；DeepSeek 鉴权、余额和实际模型调用仍需真实提问验证。若 `workers.dev` 在目标访问网络不可达，前端会退回笔记摘录；应实际验证当地网络，必要时为 Worker 配置可访问的域名或换托管位置。

## 安全边界

- DeepSeek key 只在 Worker 的 Secret 中，Worker 只向固定的 `https://api.deepseek.com/chat/completions` 发送它；客户端没有 key、Authorization 或自定义上游地址。
- Worker 的模型、提示词、输出长度与索引地址均由服务端控制。请求不能指定模型、system 消息、附件或工具。
- 浏览器对话仅在页面内存中保存，不写 localStorage、sessionStorage 或 cookie。发送时，问题、最多六条近期对话和相关公开笔记会经 Worker 传给 DeepSeek。源码不记录会话、请求头或上游错误体；供应商和托管平台仍有各自的数据处理政策。
- 回答以安全的 Vue 节点显示 Markdown；不执行模型生成的 HTML，不加载其图片，不使用任意模型链接。引用链接来自已校验的知识库路径。
- IP 只以按天 HMAC 后的短期计数标识存入额度对象，不保存聊天正文；Cloudflare 自身处理网络信息不在这段应用代码的控制范围内。
- CORS 仅允许博客来源，但 **Origin 可以被脚本伪造，CORS 不是身份认证**。公开服务仍可能被第三方消耗额度；全站硬限额用于约束最大调用次数，达到上限即停止。高访问量时应增加 Turnstile 或登录验证。
- GitHub Pages 同一 `github.io` 主域下的其他仓库也属于同一 Origin，不能用 CORS 区分路径。更严格隔离需要博客独立域名和相应验证。
- 笔记正文和用户输入都作为不可信资料处理。提示约束降低提示注入影响，不承诺模型永远正确；模型没有工具权限，也无法读取 Worker 的环境变量。

## 开发与检查

```bash
npm run test:assistant
npm run ai:check       # 仅打包和验证配置，不部署、不需要 key
npm run test:knowledge
npm run docs:build
```

本地联调时，将 `workers/knowledge-assistant/.dev.vars.example` 复制为同目录的 `.dev.vars`，在本地填入开发专用 Secret，再运行：

```bash
npm run ai:dev
BLOG_AI_ENDPOINT=http://127.0.0.1:8787/chat npm run docs:dev -- --host 127.0.0.1 --port 8092
```

本地 Worker 默认仍检索线上公开知识索引。`.dev.vars` 与 `.wrangler/` 已忽略；不要把 Secret 放在可提交配置、前端环境变量、查询参数或聊天中。

参考：[Workers 免费额度](https://developers.cloudflare.com/workers/platform/limits/)、[Durable Objects 免费版与 SQLite](https://developers.cloudflare.com/durable-objects/platform/pricing/)、[Worker Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)、[DeepSeek 鉴权](https://api-docs.deepseek.com/api/deepseek-api/)、[DeepSeek 模型与计费](https://api-docs.deepseek.com/quick_start/pricing/)。
