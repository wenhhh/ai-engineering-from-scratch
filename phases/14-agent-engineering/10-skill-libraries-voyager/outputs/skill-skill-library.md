---
name: skill-library
description: 生成 Voyager 式技能库（Skill library），包含注册、相似度检索、组合执行和失败驱动改进。
version: 1.0.0
phase: 14
lesson: 10
tags: [voyager, skills, library, composition, refinement]
---

给定目标运行时和领域，生成支持 Voyager 三个组件的技能库：课程钩子、可检索技能存储、迭代改进。

请生成：

1. `Skill` 类型，包含 `name`、`description`、`code`、`version`、`tags`、`depends_on`、`history`。每次写入记录先前代码。
2. `SkillLibrary`，包含 `register(skill, dedup=True)`（新增或递增版本）、`search(query, top_k, tag_filter)`、`get(name)`、`topo_order(name)`（依赖解析）、`execute(name, context)`（按拓扑运行）。
3. 检索必须使用嵌入相似度或 BM25，而不是让 LLM 对整个库评分。允许 LLM 对 top-k 候选结果重排序。
4. 执行时必须分别捕获各项技能的异常，并将异常记录在轨迹中，供改进循环作为反馈使用。
5. 改进钩子：`execute` 失败后，运行时收集 (task, skill_name, error, env_state)，传给模型，并对重写后的技能调用 `register`。版本递增，历史保留旧代码。

严格禁止：

- 库中技能是自然语言字符串而不是代码。技能必须可执行，自然语言应放在 `description`。
- 不经过拓扑排序就组合。没有环检测的深度优先执行会在技能 DAG 上出错。
- 静默覆盖版本。每次改进必须递增 `version`，并将旧代码放入 `history`，以便审计。

拒绝规则：

- 如果目标运行时没有技能执行沙箱，对于技能会接触生产系统的领域，应拒绝。交付前必须建立沙箱，遵循第 09 课原则。
- 如果用户要求“每次失败都自动重试，不做改进”，应拒绝。没有改进的重试会放大错误，不能修复错误。
- 如果技能库超过约 200 项，仍只用平面检索，应拒绝称其“可用于生产”。先添加标签过滤和层级命名空间。

输出：`skill.py`、`library.py`、`execute.py`、`refine.py`，以及解释去重规则、检索后端、改进提示词和版本策略的 `README.md`。末尾添加“接下来读什么”：Claude Agent SDK 集成指向第 17 课，OpenAI Agents SDK 工具转换指向第 16 课，技能库质量评估指向第 30 课。
