# 多轮往返请求与信息征询（Multi Round-Trip Requests and Elicitation）

> 服务器在调用中途需要用户确认时，可以结束当前调用，把后续所需状态交给客户端，再由全新的请求接续，无须一直维持原请求等待。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 13 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 解释多轮往返请求（Multi Round-Trip Requests，MRTR）为何替代服务器主动发起的信息征询、采样和 roots 请求，以及这种取舍给水平扩展带来的价值
- 将 InputRequiredResult 与重试作为普通 JSON-RPC 消息阅读，理解 inputRequests、inputResponses 和必须准确回传的 requestState
- 区分表单模式与 URL 模式信息征询，知道敏感数据必须使用哪种模式
- 使用标准库 hmac 和 hashlib 保护 requestState，使它经过不可信客户端传递后仍可验证，不能被伪造为授权凭据
- 区分被篡改、过期、绑定不匹配与正常 requestState，解释服务器为何必须拒绝前三者

## 问题（The Problem）

部署工具即将替换某个服务正在运行的版本，执行前需要用户确认。过去，正确实现这一看似简单的要求并不容易。

旧模式要求服务器维持原始请求及其响应流，同时沿相同连接发送独立的服务器请求，例如 `elicitation/create`。客户端回答后，服务器必须将答案关联回仍在等待的原调用。单个进程面对单个客户端时很简单，因为两端都由同一进程持有；服务器扩展为多进程后，问题就出现了。负载均衡器如果把确认回复交给另一个副本，服务器需要共享存储或将客户端固定到某实例的粘性路由，才能把一次交互的两部分重新关联。两种办法都有成本：共享存储带来新的依赖、可用性和清理问题，粘性路由则破坏无状态副本群所需的均匀负载分布。

这一代价尤其影响常见场景。多数工具的中间工作是短暂的：从询问“是否确定”到听到“是”之间，部署工具自身逻辑往往无须持续占用进程。前面课程的无状态核心已经要求服务器不依赖连接记住跨请求信息，但服务器主动请求在调用中途等待回答时，重新引入了这种依赖：答案最容易安全、快速地回到那个仍在阻塞等待的进程。

## 概念（The Concept）

多轮往返请求通过 SEP-2322 移除服务器主动发起请求的方式。服务器不再从一个尚未结束的调用内部提问，而是在需要更多信息时，以特殊结果提前结束调用；客户端取得所需信息后，再发起完全独立的新请求。流程分四步：客户端发送请求；服务器判断还需输入，以 `resultType: "input_required"` 结束请求；客户端收集缺失信息；客户端以新 id 重试原始请求，并携带答案。第四步无须依赖前面由哪个服务器副本处理，任意副本都能接手，因为处理所需信息随请求一起传递。

