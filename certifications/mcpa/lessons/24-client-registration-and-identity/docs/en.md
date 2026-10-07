# 向授权服务器证明客户端身份（Proving a Client's Identity to an Authorization Server）

> MCP 客户端与新服务器背后的授权服务器通常没有既有关系。因此，开始授权之前，授权服务器首先要判断客户端是否确实具有它所声称的身份。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 23 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 解释 MCP 的互操作目标为何使客户端与授权服务器通常没有既有关系，以及这如何影响注册设计
- 应用规范规定的四条注册路径优先级：预注册凭据、客户端 ID 元数据文档、动态客户端注册，以及询问用户
- 按授权服务器要求校验客户端 ID 元数据文档：client_id 精确匹配、HTTPS URL 含路径，以及必需元数据字段齐全
- 将持久保存的客户端凭据绑定到签发它们的授权服务器，并解释授权服务器变化为何需要重新注册
- 识别共享静态 client id 的代理带来的混淆代理风险，为无人值守或企业访问场景选择 OAuth 客户端凭据扩展或企业托管授权扩展

## 问题（The Problem）

MCP 的价值建立在一个目标之上：今天编写的客户端，应能使用此前从未见过的服务器；今天编写的服务器，也应能被作者从未听说过的客户端访问。而普通 OAuth 并未直接围绕这种场景设计。OAuth 2.1 通常假定客户端提前向授权服务器注册，获得客户端 id，并在后续请求中复用。某家公司编写自己的移动应用并连接自己的授权服务器时，预先注册很容易；开放 MCP 生态中，任何人构建的客户端都可能需要使用其他人运营的服务器，并经过其运营者选择的授权服务器，预先逐对协调就困难得多。

上一课介绍了角色划分：MCP 服务器是 OAuth 资源服务器，MCP 客户端是 OAuth 客户端，另有授权服务器签发令牌。本课处理更早发生的一步：双方可能从未协调时，客户端怎样首先获得授权服务器认可的 client id？这一步出错，后续授权流程无法开始；伪造身份的攻击者也可能借机冒充客户端；复用错误授权服务器凭据的客户端，还可能把凭据带到不应接收它们的一方。

## 概念（The Concept）

规范规定了唯一的优先顺序，只有前一种不可用时才尝试后一种：首先，使用客户端已为该授权服务器保存的预注册信息；其次，如果授权服务器声明支持，采用客户端 ID 元数据文档；再次，如果授权服务器提供注册端点，回退到动态客户端注册；最后才请用户手动输入客户端信息。

**预注册（Pre-registration）**适合最简单的情况：开发者为已知的特定授权服务器内置 client id，或者用户手工注册后，由服务器运营者通过配置界面提供 client id。双方已经相互了解时，这种方式很有效，企业内部服务器常见如此；MCP 面向的开放生态中则较少具备这种前提。

**客户端 ID 元数据文档（Client ID Metadata Documents，CIMD）**面向双方完全没有既有关系的常见 MCP 场景。CIMD 客户端使用 HTTPS URL 作为 client id，替代授权服务器签发的不透明字符串。这个 URL，例如 `https://app.example.com/oauth/client-metadata.json`，指向客户端自己托管的 JSON 文档：

