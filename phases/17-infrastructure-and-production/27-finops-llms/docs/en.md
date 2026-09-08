# LLM 的 FinOps：单位经济性与多租户归因（FinOps for LLMs — Unit Economics and Multi-Tenant Attribution）

> 传统 FinOps 无法直接处理 LLM 支出。成本来自词元交易，而不是资源运行时间。标签也无法直接映射，因为 API 调用是交易，不是资产。提示词设计、上下文窗口、输出长度等工程决策同时也是财务决策。2026 年的实践要求从第一天就埋点三个归因维度：按用户（`user_id`）用于席位定价和增购；按任务（`task_id` + `route`）用于产品功能成本和优先级；按租户（`tenant_id`）用于单位经济性和续约。词元分为提示词、工具、记忆、响应四层，合并成一个费用桶会掩盖支出。多租户产品的分级约束为：按租户限流，阈值为预期峰值的 2–3 倍，明确返回 429 和 retry-after；每日支出上限为合同上限的 1.5–3 倍，触发限流收紧与告警；支出 z-score >4 时触发紧急停止开关，自动暂停并呼叫值班人员。归因模式包括打标签后聚合、遥测关联（trace-ID → 账单，准确率最高）、抽样外推、基于模型的分摊、事件溯源和实时流处理。单位指标应是每次已解决查询成本、每件生成产物成本，而不是每百万词元美元数。事后补标签总会遗漏，应在请求创建时埋点。

**Type:** Learn
**Languages:** Python（标准库，带紧急停止开关的简化成本归因模拟器）
**Prerequisites:** 阶段 17 · 13（可观测性），阶段 17 · 14（缓存）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 解释传统 FinOps 的标签与档位为何无法直接处理 LLM 支出，并指出三个新归因维度。
- 列出提示词、工具、记忆、响应四个词元层，解释单一费用桶为何会掩盖成本。
- 为多租户产品设计分级约束：限流 → 支出上限 → 紧急停止开关。
- 选择每次已解决查询或每件产物成本作为单位指标，而不是每百万词元美元数。

## 问题（The Problem）

账单显示 $40,000，但你不知道：
- 哪个租户花了这些钱。
- 哪项产品功能驱动支出。
- 是否有单个用户滥用。
- 元凶是提示词膨胀、工具调用，还是记忆放大。

提供商侧的标签聚合适用于 EC2、S3 等云资源，因为标签会传到账单明细。LLM API 调用不会自动带标签，你必须在调用点标记用户、任务、租户并贯穿链路。事后归因总会漏掉边缘情况。

## 概念（The Concept）

### 三个归因维度（Three attribution dimensions）

**按用户（per-user）**，使用 `user_id`：谁花了多少钱。用于席位定价、增购沟通和识别重度用户。

**按任务（per-task）**，使用 `task_id` + `route`：哪项产品功能花了多少钱。用于功能优先级和停用高成本功能的决策。

**按租户（per-tenant）**，使用 `tenant_id`：哪个客户有利润。用于单位经济性、续约定价和档位阈值。

从第一天就在调用点埋点三者。事后补做总是更差。

### 四个词元层（Four token layers）

| 层 | 示例 | 典型总量占比 |
|-------|---------|---------------------|
| 提示词（Prompt） | 系统与用户输入 | 40–60% |
| 工具（Tool） | 回传给模型的工具调用结果 | 20–40%，智能体工作负载 |
| 记忆（Memory） | 先前对话或检索文档 | 10–30% |
| 响应（Response） | 模型输出 | 10–30% |

把四层都放进同一个费用桶，会让优化缺乏依据。应在归因模式中分别记录。

### 分级约束（Enforcement ladder）

1. **按租户限流（rate limit）**：预期峰值的 2–3 倍。返回带 `Retry-After` 的 429。租户会遇到限制，但不会收到意外账单。

2. **按租户每日支出上限（daily spend cap）**：合同上限的 1.5–3 倍。触发后收紧限流，并通知客户成功团队。

3. **紧急停止开关（kill switch）**：相对租户基准，支出 z-score >4。自动暂停租户，呼叫值班人员，并升级给运维与客户成功团队。

### 归因模式（Attribution patterns）

- **打标签后聚合（tag-and-aggregate）**：写入元数据请求头，之后聚合。简单，但粗略。
- **遥测关联器（telemetry joiner）**：通过 trace ID 关联链路与账单。准确率最高，成熟团队采用这种方式。
- **抽样与外推（sampling + extrapolation）**：抽样 5–10% 后乘倍数。粗估支出成本低，但会漏掉长尾。
- **基于模型的分摊（model-based allocation）**：通过回归推断成本驱动因素，用于没有标签的历史数据。
- **事件溯源（event-sourced）**：把成本作为流中的事件，如 Kafka / Kinesis，实时处理。
- **实时流处理（real-time streaming）**：仪表盘在亚秒级更新。

