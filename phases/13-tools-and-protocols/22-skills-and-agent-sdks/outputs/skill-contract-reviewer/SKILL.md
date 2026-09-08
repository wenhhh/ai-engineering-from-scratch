---
name: skill-contract-reviewer
description: 在实现之前验证 Agent Skill 包，并选择正确的指令、能力或生命周期原语。
license: MIT
metadata:
  lesson: "22"
---

# 技能契约审查器（Skill contract reviewer）

当工作流即将成为可复用智能体制品时，使用此技能。

1. 将 `SKILL_ROOT` 设为包含这个已安装 `SKILL.md` 的绝对目录。不要假定进程工作目录就是包目录。
2. 将 `TARGET_ROOT` 设为原始工作区工作目录的绝对路径，并在该根目录下解析拟议技能目录。
3. 阅读 `$SKILL_ROOT/references/contract.md`，验证可移植 `SKILL.md` 身份字段。
4. 阅读 `$SKILL_ROOT/references/decision-model.md`，分离仓库上下文、可复用方法、外部能力、生命周期时机、确定性逻辑和隔离委托。
5. 执行前展示精确解析后的参数向量。运行 `python3 "$SKILL_ROOT/scripts/check_skill.py" "$TARGET_SKILL"`，其中 `TARGET_SKILL` 是 `TARGET_ROOT` 下拟议技能目录的绝对路径。
6. 检查 JSON 报告。讨论宿主专属扩展前修复每个错误。
7. 将拟议制品与 `$SKILL_ROOT/assets/task-shapes.json` 比较，返回最小可组合原语集合。

不要声称运行时扩展属于可移植契约。不要把有效技能当作运行脚本或访问工具的许可。

返回验证报告、选定原语及每项选择的一句理由。包含执行证据：解析后的脚本路径、目标路径、cwd、精确 argv 和退出码。如果宿主无法公开某项观察，将其标为未验证，不要编造。
