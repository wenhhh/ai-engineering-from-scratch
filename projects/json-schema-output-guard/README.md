# JSON 结构输出守卫（JSON Schema Output Guard）

为模型输出契约提供结构定义预检，以及有限修复过程的凭据。

评分器需要 Node 22.18+ 和 Python 3；先掌握 TypeScript 联合类型、递归函数、JSON 与异步回调。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补入缺失行为。

## 构建并运行自己的版本

从仓库根目录初始化一次。新的起始代码按设计应当失败。

```bash
python3 scripts/project_test.py json-schema-output-guard --init learning-artifacts/json-schema-output-guard
python3 scripts/project_test.py json-schema-output-guard --stage 1 --path learning-artifacts/json-schema-output-guard --strict
```

逐阶段完成实现，再运行累计评分器和随附输入驱动程序：

```bash
python3 scripts/project_test.py json-schema-output-guard --all --path learning-artifacts/json-schema-output-guard --strict
cd learning-artifacts/json-schema-output-guard
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

驱动程序和离线样本属于随附脚手架，其导入会解析到你的实现。公开输入类型与函数签名位于起始代码及 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录执行：

```bash
python3 scripts/project_test.py json-schema-output-guard --all --solution --strict
cd projects/json-schema-output-guard/solution
node cli.ts --schema samples/schema.json --attempts samples/attempts.json --output guard.json --html guard.html
```

## 观察变化

第一次尝试在 $/confidence 处拒绝 confidence 为 1.5 的输出；第二次接受 confidence 为 0.8 的输出。即使可选属性没有提供值，其结构定义中存在不支持的关键字，也会在预检时失败。

修改样本副本并再次运行命令。将输入与输出保存在一起，便于他人复现；随附样本是人工编写的教学数据。

## 集成与限制

在应用边界调用 guard(raw,schema)，或调用 repair(generate,schema,maxAttempts)；其中 generate 接收结构化的 Issue[] 反馈，以及从 1 开始的尝试编号。

本项目只实现明确限定的 JSON Schema 子集，拒绝 $ref、format 和组合关键字。通过结构定义校验并不能证明答案事实正确。回放响应记录进行修复，也不属于在线模型调用。

## 阶段

1. [解析不可信输入边界](stages/01-parse-json/docs/en.md)
2. [递归遍历结构定义](stages/02-validate-types/docs/en.md)
3. [拒绝含糊或不支持的契约](stages/03-constraints/docs/en.md)
4. [在有限预算内修复输出](stages/04-bounded-repair/docs/en.md)


## 权威参考资料

[JSON Schema 校验词汇表](https://json-schema.org/draft/2020-12/json-schema-validation)
[Node TypeScript 执行说明](https://nodejs.org/api/typescript.html)

译注：问题消息、异常、状态和响应样本参与结构化反馈与测试，保留原值。API 页的代码块沿用上游签名摘录，其中 guard 的返回类型展示不完整；完整类型以随附源文件为准。
