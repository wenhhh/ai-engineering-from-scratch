# 解析明确行动记录并保留来源行

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

自然语言会议记录包含建议、决策和承诺。从明确格式开始：ACTION owner | YYYY-MM-DD | task。采用这种保守解析方式，可避免根据附近的人名虚构负责人。

在每条解析记录中保留原始行号与文本。后续审阅者必须能够追溯行动项对应的原话。非行动项文本不进入输出。

## 推演一个具体用例

第 1 行是决策，第 2 行为 ACTION Mira |2026-10-01|Update guide，第 3 行为 Maybe ask Ravi。只有第 2 行成为明确候选项。另一个建议提取语法可以在补齐正常空格后识别 "Priya will test login by 2026-10-02"。

```figure
pj-meeting-notes-to-actions-1
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `parse_notes`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

先枚举原始行，再进行过滤。ACTION 只按前两个分隔符切分，允许任务正文包含额外竖线而不改变负责人和日期的位置。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 1 --path learning-artifacts/meeting-notes-to-actions --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

将一个行动项向下移动两行后重新运行。保存的引文行号也必须移动，而无关正文继续保持未分配。




## 参考资料

[权威技术参考](https://docs.python.org/3/library/datetime.html)
