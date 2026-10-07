# 数据集划分审计器（Dataset Split Auditor）

构建一道数据集检查门禁，指出造成内容泄漏和事件组泄漏的具体记录。

需要 Python 3.10+，以及列表、集合、字典、Unicode 规范化和哈希函数知识。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补齐尚未实现的行为。

## 构建并运行自己的版本（Build and run your version）

从仓库根目录执行一次初始化。新起始代码尚未实现，测试应当失败。

```bash
python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor
python3 scripts/project_test.py dataset-split-auditor --stage 1 --path learning-artifacts/dataset-split-auditor --strict
```

逐阶段完成实现，然后运行累计评分器和提供的输入驱动：

```bash
python3 scripts/project_test.py dataset-split-auditor --all --path learning-artifacts/dataset-split-auditor --strict
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

驱动和离线样本属于已提供的脚手架，导入会指向你的实现。公开输入类型和函数签名见起始代码及 [API 契约](API.md)。

## 单独检查参考实现（Inspect the reference separately）

从仓库根目录运行：

```bash
python3 scripts/project_test.py dataset-split-auditor --all --solution --strict
cd projects/dataset-split-auditor/solution
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 观察变化（Observe the change）

有泄漏的样本将 train-a 和 test-a 标为规范化内容重叠，再将 train-a 和 test-b 标为来自同一事件。其 usable 标志为 false。

编辑样本副本后重新运行命令。将输入与输出一起保存，便于他人复现；提供的样本是专门编写的教学数据。

## 集成与限制（Integration and limits）

向 CLI 传入 {train,test} 记录，或传入 {records} 并使用 --split 0.25 --seed experiment-1。在 CI 中添加 --check，可在划分不可用时返回退出码 2。

规范化能够识别规范化后完全相同的副本，不能识别改写。稳定的组哈希不保证类别平衡，也不保证评估符合时间顺序。导出的分区仍保留来源文本。

## 阶段（Stages）

1. [为规范化记录生成指纹](stages/01-fingerprint-records/docs/en.md)
2. [审计重复内容和组别泄漏](stages/02-audit-leakage/docs/en.md)
3. [使用稳定哈希按组划分](stages/03-split-groups/docs/en.md)
4. [同时报告划分规模与泄漏](stages/04-report-distribution/docs/en.md)


## 一手参考资料（Primary references）

[机制与 API 参考](https://scikit-learn.org/stable/common_pitfalls.html)

## 接入评估流程

可用 `python3 cli.py --train train.jsonl --test test.jsonl --check --output split-audit.json` 读取 JSONL。每行都需要 id、group 和 text；额外的 label 与 source 字段会保留在 partitions.train/partitions.test 中。冲突证据包括成对记录的 id，以及调用方提供的来源定位信息。

本地模型评估框架（Local Model Evaluation Harness）接受 `--dataset-audit split-audit.json`，要求凭据采用 schema_version 1、标为可用，且标签 id 与已审计测试分区完全一致。无泄漏的划分是必要证据，但不能证明评估标签质量良好。
