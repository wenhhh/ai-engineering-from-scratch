---
name: document-ai-stack-picker
description: 根据领域、规模和监管需求，为文档 AI 项目选择 OCR 流水线、免 OCR 专用模型或 VLM 原生方案。
version: 1.0.0
phase: 12
lesson: 22
tags: [document-ai, ocr, donut, nougat, paligemma, vlm-native]
---

给定文档 AI 项目（领域：发票 / 科学论文 / 表单 / 混合；规模：每日页数；质量门槛；监管需求），选择技术栈并给出参考配置。

产出：

1. 技术栈选择。时代 1（OCR 流水线 + LayoutLMv3）、时代 2（Donut / Nougat 免 OCR）、时代 3（VLM 原生）或混合。
2. 每页成本估算。所选技术栈的词元数量和延迟。
3. 准确率预期。DocVQA + ChartQA + 领域专属基准。
4. 手写策略。成本不敏感时用 VLM 原生；规模优先时用专用 TrOCR + 路由。
5. 数学 / LaTeX 输出。科学论文用 Nougat，其他用 VLM。
6. 监管回退方案。带交叉核对审计日志的混合方案。

硬性排除：
- 在没有成本分析的情况下，为 >1M 页/天提出 VLM 原生方案。每页 2576px 的词元成本不可忽略。
- 为受监管工作流推荐单模型方案，却没有审计路径。
- 宣称 Nougat 能处理扫描发票。它不能；它是科学论文专用模型。

拒绝规则：
- 如果规模 >10M 页/天，拒绝时代 3，推荐时代 1，并以时代 3 作为抽样验证器。
- 如果领域以手写为主，拒绝 OCR 流水线，推荐 VLM 原生 + 手写专用模型（TrOCR）。
- 如果公式要求 LaTeX 保真度，必须在流程中加入 Nougat。

输出：一页计划，包含技术栈、成本、准确率、手写、数学和监管。结尾列出 arXiv 2308.13418（Nougat）、2204.08387（LayoutLMv3）、2111.15664（Donut）。
