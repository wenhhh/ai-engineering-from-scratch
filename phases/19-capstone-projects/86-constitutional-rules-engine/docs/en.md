# 综合实践 86：宪法式规则引擎（Capstone 86 — Constitutional Rules Engine）

> 规则是名称、谓词和解释。缺少其中任何一项，都只是印象，而非规则。

**Type:** Build
**Languages:** Python, YAML
**Prerequisites:** 阶段 18 安全课程，阶段 19 路线 A 第 25–29 课
**Time:** ~90 分钟

## 问题（Problem）

分类器覆盖可识别失效，规则引擎覆盖契约失效。编码助手团队可能要求“含代码的每个响应必须以可运行块或明确假设结束”，客服机器人团队可能要求“每次拒答必须给出下一步”。这些不适合作为分类目标，而是响应、对话、系统策略上的谓词，还需非工程师可读。

诚实的表示是声明式文件。规则宪法（Constitution）以 YAML 与代码并存，纳入版本控制，单独评审。每规则有 `name`、`predicate`、`severity`、`explanation` 模板。引擎加载文件，对候选输出评估各规则，为每个触发项返回结构化 `Violation`。本课用 `all_of`、`any_of`、`not_` 组合谓词，让单条规则能表达“若响应含代码，必须以可运行块结束，并且不得引用内部专用库”。

另一半是修订。只拦截的规则引擎只完成一半。能建议修复才有实际运维价值：助手起草，引擎标记违反项，修复器生成修订，引擎确认修订符合规则。本课提供最小修复器（逐规则正则替换），以及草稿与修订间逐行添加、移除、编辑的结构化差异。

## 概念（Concept）

```mermaid
flowchart LR
  D[响应草稿] --> RE[规则引擎]
  RE -->|违反项| F[修复器]
  F --> R[修订响应]
  R --> RE2[规则引擎第二遍]
  RE2 -->|判定| OUT[接受或升级处理]
  D -.->|差异| R
```

规则结构如下：

```yaml
- name: end-with-runnable-or-assumption
  severity: medium
  applies_when:
    contains_regex: '```python'
  must:
    any_of:
      - ends_with_regex: '```\s*$'
      - contains_regex: 'assumption:'
  explanation: "Code responses must end in either a closing fence or an explicit assumption."
  fix:
    append_if_missing: "\n\nAssumption: example inputs are valid."
```

原子谓词为 `contains_regex`、`not_contains_regex`、`ends_with_regex`、`starts_with_regex`、`max_words`、`min_words`。组合为 `all_of`、`any_of`、`not_`。引擎先评估 `applies_when`；不适用则记录 `not_applicable`，否则评估 `must`，产生 `pass` 或 `violation`。

严重程度为 `low`、`medium`、`high`，与第 85 课对应。下游门禁（第 87 课）将 `high` 规则违反与 `high` 分类判定同样处理：拦截。

修复器是声明式操作列表：`append_if_missing`、`prepend_if_missing`、`replace_regex`。各操作按名称将规则映射到变换。修复器刻意只做局部编辑；结构重写属于独立的拒答与帮助层，不在本课覆盖内。

差异在原文与修订之间计算，是 `Change` 记录列表，包含 `op`（add、remove、edit）及相关文本。下游门禁可记录差异，让人工评审持续审计修复器行为。

```figure
cd-constitution-loop
```

## 动手实现（Build It）

`code/rules.yml` 存规则宪法。`code/main.py` 加载器接受 YAML 文件（有 PyYAML 时）或 JSON 文件（内置）。本课附带的 `rules.yml` 在测试中通过两条路径解析。`code/main.py` 定义 `Engine`、`Fixer` 类和 `diff` 函数。组合递归评估，`any_of` 短路。

交付的规则宪法包括：

- `no-empty-refusal`（medium）：拒答必须包含建议或转向指引。
- `end-with-runnable-or-assumption`（medium）：代码响应必须完整闭合结束。
- `no-pii-in-examples`（high）：示例数据不得含邮箱或电话形状。
- `cite-when-asserting-fact`（low）：以 “According to” 开头的行必须含括号引用。
- `no-internal-library-leak`（high）：输出不得出现 `internal-only` 和 `policybot-internal`。
- `bounded-length`（low）：响应不超过 800 词。

## 实际应用（Use It）

运行 `python3 main.py`。演示让三份响应草稿经过引擎，打印违反项，运行修复器，打印差异，写 `outputs/rules_report.json`。其中一条样例有不适用规则（草稿无代码块），报告将其记为 `not_applicable`，让团队看到引擎明确评估过它。

## 交付成果（Ship It）

`outputs/skill-constitutional-rules-engine.md` 记录规则语法与修复操作。

## 练习（Exercises）

1. 添加规则：提示词提及安全时，每响应必须包含“如果情况紧急”。使用组合。
2. 用接受命名槽位的模板修复器替换正则修复器，展示新设计下的一条规则改写。
3. 添加指标端点，给定草稿语料返回逐规则违反率，让团队看到哪些规则过度触发。

## 关键术语（Key Terms）

| 术语 | 常见用法 | 精确定义 |
|---|---|---|
| 规则宪法（Constitution） | 模糊策略文档 | 含谓词、严重程度、解释的 YAML 规则文件 |
| 谓词（Predicate） | 检查 | 文本到布尔值的可调用对象，原子或经 all_of/any_of/not_ 组合 |
| 违反项（Violation） | 失败 | 含规则名、严重程度、解释、匹配区间的结构化记录 |
| 修复器（Fixer） | 模型微调 | 将草稿映射到修订的逐规则确定性变换 |
| 差异（Diff） | 字符串比较 | 草稿与修订间 add、remove、edit 操作的结构化列表 |

## 延伸阅读（Further Reading）

第 87 课将本引擎、输入检测器和输出分类器组合为单一安全门禁。
