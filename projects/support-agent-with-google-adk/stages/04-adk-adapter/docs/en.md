# 在真实 ADK 路径中复用策略

> login 工单选择 read_account 及 access-recovery 指引。夹具专员根据指引回复，最终交接状态保存该回复。在 access 路由下请求 read_invoice，会在运行图之前抛出 PermissionError。可选测试检查模型请求，确保原始邮箱和示例密钥没有越过边界。

**Type:** Build
**Stage:** 第 4 阶段，共 4 阶段
**Time:** 约 2 小时

## 实用边界

导入或调用框架之前，先组合前面课程的实现。清理并路由后的工单获得一种获准的只读能力，以及带来源 ID 的人工指引。含糊工单在任何模型调用前转人工。外部提供的模型路由不能覆盖该门禁。随后 ADK 通过含两个 LlmAgent 实例的真实 Workflow 传递 route 和 response。

```figure
pj-support-agent-with-google-adk-4
```

译注：图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。

## 推演示例

login 工单选择 read_account 及 access-recovery 指引。夹具专员根据指引回复，最终交接状态保存该回复。在 access 路由下请求 read_invoice，会在运行图之前抛出 PermissionError。可选测试检查模型请求，确保原始邮箱和示例密钥没有越过边界。

编码前写下返回字段及预期副作用次数。保留另一个应失败的输入，避免把成功示例硬编码为答案。

## 构建契约

在自己的学习者工作区实现 `prepare_support, support_ticket, export_support in support.py; collect_events, run_adk in adk_adapter.py`。保留导出名称，并继续复用前面阶段，避免重复实现其策略。

默认 ADK 模型是显式注入的确定性夹具。传入 --adk --model YOUR_MODEL 会选择真实 ADK 服务商，需要对应凭据。在线回复也仍是需要审阅的草稿；提示词不是基于来源的证明。本例的能力是读取本地人工编写的知识，不连接账单或账户服务。

起始代码提供 `KNOWLEDGE`：以专员为键、包含三条原创记录的字典。每个值包含稳定来源 ID 和指引文本：`billing-receipts`、`access-recovery` 或 `platform-status`。将其视为输入数据；你围绕它实现校验、授权、组合及导出。

`prepare_support` 返回 `ticket`、`session`、`tool` 和 `evidence`。证据为 `{"source_id": id, "text": guidance}`。不支持或同分的路由返回 escalated 会话，tool/evidence 为 null。显式请求未获准工具时抛出 `PermissionError`。`support_ticket` 增加方法标签，并把所选指引存为确定性基线的会话回复。`export_support` 将结果写入 support.json，并将转义后的审阅页写入 index.html。

`collect_events` 接收包含 `author`、`text` 和可选 `state_delta` 的字典。要求非空作者，跳过空文本，返回包含 `agent`、`text` 及复制后 `state_delta` 的记录。ADK 结果保留预处理字段，并增加 `events`、`state`、`handoff_prompt`、`model_requests` 和 `method`。State 保存 route 和 response。billing 工单的专员提示解析后以 `Use the route billing` 开头。记录本地夹具请求，使测试能检查精确脱敏边界。转人工在导入或运行模型前返回空事件与空请求。

## 提示

一起检查事件、最终会话状态及导出草稿。框架无关测试验证组合逻辑；--optional 运行真实 ADK 2.10.0 测试。缺少 SDK 表示跳过，严格可选评分失败，不能暗示已掌握框架。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 4 --path my-support-agent-with-google-adk --strict
```

只初始化一次。累计测试导入你的工作区，并保留此前源码。运行参考实现只验证教学代码，绝不授予学习者证书。可选 SDK 检查需要项目 README 中规定的依赖和命令。

## 检查结果

确定性基线与 ADK 共用哪些数据？为什么不能允许模型提出的路由静默扩大权限？

完成的项目生成 HTML 审阅页面和 support.json，包含脱敏工单、所选能力、来源指引、回复或转人工结果，以及状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

将夹具替换为工作流中的少量输入。将预期结果和观察证据一起保存，另留一组用例用于评估。服务商请求测试验证序列化和控制流，不验证模型质量。

## 权威参考资料

[官方 API 文档](https://google.github.io/adk-docs/)。实现、策略选择及示例均为原创。
