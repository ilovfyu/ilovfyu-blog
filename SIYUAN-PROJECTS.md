# 在思源维护项目和知识库

## 本次恢复范围

从清理前提交 `d21a07f` 的资料恢复到当前思源笔记本「项目」下：14 个项目记录、7 个产品展示、2 篇墨影设计文档、1 篇项目总览，共 24 份文档。旧正文中的 Obsidian、认证接口等描述作为历史设计资料保留；当前发布来源是思源。

项目记录保留原有正文、章节、表格与代码示例。链接已转换为当前思源文档，再由同步脚本生成博客链接。墨影、虾壳、愈语、弈机已归入「计划与构建记录」，保留产品展示入口；七个产品页继续使用历史模板与 CSS。虾壳认证区域、游戏下载区域为静态展示；入口指向对应项目记录。

## 在思源里编辑

- 「项目 / 墨影」等根文档：编辑项目定位、当前记录、系统边界、设计文档链接。
- 「项目 / 墨影 / 产品展示」等子文档：修改展示标题、简介与表格。
- 「项目 / 墨影 / 教学视频板书实现方案」等：编辑设计文档正文。
- 「知识库 / 数据分析」：空专题目录，后续用于整理 NumPy、pandas、Matplotlib 等库的使用笔记。

### 产品展示模板

保留 `展示标题`、`简介`、`核心能力`、`工作流`、`支持平台` 等章节名称和表格列顺序，直接编辑文字与单元格即可。SRE、中转站的首屏与控制台内容由 `展示配置`、`统计`、`控制台`、`交付标准` 表格提供。

| 章节 | 表格列 |
| --- | --- |
| 核心能力 | 图标、能力、说明、标识 |
| 工作流 | 编号、步骤、说明 |
| 支持平台 | 平台、说明 |
| 项目进度 | 进度、记录 |
| 展示配置 | 配置项、内容 |
| 统计 | 数值、标签、说明 |
| 控制台 | 标签、值、状态、颜色 |
| 交付标准 | 编号、标题、说明 |

产品模板的设备模型、装饰性界面和动画在博客代码中维护。

### 文档自定义属性

| 属性 | 用途 |
| --- | --- |
| custom-blog-description | 目录卡片摘要 |
| custom-blog-project-code | 模板代码：moyin、xiake、yuliao、yiji、sre-platform、relay-service、annotation-tool-platform；普通项目使用自己的代码 |
| custom-blog-project-view | record 为项目记录，showcase 为产品展示 |
| custom-blog-project-group | 持续构建进入首页及项目页主展示；已完成作品进入完成作品展区；其他项目进入计划与构建记录 |
| custom-blog-project-order | 项目顺序 |
| custom-blog-project-tone | cyan、violet、rose、amber |
| custom-blog-project-label | 卡片分类 |
| custom-blog-project-status | 项目状态 |
| custom-blog-project-category | 项目类型 |
| custom-blog-project-summary | 详情页介绍 |
| custom-blog-project-stack | 技术栈，逗号分隔 |
| custom-blog-project-showcase | 对应产品展示的思源文档 ID |
| custom-blog-project-record | 对应项目记录的思源文档 ID |
| custom-blog-index | false 表示不进入目录列表；页面仍发布 |
| custom-blog-series / custom-blog-group | 旧属性不再覆盖思源目录；专题与分组按知识库中的实际层级同步 |

项目记录进入项目目录，产品展示、总览和设计子文档不额外成为项目卡片。当前目录含 16 个项目，其中 PromptLSM 与 RoostAI 属于「持续构建」，标注工具平台属于「已完成作品」。未完成文档放入「草稿」，或设置 custom-blog-status 为 draft。

「持续构建」文档放在思源「项目 / 持续构建」下，并设置 `custom-blog-project-group` 为 `持续构建`。该属性决定博客中的独立分组；`custom-blog-project-status` 描述项目当前阶段，二者可以分别编辑。

