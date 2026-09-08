# Anthropic Academy 官方课程对照表（Official Anthropic Academy Parity Map）

> 对齐意味着每个与认证相关的学习目标都有本地讲解、决策练习、交付物和验证路径，并不意味着复制 Academy 目录。

**核实日期（Verified）：** 2026-08-09

## 官方备考内容快照（Official Prep Snapshot）

当前合作伙伴备考页面列出：

- 助理基础级（Associate Foundations）：八个模块，标注时长共 389 分钟。
- 开发者基础级（Developer Foundations）：五个模块，标注时长共 774 分钟。
- 架构师基础级（Architect Foundations）：由七门现有 Academy 课程组成的课程包。
- 架构师专业级（Architect Professional）：五个模块，标注时长共 733 分钟。

这些总数是带日期的目录快照，并非考试时长或必需学习时间。Academy 可以新增、删除或重组课程，而不改变公开考试指南。

来源：[助理备考路径](https://anthropic-partners.skilljar.com/path/claude-certified-associate-foundations)、
[开发者备考路径](https://anthropic-partners.skilljar.com/path/claude-certified-developer-foundations)、
[架构师基础级备考课程包](https://anthropic-partners.skilljar.com/page/claude-certified-architect-foundations-prep-courses)和
[架构师专业级备考路径](https://anthropic-partners.skilljar.com/path/claude-certified-architect-professional)。

## 学习入口映射（Learning-Surface Map）

| Academy 官方学习入口（Official Academy surface） | 认证相关目标（Certification-relevant objective） | 本地覆盖（Local coverage） |
|---|---|---|
| [AI 熟练应用：框架与基础（AI Fluency: Framework and Foundations）](https://anthropic.skilljar.com/ai-fluency-framework-foundations) | 委派（Delegation）、描述（Description）、辨别（Discernment）和尽责（Diligence） | 第 00、05、06、07 课将 4D 转化为学习计划、能力诊断、控制映射和人工交接 |
| [AI 能力与局限（AI Capabilities and Limitations）](https://anthropic.skilljar.com/ai-capabilities-and-limitations) | 诊断下一词元预测（Next-token prediction）、知识、工作记忆和可引导性（Steerability） | 第 04、05 课提供上下文决策，以及经过验证的四属性故障诊断 |
| [Claude 入门（Claude 101）](https://anthropic.skilljar.com/claude-101) | Claude 产品形态、Projects、知识、连接器、研究及安全的日常工作流 | 第 01、04、07 课及助理综合实践 |
| [产品基础（Product Foundations）](https://anthropic-partners.skilljar.com/product-foundations) | 根据业务和控制要求，在直接使用 Claude、Amazon Bedrock、Google Vertex AI 与 Microsoft Foundry 之间选择 | 第 01 课的部署架构决策记录（ADR）；第 22、23、25 课进一步讨论采购、架构、身份和数据边界决策 |
| [Claude Platform 入门（Claude Platform 101）](https://anthropic.skilljar.com/claude-platform-101) | 原始 Messages 循环、SDK Tool Runner、第一方工具、托管智能体、事件流、工作区及支出控制 | 第 08、10、12、13、26 课提供离线状态机、执行入口、安全及运维练习 |
| [使用 Claude API 构建应用（Building with the Claude API）](https://anthropic.skilljar.com/claude-with-the-anthropic-api) | API 生命周期、流式传输、工具、结构化输出、缓存、批处理、检索增强生成（RAG）、评估（Evals）、Computer Use 和智能体 | 第 08 至 14、20、24、26 课；现有阶段课程提供从零实现 RAG 和评估的深入内容 |
| [MCP 入门（Introduction to MCP）](https://anthropic.skilljar.com/introduction-to-model-context-protocol) | 客户端、服务器、工具、资源、提示词、传输、MIME 和清理 | 第 11 课契约实验，以及阶段 13 的 MCP 服务器和客户端构建 |
| [MCP 高级主题（MCP Advanced Topics）](https://anthropic.skilljar.com/model-context-protocol-advanced-topics) | 采样（Sampling）、根目录（Roots）、通知、JSON-RPC、Streamable HTTP、会话及扩展 | 第 11 课决策与部署实验，以及阶段 13 的采样、根目录和信息征询（Elicitation）构建 |
| [Claude Code 入门（Claude Code 101）](https://anthropic.skilljar.com/claude-code-101) | 权限、计划模式（Plan Mode）、上下文恢复、CLAUDE.md、子智能体、技能（Skills）、MCP 和钩子（Hooks） | 第 15、19 课及现有的 Claude Code 权限模式课程 |
| [Claude Code 实战（Claude Code in Action）](https://anthropic.skilljar.com/claude-code-in-action) | 压缩（Compaction）、回退（Rewind）、目标与循环、工作树（Worktrees）、无界面自动化、评审、例行任务与分发 | 第 15、19 课的运维材料包和持续集成（CI）验证器 |
| [智能体技能入门（Introduction to Agent Skills）](https://anthropic.skilljar.com/introduction-to-agent-skills) | 编写 SKILL.md、通过描述触发、限制工具、打包脚本、分发及调试 | 第 19 课交付并验证真实的多文件技能；仓库导师演示可移植分发 |
| [子智能体入门（Introduction to Subagents）](https://anthropic.skilljar.com/introduction-to-subagents) | 隔离上下文、受限工具、结构化报告、障碍、时间盒和委派限制 | 第 16、17、19 课 |
| [Claude Cowork 入门（Introduction to Claude Cowork）](https://anthropic.skilljar.com/introduction-to-claude-cowork) | 引导式任务循环、常驻上下文、技能与插件、文件工作流及负责任的引导 | 仅简要介绍产品格局和工作流选择，不将其提升为公开考试目标 |
| Amazon Bedrock 和 Google Vertex AI 上的 Claude | 服务商专属的部署与运维 | 第 01 课教授架构决策；服务商控制台教程仍为可选的官方配套材料 |

## 本地对齐增加什么（What Local Parity Adds）

每节映射课程都不能仅仅提到官方目标，还必须：

1. 解释机制及其失败边界。
2. 让学习者调整场景或决策。
3. 产出学习者自己的交付物。
4. 运行确定性验证器或模拟器。
5. 通过原创题目和角色综合实践检验迁移能力。

对概念课程，可执行部分应评判策略、威胁模型、ADR、审批流程或证据包，绝不为了让课程看起来具有技术性而加入虚假的服务商调用代码。

## 有意不对齐的部分（Deliberate Non-Parity）

- 本课程不复制 Academy 的讲述、幻灯片、练习或测验措辞。
- 不维持固定的 Academy 课程总数。
- 不将合作伙伴销售赋能内容转化为技术考试要求。
- 本仓库优先使用标准库，不要求 Pydantic；第 09 课讲解它的验证职责如何对应底层契约。
- 当公开大纲要求的是架构决策而非控制台导航时，不重复服务商控制台教程。
- 不将认证课程纳入电子书流程，因为导师状态、实验、图表和评估都是必需的学习入口。
