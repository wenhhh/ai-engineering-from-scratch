# 深入函数调用：OpenAI、Anthropic、Gemini（Function Calling Deep Dive — OpenAI, Anthropic, Gemini）

> 三家前沿提供商在 2024 年收敛到相同的工具调用循环，随后却在其他方面分道扬镳。OpenAI 使用 `tools` 和 `tool_calls`，Anthropic 使用 `tool_use` 和 `tool_result` 块，Gemini 使用 `functionDeclarations` 和唯一 id 关联。本课并列比较三者，让在一家提供商上交付的代码不会在移植时失效。

**Type:** Build
**Languages:** Python (stdlib, schema translators)
**Prerequisites:** 阶段 13 · 01（工具接口）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说明 OpenAI、Anthropic 和 Gemini 函数调用载荷的三种形态差异：声明、调用和结果。
- 将一个工具声明转换为三家提供商的格式，并预测严格模式约束的差别。
- 在各家提供商中使用 `tool_choice` 强制、禁止或自动选择工具调用。
- 了解各提供商的硬性限制（工具数量、模式深度、参数长度），以及违反限制时各自发出的错误特征。

## 问题（The Problem）

函数调用请求的形态因提供商而异。以下是 2026 年生产技术栈中的三个具体例子：

**OpenAI Chat Completions / Responses API。** 传入 `tools: [{type: "function", function: {name, description, parameters, strict}}]`。模型响应包含 `choices[0].message.tool_calls: [{id, type: "function", function: {name, arguments}}]`，其中 `arguments` 是必须由你解析的 JSON 字符串。严格模式（`strict: true`）通过受约束解码（Constrained decoding）强制符合模式。

**Anthropic Messages API。** 传入 `tools: [{name, description, input_schema}]`。响应以 `content: [{type: "text"}, {type: "tool_use", id, name, input}]` 返回。`input` 已经解析，是对象而不是字符串。你用一条新的 `user` 消息回复，其中包含一个 `{type: "tool_result", tool_use_id, content}` 块。

**Google Gemini API。** 传入 `tools: [{functionDeclarations: [{name, description, parameters}]}]`，嵌套在 `functionDeclarations` 下。响应以 `candidates[0].content.parts: [{functionCall: {name, args, id}}]` 返回，其中 `id` 在 Gemini 3 及以上版本中唯一，用于关联并行调用。你用 `{functionResponse: {name, id, response}}` 回复。

循环相同，字段名、嵌套、字符串与对象的约定、关联机制却不同。团队在 OpenAI 上写一个天气智能体，仅仅迁移这些连接代码就要花两天移植到 Anthropic，再花一天移植到 Gemini。

本课构建一个转换器（Translator），将三种格式统一为一个规范工具声明，并在边界处路由。阶段 13 · 17 将同一模式泛化为 LLM 网关（Gateway）。

## 概念（The Concept）

### 共同结构（The common structure）

每家提供商都需要五样东西：

1. **工具列表（Tool list）。** 每个工具的名称、描述和输入模式。
2. **工具选择（Tool choice）。** 强制特定工具、禁止工具或让模型决定。
3. **调用输出（Call emission）。** 指明工具及参数的结构化输出。
4. **调用 id（Call id）。** 将响应关联到正确调用，对并行调用尤为重要。
5. **结果注入（Result injection）。** 把结果关联回调用的消息或内容块。

### 逐字段形态差异（Shape diffs, field by field）

| 方面 | OpenAI | Anthropic | Gemini |
|--------|--------|-----------|--------|
| 声明封装 | `{type: "function", function: {...}}` | `{name, description, input_schema}` | `{functionDeclarations: [{...}]}` |
| 模式字段 | `parameters` | `input_schema` | `parameters` |
| 响应容器 | assistant 消息上的 `tool_calls[]` | 类型为 `tool_use` 的 `content[]` | 类型为 `functionCall` 的 `parts[]` |
| 参数类型 | 字符串化 JSON | 已解析对象 | 已解析对象 |
| Id 格式 | `call_...`（OpenAI 生成） | `toolu_...`（Anthropic） | UUID（Gemini 3+） |
| 结果块 | `tool` 角色，`tool_call_id` | 包含 `tool_result`、`tool_use_id` 的 `user` | 具有匹配 `id` 的 `functionResponse` |
| 强制工具 | `tool_choice: {type: "function", function: {name}}` | `tool_choice: {type: "tool", name}` | `tool_config: {function_calling_config: {mode: "ANY"}}` |
| 禁止工具 | `tool_choice: "none"` | `tool_choice: {type: "none"}` | `mode: "NONE"` |
| 严格模式约束 | `strict: true` | 模式即约束（始终强制） | 请求级 `responseSchema` |

