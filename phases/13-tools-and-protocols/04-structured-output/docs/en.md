# 结构化输出：JSON Schema、Pydantic、Zod 与受约束解码（Structured Output — JSON Schema, Pydantic, Zod, Constrained Decoding）

> “好好请求模型返回 JSON”即使在前沿模型上也有 5% 到 15% 的失败率。结构化输出（Structured output）通过受约束解码（Constrained decoding）弥合这一差距：直接阻止模型输出违反模式的词元。OpenAI 的严格模式、Anthropic 的模式类型化工具使用、Gemini 的 `responseSchema`、Pydantic AI 的 `output_type` 和 Zod 的 `.parse`，是同一思想的五种表面形式。本课构建模式校验器和严格模式契约，供学习者用于所有生产提取流水线。

**Type:** Build
**Languages:** Python (stdlib, JSON Schema 2020-12 subset)
**Prerequisites:** 阶段 13 · 02（深入函数调用）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 为提取目标编写 JSON Schema 2020-12，采用合适约束（enum、min/max、required、pattern）。
- 解释严格模式与受约束解码为何提供不同于“生成后校验”的保证。
- 区分三种失败模式：解析错误、模式违规、模型拒绝。
- 交付具有带类型修复和带类型拒绝处理的提取流水线。

## 问题（The Problem）

读取采购订单邮件的智能体需要将自由文本转成 `{customer, line_items, total_usd}`。有三种做法。

**做法一：提示生成 JSON。** “用包含 customer、line_items、total_usd 字段的 JSON 回复。”在前沿模型上有 85% 到 95% 的成功率。六种失败情况：缺少大括号、尾随逗号、类型错误、虚构字段、到达词元上限而截断，以及混入“这是你的 JSON：”这样的文字。

**做法二：生成后校验。** 自由生成、解析、按模式校验，失败则重试。可靠却昂贵，每次重试都要付费，每次截断问题都会多花一轮。

**做法三：受约束解码。** 提供商在解码时强制执行模式，从采样分布中屏蔽无效词元。保证输出可以解析并通过校验。失败缩减为一种：拒绝（模型判断输入不符合模式）。

2026 年每家前沿提供商都交付了某种形式的第三种做法。

- **OpenAI。** `response_format: {type: "json_schema", strict: true}`，模型拒绝时响应中带 `refusal`。
- **Anthropic。** 对 `tool_use` 输入强制模式；并不存在 `stop_reason: "refusal"`，但没有工具调用的 `end_turn` 就是信号。
- **Gemini。** 请求级 `responseSchema`；2026 年 Gemini 为选定类型提供词元级语法约束。
- **Pydantic AI。** `output_type=InvoiceModel` 输出类型为 `InvoiceModel` 的结构化 `RunResult`。
- **Zod（TypeScript）。** 运行时解析器，按 Zod 模式校验提供商输出，与 OpenAI 的 `beta.chat.completions.parse` 配合使用。

共同主线是：只声明一次模式，端到端强制执行。

## 概念（The Concept）

### JSON Schema 2020-12：通用语言（JSON Schema 2020-12 — the lingua franca）

每家提供商都接受 JSON Schema 2020-12。最常用的构造：

- `type`：`object`、`array`、`string`、`number`、`integer`、`boolean`、`null` 之一。
- `properties`：字段名到子模式的映射。
- `required`：必须出现的字段名列表。
- `enum`：允许值的封闭集合。
- `minimum` / `maximum`（数字），`minLength` / `maxLength` / `pattern`（字符串）。
- `items`：应用于每个数组元素的子模式。
- `additionalProperties`：`false` 禁止额外字段，默认值因模式而异。

OpenAI 严格模式增加三个要求：每个属性都必须列入 `required`，所有对象都设 `additionalProperties: false`，且没有未解析的 `$ref`。违反这些要求时，API 在请求时返回 400。

### Pydantic：Python 绑定（Pydantic, the Python binding）

Pydantic v2 通过 `model_json_schema()` 从数据类形态的模型生成 JSON Schema。Pydantic AI 对其封装，让你这样写：

```python
class Invoice(BaseModel):
    customer: str
    line_items: list[LineItem]
    total_usd: Decimal
```

智能体框架在边界处将模式转换为 OpenAI 严格模式、Anthropic 的 `input_schema` 或 Gemini 的 `responseSchema`。模型输出以带类型的 `Invoice` 实例返回。校验错误抛出带类型化错误路径的 `ValidationError`。

### Zod：TypeScript 绑定（Zod, the TypeScript binding）

Zod（`z.object({customer: z.string(), ...})`）是 TS 的对应实现。OpenAI 的 Node SDK 暴露 `zodResponseFormat(Invoice)`，将其转换为 API 的 JSON Schema 载荷。

### 拒绝（Refusals）

严格模式无法强迫模型回答。若输入不适合模式（“邮件是一首诗，不是发票”），模型输出含原因的 `refusal` 字段。代码必须把它作为一等结果处理，而不是故障。拒绝也可作为安全信号：要求模型从受保护内容邮件中提取信用卡号时，模型会返回附带安全理由的拒绝。

### 开放实现中的受约束解码（Constrained decoding in the open）

开放权重实现采用三种技术。

1. **基于语法的解码（Grammar-based decoding）**（`outlines`、`guidance`、`lm-format-enforcer`）：从模式构建确定性有限自动机，每一步屏蔽违反有限状态机（FSM）的词元 logits。
2. **结合 JSON 解析器的 logit 屏蔽（Logit masking with a JSON parser）**：让流式 JSON 解析器与模型同步运行，每一步计算合法的下一个词元集合。
3. **带验证器的推测解码（Speculative decoding with a verifier）**：廉价草稿模型提出词元，验证器强制执行模式。

