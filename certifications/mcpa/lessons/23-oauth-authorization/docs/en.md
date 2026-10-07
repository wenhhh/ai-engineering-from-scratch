# 为 MCP 服务器访问授权（Authorizing Access to an MCP Server）

> 持有 bearer 令牌并不意味着服务器应信任持有者提出的所有请求。每次请求都要核查令牌，以及它对应的受众和签发者。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 22 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 解释 MCP 服务器为何承担 OAuth 2.1 资源服务器角色，MCP 客户端为何承担 OAuth 客户端角色，以及独立授权服务器如何签发令牌；说明 stdio 服务器为何应跳过这套流程
- 从 401 响应的 WWW-Authenticate 请求头追踪受保护资源元数据发现，并说明缺少相关请求头参数时客户端采用的 well-known 回退顺序
- 分别追踪带路径和不带路径签发者的授权服务器元数据发现，解释返回的 issuer 为何必须与构造请求所用标识一致
- 使用标准库从 code verifier 生成 PKCE S256 code challenge，并解释授权服务器未声明 code_challenge_methods_supported 时客户端为何必须停止
- 应用 RFC 8707 的 resource 参数，将令牌请求绑定到单个规范化服务器 URI，并按同一 URI 验证令牌受众
- 应用 RFC 9207 的四行 iss 校验表防御混淆攻击，区分 MCP 授权响应中的 401、403 和 400

## 问题（The Problem）

此前多数课程默认请求只要结构正确就可以处理：有正确的 `_meta`，工具名称已知，参数有效。一旦 MCP 服务器掌握需要保护的内容，例如客户记录数据库、密钥轮换工具或账单系统，这个假设就不再成立。暴露这些能力的服务器不能放行每个语法正确的 `tools/call`，而必须在执行不可轻易撤销的操作之前，了解谁在请求、依谁的授权，以及要做什么。

MCP 在协议层将授权设为可选。对于本地 stdio 服务器，进程边界和用户提供的环境决定凭据传递方式，规范建议实现不运行 OAuth 流程，而从环境读取凭据。服务器迁移到远程 HTTP 部署后，原有本地边界不复存在，规范因此建议 HTTP 实现遵循本课介绍的授权流程。难点并不主要在加密或传输，它们已有更底层机制负责；难点在于不依赖会话，对每个请求确认：当前令牌面向的恰好是这台服务器，由客户端信任的授权服务器签发，并基于用户实际作出的同意。

## 概念（The Concept）

整条流程包含三个角色，规范对这些术语的使用很精确。MCP 服务器是 **OAuth 2.1 资源服务器（Resource server）**，持有受保护能力，接受或拒绝 bearer 令牌。MCP 客户端是 **OAuth 2.1 客户端（Client）**，代表用户驱动浏览器授权流程，并将令牌附到请求中。**授权服务器（Authorization server）**负责认证用户和签发令牌，通常是完全独立的服务，例如托管身份提供方。模型不承担这些角色：授权发生在模型不可见的传输与授权层。按上一课的信任区域划分，授权服务器位于宿主边界之外，客户端直接与它通信；MCP 服务器可能始终看不到用户原始凭据，只看到授权流程产出的令牌。

流程从一次拒绝开始。客户端不带令牌发送普通 `tools/call`，服务器返回 HTTP `401 Unauthorized`，尚未进入 JSON-RPC 处理层：没有 `result` 或 `error` 协议正文，只有 HTTP 状态和请求头。服务器应附上 `WWW-Authenticate`，指出进一步查找信息的位置：

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp"
```

该 URL 指向 **受保护资源元数据（Protected Resource Metadata）**文档，定义见 RFC 9728；参与本授权机制的 MCP 服务器必须实现它。客户端若在请求头中找到 `resource_metadata`，就获取该 URL。请求头可能因基础设施原因缺失，也可能没有此参数；这时客户端必须依次构造 well-known URI：先尝试路径专用位置，即 `/.well-known/oauth-protected-resource` 加 MCP 端点自己的路径，再尝试根位置 `/.well-known/oauth-protected-resource`。对于 `https://mcp.example.com/mcp`，没有请求头可用时恰好尝试两个地址，路径专用地址优先。返回文档列出该资源背后的一个或多个授权服务器：

```json
{
  "resource": "https://mcp.example.com/mcp",
  "authorization_servers": ["https://auth.example.com/tenant-a"],
  "scopes_supported": ["vault:rotate"]
}
```

