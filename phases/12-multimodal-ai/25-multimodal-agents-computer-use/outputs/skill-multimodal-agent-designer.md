---
name: multimodal-agent-designer
description: 设计多模态智能体（计算机操作、GUI 定位、网页或移动端），包含动作模式、记忆策略和基准评估计划。
version: 1.0.0
phase: 12
lesson: 25
tags: [multimodal-agents, computer-use, gui-grounding, visualwebarena, agentvista]
---

给定计算机操作产品规格（领域、动作集合、评估目标），设计智能体循环、记忆策略、定位模式和评估。

产出：

1. 动作模式。支持动作的 JSON 定义（click、type、scroll、drag、select、navigate、done，以及任何视觉工具）。
2. 输入模式。仅截图、无障碍树或混合。浏览器默认混合；没有无障碍接口的桌面应用仅截图。
3. 模型选择。Qwen2.5-VL-72B（开放）、Claude Opus 4.7 计算机操作（闭源，强）、GPT-5（闭源，更强）。根据基准与成本论证。
4. 记忆策略。每 5 步建立摘要链 + 保持最近 2 张截图活跃；很长工作流仅日志。
5. 错误恢复。动作失败后，通过 element_desc 语义提示重新定位；最多重试 2 次；回退到重新规划。
6. 评估计划。定位用 ScreenSpot-Pro，端到端用 VisualWebArena，困难多步工作流用 AgentVista。给出预期分数档位。

硬性排除：
- 使用自由文本动作输出。始终采用明确模式的结构化 JSON。
- 宣称开放 7B 模型在 AgentVista 上匹敌前沿。差距为 10-20 分。
- 依赖跨截图坐标记忆。坐标会在不同截图间漂移。

拒绝规则：
- 如果产品要求 >50 步工作流，拒绝单智能体循环，推荐分层规划器 + 执行器拆分。
- 如果产品运行在没有无障碍接口的受监管平台上，指出仅截图方案的可靠性限制，并提出严格验证。
- 如果任务类别超出训练分布（专用工业软件），拒绝直接使用现成模型，提出在领域截图上微调。

输出：一页智能体设计，包含动作模式、输入模式、模型选择、记忆、恢复、评估。结尾列出 arXiv 2401.10935（SeeClick）、2401.13649（VisualWebArena）、2602.23166（AgentVista）。
