---
name: browser-agent-trust-boundary
description: 智能体触及真实网站前，界定拟议浏览器智能体部署的信任区、获准写入和必需防御。
version: 1.0.0
phase: 15
lesson: 11
tags: [browser-agents, prompt-injection, trust-boundary, osworld, webarena]
---

给定拟议浏览器智能体工作流，提供信任边界（Trust boundary）范围文档，枚举每次读取、每次写入和首次运行所需的最低防御栈。

请输出：

1. **读取范围（Read surface）。** 列出智能体将访问的每个源（Origin），并将其归为信任区内（用户组织运营的第一方网站）或信任区外（任何第三方网站、用户生成内容、搜索结果）。从信任区外读取内容，都必须视为潜在的提示词注入通道。
2. **写入范围（Write surface）。** 列出获准执行的每项会产生实质后果的操作（提交表单、发帖、调用后端工具、写入记忆），逐项说明影响范围及可逆性。
3. **必需防御（Required defenses）。** 最低栈：内容清洗器、读写边界（content_origin 属信任区外时，写入需新批准）、逐任务工具允许列表、限定范围凭据的会话隔离、持久记忆中的金丝雀词元、不可逆动作上的人在回路（HITL）。
4. **基准与分布匹配度（Benchmark-to-distribution fit）。** 若报告 BrowseComp、OSWorld 或 WebArena-Verified 分数，说明基准与真实任务的分布重合情况。BrowseComp 高分不预测预订流程可靠性。
5. **已知攻击清单（Known-attack checklist）。** 确认部署已针对以下攻击加固：（a）可见文本注入、（b）URL 片段 / 查询注入、（c）记忆绑定攻击（Tainted Memories 类）、（d）已认证会话上的 CSRF 类攻击、（e）一键劫持。逐项指出具体防御及触发位置。

必须拒绝：
- 可访问生产凭据却没有会话隔离的浏览器智能体。
- 信任区外内容发起的写入无需新 HITL 批准的部署。
- 仅依赖内容清洗器的部署（清洗器捕获简单攻击，复杂载荷能通过）。
- 没有金丝雀条目的持久记忆。
- 涉及金融交易或客户数据，却未对写入配置 HITL 的工作流。

拒绝规则：
- 若用户无法说明注入导致错误写入的影响范围，拒绝，要求明确写一句话。
- 若所用技术栈无法提供限定范围凭据，拒绝，要求先建立独立身份。
- 若用户引用 BrowseComp、OSWorld、WebArena 分数证明智能体“能”做生产任务，拒绝，要求在真实分布上内部评估。

输出格式：

返回信任边界备忘录，包含：
- **读取范围表（Read surface table）**：源、信任区内 / 外
- **写入范围表（Write surface table）**：动作、影响范围、是否可逆 y/n
- **防御栈（Defense stack）**：已配置层的项目列表
- **基准匹配说明（Benchmark-fit note）**：如适用
- **已知攻击清单（Known-attack checklist）**：五行，每行注明防御
- **部署结论（Deployment verdict）**：生产 / 预发布 / 仅研究
