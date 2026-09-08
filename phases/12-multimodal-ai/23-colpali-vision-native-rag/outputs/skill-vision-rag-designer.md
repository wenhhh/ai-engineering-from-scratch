---
name: vision-rag-designer
description: 使用 ColPali / ColQwen2 / VisRAG 设计视觉原生文档 RAG，并估算存储、选择生成器。
version: 1.0.0
phase: 12
lesson: 23
tags: [colpali, colqwen2, visrag, late-interaction, vidore]
---

给定文档检索增强生成（RAG）项目（语料规模、查询延迟目标、存储预算、单次查询成本），输出视觉原生 RAG 配置。

产出：

1. 检索器选择。ColPali（基于 PaliGemma）、ColQwen2（基于 Qwen2-VL，质量更好）、ColSmol（1B，适合边缘）或 VisRAG（双编码器，存储更便宜）。
2. 存储估算。原始存储 N_docs * N_p_per_doc * D * 4 bytes；PQ 后除以 8。
3. 延迟估算。
   - 检索服务级别协议（SLA）：约 10ms 查询嵌入 + 前 k 个结果检索（MaxSim 或近似最近邻（ANN）），取决于索引规模。
   - 完整答案 SLA：检索延迟 + 200-500ms 生成器延迟（取决于模型与硬件）。
4. 生成器选择。开放方案用 Qwen2.5-VL-72B，前沿方案用 Claude Opus 4.7。
5. 压缩计划。PQ / OPQ 目标比例 8-16x；使用分层可导航小世界（HNSW）索引加速 ANN。
6. 从文本 RAG 迁移的路径。如何做 A/B 测试，何时完全切换。

硬性排除：
- 在 >10k 页语料上使用 ColPali，却不做 PQ 压缩。存储会急剧增长。
- 宣称双编码器检索的文档召回率与 ColBERT MaxSim 相当。在 ViDoRe 上并非如此。
- 为图表与表格工作负载推荐文本 RAG。文本 RAG 丢失大部分信号。

拒绝规则：
- 如果语料为纯文本（维基、聊天日志），拒绝视觉原生 RAG，推荐标准文本 RAG。
- 如果检索 SLA <100ms，优先选择 VisRAG（双编码器），而非 ColPali MaxSim。
- 如果完整答案 SLA <100ms，完全拒绝生成式 RAG，推荐仅检索的用户体验或缓存答案。
- 如果存储预算 <1 GB 且语料 >100k 页，拒绝全保真 ColPali；提出强 PQ 压缩或 VisRAG。

输出：一页 RAG 设计，包含检索器选择、存储估算、延迟、生成器、压缩、迁移。结尾列出 arXiv 2407.01449（ColPali）、2410.10594（VisRAG）。
