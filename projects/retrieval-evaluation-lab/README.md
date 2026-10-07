# 检索评估实验室（Retrieval Evaluation Lab）

追踪检索退步，揭示哪些证据位置发生变化，以及汇总指标为何改变。

排名是由唯一文档 ID 组成的有序列表。Orchard 恢复查询采用分级证据：完整恢复流程比发布说明中的顺带提及更有用。

## 从学习者工作区开始

[检索增强生成](../../phases/11-llm-engineering/06-rag/docs/en.md), [模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md). 语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html).

使用 Python 3.10+ 及其标准库。涉及文件锁或进程组监管的功能需要 POSIX 环境。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --init learning-artifacts/retrieval-evaluation-lab
python3 scripts/project_test.py retrieval-evaluation-lab --stage 1 --path learning-artifacts/retrieval-evaluation-lab
```

## 构建路线

1. [校验排名与分级相关性标注](stages/01-validate-rankings/docs/en.md)
2. [计算前 k 项精确率与召回率](stages/02-precision-and-recall/docs/en.md)
3. [奖励排在前面的有用证据](stages/03-rank-sensitive-metrics/docs/en.md)
4. [逐查询比较检索系统](stages/04-compare-systems/docs/en.md)

## 使用自己的输入运行

完成各阶段后，使用以下命令，让你的工作区代码处理原创 Orchard 示例。将样例路径替换为自己的文件即可处理实际输入。

```bash
python3 learning-artifacts/retrieval-evaluation-lab/cli.py projects/retrieval-evaluation-lab/examples/baseline.json projects/retrieval-evaluation-lab/examples/candidate.json projects/retrieval-evaluation-lab/examples/judgments.json --out retrieval-diff.json
```

要先检查完整参考实现，请将同一命令中的 `learning-artifacts/retrieval-evaluation-lab` 替换为 `projects/retrieval-evaluation-lab/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例均明确列出，便于其他工具使用。

## 集成边界

指标基于所提供的标注。未评判文档获得零增益，同时单独计为未评判项。使用 --fail-on-regression 时，只要任一查询的 NDCG 降低，就返回退出码 1。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --all --solution --strict
python3 scripts/project_test.py retrieval-evaluation-lab --all --path learning-artifacts/retrieval-evaluation-lab --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试提供回归证据，不构成生产认证，也不属于未见过的基准测试。

## 权威参考资料

- [机制与 API 参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)

译注：查询 ID、排名、相关性标注、指标名和机器错误保留原值。第 3 阶段原文把 3 与 1 称为 gains，实际算式使用它们作为相关性等级，转换后的增益为 7 与 1；中文已明确这一口径，原代码与示例算式未改。