`InputRequiredResult` 有两个可选字段，每个此类响应至少包含其中一个。`inputRequests` 将服务器选择的字符串键映射到请求对象，请求方法只能为 `elicitation/create`、`sampling/createMessage` 或 `roots/list`。客户端未在当前请求声明相应能力时，服务器不能将该方法放入映射。如果工具始终需要确认，而调用方未声明 `elicitation`，正确响应是协议错误 `-32021 MissingRequiredClientCapability`，在 `data.requiredCapabilities` 中指出缺失能力，与能力协商课程一致。只有三个客户端方法可收到 `input_required` 结果：`tools/call`、`prompts/get` 和 `resources/read`。其他请求正常完成时使用 `complete`。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "confirm": {
        "method": "elicitation/create",
        "params": {
          "mode": "form",
          "message": "Deploy checkout to production? This replaces the running release.",
          "requestedSchema": {
            "type": "object",
            "properties": {"confirmed": {"type": "boolean", "title": "Confirm deploy"}},
            "required": ["confirmed"]
          }
        }
      }
    },
    "requestState": "eyJwcmluY2lwYWwiOiJ1c2VyLWFsaWNlIn0.9f2c...redacted"
  }
}
```

`requestState` 让无状态服务器无须保留中间记忆，也能接续交互。它是不透明字符串，只对生成它的服务器有意义。客户端不能检查、解析或改变其中任意字节；重试时，要么原样回传，要么在服务器从未提供该字段时完全省略。因为字符串会经过服务器不完全信任的客户端，只要它影响授权、资源访问或业务逻辑，就必须按攻击者可控制输入处理，并提供 HMAC 或 AEAD 加密等完整性保护，验证失败即拒绝。良好实践会在受保护载荷中绑定三个信息，并在每次重试检查：已认证主体，防止一位用户的确认令牌被另一位重放；较短有效期，防止旧令牌数日后再次出现；原始请求关键参数的摘要，防止给某次调用生成的令牌，被改用到同名工具但不同参数的调用。这三项本身不保证单次使用；需要令牌最多兑换一次的服务器，还必须在服务端跟踪是否已经使用。

重试是具有新 JSON-RPC id 的新请求，不能沿用收到 `input_required` 的那次 id。两次请求彼此独立，只是共享相同 `name` 和 `arguments`。重试增加 `params.inputResponses`，使用服务器在 `inputRequests` 中给出的相同键，值则为对应结果类型：`ElicitResult`、`CreateMessageResult` 或 `ListRootsResult`。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "deploy_release",
    "arguments": {"service": "checkout", "environment": "production"},
    "inputResponses": {"confirm": {"action": "accept", "content": {"confirmed": true}}},
    "requestState": "eyJwcmluY2lwYWwiOiJ1c2VyLWFsaWNlIn0.9f2c...redacted"
  }
}
```

信息征询有两种模式。表单模式让客户端依据 `requestedSchema` 收集结构化数据，限于扁平对象中的基本属性：字符串、数字、布尔值，以及单选或多选枚举，不支持嵌套。URL 模式将用户引导到由外部流程处理、客户端不自行渲染或检查其内容的页面，例如第三方 OAuth 或付款表单。密码、API 密钥、令牌和支付信息必须使用 URL 模式，不能通过表单模式收集。每个 `ElicitResult` 报告三种 action 之一：`accept`（表单模式附带 `content`）、`decline` 或 `cancel`。2026-07-28 之前，URL 信息征询还包含独立 `elicitationId`，服务器可在带外交互完成后发送 `notifications/elicitation/complete`，并用错误码 `-32042` 表示需要 URL 信息征询。这三种机制均已移除；MRTR 原本就有的 requestState 重试足以让服务器获知结果，无须额外机制。

```figure
mcpa-14-mrtr
```

## 交互实验（Interactive Lab）

图中以两条泳道表示客户端和服务器，跟踪一次部署经历的两次往返。第一条箭头是普通 `tools/call`，服务器以 `input_required` 结束该请求而不阻塞；中间注释表示客户端收集用户回答的空档；第二条请求箭头是全新的独立 `tools/call`，携带 `inputResponses` 和第一次响应中的原始 `requestState`；最后返回普通 `complete`。跨越空档的只有客户端传回的数据，不需要服务器保存等待中的原始请求。

## 实践实验（Practice Lab）

打开 `code/main.py`。`DeployServer` 提供 `deploy_release`，每次执行前都使用表单模式要求确认，并以标准库 `hmac` 和 `hashlib` 构建 HMAC 保护的 `requestState`。`mint_request_state` 对包含主体、以实验抽象时钟刻度计量的有效期，以及 `digest_request` 的载荷签名；后者是工具名称和参数的 SHA-256 摘要。`verify_request_state` 使用 `hmac.compare_digest` 验证重新计算的签名，再依次检查主体、有效期、请求摘要，最后确认令牌的 nonce 尚未使用。

```bash
python3 code/main.py
```

