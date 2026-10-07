# 运行时校验带类型的步骤输入

> Find the workshop policy 产生 read 意图；Update the workshop label 产生 write 意图。空白 ID 在选择工具前失败。unchanged 中的 change 不满足修改动词的单词边界。

**Type:** Build
**Stage:** 第 1 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

TypeScript 类型不会校验 JSON 文件。要求 ID 和 message 非空，去掉两端空白，拒绝超过 10000 字符的消息。随后用明确列出的修改动词 update、delete、change 和 cancel 建立教学用意图基线。始终说明分类器的能力限制。

```figure
pj-typed-workflow-agent-with-mastra-1
```

## 示例推演

Find the workshop policy 产生 read 意图；Update the workshop label 产生 write 意图。空白 ID 在选择工具前失败。unchanged 中的 change 不满足修改动词的单词边界。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `parseTicket(raw), classify(raw) in main.ts`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

所选工具决定后续是否需要审批。词表不能授权真实操作，也不能可靠识别所有自然语言意图。输出是带类型的分类结果，保留原始已校验工单、意图和主题。

## 提示

用短语表展示误报和漏报。分别测试运行时输入类型与分类行为。Node 会移除 TypeScript 类型注解，不会替你执行静态类型检查。

## 验证你的实现

```bash
python3 scripts/project_test.py typed-workflow-agent-with-mastra --init my-typed-workflow-agent-with-mastra
python3 scripts/project_test.py typed-workflow-agent-with-mastra --stage 1 --path my-typed-workflow-agent-with-mastra --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

哪些校验属于传输边界，哪些决策应由工具能力检查完成？

完成后的项目生成手写运行时的 HTML／JSON 工作流审阅材料，以及保存在 SQLite 中、带有计划绑定审批文档的真实 Mastra 运行。

```bash
cd projects/typed-workflow-agent-with-mastra/solution
node --experimental-strip-types cli.ts --ticket fixtures/ticket.json --out workflow-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://mastra.ai/docs/workflows/suspend-and-resume)。实现、策略选择和示例均为原创。
