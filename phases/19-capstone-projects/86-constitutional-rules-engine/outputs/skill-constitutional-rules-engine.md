---
name: skill-constitutional-rules-engine
description: 针对输出约束的声明式 YAML 规则引擎，含严重程度、解释、修复操作和结构化差异
version: 1.0.0
phase: 19
lesson: 86
tags: [safety, rules, constitutional]
---

# 宪法式规则引擎（Constitutional Rules Engine）

规则宪法是 YAML 文件。每规则有 `name`、`severity`（low | medium | high）、`applies_when`（谓词）、`must`（谓词）、`explanation`，及可选 `fix`。

## 谓词（Predicates）

原子谓词：

- `contains_regex` / `not_contains_regex`：包含 / 不包含正则匹配。
- `starts_with_regex` / `ends_with_regex`：开头 / 结尾匹配正则。
- `max_words` / `min_words`：最大 / 最小词数。

组合谓词：

- `all_of: [...predicates]`：全部满足。
- `any_of: [...predicates]`：任一满足。
- `not_: predicate`：取反。

## 修复操作（Fix operations）

- `append_if_missing: <suffix>`：缺失时追加后缀。
- `prepend_if_missing: <prefix>`：缺失时添加前缀。
- `replace_regex: { pattern: <regex>, replacement: <text> }`：正则替换。

## 引擎输出（Engine output）

`Engine.evaluate(text) -> EngineReport` 为每规则返回一个 `RuleResult`，`status` 为 `pass`、`violation`、`not_applicable` 之一。`report.violations()` 筛出违反项，`report.max_severity()` 返回最高严重程度。

## 交付物（Artifact）

`outputs/rules_report.json` 携带各案例的草稿、修订与结构化差异。
