---
name: mcp-apps-spec
description: 在无状态 2026-07-28 协议上设计与审查 MCP App 契约。
version: 2.0.0
phase: 13
lesson: 14
tags: [mcp, apps, stateless, ui-resources, csp, sandbox]
---

给定一个可能需要交互视图的 MCP 工具，生成与框架无关的契约。

## 必需输入（Required inputs）

- 工具名称、参数、普通文本结果和结构化结果。
- 视图必须支持的用户交互。
- 数据敏感性，以及响应是否随授权上下文变化。
- 视图需要的浏览器权限与外部来源。
- 不支持 Apps 的宿主使用的纯文本行为。

## 生成内容（Produce）

1. 当前核心信封。展示 `2026-07-28`、逐请求的 `protocolVersion`、`clientCapabilities`、建议提供的 `clientInfo`、匹配的 `Mcp-Method` 和 `Mcp-Name` 请求头，以及 `resultType` 响应。
2. 发现条目。在 `server/discover` 中声明 `io.modelcontextprotocol/ui`，使用保守的 `ttlMs` 和 `cacheScope`。
3. 工具声明。将嵌套的 `_meta.ui.resourceUri` 放在 `tools/list` 返回的工具上。不要等到 `tools/call` 才公开 UI。
4. 资源契约。在 `resources/read` 之前提供确定性的 `resources/list` 元数据。给出一个规范的 `ui://` URI、稳定名称和描述、`text/html;profile=mcp-app`、缓存提示、CSP 域列表（`connectDomains`、`resourceDomains`、`frameDomains`、`baseUriDomains`）及最小权限对象。
5. 结果契约。无论宿主是否渲染 App，都返回有用的文本和结构化数据。
6. 桥接契约。列出每个 Apps `ui/*` 方法或代理方法、精确消息来源、参数模式、结果模式及宿主端同意检查。
7. 回退。描述客户端省略 Apps 扩展能力时的工具与结果。
8. 验证表。覆盖路由前请求头不匹配的 HTTP 400 `-32020`、包含精确支持版本和请求版本数据的 HTTP 400 `-32022`、带 `data.requiredCapabilities` 的 HTTP 400 `-32021`、HTTP 404 `-32601`、202 空正文通知、CSP 违规、不可信内容、未经授权的桥接调用及文本回退。
9. 传输边界。如果实现接收已解析的请求和请求头，应将其标为进程内协议模型，并连接到第 09 课的完整 Streamable HTTP 适配器。真正的适配器必须要求 JSON Content-Type，且 Accept 值同时包含 JSON 和 SSE。

## 必须拒绝（Hard rejects）

- 将核心 `initialize`、`notifications/initialized` 或 `Mcp-Session-Id` 路径呈现为当前 MCP。
- `postMessage` 目标来源使用通配符，或接收端跳过 `event.origin` 验证。
- 仅在工具运行后才公开 UI 绑定。
- CSP 域列表使用通配符、网络来源不受限，或权限没有对应可见功能。
- 插入用户控制的 HTML，却未定义净化边界。
- 会产生实际后果的 UI 操作，将 iframe 点击当作宿主授权。
- 服务器声明资源却省略 `resources/list`。
- 为没有 `id` 的通知生成任何 JSON-RPC 响应正文。

## 兼容边界（Compatibility boundary）

可以读取旧式扁平 UI 元数据作为回退，但新输出使用嵌套的 `_meta.ui.resourceUri`。只有明确标识为 Apps postMessage 握手时，才允许使用 `ui/initialize`。它绝不代替已移除的 MCP 核心初始化。

## 输出格式（Output format）

返回紧凑的设计，使用以下标题：核心线上协议（Core Wire）、发现（Discovery）、工具（Tool）、资源（Resource）、结果（Result）、桥接（Bridge）、安全（Security）、回退（Fallback）、验证（Verification）。最后指出风险最高的一项来源、权限或同意假设。
