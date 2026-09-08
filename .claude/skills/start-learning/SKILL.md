---
name: start-learning
version: 1.0.0
description: >
  从零开始的 AI 工程（AI Engineering from Scratch）课程的一次性学习引导，共 523 课、20 个阶段。
  询问学习者目标，进行起点测评，并写入 LEARNING.md，形成由 learn 技能持续推进的学习计划。
  触发表达：“开始学习”“配置课程”“开始这套课程”“带我入门”“创建学习计划”
tags: [onboarding, curriculum, ai-engineering, learning-plan]
---

# 开始学习（Start Learning）

你负责引导学习者进入**从零开始的 AI 工程（AI Engineering from Scratch）**课程：20 个阶段、523 课，涵盖从线性代数到自主智能体的内容。你的任务是在当前目录生成 `LEARNING.md`，用这一个文件记录学习动机、合适的起点和学习路线。此后的每次 `learn` 会话都会读取并更新该文件，因此应把它视为学习者状态的权威来源。

适用于任何智能体（Agent）。环境提供结构化提问或选项工具时，每道问题都使用该工具；否则用纯文本列出字母标记的选项，并等待回复。

## 宿主调用约定（Host Invocation Contract）

技能名称可以跨宿主使用，但调用语法由宿主决定。展示下一条命令前，应选用正确形式：

- Codex：使用 `start-learning`、`learn`、`course-guide` 等 `skill-name` 形式，或让学习者从 `/skills` 中选择技能。
- Claude Code：使用 `/start-learning`、`/learn`、`/course-guide` 等
  `/skill-name` 形式。
- 其他兼容宿主：使用自然语言，例如 `Use learn to start my
  first lesson.`（使用 learn 开始我的第一课）。

不要把 Claude Code 的斜杠命令当作通用语法。无法确定宿主时，使用自然语言。

## 跨学习模式恢复（Resume Routing Across Course Modes）

进入通用学习引导之前，先根据以下状态文件及其负责技能，处理每个“恢复”或“继续”请求：

- `LEARNING.md` 由完整课程的 `learn` 负责。
- `MCP-LEARNING.md` 由模型上下文协议（Model Context Protocol，MCP）路线的 `learn-mcp` 负责。
- `MCP-ENGINEERING-LEARNING.md` 是同一条 `learn-mcp` 路线的旧文件名，不是另一条路线。
- `AGENT-SKILLS-LEARNING.md` 由 `learn-agent-skills` 负责。
- `CLAUDE-CERTIFICATION.md` 由 `claude-certification` 负责。

学习者在恢复或继续请求中明确指定路线时，即使其他状态文件存在，也立即转交对应技能，然后结束本技能。

未指定路线时，检查哪些状态文件存在，归集对应的负责技能，将两个 MCP 文件名合并归入 `learn-mcp`。如果只剩一个负责技能，在通用学习引导之前调用它，并结束本技能。`learn-mcp` 负责旧文件迁移和冲突报告。如果有两个或更多负责技能，列出面向学习者的路线名称，在开始起点测评或修改任何状态之前询问恢复哪条路线。如果没有状态文件，继续通用学习引导。不得根据文件更新时间推断路线，也不得将一条路线的进度合并到另一条路线的状态文件。

旧运行时可能将 `learn-mcp-engineering` 暴露为别名。仅允许通过它转到 `learn-mcp`；所有面向学习者的转交说明都使用 `learn-mcp`，路线名称为模型上下文协议（Model Context Protocol，MCP）。

## 转交 MCP 专门路线（Focused MCP Handoff）

学习者明确要求学习模型上下文协议（MCP）而非完整课程时，不进行起点测评，也不创建 `LEARNING.md`。转交可移植技能 `learn-mcp`，它的来源为
`learning-paths/model-context-protocol.json`，状态文件为
`MCP-LEARNING.md`。Codex 中使用 `learn-mcp`，Claude Code 中使用
`/learn-mcp`，其他兼容宿主则用自然语言要求使用
`learn-mcp`。选课、协议报文证据（Wire Evidence）和公开部署安全门禁（Security Gate）由专门导师负责。

## 转交智能体技能专门路线（Focused Agent Skills Handoff）

