# 批准并选择限定范围的规则

**第 3 阶段，共 4 阶段。** Typescript。预计约 2 小时。

明确转入批准状态前，要求独立会话支持。已退役规则不能悄悄复活。hook 执行时，只纳入已经批准且匹配当前 scope 或 global scope 的规则。将来源 ID 与注入的规则文本一并返回，让用户能追溯持久指引的来源。

本阶段的接口边界为 `transition, hook`。保持前面阶段的行为不变：最终评分器在同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-3
```

## Orchard 示例推演

编码前阅读[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/en.md)。先完成[第 2 阶段](../../02-consolidate/docs/en.md)。

审批针对准确的候选摘要。第二条来源可能改变摘要，需要重新审阅。退役规则后，后续输出上下文不再包含它，但证据仍可检查。

```text
candidate -> inspect approval_digest
approve exact digest -> approved
emit orchard -> original rule + evidence
retire -> next emit omits rule
```

## 构建与检查

同时应用状态和 scope 过滤。不能让 global 候选或高频重复候选绕过明确审批。

在学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替代为参考实现。

```bash
python3 scripts/project_test.py workflow-hooks --stage 3 --path learning-artifacts/workflow-hooks
```

先预测上述中间状态，再运行本阶段。全新起始代码会失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

新证据到达后，用户仍提供昨天的摘要，CLI 应如何处理？
