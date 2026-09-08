# 综合实践 07：端到端微调流水线（End-to-End Fine-Tuning Pipeline，从数据到 SFT、DPO 与服务）

> 用自有数据训练一个 8B 模型，按自己的偏好进行直接偏好优化（Direct Preference Optimization，DPO）对齐，然后量化（Quantization）、投机解码（Speculative Decoding）并提供服务，测出每百万词元的美元成本。2026 年的开放技术栈包括 Axolotl v0.8、TRL 0.15、用于迭代的 Unsloth、用于量化的 GPTQ/AWQ/GGUF，以及用于服务的 vLLM 0.7 + EAGLE-3。本综合实践要求以可复现方式运行完整流水线：输入 YAML，输出服务端点，并按 2026 模型开放性框架（Model Openness Framework，MOF）发布模型卡（Model Card）。

**Type:** Capstone
**Languages:** Python（流水线）, YAML（配置）, Bash（脚本）
**Prerequisites:** 阶段 2（机器学习，ML）、阶段 3（深度学习，DL）、阶段 7（Transformer）、阶段 10（从零构建大语言模型）、阶段 11（大语言模型工程）、阶段 17（基础设施）、阶段 18（安全）
**涉及阶段（Phases exercised）:** P2 · P3 · P7 · P10 · P11 · P17 · P18
**Time:** 35 小时

## 问题（Problem）

2026 年每个认真开展 AI 工程的团队都会备有随时可用的微调（Fine-tuning）流水线。原因并非他们要交付前沿基础模型，而是可衡量的收益来自下游适配：领域监督微调（Supervised Fine-Tuning，SFT）、基于已标注偏好的 DPO、用于投机解码的蒸馏草稿模型，以及采用 EAGLE-3 的服务。Axolotl v0.8 处理多 GPU SFT 配置，TRL 0.15 处理 DPO 和组相对策略优化（Group-Relative Policy Optimization，GRPO），Unsloth 支持快速单 GPU 迭代。vLLM 0.7 配合 EAGLE-3，在不损失质量的情况下将解码吞吐量提升到 2–3 倍。工具已经可用；工程功夫在于 YAML 配置、数据卫生（Data Hygiene）与评估纪律。

你将使用任务专用数据，对一个 8B 基础模型（Llama 3.3、Qwen3 或 Gemma 3）先做 SFT 再做 DPO，量化后提供服务，并用 lm-evaluation-harness、RewardBench-2、MT-Bench-v2 和 MMLU-Pro 衡量收益。你还将按 2026 MOF 生成模型卡。重点是可复现性（Reproducibility）：一条命令即可端到端重跑完整流水线。

## 概念（Concept）

流水线有五个阶段。**数据（Data）**：去重（MinHash / Datatrove）、质量过滤（Nemotron-CC 风格分类器）、个人身份信息（Personally Identifiable Information，PII）清理，以及检查划分卫生以防公共基准污染。**监督微调（SFT）**：Axolotl YAML、8xH100 上的 ZeRO-3、余弦调度（Cosine Schedule）、序列打包（Sequence Packing），训练 2–3 轮。**DPO 或 GRPO**：TRL 配置、1 轮训练，偏好对由人工标注或模型判断，并调优 beta。**量化（Quantize）**：GPTQ + AWQ + GGUF，提高部署灵活性。**服务（Serve）**：vLLM 0.7 配 EAGLE-3 投机头（或 SGLang 配 SpecForge），部署到 K8s，按队列等待时间进行水平 Pod 自动扩缩容（Horizontal Pod Autoscaler，HPA）。

消融实验（Ablation）是交付物：在三个任务专用基准上比较仅 SFT、SFT+DPO 与 SFT+GRPO。服务指标包括批量 1 / 8 / 32 时的每秒词元数、EAGLE-3 接受率（Acceptance Rate）和每百万词元美元成本。安全评估采用 Llama Guard 4 通过率。模型卡包含偏差评估、可复现随机种子以及数据许可。

## 架构（Architecture）

