# 在计划中明确审批不变条件

> update 操作搭配 requiresApproval=false 会失败。仅有 lookup 的计划却设置 requiresApproval=true，同样违反约定的表示规则。允许一至十个操作，每个操作都必须使用受支持的工具和非空查询。

**Type:** Build
**Stage:** 第 2 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

read 分类生成 lookup，write 分类生成 update。执行时再次校验计划，因为计划可能已序列化或被编辑。requiresApproval 必须恰好等于“是否存在 update 操作”。这样可以防止某个布尔值悄悄关闭审批门禁。

```figure
pj-typed-workflow-agent-with-mastra-2
```

## 示例推演

update 操作搭配 requiresApproval=false 会失败。仅有 lookup 的计划却设置 requiresApproval=true，同样违反约定的表示规则。允许一至十个操作，每个操作都必须使用受支持的工具和非空查询。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `makePlan(classification), validatePlan(plan) in main.ts`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

手写运行时的检查点只是本地 JSON，不构成经过认证的授权。可选框架保存实际计划，并把审批绑定到计划摘要和工单 ID。摘要可以检测上下文不匹配，却无法识别批准操作的人。

## 提示

先测试有效计划，再逐次修改一个字段。统计写工具前先检查操作列表。查询保持原样，防止恢复的工作流悄悄执行改写后的请求。

## 验证你的实现

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 2 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

公开审批端点还需要哪些身份和访问控制？为什么仅有计划哈希不够？

完成后的项目生成手写运行时的 HTML／JSON 工作流审阅材料，以及保存在 SQLite 中、带有计划绑定审批文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
