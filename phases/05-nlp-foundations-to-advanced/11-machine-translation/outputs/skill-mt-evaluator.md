---
name: mt-evaluator
description: 评估机器翻译（Machine translation）输出是否可以交付。
version: 1.0.0
phase: 5
lesson: 11
tags: [nlp, translation, evaluation]
---

给定源文本和候选译文，输出：

1. 自动评分估计：预期的 BLEU 与 chrF 范围，说明是否有参考译文。
2. 五项可人工核验的清单：保留内容、没有幻觉（Hallucination）；目标语言正确；语域及正式程度匹配；提供词汇表时术语与其一致；没有截断或长度激增。
3. 一个领域专用检查点。法律：命名实体、法条引用；医学：药名、剂量；UI：`{name}` 等占位变量。
4. 置信标记：“Ship”（交付）/“Ship with review”（审核后交付）/“Do not ship”（不交付），与发现的问题严重性对应。

未检查输出语言 ID 时拒绝交付。没有参考译文时拒绝评估，除非用户明确选择无参考评分（COMET-QE、BLEURT-QE）。指出超过 1000 词元（Token）的内容可能需要分块翻译。
