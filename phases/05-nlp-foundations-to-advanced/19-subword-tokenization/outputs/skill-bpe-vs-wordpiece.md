---
name: skill-bpe-vs-wordpiece
description: 根据给定语料库和部署目标，选择分词算法、词表大小与库。
version: 1.0.0
phase: 5
lesson: 19
tags: [nlp, tokenization]
---

给定语料库（规模、语言、领域）和部署目标（从零训练 / 微调 / API 兼容推理），输出：

1. 算法（Algorithm）。BPE、Unigram 或 WordPiece，用一句话说明理由。
2. 库（Library）。SentencePiece、HF Tokenizers 或 tiktoken，说明理由。
3. 词表大小（Vocabulary Size）。四舍五入到最接近的 1k，结合模型大小和语言覆盖说明理由。
4. 覆盖设置（Coverage Settings）。`character_coverage`、`byte_fallback`、特殊词元列表。
5. 验证计划（Validation Plan）。留出集上平均每词词元数、OOV 比例、压缩率，以及编码解码往返的一致性。

对于含罕见书写系统内容的语料库，拒绝训练字符覆盖率低于 0.995 的分词器。没有在 CI 中检查冻结的 `tokenizer.json` 哈希，就拒绝上线词表。单语言分词器词表少于 16k 时，提示规格可能不足。
