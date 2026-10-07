# 抽取可引用片段

> 只引用整份文档不足以证明论断，应指向精确的来源句子。

**Type:** Build
**Languages:** Python
**Stage:** 第 2 阶段，共 7 阶段（starter）
**Time:** 约 2 小时

## 构建目标

`report_agent/snippets.py`：

- `split_sentences(text)` 返回每个句子的 `(start, end)` 区间。
- `score_sentence(sentence, query_tokens, idf)` 对句子与查询的匹配程度评分。
- `extract_snippets(query, index, ...)` 从排名靠前的文档中返回最佳 `Snippet` 对象。

`Snippet` 保存 `id`、`doc_id`、`start`、`end`、`text` 和 `score`，并始终满足：

```python
document.text[snippet.start:snippet.end] == snippet.text
```

## 为什么重要

引用有两个独立性质：标记能够解析到来源，以及该来源能够支持论断。有效链接仍可能指向与论断无关的句子。精确证据区间使这一区别可以被测试。

将论断与整张网页逐项比较成本很高，读者也难以这样检查。偏移量使一次查找就能核查引用：打开文档，截取 `[start:end]`，阅读对应句子。第 5 阶段评审器和第 6 阶段脚注都依赖这一能力。

## 句子区间

在 `.`, `!` 或 `?` 处分句，条件是其后跳过空白的字符开始新句，或者已到文本末尾。本语料中有两个需要注意的细节：

```text
The socket is at /var/run/container.sock. Any process can write.
                            ^ not a boundary      ^ boundary
It is slower. user-space kernel is still useful.
             ^ boundary, even though user-space kernel starts lowercase
```

区间不包含两端空白，使 `text[start:end]` 保持干净。

## 句子评分

复用第 1 阶段的 IDF 表：

```python
score = sum(idf[t] for t in set(query_tokens) if t in tokenize(sentence))
```

再应用两条规则，使片段脱离周边内容也能阅读：

| 规则 | 原因 |
|---|---|
| 少于 `min_words`（6）个词的句子得 0 分 | “The tradeoff is overhead.” 缺少上下文时无法说明具体内容 |
| 以 It、This、These、They 等代词开头的句子分数减半 | “It uses a limited set of calls” 没有说明 it 指什么 |

实际系统可通过去上下文化来解决第二个问题：改写句子，使其能够独立理解。扣分规则是成本较低的近似方案。

```figure
pj-rra-snippet-offsets
```

## 跟随执行机制

偏移量指向去掉两端空白的文档正文，而非完整 Markdown 文件。对选中句子调用 `.strip()` 时，必须同步调整起止位置。来源变化后，旧偏移仍可能截出文本，却不再指向同一论断；第 6 阶段会再次检查文本相等性。

## 你的任务

```python
def split_sentences(text: str) -> list[tuple[int, int]]: ...
def score_sentence(sentence, query_tokens, idf, min_words=6) -> float: ...
def extract_snippets(query, index, k_docs=4, per_doc=3, start_id=1,
                     min_score=0.0, doc_ids=None) -> list[Snippet]: ...
```

`extract_snippets` 检索前 `k_docs` 份文档；提供 `doc_ids` 时仅在指定文档中处理。每份文档最多保留 `per_doc` 个句子，对全部候选按分数排序，再依次编号为 `S{start_id}`、`S{start_id + 1}` 等。

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 2 --path my-report-agent
```

阶段测试累计执行，因此第 1 阶段必须继续通过。

## 预期结果

第 2 阶段应通过 11 项 Python 测试，此前阶段也必须继续通过。每个返回片段都应精确复现其来源切片，包括带点的 socket 路径之后的文字。测试还覆盖小写字母开头的句子、连续 ID 和单文档数量上限。

## 检查理解

1. 为什么保存偏移量，而不只保存句子文本？
2. `04-user-space-kernel.md` 中哪句会被减半评分？若丢弃它，读者是否会遗漏信息？
3. 分句器若将 `container.sock.` 当作两个句子，会破坏什么？

## 进一步扩展

- 将相邻句子作为上下文窗口返回，但引用仍指向精确区间。
- 用小模型改写句子，使其独立可读，取代代词扣分规则，并保存原句与改写两版。

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 1 阶段](../../01-search-the-corpus/docs/en.md)。

Orchard 策略句子只有在已保存区间能够精确复现文档文本时，才可作为证据。偏移量属于规范化后的文档正文，不属于文件头或渲染后的 HTML。

```text
source: "Old rule. New rule."
second span=[10,19)
source[10:19]="New rule."
```

## 构建与检查

在原字符串上寻找边界，通过移动偏移量去掉空白。区间计算完成后，不要再次改写片段。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py research-report-agent --stage 2 --path learning-artifacts/research-report-agent
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

来源文本在旧片段起点之前被编辑时，旧片段会怎样？
