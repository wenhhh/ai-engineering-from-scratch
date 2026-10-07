# MRTR 实现检查清单（MRTR Implementation Checklist）

为客户端或服务器实现多轮往返请求和信息征询的一页参考，对齐 MCP 2026-07-28。

## 服务器侧：以 input_required 结束调用

- 只有 tools/call、prompts/get 和 resources/read 可以用 resultType input_required 结束；其他客户端请求不能收到这种结果。
- 每个 InputRequiredResult 至少包含 inputRequests 或 requestState 之一。
- inputRequests 每个条目包含服务器选择的键，以及 elicitation/create、sampling/createMessage 或 roots/list 中的一种请求对象。
- 当前请求的 clientCapabilities 未声明相应能力时，不能放入该类 inputRequests。工具始终需要 elicitation 而请求缺少能力时，返回 -32021，并在 data.requiredCapabilities 中说明，不能猜测支持情况。
- 不假定客户端一定重试，不为等待答案而持续占用内存或其他资源。

## 保护 requestState

- 即使字节由自己的服务器生成，只要经过客户端，也应将 requestState 按攻击者可控制输入处理。
- 影响授权、资源访问或业务逻辑时，用 HMAC 或 AEAD 保护完整性，验证失败即拒绝。
- 载荷绑定三个要素，并在每次重试检查：已认证主体（不能使用自报 clientInfo）、较短有效期，以及原始请求关键参数的摘要，包括 method、工具名称和参数。
- 需要最多兑换一次时，在服务端执行单次使用检查。签名和有效期本身不能阻止仍有效令牌的重放。
- 即使加密，也不要在 requestState 中直接编码秘密值、凭据或个人数据，应假定中间节点会记录、缓存和复制它。

## 客户端侧：处理重试

- 将 requestState 完全视为不透明值，不解析、检查、解码，也不根据其内容作决策。
- InputRequiredResult 带 inputRequests 时，重试前完成全部所请求输入；未带时，客户端可以立即重试。
- InputRequiredResult 带 requestState 时，重试原样回传同一字符串；未带时，不自行添加。
- 每次重试都用新的 JSON-RPC id，因为它是独立请求，不沿用原始 id。
- inputRequests 与 requestState 只适用于对应原始请求的下一次重试，不能挪用到并行的不相关调用。

## 选择表单或 URL 模式

| 情况 | 模式 | 原因 |
|---|---|---|
| 确认破坏性操作、从短列表选择、填写简单表单 | form | 客户端可按 requestedSchema 校验结构化数据并向用户展示 |
| 收集密码、API 密钥、访问令牌或支付信息 | url | 表单模式禁止携带这些信息，URL 模式使其不经过 MCP 客户端 |
| 为用户执行第三方 OAuth 流程 | url | 服务器作为第三方的独立 OAuth 客户端；客户端访问 MCP 服务器的 bearer 令牌与此无关且保持不变 |

- 表单模式 requestedSchema 仅支持基本属性构成的扁平对象：string、number、integer、boolean，以及单选或多选枚举；不支持嵌套对象或对象数组。
- ElicitResult.action 为 accept、decline 或 cancel。表单模式 accept 携带 content，URL 模式 accept 不带 content。三者都要处理，不能把 decline 或 cancel 视为错误。
- 2026-07-28 的 URL 模式只携带 mode、message 和 url。elicitationId、notifications/elicitation/complete 以及旧错误码 -32042 均已移除。客户端以所得 requestState 重试原始请求时，服务器才得知带外交互结果。

## 常见陷阱

- 重试复用原始 id 是错误的，必须使用新 id。
- 重试修改或省略服务器已经提供的 requestState 是错误的，必须准确回传。
- 规范要求拒绝验证失败的 requestState，但没有规定通道。本实验沿用过期句柄的处理方式，以工具执行错误 isError true 返回，使模型能够重新调用并申请确认；也可以返回新的 input_required 再次询问。
- 若服务器不结束原调用，而沿打开的流主动发送 elicitation/create，就仍在采用 SEP-2322 替代的 2026-07-28 之前模式。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 7、11 节。
