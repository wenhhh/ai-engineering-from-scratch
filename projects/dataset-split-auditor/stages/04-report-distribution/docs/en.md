# 同时报告划分规模与泄漏（Report split size and leakage together）

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

即使没有泄漏，当几乎所有记录都落入训练集时，划分仍可能没有评估价值。将行数、组数和泄漏信息放进同一交付物，避免“无泄漏”的声明掩盖空测试集。

检查器不能证明统计代表性。依赖时间的任务通常需要按时间顺序划分，本项目将这一能力留作后续扩展。

## 推演一个具体案例（Work through one concrete case）

零泄漏但 test_rows=0 的报告仍不可用。随附的有泄漏夹具虽然两侧都有数据，也会因为内容和组别证据仍存在而不通过。这些不同原因会导致同一个门禁结果。

```figure
pj-dataset-split-auditor-4
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

按照所述契约实现 `summarize`。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

CLI 将 summarize 与来源索引组合，并可按选项返回退出码 2。即使门禁失败，CI 任务也应保留 JSON 交付物，让审阅者能够定位问题。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 4 --path learning-artifacts/dataset-split-auditor --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 检查失败边界（Investigate the failure boundary）

自行构造一对无泄漏分区，运行 --check 并确认退出码为 0。再用新 id 加入一份规范化后相同的副本，确认退出码为 2，且交付物中保留两个原始 id。

规范化能够识别规范化后完全相同的副本，不能识别改写。稳定的组哈希不保证类别平衡，也不保证评估符合时间顺序。导出的分区仍保留来源文本。


## 参考资料（References）

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
