# 在思源维护项目和知识库

## 当前项目目录

项目页分为三组，首页同步展示「持续构建」项目：

三组项目统一使用动态卡片：桌面端每张占半行，手机端单列。计划与构建记录也使用同一套封面、状态标记与交互效果；模型微调训练的专属图形展示样本、参数、损失与梯度回传，标记为「计划中」，并与详情页共用。

| 分组 | 项目 | 记录地址 |
| --- | --- | --- |
| 持续构建 | PromptLSM（原 SkillCache） | `/projects/20261012035206-0mcg3um/` |
| 持续构建 | RoostAI | `/projects/20261012035207-l8xx3ew/` |
| 持续构建 | Wyvern | `/projects/wyvern/` |
| 已完成作品 | 标注工具平台 | `/projects/20261012015819-3osv6ek/` |
| 计划与构建记录 | 模型微调训练 | `/projects/20261012015820-0gg27yz/` |

2026-10-27 整理后，计划区只保留模型微调训练。墨影、虾壳、愈语、弈机、中转站、SRE 及其展示页、设计文档和旧项目总览已移入 `archive/projects/2026-10-27/`，不再参与站点构建。原稿仍可追溯，归档中的历史链接不作为当前站点导航。

`siyuan.config.json` 的 `excludePaths` 已加入对应思源目录，后续同步也会跳过这些项目及其子文档。`.siyuan/manifest.json` 同步移除了归档文件的托管记录。

## Wyvern 的维护方式

Wyvern 定位为 **δ-mem 的完整实现与算子工具库**，当前由本地 `docs/projects/wyvern.md` 维护，不属于思源同步托管文件，同步不会覆盖它。项目记录先明确输入投影、δ 规则写入、记忆读出、注意力修正以及验证工具的边界；API、支持后端和性能数据随实现验证补充。

`WyvernProjectVisual.vue` 为项目提供专属的「输入 → 状态矩阵写入 → 记忆读出 → 注意力修正」动态图，首页卡片、项目目录卡片和详情页首屏共用。动效复用 `useSceneMotion`：只在可见、前台且未启用系统减少动态效果时运行动画，其他状态保留完整静态图。

## 在思源里编辑

其余项目仍由思源「项目」下的记录文档维护。项目子文档可用于补充设计过程，展示页通过自定义属性关联。只有带项目元数据的记录才能成为项目目录卡片；空目录、总览和设计子文档不额外成为项目。

| 属性 | 用途 |
| --- | --- |
| custom-blog-description | 目录卡片摘要 |
| custom-blog-project-code | 项目标识，例如 promptlsm、roostai、annotation-tool-platform、model-fine-tuning |
| custom-blog-project-view | record 为项目记录，showcase 为产品展示 |
| custom-blog-project-group | 持续构建、已完成作品或计划与构建记录 |
| custom-blog-project-order | 项目顺序 |
| custom-blog-project-tone | cyan、violet、rose、amber |
| custom-blog-project-label | 卡片分类 |
| custom-blog-project-status | 项目当前阶段 |
| custom-blog-project-category | 项目类型 |
| custom-blog-project-summary | 详情页介绍 |
| custom-blog-project-stack | 技术栈，逗号分隔 |
| custom-blog-project-showcase | 对应展示页的思源文档 ID |
| custom-blog-project-record | 对应记录页的思源文档 ID |
| custom-blog-index | false 表示不进入目录列表；页面仍发布 |

`custom-blog-project-group` 决定展示分组，`custom-blog-project-status` 描述当前阶段。标注工具平台使用「已完成作品」与「已完成」，并保留产品展示关联。未完成的私人文档放入「草稿」，或设置 `custom-blog-status` 为 `draft`。

### 产品展示内容

标注工具平台的产品展示继续使用 `展示标题`、`简介`、`核心能力`、`工作流`、`统计`、`交付标准` 等章节和原表格列顺序。展示模板的设备模型、装饰界面和动画在博客代码中维护。

## 同步与发布

保持思源打开。双击「同步思源文章.command」进行本地预览，确认后双击「发布博客.command」，或执行：

```bash
npm run blog:sync
npm run blog:publish
```

如果需要恢复归档项目，应先移回原稿、移除对应同步排除项并检查关联链接。不要直接修改思源托管文件的正文；下一次同步会检查托管文件是否被手动修改。

## 知识库专题

专题目录预设微积分、线性代数、概率、MLearn、数据分析、Python、Go、TS 和 GBDT，由 `docs/.vuepress/theme/data/topics.ts` 配置。思源「知识库」下的一级专题目录用于组织内容，中间空目录只保留层级；末级文档即使只有标题，也生成文章页并显示「正文待补充」，补写后保留原地址。
