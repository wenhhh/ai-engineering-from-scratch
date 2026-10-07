# 对公开夹具评分

> 没有可比较的测量，就难以判断下一次修改是否有帮助。

**Type:** Build
**Languages:** Python
**Stage:** 第 7 阶段，共 7 阶段（stretch）
**Time:** 约 2 小时

## 构建目标

`report_agent/evaluate.py`：

- `citation_precision(report)`：已发布句子中，通过词汇引用支持检查的比例。
- `source_recall(report, expected_docs)`：每个问题提供的预期文档中，被引用的比例。
- `fact_coverage(report, key_facts)`：关键事实在至少一个句子中出现的比例。
- `evaluate(questions_path, corpus_dir)` 返回 `Scorecard`，`format_scorecard` 将其输出，并给出满分为 100 的最终分数。

```text
id      precision   recall   facts  state
----------------------------------------------
h1           1.00     1.00    1.00  completed
h2           1.00     1.00    1.00  completed
h3           1.00     1.00    1.00  completed
h4           1.00     1.00    0.50  completed
h5           1.00     1.00    0.50  completed
h6           1.00     0.50    0.00  completed
----------------------------------------------
mean         1.00     0.92    0.67
score 87.5 / 100
```

## 为什么重要

单独把精确率拉满很容易：只发布一个安全句子，就能让每条引用都正确。单独提高召回率或覆盖率也不难：复制语料库中所有句子即可。有用的报告需要同时兼顾三者，因此总分权重分别设为 0.4、0.3、0.3。

三项指标回答不同问题：精确率检查已发布支持，召回率检查来源选择，事实覆盖率检查有用内容。加权分数旁应报告各组成指标，防止一项提升掩盖其他方面退步。

## 公开夹具使基线可以复现

`heldout/questions.json` 包含六个已签入的公开评估问题，每题提供预期文档和关键事实。目录名属于历史遗留：学习者可以看到这些题，开发参考实现时它们也已可用。secrets-proxy 演示正是 h4，因此得分不属于盲测或未见评估。

学习指标时，同时查看本文件与 `fixtures/questions.json`。比较修改时固定公开评估输入，记录三项指标，并将提升视为在这些例子上的回归证据。反复针对它们调参，不能证明泛化能力。

参考基线在六个公开夹具上得分为 87.5 / 100。所有发布句子都通过词汇精确率检查，但若干问题遗漏了预期事实。该分数不能证明系统在任意语料或模型撰写的文章上具有同样表现。

```figure
pj-rra-scorecard
```

译注：图表勘误：评分控件使用 0.5／0.25／0.25 权重且缺少标注时返回不可用；本项目实际评分器采用 0.4／0.3／0.3，并将缺少来源或事实标注的项默认设为 1。静态评审图仍显示“completed · 2 sentences dropped”，与实际有删除项时的 needs_review 状态不符。这里只翻译说明，保留原计算与图例，并以运行测试为准。

## 跟随执行机制

宏平均给予每题相同权重；微平均则更偏向句子多的问题。本项目采用宏平均，避免较长的简单报告压过简短的困难问题。比较修改时必须固定评估问题。

## 你的任务

```python
class Scorecard:
    def mean(self, metric) -> float: ...
    def score(self) -> float: ...
def citation_precision(report, threshold=0.8) -> float: ...
def source_recall(report, expected_docs) -> float: ...
def fact_coverage(report, key_facts) -> float: ...
def evaluate(questions_path, corpus_dir, model=None) -> Scorecard: ...
def format_scorecard(card) -> str: ...
```

## 运行测试

```bash
python3 scripts/project_test.py research-report-agent --stage 7 --path my-report-agent
python3 projects/research-report-agent/solution/run_report.py \
  --eval projects/research-report-agent/heldout/questions.json --code my-report-agent
```

测试要求精确率至少 0.9、来源召回率至少 0.6、事实覆盖率至少 0.4，且总分至少 70。

## 预期结果

第 7 阶段应通过 8 项 Python 测试，此前阶段继续通过。参考基线在已签入的公开夹具上输出上表：精确率 1.00、来源召回率 0.92、事实覆盖率 0.67、总分 87.5 / 100。这些是夹具测量结果，不保证适用于其他输入。

## 检查理解

1. 为什么这里的精确率阈值 0.8 比评审器阈值 0.6 更严格？
2. 修改后总分提高 5 分，相信结果前你会检查什么？
3. 如果报告只写“Containers are containers [S1].”，哪项指标可能被拉满？

## 进一步扩展

- 在不降低精确率的前提下提高公开夹具分数，记录哪些例子改善、哪些退步。
- 加入模型评审器评价可读性，并与证据支持指标分开报告。
- 测量泛化时，请其他人为新语料准备独立的私有问题与标注。评估前冻结实现和阈值，并说明何时查看或针对结果调参。

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 6 阶段](../../06-publish-the-report/docs/en.md)。

已签入的问题是公开回归夹具。其分数要与独立准备的语料评估分开。新的 Orchard 场景检查策略更新，不改变公开隔离概念问题。

```text
same question + before corpus -> 60-minute claim
same question + after corpus -> 15-minute claim
comparison question mismatch -> reject
```

## 构建与检查

调整检索之前冻结评估问题。汇总结果同时保存组成指标和问题级失败记录。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py research-report-agent --stage 7 --path learning-artifacts/research-report-agent
```

累计阶段全部通过后，从仓库根目录用原创样例输入运行你的交付物：

```bash
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code learning-artifacts/research-report-agent --corpus projects/research-report-agent/examples/orchard/before --out orchard-before
python3 projects/research-report-agent/solution/run_report.py "How long do Orchard guest tokens last?" --code learning-artifacts/research-report-agent --corpus projects/research-report-agent/examples/orchard/after --compare orchard-before/report.json --out orchard-after
```

默认采用确定性规划和抽取式写作。--model replay 需要配合 --cassette；--model live 通过 RRA_LLM_BASE_URL、RRA_LLM_MODEL 和可选的 RRA_LLM_API_KEY，仅为规划阶段调用模型。在线服务行为需要使用调用方凭据另行运行验证。公开夹具得分不能衡量未见数据上的泛化能力。

## 继续探究

需要什么证据，才能声称智能体能泛化到公开夹具之外？
