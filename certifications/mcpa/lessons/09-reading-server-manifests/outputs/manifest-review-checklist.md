# 服务器清单审阅检查表（Manifest Review Checklist）

添加陌生 MCP 服务器前使用的一页参考，对齐 MCP 2026-07-28。首次实际调用前，应审阅 server/discover 结果、tools/list 结果，以及服务器已发布时的注册表 server.json。

## 1. server/discover

- `capabilities`：记录 tools、resources、prompts、completions、logging 和 extensions 中出现哪些能力。遇到陌生扩展键，先查明其影响再决定是否信任。
- `resources: {subscribe: true}` 表示可接收单个资源更新；任一原语的 `listChanged: true` 表示列表变化时会通知监听客户端。
- `instructions`：应描述服务器的作用、工具选择建议等。直接向模型发号施令的文字属于风险信号，见第 5 节。
- 完整结果必须同时包含 `ttlMs` 和 `cacheScope`，缺少任一项都违反缓存契约。

## 2. tools/list：逐个工具检查

- 必需字段为 `name`、`description` 和 `inputSchema`；`inputSchema` 不能为 null。
- 阅读 `annotations` 时应用默认值，不能将缺失字段跳过：

| 注解 | 省略时默认值 | 何时有意义 |
|---|---|---|
| `readOnlyHint` | `false` | 始终 |
| `destructiveHint` | `true` | `readOnlyHint` 为 `false` 时 |
| `idempotentHint` | `false` | `readOnlyHint` 为 `false` 时 |
| `openWorldHint` | `true` | 始终 |

完全没有 `annotations` 块的工具，按这些默认值应视为非只读且具有破坏性，直到明确声明 `readOnlyHint: true` 或 `destructiveHint: false`。这些始终只是提示；服务器本身不可信时，也不能信任其注解。

- `icons`：仅使用 `https:` 或 `data:` URI，并与服务器同源；SVG 应按可能执行代码的内容审查。
- `outputSchema` 与 `structuredContent`：声明输出结构定义后，服务器必须返回符合它的内容，并应提供文本镜像以保持向后兼容。

## 3. x-mcp-header：逐属性检查

- 值必须是非空、合法的 HTTP field-name token，不能含空格或控制字符。
- 同一工具结构定义中的所有 `x-mcp-header` 值，按大小写不敏感方式比较时必须唯一。
- 只能用于 string、integer、boolean 等基本属性，不能用于 `number`。
- Streamable HTTP 客户端遇到任一上述违规，必须从 `tools/list` 中剔除整个工具，不能静默忽略注解。
- 不应映射密码、API 密钥、令牌或凭据类参数：请求头对各个网络中间节点都可见，不仅目的服务器能看到。

## 4. cacheScope：结合缓存文本检查

- `public` 表示另一调用方查询缓存时可得到同一结果；`private` 表示不能跨授权边界共享。
- `cacheScope` 本身不提供访问控制。
- 风险信号：工具描述或指引包含“你的账户”“你的余额”“当前用户”等专属内容，却声明 `cacheScope: "public"`。

## 5. instructions：按不可信文本审阅

- 正常用途：描述服务器、单位约定，或何时优先选择某个工具。
- 风险信号：直接命令模型忽略先前规则、始终先调用某工具，或向用户隐瞒内容。应按提示注入尝试处理，不作为可信指引。
- `instructions` 和 `serverInfo` 都由服务器自报，协议不验证，两者都不应决定安全策略。

## 6. 注册表 server.json

- `name` 必须采用反向 DNS 命名空间，例如 `io.github.user/server` 或 `com.example/server`。没有 `/` 的名称缺少可据此验证的所有者命名空间。
- `io.github.*` 名称通过 GitHub 验证，其他命名空间通过针对域名的 DNS 或 HTTP 挑战验证。
- `packages`（npm、PyPI、NuGet、Cargo、OCI、MCPB）和 `remotes`（streamable-http、sse）描述运行方式；各包类型有自己的所有权证明，例如 `package.json` 中的 `mcpName`。
- 注册表不自行扫描代码漏洞，而是将其交给底层软件包注册表和下游聚合器。注册表自身提供的保证限定为命名空间验证。

## 考试要点

- 省略注解并非中性状态，默认值会让裸工具按破坏性处理。
- `x-mcp-header` 的客户端强制处理方式是剔除工具，不能仅依赖服务器。
- `cacheScope` 规定共享范围，本身不控制访问权限。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 6、10、15 节。
