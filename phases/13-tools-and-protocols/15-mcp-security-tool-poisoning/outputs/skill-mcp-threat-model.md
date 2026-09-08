---
name: mcp-threat-model
description: 跨元数据、路由、授权、MRTR 和兼容边界，为 MCP 2026-07-28 部署建立威胁模型。
version: 2.0.0
phase: 13
lesson: 15
tags: [mcp, security, stateless, tool-poisoning, mrtr]
---

给定 MCP 部署，生成基于证据的威胁模型。假定任何服务器、软件包、缓存、注册表条目或网关路由都可能被攻陷。

## 必需输入（Required inputs）

- 客户端、网关、服务器、授权服务器和注册表的信任边界。
- 完整的规范化工具描述符及已批准摘要。
- 认证主体、签发者、受众、作用域及工具策略。
- 接受的当前与旧版协议修订。
- MRTR 操作、输入模式、状态保护及重放策略。
- 缓存作用域、TTL、订阅路由及审计保留期限。

## 生成内容（Produce）

1. 线上验证。验证逐请求版本和能力，然后在检查版本支持之前验证路由请求头相等。要求不匹配时返回 HTTP 400 `-32020`；匹配但不支持的版本返回 HTTP 400 `-32022`，并附精确的支持版本与请求版本数据；未知方法返回 HTTP 404 `-32601`；接受的通知返回 202 和空正文。
2. 描述符审查。报告投毒迹象、完整描述符摘要变化、未知工具以及模式或注解变化。
3. 命名空间映射。为每个后端工具给出一个限定的公开名称，并拒绝静默解决冲突。
4. 授权矩阵。将已认证主体和签发者映射到资源、工具、参数约束及作用域。不要把 `clientInfo` 或 `serverInfo` 当作身份。
5. MRTR 审查。确认每个 `inputRequests` 条目都是客户端已声明能力支持的完整嵌入请求。将 `elicitation: {}` 视为隐式表单支持，将 `elicitation: {form: {}}` 视为显式表单支持。对仅 URL 的征询能力，返回 HTTP 400 `-32021` 和 `data.requiredCapabilities.elicitation.form`。将受保护的 `requestState` 绑定到方法、工具、精确参数、主体、用途、到期时间和随机数。按键匹配并验证每个 `inputResponses` 条目，再在所有处理器实例共享的、有界且按 TTL 清理的重放存储中原子消耗随机数。
6. 风险维度审查。标记任何同时结合不可信输入、敏感数据和实际后果操作的自动步骤。
7. 缓存与订阅审查。确保依赖用户的结果为私有，且长连接通知使用 `subscriptions/listen`。
8. 兼容边界。用显式版本门控隔离任何旧握手、会话、GET 流、服务器回调或实验性任务行为。
9. 传输边界。标识实现是完整 HTTP 适配器还是进程内协议模型。将模型连接到第 09 课，以验证 JSON Content-Type 和同时包含 JSON、SSE 的 Accept。
10. 修复顺序。给出收益最高的三项修复，注明负责人和验收证据。

## 必须拒绝（Hard rejects）

- 静默覆盖工具，或按发现顺序选择路由。
- 未经人工或策略重新批准就更新描述符摘要。
- 将自行报告的客户端或服务器信息视为认证。
- 将声明的能力视为权限。
- 对会产生实际后果的操作，信任明文或未签名的 `requestState`。
- 将唯一的重放账本放在单个网关或服务器实例内。
- 仅以 `Mcp-Session-Id` 为键管理速率限制或批准状态。
- 将已弃用的 Sampling、Roots、Logging 或旧版 HTTP 加 SSE 呈现为新的实现路径。

## 输出格式（Output format）

返回以下章节：信任边界（Trust Boundaries）、线上发现（Wire Findings）、描述符发现（Descriptor Findings）、路由映射（Route Map）、授权矩阵（Authorization Matrix）、MRTR 发现（MRTR Findings）、兼容性发现（Compatibility Findings）及修复（Remediation）。区分已确认证据和假设。最后指出当前跨越边界最多的一条攻击路径。
