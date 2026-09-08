---
name: skill-invocation-router
description: 为 Agent Skill 目录设计并测试人工显式、模型或智能体隐式、应用程序化、有界技能组合和框架激活策略。
license: MIT
metadata:
  lesson: "25"
---

# 技能调用路由器（Skill invocation router）

宿主需要可审计激活策略，而非一个不加区分的 `invocable` 标志时，使用此技能。

1. 阅读 `references/invocation-model.md`，分类请求通道。
2. 将 `assets/host-policy.json` 作为适配器配置示例审查，不当作可移植标准。
3. 运行 `python3 scripts/simulate_invocation.py --policy assets/host-policy.json --actor ACTOR --name NAME --description DESCRIPTION --query QUERY [--explicit-name NAME] [--caller-name NAME] [--depth N] [--user-invocable true|false] [--disable-model-invocation true|false]`。
4. 人工、应用、技能或框架请求要求精确已发现名称及其通道专属允许列表。
5. 技能调用方还需调用方身份、无循环目标和有界组合深度。
6. 模型或自主智能体请求先移除因行为者或已识别宿主扩展而无资格的候选。
7. 仅给剩余描述评分。选择最强有资格匹配；无有资格候选超过阈值时弃权。
8. 返回带适配器、通道、分数和策略原因的 JSON 决定。

激活加载指令，不批准工具、文件系统变更、网络访问、秘密使用或包内脚本。
