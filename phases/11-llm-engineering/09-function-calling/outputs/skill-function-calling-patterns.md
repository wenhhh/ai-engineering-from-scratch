---
name: skill-function-calling-patterns
description: 在生产环境实现函数调用的决策框架，涵盖工具设计、错误处理、安全及提供商模式
version: 1.0.0
phase: 11
lesson: 09
tags: [function-calling, tool-use, agents, mcp, security, openai, anthropic]
---

# 函数调用模式（Function Calling Patterns）

构建使用工具的大语言模型应用时，应用此决策框架。

## 何时使用函数调用（When to use function calling）

**以下情况使用函数调用：**
- 模型需要实时数据（天气、股价、数据库查询）。
- 任务需要副作用（发送邮件、创建记录、部署代码）。
- 模型必须根据用户意图在多种操作间选择。
- 正在构建与外部系统交互的智能体。

**以下情况改用结构化输出：**
- 需要从文本提取数据（无须外部调用）。
- 输出是最终产物，而不是中间步骤。
- 只有一种模式，不需要从多个工具中选择。

**以下情况同时使用两者：**
- 模型调用工具，再将工具结果整理为特定输出格式。

## 工具设计准则（Tool design guidelines）

1. **一个工具，一个操作。** 名为 `manage_database`、同时处理查询、插入、更新及删除的工具范围过大。拆为 `query_records`、`insert_record`、`update_record`。工具越具体，模型选择越准确。

2. **描述就是提示词。** 模型阅读工具描述来决定选择。像给初级开发者写指令一样编写描述，不仅说明工具做什么，还要说明返回什么。

3. **用枚举约束。** 参数有 3-10 个有效值时使用枚举。若不约束，模型会自行编造字符串，如 "celsius"、"Celsius"、"C"、"metric"。

4. **工具越少越好。** GPT-4o 能很好处理 5-10 个工具。超过 20 个时选择准确率下降；超过 50 个时，预计有 10-15% 的工具选择错误。将相关功能分组或使用路由层。

5. **必填就应确实必填。** 只有缺少该参数工具就无法工作时，才将其标为必填。具有合适默认值的可选参数能减少工具调用失败。

## 提供商特定模式（Provider-specific patterns）

### OpenAI（GPT-4o、o3、GPT-4o-mini）

```python
tools=[{"type": "function", "function": {"name": ..., "parameters": ...}}]
tool_choice="auto"       # model decides
tool_choice="required"   # must call at least one tool
tool_choice={"type": "function", "function": {"name": "specific_tool"}}
```

- 支持并行工具调用（一次响应有多个 `tool_calls`）。
- 工具调用 ID 必须随结果传回。
- `gpt-4o-mini` 成本低至十分之一，能很好处理简单工具路由。
- 结构化输出模式可用于工具参数，保证符合模式。

### Anthropic（Claude 3.5 Sonnet、Claude 4 Opus）

```python
tools=[{"name": ..., "description": ..., "input_schema": ...}]
tool_choice={"type": "auto"}     # model decides
tool_choice={"type": "any"}      # must call at least one tool
tool_choice={"type": "tool", "name": "specific_tool"}
```

- 工具调用以 `type: "tool_use"` 内容块出现。
- 结果以 `type: "tool_result"` 放入用户消息。
- 字段名是 `input_schema`，不是 `parameters`（常见迁移错误）。
- 支持每次响应包含多个工具调用。

### Google（Gemini 2.0 Flash、Gemini 2.0 Pro）

```python
function_declarations=[{"name": ..., "description": ..., "parameters": ...}]
function_calling_config={"mode": "AUTO"}   # or "ANY" or "NONE"
```

- 顶层使用 `function_declarations`。
- 结果通过 `function_response` 部分返回。
- 支持并行函数调用。

### 开源模型（Open-source models：Llama 3、Hermes、Qwen）

- 没有标准化格式，随模型及服务框架变化。
- Hermes 格式（NousResearch）是最常见的微调约定。
- vLLM 为受支持模型提供 OpenAI 兼容的工具调用。
- Ollama 为兼容模型提供基本工具调用。
- 上线前测试工具选择准确率；在 Berkeley 函数调用排行榜上，开放模型准确率比 GPT-4o 低 15-30%。

## 错误处理模式（Error handling patterns）

### 返回结构化错误（Return structured errors）

```json
{"error": true, "message": "City 'Toky' not found. Did you mean 'Tokyo'?", "code": "NOT_FOUND", "suggestions": ["Tokyo"]}
```

包含可据以行动的信息。“未找到”不好，“未找到，你指的是 X 吗？”更好。模型利用错误信息自我纠正。

### 重试策略（Retry strategy）

1. 工具调用因可纠正错误失败（拼写错误、错误枚举值）。
2. 将错误作为工具结果传回模型。
3. 模型调整并重试。
4. 每次工具调用最多重试 3 次。
5. 失败 3 次后，将错误返回用户。

### 超时处理（Timeout handling）

为所有工具执行设置超时，30 秒是合理默认值。工具超时时，返回结构化超时错误，让模型能通知用户，而不是一直挂起。

## 安全清单（Security checklist）

| 检查项 | 原因 | 做法 |
|-------|-----|-----|
| 函数允许列表 | 防止任意代码执行 | 仅注册用户需要的工具 |
| 校验参数类型 | 防止类型混淆攻击 | 执行前检查类型 |
| 清理字符串参数 | 防止注入 | 拒绝或转义特殊字符 |
| 数据库查询参数化 | 防止 SQL 注入 | 绝不直接传递模型生成的 SQL |
| 过滤工具结果 | 防止数据泄漏 | 移除 API 密钥、PII、内部错误 |
| 限制工具调用频率 | 防止循环失控 | 每段对话最多 10-20 次调用 |
| 记录所有工具调用 | 留下审计轨迹 | 保存工具名、参数、结果、时间戳 |
| 阻止路径遍历 | 防止文件系统访问 | 文件工具拒绝 `..` 和绝对路径 |
| 沙箱化代码执行 | 防止系统访问 | 使用容器或受限内置函数 |
| 校验返回大小 | 防止上下文填塞 | 截断超过 10KB 的结果 |

## 性能优化（Performance optimization）

- **并行调用（Parallel calls）：** 模型请求多个独立工具时，用 `asyncio.gather()` 或 `concurrent.futures` 并发执行。
- **缓存（Caching）：** 缓存同一会话中相同参数的工具结果（天气在 60 秒内不会变化）。
- **流式输出（Streaming）：** 获取工具结果的同时，流式输出模型最终回复。
- **工具裁剪（Tool pruning）：** 上下文紧张时，只包含与当前查询相关的工具定义（使用分类器过滤）。
- **小模型路由（Smaller models for routing）：** 用 `gpt-4o-mini` 或 `claude-haiku-4-5` 选择工具，再将结果传给更强模型综合。

## 常见失败模式（Common failure patterns）

| 失败 | 原因 | 修复 |
|---------|-------|-----|
| 选错工具 | 描述含糊 | 用明确触发词重写描述 |
| 缺少必填参数 | 模型忘记参数 | 在参数描述中加入清晰示例 |
| 无限工具循环 | 模型不断调用同一工具 | 设置迭代上限（5-10），检测重复调用 |
| 参数幻觉 | 模型编造看似合理但错误的值 | 使用枚举，根据已知值校验 |
| 工具结果过大 | API 返回 100KB 数据 | 反馈前截断或摘要 |
| 模型忽略工具结果 | 结果格式令人困惑 | 返回字段名清晰、干净的 JSON |
