# 导入表格并明确拒绝错误（Import a table without guessing away errors）

**Type:** Build
**Language:** Python
**Stage:** 1 of 4
**Time:** ~2 小时，需先完成链接中的前置学习
**Prerequisites:** [开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标

本阶段为 CSV 问答工作台添加功能：向 CSV 提问，检查实际执行的 SQL，并保留可复现的只读答案凭据。

公开契约为 `load_csv(text, max_rows=10000)`。随附 CLI 和样本文件位于工作区，请在 `main.py` 中实现领域函数。保持签名不变，使其他应用能够调用同一接口。

## 理解运行机制

先处理文件输入边界。CSV 读取器能够处理引号内的逗号和换行，简单地逐行按逗号拆分无法做到。将原始字节指纹与解析后的行分别保存，让答案能够标明实际使用了哪份文件。译注：本实现实际对读入后的文本重新进行 UTF-8 编码并计算哈希；CLI 的文本读取可能规范化换行，因此它不等同于对磁盘原始字节单独校验。

只有列中每个非空单元格都是有限十进制数、数值大小不超过 binary64 的安全整数范围，且没有下溢为零时，才将该列判为数值。带前导零、外观类似整数的值仍保留为 TEXT。大于 9007199254740991 的值也保留为 TEXT，避免不同标识符折叠成同一个浮点数。REAL 列的十进制运算仍然是近似的；若要扩展为精确运算，应明确设计精确数值模式。空单元格随后转为 SQL NULL。这套保守规则会将混合标识符列保持为文本。还要拒绝忽略大小写后重复的列名，因为 SQLite 会将它们视为相同名称；在创建数据库前拒绝列数不一致的记录。

| 输入列 | 非空值 | 推断类型 |
|---|---|---|
| region | West, East | TEXT |
| units | 12, 7 | REAL |
| ticket | 001, 002 | TEXT |
| item_id | 9007199254740992, 9007199254740993 | TEXT |

## 先预测，再运行

跟踪一个包含逗号、以引号包围的单元格。说明为何修改来源中的一个字符，即使下游聚合值不变，指纹也会变化。

```figure
pj-csv-sql-question-workbench-1
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建并验证

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 1 --path my-csv-sql-question-workbench --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 分层提示

1. 使用 csv.reader 并启用严格解析。
2. 根据全部非空值推断每列类型，不能只查看第一条记录。
3. 转换前先对输入文本计算哈希。

## 预期结果

本阶段评分器会报告第 1 至 1 阶段实际通过的测试。完成全部四阶段后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终交付独立 HTML 结果表和 JSON 凭据，其中包含准确的 SQL 与来源指纹。打开 HTML 并检查配套 JSON，不能仅凭退出码判断正确性。修改一项输入，准确解释哪项结果必须随之变化。

## 扩展练习

添加一个混合数值和文本的列，预测是否应允许对它使用 SUM。

范围：离线规划器只接受一套简小而明确的问句语法。可选的真实模型负责提出 SQL，只接收模式和问题。执行仍受 SQLite 授权机制约束。文件级来源追踪不意味着已经推导出每个结果行的数据血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
