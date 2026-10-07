# 精确去重承诺并保留引文

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

重复记录可能造成任务重复。按规范化的负责人、截止日期和任务文本分组，再合并全部来源行号。相同任务若分配给两个人，仍属于两项承诺。

这里采用精确规范化，不进行语义去重。不要自动合并不同措辞，因为它们的期限或范围可能不同。交给人工审阅比静默删除一项独立义务更稳妥。

## 推演一个具体用例

第 2 行和第 8 行的完全相同承诺合并为一条，来源行号为 [2,8]。改变负责人或截止日期，就会形成第二项承诺，即使任务文本仍完全相同。

```figure
pj-meeting-notes-to-actions-3
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `deduplicate`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

根据规范化的 owner、due 和 task 构造键，同时保留展示文本。按排序后的顺序合并引文行号集合，使重复导入产生确定性输出。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 3 --path learning-artifacts/meeting-notes-to-actions --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

用不同措辞写下一个截止日期更晚的任务。解释为什么自动语义合并可能删除一项实际义务。




## 参考资料

[权威技术参考](https://docs.python.org/3/library/datetime.html)
