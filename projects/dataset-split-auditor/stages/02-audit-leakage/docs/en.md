# 审计重复内容和组别泄漏（Audit duplicate and group leakage）

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)，本阶段延续前面的契约。

## 新增能力（What changes）

内容泄漏与组别泄漏需要分别检查。同一事件中的两条不同支持消息，即使文本不同，也可能泄漏答案。应同时跟踪各分区的规范化内容哈希和组 id。

返回发生冲突的哈希与组名，不能只给一个百分比。审阅者需要据此定位记录。拒绝重复记录 id，避免证据的指向产生歧义。

## 推演一个具体案例（Work through one concrete case）

train-a 与 test-a 来自不同事件，但规范化文本相同；train-a 与 test-b 文本不同，却都属于 incident-1。报告保留两份独立证据列表，并列出所涉记录的准确 id。

```figure
pj-dataset-split-auditor-2
```

修改实验输入，先计算预期结果，再查看指标。图表根据这些输入计算；项目完成证据仍来自下方的实现测试。

## 实现契约（Implement the contract）

按照所述契约实现 `audit`。

参考[公开 API 契约](../../../API.md)和起始签名。核心函数负责返回值，文件读取、参数解析和展示交给提供的驱动。

为两侧分别建立从值到记录 id 的索引，再求键的交集。只有哈希能够表明碰撞，却不足以让初学者找到应检查的来源行。

## 验证与检查（Verify and inspect）

从仓库根目录用 `python3 scripts/project_test.py dataset-split-auditor --init learning-artifacts/dataset-split-auditor` 初始化一次，然后进行累计评分：

```bash
python3 scripts/project_test.py dataset-split-auditor --stage 2 --path learning-artifacts/dataset-split-auditor --strict
```

在你实现契约之前，新工作区的测试应当失败。完成全部阶段后，使用提供的样本运行自己的实际交付物：

```bash
cd learning-artifacts/dataset-split-auditor
python3 cli.py samples/input.json --output split-audit.json --html split-audit.html
```

## 检查失败边界（Investigate the failure boundary）

让两条记录使用同一个 id。构造证据之前就应拒绝，因为此时来源位置会产生歧义。




## 参考资料（References）

[主要技术参考](https://scikit-learn.org/stable/common_pitfalls.html)
