# 报告证据评审器（Report Judge）

展示不确定性和需人工审阅论断的证据审计工作台。

逐句审计事实陈述。Orchard 的重试上限有来源支持，另一项部署论断与之无关；不能因为一个引用标记有效，就让整段文字通过。

## 从学习者工作区开始

[检索增强生成](../../phases/11-llm-engineering/06-rag/docs/en.md), [模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md), [验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/en.md). 语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html).

使用 Python 3.10+ 及其标准库。涉及文件锁或进程组监管的功能需要 POSIX 环境。

```bash
python3 scripts/project_test.py report-judge --init learning-artifacts/report-judge
python3 scripts/project_test.py report-judge --stage 1 --path learning-artifacts/report-judge
```

## 构建路线

1. [解析论断与引用标记](stages/01-claims/docs/en.md)
2. [计算平均分前先核查证据](stages/02-support/docs/en.md)
3. [报告精确率、覆盖率与来源召回率](stages/03-metrics/docs/en.md)
4. [使用自助法区间比较配对版本](stages/04-compare/docs/en.md)

## 使用自己的输入运行

完成各阶段后，使用以下命令，让你的工作区代码处理原创 Orchard 示例。将样例路径替换为自己的文件即可处理实际输入。

```bash
python3 learning-artifacts/report-judge/cli.py projects/report-judge/examples/claims.json --out evidence-audit.json --html evidence-audit.html
```

要先检查完整参考实现，请将同一命令中的 `learning-artifacts/report-judge` 替换为 `projects/report-judge/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例均明确列出，便于其他工具使用。

## 集成边界

评审器采用保守的词汇证据检查。词序、数字和否定检查能发现部分错误匹配，但可能拒绝正确改写，也仍会漏掉其他错误匹配。缺少召回率或覆盖率标注时，对应指标为 null。自动评分不能证明结论真实。

```bash
python3 scripts/project_test.py report-judge --all --solution --strict
python3 scripts/project_test.py report-judge --all --path learning-artifacts/report-judge --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试提供回归证据，不构成生产认证，也不属于未见过的基准测试。

译注：JSON 指标名、判定原因和证据文字保留原值。没有参考标注时召回率与覆盖率为 null；研究报告智能体自身评分器的无标注默认值不同，两者不能混用。
