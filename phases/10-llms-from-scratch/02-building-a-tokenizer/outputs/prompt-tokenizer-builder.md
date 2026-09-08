---
name: prompt-tokenizer-builder
description: 为大语言模型（LLM）项目构建和调试生产级分词器
version: 1.0.0
phase: 10
lesson: 2
tags: [tokenizer, bpe, byte-level, special-tokens, chat-template, multilingual]
---

# 生产级分词器构建助手（Production Tokenizer Builder）

为大语言模型（Large Language Model，LLM）项目构建或调试分词器（Tokenizer）时，请遵循此框架。

## 流水线检查清单（Pipeline Checklist）

所有生产级分词器都需要以下五个阶段。缺少任何一个，都会在生产环境中遇到边界问题。

1. **规范化（Normalize）** -- 应用 Unicode NFKC 规范化。这会展开连字（"fi" -> "fi"）、规范全角字符并统一空白。跳过此步，同一个词会因输入方式不同而获得不同词元 ID。

2. **预分词（Pre-Tokenize）** -- 在字节对编码（Byte Pair Encoding，BPE）前将文本拆成块。以英文为中心的模型使用 GPT-2 的正则表达式模式，多语言模型使用 SentencePiece 的原始字节方法。这个选择决定 BPE 能否跨词边界合并。

3. **BPE 合并（BPE Merge）** -- 将学到的合并表应用于每个块内的字节序列。合并表就是分词器学到的知识，其余部分只是配套机制。

4. **特殊词元注入（Special Token Injection）** -- 在 BPE 运行前精确匹配特殊词元。[BOS]、[EOS]、[PAD] 和聊天模板标记获得固定 ID，永不参与合并。

5. **ID 映射（ID Mapping）** -- 将词元字符串转换为整数。模型只看到整数。

## 调试分词器问题（Debugging Tokenizer Issues）

**症状：模型对聊天输入输出垃圾内容**
- 检查聊天模板（Chat template）。每种模型格式不同，Llama 3 使用 `<|start_header_id|>` 标记，ChatGPT 使用 `<|im_start|>` 标记。错误模板会使输入偏离训练分布。

**症状：非英语文本使用过多词元**
- 检查词元繁殖率（Fertility），即每个词的词元数。高于 2.0 表示分词器在该语言上浪费上下文窗口（Context Window）。解决方法：用更多多语言数据重新训练、增大词表，或使用 SentencePiece 的一元语言模型（Unigram）算法。

**症状：数字和算术处理失败**
- 检查数字的分词方式。把 "1234" 作为一个词元意味着模型无法进行逐位运算，应在预分词时逐位拆分数字。

**症状：代码词元效率低**
- 检查缩进处理方式。GPT-2 的分词器在空格上浪费词元；Codex 和 StarCoder 使用特殊缩进词元，4 个空格 = 1 个词元。

## 词表大小决策（Vocabulary Size Decision）

- 32K 个词元：单语言、小模型、算力有限。嵌入（Embedding）层有 32K * d_model 个参数。
- 50K-64K：多语言或代码占比高。对多数项目是不错的平衡点。
- 100K+（GPT-4、Llama 3）：仅适用于海量训练数据。序列更短，但嵌入参数有 100K * d_model 个。

对于 4096 维模型：32K 词表 = 131M 嵌入参数，128K 词表 = 524M 嵌入参数。仅嵌入层就相差约 400M 个参数。

## 速度要求（Speed Requirements）

- 训练数据分词：使用 Rust 后端库，如 tiktoken、HuggingFace tokenizers。纯 Python 慢 10-100 倍。
- 推理分词：单序列的延迟影响较小，但仍应使用编译型实现。
- 基准测试（Benchmark）：对 1GB 文本分词并测量实际耗时。如果超过 60 秒，切换到 Rust 后端。

## 聊天模板验证（Chat Template Validation）

部署任何聊天模型前，都要验证模板：

1. 用分词器编码一段已知对话
2. 将结果解码回文本
3. 与模型文档中的预期格式逐字符比较
4. 注意头部词元后的换行、内容前的空格、轮次结束标记
5. 测试边界情况：空系统消息、超长用户消息、多个助手轮次

聊天模板错误是聊天模型性能下降最常见的原因。
