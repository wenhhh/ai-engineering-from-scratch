# 晋升前要求独立门禁

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

在同一批保留用例上比较基线与候选。要求达到最小汇总增益，且原先正确的用例不能退化，再用摘要标识精确候选。该门禁评估交付物，不会改写用户技能或部署它。反复使用同一留出集调参会泄漏信息，因此后续轮次应换用真正新的评估集。

```figure
pj-self-improving-skill-loop-4
```

译注：图表边界：只演示两条消息与手填正确性数组，不执行真实候选生成和文件晋升。JavaScript 小写转换不等同于 Python casefold；如 Straße 与 STRASSE，图中可能漏报实现能识别的内容重复。

## 实现边界

```python
def gate(holdout,baseline,candidate,min_gain=.05):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考 1](https://docs.python.org/3/library/hashlib.html)。

## Orchard 示例推演

编码前，阅读 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html) 和 [模型评估](../../../../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md)。先完成[第 3 阶段](../../03-propose/docs/en.md)。

留出门禁通过后，生成候选摘要供人工审阅。晋升要求精确匹配该摘要，写入带版本的规则文件，并保留旧文件用于回退。公开样本工单属于示例，不是未公开基准。

```text
baseline accuracy=0; candidate accuracy=1; no regression -> eligible
wrong digest -> no write
exact digest -> promote and retain .previous
```

## 构建并检查

将批准绑定到序列化规则内容，并在写入前重新计算摘要。不能从高分推断用户已经批准。

在学习者工作区中实现本阶段。随附的 CLI 辅助代码是适配器，会导入你的函数，不会用参考解答替代它们。

```bash
python3 scripts/project_test.py self-improving-skill-loop --stage 4 --path learning-artifacts/self-improving-skill-loop
```

累计阶段通过后，从仓库根目录使用原创样本输入运行你的交付物：

```bash
python3 learning-artifacts/self-improving-skill-loop/cli.py projects/self-improving-skill-loop/examples/support-cases.json --out experiment.json
```

实验从开发数据提出确定性路由规则。显式提供的开发集／留出集会接受内容与分组泄漏审计。晋升需要 --promote-to，以及通过门禁后打印的精确 --approve-digest。旧规则保留在 <destination>.previous 中，供人工回退；这是单写入方文件工作流。

## 接着探究

再次编辑技能前，你会如何固定下一批留出数据？

`--dataset-audit audit.json` 选项读取数据集划分审计器的带版本 `partitions.train` 和 `partitions.test` 记录，保留标签与来源，并在本地重新检查泄漏。`--export-skill orchard-routing` 写出新的草稿 `SKILL.md` 和 `references/rules.json`，不会安装或激活候选技能。