确定授权服务器后，客户端继续发现其端点。MCP 复用 RFC 8414 默认的 `oauth-authorization-server` well-known 后缀。签发者标识可能带路径，也可能不带，因此客户端必须尝试不止一种布局。带路径的签发者，例如 `https://auth.example.com/tenant-a`，按以下顺序尝试：先获取 OAuth 元数据，将路径放在 `.well-known` 元数据端点之后；再尝试同样路径布局的 OpenID Connect 发现；最后尝试将签发者路径放在 `.well-known` 之前的 OpenID Connect 发现。不带路径的签发者只需前两种形式，不进行路径插入。无论哪个 URL 返回文档，其中的 `issuer` 都必须与构造该 URL 所用的签发者标识逐字符相同。从 `https://attacker.example/.well-known/oauth-authorization-server` 获取，却声称 `"issuer": "https://honest.example"` 的文档，必须直接拒绝；否则控制某个主机名的攻击者就能冒充完全不同的授权服务器身份。

重定向用户浏览器之前，客户端生成 PKCE 校验值与挑战值。MCP 无条件要求 PKCE，并要求具备相应计算能力的客户端使用 `S256`。OAuth 2.1 和 PKCE 本身都未提供单独查询服务器是否支持 PKCE 的机制，因此 MCP 客户端读取元数据中的 `code_challenge_methods_supported`。该字段缺失时，客户端必须停止，不能继续假定服务器会执行 PKCE 校验。Verifier 是由客户端秘密保存的随机字符串，challenge 则会发送出去：

```python
import base64
import hashlib
import secrets

verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode("ascii")
digest = hashlib.sha256(verifier.encode("ascii")).digest()
challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
```

授权过程还需要关注两个值。`resource` 参数由 RFC 8707 定义，表示客户端计划使用令牌访问的 MCP 服务器规范 URI：方案与主机名使用小写，不含片段标识，除非有实际语义，否则不保留末尾斜杠。它必须同时出现在授权请求和后续令牌请求中，即使授权服务器忽略它也要发送；认真实现的授权服务器可据此将令牌限定于单个资源。`state` 则为每次授权请求新生成，并在返回时校验，用于阻止攻击者用其他授权响应替换客户端实际发起流程所对应的响应。

授权服务器签发授权码并通过重定向返回。客户端信任重定向中的任何内容之前，必须应用 RFC 9207 的 `iss` 校验。否则，攻击者若控制客户端碰巧信任的某台授权服务器，就可能诱使客户端把面向另一个签发者的授权码发送到错误端点，形成混淆攻击。将重定向前记录的签发者，与返回的 `iss` 按以下四条规则比较：

| 服务器声明 `authorization_response_iss_parameter_supported` | 响应中的 `iss` | 客户端操作 |
|---|---|---|
| true | 存在 | 与已记录签发者精确比较 |
| true | 缺失 | 拒绝响应 |
| false 或缺失 | 存在 | 与已记录签发者精确比较 |
| false 或缺失 | 缺失 | 继续 |

只有精确匹配才可继续。比较前不得折叠大小写、省略端口或规范化末尾斜杠。错误响应也受同样规则约束：签发者不匹配时，客户端不得采用或展示 `error`、`error_description` 或 `error_uri`，因为它们来自客户端没有选择的签发者。授权码验证通过后，客户端向令牌端点交换令牌，发送相同的 `resource` 和 PKCE `code_verifier`，让授权服务器将其与先前的 `code_challenge` 对照。成功后返回 bearer 令牌。

使用令牌时，也要遵守本路线一直强调的逐请求原则：凭据放在每个请求的请求头中，不依赖连接开始时的一次声明，就像每个请求通过 `_meta` 携带协议版本与能力。具体来说，每个发往服务器的 HTTP 请求都附上 `Authorization: Bearer <token>`。访问令牌绝不能放进 URI 查询字符串，否则会进入日志、代理记录和浏览器历史。资源服务器拿到令牌后仍必须验证：令牌受众要明确指向本服务器，也就是 `resource` 使用的规范 URI；面向其他服务器的令牌，即使其他方面完全有效，也必须拒绝。若本服务器进一步代表用户调用上游 API，它需要在该链路上作为独立 OAuth 客户端，使用另一枚令牌。禁止直接透传刚收到的客户端令牌，因为这会让上游误判权限来源，绕过上游原本计划授予的权限范围。

三种 HTTP 状态容易在考试中混淆。`401 Unauthorized` 表示令牌缺失或无效，包括过期、无法解析或受众错误；`403 Forbidden` 表示令牌认证有效，但缺少必需权限范围；`400 Bad Request` 则表示授权请求本身格式不正确，在取得令牌之前就已出错。客户端如何最初获得 `client_id`，以及已有令牌后如何申请更多权限范围，都将在后续课程中单独讲解。

```figure
mcpa-23-oauth-flow
```

## 交互实验（Interactive Lab）

图中通过三条通道追踪一次凭据轮换调用。上方通道中，客户端首次请求没有令牌，服务器只返回 HTTP 401 与 `WWW-Authenticate`，没有 JSON-RPC 正文，因为请求尚未进入协议处理层。中间通道中，客户端根据请求头获取受保护资源元数据，再按带路径签发者的顺序获取授权服务器元数据，生成 PKCE 校验值与挑战值；浏览器返回后，将授权码及 `iss` 与重定向前保存的状态核对。下方通道中，客户端再次发送相同 `tools/call`，这次设置 `Authorization: Bearer`。资源服务器验证令牌受众与自身规范 URI 一致后，请求才进入前面课程构建的普通工具处理代码。