### 你确实会遇到的限制（Limits you will actually hit）

- **OpenAI。** 每次请求 128 个工具，模式深度 5，参数字符串 <= 8192 字节。严格模式要求没有 `$ref`，没有存在重叠的 `oneOf`/`anyOf`/`allOf`，且每个属性都列入 `required`。
- **Anthropic。** 每次请求 64 个工具。模式深度实际上无上限，但实用上限是 10。没有严格模式标志；模式是一份契约，模型通常会遵循。
- **Gemini。** 每次请求 64 个函数。模式类型是 OpenAPI 3.0 子集，与 JSON Schema 2020-12 略有不同。从 Gemini 3 起，并行调用具有唯一 id。

### 工具选择行为（`tool_choice` behavior）

三家都支持三种模式，只是名称不同。

- **自动（Auto）。** 模型选择工具或文本，默认模式。
- **必需 / 任意（Required / Any）。** 模型必须调用至少一个工具。
- **禁用（None）。** 模型不得调用工具。

此外，各家还有各自特有的模式：

- **OpenAI。** 按名称强制使用特定工具。
- **Anthropic。** 按名称强制使用特定工具；`disable_parallel_tool_use` 标志区分单次调用与多次调用。
- **Gemini。** 无论模型意图如何，`mode: "VALIDATED"` 都把每个响应送入模式校验器。

### 并行调用（Parallel calls）

OpenAI 的 `parallel_tool_calls: true`（默认）在一条 assistant 消息中发出多个调用。你全部执行，再用批量 tool 角色消息回复，每个 `tool_call_id` 对应一个条目。Anthropic 过去使用单调用；`disable_parallel_tool_use: false`（自 Claude 3.5 起为默认）启用多调用。Gemini 2 允许并行调用，但不提供稳定 id；Gemini 3 添加 UUID，使乱序响应也能准确关联。

### 流式传输（Streaming）

三家都支持流式工具调用，但线上传输格式不同：

- **OpenAI。** `tool_calls[i].function.arguments` 的增量片段逐步到达。你持续累积，直到 `finish_reason: "tool_calls"`。
- **Anthropic。** 块开始 / 块增量 / 块结束事件。`input_json_delta` 片段携带部分参数。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3 新增）输出带 `functionCallId` 的片段，让多个并行调用可以交错传输。

阶段 13 · 03 深入讲解并行与流式重组。本课聚焦声明和单次调用的形态。

### 错误与修复（Errors and repair）

无效参数错误也各不相同。

- **OpenAI（非严格模式）。** 模型返回 `arguments: "{bad json}"`，JSON 解析失败，你注入错误消息并再次调用。
- **OpenAI（严格模式）。** 校验发生在解码过程中，不可能出现无效 JSON，但可能出现 `refusal`。
- **Anthropic。** `input` 可能包含意外字段；模式是指导性的。应在服务端校验。
- **Gemini。** OpenAPI 3.0 的特殊之处：对象字段上的 `enum` 会被静默忽略，应自行校验。

### 转换器模式（The translator pattern）

代码中的规范工具声明如下，形态由你决定：

```python
Tool(
    name="get_weather",
    description="Use when ...",
    input_schema={"type": "object", "properties": {...}, "required": [...]},
    strict=True,
)
```

三个小函数将其转换为三家提供商的形态。`code/main.py` 中的运行框架正是如此，然后让一个假工具调用往返经过各提供商的响应形态。无需网络，因为本课教授的是数据形态，不是 HTTP。

生产团队会将转换器封装到 `AbstractToolset`（Pydantic AI）、`UniversalToolNode`（LangGraph）或 `BaseTool`（LlamaIndex）中。阶段 13 · 17 会交付一个网关，在这三家任意一家前面暴露 OpenAI 形态的 API。

