---
name: skill-end-to-end-safety-gate
description: 三检查点安全门禁，组合输入检测器、流式词元过滤器、输出分类器和规则引擎，含确定性聚合表与逐请求轨迹
version: 1.0.0
phase: 19
lesson: 87
tags: [safety, harness, composition]
---

# 端到端安全门禁（End-to-End Safety Gate）

## 生命周期（Lifecycle）

1. 生成前（pre-gen）：在提示词上运行第 83 课检测器。
   - 若 confidence >= block_threshold：返回拒答，输出轨迹，停止。
2. 生成中（during-gen）：从模型流式接收，缓冲两块，扫描已知有害续写。
   - 若匹配：终止迭代器，标记轨迹，按 medium 严重程度处理。
3. 生成后（post-gen）：若未提前终止，在完整输出上运行第 85 课分类路由器和第 86 课规则引擎。
4. 聚合（aggregate）：取 pre、during、post.classifier、post.rules 的最高严重程度。
5. 应用（apply）：映射为 block、redact、warn 或 allow。

## 聚合表（Aggregation table）

| 信号状态 | 动作 |
|---|---|
| 任意 high 严重程度 | block |
| 任意 medium 严重程度 | redact |
| 任意 low 严重程度 | warn |
| 无信号 | allow |

## 轨迹结构（Trace structure）

```text
RequestTrace
  request_id: str
  prompt: str
  pre_gen: { category, confidence, fired[] }
  during_gen: { terminated_early, matched_pattern, partial_chunks }
  post_gen: { classifier_action, classifier_severity, rules_max_severity, rules_violations[] } | null
  final_action: block | redact | warn | allow
  final_output: str
  latency_ms: float
```

## 交付物（Artifact）

`outputs/gate_trace.json` 包含摘要与每请求一条轨迹，覆盖 50 条分类样例和 10 条良性提示词。
