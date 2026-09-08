# 托管 LLM 平台（Managed LLM Platforms）：Bedrock、Vertex AI、Azure OpenAI

> 三家超大规模云服务商（Hyperscaler）采用三种策略。AWS Bedrock 是模型市场，通过同一个 API 提供 Claude、Llama、Titan、Stability 和 Cohere。Azure OpenAI 通过与 OpenAI 的独家合作，以及提供专用容量的预配吞吐量单位（Provisioned Throughput Units，PTU）开展服务。Vertex AI 以 Gemini 为先，在长上下文和多模态方面最具优势。2026 年 Artificial Analysis 对相当于 Llama 3.1 405B 的部署测得：Azure OpenAI 延迟中位数约为 50 ms，Bedrock 约为 75 ms；PTU 解释了这一差距，因为专用容量优于共享按需容量。决策标准不是“谁最快”，而是“谁的模型目录和云财务管理（FinOps）能力适合我的产品”。本课教你将权衡明确写下来，据此选型，而非凭感觉。

**Type:** Learn
**Languages:** Python (标准库，成本与延迟的简化比较器)
**Prerequisites:** 阶段 11（LLM 工程，LLM Engineering）、阶段 13（工具与协议，Tools & Protocols）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 说出三种平台策略（模型市场、独家合作、Gemini 优先），并为每种策略匹配产品用例。
- 解释 Azure OpenAI 的预配吞吐量单位（PTU）带来什么，以及为什么在 405B 规模下，按需 Bedrock 的实测延迟通常慢约 25 ms。
- 绘制各平台的 FinOps 归因能力图：Bedrock Application Inference Profiles、Vertex 每团队一个项目、Azure 作用域加 PTU 预留。
- 写出“至少两家服务商”的策略，解释为什么在 2026 年，锁定单一供应商会付出高昂代价。

## 问题背景（The Problem）

你为产品选择了 Claude 3.7 Sonnet，现在需要提供推理服务。你可以直接调用 Anthropic API，也可以通过 AWS Bedrock 或网关调用。直接 API 最简单；Bedrock 增加了业务伙伴协议（Business Associate Agreement，BAA）、VPC 端点、IAM 和 CloudWatch 归因。网关则增加跨服务商的故障转移（Failover）、统一计费和速率限制。

更深层的问题是模型目录。如果同一个产品需要 Claude、Llama 和 Gemini，就无法从同一处购买全部模型，除非这个入口同时整合了 Bedrock、Vertex 和 Azure OpenAI。超大规模云服务商不能互相替代：它们对谁将掌握模型层做出了不同的押注。

本课梳理这三种押注，以及延迟差距、FinOps 差异和供应商锁定风险。

## 核心概念（The Concept）

### 三种策略（Three strategies）

**AWS Bedrock** 是模型市场，提供 Claude（Anthropic）、Llama（Meta）、Titan（AWS 第一方）、Stability（图像）、Cohere（嵌入）、Mistral，以及图像与嵌入子目录。它们共用一个 API、一套 IAM 和一个 CloudWatch 导出入口。Bedrock 的判断是：客户需要选择空间，胜过依赖某一个模型。

**Azure OpenAI** 采用独家合作策略。你可以在 Azure 数据中心使用 GPT-4 / 4o / 5 / o-series、DALL·E、Whisper，以及 OpenAI 模型微调（Fine-tuning）。“Azure OpenAI Service”目录不包含非 OpenAI 模型；这些模型属于独立产品 Azure AI Foundry。Azure 的判断是：OpenAI 会保持前沿地位，而客户希望在这段特定合作关系上获得企业级管控。

**Vertex AI** 将 Gemini 放在首位，其他模型其次。它提供 Gemini 1.5 / 2.0 / 2.5 Flash 和 Pro，以及第三方模型目录 Model Garden。Vertex 押注多模态长上下文；Gemini 的 1M 词元（Token）上下文是其差异化优势。

### 规模化部署的延迟差距（Latency gap at scale）

