# 工具使用与函数调用（Tool Use and Function Calling）

> Toolformer（Schick 等人，2023）开启了自监督工具标注（Self-supervised tool annotation）。Berkeley Function Calling Leaderboard V4（Patil 等人，2025）确立了 2026 年的标准：40% 智能体式（Agentic）、30% 多轮（Multi-turn）、10% 真实请求（Live）、10% 合成请求（Non-live）、10% 幻觉（Hallucination）。单轮调用已经解决，但记忆、动态决策和长时程工具链尚未解决。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）、阶段 13 · 01（深入函数调用，Function Calling Deep Dive）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 解释 Toolformer 的自监督训练信号：只有执行工具后降低了下一词元损失，才保留工具标注。
- 说出 BFCL V4 的五个评估类别，以及各自衡量什么。
- 用标准库实现工具注册表，支持结构定义（Schema）验证、参数强制转换和沙箱内执行。
- 诊断 2026 年三个未解决问题：长时程工具链、动态决策和记忆。

## 问题（The Problem）

早期工具使用问的是：模型能预测正确的函数调用吗？现代工具使用问的是：模型能否在 40 步中串联工具、运用记忆、应对部分可观测环境、从工具故障中恢复，并且不虚构不存在的工具？

Toolformer 建立了基线：模型可以通过自监督学习何时调用工具。BFCL V4 定义了 2026 年的评估目标。两者之间的差距，正是生产智能体所处的空间。

## 概念（The Concept）

### Toolformer（Schick 等人，NeurIPS 2023）

思路是：让模型在自己的预训练语料上标注候选 API 调用。执行每个候选调用，只有当加入工具结果后下一词元损失降低，才保留该标注。随后在筛选后的语料上微调。

覆盖的工具包括计算器、问答系统、搜索引擎、翻译器和日历。自监督信号只关注工具是否有助于预测文本，不需要人工标签。

规模方面的结果是：工具使用随规模扩大而涌现。较小模型会受到工具标注的负面影响，而较大模型会获益。这解释了为什么 2026 年前沿模型内置了强大的工具使用能力，而大多数 7B 模型需要显式的工具使用微调才能可靠。

### Berkeley Function Calling Leaderboard V4（Patil 等人，ICML 2025）

BFCL 是 2026 年事实上的评估标准。V4 的组成如下：

- **智能体式（Agentic，40%）**：完整智能体轨迹，包含记忆、多轮交互和动态决策。
- **多轮（Multi-Turn，30%）**：包含工具链的交互式对话。
- **真实请求（Live，10%）**：用户提交的真实提示词，分布更难。
- **合成请求（Non-Live，10%）**：合成测试用例。
- **幻觉（Hallucination，10%）**：检测何时不应该调用工具。

V3 引入了基于状态的评估（State-based evaluation）：在一串工具调用之后，检查 API 的实际状态，例如“文件创建了吗？”，而不是匹配工具调用的抽象语法树（AST）。V4 增加了网页搜索、记忆和格式敏感性类别。

2026 年的关键发现是：单轮函数调用已接近解决。失败集中在记忆（跨轮次携带上下文）、动态决策（根据先前结果选择工具）、长时程链条（20+ 步后发生偏移）和幻觉检测（没有适用工具时拒绝调用）。

### 工具结构定义（Tool schema）

每个提供商都有自己的结构定义（Schema）。细节不同，但整体结构相同：

```
name: string
description: string（它做什么，何时使用）
input_schema: JSON Schema (properties, required, types, enums)
```

Anthropic 直接使用 `input_schema`，OpenAI 使用 `function.parameters`。两者都接受 JSON 结构定义（JSON Schema）。描述至关重要：模型通过阅读描述选择正确工具。糟糕的工具描述是选错工具故障的首要根因。

### 参数验证（Argument validation）

不要信任任何工具调用。验证以下内容：

1. **类型强制转换（Type coercion）。** 结构定义要求整数时，模型可能返回字符串“5”。无歧义时转换，有歧义时拒绝。
2. **枚举验证（Enum validation）。** 如果结构定义要求 `status in {"open", "closed"}`，而模型输出 `"in_progress"`，应返回说明原因的错误并拒绝。
3. **必填字段（Required fields）。** 缺少必填字段 -> 立即向模型反馈错误观察结果，而不是崩溃。
4. **格式验证（Format validation）。** 日期、电子邮件、URL 应使用具体解析器验证，而不是正则表达式。

每次验证失败都应返回结构化观察结果，使模型能够用正确结构重试。

### 并行工具调用（Parallel tool calls）

