# 副作用前暂停，并统计失败尝试

> lookup 返回结果时，一次调用即可完成。工具连续两次返回空文本，则在两次调用后失败。未经批准的写入返回检查点，调用次数为零；使用 approved=true 恢复该检查点时，执行原始查询。

**Type:** Build
**Stage:** 第 3 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

在共享调用预算与每操作重试上限内执行注入工具。失败调用也消耗预算。未经批准的写入在任何工具调用前返回 suspended，并附上独立复制的计划。空工具输出无法提供可用答案，因此也算失败。

```figure
pj-typed-workflow-agent-with-mastra-3
```

## 示例推演

lookup 返回结果时，一次调用即可完成。工具连续两次返回空文本，则在两次调用后失败。未经批准的写入返回检查点，调用次数为零；使用 approved=true 恢复该检查点时，执行原始查询。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `executePlan(plan, tool, options), runTicket(raw, tool, options) in main.ts`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

手写运行时保存在内存中，工具调用期间不支持崩溃恢复。CLI 工具明确属于本地模拟。真实写入需要幂等键，因为远程系统可能已经应用操作，但响应抵达前发生网络故障。

## 提示

注入一个会记录每次调用的工具，同时断言返回状态和实际调用列表。进入循环前校验预算。区分 suspended 与 failed，使审阅队列恢复工作，而不是把暂停当作错误重试。

## 验证你的实现

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 3 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

为什么失败调用也必须计入预算？什么证据能区分暂停的工作流与写入已完成但响应丢失的情况？

完成后的项目生成手写运行时的 HTML／JSON 工作流审阅材料，以及保存在 SQLite 中、带有计划绑定审批文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