标注工具平台设置 `custom-blog-project-group` 为 `已完成作品`，`custom-blog-project-status` 为 `已完成`；保留产品展示关联。完成作品使用与持续构建统一的动态卡片，并提供产品展示与项目记录入口。

首页和项目页优先展示 PromptLSM 与 RoostAI。动态封面使用三维投影场景：悬浮缓存矩阵、智能体轨道网络和标注扫描面板，并支持鼠标视角偏移。这些是项目概念示意，不代表性能数据；动效默认播放，离开可见区域或开启系统减少动态效果后停止，无暂停按钮。

## 同步与发布

保持思源打开。双击「同步思源文章.command」进行本地预览，确认后双击「发布博客.command」。也可以执行：

```bash
npm run blog:sync
npm run blog:publish
```

## 原项目文档位置

| 思源路径 | 在线文档 |
| --- | --- |
| /项目/项目总览 | [20261012015817-1v5swr7](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015817-1v5swr7/) |
| /项目/AIRec | [20261012015818-c0wqxhs](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015818-c0wqxhs/) |
| /项目/标注工具平台 | [20261012015819-3osv6ek](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015819-3osv6ek/) |
| /项目/具身智能 | [20261012015820-reo2emp](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015820-reo2emp/) |
| /项目/模型微调训练 | [20261012015820-0gg27yz](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015820-0gg27yz/) |
| /项目/墨影 | [20261012015821-9p3tnvg](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015821-9p3tnvg/) |
| /项目/多 Agent 管理平台 | [20261012015821-wbtapd5](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015821-wbtapd5/) |
| /项目/知识问答工作流 | [20261012015821-jzncqz7](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015821-jzncqz7/) |
| /项目/RAG 知识库 | [20261012015822-yy8ulzm](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015822-yy8ulzm/) |
| /项目/中转站 | [20261012015822-5qrrote](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015822-5qrrote/) |
| /项目/SRE 智能运维平台 | [20261012015823-jg6kbfq](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015823-jg6kbfq/) |
| /项目/模型客流量去重 | [20261012015823-x5kyp11](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015823-x5kyp11/) |
| /项目/虾壳 | [20261012015823-ayjnw2i](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015823-ayjnw2i/) |
| /项目/弈机 | [20261012015824-5gfhvr3](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015824-5gfhvr3/) |
| /项目/愈语 | [20261012015824-e453njb](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015824-e453njb/) |
| /项目/墨影/教学视频板书实现方案 | [20261012015824-0jxktu6](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015824-0jxktu6/) |
| /项目/墨影/基于 Obsidian 的多模态教学视频生成方案 | [20261012015825-nt5xkwm](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015825-nt5xkwm/) |
| /项目/墨影/产品展示 | [20261012015825-1svwixq](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015825-1svwixq/) |
| /项目/虾壳/产品展示 | [20261012015825-v1dk33g](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015825-v1dk33g/) |
| /项目/愈语/产品展示 | [20261012015826-z7tunv2](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015826-z7tunv2/) |
| /项目/弈机/产品展示 | [20261012015826-o15oo2o](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012015826-o15oo2o/) |
| /项目/SRE 智能运维平台/产品展示 | [20261012020110-swalusw](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012020110-swalusw/) |
| /项目/中转站/产品展示 | [20261012020110-bpeor4a](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012020110-bpeor4a/) |
| /项目/标注工具平台/产品展示 | [20261012020110-1qune8h](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012020110-1qune8h/) |

## 持续构建项目

- [PromptLSM](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012035206-0mcg3um/)
- [RoostAI](https://ilovfyu.github.io/ilovfyu-blog/projects/20261012035207-l8xx3ew/)

## 知识库专题

博客专题目录预设微积分、线性代数、概率、MLearn 和数据分析。数据分析在思源中对应「知识库 / 数据分析」，目前仅创建空目录，尚无文章。空专题由 `docs/.vuepress/theme/data/topics.ts` 配置显示；思源中的空文档不会导出为文章。
