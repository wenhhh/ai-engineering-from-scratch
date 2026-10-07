# 使用 Mastra 的类型化工作流智能体（Typed Workflow Agent with Mastra）

构建类型化审批工作流，再通过真实 Mastra 步骤暂停和恢复。本地 SQLite 存储让待审计划跨不同运行保留。调用任何更新工具前，审批都须明确工单和计划摘要。

需要 Node 22.18 或更新版本，以及用于评分器的 Python 3。先掌握 TypeScript 对象类型、异步函数和 JSON 运行时校验。必需的手写运行时没有外部依赖。

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-workflow
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 1 --path my-workflow --strict
python3 scripts/project_test.py typed-workflow-agent-with-mastra --all --solution --strict
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

需要审批时，手写 CLI 会写入 index.html、workflow.json 和检查点。工具明确是本地模拟，不会修改任何外部账户。只有完成审阅后，才恢复保存的检查点：

```bash
node --experimental-strip-types cli.ts --checkpoint workflow-output/checkpoint.json --approved --out resumed-output
```

手写运行时能重放已保存计划，却不能恢复中断的副作用。真实写入适配器需要幂等键和经过认证的审批。

## 持久化 Mastra 工作流

在你选定的工作区根目录安装固定版本的可选依赖。从仓库根目录执行：

```bash
npm install --prefix projects/typed-workflow-agent-with-mastra/solution --ignore-scripts --package-lock=false --save-exact @mastra/core@1.71.0 zod@4.3.6 @mastra/libsql@1.23.3
python3 scripts/project_test.py typed-workflow-agent-with-mastra --all --solution --optional --strict
```

将 --prefix 和 --path 指向学习者工作区来测试自己的实现。缺少依赖会产生 SKIP，严格可选评分因此失败。真实 SDK 测试检查行为一致性、有界失败、暂停、否定或不匹配的审批、成功恢复，以及通过新建的 SQLite 支持工作流实例恢复。无需模型凭据。

从 solution 目录启动持久化本地运行：

```bash
node --experimental-strip-types optional-mastra/cli.ts --ticket fixtures/ticket.json --db ./runs.db --out pending-output
```

程序返回 runId，并写入 workflow.json 和 approved=false 的 approval.json。在报告中检查原始查询及计划。要批准这个准确的计划，将 approved 改为 true，同时保持 ticketId 和 planHash，然后启动新进程：

```bash
node --experimental-strip-types optional-mastra/cli.ts --resume RUN_ID_FROM_OUTPUT --approval pending-output/approval.json --db ./runs.db --out resumed-output
```

已保存的执行步骤通过 Mastra 自身的 resume API 恢复。错误工单或摘要在注入工具调用前失败；否定审批则继续暂停。摘要绑定上下文，不证明审阅者身份；公开端点需要围绕此操作增加身份认证和授权。

默认 createTicketWorkflow 工厂使用内存存储；persistentWorkflow 使用明确的本地 file: 数据库 URL。两者共用领域校验和调用预算。文件持久化不能证明外部系统的副作用恰好执行一次。

1. [校验带类型的输入](stages/01-contracts/docs/en.md)
2. [将审批纳入计划](stages/02-plan/docs/en.md)
3. [暂停并统计尝试次数](stages/03-runtime/docs/en.md)
4. [通过 Mastra 持久化与恢复](stages/04-framework-boundary/docs/en.md)

[官方暂停／恢复文档](https://mastra.ai/docs/workflows/suspend-and-resume)。工作流策略、代码、示例与夹具均为原创。

译注：分类词表、工具查询、模拟响应、状态、错误及计划摘要契约保留原值，中文页面不代表支持中文意图识别。手写检查点可由本地 CLI 重放，但不具有真实 SDK 的持久审批或身份认证能力；可选 Mastra 运行须单独安装依赖并验证。
