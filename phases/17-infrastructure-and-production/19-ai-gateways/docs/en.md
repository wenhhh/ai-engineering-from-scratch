# AI 网关（AI Gateways）：LiteLLM、Portkey、Kong AI Gateway、Bifrost

> 网关位于应用与模型提供商之间，核心功能包括提供商路由、回退、重试、限流、密钥引用、可观测性和防护。2026 年的市场格局如下：**LiteLLM** 是采用 MIT 许可的开源软件，支持 100 多家提供商，兼容 OpenAI，但在约 2000 RPS 时会出现故障，公开基准中内存占用为 8 GB，并发生级联故障；最适合 Python、低于 500 RPS、开发和原型场景。**Portkey** 定位为控制平面，提供防护、PII 脱敏、越狱检测和审计轨迹；2026 年 3 月按 Apache 2.0 开源，延迟开销为 20–40ms，生产档位为每月 $49。**Kong AI Gateway** 基于 Kong Gateway，Kong 自身在相同 12 个 CPU 上的基准表明，它比 Portkey 快 228%，比 LiteLLM 快 859%；价格为每模型每月 $100，Plus 档位最多支持 5 个模型；已经使用 Kong 的企业适合采用。**Bifrost**（Maxim AI）支持可配置退避的自动重试，OpenAI 返回 429 时可以回退到 Anthropic。**Cloudflare / Vercel AI Gateway** 是托管产品，无需运维，提供基本重试。数据驻留要求驱动是否自托管的决策；Portkey 和 Kong 处于中间地带，同时提供开源与可选托管方案。

**Type:** Learn
**Languages:** Python（标准库，简化的网关路由模拟器）
**Prerequisites:** 阶段 17 · 01（托管 LLM 平台），阶段 17 · 16（模型路由）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 列出六项网关核心功能：路由、回退、重试、限流、密钥、可观测性和防护。
- 将 2026 年的四种网关 LiteLLM、Portkey、Kong AI、Bifrost 与其规模上限和使用场景对应起来。
- 引用 Kong 基准：相比 Portkey 快 228%，相比 LiteLLM 快 859%，并解释为什么这对超过 500 RPS 的场景重要。
- 根据数据驻留要求和运维预算，在自托管与托管之间做出选择。

## 问题（The Problem）

你的产品调用 OpenAI、Anthropic 和自托管 Llama。各提供商的 SDK、错误模型、限流及认证机制不同。你希望实现故障转移，例如 OpenAI 返回 429 时尝试 Anthropic，同时使用统一凭据存储、统一可观测性和按租户限流。

在应用层重复实现这些能力，会让每个服务都与每家提供商耦合。网关层将其集中到一个进程，通过一个 API（通常兼容 OpenAI）向不同提供商分发请求。

## 概念（The Concept）

### 六项核心功能（Six core features）

1. **提供商路由（provider routing）**：将 OpenAI、Anthropic、Gemini、自托管模型等放在同一个 API 后面。
2. **回退（fallback）**：遇到 429、5xx 或质量失败时，换一个目标重试。
3. **重试（retries）**：指数退避，并限制尝试次数。
4. **限流（rate limits）**：按租户、密钥和模型限制流量。
5. **密钥引用（secret references）**：运行时从保险库获取凭据，绝不放在应用中。
6. **可观测性（observability）**：OTel + GenAI 属性（阶段 17 · 13）+ 成本归因。
7. **防护（guardrails）**：PII 脱敏、越狱检测、允许主题过滤。

### LiteLLM：MIT 开源，使用 Python（LiteLLM — MIT OSS, Python）

- 支持 100 多家提供商，兼容 OpenAI，提供路由器配置、回退和基本可观测性。
- 在 Kong 基准中，约 2000 RPS 时出现故障；内存占用 8 GB，持续负载下出现级联故障。
- 最适合 Python 应用、低于 500 RPS 的场景、开发或预发布网关，以及实验性路由。
- 费用：开源版 $0；云端有免费档位。

### Portkey：控制平面定位（Portkey — control plane positioning）

- 自 2026 年 3 月起按 Apache 2.0 开源，提供防护、PII 脱敏、越狱检测和审计轨迹。
- 每请求延迟开销为 20–40ms。
- 带数据保留和 SLA 的生产档位为每月 $49。
- 最适合需要整合防护与可观测性的受监管行业。

### Kong AI Gateway：面向规模化（Kong AI Gateway — the scale play）

- 基于 Kong Gateway，后者是成熟 API 网关产品，采用 lua + OpenResty。
- Kong 自身在等效 12 个 CPU 上的基准表明，它比 Portkey 快 228%，比 LiteLLM 快 859%。
- 定价为每模型每月 $100，Plus 档位最多 5 个模型。
- 最适合已经使用 Kong、超过 1000 RPS 且愿意付费购买许可的团队。

### Bifrost（Maxim AI）

- 支持自动重试和可配置退避。
- OpenAI 返回 429 时回退到 Anthropic，是典型配置方案。
- 较新的商业产品。

### 托管边缘网关（Cloudflare AI Gateway / Vercel AI Gateway）

