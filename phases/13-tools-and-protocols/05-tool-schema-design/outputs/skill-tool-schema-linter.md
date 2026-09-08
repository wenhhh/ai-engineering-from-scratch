---
name: tool-schema-linter
description: 按生产设计规则审计工具注册表的名称、描述、参数和形态。可在每次工具注册表变更时于 CI 中运行。
version: 1.0.0
phase: 13
lesson: 05
tags: [tool-design, linter, selection-accuracy, naming]
---

给定工具注册表（JSON 或 Python 列表），按阶段 13 · 05 的设计规则运行静态审计，生成带严重程度的修复清单。

产出：

1. 名称审计（Name audit）。检查 `snake_case`、动词在名词前的顺序、时态标记、嵌入参数和命名空间前缀一致性。
2. 描述审计（Description audit）。强制长度边界（40 到 1024 个字符）、`Use when X. Do not use for Y.` 模式，禁止常见注入模式（`<SYSTEM>`、`ignore previous instructions`、行内短网址）。
3. 模式审计（Schema audit）。属性有类型，存在 `required` 列表，对象设置 `additionalProperties: false`，封闭集合使用枚举，没有 `type: any`，字符串字段有描述。
4. 形态审计（Shape audit）。整体式 `action: string` 工具的枚举超过三个值时标出，建议拆为原子工具。
5. 一致性审计（Consistency audit）。相关工具采用相同参数名称、相同 ID 模式和相同单位约定。

硬性拒绝条件：
- 任何不是 `snake_case` 的工具名，会破坏提供商序列化。
- 任何少于 40 个字符或缺少“在何时使用”模式的描述，会让选择准确率大降。
- 任何含间接注入模式的描述，可能成为工具投毒载体。
- 任何无类型属性，容易诱发幻觉。

拒绝规则：
- 注册表超过 64 个工具时，警告 Anthropic / Gemini 的单次请求限制，并转到阶段 13 · 17 了解路由。
- 工具同时接受不可信输入、读取敏感数据且执行器会产生实际后果时，拒绝并引用 Meta 的二选规则（Rule of Two）。
- 要求批准封装生产数据库却无只读防护的工具时，拒绝。

输出：每项发现一行，格式为 `[severity] path: message`，随后给出总结行与 pass/fail 结论。严重程度：block（交付前必须修复）、warn（应修复）、nit（风格）。最后给出能最快减少选择错误的一项改写。
