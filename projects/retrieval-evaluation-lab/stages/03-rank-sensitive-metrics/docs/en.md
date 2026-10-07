# 奖励排在前面的有用证据

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

倒数排名只使用第一个相关结果。归一化折损累计增益使用每个分级命中项，增益为 2^grade-1，折损分母为 log2(rank+1)。将更有价值的结果向后移动，即使召回率不变，NDCG 也应降低。

理想排名由全部标注按等级排序，再截取前 k 项得到。理想增益为零时，NDCG 返回零，避免除零。

```figure
pj-retrieval-evaluation-lab-3
```

权威参考：[技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 2 阶段](../../02-precision-and-recall/docs/en.md)。

应让更有价值的证据排在前面。在原例给出的 3 与 1 两个等级下，先返回较弱来源会降低折损增益，即使检索到的文档集合没有变化。

```text
ranking [release,restore]: DCG=1 + 7/log2(3)=5.4165
ideal [restore,release]: DCG=7 + 1/log2(3)=7.6309
NDCG=0.7098
```

## 构建与检查

使用增益 2^relevance-1 和折损分母 log2(rank+1)，再以相同截断值下的最佳标注排序作归一化。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --stage 3 --path learning-artifacts/retrieval-evaluation-lab
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

如果全部标注增益均为零，NDCG 应返回什么？
