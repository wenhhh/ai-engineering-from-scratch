---
name: grammar-pipeline
description: 为下游 NLP 任务设计传统词性（POS）与依存（Dependency）流水线。
version: 1.0.0
phase: 5
lesson: 07
tags: [nlp, pos, parsing]
---

根据下游任务（信息提取、改写验证、查询分解、词形还原），输出：

1. 标签集：纯英语旧流水线用 Penn Treebank，多语言或跨语言用通用依存（Universal Dependencies）。
2. 库：多数生产场景用 spaCy（`en_core_web_sm` / `_lg` / `_trf`），学术级多语言用 stanza，追求最高 UD 准确率用 trankit。
3. 集成代码片段：3-5 行代码，调用库并使用 `.pos_`、`.dep_`、`.head`。
4. 待测失效情况：名词与动词歧义（`saw`、`book`、`can`）及介词短语附着歧义（PP-attachment ambiguity）是经典陷阱。抽取 20 个输出人工检查。

拒绝推荐自行编写解析器。从零构建解析器是研究项目，不是应用任务。对使用词性标签却不处理大小写变体的流水线，指出其脆弱性。
