---
name: ner-picker
description: 为给定提取任务选择合适的命名实体识别（NER）方法。
version: 1.0.0
phase: 5
lesson: 06
tags: [nlp, ner, extraction]
---

根据任务描述（领域、标签集、语言、延迟、数据量），输出：

1. 方法：规则加专名词典（Gazetteer）、条件随机场（CRF）、BiLSTM-CRF 或 Transformer 微调。
2. 起始模型：给出名称，如 spaCy 模型 ID `en_core_web_sm` / `en_core_web_trf`、Hugging Face 检查点 ID `dslim/bert-base-NER`，或“自定义，从零训练”。
3. 标注策略：BIO、BILOU 或基于跨度（Span-based），用一句话说明理由。
4. 评估：使用 `seqeval`。始终报告实体级 F1（Entity-level F1），绝不报告词元级 F1。

标注样本少于 500 个时，拒绝推荐微调 Transformer，除非用户已有预训练领域模型，例如医学领域的 BioBERT。指出嵌套实体（Nested entities）需要基于跨度或多轮模型。用户提及“生产规模”却直接使用 CoNLL-2003 原配标签时，要求审计专名词典。
