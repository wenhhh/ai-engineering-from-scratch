# 在只读边界内执行提案（Execute a proposal inside a read-only boundary）

**Type:** Build
**Language:** Python
**Stage:** 3 of 4
**Time:** ~2 小时，需先完成链接中的前置学习
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标

本阶段为 CSV 问答工作台添加功能：向 CSV 提问，检查实际执行的 SQL，并保留可复现的只读答案凭据。

公开契约为 `run_query(data, sql, max_rows=100, max_steps=100000)`。随附 CLI 和样本文件位于工作区，请在 `main.py` 中实现领域函数。保持签名不变，使其他应用能够调用同一接口。

## 理解运行机制

仅检查字符串是否以 SELECT 开头远远不够：SQL 可以调用函数、读取内部表，或在查询内部隐藏高开销计算。先建立独立的内存表，再在编译不可信语句之前安装 SQLite 授权器。只允许读取这张表以及使用少量函数，拒绝其他操作。

两种额度分别限制不同环节。最多获取上限加一行，可以判断结果是否被截断；指令回调则在巨大结果生成之前中断过量计算。原始 CSV 始终不以写入方式打开。这些限制针对教学数据库，不构成多租户数据库服务。

| 提案 | 结果 |
|---|---|
| SELECT SUM(units) FROM data | 返回 40 |
| DELETE FROM data | 生效前拒绝 |
| SELECT * FROM data，行数上限为 2 | 返回两行，且 truncated=true |

## 先预测，再运行

说明为何仅限制返回行数，无法阻止在返回第一行之前就进行大量计算的高开销联接。

```figure
pj-csv-sql-question-workbench-3
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建并验证

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 3 --path my-csv-sql-question-workbench --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 分层提示

1. 安装授权器之前，先创建并填充数据库。
2. 执行和获取结果期间都保持回调有效。
3. 通过元数据报告截断，不能默默将部分结果称为完整结果。

## 预期结果

本阶段评分器会报告第 1 至 3 阶段实际通过的测试。完成全部四阶段后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终交付独立 HTML 结果表和 JSON 凭据，其中包含准确的 SQL 与来源指纹。打开 HTML 并检查配套 JSON，不能仅凭退出码判断正确性。修改一项输入，准确解释哪项结果必须随之变化。

## 扩展练习

构造一个故意计算量很大的读取查询，证明指令额度能够将它中断。

范围：离线规划器只接受一套简小而明确的问句语法。可选的真实模型负责提出 SQL，只接收模式和问题。执行仍受 SQLite 授权机制约束。文件级来源追踪不意味着已经推导出每个结果行的数据血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
