# 生产环境中的 EAGLE-3 推测解码（EAGLE-3 Speculative Decoding in Production）

> 推测解码（Speculative decoding）将快速草稿模型与目标模型配对：草稿提出 K 个词元，目标模型一次前向计算验证，接受的词元不再产生额外成本。2026 年，EAGLE-3 是生产级变体，它基于目标模型隐藏状态而非原始词元训练草稿头，将通用聊天的接受率 alpha 提升到 0.6-0.8。正确问题不是“草稿有多快”，而是“我的流量上 alpha 是多少”。若 alpha 低于约 0.55，高并发下推测解码就得不偿失，因为每次草稿被拒绝都需要目标模型再做一次前向计算。本课教你先测量 alpha，再打开开关。

**Type:** Learn
**Languages:** Python (标准库，简化接受率模拟器)
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）、阶段 10 · 18（多词元预测，Multi-Token Prediction）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 说出三代推测解码，解释 EAGLE-3 相比 EAGLE-2 和经典草稿模型改变了什么。
- 定义接受率（Acceptance rate）alpha，根据 alpha 和草稿长度 K 计算预期加速比，识别目标并发下的盈亏平衡 alpha。
- 解释为何 2026 年 vLLM 的推测解码需要主动启用，而非默认开启，以及为什么不测量 alpha 就启用是生产反模式。
- 编写测量计划，明确基准、提示词分布、并发测试点和门禁指标。

## 问题背景（The Problem）

解码受内存带宽限制。H100 上运行 Llama 3.3 70B FP8 时，每个解码词元读取约 140 GB/s 的权重，输出一个词元。解码期间 GPU 计算单元几乎闲置，瓶颈是 HBM 带宽，而非矩阵乘法吞吐量。

推测解码利用这一空隙。先用低成本草稿模型生成 K 个候选词元，再让目标模型一次前向计算验证全部 K 个。每个通过验证的词元实际上不额外花费成本，因为成本摊入了目标模型本来就要进行的 K 元批量前向计算。

经典草稿模型方法使用同系列小模型，例如 Llama 3.2 1B 为 Llama 3.3 70B 起草。它有效，但接受率一般，因为小模型分布偏离目标。EAGLE、EAGLE-2、EAGLE-3 直接在目标模型内部状态上训练轻量草稿头，使草稿分布更贴近目标，因此 alpha 从草稿模型的 0.4 提升到 EAGLE-3 的 0.6-0.8。

限制是：2026 年 vLLM 的 EAGLE-3 必须主动启用，显式设置 `speculative_config`。不设置就没有加速。不先在真实流量上测量 alpha 就开启的团队，常发现尾延迟不降反升。

## 核心概念（The Concept）

### 推测解码实际带来的收益（What speculative decoding actually buys）

没有推测解码时，每词元成本为一次目标模型前向计算。草稿长度 K、接受率 alpha 下，每次目标前向的预期词元数为 `1 + K * alpha`。加速比为 `(1 + K * alpha) / (1 + epsilon)`，其中 epsilon 是草稿加验证开销。当 K=5、alpha=0.7：`(1 + 5*0.7) / (1 + 0.1) = 4.5 / 1.1 = 4.1x`。实际结果通常为 2-3 倍，因为生产流量 alpha 很少这么高，且大批次下 epsilon 会增大。

### 为什么 alpha 是唯一重要的指标（Why alpha is the only metric that matters）

拒绝的词元不会凭空消失：第一个被拒词元需要目标模型再做一次前向计算。alpha 降到 0.4 时，你要承担草稿、验证和重新生成的开销。高并发，例如 256 并发时，解码批次已经足够大，“仅目标模型”与“目标模型加验证”的内存带宽差距缩小。在多数 2026 年硬件上，alpha 低于 0.55 时推测解码收益为负。

alpha 随工作负载变化。在 ShareGPT 式通用聊天上，使用 ShareGPT 训练的 EAGLE-3 达到 0.6-0.8。在代码、医疗、法律等领域流量上，通用数据训练的草稿头会降到 0.4-0.6。训练领域专用草稿头可以恢复 alpha；相比目标模型微调，这是轻量且快速的训练任务。

### EAGLE 各代概览（EAGLE generations at a glance）

- **经典草稿模型（Classic draft model）**：同系列小模型，alpha 为 0.3-0.5。基础设施简单，加载两个模型，每次目标前向对应 K 次草稿前向。
- **EAGLE-1（2024）**：在目标隐藏状态的最后一层训练单个草稿头，alpha 约 0.5-0.6，在目标模型之上增加少量参数。
- **EAGLE-2（2025）**：自适应草稿长度及树状草稿，一次目标前向验证多条分支，alpha 约 0.6-0.7，草稿调度器更复杂。
- **EAGLE-3（2025-2026）**：在目标多层而非仅最后一层训练草稿头，对齐更好，通用聊天 alpha 约 0.6-0.8。

### 2026 年生产实施步骤（The 2026 production recipe）

1. 先部署纯目标模型，在目标并发下测量基线 TTFT、ITL 和吞吐量。
2. 通过 vLLM `speculative_config` 启用 EAGLE-3 草稿，重跑基准。
3. 记录接受率 alpha。vLLM V1 通过 `spec_decode_metrics.accepted_tokens_per_request` 报告此值，除以请求的草稿长度得到 alpha。
4. 如果生产流量分布上 alpha < 0.55，关闭推测解码，或训练领域专用 EAGLE-3 草稿。
5. 在生产并发下重跑，确认 P99 ITL 没有变差。

