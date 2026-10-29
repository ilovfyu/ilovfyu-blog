---
title: Siskin-Base-Control
date: '2026-10-30'
permalink: /projects/siskin-base-control/
description: '纯 Go 的 Serverless 运行时内核，把有状态服务包装成可休眠、可恢复、可观测、可计量的按需运行单元。'
category: engineering
tags: ["Go", "Serverless", "有状态服务", "休眠与恢复"]
project:
  code: siskin-base-control
  view: record
  order: 24
  tone: cyan
  group: 持续构建
  label: GO / SERVERLESS
  status: 早期构建
  category: 工程 / Serverless 运行时
  summary: '纯 Go 的 Serverless 运行时内核，把有状态服务包装成可休眠、可恢复、可观测、可计量的按需运行单元。'
  stack: ["Go", "Serverless", "有状态服务", "休眠与恢复"]
  repository: https://github.com/ilovfyu/Siskin-Base-Control
  headline: []
  intro: ''
  features: []
  flow: []
  platforms: []
  progress: []
  landing: {}
  showcase: ''
  record: ''
pageClass: project-record-page
---

<project-record-hero />

## 项目定位

Siskin-Base-Control 面向有状态服务的按需运行。项目希望通过纯 Go 的运行时内核，把服务封装为可以休眠、恢复、观测和计量的运行单元。

## 关注的运行过程

- **按需运行**：围绕请求组织服务的运行生命周期。
- **休眠与恢复**：让有状态服务的暂停与继续运行成为内核关注的核心问题。
- **观测与计量**：把运行状态和资源使用纳入同一套运行单元模型。

首屏以分层的运行单元展示「运行 → 休眠 → 恢复」：服务层收拢休眠，状态层保留，请求抵达后唤醒服务，旁侧显示观测与计量。这是概念示意，不代表已实现的持久化方案或运行指标。

## 构建状态

项目处于早期构建阶段，当前公开仓库主要提供项目定位。具体 API、安装方式、支持范围与验证结果将随实现补充。

查看 [GitHub 仓库](https://github.com/ilovfyu/Siskin-Base-Control) 了解最新进展。