Artificial Analysis 持续开展基准测试。在等效的 Llama 3.1 405B 部署中（共享按需），Azure OpenAI 首词元延迟（Time to First Token，TTFT）中位数约为 50 ms，Bedrock 约为 75 ms。差距并不是 AWS 的失败，而是容量模式的差异。Azure 销售 PTU，为你的租户预留 GPU 容量。Bedrock 也提供对应的 Provisioned Throughput，但每单位起价约为 $21/小时，大多数客户仍使用共享按需容量。

共享按需容量会与其他所有客户的流量竞争，专用容量不会。如果产品服务等级协议（Service Level Agreement，SLA）要求 P99 的 TTFT < 100 ms，你要么购买 Azure PTU 或 Bedrock Provisioned Throughput，要么接受默认容量下的波动。

### 预配吞吐量的经济性（Provisioned Throughput economics）

Azure PTU 是一块预留的推理算力。对于可预测的工作负载，与按需模式相比最多可节省约 70%。每小时费用固定，与流量无关，闲置时也要为预留付费。盈亏平衡点通常在持续利用率 40-60% 左右。

Bedrock Provisioned Throughput 的价格为每小时 $21-$50，取决于模型和区域。计算方式类似，盈亏平衡点约为峰值利用率的一半，需要按月承诺用量。

Vertex 按 Gemini SKU 销售预配容量，定价随模型和区域变化，公开披露较少。

### FinOps 能力：真正的差异所在（FinOps surface — the real differentiator）

**Bedrock Application Inference Profiles** 提供了模型市场中最直接的归因方式。为一个配置档案添加 `team`、`product`、`feature` 标签，让所有模型调用都经过该档案；CloudWatch 就能按档案拆分成本，无需后处理。此功能于 2025 年加入，仍是超大规模云平台中粒度最细的原生能力。

**Vertex** 的归因方式是每个团队一个项目，并为所有资源添加标签。你将团队建模为 GCP 项目，为每项资源打标签，再用 BigQuery Billing Export + DataStudio 汇总。工作更多，但 BigQuery 允许你对成本数据执行任意 SQL。

**Azure** 依赖订阅或资源组作用域加标签，并将 PTU 预留作为一等成本对象。标签从资源组继承，而非来自请求，因此逐请求归因需要 Application Insights 自定义指标，或由网关写入请求头。

总体模式是：Bedrock 原生能力最直接，Vertex 借助 BigQuery 最灵活；Azure 如果没有埋点，成本最不透明。

### 供应商锁定是 2026 年的风险（Lock-in is the 2026 risk）

当一个模型占据主导地位时，承诺只使用一家云服务商并无大碍。2026 年，前沿模型每月都在变化：这一季度是 Claude 3.7，下一季度是 Gemini 2.5，再下一季度是 GPT-5。锁定一个平台，就会将自己挡在三分之二的前沿模型之外。

实践团队采用的模式是：产品关键 LLM 调用至少接入两家服务商。常见组合是 Bedrock 加 Azure OpenAI：一家提供 Claude，另一家提供 GPT，通过同一个网关进行故障转移。网关会选择最优路由，因此成本增幅可以忽略；但在故障期间，例如 2025 年 1 月的 Azure OpenAI 事故和 AWS us-east-1 中断，其可用性收益具有决定性意义。

### 数据驻留、BAA 与受监管行业（Data residency, BAAs, and regulated industries）

Bedrock：大多数区域提供 BAA、VPC 端点和防护机制（Guardrails），是金融科技常见的默认选择。
Azure OpenAI：提供 HIPAA、SOC 2、ISO 27001 和欧盟数据驻留，是受监管企业的默认选择。
Vertex：提供 HIPAA、GDPR、按区域的数据驻留，以及 Google Cloud 的合规体系。

三者都满足基本合规清单。区别在于数据保留策略、日志处理方式，以及滥用监控（Abuse monitoring）是否读取你的流量。大多数服务默认启用，企业客户可以选择退出。

### 应记住的数值（Numbers you should remember）

- Azure OpenAI 在相当于 Llama 3.1 405B 的部署上，TTFT 中位数约为 50 ms（使用 PTU）。
- Bedrock 按需模式的 TTFT 中位数约为 75 ms。
- Bedrock Provisioned Throughput：每单位 $21-$50/小时。
- Azure PTU 盈亏平衡点：持续利用率约为 40-60%。
- 高利用率时 PTU 相比按需模式最多节省 70%。

