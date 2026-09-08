# 推理平台经济性（Inference Platform Economics）：Fireworks、Together、Baseten、Modal、Replicate、Anyscale

> 2026 年的推理市场不再只是出租 GPU 时间，而是分化为定制芯片（Custom silicon：Groq、Cerebras、SambaNova）、GPU 平台（Baseten、Together、Fireworks、Modal）和 API 优先的模型市场（Replicate、DeepInfra）。Fireworks 于 2026 年 5 月 1 日将每块 GPU 的价格提高 $1/小时；$4B 的估值和每日 10T+ 词元处理量说明，以规模驱动的模式行得通。Baseten 于 2026 年 1 月完成 $300M 的 E 轮融资，估值 $5B。竞争定位很明确：Fireworks 优化延迟，Together 优化模型目录广度，Baseten 打磨企业级体验，Modal 优化 Python 原生开发者体验（Developer Experience，DX），Replicate 扩展多模态覆盖，Anyscale 优化分布式 Python。本课提供一份可以交给创始人的选型矩阵。

**Type:** Learn
**Languages:** Python (标准库，单次调用经济性的简化比较器)
**Prerequisites:** 阶段 17 · 01（托管 LLM 平台，Managed LLM Platforms）、阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 说出三种细分市场（定制芯片、GPU 平台、API 优先），并将各服务商归入对应类别。
- 解释为什么“按词元”API 定价会向服务引擎的成本曲线收敛，而不是向硬件成本曲线收敛。
- 计算至少三家服务商的实际单请求成本，并解释何时按分钟计费（Baseten、Modal）比按词元计费划算。
- 为给定工作负载选择合适的默认平台：无服务器突发流量、稳定高吞吐、微调变体或多模态。

## 问题背景（The Problem）

你已经评估了超大规模云服务商的托管平台，决定需要定位更专、更快的服务商：Fireworks 追求延迟，Together 追求覆盖广度，Baseten 用于微调定制模型。现在有六个实际选项，但定价页面的口径不同：Fireworks 按 $/M 词元，Baseten 按 $/分钟，Modal 按 $/秒，Replicate 按 $/次预测。不建立工作负载模型，就无法直接比较。

更麻烦的是，每种定价背后的商业模式也不同。Fireworks 在共享 GPU 上运行自研引擎 FireAttention，词元费率反映其利用率曲线。Baseten 提供 Truss 加专用 GPU，按分钟收费反映资源独占性。Modal 是真正的 Python 无服务器平台，按秒计费，支持亚秒级冷启动。同样产出 LLM 响应，背后却是三种成本函数。

本课为六个平台建模，说明各自在什么情况下胜出。

## 核心概念（The Concept）

### 三种细分市场（The three segments）

**定制芯片（Custom silicon）**：Groq（LPU）、Cerebras（WSE）、SambaNova（RDU）。同一模型的解码速度通常比 GPU 集群快 5-10 倍。每词元价格更高（2025 年底 Groq 的 Llama-70B 约为 $0.99/M），但在延迟敏感场景中无可匹敌。Groq 是语音智能体（Agent）和实时翻译的生产选择。

**GPU 平台（GPU platforms）**：Baseten、Together、Fireworks、Modal、Anyscale。运行在 NVIDIA GPU 上（2026 年为 H100、H200、B200），有时也使用 AMD。它们位于“裸 GPU 租赁”（RunPod、Lambda）与“超大规模云托管服务”（Bedrock）之间。

**API 优先模型市场（API-first marketplaces）**：Replicate、DeepInfra、OpenRouter、Fal。目录广泛，按预测或按秒付费，强调尽快完成首次调用。

### Fireworks：优化延迟的 GPU 平台（Fireworks — latency-optimized GPU platform）

- 使用自研 FireAttention 引擎，宣传在等效配置下延迟降至 vLLM 的四分之一。
- 面向非交互工作负载的批处理档位，价格约为无服务器档位的 50%。
- 微调模型与基础模型采用相同服务费率，相比为 LoRA 加价的服务商，这是实质差异。
- 2026 年中：按需 GPU 租赁价格自 2026 年 5 月 1 日起提高 $1/小时，大规模用量可协商批量价格。
- 财务信号：估值 $4B，每日处理 10T+ 词元。

### Together：优化覆盖广度（Together — breadth-optimized）

- 提供 200+ 模型，包括在上游发布数天内就接入的开源模型。
- 相同 LLM 模型比 Replicate 便宜 50-70%；其“AI Native Cloud”定位着重规模与目录广度。
- 通过同一个 API 提供推理、微调和训练。

### Baseten：打磨企业级体验（Baseten — enterprise-polish-optimized）

- Truss 框架：用同一份清单封装模型的依赖、密钥和服务配置。
- GPU 从 T4 覆盖到 B200，按分钟计费，并提供合理的冷启动缓解措施。
- 提供 SOC 2 Type II，具备 HIPAA 就绪能力，是金融科技和医疗的常见选择。
- 估值 $5B，于 2026 年 1 月完成 E 轮融资（来自 CapitalG、IVP、NVIDIA 的 $300M）。

### Modal：优化 Python 原生体验（Modal — Python-native-optimized）

- 用纯 Python 实现基础设施即代码（Infrastructure as Code）。为函数添加 `@modal.function(gpu="A100")` 装饰器，即可用一条命令部署。
- 按秒计费。预热后冷启动为 2-4s，小模型低于 1s。
- 2025 年以 $1.1B 估值完成 $87M 的 B 轮融资。在独立调查中，开发者体验得分最高。

