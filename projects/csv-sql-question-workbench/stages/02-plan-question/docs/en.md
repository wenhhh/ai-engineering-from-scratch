# 将简单问题转成可检查的计划（Translate a small question into an inspectable plan）

**Type:** Build
**Language:** Python
**Stage:** 2 of 4
**Time:** ~2 小时，需先完成链接中的前置学习
**Prerequisites:** 前一阶段，以及[开发环境](../../../../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)、[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

## 构建目标

本阶段为 CSV 问答工作台添加功能：向 CSV 提问，检查实际执行的 SQL，并保留可复现的只读答案凭据。

公开契约为 `plan_question(question, data)`。随附 CLI 和样本文件位于工作区，请在 `main.py` 中实现领域函数。保持签名不变，使其他应用能够调用同一接口。

## 理解运行机制

问句规划器提出查询，不负责执行查询。基线有意只理解 count rows、show rows，以及 sum units by region 这样的分组聚合。遇到不支持的问题时，会报错并给出示例，不会编造一个貌似合理的答案。

根据导入的模式解析字段名，再为解析后的标识符加引号。不得将用户输入中的任意子串直接插入 SQL。可选模型也应沿用这种提案与执行分离：模型响应在下一阶段获得授权之前，始终作为不可信文本处理。

| 问句部分 | 解析后的含义 |
|---|---|
| sum | SQL 聚合函数 SUM |
| units | 已存在的数值列 |
| by region | 对已存在的 region 列执行 GROUP BY |

## 先预测，再运行

预测 count by product 对应的 SQL。然后尝试 sum region by product，说明为何应在执行前因类型不符而拒绝。

```figure
pj-csv-sql-question-workbench-2
```

改变交互图输入并检查计算值，将一个发生变化的结果对应到实现中的某一行。交互图用于解释机制，不能替代真实程序。

## 构建并验证

从仓库根目录执行一次初始化，复制公共类型、函数桩、实际命令包装器和原创样本输入。由于业务函数尚未实现，新工作区的第一阶段测试应失败。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 2 --path my-csv-sql-question-workbench --strict
```

使用标准库实现契约，先手工推演示例。保持调用方输入不变，对格式错误的数据给出可操作的错误提示。测试只导入你的工作区，不导入参考解答。

## 分层提示

1. 只对问句语法进行规范化。
2. 将通过检查的字段词元映射回实际列名。
3. 保持查询生成函数为纯函数，使测试无须依赖数据库。

## 预期结果

本阶段评分器会报告第 1 至 2 阶段实际通过的测试。完成全部四阶段后，先用随附样本运行工具，再换成自己的输入：

```bash
cd my-csv-sql-question-workbench
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

最终交付独立 HTML 结果表和 JSON 凭据，其中包含准确的 SQL 与来源指纹。打开 HTML 并检查配套 JSON，不能仅凭退出码判断正确性。修改一项输入，准确解释哪项结果必须随之变化。

## 扩展练习

增加一种问句形式，明确其歧义处理规则并添加测试。

范围：离线规划器只接受一套简小而明确的问句语法。可选的真实模型负责提出 SQL，只接收模式和问题。执行仍受 SQLite 授权机制约束。文件级来源追踪不意味着已经推导出每个结果行的数据血缘。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。实现与练习数据均为原创教学示例。
