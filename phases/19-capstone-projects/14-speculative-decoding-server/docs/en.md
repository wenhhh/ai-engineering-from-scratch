# 综合实践 14：投机解码推理服务器（Speculative-Decoding Inference Server）

> 投机解码（Speculative Decoding）让低成本草稿模型提出词元，再由目标模型一次验证，如今是生产就绪的优化，而非研究技巧。vLLM 0.7 中的 EAGLE-3 在真实流量上提供 2.5–3 倍吞吐量。P-EAGLE（AWS 2026）进一步推进并行投机（Parallel Speculation）。SGLang 的 SpecForge 大规模训练草稿头（Draft Head），Red Hat 的 Speculators 中心发布了与常见开放模型对齐的草稿，TensorRT-LLM 将投机解码作为 NVIDIA 平台的一等能力。2026 年的生产服务栈采用 vLLM 或 SGLang，配 EAGLE 家族草稿、FP8 或 INT4 量化（Quantization），并按队列等待时间进行水平 Pod 自动扩缩容（Horizontal Pod Autoscaler，HPA）。本综合实践要求为两个开放模型提供服务，达到基线 2.5 倍以上吞吐量，附完整尾部延迟（Tail Latency）报告。

**Type:** Capstone
**Languages:** Python（服务）, C++ / CUDA（内核检查）, YAML（配置）
**Prerequisites:** 阶段 3（深度学习）、阶段 7（Transformer）、阶段 10（从零构建大语言模型）、阶段 17（基础设施）
**涉及阶段（Phases exercised）:** P3 · P7 · P10 · P17
**Time:** 30 小时

## 问题（Problem）

投机解码在 2026 年成为通用能力。EAGLE-3 草稿头使用目标模型隐藏状态（Hidden State）训练，提前预测 N 个词元；目标模型一次验证。60–80% 的接受率（Acceptance Rate）转化为 2–3 倍端到端吞吐量。vLLM 0.7 原生集成这项能力，SGLang + SpecForge 提供训练流水线。Red Hat 的 Speculators 为 Llama 3.3 70B、Qwen3-Coder-30B 混合专家模型（Mixture of Experts，MoE）、GPT-OSS-120B 发布对齐草稿。

工程功夫在服务运维，而非模型。接受率随流量分布漂移，例如 ShareGPT、代码、领域数据。拒绝情况下的尾部延迟比不采用投机更差，因此必须报告多种批量大小的 p99，而不能仅报告稳态词元/秒。与 Anthropic / OpenAI API 比较每百万词元成本，是建立可信度的关键。

## 概念（Concept）

投机解码有两层。**草稿（Draft）**模型（EAGLE-3 头、ngram 或与目标对齐的较小模型）每步提出 k 个候选词元。**目标（Target）**模型一次验证全部 k 个；被接受的前缀替代贪心路径（Greedy Path）。接受率取决于草稿与目标的对齐程度以及输入分布。

EAGLE-3 在大多数流量上优于 ngram 草稿。P-EAGLE 并行投机，以支持更深草稿树。代价是拒绝时 P99 延迟更高，因为验证计算更大。服务配置必须按批量大小分桶报告延迟，才能揭示这一点。

部署采用 Kubernetes。vLLM 0.7 每个 GPU 或张量并行（Tensor Parallelism）分片运行一个副本。HPA 根据队列等待时间而非 CPU 自动扩缩容。FP8（Marlin）和 INT4（AWQ）量化使显存需求控制在 H100 / H200 容量内。端到端报告包括吞吐量、接受率、批量 1/8/32 时的 p50/p99，以及每百万词元美元成本。

## 架构（Architecture）

```
请求入口（Request Ingress）
    |
    v
vLLM 服务器（0.7）或 SGLang（0.4）
    |
    +-- 草稿：EAGLE-3 头 | P-EAGLE 并行 | ngram 备用
    +-- 目标：Llama 3.3 70B | Qwen3-Coder-30B | GPT-OSS-120B
    |     量化为 FP8-Marlin 或 INT4-AWQ
    |
    v
验证计算（Verify Pass）：目标模型批量处理 k 个草稿词元
    |
    v（接受前缀；对被拒绝后缀重新采样）
    v
词元流返回客户端
    |
    v
Prometheus 指标：吞吐量、接受率、队列等待、p50/p99 延迟
    |
    v
HPA 使用队列等待指标
```

## 技术栈（Stack）

- 服务：vLLM 0.7 或 SGLang 0.4
- 投机方法：EAGLE-3 草稿头、P-EAGLE 并行投机、ngram 备用
- 草稿训练：SpecForge（SGLang）或 Red Hat Speculators
- 目标模型：Llama 3.3 70B、Qwen3-Coder-30B MoE、GPT-OSS-120B
- 量化：FP8（Marlin）、INT4 AWQ
- 部署：Kubernetes + NVIDIA 设备插件；HPA 使用队列等待指标
- 评估：ShareGPT、MT-Bench-v2、GSM8K、HumanEval，用于跨领域接受率测量
- 参考：TensorRT-LLM 投机解码，作为厂商基线

```figure
cf-spec-decode
```

## 动手实现（Build It）

1. **目标模型准备（Target Model Prep）。** 选择 Llama 3.3 70B。通过 Marlin 量化到 FP8，在单张 H100（或两卡张量并行）上用 vLLM 0.7 部署。

