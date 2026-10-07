# 划分标注用例并避免身份泄漏

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

对稳定用例 ID 计算哈希，从而选择不依赖文件顺序的分区。评估前拒绝重复标识。划分是确定性的，但不保证标签数量完全平衡；提出规则前应检查两个分区，并保留评估分区。

```figure
pj-self-improving-skill-loop-1
```

译注：图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。

## 实现边界

```python
def split_cases(cases,holdout_fraction=.25):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md)。

留出集隔离必须依据内容和分组，不能只看 ID。两个 ID 不同的工单也可能重复同一条客户消息。先规范化内容并合并相关记录，再将整个连通分量分配到一个分区。

```text
id d1: "Invoice wrong"
id h1: "INVOICE   wrong"
fingerprint equal -> one partition, or reject explicit split
```

## 构建并检查

对连通分量计算哈希前，同时合并内容重复边和分组边。相同规范化内容若具有冲突标签，必须拒绝。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py self-improving-skill-loop --init learning-artifacts/self-improving-skill-loop
python3 scripts/project_test.py self-improving-skill-loop --stage 1 --path learning-artifacts/self-improving-skill-loop
```

先预测上面的中间状态，再运行阶段测试。全新的桩代码应当失败；参考实现通过测试不代表你的学习者工作区已完成。

## 接着探究

同一个客户线程中的两条不同消息，能否安全地视为独立样例？

译注：上面的 ID 哈希概述来自上游早期描述。当前 split_cases 在合并内容和分组后，使用连通分量中最小的内容指纹选择分区；ID 用于验证身份与确定输出顺序，不能用逐 ID 独立分区替代现实现。
