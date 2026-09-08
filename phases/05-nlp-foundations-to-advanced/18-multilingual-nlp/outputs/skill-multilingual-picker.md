---
name: multilingual-picker
description: 为多语言 NLP 任务选择源语言、目标模型和评估计划。
version: 1.0.0
phase: 5
lesson: 18
tags: [nlp, multilingual, cross-lingual]
---

给定需求（目标语言、任务类型、每种语言可用的标注数据），输出：

1. 微调源语言（Source Language）。默认英语；如果目标语言存在类型接近的高资源语言，检查 LANGRANK 或 qWALS。
2. 基础模型（Base Model）。XLM-R 用于分类，mT5 用于生成，NLLB 用于翻译，Aya-23 用于生成式 LLM。
3. 少样本预算（Few-Shot Budget）。有条件时从 100–500 个目标语言样本开始，只有标注不可行时才采用零样本。
4. 评估计划（Evaluation Plan）。逐语言准确率而非汇总值、跨语言一致性、非拉丁文字的实体级 F1。

没有逐语言评估就拒绝上线多语言模型，汇总指标会掩盖长尾失败。对于分词覆盖率较低的书写系统，例如阿姆哈拉语、提格雷尼亚语和许多非洲语言，指出需要支持字节回退的模型，例如设置 byte_fallback=True 的 SentencePiece，或类似 GPT-2 的字节级分词器。
