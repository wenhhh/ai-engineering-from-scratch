---
name: lm-eval-harness
description: 最小语言模型评估运行框架，包含 JSONL 任务规范、五个指标、可替换适配器和排行榜 JSON 输出。
version: 1.0.0
phase: 19
lesson: 49
tags: [evaluation, metrics, leaderboard, harness]
---

## 何时使用（When to use）

在固定任务集上比较两个模型、两个检查点或两个提示词模板。适用于任何需要交付并持续监控的对象。

## 任务规范（Task spec）

每样本一行 JSONL：

```json
{"id": "ex-001", "prompt": "...", "targets": ["..."], "metric": "exact_match", "extras": {}}
```

同文件样本共享一个指标，文件名就是任务名。

## 指标（Metrics）

| 指标 | 签名 | 用途 |
|--------|-----------|---------|
| exact_match | 小写与空白规范化，再比较相等 | 算术、事实短答案 |
| substring_contains | 目标必须出现在规范化预测中 | 带锚定词的自由生成 |
| multiple_choice | 首字母匹配 | A/B/C/D 类问题 |
| rouge_l | 分词文本上的 LCS F1 | 摘要、改述 |
| code_exec | 用 io_pairs 运行预测的 `f`，统计匹配 | 代码生成 |

所有指标返回 [0.0, 1.0] 浮点数，任务分数为均值。

## 适配器（Adapter）

```python
class Adapter(Protocol):
    name: str
    def generate(self, prompts: list[str]) -> list[str]: ...
```

适配器是唯一模型专用代码。

## 排行榜 JSON（Leaderboard JSON）

包含模式字符串、时间戳、逐任务分数和延迟、总体均值。比较运行时附逐样本记录，使预测层面的回归可见。

## 失败模式（Failure modes）

- 指标超出 [0, 1]：总分不可解释。
- 同任务文件混合指标：触发断言，应每文件一个指标。
- code_exec 无受限命名空间：任意代码执行。
- 没有模式字符串：格式演进破坏下游看板。