```json
{
  "client_id": "https://app.example.com/oauth/client-metadata.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "redirect_uris": ["http://127.0.0.1:3000/callback", "http://localhost:3000/callback"],
  "grant_types": ["authorization_code"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

授权服务器在授权请求中看到 URL 形式的 client id 后，会获取该 URL，并将文档作为客户端注册信息。文档至少包含 `client_id`、`client_name` 和 `redirect_uris`。授权服务器必须确认文档内的 `client_id` 与实际获取的 URL 完全一致：只有控制该 HTTPS 路径的一方，才能在该位置放置匹配的文档，因此这种比较将标识绑定到路径控制者。授权服务器还要按文档中的列表验证授权请求使用的重定向 URI，并应遵守普通 HTTP 缓存头缓存文档，避免每次登录都重新获取。支持该路径的授权服务器通过自身元数据声明 `"client_id_metadata_document_supported": true`，客户端开始 CIMD 登录之前正是检查这个字段。

获取客户端提供的 URL 带来两类风险。首先，授权服务器根据攻击者可能影响的输入发起出站 HTTP 请求，因此必须防御服务器端请求伪造：获取前验证 URL 和解析得到的地址，限制响应大小并设置超时。其次，CIMD client id 本身不能阻止 `localhost` 上的冒充：攻击者可以声称使用真实客户端的元数据 URL，并占用相同的回环端口。规范因此要求授权服务器对仅有 localhost 重定向 URI 的客户端给出额外警告，并在同意授权界面始终显示重定向主机名。尽管如此，CIMD id 仍有 DCR id 不具备的优势：可移植性。授权服务器按需解析 URL，同一个 URL 形式的 client id 就能在不同授权服务器之间保持不变。

**动态客户端注册（Dynamic Client Registration，DCR）**是 MCP 在 CIMD 出现之前依赖的机制，如今已标记为弃用，保留它是为了兼容尚未加入 CIMD 支持的授权服务器。客户端走到 DCR 回退路径后，将自己的元数据提交到 `registration_endpoint`，得到该授权服务器专门签发的新 client id。考试仍会关注一个细节：授权服务器在 DCR 之上实现 OpenID Connect 时，可以按 `application_type` 对重定向 URI 实施不同规则。本地应用，包括桌面应用、移动应用、CLI 或通过 `localhost` 访问的本地托管应用，应声明 `application_type: "native"`；远程浏览器应用应声明 `"web"`。OIDC 对省略该字段的情况默认按 `"web"` 处理，这可能使回调到回环端口的 CLI 注册失败。

无论采用哪条路径，持久保存的凭据都属于具体的授权服务器，不能笼统归属于某台 MCP 服务器或某次部署。规范要求按签发者索引已保存凭据，并禁止将某台授权服务器的凭据拿到另一台使用。客户端通过监测 MCP 服务器的受保护资源元数据发现授权服务器变化：元数据若改为指向另一授权服务器，原凭据就属于错误的签发者，需要重新注册，不能悄悄继续尝试。CIMD 的 URL 形式 id 在不同支持方之间具有可移植性，能避开许多此类问题；DCR id 则由各授权服务器分别签发，不具备这种属性。

注册身份还与规范明确指出的**混淆代理问题（Confused deputy）**有关。一个 MCP 代理代表多个动态注册的下游客户端，使用共享静态 client id 与第三方授权服务器交互时，可能被诱导转发并非属于用户实际批准客户端的授权码。缓解措施着重于授权流程：代理在转发每个动态注册下游客户端的请求之前，都必须分别取得用户同意，不能把用户对共享静态 client id 的批准，视为对其背后所有客户端的统一批准。

到这里，各条路径都假定有人能够点击批准。两个官方授权扩展处理不适合这一前提的场景。它们与其他 MCP 扩展一样逐请求协商：客户端在每次请求的 `io.modelcontextprotocol/clientCapabilities.extensions` 中声明支持，服务器在 `server/discover` 返回的能力中发布支持；双方都没有必须实现这些扩展的义务。

```json
{
  "io.modelcontextprotocol/clientCapabilities": {
    "extensions": {
      "io.modelcontextprotocol/oauth-client-credentials": {}
    }
  }
}
```

**OAuth 客户端凭据（OAuth Client Credentials）**适合后台服务、CI 流水线或守护进程：它们需要定时调用 MCP 服务器，却没有用户可进行交互式批准。客户端使用自己的凭据直接向授权服务器认证，可以提交自己签名的 JWT bearer assertion，也可以向令牌端点发送 client secret。规范推荐前者，因为签名私钥不必离开客户端；后者更简单，但属于长期凭据，窃取者可能凭它获得访问能力。**企业托管授权（Enterprise-Managed Authorization）**解决组织集中管理的问题：企业希望由自己的身份提供方统一决定谁能访问什么，而非分别依赖各个 MCP 授权服务器。员工通过企业单点登录会话登录 MCP 客户端，客户端从企业身份提供方换取称为 ID-JAG 的短期令牌，再用它交换 MCP 访问令牌，无须把用户重定向到 MCP 授权服务器自己的登录页面。管理员因此可在身份提供方一次撤销访问，而不必逐一寻找员工曾经授权的每组客户端与服务器。

```figure
mcpa-24-registration-paths
```

## 交互实验（Interactive Lab）

图中从上到下排列四条注册路径，每个方框标明尝试条件，“不可用时”的箭头指向下一条路径。第三项动态客户端注册使用虚线边框，表示已弃用但仍可使用，不应再作为首选。右侧的小检查表列出授权服务器实际如何验证客户端 ID 元数据文档，以及凭据为何按签发者索引。打开代码前先追踪决策：是否已经为该授权服务器保存信息？其元数据是否声明 CIMD？是否提供注册端点？还是只能询问用户？

## 实践实验（Practice Lab）

打开 `code/main.py`。它模拟三种授权服务器：支持 CIMD、只提供 DCR `registration_endpoint`，以及两者都不提供。`choose_registration_path` 按概念部分的顺序判断：对第一种服务器使用空的预注册存储，得到 `cimd`；若存储中已有该签发者的预注册信息，则优先选择预注册，即使 CIMD 也可用。第二种不支持 CIMD，规划器回退到 `dcr` 并标记为弃用路径。第三种两者都没有，结果为 `ask-user`。

```bash
python3 code/main.py
```

`validate_cimd` 模拟授权服务器接收 URL 形式 client id 后的检查：确认 URL 使用 HTTPS 且含实际路径，文档包含 `client_id`、`client_name` 和 `redirect_uris`，文档内 `client_id` 与获取 URL 精确匹配，并检查重定向 URI 是否使用 HTTPS 或回环地址。演示比较四份文档：合法文档无问题；其他三份分别存在 `client_id` 不匹配、使用 `http` 而非 `https`，以及完全缺少 `redirect_uris` 的错误。随后，`CredentialStore` 按签发者保存凭据；用不同签发者调用 `.use()` 会抛出 `ValueError`，指出凭据实际属于谁。`ProxyConsentLedger` 用一组静态 client id 与下游 client id 配对记录，模拟混淆代理防护；为该精确配对调用 `record_consent` 前，`may_forward` 始终为 false。最后，`recommend_auth_extension` 根据场景选择两种授权扩展之一，演示中的 `acme-ops-cli` 已携带客户端凭据令牌，通过请求头标记该令牌，发送 `server/discover` 和 `tools/call` 报文，与 Streamable HTTP 所需的头部结构一致。

## 交付物（Shipped Artifact）

`outputs/client-registration-guide.md` 是一页参考材料：注册优先级、授权服务器检查的 CIMD 要求、`application_type` 规则、授权服务器绑定规则、混淆代理缓解措施，以及两种授权扩展对照表。决定新 MCP 客户端如何注册时，可以据此核查。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：预注册凭据优先于可用 CIMD；CIMD 优先于已弃用 DCR；两者都没有时询问用户；有效 CIMD 文档通过；`client_id` 不匹配、使用 HTTP 以及缺少必需字段分别被拒绝；`application_type` 对回环重定向给出 native，对远程重定向给出 web；某签发者的凭据不能用于其他签发者；代理未经精确配对的同意记录不能转发下游客户端；两种授权扩展与对应场景匹配；已注册客户端的报文含 bearer 令牌和所需 HTTP 请求头。仓库的报文检查器还会按照 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/24-client-registration-and-identity
```

