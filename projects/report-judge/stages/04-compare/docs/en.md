# 使用自助法区间比较配对版本

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

按问题 ID 配对得分，再对差值重采样。配对可控制不同问题难度造成的影响。区间只描述当前提供的数据划分；大量自助抽样不能使极小的数据集变得可靠。晋级判断还会拒绝任何单题退步。

```figure
pj-report-judge-4
```

译注：图表范围：第四阶段控件只展示配对平均变化，没有执行 Python compare 中的自助重采样区间。字符串分词和空输入处理也属于简化演示，不应代替实现契约测试。

## 实现边界

```python
def compare(baseline,candidate,seed=7,samples=2000):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 3 阶段](../../03-metrics/docs/en.md)。

在报告修改前后比较相同问题。简单题上的提升可能掩盖某道题的严重退步，因此应在自助法区间旁保留逐题差值。

```text
baseline: q1=80,q2=70,q3=90
candidate: q1=85,q2=75,q3=60
deltas: +5,+5,-30; q3 remains a regression
```

## 构建与检查

使用确定性种子对配对差值重采样。区间描述当前有标注的样本，不能代表未来所有报告的事实准确率。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py report-judge --stage 4 --path learning-artifacts/report-judge
```

累计阶段全部通过后，从仓库根目录用原创样例输入运行你的交付物：

```bash
python3 learning-artifacts/report-judge/cli.py projects/report-judge/examples/claims.json --out evidence-audit.json --html evidence-audit.html
```

评审器采用保守的词汇证据检查。词序、数字和否定检查能发现部分错误匹配，但可能拒绝正确改写，也仍会漏掉其他错误匹配。缺少召回率或覆盖率标注时，对应指标为 null。自动评分不能证明结论真实。

## 继续探究

再复制一份 q1，会产生独立证据吗？
