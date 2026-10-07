# MCP Apps 审阅清单（MCP Apps Review Checklist）

宿主渲染 UI 工具引用内容前的一页参考，对齐 MCP 2026-07-28 和 MCP Apps 2026-01-26 规范。

## 接纳 `ui://` 资源之前

- 当前请求已协商扩展：客户端在 `io.modelcontextprotocol/clientCapabilities.extensions` 声明 `io.modelcontextprotocol/ui`，服务器在 `server/discover` 的 `capabilities.extensions` 声明同一标识。
- 工具定义含 `_meta.ui.resourceUri`，它与其他工具定义字段一样，不随询问方任意变化。
- `_meta.ui.visibility` 缺省为 `["model", "app"]`。去掉 `"model"` 则不进入智能体列表；去掉 `"app"` 则拒绝应用提出的 `tools/call`。跨服务器调用 app-only 工具始终阻止。
- 用普通 `resources/read` 获取 `ui://`，没有专用核心读取方法。
- `mimeType` 精确为 `text/html;profile=mcp-app`。普通 `text/html` 无论是否带 `charset` 都不满足应用类型要求；这是硬性 MIME 检查。
- `_meta.ui.csp` 是含可选数组 `connectDomains`、`resourceDomains`、`frameDomains`、`baseUriDomains` 的对象。宿主 MUST 按声明构造策略，不扩大外部域；可以进一步收紧。完全省略 `csp` 时采用严格默认值，不允许出站连接；省略 `frameDomains` 时 `frame-src` 为 `'none'`；省略 `baseUriDomains` 时 `base-uri` 为 `'self'`。
- `_meta.ui.permissions` 使用空对象标志：`camera`、`microphone`、`geolocation`、`clipboardWrite`。宿主 MAY 通过 iframe `allow` 授予子集，不保证全额授予；拒绝某项权限不应单独阻止整个资源渲染。
- 结果携带 `ttlMs` 和 `cacheScope`，私有读取不得跨授权上下文复用。

## 渲染与桥接

- 应用在宿主控制的沙箱 iframe 内运行，不直接读取宿主 cookies、存储或 DOM，也不能任意导航父页面。
- Web 宿主 MUST 使用不同源的中间沙箱代理，不能直接与视图通信。
- 双向桥接是 `postMessage` 上的 JSON-RPC 方言，独立于客户端—服务器连接；部分方法同名，如 `tools/call`，多数使用 `ui/`，如 `ui/initialize`。
- 该桥接初始化不同于已移除的核心 `initialize`，只建立 iframe 与宿主间通道，不创建核心协议会话。
- 应用调用先通过两道独立门禁：工具 `visibility` 包含 `"app"`，并取得宿主的用户同意。转发时采用新 ID 和完整 `_meta` 的普通 `tools/call`。

## 回退

- 不论是否声明扩展，UI 工具每次 `tools/call` 都应保留有用的 `content` 文本。
- 不支持扩展的宿主不读取 `ui://`，直接使用文本结果。
- 沿用扩展框架原则：没有支持时回退核心，不让普通调用无故失败。

## 决策表

| 检查 | 通过 | 不通过 |
|-------|--------|-------|
| 当前请求已协商扩展 | 继续获取资源 | 使用文本，不读取 UI |
| 工具 `visibility` 包含 `model` 或 `app` 中的当前调用方 | 继续展示或允许请求 | 从智能体列表移除，或拒绝应用调用 |
| `mimeType` 为 `text/html;profile=mcp-app` | 继续构造 CSP | 不按应用渲染，回退文本 |
| 所声明 CSP 域均在宿主策略内 | 按收紧后的策略渲染 | 按宿主策略回退文本，不等于协议格式失败 |
| 请求的 `permissions` | 授予策略允许的子集 | 缺少授权不单独阻止渲染 |
| 应用调用同时满足可见性与同意 | 转发普通 `tools/call` | 不转发，不触及服务器 |

## 考试要点

- `io.modelcontextprotocol/ui` 每请求协商，不按连接声明一次。
- `_meta.ui.csp` 是域列表对象，`_meta.ui.permissions` 是空对象标志集合，都不能误写成扁平数组。
- MIME 不符是硬性条件失败；域超出策略是宿主进一步收紧；拒绝某项设备权限不等于禁止整个应用。
- `visibility` 缺省 `["model", "app"]`，两个名称限制不同访问路径；跨服务器 app-only 调用不允许。
- `ui/initialize` 属于桥接，不是核心 `initialize`；Web 宿主通过不同源沙箱代理访问视图。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 14 节，以及 MCP Apps 规范（2026-01-26）。本课加载计划和 CSP 测试不代替真实浏览器隔离验收。
