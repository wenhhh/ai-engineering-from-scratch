# 并行工具调用与工具流式传输（Parallel Tool Calls and Streaming with Tools）

> 三次独立天气查询串行执行，就是三次往返。并行运行后，总时间缩短到最慢一次调用的耗时。如今所有前沿提供商都能在一轮中发出多个工具调用。收益实在，但连接机制有细节。本课讲解并行扇出（Fan-out）与流式参数重组两部分，重点关注 id 关联陷阱。

**Type:** Build
**Languages:** Python (stdlib, thread pool + streaming harness)
**Prerequisites:** 阶段 13 · 02（深入函数调用）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释为什么存在 `parallel_tool_calls: true`，以及何时应禁用。
- 并行扇出期间，将流式参数片段关联到正确的工具调用 id。
- 将部分 `arguments` 字符串重组为完整 JSON，不提前解析。
- 运行三个城市的天气基准测试，展示串行与并行延迟。

## 问题（The Problem）

没有并行调用时，智能体回答“班加罗尔、东京和苏黎世的天气怎么样”的过程如下：

```
user -> LLM
LLM -> call get_weather(Bengaluru)
host -> run executor, reply with result
LLM -> call get_weather(Tokyo)
host -> run executor, reply with result
LLM -> call get_weather(Zurich)
host -> run executor, reply with result
LLM -> final text answer
```

三次 LLM 往返，每次还要支付执行器延迟，总实际耗时约为理想值的 4 倍。

使用并行调用后：

```
user -> LLM
LLM -> call get_weather(Bengaluru); call get_weather(Tokyo); call get_weather(Zurich)
host -> run all three executors concurrently, reply with three results
LLM -> final text answer
```

一次 LLM 往返。执行器耗时是三者的最大值，而非总和。OpenAI、Anthropic 和 Gemini 的生产基准显示，扇出工作负载的实际耗时减少了 60% 到 70%。

代价是关联更复杂。三个调用乱序完成时，结果必须携带匹配的 `tool_call_id`，模型才能正确对齐。流式返回时，你必须在执行前将部分参数片段组装成完整 JSON。Gemini 3 增加唯一 id，部分原因就是解决现实中同一工具的两个并行调用无法区分的问题。

## 概念（The Concept）

### 启用并行（Enabling parallel）

- **OpenAI。** `parallel_tool_calls: true` 默认启用。设为 `false` 强制串行。
- **Anthropic。** 通过 `disable_parallel_tool_use: false` 启用并行（Claude 3.5 及以上默认值）。设为 `true` 使用串行。
- **Gemini。** 始终支持并行；`tool_config.function_calling_config.mode = "AUTO"` 让模型决定。

当工具存在顺序依赖（先 `create_file` 再 `write_file`）、一个调用的输出影响另一个的输入，或限流器无法承受扇出时，应禁用并行。

### Id 关联（Id correlation）

模型发出的每次调用都有一个 `id`。宿主返回的每个结果必须包含同一个 id，否则结果就有歧义。

- **OpenAI。** 每条 tool 角色消息中的 `tool_call_id`。
- **Anthropic。** 每个 `tool_result` 块中的 `tool_use_id`。
- **Gemini。** 每个 `functionResponse` 中的 `id`（Gemini 3 及以上；Gemini 2 按名称匹配，遇到同名并行调用就失效）。

### 并发运行调用（Running calls concurrently）

宿主在各自的线程、协程或远程工作进程上运行每个调用的执行器。最简单的运行框架采用线程池；生产环境使用 asyncio 配合 `asyncio.gather`，或使用结构化并发（Structured concurrency）。完成顺序无法预测，id 才是标识。

一个常见问题是按调用列表顺序而非完成顺序返回结果。这通常能工作，因为模型只关心 `tool_call_id`；但若某个结果丢失或重复，乱序提交会增加调试难度。优先按完成顺序回复，并显式携带 id。

### 流式工具调用（Streaming tool calls）

模型流式输出时，`arguments` 分片到达。三个并行调用的三组片段流在线路上交错传输。每个 id 都需要一个累积器（Accumulator）。

各提供商的形态：

- **OpenAI。** 每个片段是 `choices[0].delta.tool_calls[i].function.arguments`（部分字符串）。片段携带 `index`（调用列表中的位置）。按 index 累积，在 `id` 首次出现时读取，并在 `finish_reason = "tool_calls"` 时解析 JSON。
- **Anthropic。** 流事件先是 `message_start`，随后每个类型为 `tool_use` 的块都有一个 `content_block_start`（包含 id、name、空 input）。`content_block_delta` 事件携带 `input_json_delta` 片段。`content_block_stop` 结束各块。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3 及以上）输出带 `functionCallId` 的片段，使调用可以清楚地交错。在 Gemini 3 之前，流式传输一次返回一个完整调用。

### 部分 JSON 与提前解析陷阱（Partial JSON and the parse-early trap）

`arguments` 完整之前无法解析。`{"city": "Beng` 这样的部分 JSON 无效，会抛出异常。正确门禁是提供商的调用结束信号：OpenAI 的 `finish_reason = "tool_calls"`、Anthropic 的 `content_block_stop` 或 Gemini 的流结束事件。只有此时才尝试 `json.loads`。更稳健的做法是使用增量 JSON 解析器，在结构完成时产出事件；OpenAI 的流式指南推荐用它实现实时“思考中”指示器的用户体验。用大括号计数判断完整性不可靠，带引号字符串或转义内容中的大括号会造成误判，因此只能作为非正式调试启发式方法。

### 乱序完成（Out-of-order completion）

```
call_A: fast API, returns first
call_B: slow API, returns second
call_C: median API, returns third
```

宿主回复仍必须引用 id：

