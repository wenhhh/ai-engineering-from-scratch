# 规划研究

> 一个问题可能包含多个方面。先拆分，再检索，并让模型保持可选。

**Type:** Build
**Languages:** Python
**Stage:** 第 3 阶段，共 7 阶段（core）
**Time:** 约 2 小时

## 构建目标

- `report_agent/planner.py`：`plan_research(question, model=None)` 返回包含多个 `Facet` 的 `Plan`。每个方面具有 ID、报告标题标签、子问题和关键词。
- `report_agent/model.py`：定义 `Model` 协议、从调用记录中回答的 `ReplayModel`，以及可选择接入任意 chat-completions 兼容端点的 `LiveModel`。

## 为什么重要

“为什么容器作为智能体代码沙箱存在不足？”实际上包含四个问题：容器是什么、如何工作、哪些地方会失效，以及何时应选择其他方案。计划在检索开始前明确这些覆盖要求。每个方面随后形成一个报告章节，因此运行轨迹能够显示哪个角度缺少证据。

规划也是本项目首次引入模型的位置，会带来真实智能体中常见的两个工程问题：

1. **测试不能调用在线模型。** 在线调用较慢、可能收费，而且每次结果不同。
2. **模型输出属于不可信输入。** 回答可能夹杂闲聊、被截断或不符合 JSON 格式，流水线仍需继续工作。

## 先实现规则规划器

默认规划器使用四个模板：

| 标签 | 子问题 | 额外关键词 |
|---|---|---|
| 概览（Overview） | What is {subject}? | 无 |
| 工作机制（How it works） | How does {subject} work? | works, uses, runs |
| 风险与限制（Risks and limits） | What are the risks and limits of {subject}? | risk, attack, escape, weakness, cost |
| 适用场景（When to use it） | When should teams use {subject}? | use, teams, tradeoff, overhead |

主题由问题去掉开头的疑问词得到。关键词由问题词元与额外关键词组成。这个方案简单、确定，可作为后续改进的比较基线。

## 记录与回放

调用记录是一个保存已录制调用的 JSON 文件：

```json
{"entries": [{"purpose": "plan", "prompt": "You plan research...", "response": "{\"facets\": [...]}"}]}
```

`ReplayModel` 查找 `prompt_key(purpose, prompt)`，其键包含精确提示词的 SHA-256。提示词只改一个字符也会查找失败，并抛出 `CassetteMiss`。严格匹配正是设计目的：提示词改变意味着实验改变，应主动重新记录。

## 错误输出的回退

```python
try:
    raw = model.complete(build_planner_prompt(question), purpose="plan")
    return Plan(question, parse_model_facets(raw, max_facets), source="model")
except (KeyError, ValueError, TypeError, AttributeError) as error:
    return Plan(question, rule_plan(question), source="rules-fallback", notes=[...])
```

`plan.source` 记录实际执行路径。第 6 阶段轨迹会显示它，使你能够统计模型规划被拒绝的频率。

```figure
pj-rra-plan-facets
```

## 跟随执行机制

回放键包含用途与精确提示词哈希。单独保留用途，可以避免相同提示词意外匹配其他操作。回退还必须记录原因，否则表面通过的运行可能已静默停止使用模型规划。

## 你的任务

```python
# model.py
class ReplayModel:
    def __init__(self, cassette_path): ...
    def complete(self, prompt, *, purpose) -> str: ...

# planner.py
class Facet:
    def query(self) -> str: ...
def subject_of(question) -> str: ...
def rule_plan(question, max_facets=4) -> list[Facet]: ...
def parse_model_facets(raw, max_facets) -> list[Facet]: ...
def plan_research(question, model=None, max_facets=4) -> Plan: ...
```

`build_planner_prompt` 已经实现。不要修改，否则保存的调用记录会失配。

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 3 --path my-report-agent
```

`fixtures/cassettes/planner.json` 包含一份正常规划结果，以及一份不符合 JSON 格式的闲聊回答。规划器必须使用前者，并对后者回退。

## 预期结果

第 3 阶段应通过 9 项 Python 测试，此前阶段也必须继续通过。已录制的拒绝列表问题返回 `source="model"`，包含 3 个方面。闲聊回答与缺失记录都应产生 `source="rules-fallback"`，并附带原因说明。

## 检查理解

1. 为什么用完整提示词的哈希作回放键，而不只用问题？
2. 模型返回合法 JSON，但 `facets` 列表为空时应如何处理？
3. 生产环境中应在哪里记录 `plan.notes`？

## 进一步扩展

- 设置 `RRA_LLM_BASE_URL`、`RRA_LLM_MODEL` 和 `RRA_LLM_API_KEY`，向 `plan_research` 传入 `LiveModel()`，比较其研究方面与规则规划器的区别。
- 实现包装 `LiveModel` 的 `RecordingModel`，将每次调用追加到记录中，使在线运行可转成测试夹具。

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 2 阶段](../../02-extract-snippets/docs/en.md)。

明确选择规则、已录制调用或在线规划器。只有规划阶段调用可选模型，写作仍然组织检索到的来源句子。轨迹记录规划使用了规则、模型输出还是回退。

```text
--model rules -> deterministic facets
--model replay --cassette planner.json -> exact prompt lookup
invalid facet JSON -> rules-fallback
```

## 构建与检查

回放查找同时保留提示词摘要与用途。构造研究方面之前，先校验响应结构。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py research-report-agent --stage 3 --path learning-artifacts/research-report-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

为什么不能把在线模型故障标成已验证的离线运行？