学习者明确要求学习智能体技能（Agent Skills）而非完整课程，或存在
`AGENT-SKILLS-LEARNING.md` 且要求恢复该路线时，不进行起点测评，也不创建 `LEARNING.md`。转交可移植技能
`learn-agent-skills`，它的来源为 `learning-paths/agent-skills.json`，状态文件为
`AGENT-SKILLS-LEARNING.md`。Codex 中使用 `learn-agent-skills`，Claude Code 中使用 `/learn-agent-skills`，其他兼容宿主则用自然语言要求使用
`learn-agent-skills`。专门导师负责五课顺序、真实宿主证据、沙箱（Sandbox）边界、第 26 课之前的第 25 课与工具投毒（Tool Poisoning）前置门禁，以及发布门禁（Release Gate）。

如果 `LEARNING.md` 已存在，不得覆盖。概述其中的学习目标、起点和已有进度，并且只提供以下三种选择：

- **继续学习（Resume）**：按上述宿主语法调用 `learn`，完全跳过访谈和起点测评。
- **重新测评（Re-Run Placement）**：重新进行测验，然后只更新起点测评（Placement）部分和路径（Path）状态；学习目标（Mission）、进度日志（Progress Log）和复习队列（Review Queue）保持不变。
- **重新开始（Start Over）**：只有获得明确确认后，才将当前文件重命名为 `LEARNING-<YYYY-MM-DD>.md` 归档，再执行下方完整引导。不得悄悄删除或覆盖学习历史。

## 第 1 步：简短访谈，限 3 个问题（The Interview）

1. **为什么学习 AI 工程？** 自由回答。可以给出的示例：交付 AI 产品、转行、理解日常使用的技术、开展研究。使用学习者自己的表述记录答案，因为此后的每次课程讲解都要联系这一动机。
2. **每周可以投入多少时间？** 选项：约 2 小时、约 5 小时、约 10 小时、“尽可能快”。这只用于如实描述节奏，不得据此删减内容。
3. **最终最想做出什么？** 一句话即可，可以是智能体、训练好的模型、检索增强生成（RAG）产品，也可以是“还不确定”。

不得超过这三个问题。起点测验负责衡量知识水平，访谈只负责了解意图。

## 第 2 步：起点测评（Placement）

运行随本技能一同安装的 `find-your-level` 技能中的起点测验：5 个领域、10 道题，映射到入门阶段。保留该技能的答案隔离约定：不得预先加载后续轮次的答案，也不得将中性的 `<letter>` 占位符替换为真实选项字母。

学习者明确知道从哪里开始，例如“直接从阶段 7 开始”时，应尊重选择并跳过测验，但生成的计划仍必须遵循与测验流程相同的输出约定，确保 `learn` 导师始终能读到结构完整的计划：

- 验证阶段编号在 0–19 范围内，并解析规范名称；无法解析时，列出全部 20 个阶段让学习者选择。
- 在路径（Path）表中，将起点之前的阶段标为 `Skip`，起点及之后的阶段标为 `Do`。没有领域得分可据以推断，因此不设置 `Review` 行。预计小时数（Est. hours）总计为所有 `Do` 行之和。
- 在起点测评（Placement）部分写入 `Score: self-selected`，而不是数字分数。

## 第 3 步：写入 LEARNING.md（Write LEARNING.md）

在当前目录创建 `LEARNING.md`，严格包含以下章节：

```markdown
# 我的 AI 工程学习路线（My AI Engineering Path）
<!-- 由 ai-engineering-from-scratch 学习技能维护。
     Repo: https://github.com/rohitg00/ai-engineering-from-scratch -->

## 学习目标（Mission）
<使用学习者原话记录问题 1 的答案，并补充问题 3 的构建目标>

## 起点测评（Placement）
- Date: <YYYY-MM-DD>
- Score: <总分>/10，附各领域得分；跳过测验时严格填写 `self-selected`
- Entry point: Phase <N>: <名称>
- Pace: ~<小时数>/week

## 路径（Path）
| Phase | Name | Status | Est. hours |
|-------|------|--------|------------|
<全部 20 个阶段；Status 按测评结果取 Skip、Review、Do 或 Done。
小时数来自 ROADMAP.md：已克隆仓库时读取本地文件，否则获取
https://raw.githubusercontent.com/rohitg00/ai-engineering-from-scratch/main/ROADMAP.md>

## 进度日志（Progress Log）
| Date | Lesson | Quiz | Note |
|------|--------|------|------|

## 复习队列（Review Queue）
<暂时留空；learn 会添加测验识别出的待复习课程>
```

## 第 4 步：转交（Hand Off）

最后只用三行：

- 学习起点，以及所有 Review + Do 阶段的预计总小时数。
- 给出符合宿主语法的 `learn` 调用方式，说明它会开始第一课，并在每次调用时从该文件继续。
- 给出符合宿主语法的 `course-guide <topic>` 调用方式，说明它也能直接跳到指定主题。
