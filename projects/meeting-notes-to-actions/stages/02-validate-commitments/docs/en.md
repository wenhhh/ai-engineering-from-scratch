# 校验负责人和日历日期

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

行动清单属于业务数据。应拒绝不存在的日历日期，不能仅因格式像日期就接受。缺少负责人或日期应产生审阅标记，不应让解析器崩溃。

使用字面标记 ? 表示未知字段，让不确定性在结构化输出中保持可见。按 ISO 日历日期解析，不为全天承诺虚构时区。

要求来源引文行号是非空的正整数列表。虽然 Python 将布尔值视为整数，也必须拒绝它。无效或缺失的行号不能成为发布清单中的可信证据。

## 推演一个具体用例

2026-02-30 的数字格式正确，但不是有效日历日期。标记 ? 表示承诺字段缺失，应产生 needs_date 或 needs_owner，而不是猜测值。

```figure
pj-meeting-notes-to-actions-2
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `validate_action`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

先限制为预期的 ISO 日期形式，再用 date.fromisoformat 解析。来源行号必须是正整数，明确拒绝 bool、空列表及类似 HTML 的值。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 2 --path learning-artifacts/meeting-notes-to-actions --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

尝试批准负责人为 ? 的行动项。收件箱必须拒绝批准，将这项不完整承诺留待审阅。




## 参考资料

[权威技术参考](https://docs.python.org/3/library/datetime.html)
