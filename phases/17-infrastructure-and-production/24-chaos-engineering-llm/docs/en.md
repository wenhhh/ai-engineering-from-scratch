# LLM 生产环境的混沌工程（Chaos Engineering for LLM Production）

> 到 2026 年，LLM 混沌工程已成为独立实践。在生产中运行实验前，必须具备明确的 SLI/SLO、链路/指标/日志可观测性、自动回滚、运行手册和值班机制。架构有四个平面：控制平面（实验调度器）、目标平面（服务、基础设施、数据存储）、安全平面（防护、中止、流量过滤）、可观测性平面（指标、链路、日志），以及反馈环路（用于调整 SLO）。护栏不可缺少：若每日错误预算消耗超过预期的 2 倍，消耗速率告警会暂停实验；抑制窗口与 trace-ID 关联用于消除重复告警噪声。节奏为每周小范围金丝雀加 SLO 评审，每月演练日加复盘，每季度跨团队韧性审计加依赖映射。LLM 特有实验包括内存过载、网络故障、提供商中断、畸形提示词和 KV 缓存驱逐风暴。工具包括 Harness Chaos Engineering（LLM 生成建议、缩小影响范围、MCP 工具集成）、LitmusChaos（CNCF）和 Chaos Mesh（CNCF，Kubernetes 原生）。

**Type:** Learn
**Languages:** Python（标准库，简化的混沌实验运行器）
**Prerequisites:** 阶段 17 · 23（AI 的 SRE），阶段 17 · 13（可观测性）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 列出五项混沌工程前提：SLI/SLO、可观测性、回滚、运行手册、值班，并解释为什么缺少任何一项都会破坏实践。
- 绘制控制、目标、安全、可观测性四个平面，以及回到 SLO 的反馈环路。
- 列出五种 LLM 特有实验：内存过载、网络故障、提供商中断、畸形提示词、KV 驱逐风暴。
- 根据技术栈，在 Harness、LitmusChaos、Chaos Mesh 中选择工具。

## 问题（The Problem）

传统服务栈的混沌测试已很成熟，LLM 服务栈却增加了新的失效模式。含异常字符的 4K 词元提示词可能让分词器停滞 12 秒。上游提供商返回 429，网关重试，重试放大的并发使服务 OOM。突发负载下的 KV 缓存驱逐风暴可能引发重复预填充级联，耗尽计算能力。

这些问题不会出现在单元测试里。混沌工程让你在用户遇到它们之前发现问题。

## 概念（The Concept）

### 前提条件（Prerequisites）

缺少以下条件时，不要在生产运行混沌实验：

1. **SLI/SLO**：明确服务级别指标和目标。
2. **可观测性（observability）**：链路、指标、日志已接入仪表盘。
3. **自动回滚（automated rollback）**：阶段 17 · 20 的策略开关回滚。
4. **运行手册（runbooks）**：结构化，参见阶段 17 · 23。
5. **值班（on-call）**：有人负责响应。

缺少任何一项，混沌实验都可能变成真实事件。

### 四个平面与反馈（Four planes + feedback）

**控制平面（control plane）**：实验调度器，如 Litmus 工作流、Chaos Mesh 调度、Harness UI。

**目标平面（target plane）**：服务、Pod、节点、负载均衡器、数据存储。

**安全平面（safety plane）**：紧急停止开关、抑制窗口、影响范围限制、错误预算门禁。

**可观测性平面（observability plane）**：常规指标加 trace-ID 关联，用于区分混沌诱发故障与自然故障。

**反馈环路（feedback loop）**：将发现用于 SLO 调整、运行手册更新和代码修复。

### 护栏不可缺少（Guardrails are mandatory）

- **消耗速率告警（burn-rate alert）**：每日错误预算消耗超过预期 2 倍时，暂停实验。
- **抑制窗口（suppression windows）**：实验期间，静默影响范围内的非实验告警。
- **trace-ID 关联（trace-ID correlation）**：所有实验诱发错误携带标签，便于值班人员去重。

### 五种 LLM 特有实验（Five LLM-specific experiments）

1. **内存过载（memory overload）**：高并发发送长上下文请求，强制引发 KV 缓存抢占风暴。观察服务是优雅卸载负载，还是崩溃。

2. **网络故障（network failure）**：切断推理网关与提供商的连接。观察回退是否在 SLA 内启动，参见阶段 17 · 19。