### Replicate：多模态覆盖广度（Replicate — multimodal breadth）

- 按预测计费，是图像、视频和音频模型的默认平台。
- 具备集成生态，包括 Zapier、Vercel 和 CMS 插件。
- LLM 每词元费率竞争力较弱，但多模态种类占优。

### Anyscale：Ray 原生（Anyscale — Ray-native）

- 基于 Ray 构建，RayTurbo 是 Anyscale 的专有推理引擎，与 vLLM 竞争。
- 最适合分布式 Python 工作负载，其中推理只是更大计算图中的一个节点。
- 提供托管 Ray 集群，与 Ray AIR 和 Ray Serve 紧密集成。

### 按词元与按分钟：各自何时胜出（Per-token versus per-minute — when each wins）

工作负载对延迟不敏感且流量突发时，按词元计费合理，因为只为实际使用付费。利用率高且可预测时，按分钟计费合理；当 GPU 接近满载时，成本就能低于按词元计费。

粗略规则是：专用 GPU 持续利用率超过约 30% 时，按分钟计费（Baseten、Modal）开始比按词元计费（Fireworks、Together）划算。低于这个水平，按词元更好，因为不用为空闲付费。

### 自研引擎才是真正的护城河（Custom engine is the real moat）

位于 vLLM 和 SGLang 之上的各平台都声称拥有自研引擎，例如 FireAttention、RayTurbo 和 Baseten 推理栈。这些说法带有营销色彩。更诚实的表述是：vLLM + SGLang 约占生产开源推理的 80%，而平台层的差异主要在 DX、成本归因和 SLA。

### 应记住的数值（Numbers you should remember）

- Fireworks GPU 租赁价格自 2026 年 5 月 1 日起提高 $1/小时。
- Fireworks 宣称：等效配置下延迟降至 vLLM 的四分之一。
- Together 的 LLM 价格比 Replicate 低 50-70%。
- Baseten 估值 $5B（2026 年 1 月 E 轮，融资 $300M）。
- Modal 估值 $1.1B（2025 年 B 轮）。
- 持续利用率超过约 30% 时，按分钟计费胜过按词元计费。

```figure
cost-per-token
```

## 实际应用（Use It）

`code/main.py` 基于合成工作负载，跨定价模式比较六家服务商，报告每日美元成本和实际每百万词元美元成本。运行它，找到按词元与按分钟计费的盈亏平衡点。

## 交付成果（Ship It）

本课产出 `outputs/skill-inference-platform-picker.md`。根据工作负载画像、SLA 和预算，选出主要推理平台，并指明次优选择。

## 练习（Exercises）

1. 运行 `code/main.py`。在一块 H100 上运行 70B 模型时，持续利用率达到多少，Baseten（按分钟）比 Fireworks（按词元）划算？自行推导交点，与经验规则比较。
2. 产品提供图像生成、聊天和语音转文字。为每种模态选择平台，并说明将其统一起来的网关模式。
3. Fireworks 对你的主要模型涨价 $1/小时。如果 40% 流量迁移到批处理档位（五折），建立混合成本影响模型。
4. 受监管客户要求 SOC 2 Type II、HIPAA 和专用 GPU。哪三个平台可行？哪个在 FinOps 方面胜出？
5. 比较 Llama 3.1 70B 在 Fireworks 无服务器、Together 按需、Baseten 专用和 Replicate API 上每 1,000 次预测的成本。每天 10 次预测时谁最便宜？每天 10,000 次呢？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 定制芯片（Custom silicon） | “非 GPU 芯片” | Groq LPU、Cerebras WSE、SambaNova RDU，针对解码优化 |
| FireAttention | “Fireworks 引擎” | 自研注意力内核，宣传延迟降至 vLLM 的四分之一 |
| Truss | “Baseten 的格式” | 模型封装清单，包含依赖、密钥和服务配置 |
| 按词元（Per-token） | “API 定价” | 按消耗词元收费，不为空闲付费 |
| 按分钟（Per-minute） | “专用资源定价” | 按 GPU 的实际占用时长收费，高利用率时占优 |
| 按预测（Per-prediction） | “Replicate 定价” | 按模型调用收费，常见于图像和视频 |
| RayTurbo | “Anyscale 引擎” | Ray 上的专有推理引擎，在 Ray 集群上与 vLLM 竞争 |
| 批处理档位（Batch tier） | “五折” | 低费率的非交互队列，常见于 Fireworks 和 OpenAI |
| 微调模型按基础费率计费（Fine-tuned at base rate） | “Fireworks LoRA” | LoRA 请求按基础模型费率收费，是差异化能力 |

## 延伸阅读（Further Reading）

- [Fireworks 定价](https://fireworks.ai/pricing)：词元费率、批处理档位、GPU 租赁。
- [Baseten 定价](https://www.baseten.co/pricing/)：分钟费率、承诺容量、企业档位。
- [Modal 定价](https://modal.com/pricing)：GPU 秒级费率与免费档位。
- [Together AI 定价](https://www.together.ai/pricing)：模型目录与词元费率。
- [Anyscale 定价](https://www.anyscale.com/pricing)：RayTurbo 与托管 Ray 的定价。
- [Northflank：Fireworks AI 替代方案](https://northflank.com/blog/7-best-fireworks-ai-alternatives-for-inference)：比较评估。
- [Infrabase：2026 年 AI 推理 API 服务商](https://infrabase.ai/blog/ai-inference-api-providers-compared)：服务商格局。
