# 仅从开发集错误中提出规则

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

只从开发分区中的错误生成候选。词项需要重复支持且标签唯一，避免一次性出现的姓名和矛盾样例立即变成策略。候选生成函数从不接收留出用例。它提出变化，不负责发布。

```figure
pj-self-improving-skill-loop-3
```

译注：图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。

## 实现边界

```python
def propose(development,rules,min_support=2):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md)。先完成[第 2 阶段](../../02-skill/docs/en.md)。

仅从开发集错误提出候选。Invoice 出现在两个 billing 样例中，可以成为规则；同时用于 billing 和 access 样例的词项则存在歧义。不要将留出文本传入该函数。

```text
development: invoice wrong; invoice late -> billing
min_support=2 -> candidate terms=[invoice]
holdout: invoice missing -> used only after proposal
```

## 构建并检查

每个词项在每个用例中只计一次，收集其关联的全部标签。提出规则前，要求标签唯一且具有足够的独立支持。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py self-improving-skill-loop --stage 3 --path learning-artifacts/self-improving-skill-loop
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

如果不去重，同一条开发消息被多次复制会导致什么问题？

译注：当前实现按记录累计支持，同一分区内的重复内容未自动去重。两个不同 ID 的重复消息可能满足 min_support=2；因此上文的“独立支持”需要额外的数据去重保证。此限制保留原算法，并在汉化回归中复现。
