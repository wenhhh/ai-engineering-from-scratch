# 记录带来源的纠正

**第 1 阶段，共 4 阶段。** Typescript。预计约 2 小时。

要求 correction id、session id、scope、rule 和 source 引文齐全。规范化 scope，同时保留规则大小写及来源证据。拒绝超大字段和明显符合凭据模式的内容。该启发式检查不是完整秘密扫描器：调用方必须在导入前对来源数据脱敏。

本阶段的接口边界为 `normalize, ingest`。保持前面阶段的行为不变：最终评分器在同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-1
```

图表限制：控件展示会话支持和规则状态，不执行 ingest 的凭据模式／长度检查、真实摘要审批或持久存储。批准状态来自手动选择，不证明存在人工审批记录。

## Orchard 示例推演

编码前阅读[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和[仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/en.md)。

纠正来自特定会话及来源定位信息，是一条证据。保留规则中 API_KEY 的精确大小写；大小写折叠会把有用指令变成相互矛盾的指令。

```text
rule: Read API_KEY; never rename it to api_key.
scope: Orchard -> orchard
source locator: local:orchard/config.py:12
```

## 构建与检查

规范化 scope 以便匹配；规则只合并空白。明显类似凭据的内容须在进入持久存储前拒绝。

在学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替代为参考实现。

```bash
python3 scripts/project_test.py workflow-hooks --init learning-artifacts/workflow-hooks
python3 scripts/project_test.py workflow-hooks --stage 1 --path learning-artifacts/workflow-hooks
```

先预测上述中间状态，再运行本阶段。全新起始代码会失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

调用方必须在导入前清理来源引文中的哪些内容？