```figure
function-call-args
```

## 实际应用（Use It）

`code/main.py` 定义一个规范 `Tool` 数据类和三个转换器，输出 OpenAI、Anthropic、Gemini 的声明 JSON。随后将每种形态的手工构造提供商响应解析为相同的规范调用对象，展示外表之下相同的语义。运行它，并列比较三份声明。

重点查看：

- 三个声明块仅在封装和字段名称上不同。
- 三个响应块的差别在于调用所在位置：顶层 `tool_calls`、`content[]` 块或 `parts[]` 条目。
- 一个 `canonical_call()` 函数从全部三种响应形态中提取 `{id, name, args}`。

## 交付成果（Ship It）

本课产出 `outputs/skill-provider-portability-audit.md`。给定针对某家提供商的函数调用集成，技能生成可移植性审计：依赖了哪些提供商限制、哪些字段需改名，以及移植到其他各家提供商时会在哪里出问题。

## 练习（Exercises）

1. 运行 `code/main.py`，确认三家提供商的声明 JSON 都序列化自同一个底层 `Tool` 对象。修改规范工具以添加一个枚举参数，确认只有 Gemini 转换器需要处理 OpenAPI 的特殊行为。

2. 为各提供商添加 `ListToolsResponse` 解析器，提取模型在 `list_tools` 或发现调用后返回的工具列表。OpenAI 原生没有这种响应，注意这一不对称性。

3. 实现 `tool_choice` 转换：把规范的 `ToolChoice(mode="force", tool_name="x")` 映射为三家提供商的形态，再映射 `mode="any"` 与 `mode="none"`。核对本课差异表。

4. 选择一家提供商，从头到尾阅读其函数调用指南。找出其模式规范中另外两家不支持的一个字段。候选项：OpenAI 的 `strict`、Anthropic 的 `disable_parallel_tool_use`、Gemini 的 `function_calling_config.allowed_function_names`。

5. 编写一个测试向量：参数违反声明模式的工具调用。通过各提供商的校验器运行它（可用第 01 课的标准库实现代替），记录触发的错误。记录你会选择哪家提供商来满足生产中的严格性需求。

## 关键术语（Key Terms）

| 术语 | 通俗说法 | 实际含义 |
|------|----------------|------------------------|
| 函数调用（Function calling） | “工具使用” | 提供商级的结构化工具调用输出 API |
| 工具声明（Tool declaration） | “工具规格” | 名称 + 描述 + JSON Schema 输入载荷 |
| `tool_choice` | “强制 / 禁止” | 自动 / 必需 / 禁用 / 指定名称模式 |
| 严格模式（Strict mode） | “模式强制执行” | 约束解码以匹配模式的 OpenAI 标志 |
| `tool_use` 块 | “Anthropic 的调用形态” | 含 id、name、input 的内联内容块 |
| `functionCall` 部分 | “Gemini 的调用形态” | 含 name、args 和 id 的 `parts[]` 条目 |
| 字符串参数（Arguments-as-string） | “字符串化 JSON” | OpenAI 以 JSON 字符串而非对象返回参数 |
| 并行工具调用（Parallel tool calls） | “一轮扇出” | 一条 assistant 消息中的多个工具调用 |
| 拒绝（Refusal） | “模型拒绝” | 仅在严格模式下代替调用的拒绝块 |
| OpenAPI 3.0 子集（OpenAPI 3.0 subset） | “Gemini 模式特性” | Gemini 使用与 JSON Schema 相似但略有差别的方言 |

## 延伸阅读（Further Reading）

- [OpenAI：函数调用指南（Function calling guide）](https://platform.openai.com/docs/guides/function-calling)：含严格模式和并行调用的权威参考
- [Anthropic：工具使用概览（Tool use overview）](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview)：`tool_use` 和 `tool_result` 块语义
- [Google：Gemini 函数调用（Gemini function calling）](https://ai.google.dev/gemini-api/docs/function-calling)：并行调用、唯一 id 和 OpenAPI 子集
- [Vertex AI：函数调用参考（Function calling reference）](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling)：Gemini 的企业接口
- [OpenAI：结构化输出（Structured outputs）](https://platform.openai.com/docs/guides/structured-outputs)：严格模式的模式强制执行细节
