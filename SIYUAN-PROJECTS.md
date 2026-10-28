# 在思源维护项目和知识库

## 项目只按明确名单发布

2026-10-28 起，项目固定为下表的 5 个，新增思源目录、项目属性或子文档都不会自动发布。`siyuan.config.json` 的 `projectDocumentIds` 仅允许 4 个记录页和现有标注工具产品展示页的精确 ID；`projectManualFiles` 仅允许 `wyvern.md`。子文档必须单独得到用户授权并加入名单。

同步阶段不会导出未获准项目的正文；构建阶段再次按同一名单选择项目文件，旧快照、手工添加的其他项目文件也不会生成网页、进入搜索或目录。项目目录名称只决定获准文档的归类，不赋予发布权限。原来的空“持续构建”目录页已撤下。

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

其余项目仍由思源「项目」下的记录文档维护。项目子文档可留在思源中补充设计过程，默认不发布。获准的展示页通过自定义属性关联；发布权由精确名单决定，项目元数据只决定卡片样式。

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

如果需要恢复归档项目，须先获得用户明确授权，再移回原稿、加入精确发布名单、移除对应同步排除项并检查关联链接。不要直接修改思源托管文件的正文；下一次同步会检查托管文件是否被手动修改。

## 知识库专题

专题目录预设微积分、线性代数、概率、MLearn、数据分析、Python、Go、GBDT 和 SKLearn，由 `docs/.vuepress/theme/data/topics.ts` 配置。思源「知识库」下的一级专题目录用于组织内容，中间空目录只保留层级；末级文档即使只有标题，也生成文章页并显示「正文待补充」，补写后保留原地址。

TS 专题已按用户要求移除；思源中同名 TS / TypeScript 专题目录列入同步排除项，后续同步不会重新发布。


2026-10-29 新增 SKLearn 专题，卡片与独立专题首屏共用 `SklearnTopicVisual.vue`：训练/测试划分 → 预处理与估计器 Pipeline → 训练集内交叉验证，测试集保持独立。动画复用 `useSceneMotion`，静态状态保留全部数据流、方法和验证折叠。

知识库同步设置 `onlyConfiguredTopics: true`，以 `topics.ts` 已配置的专题为范围。新增思源分类先在博客配置专属视觉，才进入同步；空的 OS、网络、容器等分类不会变成占位文章或没有视觉的专题。本次同步所有已配置专题的最新章节与正文，正文为空时继续如实显示“正文待补充”。

SKLearn 图形中的预处理复用与测试隔离依据 [scikit-learn 官方实践](https://scikit-learn.org/stable/common_pitfalls.html)。
