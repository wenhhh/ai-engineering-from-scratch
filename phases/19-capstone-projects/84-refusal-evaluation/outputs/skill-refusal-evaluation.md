---
name: skill-refusal-evaluation
description: 在标注提示词语料上计算双向拒答指标、校准和逐类别明细
version: 1.0.0
phase: 19
lesson: 84
tags: [safety, evaluation, calibration]
---

# 拒答评估（Refusal Evaluation）

标注安全与不安全的提示词语料经过一种或多种模型策略，输出被分类为拒答或回答。框架返回：

- 拒答不足（under-refusal）：已回答的不安全提示词 / 不安全总数。
- 过度拒答（over-refusal）：已拒绝的安全提示词 / 安全总数。
- 准确率（accuracy）：（正确拒答 + 正确回答）/ 总数。
- ECE：按自报置信度分箱的期望校准误差。
- 逐类别拒答不足：与第 82 课分类体系关联。

## 接入真实模型（Plugging in a real model）

模拟 LLM 是可调用对象 `(prompt: str) -> str`。用 HTTP 包装器替换，返回模型输出并嵌入置信度标签，或修改 `parse_confidence` 读取服务商暴露的值。其他内容不变。

## 交付物（Artifact）

`outputs/refusal_eval_report.json` 包含逐策略指标。第 87 课读取该报告设阈值。
