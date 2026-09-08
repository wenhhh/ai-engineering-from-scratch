---
name: tool-registry
description: 构建支持 JSON 结构定义（JSON Schema）验证、并行分派和可观测性（Observability）的生产工具目录与注册表（Tool registry）。
version: 1.0.0
phase: 14
lesson: 06
tags: [function-calling, tools, schema, validation, bfcl, parallel-tools]
---

给定任务领域，生成工具目录，使智能体能够在 BFCL V4 各维度上可靠使用工具：智能体式（Agentic）、多轮（Multi-turn）、真实请求（Live）、合成请求（Non-live）、幻觉（Hallucination）。

请生成：

1. 工具定义。每个工具包含：`name`（snake_case）、`description`（告诉模型何时使用，以及何时不使用）、输入的 JSON 结构定义（JSON Schema，包含带类型的属性、必填字段、适用时的枚举、数值的 minimum/maximum）、每个工具的超时和沙箱策略（文件系统范围、网络、内存上限）。
2. 描述质量检查。对每条描述检查“这是否告诉模型何时应选这个工具，而不是其他工具？”如果两个工具的描述重叠，应拒绝并重写。
3. 并行分派计划。对每个现实任务，确定哪些工具调用相互独立、可以并行，哪些必须串行。输出预期分派图。
4. 验证策略。枚举检查、类型强制转换规则，例如“接受字符串形式的整数，拒绝字符串形式的浮点数”，以及必填字段约束。每次失败都返回结构化观察字符串，绝不向循环抛出异常。
5. 可观测性。每个工具输出 OpenTelemetry GenAI `tool_call` 跨度（Span），包含属性 `gen_ai.tool.name`、`gen_ai.tool.call.id`、`gen_ai.tool.call.arguments`、`gen_ai.tool.call.result`；内容策略有要求时使用引用，而不是内联内容。

严格禁止：

- 通用 shell 或命令执行工具。应拒绝，并拆为具体动作：`git_status`、`fs_read`、`npm_test`。
- 参数取值属于封闭集合，却没有枚举。枚举验证是发现偏移成本最低的方法。
- 两个不同工具使用同一描述。模型无法可靠地在它们之间选择。
- `description` 只说工具做什么，例如“将两个数相加”。必须说明何时应选它而不是替代工具。
- 没有超时。每次工具调用都必须有上限。

拒绝规则：

- 如果单个智能体的工具列表超过 30 个，应拒绝并建议子智能体委派（Subagent delegation，第 17 课）。
- 如果任何工具执行破坏性操作却没有确认门禁，应拒绝并指向第 09 课（权限、沙箱）。
- 如果任务是计算机使用，如点击、键入、截图，应拒绝并指向第 21 课；这属于带视觉行动的另一种工具形态。

输出：可直接用于 Anthropic / OpenAI / Gemini SDK 调用的 JSON 工具目录、分派图、验证策略文档，以及注册表应通过的 BFCL 式小型评估。

末尾添加“接下来读什么”：第 09 课（沙箱隔离）、第 23 课（OTel GenAI 跨度）或第 30 课（评估驱动）。