2. **草稿来源（Draft Source）。** 从 Red Hat Speculators 获取对齐的 EAGLE-3 草稿头，或通过 SpecForge 训练。加载到 vLLM 投机解码配置。

3. **基线数值（Baseline Numbers）。** 启用投机前，测量批量 1/8/32 的词元/秒、p50/p99 延迟、GPU 利用率并发布。

4. **启用 EAGLE-3（Enable EAGLE-3）。** 切换配置，重跑相同基准。报告加速比、接受率、p99 尾部延迟变化。

5. **并行投机（P-EAGLE）。** 启用并行投机，测量更深草稿树与串行 EAGLE-3 的差别。报告 P-EAGLE 从有益变为有害的拐点。

6. **领域流量（Domain Traffic）。** 在同一服务器运行 ShareGPT、HumanEval 与领域专用流量。测量逐分布接受率，识别草稿何时漂移。

7. **第二目标模型（Second Target Model）。** 在 Qwen3-Coder-30B MoE 上运行相同流水线。草稿更棘手，因为存在 MoE 路由噪声（Routing Noise）。报告结果。

8. **K8s 水平扩缩容（K8s HPA）。** 在 K8s 中部署，HPA 追踪 `queue_wait_ms`。演示负载变为三倍时的横向扩容（Scale-Out）。

9. **成本比较（Cost Comparison）。** 在相同评估上计算每百万词元美元成本，与 Anthropic Claude Sonnet 4.7 和 OpenAI GPT-5.4 比较并发布。

## 实际应用（Use It）

```
$ curl https://infer.example.com/v1/chat/completions -d '{"messages":[...]}'
[serve]     vLLM 0.7, Llama 3.3 70B FP8, EAGLE-3 active
[decode]    bs=8, accepted_tokens_per_step=3.2, acceptance_rate=0.76
[latency]   first-token 42ms, full-response 980ms (620 tokens)
[cost]      $0.34 per 1M output tokens at sustained throughput
```

## 交付成果（Ship It）

`outputs/skill-inference-server.md` 描述交付物：经过测量的投机解码服务栈、完整基准报告与 K8s 部署。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 相比基线的实测加速比 | 两个模型在质量匹配时吞吐量达到 2.5 倍以上 |
| 20 | 真实流量接受率 | 逐分布接受率报告 |
| 20 | P99 尾部延迟纪律 | 批量 1/8/32 时，启用与禁用投机的 p99 |
| 20 | 运维（Ops） | K8s 部署、HPA 按队列等待扩缩容、平稳发布 |
| 15 | 报告与方法 | 清楚解释改动及原因 |
| **100** | | |

## 练习（Exercises）

1. 测量草稿落后目标一个版本时的接受率退化，例如 Llama 3.3 -> 3.4 漂移。构建监控告警。

2. 实现 ngram 备用策略：EAGLE-3 接受率低于阈值时切换为 ngram 草稿。报告可靠性改善。

3. 运行受控 MoE 实验：同一个 Qwen3-Coder-30B，比较注入与不注入路由噪声的情况。测量草稿接受率敏感性。

4. 扩展到 H200（141 GB）。报告每副本模型大小余量增加多少，以及能否提供未量化 Llama 3.3 70B 服务。

5. 在相同 H100 硬件上对 TensorRT-LLM 投机解码做基准测试，报告它在哪些方面优于 vLLM。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 草稿模型（Draft Model） | “投机者（Speculator）” | 提出 N 个词元供目标验证的小模型 |
| EAGLE-3 | “2026 草稿架构” | 使用目标隐藏状态训练的草稿头；接受率约 75% |
| P-EAGLE | “并行投机” | 草稿分支树，由目标一次验证 |
| 接受率（Acceptance Rate） | “命中率” | 无需重新采样就被接受的草稿词元比例 |
| 量化（Quantization） | “FP8 / INT4” | 降低权重精度，让显存容纳更大模型 |
| 队列等待（Queue Wait） | “HPA 指标” | 请求在推理开始前于待处理队列等待的时间 |
| Speculators 中心（Speculators Hub） | “对齐草稿” | Red Hat Neural Magic 为常见开放模型提供 EAGLE 草稿的中心 |

## 延伸阅读（Further Reading）

- [vLLM EAGLE 与 P-EAGLE 文档](https://docs.vllm.ai)：参考服务栈
- [P-EAGLE（AWS 2026）](https://aws.amazon.com/blogs/machine-learning/p-eagle-faster-llm-inference-with-parallel-speculative-decoding-in-vllm/)：并行投机解码论文与集成
- [SGLang SpecForge](https://github.com/sgl-project/SpecForge)：草稿头训练流水线
- [Red Hat Speculators](https://github.com/neuralmagic/speculators)：对齐草稿中心
- [TensorRT-LLM 投机解码](https://nvidia.github.io/TensorRT-LLM/)：厂商替代方案
- [Fireworks.ai 服务架构](https://fireworks.ai/blog)：商业参考
- [EAGLE-3 论文（arXiv:2503.01840）](https://arxiv.org/abs/2503.01840)：方法论文
- [vLLM 仓库](https://github.com/vllm-project/vllm)：代码与基准
