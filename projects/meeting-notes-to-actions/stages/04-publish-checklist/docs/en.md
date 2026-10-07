# 发布经过转义的 HTML 清单与摘要

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

清单需要在解析器之外也便于阅读和审阅。渲染负责人、日期、任务和来源行之前，先校验来源引文行号，并转义每个渲染字段。只有相对于明确传入的日期，才标记逾期项。

HTML 是静态审阅交付物，不发送消息，也不在其他系统创建任务。计数器区分已就绪、信息不完整和已逾期的行动项，帮助读者安排审阅优先级。

## 推演一个具体用例

首次运行收件箱导出零行，因为 ready 不等于 approved。通过 HTML 选择明确决策、下载 JSON 决策文件后，下一次命令行运行只把已批准且信息完整的行导出为 CSV。

```figure
pj-meeting-notes-to-actions-4
```

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

按已声明契约实现 `publish`。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

稳定 id 将审阅选择绑定到负责人、日期、任务和来源行。随附驱动程序先为所有当前行动项分配 id，再校验决策；写入输出之前拒绝任何未知或过期 id。来源行改变后，原决策文件必须重新审阅。下载决策时，选择控件保留当前的批准和拒绝状态。转义全部导入字段；HTML 中唯一的可执行脚本是项目编写的决策文件下载器。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py meeting-notes-to-actions --init learning-artifacts/meeting-notes-to-actions` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py meeting-notes-to-actions --stage 4 --path learning-artifacts/meeting-notes-to-actions --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/meeting-notes-to-actions
python3 cli.py samples/notes.txt --today 2026-09-29 --output actions.json --html actions.html --csv approved.csv
```

## 探究失败边界

把脚本标签粘贴到任务中。它必须以来源文本显示；下载的决策只能包含行动项 id 和允许的决策值。

ACTION 行作为明确标记的候选项；NAME will TASK by YYYY-MM-DD 是一种保守的建议提取语法。不符合这些语法的非结构化建议保持未分配状态。HTML 审阅不会发布任务或发送消息。


## 参考资料

[权威技术参考](https://docs.python.org/3/library/datetime.html)