## 实践实验（Practice Lab）

打开 `code/main.py`。`simulate_authorization_flow` 完全用 Python 数据模拟元数据发现、PKCE、资源指示符和签发者校验。这部分没有 JSON-RPC：受保护资源元数据用一个 `dict`，授权服务器元数据也用一个 `dict`，OAuth 授权请求与令牌请求则由 `AuthorizationRequest`、`TokenRequest` 数据类表示。另一部分由 `McpServer` 和 `McpClient` 模拟 MCP 交互：一个 `rotate_credential` 工具，由 `ResourceServer` 守卫。该资源服务器保存两枚已签发的示例令牌，一枚受众匹配本服务器规范 URI，另一枚面向完全不同的服务器。在本课目录运行：

```bash
python3 code/main.py
```

先对照概念部分阅读打印出的发现顺序：两个受保护资源元数据 URL，路径专用地址在前、根地址在后；授权服务器元数据则有三个 URL，因为演示中的签发者包含路径。再阅读报文记录。第一项是未认证的 `tools/call`，使用 HTTP 状态和请求头包装，状态为 `401`，没有 `result` 或 `error`，体现 JSON-RPC 层之下的拒绝。接下来的一对消息以有效 bearer 令牌重试：包装请求带有 `Authorization: Bearer tok_valid_abc` 和状态 `200`，随后返回普通 `resultType: "complete"`，请求 id 已更新。将有效调用改为使用 `foreign_token` 对应的令牌后重跑，观察面向 `https://other-server.example.com/mcp` 的令牌，即使格式正确，也会被本服务器的受众检查拒绝。

## 交付物（Shipped Artifact）

`outputs/authorization-flow-checklist.md` 是一页参考材料：受保护资源元数据与授权服务器元数据的发现顺序、PKCE 停止规则、`resource` 参数的规范形式、`iss` 决策表，以及三种状态码的实际含义。首次为远程 MCP 服务器配置授权时，可将它放在手边。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：受保护资源元数据发现优先采用 `WWW-Authenticate` 的 `resource_metadata`，缺失时按路径专用、根地址顺序回退；带路径签发者尝试三个授权元数据 URL，不带路径签发者尝试两个；元数据 `issuer` 不匹配时拒绝；PKCE `S256` 挑战值与独立计算的 `base64url(sha256(verifier))` 一致；缺少 `code_challenge_methods_supported` 时在重定向前停止；`resource` 被规范化并同时放入授权与令牌请求；`iss` 四行决策表覆盖接受和拒绝情形；受众指向其他服务器的令牌即使其余条件有效，仍返回 `401`；令牌从不进入 URL。仓库的报文检查器还会按照 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/23-oauth-authorization
```

## 与综合实践的联系（Capstone Connection）

综合实践包含资源服务器受众校验，并拒绝为其他服务器签发的令牌，直接复用本课的检查。令牌是否可信必须结合其目标受众判断，HTTP 层的拒绝没有 JSON-RPC 正文，令牌实际绑定的是规范资源 URI；这些都是综合实践对应步骤的前提。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 资源服务器（Resource server） | MCP 服务器在 OAuth 2.1 中的角色，负责接受或拒绝 bearer 令牌 |
| 授权服务器（Authorization server） | 认证用户并签发令牌的独立服务 |
| 受保护资源元数据（Protected Resource Metadata） | RFC 9728 文档，列出资源服务器对应的一个或多个授权服务器 |
| PKCE | 校验值与挑战值机制，防止被窃取的授权码在其他地方兑换 |
| S256 | 必需的 PKCE 方法，挑战值为 base64url(sha256(verifier)) |
| 资源指示符（Resource indicator） | RFC 8707 的 resource 参数，将令牌请求绑定到单个规范服务器 URI |
| iss 校验（iss validation） | 按 RFC 9207 将授权响应签发者与重定向前记录的签发者比较 |
| 受众校验（Audience validation） | 资源服务器接受令牌之前，确认它专门为本服务器签发 |
| 令牌透传（Token passthrough） | 直接向上游 API 转发客户端令牌，而不使用独立令牌；此行为被禁止 |
| 401、403、400 的区别 | 分别表示令牌缺失或无效、权限范围不足，以及授权请求格式错误 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：授权（Authorization）](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [MCP 规范 2026-07-28：授权服务器发现](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/authorization-server-discovery)
- [MCP 规范 2026-07-28：授权安全注意事项](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- [MCP 教程：理解授权](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/authorization)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 12 节
- `phases/13-tools-and-protocols/16-mcp-security-oauth-2-1` 与 `phases/13-tools-and-protocols/18-mcp-auth-production`，深入构建 OAuth 流程及其生产环境加固
