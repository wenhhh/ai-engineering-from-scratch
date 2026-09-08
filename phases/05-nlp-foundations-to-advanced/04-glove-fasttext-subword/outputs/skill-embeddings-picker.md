---
name: skill-embeddings-picker
description: 为新的语言模型或文本流水线选择分词（Tokenization）方法。
version: 1.0.0
phase: 5
lesson: 04
tags: [nlp, tokenization, embeddings]
---

根据任务和数据集描述，输出：

1. 分词策略（词级、BPE、WordPiece、SentencePiece、字节级 BPE），用一句话说明原因。
2. 目标词表大小：纯英语语言模型为 32k，多语言为 64k-100k，代码为 50k-100k。
3. 库调用及精确的训练命令。给出库名（Hugging Face `tokenizers`、`sentencepiece`），列出参数。
4. 一个可复现性陷阱。分词器与模型不匹配是最常见的静默生产缺陷。指出哪个分词器与哪个预训练检查点配套，并警告不要替换。

用户微调（Fine-tuning）预训练大语言模型（LLM）时，拒绝推荐训练自定义分词器，微调必须使用预训练分词器。拒绝为任何生产推理路径推荐词级分词。指出非英语或多书写系统语料库需要带字节回退（Byte fallback）的 SentencePiece。