```figure
i4-platform-lanes
```

## 实际应用（Use It）

`code/main.py` 在合成工作负载上比较三种平台，建模按需与 PTU 的经济性、TTFT 波动和成本归因的准确程度。运行它，查看 PTU 在何种情况下划算，以及模型市场的覆盖广度何时比 TTFT 差距更重要。

## 交付成果（Ship It）

本课产出 `outputs/skill-managed-platform-picker.md`。输入工作负载画像，包括所需模型、TTFT SLA、每日用量和合规要求，它会推荐主平台、备用平台，以及 FinOps 埋点方案。

## 练习（Exercises）

1. 运行 `code/main.py`。对于 70B 级模型，持续利用率达到多少时 Azure PTU 比按需模式便宜？计算盈亏平衡点，并与宣传的 40-60% 区间比较。
2. 产品需要 Claude 3.7 Sonnet 和 GPT-4o。设计双服务商部署：各模型部署到哪家云服务商，前端使用什么网关，故障转移策略是什么？
3. 一位受监管的医疗客户要求 BAA、US-East 数据驻留，以及低于 100ms 的 P99 TTFT。选择一个平台，并用三项具体能力说明理由。
4. 你发现本月 Bedrock 账单增至 4 倍，而流量没有变化。不使用 Application Inference Profiles 时，如何找到原因？使用配置档案后需要多久？
5. 阅读 Azure OpenAI 和 Bedrock 定价页面。对于每月 100M 词元的 Claude 工作负载，直接 Anthropic API、Bedrock 按需模式和 Bedrock Provisioned Throughput 哪个更便宜？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| Bedrock | “AWS 的 LLM 服务” | 覆盖 Claude、Llama、Titan、Mistral、Cohere 的模型市场 |
| Azure OpenAI | “Azure 的 ChatGPT” | 在 Azure 数据中心提供专属 OpenAI 模型，附带企业级管控 |
| Vertex AI | “Google 的 LLM” | 以 Gemini 为先，并通过 Model Garden 提供第三方模型的平台 |
| 预配吞吐量单位（PTU） | “专用容量” | Provisioned Throughput Unit，预留推理 GPU，按小时计费 |
| Application Inference Profile | “Bedrock 打标签” | 按产品记录成本和用量的带标签配置档案，由 CloudWatch 原生支持 |
| Model Garden | “Vertex 模型目录” | Vertex AI 的第三方模型区域，与 Gemini 分开 |
| 至少两家服务商（Two-provider minimum） | “LLM 冗余” | 每条关键 LLM 路径跨 ≥2 家超大规模云服务商运行的策略 |
| 业务伙伴协议（BAA） | “HIPAA 文书” | Business Associate Agreement，处理受保护健康信息（PHI）所必需，三家均提供 |
| 滥用监控（Abuse monitoring） | “日志监视器” | 服务商对提示词和输出执行安全扫描，企业客户可以退出 |

## 延伸阅读（Further Reading）

- [AWS Bedrock 定价](https://aws.amazon.com/bedrock/pricing/)：权威费率表及 Provisioned Throughput 定价。
- [Azure OpenAI Service 定价](https://azure.microsoft.com/en-us/pricing/details/azure-openai/)：PTU 经济性及费率表。
- [Vertex AI 生成式 AI 定价](https://cloud.google.com/vertex-ai/generative-ai/pricing)：Gemini 档位及 Model Garden 附加费用。
- [Artificial Analysis LLM 排行榜](https://artificialanalysis.ai/)：跨服务商持续开展的延迟与吞吐量基准测试。
- [The AI Journal：AWS Bedrock 与 Azure OpenAI 的 2026 年 CTO 指南](https://theaijournal.co/2026/03/aws-bedrock-vs-azure-openai/)：企业决策框架。
- [Finout：Bedrock、Vertex 与 Azure 的 FinOps 对比](https://www.finout.io/blog/bedrock-vs.-vertex-vs.-azure-cognitive-a-finops-comparison-for-ai-spend)：并排比较成本归因机制。
