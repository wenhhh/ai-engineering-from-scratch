# 验证每项论断

> 引用本身也作出了一项断言：来源支持论断。检查这层关系，再由执行框架决定何时结束运行。

**Type:** Build
**Languages:** Python
**Stage:** 第 5 阶段，共 7 阶段（core）
**Time:** 约 2 小时

## 构建目标

`report_agent/critic.py`：

- `support_score(sentence, snippet_text)` 返回得分与原因。
- `review(markdown, snippets)` 为每个句子返回一个 `Verdict`。
- `apply_verdicts(report, verdicts)` 删除没有支持的句子。
- `Budget` 限制步骤与词元，`decide_state` 决定终止状态：`completed`、`needs_review` 或 `failed`。

## 为什么重要

第 4 阶段写作器通过复制维持来源一致性。一旦让模型写作，引用就可能偏离：名称被替换、not 被遗漏、数字被修改，或真实片段被附到其没有表达过的论断。独立于写作器的第二轮检查负责核查引用证据。标记能解析到来源只是语法保证，来源是否支持论断仍需单独判断。

已签入的公开夹具 `heldout/poisoned_drafts.json` 包含上述各种篡改草稿，也包含应当通过的忠实改写。目录名是历史遗留，不能因此把这些测试说成隐藏测试。评审器需要识别前者，同时避免误报后者。

## 三条支持规则

```python
def support_score(sentence, snippet_text):
    # 1. names and numbers must appear in the source
    # 2. negation words must match
    # 3. otherwise: share of the claim's content tokens found in the source
```

| 篡改方式 | 识别规则 |
|---|---|
| “The Hypervisor component intercepts system calls” 引用描述 interceptor 的句子 | Hypervisor 是来源中缺失的严格词项 |
| “Denylists are a security boundary” 引用“Denylists are not a security boundary.” | 否定不同 |
| “allows 5 destinations” 引用“allows 10 destinations” | 数字 5 缺失 |
| 将真实片段附到无关论断 | 词汇重叠低，或否定不匹配 |
| 句子没有标记，或标记指向 `S9` | uncited 或 dangling |

严格词项包括带数字的词、首字母之后仍含大写字母的词（如 `microVMs`），以及非首位出现的大写开头单词。词汇检查较粗糙，但快速、无需调用费用且便于解释，也为模型评审器设定了需要超越的基线。

## 预算与终止状态

运行是否结束由执行框架决定，不交给模型决定：

```python
budget = Budget(max_steps=50, max_tokens=20000)
budget.charge("plan", estimate_tokens(question))   # raises BudgetExceeded when over
```

| 状态 | 条件 |
|---|---|
| `completed` | 每个句子均有支持 |
| `needs_review` | 有部分句子被删除 |
| `failed` | 预算耗尽，或没有任何句子获得支持 |

`needs_review` 不等于整体失败，它明确告诉人工审阅者哪里需要检查。

```figure
pj-rra-critic
```

译注：图表勘误：评分控件使用 0.5／0.25／0.25 权重且缺少标注时返回不可用；本项目实际评分器采用 0.4／0.3／0.3，并将缺少来源或事实标注的项默认设为 1。静态评审图仍显示“completed · 2 sentences dropped”，与实际有删除项时的 needs_review 状态不符。这里只翻译说明，保留原计算与图例，并以运行测试为准。

## 跟随执行机制

词汇重叠只是启发式方法，无法完成语义蕴含判断。照抄错误来源可能通过，忠实改写也可能失败。每个判定都应保留分数、阈值与拒绝原因，使后来的语义评审器可以与基线比较，而非静默替换它。

## 你的任务

```python
class Budget:
    def __init__(self, max_steps=50, max_tokens=20000): ...
    def charge(self, step, tokens=0): ...
def strict_terms(sentence) -> set[str]: ...
def support_score(sentence, snippet_text) -> tuple[float, str]: ...
def review(markdown, snippets, threshold=0.6) -> list[Verdict]: ...
def decide_state(verdicts, budget_exceeded=False) -> str: ...
def apply_verdicts(report, verdicts) -> Report: ...
```

`snippets` 可以将 ID 映射到 `Snippet` 对象，也可映射到普通字符串。`snippet_text()` 同时处理两者。

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 5 --path my-report-agent
```

## 预期结果

第 5 阶段应通过 9 项 Python 测试，此前阶段继续通过。六份带篡改的草稿都应得到预期判定序列。实体替换、数字变化、否定变化及无对应来源的标记被拒绝，忠实改写通过。两步预算会在第三次计费前停止。

## 检查理解

1. 写作器已经复制片段，为什么还要构建评审器？
2. 找一个被误拒的忠实改写。模型评审器能改善什么，又会增加哪些成本？
3. 为什么 `needs_review` 比静默删除句子后报告 `completed` 更安全？

## 进一步扩展

- 在 `Model` 协议后加入模型评审器，处理词汇得分位于 0.4 至 0.6 的句子，并记录回答用于回放。
- 编写三份能骗过评审器的新篡改草稿，再修复评审器。

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 4 阶段](../../04-write-with-citations/docs/en.md)。

验证在有限工作预算内检查词汇支持、数字与否定。评审器可以拒绝被修改的超时值，却不能证明来源在现实中真实或仍然有效。

```text
source timeout=15; draft timeout=60 -> reject number
no evidence -> failed or needs_review according to verdict state
budget exhausted -> named terminal state
```

## 构建与检查

开始下一操作前先计入工作量。在轨迹中保留被拒论断，不要抹去报告变短的原因。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py research-report-agent --stage 5 --path learning-artifacts/research-report-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

根据部署建议采取行动之前，你会增加哪项独立检查？
