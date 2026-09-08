---
name: case-study-mapper
description: 将拟议多智能体系统设计映射到最接近的 2026 年生产参考（Anthropic Research、MetaGPT/ChatDev 或 OpenClaw/Moltbook）。揭示已知权衡、推荐框架，以及已在生产中测试的具体设计决策。
version: 1.0.0
phase: 16
lesson: 25
tags: [multi-agent, case-studies, production, framework-selection, reference-architectures]
---

根据拟议多智能体系统设计，选择最接近的典型 2026 年案例并适配。

产出：

1. **设计特征（Design fingerprint）。**任务类型（研究 / 工程 / 群体 / 自动化）、智能体数量、验证要求、运行时长、角色区分度、面向用户的网络暴露面。
2. **最接近的案例（Closest case study）。**
   - **Anthropic Research**：研究或知识检索任务、必须验证、数小时运行、智能体主要在上下文和范围上不同（新上下文子智能体占优）。
   - **MetaGPT / ChatDev**：工程或结构化工作流、角色清晰可区分（规划者 / 编码者 / 审查者 / 测试者）、交接产物类型明确。
   - **OpenClaw / Moltbook**：群体规模、面向用户的智能体网络、提示注入是实质威胁、涌现经济重要。
3. **借鉴模式（Patterns to copy）。**所选案例中适用的具体设计决策：新上下文子智能体、彩虹部署、沟通式去幻觉、DAG 路由、不可被写入的验证者、基础层安全。
4. **框架建议（Framework recommendation）。**LangGraph、CrewAI、AG2、Microsoft Agent Framework、OpenAI Agents SDK、Google ADK、Anthropic Claude Agent SDK 或自定义。默认使用案例的典型框架；若特定设计有更合适选项，应说明。
5. **案例中的反模式（Anti-patterns from the case）。**参考案例已证明无效的做法。新设计应避免。
6. **成本预测（Cost projection）。**预计 token 倍数（Anthropic Research：约 15 倍；MetaGPT：约 5 倍；OpenClaw：取决于网络效应）。预计实际耗时和美元成本范围。
7. **评估方法（Evaluation approach）。**哪个基准（MARBLE、SWE-bench Pro、内部）相关？相对案例基线，将多大提升设为目标合理？

直接否决：

- 任务有正确性要求，却忽视验证的设计。每个案例都支付验证税。
- 声称构建新基础层，却不承认提示注入攻击面的设计。OpenClaw/Moltbook 案例表明，这是生产问题，不是假设。
- 无法映射到任何案例的“革命性”主张。多智能体自 2024 年就进入生产；新颖性主张需要显式比较。
- 未说明理由就不采用 MCP 或 A2A 的设计。协议支持是基本门槛。

拒绝规则：

- 如果设计没有明确任务类型，建议先限定任务范围，再选案例。“多智能体解决一切”不是设计。
- 如果设计声称生产就绪，却没有失败模式审计，建议先做 MAST 风格审计（第 23 课），再映射参考案例。
- 如果设计纯属实验 / 研究，指出在采用任何案例的生产模式前，哪些方面需要加固。

输出：两页简报。以一句话概述（“最接近的案例：MetaGPT / ChatDev。采用角色 SOP 分解、沟通式去幻觉和结构化交接产物；使用 CrewAI 或自定义。”），随后给出上述七节。最后提供 90 天适配计划：从参考中借鉴什么、自定义什么、针对基准验证什么。
