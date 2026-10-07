# 从会议记录生成行动项（Meeting Notes to Actions）

将承诺整理成关联来源的待办收件箱，只有明确审阅并作出决定后才能导出。

需要 Python 3.10+；先掌握按行解析、字典、ISO 日期、转义和 JSON 文件。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补入缺失行为。

## 构建并运行自己的版本

从仓库根目录初始化一次。新的起始代码按设计应当失败。

```bash
python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions
python3 scripts/project_test.py meeting-notes-to-actions --stage 1 --path learning-artifacts/meeting-notes-to-actions --strict
```

逐阶段完成实现，再运行累计评分器和随附输入驱动程序：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --all --path learning-artifacts/meeting-notes-to-actions --strict
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

驱动程序和离线样本属于随附脚手架，其导入会解析到你的实现。公开输入类型与函数签名位于起始代码及 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录执行：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --all --solution --strict
cd projects/meeting-notes-to-actions/solution
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 观察变化

第一次运行提出三条候选承诺，导出的已批准行数为零。审阅 actions.html，选择决策并下载 decisions.json；然后加上 --decisions decisions.json 重新运行，只导出已批准且信息完整的行动项。

修改样本副本并再次运行命令。将输入与输出保存在一起，便于他人复现；随附样本是人工编写的教学数据。

## 集成与限制

使用 schema_version 为 1 的 actions.json 凭据，其中包含稳定的行动项 id 和原始来源行。CSV 列为 id、owner、due 和 task，且只包含已批准的行动项。

ACTION 行作为明确标记的候选项；NAME will TASK by YYYY-MM-DD 是一种保守的建议提取语法。不符合这些语法的非结构化建议保持未分配状态。HTML 审阅不会发布任务或发送消息。

## 阶段

1. [解析明确行动记录并保留来源行](stages/01-parse-lines/docs/en.md)
2. [校验负责人和日历日期](stages/02-validate-commitments/docs/en.md)
3. [精确去重承诺并保留引文](stages/03-deduplicate-actions/docs/en.md)
4. [发布经过转义的 HTML 清单与摘要](stages/04-publish-checklist/docs/en.md)


## 权威参考资料

[机制与 API 参考](https://docs.python.org/3/library/datetime.html)

译注：ACTION 标记、英文建议提取语法、决策枚举和已选 option 文本参与解析或审批文件生成，保留原值；页面提供中文说明。批准记录不验证审批人身份，CSV 是本地导出，不会发布真实任务。