运行后观察以下结果。未声明 `elicitation` 的访客客户端立刻被 `-32021` 拒绝，服务器不会生成它无法处理的 `inputRequests`。Alice 确认一次部署后，重试完成，`structuredContent.deployed` 为 true；Alice 拒绝另一次部署时，重试仍正常完成，`isError` false，因为拒绝是正常结果，没有任何部署发生。随后是四个故意构造的反例，都以 `violation` 包装，避免报文检查器将教学中的损坏输入误判为课程实现错误：签名有一个字符被改动的 `requestState`、超过短有效期才到达的重试、Mallory 重放为 Alice 生成的状态，以及保留 Alice 合法状态却修改目标环境的重试。四者均返回 `isError: true` 的工具执行错误和自然语言原因，与本路线其他课程处理过期句柄的通道相同。规范要求拒绝验证失败的状态，但未指定错误通道；本实验选择工具执行错误，以便模型重新开始恢复，服务器也可以返回新的 `input_required` 再次询问。模型不能修好伪造签名，但可以干净地重新调用，取得新的确认机会，不必卡在无法理解的失败中。

## 交付物（Shipped Artifact）

`outputs/mrtr-implementation-checklist.md` 提供一页参考：服务器以 `input_required` 结束调用时应做和不应做什么，如何保护 `requestState`，客户端应如何响应，表单模式与 URL 模式的选择表，以及考前应复习的常见陷阱。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证以下行为：首次调用返回带有 `inputRequests` 和 `requestState` 的 `input_required`；以新 id 携带接受确认的重试完成并记录部署；重试逐字节回传 `requestState`；拒绝会正常完成但不部署；签名篡改、过期、主体不同、参数被替换均以工具执行错误拒绝；已使用状态不能再次兑换；未声明 `elicitation` 的客户端不会收到无法回答的 `inputRequests`；缺少必需工具参数时返回工具执行错误，不使用协议错误。仓库报文检查器还依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/14-multi-round-trip-requests-and-elicitation
```

## 与综合实践的联系（Capstone Connection）

综合实践包含一次用于同意授权的 MRTR 信息征询，使用与本课相同思路保护 `requestState`：绑定主体、有效期和所属请求摘要，并演示拒绝被篡改的尝试。四步流程、新 id 规则、原样回传，以及协议错误和工具执行错误的区分，都是最终实践假定你已经掌握的基础。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| MRTR | 多轮往返请求，以 input_required 结束当前调用，替代服务器主动发起请求 |
| InputRequiredResult | resultType 为 input_required 的结果，包含 inputRequests、requestState 或两者 |
| inputRequests | 将服务器选择的键映射到 elicitation/create、sampling/createMessage 或 roots/list 请求 |
| inputResponses | 客户端重试时携带的回答映射，与 inputRequests 使用相同键 |
| requestState | 服务器生成的不透明字符串，客户端必须准确回传，不自行解读 |
| 表单模式信息征询（Form mode elicitation） | 在协议内收集结构化数据，依据扁平 requestedSchema 校验 |
| URL 模式信息征询（URL mode elicitation） | 通过客户端不检查其内容的外部 URL 完成带外交互，敏感数据必须采用这种方式 |
| ElicitResult action | accept、decline 或 cancel，都是服务器必须处理的正常结果 |
| 主体绑定（Principal binding） | 将 requestState 绑定到已认证调用方，防止他人重放 |
| 单次使用约束（Single use enforcement） | 服务端检查已兑换 requestState 的 nonce，防止重复使用 |

## 延伸阅读（Further Reading）

- [多轮往返请求（Multi Round-Trip Requests）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [信息征询（Elicitation）](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation)
- [SEP-2322：多轮往返请求（Multi Round-Trip Requests）](https://modelcontextprotocol.io/seps/2322-MRTR)
- [SEP-1036：面向安全带外交互的 URL 模式信息征询](https://modelcontextprotocol.io/seps/1036-url-mode-elicitation-for-secure-out-of-band-intera)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 7、11 节
- `phases/13-tools-and-protocols/12-mcp-roots-and-elicitation`，从服务器作者角度讲解信息征询