现代提供商支持在一个助手轮次内并行调用工具。循环如下：

1. 模型输出 3 个工具调用，各自具有不同的 `tool_use_id`。
2. 运行时执行它们，若相互独立则并行执行。
3. 每个结果作为 `tool_result` 块返回，并通过 `tool_use_id` 关联。

工程规则：必须将关联标识（Correlation ID）视为关键要素。交换它们，就会把错误的工具结果路由给错误的调用。

### 沙箱隔离（Sandboxing）

工具执行就是沙箱边界。详见第 09 课。简而言之，每个工具都应声明读写范围、网络访问、超时和内存上限。通用 `run_shell(cmd)` 是危险信号；具体的 `git_status()` 更安全。

```figure
tool-routing
```

## 动手实现（Build It）

`code/main.py` 实现了具有生产系统形态的工具注册表：

- 仅使用标准库、支持 JSON 结构定义（JSON Schema）子集的验证器。
- 注册工具时包含描述、输入结构定义（Schema）、超时和执行器。
- 参数强制转换与枚举验证。
- 带关联标识的并行工具分派。
- 将错误观察结果表示为结构化字符串。

运行：

```
python3 code/main.py
```

轨迹展示一个小型智能体在同一轮调用三个工具，其中一个调用故意使用错误格式，因而被拒绝，并收到模型可以据此行动的描述性错误。

## 实际应用（Use It）

Anthropic、OpenAI、Gemini、Bedrock 各有自己的工具结构定义（Schema）。需要支持多个提供商时，使用转换层，如 OpenAI Agents SDK、Vercel AI SDK、LangChain 工具适配器。BFCL 是参考基准测试；如果工具使用是产品核心，交付前应以它测试智能体。

## 交付成果（Ship It）

`outputs/skill-tool-registry.md` 为给定任务领域生成工具目录、结构定义（Schema）和注册表，包含描述质量检查：每个工具的描述是否告诉模型何时使用它？

## 练习（Exercises）

1. 添加“无操作”（No-op）工具，让模型能够显式拒绝使用其他工具。在类似 BFCL 的幻觉测试中测量表现。
2. 实现字符串形式整数和浮点数的参数强制转换。从哪里开始，强制转换会掩盖真正的错误？
3. 添加每工具超时和熔断器（Circuit breaker）：连续 3 次失败后，60 秒内拒绝使用该工具。这会怎样改变模型的恢复方式？
4. 阅读 BFCL V4 说明。选择一个类别，例如“多轮”，将 10 个示例提示词交给智能体运行，报告通过率。
5. 将标准库验证器迁移到 Pydantic 或 Zod。Pydantic/Zod 发现了哪些玩具版本漏掉的问题？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 函数调用（Function calling） | “工具使用” | 以结构化输出发起工具调用，并验证其是否符合结构定义（Schema） |
| Toolformer | “自监督工具标注” | Schick 于 2023 年提出，保留结果能够降低下一词元损失的工具调用 |
| BFCL | “Berkeley Function Calling Leaderboard” | 2026 年基准：40% 智能体式、30% 多轮、10% 真实请求、10% 合成请求、10% 幻觉 |
| 工具结构定义（Tool schema） | “面向模型的函数签名” | name、description 和参数的 JSON 结构定义（JSON Schema） |
| tool_use_id | “关联标识（Correlation ID）” | 将工具调用与其结果绑定，对并行分派必不可少 |
| 幻觉检测（Hallucination detection） | “知道何时不调用” | V4 类别：没有适用工具时拒绝调用 |
| 参数强制转换（Argument coercion） | “字符串转整数修复” | 针对可预见的不符合结构定义（Schema）的输入进行有限修复，有歧义则拒绝 |
| 沙箱隔离（Sandboxing） | “工具执行边界” | 每工具的读写范围、网络、超时和内存上限 |

## 延伸阅读（Further Reading）

- [Schick 等人，Toolformer（arXiv:2302.04761）](https://arxiv.org/abs/2302.04761)：自监督工具标注。
- [Berkeley 函数调用排行榜（Berkeley Function Calling Leaderboard，V4）](https://gorilla.cs.berkeley.edu/leaderboard.html)：2026 年评估基准。
- [Anthropic，工具使用文档（Tool use documentation）](https://platform.claude.com/docs/en/agent-sdk/overview)：Claude Agent SDK 生产环境中的工具结构定义（Schema）。
- [OpenAI Agents SDK 文档（Docs）](https://openai.github.io/openai-agents-python/)：函数工具类型和防护机制（Guardrails）。
