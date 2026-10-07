# 计算前 k 项精确率与召回率

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

精确率回答展示列表中有多少结果有用；召回率回答所有已知相关证据中有多少被检索到。两者采用不同的分母。

即使系统返回不足 k 个结果，精确率仍以 k 为分母，使结果列表不足的情况受到一致惩罚。没有相关文档标注时，将召回率定义为零，并报告标注数量。

```figure
pj-retrieval-evaluation-lab-2
```

权威参考：[技术参考](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 1 阶段](../../01-validate-rankings/docs/en.md)。

当 k=2 时，检索到一份相关笔记和一份无关笔记，精确率为 1/2。如果标注中共有两份相关笔记，召回率也为 1/2。数值虽然相同，两个分母的来源却不同。

```text
ranking[:2]=[restore,cafe]
relevant labels={restore,release}
precision=1/2; recall=1/2
```

## 构建与检查

只有正相关性等级才计为相关，不能仅凭文档出现在标注映射中就计入。结果不足时，也保持原先指定的截断值。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py retrieval-evaluation-lab --stage 2 --path learning-artifacts/retrieval-evaluation-lab
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

为什么增大 k 可能提高召回率，却降低精确率？
