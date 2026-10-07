# CSV 问答工作台（CSV Question Workbench）

向 CSV 提问，检查实际执行的 SQL，并保留可复现的只读答案凭据。

最终交付独立 HTML 结果表和 JSON 凭据，其中包含准确的 SQL 与来源指纹。

## 运行完整工具

从仓库根目录运行：

```bash
cd projects/csv-sql-question-workbench/solution
python3 cli.py sample.csv --question "sum units by region" --output output/report.html
```

样本为本项目专门编写。通过同一 CLI 替换为自己的输入；基础版本不需要模型密钥。启用可选外部适配器前，先查阅命令帮助。

## 自己动手构建

先学习[开发环境配置](../../phases/00-setup-and-tooling/01-dev-environment/docs/en.md)与[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。开始前，应能够读取 JSON 对象、调用函数、执行终端命令并理解测试失败信息。

```bash
python3 scripts/project_test.py csv-sql-question-workbench --init my-csv-sql-question-workbench
python3 scripts/project_test.py csv-sql-question-workbench --stage 1 --path my-csv-sql-question-workbench --strict
python3 scripts/project_test.py csv-sql-question-workbench --all --path my-csv-sql-question-workbench --strict --report completion.json
```

新工作区在函数实现之前会有意测试失败。项目已提供 CLI、输入文件和公共类型，无须复制参考入口来补齐功能。按顺序完成各阶段：

1. [导入表格并明确拒绝错误](stages/01-import-table/docs/en.md)
2. [将简单问题转成可检查的计划](stages/02-plan-question/docs/en.md)
3. [在只读边界内执行提案](stages/03-enforce-read-boundary/docs/en.md)
4. [发布其他开发者可复现的答案](stages/04-publish-receipt/docs/en.md)

## 复用交付物

CLI 与可导入函数读取普通本地文件并返回结构化输出。与其他程序集成时，保留输入标识和明确的失败元数据。HTML 不包含第三方脚本；检查其中包含的源数据后再决定是否分享。

## 验证与范围

```bash
python3 scripts/project_test.py csv-sql-question-workbench --all --solution --strict
```

离线规划器只接受一套简小而明确的问句语法。可选的真实模型负责提出 SQL，只接收模式和问题。执行仍受 SQLite 授权机制约束。文件级来源追踪不意味着已经推导出每个结果行的数据血缘。

评分验证项目提供的确定性契约。学习者证书是自行声明的完成记录，不代表真实服务商验证或职业认证。把工具当作已完成集成之前，先读取 JSON 记录，并至少测试一份新输入。

主要参考：[SQLite 授权回调](https://www.sqlite.org/c3ref/set_authorizer.html)。
