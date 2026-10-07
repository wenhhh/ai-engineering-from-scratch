# 将路由与授权分开决策

> invoice refund 选择 billing，可使用 read_invoice；invoice login 使 billing 与 access 同分，因此转人工。billing 路由请求 read_account 时被拒绝，即使另一专员可以使用该工具。

**Type:** Build
**Stage:** 第 2 阶段，共 4 阶段
**Time:** 约 2 小时

## 实用边界

分别统计 billing、access 和 platform 领域的不同关键词。只有某一领域独占最高且大于零的分数时才选择路由；未知主题和同分交给人工审阅。然后根据只读能力允许列表检查所选专员。领域标签不能授予全部工具权限。

```figure
pj-support-agent-with-google-adk-2
```

译注：图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。

## 推演示例

invoice refund 选择 billing，可使用 read_invoice；invoice login 使 billing 与 access 同分，因此转人工。billing 路由请求 read_account 时被拒绝，即使另一专员可以使用该工具。

编码前写下返回字段及预期副作用次数。保留另一个应失败的输入，避免把成功示例硬编码为答案。

## 构建契约

在自己的学习者工作区实现 `route(text), authorize(specialist, tool) in routing.py`。保留导出名称，并继续复用前面阶段，避免重复实现其策略。

路由器是可检查的关键词基线，不是语义模型。能力校验具有确定性，并独立于分类置信度。组合流程在选择支持证据或构建智能体图之前执行该校验。

起始代码提供以下原创策略输入。将它们与评分算法分离，使后续修改策略无需重写分类器。

| 专员（Specialist） | 不重复的小写词（Distinct lowercase words） | 允许的能力（Allowed capability） |
| --- | --- | --- |
| billing | invoice, refund, payment | read_invoice |
| access | password, login, account | read_account |
| platform | outage, latency, error | read_status |

`route` 返回一位专员名称或 `human`。`authorize` 返回布尔值；未知专员或能力返回 false。比较完整词元，因此 `payment` 命中，而 `repayment` 不命中。

## 提示

使用词集合，避免将 invoice 重复二十次抬高分数。测试未知工具名以及 human 专员。明确保留同分状态，不按字母顺序强选。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 2 --path my-support-agent-with-google-adk --strict
```

只初始化一次。累计测试导入你的工作区，并保留此前源码。运行参考实现只验证教学代码，绝不授予学习者证书。可选 SDK 检查需要项目 README 中规定的依赖和命令。

## 检查结果

即使使用模型标注请求，为什么仍需要授权函数？新增写能力之前，你需要什么证据？

完成的项目生成 HTML 审阅页面和 support.json，包含脱敏工单、所选能力、来源指引、回复或转人工结果，以及状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

将夹具替换为工作流中的少量输入。将预期结果和观察证据一起保存，另留一组用例用于评估。服务商请求测试验证序列化和控制流，不验证模型质量。

## 权威参考资料

[官方 API 文档](https://google.github.io/adk-docs/)。实现、策略选择及示例均为原创。
