# 使用稳定哈希按组划分（Split groups with stable hashing）

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

以完整组为单位划分。对种子和组 id 计算哈希，将其转换为稳定比例值，再与请求的测试比例比较。同一组的所有行遵循同一决定，不受输入顺序影响。

哈希划分给出的是期望比例，无法保证精确行数。小数据集可能出现空分区，应如实报告，不能为了凑数移动单行并破坏组隔离。

## 推演一个具体案例（Work through one concrete case）

若 incident-A 包含九条消息、incident-B 包含一条，50% 的组划分可能产生九行训练数据和一行测试数据。为了平衡数量而移动一条消息，会重新引入事件组泄漏。

```figure
pj-dataset-split-auditor-3
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

按照所述契约实现 `split_groups`。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

从种子和组推导分区决定，不能依赖输入行序。反转输入列表可以改变分区内行序，但必须保持每个 id 所属的分区不变。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 3 --path learning-artifacts/dataset-split-auditor --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 检查失败边界（Investigate the failure boundary）

生成 20 个大小不同的组，修改种子，分别比较组隔离和行数平衡。




## 参考资料（References）

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
