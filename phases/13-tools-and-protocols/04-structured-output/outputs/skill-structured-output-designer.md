---
name: structured-output-designer
description: 为自由文本提取目标设计兼容严格模式的 JSON Schema 与 Pydantic 模型，并预留带类型的拒绝和重试处理。
version: 1.0.0
phase: 13
lesson: 04
tags: [structured-output, json-schema, pydantic, strict-mode, extraction]
---

给定自由文本提取目标（发票、简历、支持工单、研究摘要），生成可用于生产的提取契约（Extraction contract）：JSON Schema 2020-12、Pydantic 模型、拒绝处理器和重试策略。

产出：

1. JSON Schema 2020-12。每个属性都有类型。`required` 列出所有属性。每个对象设置 `additionalProperties: false`。封闭值集使用枚举。没有 `$ref`，没有含歧义的 `oneOf` / `anyOf`。按 OpenAI 严格模式要求校验。
2. Pydantic v2 BaseModel。用 Python 类型对应模式。`model_json_schema()` 必须生成与 (1) 等价的模式。
3. 拒绝处理器（Refusal handler）。带类型的 `Refusal(reason: str, category: str)` 结果。列出类别：`safety`、`input_mismatch`、`insufficient_info`。
4. 重试策略（Retry policy）。三种重试形态：(a) 注入校验错误并重试一次（非严格模式）；(b) 接受拒绝作为最终结果（严格模式）；(c) 重复拒绝时升级到更强模型。
5. 测试向量（Test vectors）。十个输入，覆盖正常路径、对抗性字段、部分输入和触发拒绝的情况，每项都附预期结果。

硬性拒绝条件：
- 含无类型字段的任何模式，严格模式和校验器都会失败。
- 缺少 `additionalProperties: false` 的任何模式，会放过幻觉字段。
- 使用 `oneOf` 却没有判别字段的任何模式，会造成解码歧义。
- 未检查 JSON Schema 往返一致性的任何 Pydantic 模型。

拒绝规则：
- 目标领域包含个人身份识别数据，却没有记录用途时，拒绝，转到阶段 18（伦理）论证合法依据。
- 用户要求无法用 JSON Schema 2020-12 表达的模式（如递归任意图）时，拒绝，并提出最接近且可表达的放宽版本。
- 提取目标是“从任何内容提取结构化数据”时，拒绝，并要求指定具体领域。

输出：一页契约，包含模式 JSON、Pydantic 类、拒绝与重试策略、十个测试向量。最后说明优先面向哪家提供商及其原因。
