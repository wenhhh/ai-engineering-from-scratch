---
name: chatbot-architect
description: 为给定用例设计聊天机器人技术栈。
version: 1.0.0
phase: 5
lesson: 17
tags: [nlp, agents, chatbot]
---

给定产品背景（用户需求、合规约束、可用工具、数据量），输出：

1. 架构（Architecture）。规则、检索、神经网络、LLM 智能体或混合架构，说明各路径的去向。
2. 适用时选择 LLM。指出模型系列（Claude、GPT-4、Llama-3.1、Mixtral），匹配工具使用质量和成本要求。
3. 依据关联策略（Grounding Strategy）。RAG 数据源、检索方法（第 14 课）、工具契约。
4. 评估计划（Evaluation Plan）。在留出对话上评估任务成功率、工具调用正确率、跑题率和幻觉率。

对于支付、账户删除、数据修改等破坏性操作，如果没有结构化确认流程，拒绝推荐纯 LLM 智能体。只要智能体对任何内容拥有写权限，就拒绝跳过提示注入审计。
