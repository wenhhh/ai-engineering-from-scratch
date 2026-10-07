# 自纠正工作流钩子（Self-Correcting Workflow Hooks）

构建纠正台账，说明规则为何存在、改变了什么，以及如何撤销。

纠正来自特定会话及来源定位信息，是一条证据。保留规则中 API_KEY 的精确大小写；大小写折叠会把有用指令变成相互矛盾的指令。

## 从学习者工作区开始

[仓库记忆与状态](../../phases/14-agent-engineering/34-repo-memory-and-state/docs/en.md)、[验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/en.md)。语言基础：[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)。

需要 Node 22.18+，以及用于评分器的 Python 3.10+。核心 TypeScript 无需安装依赖包。

```bash
python3 scripts/project_test.py workflow-hooks --init learning-artifacts/workflow-hooks
python3 scripts/project_test.py workflow-hooks --stage 1 --path learning-artifacts/workflow-hooks
```

## 构建路线

1. [记录带来源的纠正](stages/01-corrections/docs/en.md)
2. [统计独立会话](stages/02-consolidate/docs/en.md)
3. [批准并选择限定范围的规则](stages/03-policy/docs/en.md)
4. [跨会话持久化规则](stages/04-durability/docs/en.md)

## 使用自己的输入运行

完成各阶段后，以下命令用原创 Orchard 示例运行你的工作区代码。将示例路径替换为自己的文件。

```bash
node learning-artifacts/workflow-hooks/cli.ts capture orchard-rules.json projects/workflow-hooks/examples/corrections.jsonl
node learning-artifacts/workflow-hooks/cli.ts inspect orchard-rules.json
```

先检查完整参考实现时，将同一命令中的 `learning-artifacts/workflow-hooks` 替换为 `projects/workflow-hooks/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具读取。

## 集成边界

capture、inspect、approve、retire 和 emit 都是基于文件的命令。emit 返回中立 JSON，包含 additional_context 和可解析的证据；智能体集成必须把该字段映射到其文档规定的 hook 接口。审批必须使用当前摘要。存储带版本、采用原子替换，只支持单写者。

```bash
python3 scripts/project_test.py workflow-hooks --all --solution --strict
python3 scripts/project_test.py workflow-hooks --all --path learning-artifacts/workflow-hooks --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例和测试属于回归证据，不构成生产认证或未见过的基准。

## 权威参考资料

- [Node 文件系统操作](https://nodejs.org/api/fs.html)
- [JSON 数据交换](https://www.rfc-editor.org/rfc/rfc8259)

译注：规则文本、来源引文、API_KEY 大小写、摘要、状态、CLI 子命令和 additional_context 保留原值。测试仅在隔离文件中生成、批准、退役候选，没有安装真实 hook 或改变当前智能体指令。

图表限制：控件展示会话支持和规则状态，不执行 ingest 的凭据模式／长度检查、真实摘要审批或持久存储。批准状态来自手动选择，不证明存在人工审批记录。
