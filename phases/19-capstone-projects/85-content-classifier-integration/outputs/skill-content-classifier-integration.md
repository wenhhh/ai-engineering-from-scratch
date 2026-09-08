---
name: skill-content-classifier-integration
description: 三个输出分类器（毒性、PII、指令泄漏）接入同一严重程度路由器，提供 block、redact、warn、log 动作
version: 1.0.0
phase: 19
lesson: 85
tags: [safety, classifier, output-filter]
---

# 内容分类器集成（Content Classifier Integration）

三个分类器，一个路由器，四种动作。

## 判定结构（Verdict structure）

```text
ClassifierVerdict
  name: str
  severity: none | low | medium | high
  score: float in [0, 1]
  findings: list[str]
```

## 动作表（Action table）

| 严重程度 | 动作 | 效果 |
|---|---|---|
| high | block | 用策略拒答替换输出 |
| medium | redact | 按顺序应用各分类器脱敏器 |
| low | warn | 输出附温和提示后交付 |
| none | log | 原样交付输出，记录判定 |

## 逐分类器行为（Per-classifier behavior）

- 毒性（toxicity）：骚扰词以空白为边界匹配，检查左侧小型否定窗口，脱敏为 `[redacted-language]`。
- 个人身份信息（pii）：邮箱、电话、SSN、通过 Luhn 的卡号、IPv4；SSN 和卡号提升严重程度，各形状脱敏为标签。
- 指令泄漏（instruction-leakage）：与已知系统提示词比较三元组余弦；严重程度随重叠增大，脱敏系统提示词首行。

## 交付物（Artifact）

`outputs/classifier_report.json` 携带各案例的动作动词、严重程度、脱敏输出和完整判定列表。