### 生产陷阱：P99 尾延迟（The production pitfall: P99 tail）

推测解码会降低平均 ITL，但不调优可能使 P99 变差。被拒的草稿触发双遍执行序列：草稿、验证失败、重新生成。满批次时，两遍执行会串行化。应观察 P99 ITL，而非 P50。

### EAGLE-3 已部署在哪里（Where EAGLE-3 is already deployed）

Google 于 2025 年在 AI Overviews 部署推测解码，质量相同但响应更快。vLLM V1 提供文档化接口 `speculative_config`；V1 中的 N-gram GPU 推测解码兼容分块预填充。SGLang 支持 EAGLE-3，将其作为前缀密集工作负载的推荐草稿路径。

### 一行盈亏平衡计算（Break-even math in one line）

预期加速比：`S(alpha, K) = (1 + K*alpha) / (1 + verify_overhead)`。令 `S = 1`，得到 `alpha_breakeven = verify_overhead / K`。典型 verify_overhead 约 0.15、K=5 时：`alpha_breakeven = 0.03`。但这只是原始解码计算。高并发下验证开销上升，解码批次也已在序列间摊薄内存读取成本，因此实际有效 alpha_breakeven 会升到约 0.45-0.55。

### 何时不使用推测解码（When not to use speculative decoding）

- 延迟不重要、批次为 1 的离线生成，使用纯目标模型。
- 输出很短，少于 50 词元时，草稿与验证成本占主导。
- 专业领域没有领域训练的草稿头时，alpha 太低。
- vLLM v0.18.0 加草稿模型推测解码，再加 `--enable-chunked-prefill`，此组合无法编译。文档中的例外是 V1 的 N-gram GPU 推测解码。

```figure
mx-speculative-tree
```

## 实际应用（Use It）

`code/main.py` 针对不同 alpha 与草稿长度 K，模拟启用和不启用推测解码的解码循环，打印盈亏平衡 alpha、实测加速比和尾延迟行为。运行多组 (alpha, K)，精确观察推测解码何时不再划算。

## 交付成果（Ship It）

本课产出 `outputs/skill-eagle3-rollout.md`。根据目标模型、流量分布描述和并发目标，制定分阶段 EAGLE-3 上线计划：测量基线、启用配置、测量 alpha、以 alpha >= 0.55 为门禁、监控 P99 ITL。

## 练习（Exercises）

1. 运行 `code/main.py`。K=5 时，2 倍和 3 倍加速分别需要多少 alpha？结果对 verify_overhead 有多敏感？
2. 假设生产流量为 70% 通用聊天、30% 代码。ShareGPT 训练的 EAGLE-3 在聊天上 alpha 为 0.7，代码上为 0.4。混合 alpha 是多少？推测解码是否带来正收益？
3. 阅读 vLLM `speculative_config` 文档。说出草稿模型、EAGLE、N-gram 三种模式，以及哪种兼容分块预填充。
4. 开启 EAGLE-3 后，平均 ITL 降低 25%，但 P99 ITL 升高 15%。诊断并提出缓解措施。
5. 计算 Llama 3.3 70B 的 EAGLE-3 草稿头显存成本，与运行 Llama 3.2 1B 作为经典草稿相比如何？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 推测解码（Speculative decoding） | “草稿加验证” | 低成本模型提出 K 词元，目标模型一次前向验证全部 K 个 |
| 接受率 alpha（Acceptance rate alpha） | “推测接受率” | 目标接受的草稿词元比例，是唯一重要的指标 |
| 草稿长度 K（Draft length K） | “spec k” | 每次目标前向前草稿提出的词元数，典型为 4-8 |
| 验证开销 epsilon（Verify overhead epsilon） | “推测开销” | 验证加重新生成相对纯目标前向的额外成本，随批次增大 |
| EAGLE-3 | “最新 EAGLE” | 2025-2026 年变体，多目标层训练草稿头，聊天 alpha 为 0.6-0.8 |
| `speculative_config` | “vLLM 推测配置” | vLLM V1 的显式启用入口，不默认启用就没有加速 |
| N-gram 推测解码（N-gram spec decode） | “N-gram 草稿” | 在 GPU 上查找提示词 N-gram 起草，兼容分块预填充 |
| 盈亏平衡 alpha（Break-even alpha） | “无收益 alpha” | 推测解码加速收益为零时的 alpha，应在生产并发下观察 |
| 被拒草稿双遍执行（Rejected-draft two-pass） | “重新生成成本” | 草稿被拒后执行两次目标前向，是 P99 尾延迟来源 |

## 延伸阅读（Further Reading）

- [vLLM：推测解码文档](https://docs.vllm.ai/en/latest/features/spec_decode/)：`speculative_config` 和 V1 分块预填充兼容性的权威资料。
- [vLLM 推测配置 API](https://docs.vllm.ai/en/latest/api/vllm/config/speculative/)：精确字段集合。
- [EAGLE 论文（arXiv:2401.15077）](https://arxiv.org/abs/2401.15077)：最初的 EAGLE 草稿头形式化描述。
- [EAGLE-2 论文（arXiv:2406.16858）](https://arxiv.org/abs/2406.16858)：自适应草稿和树结构。
- [UC Berkeley EECS-2025-224 技术报告](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2025/EECS-2025-224.html)：使用推测解码的高效 LLM 系统。
- [BentoML：推测解码](https://bentoml.com/llm/inference-optimization/speculative-decoding)：生产上线清单。
