# 贡献指南（Contributing）

欢迎贡献课程、译文、修复和交付物（Artifact）。每个拉取请求（Pull Request，PR）只处理一项贡献，有助于缩短审查时间，也便于准确统计贡献次数并记录署名。

## 重要：README 和 ROADMAP 是网站的数据来源

`site/build.js` 解析 `README.md`、`ROADMAP.md` 和 `glossary/terms.md`，生成 `site/data.js`。修改这些文件的拉取请求必须保留下列格式：

- 阶段标题使用 `### Phase N: Name \`X lessons\``，或者
  `<details><summary><b>Phase N — Name</b> ... <code>X lessons</code> ... <em>Description</em></summary>`。
- 课程表格的列结构为 `| # | Lesson | Type | Lang |`；综合实践（Capstone）表格使用 `| # | Project | Combines | Lang |`。`Lang` 列支持纯文本（`Python, TypeScript`）或原有的语言图标（`🐍 🟦 🦀 🟣 ⚛️`），解析结果相同。
- ROADMAP 的阶段标题和课程行中保留状态符号（`✅`、`🚧`、`⬚`）。不要将它们替换成文字，因为解析器依赖这些确切字符。

修改后运行 `node site/build.js`。如果修改没有破坏结构，`git diff site/data.js` 应只出现时间戳变化。

## 贡献方式（Ways to Contribute）

### 1. 添加新课程

每课位于 `phases/XX-phase-name/NN-lesson-name/`，目录结构如下：

```text
NN-lesson-name/
├── code/           至少一个可运行的实现
├── notebook/       用于实验的 Jupyter 笔记本（可选）
├── docs/
│   └── en.md       课程文档（必需）
└── outputs/        本课产出的提示词、技能或智能体（如适用）
```

**课程文档格式**（`en.md`）：

```markdown
# 课程标题

> 用一句话说明本课的核心思想。

## 要解决的问题（The Problem）

为什么这个问题值得关注？缺少这一知识，你无法完成什么？

## 核心概念（The Concept）

先通过图表、可视化和直观解释讲清概念，再进入代码实现。

## 动手实现（Build It）

分步骤从零实现。

## 实际应用（Use It）

使用实际框架或库完成同样的任务。

## 交付成果（Ship It）

介绍本课产出的提示词、技能、智能体或工具。

## 练习（Exercises）

1. 练习一
2. 练习二
3. 挑战练习
```

### 2. 添加译文

在任意课程的 `docs/` 目录中创建新文件：

```text
docs/
├── en.md    （英语，始终需要保留）
├── zh.md    （中文）
├── ja.md    （日语）
├── es.md    （西班牙语）
├── hi.md    （印地语）
└── ...
```

与英文版保持相同结构。翻译内容，不改动代码。

### 3. 添加交付物

如果课程需要产出可复用的提示词（Prompt）、技能（Skill）、智能体（Agent）或模型上下文协议（Model Context Protocol，MCP）服务器：

1. 在该课的 `outputs/` 目录中创建交付物
2. 在顶层 `outputs/` 索引中添加引用

**提示词格式：**

```markdown
---
name: prompt-name
description: 说明这个提示词的用途
phase: 14
lesson: 01
---

[在此填写系统提示词或模板]
```

**技能格式：**

```markdown
---
name: skill-name
description: 说明这个技能教授的内容
version: 1.0.0
phase: 14
lesson: 01
tags: [agents, loops]
---

[在此填写技能内容]
```

### 4. 修复缺陷或改进已有课程

- 修复无法运行的代码
- 改进解释
- 补充更易理解的图表
- 更新过时信息

### 5. 添加练习或项目

欢迎补充练习与项目，尤其是能够串联多个阶段知识的内容。

## 编写要求（Guidelines）

- **代码必须能运行。** 安装列出的依赖后，每个代码文件都应执行无误。
- **代码中不添加注释。** 代码应能表达自身意图，解释放在文档中。
- **选择适合任务的语言。** 如果 TypeScript 或 Rust 更合适，不要强行使用 Python。
- **先从零实现。** 展示框架版本前，先从基本原理出发实现概念。
- **以实践为中心。** 理论为实践服务，而不是反过来。
- **拒绝空泛的 AI 生成内容。** 用自然、直接的语言写作，删除无实质信息的套话。

## 拉取请求流程（Pull Request Process）

赞助信息的变更不接受贡献者通过拉取请求提交。赞助商名称、标识、链接与赞助等级由维护者管理。赞助咨询请参阅 [SPONSORS.md](SPONSORS.md)。

1. 创建派生仓库（Fork）
2. 创建功能分支（`git checkout -b add-lesson-phase3-gradient-descent`）
3. 完成修改
4. 确认所有代码都能运行。运行 `python3 scripts/run_lesson_tests.py` 执行各课自带测试；依赖尚未安装的科学计算包的课程会跳过，其余课程正常运行。
5. 提交拉取请求，并写清楚改动内容

## 行为准则（Code of Conduct）

请参阅 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。尊重他人，提供帮助，提出建设性意见。

## 写作风格（Style）

- 直接表达，删除套话。保持技术手册的语气，不写营销文案。
- 标题不使用装饰性表情图标。语言列中的图标是唯一例外，因为解析器需要将它们映射为语言名称。
- 安装课程列出的依赖后，代码应无需改动即可运行。
- 先从零实现，再介绍框架。
