# 多智能体代码评审组（Multi-Agent Code Review Panel）

用于审阅评审分歧的工作台，测量最低支持人数何时有帮助，以及何时会掩盖问题。

评分器需要 Node 22.18+ 和 Python 3；先掌握 TypeScript 对象、集合、Promise、AbortSignal，以及精确率和召回率。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补入缺失行为。

## 构建并运行自己的版本

从仓库根目录初始化一次。新的起始代码按设计应当失败。

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel
python3 scripts/project_test.py multi-agent-code-review-panel --stage 1 --path learning-artifacts/multi-agent-code-review-panel --strict
```

逐阶段完成实现，再运行累计评分器和随附输入驱动程序：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --all --path learning-artifacts/multi-agent-code-review-panel --strict
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

驱动程序和离线样本属于随附脚手架，其导入会解析到你的实现。公开输入类型与函数签名位于起始代码及 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录执行：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --all --solution --strict
cd projects/multi-agent-code-review-panel/solution
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 观察变化

宽泛规则评审者会标记一行注释和两个真实候选问题，精确率为 2/3。最低支持人数门槛会过滤只有一位评审者支持的注释误报，将精确率提高到 1，同时保留 TLS 严重程度的分歧。预算为 1 时，不会形成共识。

修改样本副本并再次运行命令。将输入与输出保存在一起，便于他人复现；随附样本是人工编写的教学数据。

## 集成与限制

输入中的 files 将文件名映射到文本或行数组。可选 reviewers 包含 id、cost 和 findings 记录。预期标签使用 {file,line,rule}；报告记录源码指纹，并对比各评审者与共识结果的指标。

本地评审者采用不同的静态启发式规则，并不代表独立的大语言模型。共识衡量支持程度，不能判定事实真伪。外部回调必须遵守 AbortSignal；超时无法撤销远程副作用。

## 阶段

1. [校验评审证据](stages/01-evidence/docs/en.md)
2. [汇总独立评审者的支持](stages/02-agreement/docs/en.md)
3. [预留成本并执行期限约束](stages/03-budgets/docs/en.md)
4. [测量评审组的精确率与召回率](stages/04-evaluate/docs/en.md)


## 权威参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)

## 复用 PR 评审凭据

先对原创 diff 运行 PR 评审报告器，再通过 `--pr-report /path/review.json` 提供其 schema_version 为 1 的输出，以及匹配的完整源码快照：

```bash
node cli.ts --input samples/pr-snapshot.json --pr-report /path/review.json --output composed-panel.json
```

适配器将 high／medium／low 严重程度映射为 3／2／1，保留 file、line、rule 标识，并记录 pr_diff_sha256。导入的问题仍需通过评审组的源码引文校验。这证明交付物能够互通，但不会让相关联的词法检测器变成独立判断者。

译注：评审者标识、检测规则、严重程度、状态、模型输入和 JSON 报告字段保留原值；HTML 固定说明已译。评审者 ID 不同并不能证明其判断相互独立，源码引文校验也不等于漏洞已确认。
