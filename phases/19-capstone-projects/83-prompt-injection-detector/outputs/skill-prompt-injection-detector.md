---
name: skill-prompt-injection-detector
description: 为任意提示词返回类别和置信度的分层检测流水线，精确率与召回率可测量
version: 1.0.0
phase: 19
lesson: 83
tags: [safety, detector, prompt-injection]
---

# 提示词注入检测器（Prompt Injection Detector）

这里检测器是从提示词到判定的函数。判定包含第 82 课分类体系中的类别和 [0, 1] 内置信度。

## 流水线（Pipeline）

1. 归一化：去零宽字符、还原同形异义字符、解码 base64/hex、折叠 leet-speak 数字，并结合常用词合理性检查尝试 rot13。
2. 子串规则：手写匹配目标，如 `ignore previous`、`from now on you are`、`decode this base64`。
3. 正则规则：词元级模式，如 `\bignor\w*\s+(all|prior|previous|earlier)\b`。

聚合保留各类别最大分数，返回最高分类别；无触发则返回 `benign`。

## 添加规则（Adding a rule）

编辑 `code/rules.py`。规则字典含 `name`、`category`（六类之一）、`score`（0 至 1 浮点数），以及 `substring` 或 `regex` 之一。重跑 `main.py`，查看逐类别精确率召回率的变化。

## 交付物（Artifact）

`outputs/detector_report.json` 是逐类别指标文件。第 87 课端到端门禁读取它，对置信度设置阈值。
