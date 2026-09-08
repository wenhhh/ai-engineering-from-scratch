# LLM 路由层：LiteLLM、OpenRouter、Portkey（LLM Routing Layer）

> 提供方锁定代价高昂。不同工具调用工作负载适合不同模型。路由网关提供统一 API、重试、故障转移、成本追踪和防护措施。2026 年由三类方案主导：LiteLLM（开源自托管）、OpenRouter（托管 SaaS）、Portkey（生产级，2026 年 3 月开源）。本课列出决策标准，并演示标准库路由网关。

**Type:** Learn
**Languages:** Python (stdlib, routing + failover + cost tracker)
**Prerequisites:** Phase 13 · 02（函数调用），Phase 13 · 17（网关）
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 区分自托管、托管和生产级路由选项。
- 实现按确定优先顺序在提供方失败时重试的回退链。
- 跨提供方追踪逐请求成本和词元用量。
- 根据给定生产约束，在 LiteLLM、OpenRouter 和 Portkey 之间选择。

## 问题（The Problem）

提供方路由发挥作用的场景：

1. **成本（Cost）。** Claude Sonnet 的成本是 Haiku 的三倍。分诊任务用 Haiku 足够，综合生成任务则值得用 Sonnet。逐请求路由。

2. **故障转移（Failover）。** OpenAI 某个小时出故障，每个请求都失败。你希望无需重新部署就自动回退到 Anthropic。

3. **延迟（Latency）。** 实时聊天 UI 需要较短的首词元时间，批量摘要器则不需要。按延迟服务等级协议（SLA）路由。

4. **合规（Compliance）。** 欧盟用户必须留在欧盟区域。按区域路由。

5. **实验（Experimentation）。** 在同一工作负载上对两个模型做 A/B 测试。按测试分桶路由。

每次集成都手写这些逻辑很重复。路由网关提供一个兼容 OpenAI 的 API，并处理其余工作。

## 概念（The Concept）

### 兼容 OpenAI 的代理结构（OpenAI-compatible proxy shape）

所有人都使用 OpenAI 结构。路由网关公开 `/v1/chat/completions`，接受 OpenAI 模式，内部代理到 Anthropic / Gemini / Cohere / Ollama 或任何其他后端。客户端无需关心。

### 模型别名（Model aliases）

代码不写固定快照 id，而写 `our_smart_model`。网关将别名映射到真实模型。提供方发布新一代时，只需在服务器端改别名，代码完全不动。

### 回退链（Fallback chains）

```
主选: openai/gpt-4o
遇到 5xx: anthropic/claude-3-5-sonnet
遇到 5xx: google/gemini-1.5-pro
遇到 5xx: 拒绝
```

网关在配置中定义它。重试计入预算，防止级联回退导致成本失控。

### 语义缓存（Semantic caching）

相同或近乎相同的提示词命中缓存，而不访问提供方。在重复智能体循环上可节省 30% 至 60%。键基于嵌入，近似提示词共享缓存槽。

### 防护措施（Guardrails）

网关级措施：

- **PII 脱敏（PII redaction）。** 发送提示词前使用正则表达式或机器学习处理。
- **策略违规（Policy violations）。** 拒绝包含禁止内容的提示词。
- **输出过滤（Output filters）。** 清理补全中的泄露内容。

Portkey 和 Kong 都提供带预设取舍的防护措施。LiteLLM 将其保留为可选。

### 逐密钥速率限制（Per-key rate limits）

一个 API 密钥对应一个团队。逐密钥预算防止某团队耗尽共享配额。大多数网关支持此功能。

### 自托管与托管的权衡（Self-hosted vs managed trade-offs）

| 因素 | LiteLLM（自托管） | OpenRouter（托管） | Portkey（生产） |
|--------|----------------------|----------------------|----------------------|
| 代码 | 开源，Python | 托管 SaaS | 开源（2026 年 3 月）+ 托管 |
| 设置 | 部署代理 | 注册账户 | 两者均可 |
| 提供方 | 100+ | 300+ | 100+ |
| 计费 | 自有密钥 | OpenRouter 额度 | 自有密钥 |
| 可观测性 | OpenTelemetry | 仪表盘 | 完整 OTel + PII 脱敏 |
| 最适合 | 希望完全控制的团队 | 快速原型 | 有合规要求的生产环境 |

有 SRE 团队并希望拥有数据主权时，LiteLLM 更适合。希望单一订阅且不管基础设施时，OpenRouter 更适合。需要开箱即用防护与合规时，Portkey 更适合。

