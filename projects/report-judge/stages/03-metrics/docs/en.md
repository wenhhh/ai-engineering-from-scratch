# 报告精确率、覆盖率与来源召回率

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

合并指标前，先分别保留各项结果。精确率衡量已发布论断获得支持的程度，来源召回率衡量预期证据是否被选中，事实覆盖率衡量关键短语是否出现。空报告的精确率为零，避免不作答看起来像完全准确。

```figure
pj-report-judge-3
```

## 实现边界

```python
def score_report(text,evidence,expected_sources=(),facts=()):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 2 阶段](../../02-support/docs/en.md)。

空报告没有证据，因此得零分。召回率和事实覆盖率需要标注；没有标注时指标不可用，不能自动记为满分。只有获得支持的论断才可计入来源召回率或覆盖率。

```text
empty claims -> score 0, state no_evidence
3 lexical matches, no reference labels -> recall null, coverage null
score is computed only from available metrics
```

## 构建与检查

统一维护获得支持的论断集合，再据此计算各项证据指标。不能让没有对应来源的引用抬高来源召回率。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py report-judge --stage 3 --path learning-artifacts/report-judge
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

为什么词汇匹配得分为 100 时，召回率仍可能不可用？
