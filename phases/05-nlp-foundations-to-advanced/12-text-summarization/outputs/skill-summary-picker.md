---
name: summary-picker
description: 选择抽取式（Extractive）或生成式（Abstractive）摘要，给出库名，并加入事实性（Factuality）检查。
version: 1.0.0
phase: 5
lesson: 12
tags: [nlp, summarization]
---

根据任务（文档类型、合规要求、长度、计算预算），输出：

1. 方法：抽取式或生成式，用一句话解释原因。
2. 起始模型或库：给出名称，如 `sumy.TextRankSummarizer`、`facebook/bart-large-cnn`、`google/pegasus-pubmed`，或 LLM 提示词。
3. 评估计划：ROUGE-1、ROUGE-2、ROUGE-L，使用带词干提取的 `rouge-score`。若为生成式，额外加入事实性检查。
4. 一个待查失效情况。实体替换是生成式新闻摘要最常见的问题，标记源文实体未出现在摘要中的样本。

医学、法律、金融或受监管内容若没有事实性门禁，拒绝采用生成式摘要。指出超出模型上下文窗口的输入需要分块映射–归约（Map-reduce）摘要，而不只是截断。
