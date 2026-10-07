# 创建会话前先校验

> 输入 invoice for sam@example.invalid api_key=EXAMPLE_TOKEN 时，可用工单文本变为 invoice for [email] api_key=[redacted]。空字符串在路由前失败。基线与 ADK 路径必须接收同一份清理后的文本。

**Type:** Build
**Stage:** 第 1 阶段，共 4 阶段
**Time:** 约 2 小时

## 实用边界

支持请求属于外部输入。创建会话前，要求非空 ID 和长度为 1 至 10,000 字符的文本。将规定模式的邮箱替换为 [email]，API 密钥值替换为 [redacted]。保留工单 ID，使后续事件可以引用它，而无需保留原始联系信息。

```figure
pj-support-agent-with-google-adk-1
```

译注：图表范围：JavaScript 字符长度采用 UTF-16，词边界为 ASCII；Python 的长度和词元采用 Unicode 字符语义。四图为本地模型，显示两次调用不代表实际执行 ADK 或验证脱敏完整性。

## 推演示例

输入 invoice for sam@example.invalid api_key=EXAMPLE_TOKEN 时，可用工单文本变为 invoice for [email] api_key=[redacted]。空字符串在路由前失败。基线与 ADK 路径必须接收同一份清理后的文本。

编码前写下返回字段及预期副作用次数。保留另一个应失败的输入，避免把成功示例硬编码为答案。

## 构建契约

在自己的学习者工作区实现 `ticket(raw) in intake.py`。保留导出名称，并继续复用前面阶段，避免重复实现其策略。

正则仅覆盖已说明的模式，不证明已移除任意个人数据、密码或全部凭据格式。不要让原始文本进入模型请求和导出报告，并在最终集成边界测试已知模式。

## 提示

从原始输入追踪值如何进入返回字典。将邮箱和密钥放在同一输入中测试，不能只分开检查。报告校验错误时不要记录原始输入。

## 验证你的实现

```bash
python3 scripts/project_test.py support-agent-with-google-adk --init my-support-agent-with-google-adk
python3 scripts/project_test.py support-agent-with-google-adk --stage 1 --path my-support-agent-with-google-adk --strict
```

只初始化一次。累计测试导入你的工作区，并保留此前源码。运行参考实现只验证教学代码，绝不授予学习者证书。可选 SDK 检查需要项目 README 中规定的依赖和命令。

## 检查结果

这两次替换后，真实工单中还有哪些敏感内容？生产数据最小化策略应放在哪一层？

完成的项目生成 HTML 审阅页面和 support.json，包含脱敏工单、所选能力、来源指引、回复或转人工结果，以及状态历史。

```bash
cd projects/support-agent-with-google-adk/solution
python3 main.py --ticket fixtures/ticket.json --out support-output
```

将夹具替换为工作流中的少量输入。将预期结果和观察证据一起保存，另留一组用例用于评估。服务商请求测试验证序列化和控制流，不验证模型质量。

## 权威参考资料

[官方 API 文档](https://google.github.io/adk-docs/)。实现、策略选择及示例均为原创。
