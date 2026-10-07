# 发现服务器并协商能力（Discovering a Server and Negotiating What It Can Do）

> 服务器通过 `server/discover` 描述自身，但每个请求仍须分别声明客户端能力；客户端询问过可用功能，并不意味着服务器可以在后续调用中假定所需能力已经存在。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 06 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 读懂 `server/discover` 请求及其 `DiscoverResult`：`supportedVersions`、`capabilities`、`instructions`、`serverInfo`、`ttlMs` 和 `cacheScope`
- 解释服务器为何必须实现 `server/discover`，而客户端仍可选择是否调用
- 读懂 `ServerCapabilities` 与 `ClientCapabilities` 的结构，并说明每个标志所承诺的能力
- 解释服务器为何不能依赖客户端未在当前请求中声明的能力，以及 `MissingRequiredClientCapabilityError`（`-32021`）携带什么信息
- 跟踪版本协商重试：从 `UnsupportedProtocolVersionError`（`-32022`）到客户端选择双方共同支持的版本

## 问题（The Problem）

第 06 课为每台服务器配置一个客户端，并划清了职责，但仍有一个问题：客户端首次联系此前从未见过的服务器时，如何在没有专门初始化对话的情况下，得知对方是谁、能够做什么？第 04 课的无状态核心已经排除了 `initialize` 握手，以及保存协商结果的会话。每个请求仍然必须能够自描述。

这带来两个方向的要求。客户端需要快速了解服务器身份、支持的协议版本和提供的功能，最好一次往返即可完成，而不必分别探测 `tools/list`、`resources/list` 和 `prompts/list` 才能形成全貌。另一方面，服务器无法依赖连接状态，因此即使客户端五个请求之前询问过信息征询或采样支持，也不能假定同一客户端在当前调用中仍然愿意且能够处理信息征询。了解服务器提供什么，以及证明客户端当前可以接收什么，这两个问题听起来相近，却指向相反方向。2026-07-28 用两种不同机制解决它们；仅仅扫一眼字段名，很容易将两者混淆。

## 概念（The Concept）

第一种机制是 `server/discover`。服务器**必须（MUST）**实现它；客户端**可以（MAY）**调用，也可以直接发送自己真正需要的请求，在收到版本不匹配时再处理。发现请求只携带标准 `_meta`：

```json
{
  "jsonrpc": "2.0",
  "id": "discover-1",
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

返回的 `DiscoverResult` 属于 `CacheableResult`，因此除自身字段外，始终包含 `ttlMs` 和 `cacheScope`。自身字段包括：`supportedVersions`，客户端后续请求应从中选择版本；`capabilities`，一个 `ServerCapabilities` 对象；以及可选的 `instructions` 字符串，为模型提供自然语言指引，不用于重复工具描述。服务器身份位于 `result._meta["io.modelcontextprotocol/serverInfo"]`，包含服务器自报的名称和版本。这个字段仅提供说明信息，不能充当凭据：可用于展示、日志和调试，不能影响授权或信任决策，因为协议中没有任何机制验证它。

`ServerCapabilities` 用一组标志列出服务器提供的功能：`tools {listChanged}`、`resources {listChanged, subscribe}`、`prompts {listChanged}`、`completions {}`、`logging {}`，以及 `extensions {}`。logging 已弃用但仍存在，第 15 课会深入讲解；extensions 将扩展标识符映射到设置对象，第 30 课会专门介绍。`completions` 这类能力对应的空对象表示“支持，但没有额外设置需要报告”；整个键缺失则表示服务器完全不提供该功能。`ClientCapabilities` 方向相反，描述客户端能够接收什么：`elicitation {form, url}` 对应第 14 课介绍的两种模式；`sampling` 和 `roots` 均已弃用，迁移路径见第 15 课；此外还包括 `extensions {}`。两种结构遵循相同命名规则，但表达的通信方向不同。

仅浏览字段名称最容易错过的要点是：`DiscoverResult.capabilities` 表示*服务器*能够做什么，可以报告一次并缓存，在 `ttlMs` 提示过期之前复用；它完全不说明*客户端*当前能够接收什么。后者是独立的每请求信息，通过每一个请求的 `_meta["io.modelcontextprotocol/clientCapabilities"]` 传递，无论该请求是否用于发现。如果服务器需要使用客户端能力，例如在处理工具调用过程中提出表单模式的信息征询，就必须检查*当前这个请求*的 `clientCapabilities`，不能读取先前发现调用或先前 `tools/call` 留下的值。这是第 04 课无状态规则在能力上的直接应用：即使位于同一连接，也绝不从先前请求推断。

服务器需要当前请求未声明的能力时，返回 `MissingRequiredClientCapabilityError`：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "error": {
    "code": -32021,
    "message": "notify_oncall requires a capability this request did not declare",
    "data": {
      "requiredCapabilities": {
        "elicitation": {}
      }
    }
  }
}
```

`data.requiredCapabilities` 与 `ClientCapabilities` 具有相同结构，列出缺失的能力类别，使客户端能够在重试时声明这些能力，无须猜测。在 HTTP 上，这种错误对应 `400 Bad Request`。

