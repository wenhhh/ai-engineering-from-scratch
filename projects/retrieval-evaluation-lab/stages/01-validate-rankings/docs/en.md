# 校验排名与分级相关性标注

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

评估假设每个文档在排名中只出现一次。同一个相关文档重复出现时，简单的精确率和增益计算可能重复计数。因此，测量任何指标之前，先校验排名 ID 与相关性等级。

等级采用 0 至 3 的整数。标注中缺失的文档按未评判处理，获得零增益；最终报告还会统计其数量，使标注不完整的情况保持可见。

```figure
pj-retrieval-evaluation-lab-1
```

权威参考：[技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md).

排名是由唯一文档 ID 组成的有序列表。Orchard 恢复查询采用分级证据：完整恢复流程比发布说明中的顺带提及更有用。

```text
judgments: restore=3, release=1, cafe=0
ranking: [release, restore, restore] -> duplicate error
```

## 构建与检查

评分前先校验排名与标注。保留未评判文档的状态，不应假设它们已被审阅并判为不相关。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --init learning-artifacts/retrieval-evaluation-lab
python3 scripts/project_test.py retrieval-evaluation-lab --stage 1 --path learning-artifacts/retrieval-evaluation-lab
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

语料库刚增加一份笔记时，缺少该文档的相关性判断意味着什么？
