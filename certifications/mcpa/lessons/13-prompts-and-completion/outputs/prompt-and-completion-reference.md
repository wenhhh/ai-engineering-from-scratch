# 提示词与补全速查（Prompt and Completion Reference）

面向 MCPA“交互与执行”领域的一页参考，对齐 MCP 2026-07-28。

## prompts/list

- 可缓存且支持分页：`resultType: "complete"` 结果携带 `ttlMs`（大于等于 0 的整数）和 `cacheScope`（`public` 或 `private`）。
- 请求可带不透明 `cursor`，结果仅在还有下一页时包含 `nextCursor`。
- 不得随连接变化，可依据当前请求授权区分可见范围。
- 无法识别的游标返回 `-32602`，不能静默回到第一页。

## prompts/get

- 请求：`name` 和字符串值构成的 `arguments` 映射。
- 不属于六种可缓存操作，结果没有 `ttlMs` 或 `cacheScope`。
- 可以通过 `InputRequiredResult` 索取更多输入，使用多轮往返请求而不立即返回最终结果。
- 结果包含 `description` 和 `messages`，每条消息有 `role`（`user` 或 `assistant`）及一个内容块。

## PromptMessage 内容类型

| 类型 | 携带字段 | 典型用途 |
|------|---------|-------------|
| `text` | `text` | 已经代入参数的模板指引 |
| `image` | base64 `data`、`mimeType` | 内联图像上下文 |
| `audio` | base64 `data`、`mimeType` | 内联音频上下文 |
| `resource_link` | `uri`、`name`、可选 `description`、`mimeType` | 指向资源，不内联字节 |
| `resource`（嵌入） | `uri`、`mimeType`、`text` 或 `blob` | 直接发送较小的资源内容 |

## 错误

| 情况 | 代码 |
|-----------|------|
| 未知提示词名称 | `-32602` |
| 缺少必需参数 | `-32602` |
| 无法识别的分页游标 | `-32602` |
| 服务器内部失败 | `-32603` |

提示词没有工具式 `isError` 通道：渲染模板不执行动作，因此名称错误或缺少参数属于协议错误，不能作为部分结果交给模型修补。

## completion/complete

- 请求：`ref`（按名称的 `ref/prompt`，或按 URI、URI 模板的 `ref/resource`）、`argument`（`name`、`value`），以及可选 `context.arguments`，记录已经确定的参数名和值。
- 结果：排序后的 `completion.values`，最多 100 项；另有可选 `total` 和 `hasMore`。
- 实际匹配超过 100 时，`hasMore` 为 `true`，不取决于客户端此前如何到达该状态。
- 不提供上述缓存机制，结果没有 `ttlMs` 或 `cacheScope`。
- 服务器须在 `server/discover` 中声明 `completions: {}` 能力。

## 引用类型

| 类型 | 示例 |
|------|---------|
| `ref/prompt` | `{"type": "ref/prompt", "name": "code_review"}` |
| `ref/resource` | `{"type": "ref/resource", "uri": "file:///src/{path}"}` |

## 考试要点

- 提示词由用户控制，工具由模型控制，资源由应用驱动。
- `prompts/list` 可缓存，`prompts/get` 和 `completion/complete` 不属于该缓存机制。
- 未知提示词、缺少必需参数和无效游标都返回 `-32602`。
- `context.arguments` 使用用户已经提供的答案缩小补全范围，不生成新的回答。
- 100 个候选上限和 `hasMore` 与分页游标相互独立，补全不使用游标。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`。
