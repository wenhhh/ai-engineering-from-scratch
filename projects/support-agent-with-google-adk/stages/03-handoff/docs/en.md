# 在交接状态中保留实际回复

> 对 invoice 依次执行 begin、classify，再以 Check the invoice reference 执行 respond，得到 answered，并保留 response="Check the invoice reference"。历史记录包含 classify 与 respond。对 invoice login 分类后执行 respond 会失败；有效转换应为 escalate。

**Type:** Build
**Stage:** 第 3 阶段，共 4 阶段
**Time:** 约 2 小时

## 实用边界

将工单建模为 received、routed，再到 answered 或 escalated。分类前回复无效；human 路由不能自动进入 answered。返回新状态并复制历史，使失败操作不会部分修改调用方先前的状态。

```figure
pj-support-agent-with-google-adk-3
```

译注：图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。

## 推演示例

对 invoice 依次执行 begin、classify，再以 Check the invoice reference 执行 respond，得到 answered，并保留 response="Check the invoice reference"。历史记录包含 classify 与 respond。对 invoice login 分类后执行 respond 会失败；有效转换应为 escalate。

编码前写下返回字段及预期副作用次数。保留另一个应失败的输入，避免把成功示例硬编码为答案。

## 构建契约

在自己的学习者工作区实现 `begin(ticket), transition(session, event, payload=None) in handoff.py`。保留导出名称，并继续复用前面阶段，避免重复实现其策略。

Respond 要求非空文本，并将其保存到 response。转人工时保存 escalation_reason。answered 和 escalated 都是终止状态。导出的回复必须来自该状态，使成功执行得到可用草稿，而不仅是转换日志。

`begin` 返回 `ticket_id`、`state="received"`、`route=None` 和空的 `history`。每次成功转换向复制后的历史追加 `{"event": event, "state": next_state}`。分类通过第 2 阶段设置 `route`；Respond 去除两端空白后保存 `response`；转人工保存所给理由，未提供时使用 `Human review required`。无效转换抛出 `ValueError`，不改变输入会话。

## 提示

比较转换前后的原状态，断言其未被改变，返回历史则增加一条。再断言回复正文得到保留，不能只检查 state 等于 answered。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 3 --path my-support-agent-with-google-adk --strict
```

只初始化一次。累计测试导入你的工作区，并保留此前源码。运行参考实现只验证教学代码，绝不授予学习者证书。可选 SDK 检查需要项目 README 中规定的依赖和命令。

## 检查结果

进程重启后恢复状态需要保存什么？保留的答案能证明模型根据已授权证据生成了回复吗？

完成的项目生成 HTML 审阅页面和 support.json，包含脱敏工单、所选能力、来源指引、回复或转人工结果，以及状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

将夹具替换为工作流中的少量输入。将预期结果和观察证据一起保存，另留一组用例用于评估。服务商请求测试验证序列化和控制流，不验证模型质量。

## 权威参考资料

[官方 API 文档](https://google.github.io/adk-docs/)。实现、策略选择及示例均为原创。