商业提供商在幕后选择其中一种。2026 年的先进实现，对于短结构化输出比普通生成更快，长输出则速度大致相同。

### 三种失败模式（The three failure modes）

1. **解析错误（Parse error）。** 输出不是有效 JSON。严格模式下不会发生，非严格提供商上仍可能发生。
2. **模式违规（Schema violation）。** 输出可以解析但违反模式。严格模式下不会发生，其他情况下很常见。
3. **拒绝（Refusal）。** 模型拒绝，必须作为带类型的结果处理。

### 重试策略（Retry strategy）

不在严格模式下时（Anthropic 工具使用、非严格 OpenAI、旧版 Gemini），恢复模式是：

```
generate -> parse -> validate -> if fail, inject error and retry, max 3x
```

通常一次重试就够。三次重试能覆盖弱模型的偶发失败。超过三次表明模式有问题：模型无法为某些输入满足它，需要修复提示词或模式。

### 小模型支持（Small-model support）

受约束解码也适用于小模型。在结构化任务上，带语法约束的 3B 参数开放模型胜过只用普通提示的 70B 参数模型。这是结构化输出对生产重要的主要原因：它把可靠性与模型规模解耦。

```figure
constrained-decoding
```

## 实际应用（Use It）

`code/main.py` 用标准库交付最小 JSON Schema 2020-12 校验器，支持类型、required、enum、min/max、pattern、items、additionalProperties。它封装一个 `Invoice` 模式，让假的 LLM 输出通过校验器，展示解析错误、模式违规和拒绝路径。生产中可将假输出替换为任意提供商的真实响应。

重点查看：

- 校验器返回带路径和消息的类型化 `[ValidationError]` 列表，这正是应提供给重试提示词的形态。
- 拒绝分支不重试，而是记录日志并返回带类型的拒绝。阶段 14 · 09 把拒绝用作安全信号。
- `additionalProperties: false` 检查在对抗性测试输入上触发，说明严格模式为什么能堵住虚构字段的入口。

## 交付成果（Ship It）

本课产出 `outputs/skill-structured-output-designer.md`。给定自由文本提取目标（发票、支持工单、简历等），技能生成兼容严格模式的 JSON Schema 2020-12 及其对应 Pydantic 模型，并预留带类型的拒绝与重试处理。

## 练习（Exercises）

1. 运行 `code/main.py`。添加第四个测试用例，让 `total_usd` 为负数。确认校验器拒绝，并指出 `minimum` 约束路径。

2. 扩展校验器以支持带判别字段的 `oneOf`。常见情况：`line_item` 是产品或服务，由 `kind` 标识。严格模式对此有细微规则，请查阅 OpenAI 的结构化输出指南。

3. 用 Pydantic BaseModel 编写相同 Invoice 模式，将 `model_json_schema()` 输出与你手写的模式比较。找出 Pydantic 默认设置而手写版本省略的一个字段。

4. 测量拒绝率。构造十个不应能提取的输入（歌词、数学证明、空白邮件），在真实提供商的严格模式下运行。统计拒绝与虚构输出的数量。这就是拒绝感知重试的真实基准。

5. 从头到尾阅读 OpenAI 结构化输出指南。找出其严格模式明确禁止、但普通 JSON Schema 允许的一个构造。再设计一个非必要地使用该构造的模式，重构为兼容严格模式的版本。

## 关键术语（Key Terms）

| 术语 | 通俗说法 | 实际含义 |
|------|----------------|------------------------|
| JSON Schema 2020-12 | “模式规范” | 所有现代提供商使用的 IETF 草案模式方言 |
| 严格模式（Strict mode） | “有保证的模式” | 通过受约束解码强制模式的 OpenAI 标志 |
| 受约束解码（Constrained decoding） | “Logit 屏蔽” | 解码时强制执行，屏蔽无效的下一个词元 |
| 拒绝（Refusal） | “模型拒绝” | 输入不符合模式时的带类型结果 |
| 解析错误（Parse error） | “无效 JSON” | 输出无法解析为 JSON，严格模式下不可能发生 |
| 模式违规（Schema violation） | “形态错误” | 能解析，但违反类型 / 必填项 / 枚举 / 范围 |
| `additionalProperties: false` | “不允许额外项” | 禁止未知字段，OpenAI 严格模式要求使用 |
| Pydantic BaseModel | “带类型输出” | 生成并校验 JSON Schema 的 Python 类 |
| Zod 模式（Zod schema） | “TypeScript 输出类型” | 用于校验提供商输出的 TS 运行时模式 |
| 语法强制（Grammar enforcement） | “开放权重受约束解码” | 基于 FSM 的 logit 屏蔽，如 outlines / guidance |

## 延伸阅读（Further Reading）

- [OpenAI：结构化输出（Structured outputs）](https://platform.openai.com/docs/guides/structured-outputs)：严格模式、拒绝和模式要求
- [OpenAI：结构化输出介绍（Introducing structured outputs）](https://openai.com/index/introducing-structured-outputs-in-the-api/)：2024 年 8 月的发布文章，解释解码保证
- [Pydantic AI：输出（Output）](https://ai.pydantic.dev/output/)：可序列化到各提供商的带类型 output_type 绑定
- [JSON Schema：2020-12 发行说明（2020-12 release notes）](https://json-schema.org/draft/2020-12/release-notes)：权威规范
- [Microsoft：Azure OpenAI 的结构化输出（Structured outputs in Azure OpenAI）](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/structured-outputs)：企业部署说明与严格模式注意事项