```
[{role: "tool", tool_call_id: "call_A", content: ...},
 {role: "tool", tool_call_id: "call_B", content: ...},
 {role: "tool", tool_call_id: "call_C", content: ...}]
```

在 OpenAI 或 Anthropic 上，回复中的顺序不影响正确性。Gemini 也接受任意顺序，只要 id 匹配。

### 基准测试：串行与并行（Benchmark: sequential vs parallel）

`code/main.py` 中的运行框架模拟延迟分别为 400、600 和 800 ms 的三个执行器。串行总耗时 1800 ms，并行耗时 max(400, 600, 800) = 800 ms。差异是常数，而不是比例，因此工具数量越多，节省越多。

现实中的注意事项：并行调用会给下游 API 带来压力。对受限流的服务进行 10 路扇出会失败。阶段 13 · 17 讲解网关级背压（Backpressure）；重试语义计划在后续阶段介绍。

### 流式扇出的实际耗时（Streaming fan-out wall-clock）

如果模型本身流式输出，一个调用的参数完成后就可开始执行，无需等待全部调用完成。这是 OpenAI 文档描述的一项优化，但并非所有 SDK 都暴露它。本课运行框架实现了这一点：模拟流一旦产出完整参数对象，宿主立即启动该调用。

```figure
tp-parallel-fanout
```

## 实际应用（Use It）

`code/main.py` 有两部分。前半部分用 `concurrent.futures.ThreadPoolExecutor` 串行和并行运行三个模拟天气调用，打印实际耗时。后半部分重放一个假的流式响应：三个并行调用的 `arguments` 片段交错出现在同一条流中，并用 `StreamAccumulator` 按 id 重组。不用 LLM，不用网络，只有重组逻辑。

重点查看：

- 相同的模拟延迟下，串行计时达到 1.8 秒，并行计时达到 0.8 秒。
- 累积器按 id 缓冲以处理乱序到达的片段，并且仅在每次调用的 JSON 完整后解析。
- 某个 id 的参数完成后就启动执行器，而不是等待所有流结束。

## 交付成果（Ship It）

本课产出 `outputs/skill-parallel-call-safety-check.md`。给定工具注册表，技能审计哪些工具能安全并行、哪些存在顺序依赖、哪些会压垮下游速率限制，并返回带逐工具 `parallel_safe` 标记的修订注册表。

## 练习（Exercises）

1. 运行 `code/main.py`，改变模拟延迟。确认并行与串行耗时之比约为 `max/sum`（实际运行受线程调度、序列化和运行框架开销影响，会略偏离理想值）。什么样的延迟分布会使并行不再重要？

2. 扩展累积器，处理“调用在流中途取消”：丢弃其缓冲区并输出 `cancelled` 事件。哪家提供商明确记录了这种情况？查看 Anthropic 的 `content_block_stop` 语义和 OpenAI 的 `finish_reason: "length"` 行为。

3. 用 `asyncio.gather` 替换线程池，对两者做基准测试。因为上下文切换成本更低，异步方式应有小幅收益，但前提是执行器进行真实 I/O。

4. 选择两个不应并行的工具，例如先 `create_file` 再 `write_file`。在注册表添加 `ordering_dependency` 图，并依据该图为并行扇出设置门禁。这是依赖感知调度的最小机制，后续智能体工程阶段会将其形式化。

5. 阅读 OpenAI 的并行函数调用章节和 Anthropic 的 `disable_parallel_tool_use` 文档。找出 Anthropic 建议禁用并行的一类现实工具。（提示：对同一资源进行会产生实际后果的修改。）

## 关键术语（Key Terms）

| 术语 | 通俗说法 | 实际含义 |
|------|----------------|------------------------|
| 并行工具调用（Parallel tool calls） | “一轮扇出” | 模型在单条 assistant 消息中发出多个工具调用 |
| `parallel_tool_calls` | “OpenAI 的标志” | 启用或禁用多调用输出 |
| `disable_parallel_tool_use` | “Anthropic 的反向开关” | 退出并行的标志，默认启用并行 |
| 工具调用 id（Tool call id） | “关联句柄” | 每次调用的标识符，结果消息必须回传 |
| 累积器（Accumulator） | “流缓冲区” | 每个 id 一个字符串缓冲区，用于部分 `arguments` 片段 |
| 乱序完成（Out-of-order completion） | “最快的先完成” | 并行调用按不可预测的顺序结束，靠 id 关联 |
| 依赖图（Dependency graph） | “顺序约束” | 工具输出成为其他工具的输入，无法并行 |
| 提前解析陷阱（Parse-early trap） | “JSON.parse 炸了” | 尝试解析不完整的 `arguments` 字符串 |
| `streamFunctionCallArguments` | “Gemini 3 功能” | 每次调用具有唯一 id 的流式参数片段 |
| 按完成顺序回复（Completion-order reply） | “不用等全部完成” | 结果到达就按 id 返回 |

## 延伸阅读（Further Reading）

- [OpenAI：并行函数调用（Parallel function calling）](https://platform.openai.com/docs/guides/function-calling#parallel-function-calling)：默认行为与退出并行的标志
- [Anthropic — 并行工具使用（Parallel tool use）](https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use) — `disable_parallel_tool_use` 与结果批处理。
- [Google：Gemini 函数调用并行章节（Gemini function calling parallel section）](https://ai.google.dev/gemini-api/docs/function-calling)：从 Gemini 3 开始的 id 关联并行调用
- [OpenAI：使用工具的流式响应（Streaming responses with tools）](https://platform.openai.com/docs/api-reference/responses-streaming)：OpenAI 流中的参数分片重组
- [Anthropic：流式消息（Streaming messages）](https://docs.anthropic.com/en/api/messages-streaming)：携带 `input_json_delta` 的 `content_block_delta`
