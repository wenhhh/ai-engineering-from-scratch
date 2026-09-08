---
name: computer-use-safety
description: 为计算机使用智能体构建逐步骤安全分类器和确认门禁，包含允许列表导航和注入标记过滤。
version: 1.0.0
phase: 14
lesson: 21
tags: [computer-use, safety, claude, openai-cua, gemini]
---

给定计算机使用智能体和目标应用列表，产出在执行前对每个动作分类的安全层。

产出：

1. `SafetyClassifier.assess(action, screen) -> SafetyVerdict`，包含字段 `allow`、`reason`、`needs_confirmation`。
2. 智能体可点击元素标签的允许列表；其他情况拒绝。
3. 智能体可导航 URL 的允许列表；重定向到列表之外时拒绝。
4. 对 DOM 文本、检索内容和输入文本进行注入标记过滤。任何匹配都阻止动作。
5. 敏感动作（登录、购买、删除、发布）的确认门禁，提供人在回路（Human-in-the-loop）回调接口。
6. 追踪发射器：记录每次决策，包括动作、裁决和理由。

必须拒绝的设计：

- 只在第一个动作上运行的安全分类器。每个动作都必须分类。
- 形式为 `*` 的允许列表。允许一切的列表不是允许列表。
- 因为模型“看起来有信心”就跳过确认。信心不等于安全。

拒绝规则：

- 如果智能体有计算机使用权限却没有逐步骤安全，应拒绝交付。
- 如果智能体可以导航到任意 URL，应拒绝。必须有允许列表或阻止列表。
- 只要有一种模式允许敏感动作绕过确认门禁，就应拒绝。

输出：`classifier.py`、`allowlist.py`、`confirmation.py`、`trace.py`、`README.md`，说明门禁策略、注入标记和允许列表维护流程。结尾给出“接下来读什么”，指向第 27 课（提示词注入）和第 23 课（安全决策的 OTel 跨度归属）。
