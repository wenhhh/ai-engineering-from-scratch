# 持久化真实 Mastra 审批状态并恢复

> 启动原创工坊更新示例，观察 status=suspended 且工具调用为零。关闭本地 LibSQL 存储，使用同一 SQLite 文件创建新的工作流，再按 runId 恢复。在恢复测试中，匹配的审批产生 success，并恰好观察到一次本地工具调用；错误摘要在零次调用时失败。

**Type:** Build
**Stage:** 第 4 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

使用 Zod 契约组合三个真实 Mastra 步骤：classify、plan 和 execute。更新缺少审批时，执行步骤调用 Mastra suspend，携带 ticketId、planHash、plan 和 reason。恢复时，先根据已保存计划校验 approved、ticketId 和 planHash，再调用共用的手写执行器。

```figure
pj-typed-workflow-agent-with-mastra-4
```

## 示例推演

启动原创工坊更新示例，观察 status=suspended 且工具调用为零。关闭本地 LibSQL 存储，使用同一 SQLite 文件创建新的工作流，再按 runId 恢复。在恢复测试中，匹配的审批产生 success，并恰好观察到一次本地工具调用；错误摘要在零次调用时失败。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `createTicketWorkflow, planHash, persistentWorkflow in optional-mastra/adapter.ts`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

默认工厂使用 InMemoryStore 进行轻量测试。persistentWorkflow 要求明确的 file: URL，以及 @mastra/libsql 1.23.3、@mastra/core 1.71.0 和 Zod 4.3.6。CLI 写入的 approval.json 默认 approved=false。检查已保存计划，明确编辑审批，再运行独立的恢复命令。否定审批继续保持暂停。

## 提示

通过 project_test.py --optional --strict 运行教学方维护的可选测试。适配器调用真实 SDK 的暂停与恢复；不要仅因手写策略会暂停就抛出异常。使用返回的运行 ID，不能提交新输入来冒充恢复。

## 验证你的实现

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 4 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

哪些状态可跨进程重启保留，哪些外部副作用仍需要幂等机制？如何连接经过认证的审阅界面，同时避免相信模型对自己计划的审批？

完成后的项目生成手写运行时的 HTML／JSON 工作流审阅材料，以及保存在 SQLite 中、带有计划绑定审批文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