版本选择是协商的另一半，它与发现并不绑定：任意请求都可能触发版本协商。如果请求声明了服务器未实现的协议版本，服务器必须返回 `UnsupportedProtocolVersionError`：

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "error": {
    "code": -32022,
    "message": "Unsupported protocol version",
    "data": {
      "supported": ["2026-07-28"],
      "requested": "2025-11-25"
    }
  }
}
```

客户端应从 `data.supported` 中选择一个版本，使用新的 id 重试同一请求。需要注意：通过现代 `_meta` 结构请求一个真实的旧版本字符串，并不意味着该客户端就是旧版客户端。旧版客户端发送 `initialize` 请求，不使用每请求元数据；时代由消息结构界定，仅凭版本号无法判断。现代专用服务器收到旧版客户端真正的 `initialize` 请求时，仍应在返回的错误中列出支持的版本，这是旧版客户端能够向用户展示的唯一诊断信息，也符合第 05 课时代模型所要求的处理方式。

```figure
mcpa-07-discover
```

## 交互实验（Interactive Lab）

图中把两种机制分开显示。上方通道展示 `server/discover`：客户端可选调用，只需一次往返，就同时获得支持版本、能力、指引和缓存提示。下方通道展示每次 `tools/call` 都会执行的操作，无论此前是否发现过服务器：重新检查该请求自己的 `clientCapabilities`。未声明任何能力时，需要信息征询的工具返回 `-32021`，准确指出缺失项。在该请求中声明所需能力后，同样的调用就能完成。上方第一次发现调用成功，并不会把任何客户端能力延续到下方通道。

## 实践实验（Practice Lab）

打开 `code/main.py`。`DeployServer` 实现 `server/discover`，以及一个带能力门禁的工具 `notify_oncall`：工具定义要求调用前具备 `elicitation` 能力。它还提供不需要额外能力的工具 `list_incidents`。

```bash
python3 code/main.py
```

按顺序阅读输出的交互。第一对是普通 `server/discover`，返回 `supportedVersions`、`capabilities`、`instructions` 和缓存提示。第二对在 `clientCapabilities: {}` 的条件下调用 `notify_oncall`，得到 `-32021`，其中 `data.requiredCapabilities` 指出 `elicitation`。第三对重复同一调用，这次在请求 `_meta` 中声明 `elicitation`，于是正常完成。第四对调用服务器不存在的工具 `close_all_incidents`，这是协议错误 `-32602`，与能力不足无关。最后两对展示版本协商：请求 `2025-11-25` 的 `server/discover` 得到 `-32022`，`data.supported` 为 `["2026-07-28"]`；客户端下一次调用选择该版本，使用新的请求 id 并成功。试着先声明一次 `elicitation`，再在之后的调用中省略它：服务器会再次拒绝，因为它从未记住先前声明。

## 交付物（Shipped Artifact）

`outputs/capability-negotiation-cheatsheet.md` 汇总了 `DiscoverResult` 字段表、并列展示的 `ServerCapabilities` 与 `ClientCapabilities` 结构、`-32021` 和 `-32022` 的 data 结构，以及简短重试检查清单，均引用研究简报。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试检查以下内容：`server/discover` 返回 `supportedVersions`、完整 `capabilities` 对象、`instructions` 和缓存提示；缺少必需能力的调用返回 `-32021` 并指出缺失项；在重试请求中声明能力后，调用可以完成；不需要额外能力的工具无须声明额外项；未知工具返回 `-32602`，未知方法返回 `-32601`；版本不匹配同时指出 `supported` 和 `requested`；客户端重试使用新 id；完全缺少 `_meta` 的请求被拒绝。仓库的报文检查器还会直接依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/07-discovery-and-capability-negotiation
```

## 与综合实践的联系（Capstone Connection）

综合实践从 `server/discover` 开始，后续交互遵守其返回的缓存提示。接下来，某个工具调用之所以成功，是因为客户端在那个特定请求中声明了正确能力；之后的 MRTR 信息征询交互也以该声明为门禁。每一步都建立在本课划分之上：发现描述服务器，可以报告一次并缓存；能力声明描述客户端，必须在每个请求中重新提供。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| `server/discover` | 服务器必须实现的请求，用于发布支持版本、能力和身份信息 |
| `DiscoverResult` | 可缓存的发现结果：包含 `supportedVersions`、`capabilities`、可选 `instructions`、`ttlMs` 和 `cacheScope` |
| `ServerCapabilities` | 服务器提供的能力：tools、resources、prompts、completions、logging、extensions |
| `ClientCapabilities` | 客户端在某次请求中能够接收的能力：elicitation、sampling、roots、extensions |
| `serverInfo` | 服务器自报名称与版本，用于展示和日志，不能用于安全决策 |
| `MissingRequiredClientCapabilityError` | `-32021`，当前请求需要的能力未在其自身 `clientCapabilities` 中声明时返回 |
| `UnsupportedProtocolVersionError` | `-32022`，请求声明服务器未实现的版本时返回，并携带 `data.supported` 与 `data.requested` |
| 每请求协商（Per-request negotiation） | 能力和版本信息仅从当前请求读取，绝不从先前请求推断的规则 |

## 延伸阅读（Further Reading）

- [发现：server/discover（Discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [版本与兼容性（Versioning and Compatibility）](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [基础协议概览与 _meta 规则](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- [模式参考：DiscoverResult、ClientCapabilities、ServerCapabilities](https://modelcontextprotocol.io/specification/2026-07-28/schema#discoverresult)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 6 节
