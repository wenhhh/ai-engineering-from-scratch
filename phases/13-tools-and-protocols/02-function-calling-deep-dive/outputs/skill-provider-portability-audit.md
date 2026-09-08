---
name: provider-portability-audit
description: 审计针对某家提供商的函数调用集成，找出移植到另外两家时会失效的部分。
version: 1.0.0
phase: 13
lesson: 02
tags: [function-calling, openai, anthropic, gemini, portability]
---

给定一家提供商（OpenAI、Anthropic 或 Gemini）上的函数调用（Function calling）集成，生成可移植性审计（Portability audit），列出同一逻辑交付到另外两家时出现的每一项字段改名、行为差异和硬限制冲突。

产出：

1. 声明差异（Declaration diff）。针对集成中的每个工具，展示另外两家分别需要的封装、字段改名和模式转换。标出目标提供商不支持的任何 JSON Schema 构造（Gemini：OpenAPI 3.0 子集；OpenAI 严格模式：没有 `$ref`，没有歧义 `oneOf`）。
2. 响应差异（Response diff）。记录工具调用在各家响应形态中的位置（`tool_calls[]`、`content[]` 块或 `parts[]` 条目），以及谁负责解析 `arguments`（OpenAI 上是字符串，Anthropic 和 Gemini 上是对象）。
3. `tool_choice` 差异。把集成当前的选择设置（auto / forbid / force / required）映射为目标提供商形态，标出缺失模式。
4. 限制冲突（Limit collisions）。报告工具数量（128 / 64 / 64）、模式深度（5 / 10 / 实际无上限）和每个参数的长度上限。任何超出目标提供商限制的集成都报 block 级问题。
5. 严格模式映射（Strict-mode mapping）。说明目标是否保留严格模式语义。OpenAI 的 `strict: true` 在 Anthropic 上没有完全等价项；Gemini 的 `responseSchema` 近似，但位于请求级。

硬性拒绝条件：
- 在非 OpenAI 目标上假设 `arguments` 是字符串的任何集成，会静默产生错误结果。
- 移植到 Anthropic 或 Gemini 时工具数量超过 64，且没有路由器的任何集成。
- 目标为 OpenAI 严格模式时，在模式中使用 `$ref` 的任何集成。

拒绝规则：
- 要求移植依赖无对应功能的提供商专属特性的集成时（如 OpenAI Responses API 有状态轮次、Anthropic 计算机使用块），拒绝，并解释哪个特性在目标上没有等价项。
- 要求选出赢家时，拒绝。选择取决于宿主的严格模式需求、成本特征和并行调用要求。

输出：一页审计，包含逐工具差异表、限制表，以及各目标提供商的最终“移植结论”（ship / needs-router / blocked-by-feature）。最后用一句话指出收益最大的迁移改动。