## 与综合实践的联系（Capstone Connection）

综合实践包含授权调用；调用之所以有令牌可用，是因为此前已经走过本课的某条注册路径：预注册 id、获取并验证 CIMD，或如今较少采用的 DCR 往返。无论哪条路径，凭据都应存放在按签发者索引的存储中，就像本课的 `CredentialStore`。下一课从这里继续：客户端证明身份之后，同意授权决定它实际能做什么。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 客户端注册（Client registration） | MCP 客户端申请令牌之前，获得授权服务器认可的 client id 的过程 |
| 客户端 ID 元数据文档（CIMD） | 客户端在其 client_id URL 自行托管的 HTTPS 文档，授权服务器按需获取并校验 |
| 动态客户端注册（DCR） | 已弃用的 RFC 7591 注册端点流程，用于尚不支持 CIMD 的授权服务器 |
| 预注册（Pre-registration） | 提前与授权服务器建立的客户端信息，可内置或由用户录入 |
| 授权服务器绑定（Authorization server binding） | 将持久凭据按签发者索引，禁止向其他授权服务器复用 |
| application_type | DCR 的 native 或 web 参数，告知 OIDC 授权服务器预期的重定向 URI 形态 |
| 混淆代理（Confused deputy） | 代理用一个静态 client id 代表多个下游客户端，却缺少逐客户端同意授权的风险 |
| 授权扩展（Authorization extension） | 经协商启用、改变令牌获取方式的机制，如 OAuth 客户端凭据或企业托管授权 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：客户端注册](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration)
- [MCP 规范 2026-07-28：授权安全注意事项](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations)
- [MCP 授权扩展概览](https://modelcontextprotocol.io/extensions/auth/overview)
- [OAuth 客户端凭据扩展](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials)
- [企业托管授权扩展](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization)
- [SEP-991：使用 OAuth 客户端 ID 元数据文档启用基于 URL 的注册](https://modelcontextprotocol.io/seps/991-enable-url-based-client-registration-using-oauth-c)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 12 节
