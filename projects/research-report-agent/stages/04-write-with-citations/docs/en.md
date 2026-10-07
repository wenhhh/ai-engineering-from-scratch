# 只根据证据写作

> 写作器不能自行引入知识，只能组织检索到的内容。

**Type:** Build
**Languages:** Python
**Stage:** 第 4 阶段，共 7 阶段（core）
**Time:** 约 2 小时

## 构建目标

- `report_agent/citations.py`：读取引用标记、拆分报告句子，并校验每个句子引用的片段确实存在。
- `report_agent/writer.py`：为每个研究方面收集片段，由此写出章节，再渲染 Markdown。

完成的句子如下所示：

```text
Each microVM runs its own guest kernel [S4].
```

## 为什么重要

生成报告最常见的失败，是句子流畅却没有来源，或来源无法支持其所附着的句子。应通过结构约束解决：先定义引用格式，再拒绝违反格式的输出。可靠的报告系统在代码中强制证据关联，例如让写作器只能使用已抽取并编号的证据；仅在提示词中请求模型遵守，无法提供相同保证。

本阶段实现抽取式写作器：复制片段作为句子，并附上对应 ID。这里有意采用简单方式，使报告与来源的关联由构造过程保证。将来换成真正改写文章的模型时，仍可继续使用这套校验器。

## 引用契约

| 规则 | 不符合规则的示例 |
|---|---|
| 每个句子以一个或多个标记结尾，随后是句点 | `Containers share a kernel.` |
| 每个标记都对应已知片段 | `Containers share a kernel [S99].` |
| 标题不按句子处理 | 跳过 `## Overview` |

`validate_citations(markdown, snippet_ids)` 返回 `CitationError(sentence, reason)` 列表，原因为 `uncited` 或 `dangling:S99`。空列表表示有效。

有一个容易遗漏的分句细节：`user-space kernel` 以小写开头，因此“... workloads [S1]. user-space kernel is ...”仍必须在 `[S1].` 后拆分。闭合引用标记加句点始终构成边界，不受后文影响。

## 按研究方面收集片段

```python
top_docs = [doc_id for doc_id, _ in index.search(plan.question, k=k_docs)]
for facet in plan.facets:
    candidates = extract_snippets(plan.question + " " + facet.query(), index,
                                  per_doc=per_doc, doc_ids=top_docs)
    # skip spans already used, stop below relative_floor * best score,
    # keep per_facet, renumber S1, S2, ... across the whole report
```

先用完整问题检索一次，使所有章节保持主题一致。各研究方面只改变这些文档中哪些句子胜出。跨方面统一编号，确保 `S3` 在整份报告中只对应一条证据。

```figure
pj-rra-cited-writer
```

## 跟随执行机制

片段注册表相当于主键表。写作器将 ID 用作外键，校验器检查引用完整性。跨方面分配 ID 前，先按 `(doc_id, start, end)` 去重，避免同一证据被赋予不同编号后看起来像独立支持。

## 你的任务

```python
# citations.py
def cites_of(sentence) -> list[str]: ...
def strip_cites(sentence) -> str: ...
def report_sentences(markdown) -> list[str]: ...
def validate_citations(markdown, snippet_ids) -> list[CitationError]: ...

# writer.py
class CitedSentence:
    def render(self) -> str: ...
def gather_snippets(plan, index, k_docs=4, per_doc=4, per_facet=3, relative_floor=0.4) -> dict: ...
def write_report(plan, snippets_by_facet, max_sentences=3) -> Report: ...
def to_markdown(report) -> str: ...
```

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 4 --path my-report-agent
```

其中一个测试验证写作器没有虚构内容：合并连续空白后，每个句子必须与其片段文本相等。

## 预期结果

第 4 阶段应通过 12 项 Python 测试，此前阶段继续通过。合规的抽取式报告不产生引用错误；无标记句子产生 `uncited`，`[S99]` 产生 `dangling:S99`。每个报告句子在空白规范化后，都与来源片段相等。

## 检查理解

1. 为什么将校验器放在独立模块，而不内嵌于写作器？
2. 与能改写句子的模型相比，抽取式写作器损失了什么？
3. 如何允许模型改写句子，同时维持引用契约？

## 进一步扩展

- 增加模型写作器，只向它提供编号片段，要求按引用格式返回句子。校验其输出，失败时重试一次。
- 将表达相同内容的两个片段合并为一个句子，并附上 `[S2][S5]` 两个标记。

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 3 阶段](../../03-plan-the-research/docs/en.md)。

报告句子必须携带存在于证据账本中的片段 ID。写作器为各方面选择证据；只有 60 分钟来源时，不能编造新的 15 分钟策略。

```text
before corpus -> "tokens expire after 60 minutes" [S1]
after corpus -> "tokens expire after 15 minutes" [S1]
```

## 构建与检查

将引用 ID 与来源区间一起跟踪，不只保存展示编号。跨章节去重重复句子时，不能丢失证据。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py research-report-agent --stage 4 --path learning-artifacts/research-report-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

为什么在两次独立运行中，相同的展示 ID S1 可以指向不同证据？