### 单位指标是每项成果成本（Cost per X is the unit metric）

每百万词元美元数是供应商语言。产品指标应是：

- 每张已解决客服工单的成本。
- 每篇生成文章的成本。
- 每次成功智能体任务的成本。
- 每用户会话分钟的成本。

把成本与产品结果关联，否则优化没有锚点。

### 成本归因链路结构（Cost attribution trace shape）

```
trace_id: abc123
  user_id: u_42
  tenant_id: t_7
  task_id: task_classify_doc
  route: model_haiku
  layers:
    prompt_tokens: 1800
    tool_tokens: 600
    memory_tokens: 400
    response_tokens: 150
  cost_usd: 0.0135
  cached_input: true
  batch: false
```

每次调用都发出这条记录，存入数据湖，按各维度聚合。它属于阶段 17 · 13 的可观测性栈。

### 叠加节省的技术组合（The compounded-savings stack）

组合为缓存 + 批处理 + 路由 + 网关。四者都使用时：
- L2 缓存（阶段 17 · 14）：输入成本约降至 1/10。
- 批处理（阶段 17 · 15）：五折。
- 路由到低成本模型（阶段 17 · 16）：成本降低 60%。
- 网关效率（阶段 17 · 19）：冗余与重试。

最佳叠加结果可达到简单基准成本的约 5–10%。多数团队使用 2–3 项手段，很少叠加全部四项。

### 应记住的数字（Numbers you should remember）

- 归因维度：用户、任务、租户。
- 四个词元层：提示词、工具、记忆、响应。
- 紧急停止开关：支出 z-score >4。
- 单位指标：每次已解决查询成本，不是每百万词元美元数。
- 叠加优化：可能降至基准的约 5–10%。

```figure
i4-spend-ladder
```

## 动手使用（Use It）

`code/main.py` 模拟带三级约束的多租户 LLM 服务，注入一个滥用租户，展示紧急停止开关触发。

## 交付成果（Ship It）

本课产出 `outputs/skill-finops-plan.md`。它根据产品和规模，设计归因模式与分级约束。

## 练习（Exercises）

1. 运行 `code/main.py`。紧急停止开关在什么 z-score 下触发？如何选择阈值？
2. 设计按租户、按任务的成本仪表盘。最先构建哪五个视图？
3. 最大租户的单位经济性为负。提出三种干预，按对客户的影响排序。
4. 计算客服产品每张已解决工单的成本：每工单 3M 词元，每天约 800 张工单，使用 GPT-5 缓存费率。
5. 论证事后补标签是否可能有效，何时可以接受？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 按用户归因（Per-user attribution） | “用户级成本” | 每次调用都标记 `user_id` |
| 按任务归因（Per-task attribution） | “功能成本” | `task_id` + `route` 标识产品功能 |
| 按租户归因（Per-tenant attribution） | “客户成本” | `tenant_id`，用于单位经济性 |
| 四个词元层（Four token layers） | “成本层” | 提示词 + 工具 + 记忆 + 响应 |
| 限流（Rate limit） | “429 防护” | 网关执行的租户级上限 |
| 每日支出上限（Daily spend cap） | “每日额度” | 带告警的租户预算 |
| 紧急停止开关（Kill switch） | “自动暂停” | 支出 z-score >4 触发自动停用 |
| 每次解决成本（Cost per resolved） | “产品单位指标” | 成本关联产品结果，而非词元 |
| 遥测关联器（Telemetry joiner） | “链路到账单” | 准确率最高的归因模式 |
| 叠加优化（Stacked optimization） | “缓存、批处理、路由、网关” | 叠加节省至基准的约 5–10% |

## 延伸阅读（Further Reading）

- [FinOps Foundation：AI 的 FinOps 概览](https://www.finops.org/wg/finops-for-ai-overview/)
- [FinOps School：2026 年单位成本指南](https://finopsschool.com/blog/cost-per-unit/)
- [Digital Applied：2026 年 LLM 智能体成本归因](https://www.digitalapplied.com/blog/llm-agent-cost-attribution-guide-production-2026)
- [PointFive：Azure OpenAI 中的托管 LLM](https://www.pointfive.co/blog/finops-for-ai-economics-of-managed-llms-in-azure-open-ai)
