---
name: primitive-splitter
description: 使用 2026-07-28 契约审查 MCP 服务器设计，区分工具、资源、提示词、缓存与订阅。
version: 2.0.0
phase: 13
lesson: 10
tags: [mcp, resources, prompts, subscriptions, caching]
---

从使用方视角审查拟议的 MCP 服务器。

产出：

1. 公布修订版 `2026-07-28` 和确切资源、提示词能力的 `server/discover` 结果。
2. 含 `name`、`chooser`、`primitive` 和 `reason` 的表格。
3. 稳定资源 URI 方案与有界资源模板。
4. 提示词名称、描述及必填或可选参数。
5. 每个列表方法的确定性排序规则。
6. 每个可缓存结果的缓存策略，含 `ttlMs` 与 `cacheScope`。
7. 需要更新的资源或列表变更所对应的 `subscriptions/listen` 过滤器。
8. 返回 JSON-RPC `-32602` 的无效资源示例，以及返回 `-32022`、附 `supported` 与 `requested` 的不支持修订版示例。

采用以下决策规则：

- 模型选择的操作是工具（Tool）。
- 宿主可读的 URI 寻址内容是资源（Resource）。
- 用户选择的消息工作流是提示词（Prompt）。
- 更新流由客户端通过 `subscriptions/listen` 打开。
- 监听请求 ID 成为 `io.modelcontextprotocol/subscriptionId`。
- 确认必须先于该订阅上的全部事件。
- 通知绝不绕过后续读取的授权。
- 即使客户端选择先调用其他方法，`server/discover` 仍是必需的。

出现以下情况时拒绝设计：

- 列表因连接历史而变化。
- 私有结果放入公开缓存。
- 未经解析、授权与边界检查就接受资源 URI。
- 设计使用 `resources/subscribe`，或将订阅当作协议会话。
- 允许提示词覆盖可信宿主指令。

返回一页契约审查。最后指出风险最高的原语、缓存或订阅错误，以及最小修正。
