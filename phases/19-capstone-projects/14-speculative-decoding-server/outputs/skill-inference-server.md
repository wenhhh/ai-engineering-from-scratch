---
name: inference-server
description: 交付投机解码（Speculative Decoding）推理服务器，采用 EAGLE-3 或 P-EAGLE 草稿、K8s 自动扩缩容，并附完整吞吐量、延迟与成本报告。
version: 1.0.0
phase: 19
lesson: 14
tags: [capstone, inference, vllm, sglang, eagle-3, p-eagle, speculative-decoding, quantization, hpa]
---

给定两个开放目标模型（Llama 3.3 70B，以及 Qwen3-Coder-30B MoE 或 GPT-OSS-120B），交付带投机解码、量化和 Kubernetes 自动扩缩容的生产服务栈。发布实测加速比与尾部延迟（Tail Latency）数值。

构建计划（Build Plan）：

1. 在 vLLM 0.7 或 SGLang 0.4 下部署目标模型，采用 FP8 Marlin 量化（Quantization）。
2. 从 Red Hat Speculators 加载对齐的 EAGLE-3 草稿，或通过 SpecForge 训练。
3. 基线数值：不启用投机时，批量 1/8/32 的词元/秒及 p50/p99 延迟。
4. 启用 EAGLE-3，重跑相同基准。报告加速比、接受率（Acceptance Rate）、p99 尾部延迟变化。
5. 启用 P-EAGLE 并行投机；报告更深树从有益变为有害的拐点。
6. 跨分布运行基准：ShareGPT、HumanEval、领域数据。发布接受率漂移。
7. 在第二个目标模型（MoE）上重复，识别草稿接受率对路由噪声的敏感性。
8. 部署到 Kubernetes，HPA 追踪 `queue_wait_ms`。演示负载变为三倍时横向扩容。
9. 在匹配评估上比较每百万词元美元成本，与 Anthropic Claude Sonnet 4.7 和 OpenAI GPT-5.4 对照。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 相比基线的实测加速比 | 两个模型在质量匹配时吞吐量达到 2.5 倍以上 |
| 20 | 真实流量接受率 | 逐分布接受率报告 |
| 20 | P99 尾部延迟纪律 | 批量 1/8/32 时启用与禁用投机的 p99 |
| 20 | 运维（Ops） | K8s 部署、HPA 按队列等待扩缩容、平稳发布、先排空再升级（Drain-First Upgrade） |
| 15 | 报告与方法 | 指标推导清晰，基线匹配 |

直接判定不合格的情况（Hard Rejects）：

- 报告稳态吞吐量却没有尾部延迟。
- HPA 使用 CPU 而非队列等待指标。在 GPU 饱和时会震荡。
- 忽略草稿与目标版本对齐。漂移草稿比不采用投机成本更高。
- 成本比较忽略托管 API 的提示词缓存折扣。

拒绝规则（Refusal Rules）：

- 没有发布排空机制时拒绝提供服务。请求仍在处理时原地升级不合格。
- 拒绝将各分布接受率汇总报告。必须逐分布报告。
- 没有匹配的非投机数值时，拒绝声称投机解码在 bs=32 时胜出。

输出：一个仓库，包含 vLLM / SGLang 配置、EAGLE-3 草稿下载脚本、K8s 部署清单、基于队列等待的 HPA 配置、ShareGPT / HumanEval / 领域数据基准框架、每百万词元美元成本比较表，以及说明投机解码引入的三种尾部延迟回归和各自修复措施（按批量设置关卡、ngram 备用、量化调整）的报告。
