---
name: finetuning-pipeline
description: 运行可复现的数据到监督微调（SFT）、直接偏好优化（DPO）、服务的微调流水线，包含消融实验、量化和 2026 模型开放性框架（MOF）模型卡。
version: 1.0.0
phase: 19
lesson: 07
tags: [capstone, fine-tuning, axolotl, trl, dpo, grpo, vllm, eagle-3, mof]
---

给定基础模型（Llama 3.3 8B、Qwen3 14B 或 Gemma 3 12B）和任务专用数据集，构建一条命令即可运行的流水线，生成服务端点与可复现模型卡（Model Card）。

构建计划（Build Plan）：

1. 数据阶段：Datatrove 去重、Nemotron-CC 风格质量过滤器、Presidio 个人身份信息（Personally Identifiable Information，PII）清理，以及带随机种子的训练／验证划分。
2. 污染检查（Contamination Check）：用 MinHashLSH 与 MMLU-Pro、MT-Bench-v2、RewardBench-2 比较。有重叠即拒绝。
3. 监督微调（Supervised Fine-Tuning，SFT）：Axolotl v0.8 配合 ZeRO-3、Flash Attention 3、序列打包，在 8xH100 上训练 2–3 轮。
4. 偏好调优（Preference Tuning）：用 TRL 0.15 执行 1 轮直接偏好优化（Direct Preference Optimization，DPO），或使用可验证奖励的组相对策略优化（Group-Relative Policy Optimization，GRPO），并扫描 beta。
5. 量化（Quantize）：GPTQ-INT4-Marlin + AWQ-INT4 + GGUF-Q4_K_M。
6. 服务（Serve）：vLLM 0.7 使用 EAGLE-3 投机解码（Speculative Decoding），草稿头通过 Red Hat Speculators 或 SGLang SpecForge 训练。部署到 K8s，HPA 根据队列等待时间扩缩容。
7. 评估（Eval）：在基础模型／仅 SFT／SFT+DPO／SFT+GRPO 上运行 lm-evaluation-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro。
8. 安全（Safety）：Llama Guard 4 通过率，ShieldGemma-2 输出过滤器。
9. 按 2026 模型开放性框架（Model Openness Framework，MOF）生成模型卡，包含数据、训练、评估、安全和可复现性章节。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 相比基础模型的评估变化 | MMLU-Pro、MT-Bench-v2、任务专用基准上的实测增益 |
| 20 | 流水线可复现性 | 一条命令以相同随机种子重跑，产生匹配的哈希值（Hash） |
| 20 | 数据卫生（Data Hygiene） | 去重率、PII 清理覆盖率、污染检查通过 |
| 20 | 服务效率 | 批量 1/8/32 时的词元/秒、EAGLE-3 接受率、每百万词元美元成本 |
| 15 | 模型卡 + 安全评估 | 2026 MOF 完整度 + Llama Guard 4 通过率 |

直接判定不合格的情况（Hard Rejects）：

- 流水线跳过 MinHash 污染检查。将 MMLU-Pro 泄露到训练数据中，是典型的评估作弊失败模式。
- 训练运行未附随机种子或 YAML。可复现性是硬性要求。
- 提供服务时没有 EAGLE-3 或等效投机解码配置。基线词元/秒不符合 2026 年的要求。
- 缺少安全评估。每个微调版本必须附 Llama Guard 4 通过率。

拒绝规则（Refusal Rules）：

- 拒绝发布声称基准得分却未附 lm-eval-harness 提交 SHA 的模型卡。
- 拒绝使用许可禁止衍生模型的数据进行微调。MOF 会为数据许可评分。
- 未在评估矩阵中测量质量损失时，拒绝交付量化模型。

输出：一个仓库，包含流水线编排器、Llama 3.3 8B 与另一基础模型的 YAML、SFT 和 DPO 的 W&B 运行日志、量化交付物、服务端点、三个基准的评估矩阵、安全评估、2026 MOF 模型卡，以及说明所发现并修复的三个最大数据卫生问题的报告。
