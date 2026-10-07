# 逐查询比较检索系统

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

宏平均为每个查询赋予相同权重，避免具有数百项标注的查询主导整个基准。平均值旁仍应保留逐查询指标，使退步保持可见。

要求每个系统包含全部已评判查询；检索失败时，也须显式提供空排名。静默丢弃困难查询会抬高平均值，却不会改善检索。

```figure
pj-retrieval-evaluation-lab-4
```

译注：图表范围：控件演示单查询排名与相关性，不执行 Python 多查询宏平均的完整输入校验。指标英文键保留：precision 精确率、recall 召回率、dcg 折损增益、ndcg 归一化折损增益、unjudged 未评判数量。

权威参考：[技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 3 阶段](../../03-rank-sensitive-metrics/docs/en.md)。

随附的三个查询夹具中，release 和 café 检索得到改善，restore 检索却退步。应对查询级差值排序，先展示丢失的恢复证据，再展示汇总结果。

```text
release: improved
cafe: improved
restore: regressed
--fail-on-regression -> exit 1
```

## 构建与检查

根据相关性标注的查询 ID 对齐各系统。每个差值都保留修改前后的排名 ID；单独一个数值无法指出哪个来源发生位移。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --stage 4 --path learning-artifacts/retrieval-evaluation-lab
```

累计阶段全部通过后，从仓库根目录用原创样例输入运行你的交付物：

```bash
python3 learning-artifacts/retrieval-evaluation-lab/cli.py projects/retrieval-evaluation-lab/examples/baseline.json projects/retrieval-evaluation-lab/examples/candidate.json projects/retrieval-evaluation-lab/examples/judgments.json --out retrieval-diff.json
```

指标基于所提供的标注。未评判文档获得零增益，同时单独计为未评判项。使用 --fail-on-regression 时，只要任一查询的 NDCG 降低，就返回退出码 1。

## 继续探究

平均 NDCG 上升时，应先审阅哪个查询？
