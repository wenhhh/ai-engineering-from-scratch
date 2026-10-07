# 发布其他开发者可复现的答案（Publish an answer another developer can reproduce）

**Type:** Build
**Language:** Python
**Stage:** 4 of 4
**Time:** ~2 小时，需先完成链接中的前置学习
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标

本阶段为 CSV 问答工作台添加功能：向 CSV 提问，检查实际执行的 SQL，并保留可复现的只读答案凭据。

公开契约为 `render_report(report)`。随附 CLI 和样本文件位于工作区，请在 `main.py` 中实现领域函数。保持签名不变，使其他应用能够调用同一接口。

## 理解运行机制

有用的数据答案应带上查询和输入标识。将实际执行的 SQL 显示在表格上方，并在 HTML 旁保存机器可读凭据。报告必须说明是否截断，以及来源追踪的范围。数据库结果只能证明这份文件在该查询下返回了什么，不能证明文件本身准确。

生成 HTML 时，将每个单元格和列标题视为不可信文本。浏览器应显示包含脚本标签的单元格内容，绝不能执行它。同一份 JSON 凭据还允许 notebook、CI 检查或其他智能体直接消费答案，无须抓取可视化报告。

| 区域（Region） | SUM(units) |
|---|---|
| East | 10 |
| South | 9 |
| West | 21 |

## 先预测，再运行

将一条 West 输入中的 4 改为 6。预测聚合值与指纹的变化，再比较两份凭据。

```figure
pj-csv-sql-question-workbench-4
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建并验证

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 4 --path my-csv-sql-question-workbench --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 分层提示

1. 使用 html.escape 处理要插入标记的数据。
2. 展示实际运行的 SQL，不能仅展示原始问题。
3. 让 JSON 与 HTML 始终源自同一个报告对象。

## 预期结果

本阶段评分器会报告第 1 至 4 阶段实际通过的测试。完成全部四阶段后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终交付独立 HTML 结果表和 JSON 凭据，其中包含准确的 SQL 与来源指纹。打开 HTML 并检查配套 JSON，不能仅凭退出码判断正确性。修改一项输入，准确解释哪项结果必须随之变化。

## 扩展练习

将 JSON 凭据接入一个比较已知聚合值的简单回归检查。

范围：离线规划器只接受一套简小而明确的问句语法。可选的真实模型负责提出 SQL，只接收模式和问题。执行仍受 SQLite 授权机制约束。文件级来源追踪不意味着已经推导出每个结果行的数据血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
