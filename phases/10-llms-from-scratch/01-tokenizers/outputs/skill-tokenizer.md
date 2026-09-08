---
name: skill-tokenizer
description: 为大语言模型（LLM）项目选择和构建分词器
version: 1.0.0
phase: 10
lesson: 1
tags: [tokenizer, bpe, wordpiece, sentencepiece, llm, nlp]
---

# 分词器选型与实现（Tokenizer Selection and Implementation）

启动大语言模型（Large Language Model，LLM）项目时，使用以下决策框架选择分词器（Tokenizer）。

## 各分词器的适用场景（When to use each tokenizer）

**字节级字节对编码（Byte-level Byte Pair Encoding，BPE；tiktoken）：** 你在基于 GPT 系列模型开发或进行微调（Fine-tuning），需要保证能处理任意输入字节序列，并且不出现未知词元（Token）。

**WordPiece（Hugging Face）：** 你使用 BERT 系列模型进行分类、命名实体识别（Named Entity Recognition，NER）或嵌入（Embedding）任务。下游任务依赖词边界信号，因此需要 "##" 接续前缀。

**SentencePiece（BPE 或一元语言模型，Unigram）：** 你从零训练模型，需要独立于语言的分词。数据包含中日韩语言（Chinese, Japanese, Korean，CJK）、泰文或其他不以空白分隔词的文字。LLaMA、T5 和多数多语言模型使用这种方案。

## 词表大小指南（Vocabulary size guidelines）

- 32K 个词元：单语言模型的良好默认值，使嵌入层保持较小规模
- 50K-64K 个词元：更适合多语言或代码占比较高的模型
- 100K+ 个词元：仅在训练数据海量且希望缩短序列时使用

词表越大，序列越短，推理（Inference）成本越低，但嵌入矩阵参数越多。100K 词表配合 4096 维嵌入，仅嵌入层就有 400M 个参数。

## 重要的预分词规则（Pre-tokenization rules that matter）

1. 在 BPE 前按空白字符拆分，防止跨词合并
2. 如果希望模型学习算术，就将数字逐位分开
3. 分词前执行 Unicode 规范化（Normalization Form C，NFC），保证行为一致
4. 为使用场景加入特殊词元：`<pad>`、`<eos>`、`<bos>`、`<unk>` 以及任务专用标记

## 分词行为的警示信号（Red flags in tokenizer behavior）

- 目标语言的词元繁殖率（Fertility）高于 2.0：模型在浪费上下文窗口（Context Window）
- 常见领域词被拆成 3 个以上词元：使用领域数据重新训练
- 数字分词不一致：检查数字拆分规则
- 大词表包含大量只用一次的词元：减小词表

## 自定义分词器构建清单（Building a custom tokenizer - checklist）

1. 收集有代表性的训练数据，目标领域文本至少 1GB
2. 选择算法：通用场景选 BPE，多语言选 Unigram
3. 根据上述指南设置词表大小
4. 配置预分词（Pre-tokenization）：空白拆分、数字处理、标点处理
5. 加入特殊词元
6. 使用 Hugging Face tokenizers 库训练，其 Rust 后端速度快
7. 验证：在所有目标语言的留出文本上检查词元繁殖率
8. 测试边界情况：空字符串、超长输入、二进制数据、表情符号、从右向左（Right-to-left，RTL）文本
9. 将分词器与模型检查点（Checkpoint）一起保存并进行版本管理
