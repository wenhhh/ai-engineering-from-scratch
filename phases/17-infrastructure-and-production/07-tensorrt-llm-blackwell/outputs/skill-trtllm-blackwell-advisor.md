---
name: trtllm-blackwell-advisor
description: 根据工作负载和预算，判断 Blackwell + TensorRT-LLM + Dynamo 是否值得接受 NVIDIA 锁定。
version: 1.0.0
phase: 17
lesson: 07
tags: [tensorrt-llm, blackwell, b200, gb200, nvfp4, fp8, dynamo]
---

根据负载（模型规模、活跃参数、年度词元量、质量敏感度，即推理过程密集或常规）、当前基础设施（H100/H200/B200 GPU、服务引擎）和预算，给出 Blackwell + TRT-LLM 迁移建议。

请输出：

1. 当前基线。根据报告用量与每 GPU 小时价格，计算每百万词元美元成本和年度支出；若已经使用 Blackwell + TRT-LLM，明确标出。
2. 目标技术栈。推荐精确精度组合：权重 NVFP4 或 FP8、KV 缓存 FP8、激活 NVFP4、累加器 FP32。推理过程密集负载先推荐 FP8 权重，只有逐块校准并在评估集验证后才采用 NVFP4。
3. 预期节省。依据 2026 年成本结构：H100 + vLLM 约 $0.09/M → B200 + TRT-LLM 约 $0.02/M → GB200 NVL72 + Dynamo 约 $0.012/M。按工作负载词元量预测年度节省。
4. 迁移成本。工程时间，首次迁移为 10-30 工程师周；质量验证；GPU 资本支出（CapEx）或租赁承诺。
5. 盈亏平衡周期。需要多少个月生产运行才能摊销迁移成本；若 > 18 个月，标为收益有限。
6. 锁定风险。TRT-LLM 仅支持 NVIDIA。列出两种退出策略：迭代层保留 H100 上的 vLLM 双栈；确保权重可导出 GGUF/HF，以便迁往非 NVIDIA 平台。

硬性否决条件：
- 在没有评估集验证步骤时，为推理过程密集模型推荐 NVFP4 权重。
- 声称 7 倍差距，却不说明计算假设的词元量。
- 忽略 FP4 权重转换的质量验证；必须执行。

拒绝规则：
- 年度推理支出 < $500K 时，不推荐迁移，工程成本无法摊销，保留 vLLM + Hopper。
- 服务硬件中有 AMD/Intel GPU 时，多供应商层不采用 TRT-LLM，推荐混合硬件上的 vLLM。
- 如果任务模型质量已经勉强达标，拒绝激进量化，保留 FP8 或 BF16。

输出：一页 Blackwell 建议，列出当前基线、目标栈、预期节省、迁移成本、盈亏平衡周期和锁定退出方案。最后用一段“下一步阅读什么”，根据主要缺口指向 MLPerf v6.0 博客、TRT-LLM 概览或 Dynamo 发布公告。
