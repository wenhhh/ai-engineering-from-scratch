---
name: skill-catalog-builder
description: 跨显式发现范围构建有界 Agent Skill 目录，在加载指令正文前报告冲突。
license: MIT
metadata:
  lesson: "24"
---

# 技能目录构建器（Skill catalog builder）

智能体宿主需要跨多个技能目录进行确定性发现时，使用此技能。

1. 阅读 `references/discovery-contract.md`。
2. 审查 `assets/scope-policy.json` 中的宿主策略示例，不要假定其顺序通用。
3. 运行 `python3 scripts/build_catalog.py project=PATH user=PATH`，范围按优先级从高到低列出。
4. 激活技能前检查 JSON 的 `collisions` 和 `omitted` 数组。
5. 仅加载选定 SKILL.md 正文；仅当正文点名时加载直接参考资料。

发现期间绝不执行包内脚本。绝不按偶然的文件系统顺序选择同优先级重复项。

返回目录预算、选定条目、冲突解决结果和省略项。
