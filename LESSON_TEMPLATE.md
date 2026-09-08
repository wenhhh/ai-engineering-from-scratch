# 课程模板（Lesson Template）

创建新课程时使用此模板。按下面的目录结构建立文件，再填写内容。

## 目录结构（Folder Structure）

```text
NN-lesson-name/
├── code/
│   ├── main.py            （主要实现）
│   ├── main.ts            （TypeScript 版本，如适用）
│   ├── main.rs            （Rust 版本，如适用）
│   └── main.jl            （Julia 版本，如适用）
├── notebook/
│   └── lesson.ipynb       （用于实验的 Jupyter 笔记本）
├── docs/
│   └── en.md              （课程文档）
└── outputs/
    ├── prompt-*.md         （本课产出的提示词）
    └── skill-*.md          （本课产出的技能）
```

## 文档格式（docs/en.md）

```markdown
# [课程标题]

> [用一句话写出值得记住的核心思想]

**Type:** Build | Learn
**Languages:** Python, TypeScript, Rust, Julia（只列实际使用的语言）
**Prerequisites:** [列出必需的先修课程]
**Time:** 约 [预计时长] 分钟

## 要解决的问题（The Problem）

[写 2 至 3 段。缺少这一知识，你无法完成什么？为什么值得学习？
给出具体场景，展示不了解这一概念会造成什么问题。]

## 核心概念（The Concept）

[先用图表和直观解释讲清概念，暂不展示代码。
使用 ASCII 图、表格，或链接到网页应用中的可视化内容。
先建立心智模型（Mental Model），再进入实现。]

## 动手实现（Build It）

[分步骤从零实现。
从最简单的版本开始，再逐步增加复杂度。
每个代码块都应能独立运行。]

### 步骤 1：[名称]

[解释]

    [代码块]

### 步骤 2：[名称]

[解释]

    [代码块]

[……继续添加步骤……]

## 实际应用（Use It）

[展示框架或库如何完成同样的任务。
对比从零实现的版本和库实现的版本。
借此验证对概念的理解，并介绍实用工具。]

## 交付成果（Ship It）

[本课产出什么可复用的交付物（Artifact）？
可以是提示词（Prompt）、技能（Skill）、智能体（Agent）、MCP 服务器或工具。
在此介绍，并将文件保存在 outputs/ 目录中。]

## 练习（Exercises）

1. [简单：巩固核心概念]
2. [中等：将知识应用到另一个问题]
3. [困难：扩展实现，或结合先前课程的知识]

## 关键术语（Key Terms）

| 术语 | 常见说法 | 准确含义 |
|------|----------------|----------------------|
| [术语] | [常见误解] | [实际定义] |

## 延伸阅读（Further Reading）

- [资料 1](url)：[值得阅读的原因]
- [资料 2](url)：[值得阅读的原因]
```

## 代码文件要求（Code File Guidelines）

- 代码必须运行无误
- 不添加注释，代码应能表达自身意图
- 选择最适合该主题的语言
- 如有依赖，提供 `requirements.txt` 或相应语言的依赖清单
- 从简单版本开始，逐步增加复杂度
- 每个函数和类都应有明确用途

## 交付物文件格式（Output File Format）

### 提示词（Prompts）

```markdown
---
name: prompt-name
description: 说明这个提示词的用途
phase: [阶段编号]
lesson: [课程编号]
---

[提示词内容]
```

### 技能（Skills）

```markdown
---
name: skill-name
description: 说明这个技能教授的内容
version: 1.0.0
phase: [阶段编号]
lesson: [课程编号]
tags: [relevant, tags]
---

[技能内容]
```