```
原始数据（HF 数据集 + 内部数据）
    |
    v
Datatrove 去重 + Nemotron-CC 质量过滤 + PII 清理
    |
    v
划分卫生（Split Hygiene；MMLU-Pro 污染检查）
    |
    v
Axolotl SFT 配置（YAML）  ---> 8xH100、ZeRO-3
    |
    v
TRL DPO / GRPO 配置        ---> 4xH100、1 轮
    |
    v
GPTQ + AWQ + GGUF 量化
    |
    v
vLLM 0.7 + EAGLE-3 投机解码
    |
    v
K8s 部署，HPA 按队列等待时间扩缩容
    |
    v
lm-eval-harness + RewardBench-2 + MT-Bench-v2 + MMLU-Pro
    |
    v
模型卡（2026 MOF）+ 安全评估（Llama Guard 4）
```

## 技术栈（Stack）

- 数据：Datatrove 去重，Nemotron-CC 分类器评定质量，Presidio 处理 PII
- 基础模型（Base）：Llama 3.3 8B、Qwen3 14B 或 Gemma 3 12B
- SFT：Axolotl v0.8，采用 ZeRO-3、Flash Attention 3 和序列打包
- 偏好调优（Preference Tuning）：TRL 0.15 执行 DPO 或 GRPO；Unsloth 进行单 GPU 迭代
- 量化：GPTQ（Marlin）、AWQ，以及通过 llama.cpp 生成 GGUF
- 服务：vLLM 0.7 + EAGLE-3 投机解码（或 SGLang 0.4 + SpecForge）
- 评估：lm-evaluation-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro
- 安全评估：Llama Guard 4、ShieldGemma-2
- 基础设施：Kubernetes + NVIDIA 设备插件，HPA 使用队列等待指标
- 可观测性（Observability）：训练用 W&B，推理用 Langfuse

```figure
ce-finetune-stages
```

## 动手实现（Build It）

1. **数据流水线（Data Pipeline）。** 对原始语料运行 Datatrove 去重。应用 Nemotron-CC 风格质量分类器。用 Presidio 清理 PII。以明确的随机种子写出训练／验证划分。

2. **污染检查（Contamination Check）。** 对每份验证划分，计算其与 MMLU-Pro、MT-Bench-v2、RewardBench-2 测试集的 MinHash。拒绝任何重叠。

3. **Axolotl 监督微调（SFT）。** YAML 配置 ZeRO-3、FA3、序列打包。在 8xH100 上训练 2–3 轮。日志写入 W&B。

4. **TRL 偏好优化（DPO / GRPO）。** 从 SFT 检查点出发，在偏好对上运行一轮 DPO（或在数学／代码任务上使用可验证奖励运行 GRPO）。扫描 beta。

5. **量化（Quantize）。** 生成三种量化版本：GPTQ-INT4-Marlin、AWQ-INT4，以及供 llama.cpp 使用的 GGUF-Q4_K_M。记录大小与标称吞吐量。

6. **采用投机解码提供服务（Serve with Speculative Decoding）。** 在 vLLM 0.7 配置中使用通过 Red Hat Speculators 训练的 EAGLE-3 草稿头（Draft Head）。测量批量 1 / 8 / 32 时的接受率与尾部延迟（Tail Latency）。在相同评估上报告每百万词元美元成本，并与 Anthropic / OpenAI 比较。

7. **评估矩阵（Eval Matrix）。** 在基础模型、仅 SFT、SFT+DPO、SFT+GRPO 上运行 lm-eval-harness、RewardBench-2、MT-Bench-v2 和 MMLU-Pro。生成表格。

8. **安全评估（Safety Eval）。** 测量开发集上的 Llama Guard 4 通过率。使用 ShieldGemma-2 输出过滤器。

9. **模型卡（Model Card）。** 使用 MOF 2026 模板：数据、训练、评估、安全、许可，以及附 YAML 和提交 SHA 的可复现性章节。

## 实际应用（Use It）