### 成本追踪（Cost tracking）

每个请求携带 `provider`、`model`、`input_tokens`、`output_tokens`。乘以各模型的逐词元价格，价格来自网关维护的价目表。按用户、团队和项目聚合。

### MCP 加路由（MCP plus routing）

网关可同时路由 LLM 调用和 MCP 采样请求。当采样请求的 modelPreferences 偏好特定模型时，网关转译到正确后端。Phase 13 · 17 的 MCP 网关和本课路由网关有时在此合并为一个服务。

### 路由策略（Routing strategies）

- **静态优先级（Static priority）。** 先用列表第一项，出错回退。
- **负载均衡（Load balancing）。** 轮询或加权。
- **成本感知（Cost-aware）。** 选择满足延迟和质量的最便宜模型。
- **延迟感知（Latency-aware）。** 选择过去 N 分钟最快的模型。
- **任务感知（Task-aware）。** 提示词分类器将编码路由到一个模型，将摘要路由到另一个。

```figure
tp-router-failover
```

## 实际应用（Use It）

`code/main.py` 用约 150 行实现路由网关：接受 OpenAI 结构请求，转换到逐提供方桩实现，运行优先级回退链，追踪逐请求成本，并对输入执行 PII 脱敏。运行三个场景：正常请求、主提供方中断触发回退、PII 泄露被脱敏捕获。

观察：

- `ROUTES` 字典：别名到按优先顺序排列的具体提供方列表。
- 回退循环在 5xx 时重试。
- 成本追踪器将词元用量乘以各模型费率。
- PII 脱敏器在转发前清理类似美国社会安全号码（SSN）的模式。

## 交付（Ship It）

本课生成 `outputs/skill-routing-config-designer.md`。给定延迟、成本和合规工作负载画像，该技能选择 LiteLLM / OpenRouter / Portkey 并生成路由配置。

## 练习（Exercises）

1. 运行 `code/main.py`。触发中断场景，确认回退到第二个提供方，且成本归属正确。

2. 添加语义缓存：提示词的 SHA256 作为查找键，命中时立即返回。测量重复调用的成本节省。

3. 添加提示词分类器，将“code ...”提示词路由到偏重智能的别名，将“summarize ...”提示词路由到偏重速度的别名。

4. 设计逐团队预算：每个团队有月度支出上限，达到后网关拒绝请求。选择执行粒度，逐请求或按窗口。

5. 并排阅读 LiteLLM、OpenRouter 和 Portkey 文档。分别说出各自提供而另外两者没有的一项功能。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 路由网关（Routing gateway） | “LLM 代理” | 位于多个提供方之前的统一 API 层 |
| 兼容 OpenAI（OpenAI-compatible） | “使用 OpenAI 模式” | 接受 `/v1/chat/completions` 结构，转换到任意后端 |
| 模型别名（Model alias） | “our_smart_model” | 代码中的名称，由网关映射到具体模型 |
| 回退链（Fallback chain） | “重试列表” | 失败时依次尝试的有序提供方列表 |
| 语义缓存（Semantic caching） | “提示词嵌入缓存” | 键是提示词嵌入，近似重复共享缓存命中 |
| 防护措施（Guardrails） | “输入输出过滤器” | 脱敏 PII，拒绝策略违规 |
| 逐密钥速率限制（Per-key rate limit） | “团队预算” | 限定在 API 密钥范围内的配额 |
| 成本追踪（Cost tracking） | “逐请求支出” | 聚合词元用量乘各模型价格 |
| LiteLLM | “开放代理” | 可自托管的开源路由网关 |
| OpenRouter | “托管 SaaS” | 按额度计费的托管网关 |
| Portkey | “生产选项” | 开源加托管，内置防护措施 |

## 延伸阅读（Further Reading）

- [LiteLLM：文档](https://docs.litellm.ai/) - 自托管路由网关
- [OpenRouter：快速入门](https://openrouter.ai/docs/quickstart) - 托管路由 SaaS
- [Portkey：文档](https://portkey.ai/docs) - 带防护的生产路由
- [TrueFoundry：LiteLLM 与 OpenRouter](https://www.truefoundry.com/blog/litellm-vs-openrouter) - 决策指南
- [Relayplane：2026 年 LLM 网关比较](https://relayplane.com/blog/llm-gateway-comparison-2026) - 供应商调查
