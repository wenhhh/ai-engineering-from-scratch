---
name: skill-structured-outputs
description: 根据提供商、可靠性和复杂度选择合适结构化输出（Structured output）策略的决策框架
version: 1.0.0
phase: 11
lesson: 03
tags: [structured-output, json, schema, constrained-decoding, pydantic, function-calling]
---

# 结构化输出策略（Structured Output Strategy）

构建需要结构化数据的 LLM 应用时，使用此决策框架。

## 各方法的适用时机（When to use each approach）

**基于提示词（Prompt-based，“返回 JSON”）：** 仅用于原型。在可容忍偶发解析失败的内部工具中可以接受。添加 try/except 和重试。绝不用于生产流水线。

**JSON 模式（JSON mode，API 标志）：** 需要保证 JSON 有效，但模式简单或灵活时使用。需在应用端验证结构。可用提供商：OpenAI、Anthropic（通过工具使用）、Google。

**模式约束模式（Schema mode，约束解码）：** 用于每次输出都必须匹配特定模式的生产系统。零解析失败，零模式违规。任何生产级抽取或分类任务默认使用此方案。可用实现：OpenAI 结构化输出、Outlines、Guidance。

**函数调用 / 工具使用（Function calling / Tool use）：** 模型需要选择调用哪个函数，而不只是填写参数时使用。你提供多个模式，让模型选择合适的一个。集成已有工具/函数基础设施时也使用此方案。

**Instructor 库：** 希望在任意提供商上获得 Pydantic 验证和自动重试时使用。它为 Python 项目提供最佳开发者体验（Developer experience，DX），可包装 OpenAI、Anthropic、Google 和开源模型。

## 各提供商使用建议（Provider-specific guidance）

**OpenAI：** 使用类型为 `json_schema` 的 `response_format`。约束解码已内置，可直接使用 Pydantic 模型。这是最可靠的结构化输出实现。

**Anthropic：** 通过工具使用获得结构化输出。定义一个采用所需模式的工具，模型返回匹配该模式的工具调用参数。可靠，但需要遵循工具使用 API 模式。

**开源模型（Open-source models，vLLM、Ollama）：** 用 Outlines 或 Guidance 实现约束解码。这些库将 JSON Schema 编译为有限状态机，在生成时屏蔽无效词元。需要本地运行推理。

## 模式设计指南（Schema design guidelines）

1. 尽可能保持模式扁平。超过 2 层的嵌套对象会增加抽取错误。
2. 对类别字段使用枚举。不要依赖模型自行想出正确字符串。
3. 将有歧义的字段设为必填且明确支持 null，而不是可选，以迫使模型作出决定。
4. 给模式属性添加描述，模型会将其视为指令。
5. 除非必要，避免联合类型（Union types，oneOf/anyOf），它们会增加解码复杂度。
6. 为数字设置 minimum/maximum，以捕捉幻觉产生的极端值。
7. 为数组使用 minItems/maxItems，防止空输出或无限增长的输出。

## 常见失败模式与修复（Common failure patterns and fixes）

- **模型将 JSON 包在 Markdown 围栏中**：从基于提示词切换到 JSON 模式或模式约束模式
- **模式有效但事实错误**：在抽取后添加 LLM 作为评委（LLM-as-judge）的验证步骤
- **枚举值不一致**：切换到约束解码，或添加后处理归一化
- **缺少可选字段**：将其设为必填，或在应用代码中添加默认值
- **抽取很慢**：约束解码会增加 5-15% 延迟；若对延迟敏感，降低模式复杂度
- **大数组中元素差异较大**：对输入分块，逐块抽取，再合并结果

## 可靠性阶梯（Reliability ladder）

| 方法 | 解析成功率 | 模式匹配率 | 设置工作量 |
|----------|-------------|-------------|-------------|
| 基于提示词 | ~90% | ~80% | 1 分钟 |
| JSON 模式 | 100% | ~90% | 5 分钟 |
| 模式约束模式 | 100% | ~99% | 15 分钟 |
| 约束解码 | 100% | 100% | 30 分钟 |
| Instructor + 重试 | 100% | ~99.5% | 10 分钟 |