3. **提供商中断模拟（provider outage simulation）**：让 OpenAI 100% 返回 429。观察路由是否故障转移到 Anthropic，参见阶段 17 · 16、19。

4. **畸形提示词（malformed prompt）**：注入使分词器停滞的载荷，例如深层嵌套 Unicode、超大 UTF-8 码点。观察单个请求是否卡住一个工作进程。

5. **KV 驱逐风暴（KV eviction storm）**：耗尽 vLLM 块预算，强制驱逐。观察 LMCache 能否恢复，还是服务退化。

### 节奏（Cadence）

- **每周**：在预发布环境开展小范围金丝雀实验，也可能使用 5% 生产流量。
- **每月**：针对具体场景安排演练日，跨团队参与，并进行复盘。
- **每季度**：跨团队韧性审计，更新依赖图。

### 工具（Tooling）

- **Harness Chaos Engineering**：商业产品，AI 生成实验建议、缩小影响范围、集成 MCP 工具。
- **LitmusChaos**：CNCF 毕业项目，基于 Kubernetes 工作流。
- **Chaos Mesh**：CNCF 沙箱项目，采用 Kubernetes 原生 CRD 风格。
- **Gremlin**：商业产品，支持范围广。
- **AWS FIS** / **Azure Chaos Studio**：托管云产品。

### 从小处开始（Starting small）

第一个实验：在稳定流量下终止一个解码副本 Pod，观察重新路由与恢复。如果有效且看起来安全，再推进到网络混沌。

第一个 LLM 特有实验：让一家提供商持续 5 分钟返回 429，观察回退。多数团队会发现自己的回退没有被充分测试。

### 应记住的数字（Numbers you should remember）

- 四个平面：控制、目标、安全、可观测性。
- 消耗速率暂停阈值：预期每日预算消耗的 2 倍。
- 节奏：每周金丝雀、每月演练日、每季度审计。
- 五种 LLM 实验：内存、网络、提供商、畸形提示词、KV 风暴。

```figure
i4-chaos-guard
```

## 动手使用（Use It）

`code/main.py` 模拟三个带安全平面门禁的混沌实验，报告哪些实验会触发消耗速率中止。

## 交付成果（Ship It）

本课产出 `outputs/skill-chaos-plan.md`。它根据服务栈和成熟度，选择前三个实验及工具。

## 练习（Exercises）

1. 运行 `code/main.py`。哪个实验触发消耗速率门禁，为什么？
2. 为基于 vLLM 的 RAG 服务设计前五个混沌实验，包含成功标准。
3. 消耗速率告警暂停了实验。如何确定根因来自混沌实验还是自然故障？
4. 论证混沌应在生产运行，还是仅在预发布运行。何时生产才是正确选择？
5. 列出三种通用网络混沌无法复现的 LLM 特有失效模式。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| SLI / SLO | “服务目标” | 指标与目标，必备前提 |
| 影响范围（Blast radius） | “范围” | 受实验影响的服务或用户集合 |
| 消耗速率告警（Burn-rate alert） | “预算门禁” | 错误预算消耗速率超过预期 2 倍时触发 |
| 演练日（Game day） | “月度演练” | 计划内跨团队混沌演习 |
| LitmusChaos | “CNCF 工作流” | CNCF 毕业的 Kubernetes 混沌工具 |
| Chaos Mesh | “CNCF CRD” | CNCF 沙箱中的 Kubernetes 原生混沌工具 |
| Harness CE | “商业 AI 辅助” | 提供 AI 建议的 Harness 混沌产品 |
| 畸形提示词（Malformed prompt） | “分词器炸弹” | 导致分词停滞的输入 |
| KV 驱逐风暴（KV eviction storm） | “抢占级联” | 大规模驱逐引发重复预填充 |

## 延伸阅读（Further Reading）

- [DevSecOps School：2026 年混沌工程指南](https://devsecopsschool.com/blog/chaos-engineering/)
- [Ankush Sharma：LLM 可观测性（书籍）](https://www.amazon.com/Observability-Large-Language-Models-Engineering-ebook/dp/B0DJSR65TR)
- [LitmusChaos（CNCF）项目](https://litmuschaos.io/)
- [Chaos Mesh（CNCF）项目](https://chaos-mesh.org/)
- [Harness Chaos Engineering 产品页](https://www.harness.io/products/chaos-engineering)
- [AWS FIS 产品页](https://aws.amazon.com/fis/)