```
$ ./pipeline.sh config/llama3.3-8b-domainX.yaml
[data]    300k deduped, 12k filtered, 280k accepted (seed=7)
[SFT]     3 epochs, 8xH100, 6h12m, val loss 1.42 -> 1.03
[DPO]     1 epoch, beta=0.08, 4xH100, 1h40m
[quant]   GPTQ-INT4 4.6 GB, AWQ-INT4 4.8 GB, GGUF-Q4_K_M 5.1 GB
[serve]   vLLM 0.7, EAGLE-3 acceptance 0.74, p99 126ms @ bs=8
[eval]    MMLU-Pro +3.2, MT-Bench-v2 +0.41, RewardBench-2 +0.08
[card]    model-card.md generated under 2026 MOF
```

## 交付成果（Ship It）

`outputs/skill-finetuning-pipeline.md` 描述交付物。一条命令依次完成数据、SFT、DPO、量化、服务与评估，并输出模型卡和服务端点。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 相比基础模型的评估变化 | 目标任务上的实测增益（MMLU-Pro、MT-Bench-v2、任务专用基准） |
| 20 | 流水线可复现性 | 一条命令以相同随机种子端到端重跑 |
| 20 | 数据卫生 | 去重率、PII 清理覆盖率、污染检查通过 |
| 20 | 服务效率 | bs=1/8/32 时的词元/秒、EAGLE-3 接受率、每百万词元美元成本 |
| 15 | 模型卡 + 安全评估 | 2026 MOF 完整度 + Llama Guard 4 通过率 |
| **100** | | |

## 练习（Exercises）

1. 在同一任务专用基准上比较仅 SFT、SFT+DPO 和 SFT+GRPO。报告哪种偏好方法胜出，以及领先幅度。

2. 将 Llama 3.3 8B 更换为 Qwen3 14B。在质量匹配时测量每百万词元美元成本。

3. 测量领域数据与通用 ShareGPT 上的 EAGLE-3 接受率。报告差值及其对延迟预算的意义。

4. 注入 1% 污染（将 MMLU-Pro 答案泄露到训练数据），重新运行评估。观察 MMLU-Pro 准确率不切实际地跃升。构建能捕获该问题的污染检查持续集成（Continuous Integration，CI）关卡。

5. 增加低秩适配（Low-Rank Adaptation，LoRA）SFT，作为全参数微调的替代方案。测量内存降至十分之一时的质量差距。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| Axolotl | “SFT 训练器” | 由 YAML 驱动的统一训练器，支持 SFT、DPO 与蒸馏（Distillation） |
| TRL | “偏好调优器” | Hugging Face 库，用于对 LLM 进行 DPO、GRPO、近端策略优化（Proximal Policy Optimization，PPO） |
| 组相对策略优化（Group-Relative Policy Optimization，GRPO） | “组相对策略优化” | DeepSeek R1 使用可验证奖励的强化学习（Reinforcement Learning，RL）方案 |
| EAGLE-3 | “投机解码草稿” | 提前预测 N 个词元的草稿头；vLLM 用目标模型验证 |
| 模型开放性框架（Model Openness Framework，MOF） | “模型开放性框架” | 2026 年按数据、代码和许可为模型发布评分的标准 |
| 污染检查（Contamination Check） | “划分卫生” | 基于 MinHash 检测测试集向训练集泄露 |
| 接受率（Acceptance Rate） | “EAGLE / 多词元预测（MTP）指标” | 草拟词元中被目标模型接受的比例 |

## 延伸阅读（Further Reading）

- [Axolotl 文档](https://axolotl-ai-cloud.github.io/axolotl/)：参考 SFT / DPO 训练器
- [TRL 文档](https://huggingface.co/docs/trl)：DPO 与 GRPO 参考实现
- [Unsloth](https://github.com/unslothai/unsloth)：单 GPU 迭代参考
- [DeepSeek R1 论文（arXiv:2501.12948）](https://arxiv.org/abs/2501.12948)：GRPO 方法
- [vLLM + EAGLE-3 文档](https://docs.vllm.ai)：参考服务技术栈
- [SGLang SpecForge](https://github.com/sgl-project/SpecForge)：另一种投机解码训练器
- [模型开放性框架（Model Openness Framework）2026](https://isocpp.org/)：开放发布评分标准
- [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness)：典型评估运行器
