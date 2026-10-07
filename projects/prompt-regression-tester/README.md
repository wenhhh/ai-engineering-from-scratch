# 提示词回归测试器（Prompt Regression Tester）

审阅提示词变更的工具包，准确找出哪些向用户承诺的行为发生了退化。

Orchard 必须返回 JSON 并保留来源定位信息。将 `format-json` 和 `source-link` 保持为不同的用例 ID，因为它们分别对应向调用方承诺的两项行为。比较运行结果前，响应记录先对包括提示词与检查项在内的完整用例列表计算哈希。

## 从学习者工作区开始

[结构化输出](../../phases/11-llm-engineering/03-structured-outputs/docs/en.md)、[模型评估](../../phases/02-ml-fundamentals/09-model-evaluation/docs/en.md)。语言基础：[Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)。

使用 Python 3.10+ 及其标准库。项目使用文件锁或进程组监督的部分需要 POSIX 环境。

```bash
python3 scripts/project_test.py prompt-regression-tester --init learning-artifacts/prompt-regression-tester
python3 scripts/project_test.py prompt-regression-tester --stage 1 --path learning-artifacts/prompt-regression-tester
```

## 构建路线

1. [评分前校验用例](stages/01-validate-cases/docs/en.md)
2. [无需模型即可为记录输出评分](stages/02-score-recordings/docs/en.md)
3. [跨修订版比较相同用例](stages/03-pair-revisions/docs/en.md)
4. [根据明确容限设置发布门禁](stages/04-gate-releases/docs/en.md)

## 使用自己的输入运行

完成各阶段后，下列命令在原创 Orchard 示例上运行你的工作区代码。可将样本路径替换为自己的文件。

```bash
python3 learning-artifacts/prompt-regression-tester/cli.py projects/prompt-regression-tester/examples/cases.json projects/prompt-regression-tester/examples/baseline.json projects/prompt-regression-tester/examples/candidate.json --out prompt-diff.json --markdown prompt-diff.md
```

先检查完整参考实现时，将同一命令中的 `learning-artifacts/prompt-regression-tester` 替换为 `projects/prompt-regression-tester/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均明确列出，便于其他工具调用。

## 集成边界

随附响应记录是人工编写的测试夹具。工具比较已记录的响应，不会调用模型，也不证明语义正确。JSON 用例文件与响应文件是公开接口。发布门禁阻止放行时，退出码为 1。

```bash
python3 scripts/project_test.py prompt-regression-tester --all --solution --strict
python3 scripts/project_test.py prompt-regression-tester --all --path learning-artifacts/prompt-regression-tester --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例和测试属于回归证据，不构成生产认证或未见基准。

## 权威参考资料

- [机制与 API 参考](https://docs.python.org/3/library/difflib.html)

每份响应记录通过 `case_sha256` 绑定稳定的测试用例，并使用 `template_sha256` 记录精确的 `prompt_template`。模板修订版可以不同；被测试的任务发生变化时，需要生成新的响应记录。已纳入版本库的响应标为 `authored_fixture`，不属于服务商实测结果。

译注：检查类型、状态和发布决策保留机器值。stable_pass 为持续通过，stable_fail 为持续失败，regressed 为退化，improved 为改善；ship 表示放行，block 表示阻止。Markdown 标题和表头已译，样本提示词与响应记录不改写。
