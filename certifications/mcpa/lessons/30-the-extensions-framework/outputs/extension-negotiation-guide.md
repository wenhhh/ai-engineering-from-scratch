# 扩展协商指南（Extension Negotiation Guide）

面向 MCPA“用例与生态”领域的一页参考，对齐 MCP 2026-07-28。

## 标识格式

`{vendor-prefix}/{extension-name}`，前缀必需；类似 `_meta` 键，但不允许省略前缀。

| 发布方 | 前缀 | 示例 |
|-----|--------|---------|
| 官方扩展 | `io.modelcontextprotocol` | `io.modelcontextprotocol/oauth-client-credentials` |
| 第三方扩展 | 作者控制的反向域名 | `com.example/my-extension` |
| 无效 | 没有前缀 | `my-extension`，缺少必需斜杠与前缀 |

## 双方声明位置

| 一方 | 位置 | 结构 |
|------|----------|-------|
| 客户端 | 每次请求的 `params._meta["io.modelcontextprotocol/clientCapabilities"].extensions` | 标识到设置对象的映射 |
| 服务器 | `server/discover` 结果中的 `capabilities.extensions` | 标识到设置对象的映射 |

空设置对象 `{}` 表示支持且无需配置。客户端声明每请求重新提供；2026-07-28 没有 `initialize` 握手或可保存声明的会话。

## 协商决策表

| 客户端声明 | 服务器声明 | 当前调用必须依赖 | 结果 |
|---|---|---|---|
| 有 | 有 | 否，可选 | 启用增强行为 |
| 有 | 有 | 是 | 启用增强行为 |
| 无或标识格式错误 | 有或无 | 否，可选 | 回退核心行为 |
| 无或标识格式错误 | 有或无 | 是 | 返回 `-32021 MissingRequiredClientCapability`，由 `data.requiredCapabilities` 指出缺失项 |
| 有 | 无 | 任意 | 不启用，服务器并未实现 |

缺少必需前缀的标识，即使同时出现在双方映射中也不会生效。格式检查是计算有效集合的一部分。

## 生命周期清单

1. **提案**：按 SEP 指引，在 `modelcontextprotocol/modelcontextprotocol` 提交 Extensions Track SEP。
2. **实现**：在官方 SDK 提供可工作的参考实现，这是核心维护者开始评审的前提。
3. **评审**：Core Maintainer 评审并保有最终接纳权。
4. **发布**：通过拉取请求加入 `modelcontextprotocol` 组织的 `ext-` 仓库，例如 `ext-auth` 或 `ext-apps`。
5. **采用**：其他客户端、服务器和 SDK 可自行决定实现，没有强制要求。

提案之前，工作组或兴趣组可在明确标为非官方的 `experimental-ext-` 仓库孵化，核心维护者可以归档或移除它。

扩展独立于核心及其他扩展版本化。删除或重命名字段、改变字段类型或现有行为、添加必需字段等破坏性变更，须使用新标识，通常加 `-v2`，不能悄悄替换旧契约。

## 固定资料中的官方扩展

| 扩展 | 标识 | SEP | 用途 |
|-----------|-----------|-----|----------|
| Tasks | `io.modelcontextprotocol/tasks` | SEP-2663 | 持久任务句柄，以轮询代替阻塞 |
| MCP Apps | `io.modelcontextprotocol/ui` | SEP-1865 | 工具引用沙箱可渲染界面 |
| Skills over MCP | `io.modelcontextprotocol/skills` | SEP-2640 | 经资源原语发现并读取工作流指令 |
| OAuth Client Credentials | 由 `ext-auth` 发布 | -- | 无需浏览器的机器间认证 |
| Enterprise-Managed Authorization | 由 `ext-auth` 发布 | -- | 企业身份提供方统一管理访问 |

各客户端自行启用支持。设计依赖某项能力前，核对扩展站点的客户端支持矩阵。

## 考试要点

- 扩展标识前缀必填，不能仅当作推荐习惯。
- 客户端在 `_meta` 逐请求声明，服务器通过 `server/discover` 提供支持信息，不依赖一次性握手。
- 可选扩展未共同支持时回退；必需扩展缺失时用 `-32021`，不用 `-32601` 或 `-32602`。
- 破坏性变更需要新标识，兼容性增加无需换名。
- 扩展在两侧默认关闭；核心符合性不要求实现扩展。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 14 节。