- 托管，无需运维，提供基本重试和可观测性。
- 最适合在 Cloudflare/Vercel 上提供边缘服务的 JavaScript 应用。
- 防护与限流能力相比 Kong/Portkey 有限。

### 自托管与托管（Self-hosted vs managed）

数据驻留是决定性约束。医疗和金融通常默认选择自托管，如 LiteLLM、Portkey 开源版或 Kong。消费产品通常默认选择托管方案，如 Cloudflare AI Gateway，或中间档位的 Portkey 托管版。也可采用混合方案：受监管租户自托管，其他租户使用托管服务。

### 延迟预算（Latency budget）

- LiteLLM：典型开销 5–15ms。
- Portkey：开销 20–40ms。
- Kong：开销 3–8ms。
- Cloudflare/Vercel：开销 1–3ms，得益于边缘部署。

网关延迟直接叠加到首词元延迟（TTFT）。若 SLA 要求 TTFT P99 <100ms，选择 Kong 或 Cloudflare；若 P99 <500ms，则任一种都可以。

### 限流语义很重要（Rate-limit semantics matter）

简单令牌桶（token-bucket）适用于中等规模。多租户需要滑动窗口（sliding-window）、突发额度和按租户分档。LiteLLM 提供令牌桶，Kong 提供滑动窗口，Portkey 提供分档限流。

### 网关、可观测性与路由可以组合（Gateway + observability + routing compose）

阶段 17 · 13（可观测性）、16（模型路由）和 19（网关）在生产环境中属于同一层。可以选择覆盖三者的工具，也可以仔细连接多个工具：2026 年多数部署将 Helicone（可观测性）或 Portkey（防护）与 Kong（规模化）组合，分别承担职责。

### 应记住的数字（Numbers you should remember）

- LiteLLM：约 2000 RPS 时出现故障，内存占用 8 GB。
- Portkey：开销 20–40ms；自 2026 年 3 月起使用 Apache 2.0。
- Kong：比 Portkey 快 228%，比 LiteLLM 快 859%。
- Kong 定价：每模型每月 $100，Plus 档位最多 5 个。
- Cloudflare/Vercel：边缘开销 1–3ms。

```figure
mx-gateway-fallback
```

## 动手使用（Use It）

`code/main.py` 在注入 429/5xx 错误时，模拟跨 3 家提供商的网关路由和回退，报告延迟、重试率和回退命中率。

## 交付成果（Ship It）

本课产出 `outputs/skill-gateway-picker.md`。它根据规模、运维条件、合规要求和延迟预算选择网关。

## 练习（Exercises）

1. 运行 `code/main.py`，配置 OpenAI→Anthropic→自托管的回退链。提供商错误率为 5% 时，预期命中率是多少？
2. 你的基准延迟为 300ms，SLA 却要求 TTFT P99 <200ms。哪些网关能保持在预算内？
3. 医疗客户要求自托管、PII 脱敏和审计。选择 Portkey 开源版或 Kong。
4. 比较 LiteLLM 与 Kong：团队应在达到什么 RPS 上限时迁移？
5. 为多租户 SaaS 设计限流策略，包括免费档、试用档和付费档。应选令牌桶还是滑动窗口？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 网关（Gateway） | “API 代理” | 位于应用和提供商之间的进程 |
| LiteLLM | “MIT 许可的那个” | Python 开源产品，支持 100 多家提供商，2K RPS 时出现故障 |
| Portkey | “防护网关” | 控制平面与可观测性，Apache 2.0 |
| Kong AI Gateway | “适合大规模的那个” | 基于 Kong Gateway，在基准中领先 |
| Bifrost | “Maxim 的网关” | 重试及 Anthropic 回退方案 |
| Cloudflare AI Gateway | “边缘托管” | 部署在边缘的托管网关，无需运维 |
| PII 脱敏（PII redaction） | “数据清洗” | 发给模型前，用正则表达式与命名实体识别（NER）遮蔽信息 |
| 越狱检测（Jailbreak detection） | “提示词注入防护” | 对用户输入运行分类器 |
| 审计轨迹（Audit trail） | “合规日志” | 每次 LLM 调用的不可变记录 |
| 令牌桶（Token-bucket） | “简单限流” | 通过补充令牌控制速率 |
| 滑动窗口（Sliding-window） | “精确限流” | 基于时间窗口的限流器，公平性更好 |

## 延伸阅读（Further Reading）

- [Kong AI Gateway 基准测试](https://konghq.com/blog/engineering/ai-gateway-benchmark-kong-ai-gateway-portkey-litellm)
- [TrueFoundry：2026 年 AI 网关对比](https://www.truefoundry.com/blog/a-definitive-guide-to-ai-gateways-in-2026-competitive-landscape-comparison)
- [Techsy：2026 年主流 LLM 网关工具](https://techsy.io/en/blog/best-llm-gateway-tools)
- [LiteLLM 的 GitHub 仓库](https://github.com/BerriAI/litellm)
- [Portkey 的 GitHub 仓库](https://github.com/Portkey-AI/gateway)
- [Kong AI Gateway 文档](https://docs.konghq.com/gateway/latest/ai-gateway/)
