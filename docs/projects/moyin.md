---
title: 墨影
permalink: /projects/moyin/
tags:
  - AI
  - Education
  - Multimodal
status: 架构设计中
category: C端 / AI 教育
summary: 网页端课程生成工作流平台，把书籍、辅导资料、习题册与网上资料生成声色俱全、带板书与互动的教学课程。
links:
  - label: 墨影控制台
    link: http://localhost:5174/auth/login
  - label: 墨影落地页
    link: /moyin/
progress:
  - label: 设计文档
    value: 02
stack:
  - Obsidian
  - LLM Agent
  - TTS
  - Remotion
  - Motion Canvas
  - FFmpeg
---

# 墨影

> [!info] 项目状态
> 架构设计中。Obsidian 中已有两份设计文档，覆盖多模态教学视频生成与矢量板书系统，已同步发布到本页下方。

## 项目定位

墨影（MOYIN）是网页端课程生成工作流平台：把书籍、辅导资料、习题册与网上资料导入系统，通过「资料入库 → 教学设计 → 板书与素材 → 合成课程 → 互动与交付」的流水线，生成声色俱全、带矢量板书与随堂互动的教学课程，而不是只有晦涩的文字。

Obsidian 负责知识组织，大语言模型负责教学设计，多模态模型负责理解与生成素材，TTS 负责配音，渲染引擎负责确定性合成。核心原则是让模型生成意图和结构，而不是直接输出不可编辑的完整视频：大纲、讲稿、分镜、板书动作和时间轴都作为可检查、可缓存、可版本化的中间产物。

## 系统流水线

```text
书籍 / 辅导资料 / 习题册 / 网页资料
    ↓
资料解析与知识依赖分析
    ↓
教学目标、讲稿、分镜与板书计划
    ↓
代码、图表、配音、字幕与视觉素材
    ↓
音频驱动的统一时间轴
    ↓
Remotion / Motion Canvas / Manim / FFmpeg
    ↓
质量检查、人工审核与局部重生成
    ↓
生成课程：网页课 / 视频课 / 讲义 / 习题册
```

## 设计文档

- [基于 Obsidian 的多模态教学视频生成方案](./moyin/video-generation.md)：整体流水线、教学设计、讲稿分镜、素材生成、配音字幕、渲染、质检与实施路线。
- [教学视频板书实现方案](./moyin/board-system.md)：板书四层数据模型、Blackboard Script、动作设计、文字/公式/图形实现、布局、音频同步与渲染选型。

## 当前记录

- 多模态教学视频的输入规范、系统组件和任务流水线。
- 讲稿、分镜、素材、TTS、字幕与统一时间轴设计。
- 矢量板书的数据模型、布局、动作和渲染方案。
- 事实、代码、字幕、画面和音频的质量检查。
- 网页端课程工作流的控制台规划。

`Obsidian` · `LLM Agent` · `Markdown AST` · `TTS` · `Remotion` · `Motion Canvas` · `FFmpeg`

## 入口

- [墨影落地页](/moyin/)
- [墨影控制台（独立前端）](http://localhost:5174/auth/login)
