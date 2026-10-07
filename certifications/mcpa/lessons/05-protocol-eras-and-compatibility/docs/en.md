# 区分现代与旧版 MCP 服务器（Telling a Modern MCP Server From a Legacy One）

> 现代 MCP 没有开场握手。需要同时兼容当前与更早服务器的客户端，必须根据第一次交互的表现识别对端，而不能依赖双方预先发布的声明。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 04 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 列出从 2024-11-05 到 2026-07-28 的版本时间线，以及每个版本最主要的变化
- 定义现代（modern）、旧版（legacy）和双时代（dual-era），并解读客户端与服务器所有时代组合的兼容性矩阵
- 在 stdio 上用 `server/discover` 探测服务器，将响应归类为现代、使用不同版本的现代，或旧版，不把判断绑定到某一个特定错误码
- 解释客户端收到 `UnsupportedProtocolVersionError`（代码 -32022）后，如何在不进行握手的情况下协商版本
- 说明 2026-07-28 彻底移除了哪些机制，以及仅支持现代版本的服务器为何仍应在拒绝旧式连接尝试时列出其支持的版本

## 问题（The Problem）

真实部署不会同时升级。今天构建的客户端库仍需要与相隔数月乃至数年编写的服务器通信：有些在新版本发布当天就更新，有些则一直保持最初安装时的状态。2026-07-28 移除了早期版本用来处理这种差异的机制：在真正开始工作前，先通过一次开场交互声明版本。如今每个现代请求都能自描述，这正是协议无状态的基础；但这也意味着，不再有一个专门时刻让客户端与服务器预先约定基本规则。

因此，要在这些不同服务器之间发挥作用，客户端首先必须解决一个实际问题：面对尚不了解的连接，如何低成本、可靠地判断对端读取的是现代的每请求元数据，还是期待旧式握手？猜错会导致难以理解的失败：现代服务器遇到无法识别的方法，旧版服务器则尝试解读一个缺少其全部预期前置信息的请求。本课教你按照规范，有意识地做出这项判断，避免依靠碰巧奏效的行为。

## 概念（The Concept）

下表列出了协议的各个具名版本及其代表性变化。其中只有最新版本属于现代时代，此前均归为旧版。

| 版本（Revision） | 时代（Era） | 主要变化（Headline change） |
|---|---|---|
| 2024-11-05 | 旧版（Legacy） | 首个公开版本：stdio 与 HTTP+SSE 传输，以及每次建立连接时的握手。 |
| 2025-03-26 | 旧版（Legacy） | Streamable HTTP 替代 HTTP+SSE；引入 OAuth 2.1 授权、工具注解和音频内容。 |
| 2025-06-18 | 旧版（Legacy） | 结构化工具输出、资源链接、信息征询、OAuth 资源服务器分类、MCP-Protocol-Version 请求头；移除 JSON-RPC 批处理。 |
| 2025-11-25 | 旧版（Legacy） | 图标、增量权限范围同意、工具命名指引、URL 模式信息征询、实验性任务；校验错误改为工具执行错误，不再作为协议错误。 |
| 2026-07-28 | 现代（Modern） | 无状态核心，移除握手和会话；新增 `server/discover`、多轮往返请求、`resultType` 和 `subscriptions/listen`；将任务移入扩展；弃用 roots、sampling、logging 和动态客户端注册。 |

本课后续围绕三个术语展开。**现代（Modern）**指版本、身份和能力都通过每请求元数据传递的版本，即 2026-07-28 及其后续版本。**旧版（Legacy）**指通过 `initialize` 握手开启连接并保存会话状态的版本，即 2025-11-25 及此前版本。**双时代（Dual-era）**描述同时支持两者的客户端或服务器实现，它会在解析其他内容前，明确判断正在处理哪一个时代。

双时代客户端的核心任务可以归结为一次探测。在 stdio 上，发送任何重要请求前，它先发送 `server/discover`，在 `_meta` 中携带首选版本，然后读取响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32022,
    "message": "Unsupported protocol version",
    "data": {
      "supported": ["2026-07-28", "2025-11-25"],
      "requested": "1900-01-01"
    }
  }
}
```

三种结果对应三种结论。收到 `DiscoverResult`，说明服务器属于现代时代：从其 `supportedVersions` 中选择版本并继续。收到可识别的现代错误，上面的示例是 `UnsupportedProtocolVersionError`，仍说明服务器属于现代时代，只是不支持客户端首次尝试的版本：使用新的请求 id，选择 `data.supported` 中的一个版本重试，不应因此放弃现代路径。其他情况，包括无法识别为少数几类现代错误结构的错误，或在合理超时内没有收到回答，都意味着按旧版处理，回退到旧版 `initialize` 握手。第三种情况的判断尤其重要：回退不能绑定某个特定错误码，因为旧版服务器并无义务以某种固定方式回答陌生方法。它可能返回 Method not found、Invalid params，也可能一直不回应。识别旧版的依据是缺少可识别的现代响应，而非出现了某个特定响应。

在 Streamable HTTP 传输中，相同思路有不同表现，因为现代服务器也会由于不支持的版本、缺失能力、请求头与正文不一致等普通原因返回 `400 Bad Request`。双时代客户端先尝试现代请求，遇到 400 时，必须先读取响应体再作判断。如果正文包含可识别的现代 JSON-RPC 错误，仍按现代服务器处理，修正请求或选择受支持版本重试，而不回退。如果正文为空，或无法解析为可识别的现代错误，则按旧版处理，回退到旧式握手，之后还有可能继续回退到早于 Streamable HTTP 的已弃用传输。

时代是服务器的属性，不属于某一个单独请求，因此客户端应缓存探测结果：stdio 按该连接对应进程的生命周期缓存，HTTP 按源站缓存；在相同配置重启后，也可以继续保留这一判断。如果后来发现缓存假设不再成立，例如服务器已经升级，客户端可以重新探测，无须永远相信旧答案。

还有一条值得了解的规则，它帮助的是最缺少恢复能力的用户：仅支持现代版本的服务器，在返回针对 `initialize` 请求的错误时，仍应列出自己支持的版本。发起该请求的客户端没有自动前进到现代协议的路径，它能够向用户展示的诊断信息，只有服务器放进这一条消息的内容。

2026-07-28 完整移除了旧版开场序列，并非只缩减它。`initialize` 请求及随后发送的 `notifications/initialized` 通知已经消失。协议会话及其标识请求头、独立 GET 流及配套会话拆除机制，以及现由 `subscriptions/listen` 替代的两个资源监视方法，也都被移除。一些以会话为范围的方法失去了适用位置，基于事件 id 的流恢复被取消，服务器只能在响应客户端所发内容时与其通信。这些机制都不应出现在声称使用现代协议的报文记录中；确需在兼容性示例中展示时，必须明确标识其旧版性质。

```figure
mcpa-05-era-matrix
```

## 交互实验（Interactive Lab）

图中一次探测分向三个可能的终点：`DiscoverResult` 方框通向“直接使用”；可识别的 `-32022` 方框通向“以受支持版本重试”；“其他错误或超时”方框则通向回退。注意，三个结果中有两个仍被归为现代时代，只有第三个会切换客户端接下来采用的协议路径。

## 实践实验（Practice Lab）

打开 `code/main.py`。`LEGACY_EXAMPLES` 被设为 `True`，因为本课确有必要构造旧式开场交互：一方面展示双时代客户端如何回退，另一方面展示现代服务器如何拒绝旧请求并列出自己的版本。报文中的每条此类消息都以 `{"legacy": true, "message": {...}}` 包装；文件中的其他消息均为普通现代请求或结果，不使用这种包装。

```bash
python3 code/main.py
```

演示创建四个服务器，再用同一个 `DualEraClient` 分别探测。`modern-server` 仅支持 `2026-07-28`，第一次探测立即返回 `DiscoverResult`。`modern-other-version-server` 是专为本实验虚构的第二个现代服务器，它固定使用一个编造的后续版本，以便观察重试路径：首次探测返回 `-32022`，客户端自动使用 `data.supported` 指出的版本重试，整个过程不触及回退路径。`legacy-error-server` 对陌生方法返回普通 Method not found 错误，客户端据此正确判断为旧版；`legacy-timeout-server` 完全不回答探测，客户端同样按旧版处理，证明回退并不依赖某个特定错误。再次探测 `modern-server`，比较前后日志长度：不会发送新消息，因为时代已缓存。最后，观察 `modern-only-server` 如何拒绝旧式开场请求，并在错误中列出自己支持的版本，这正是仅支持现代协议的服务器应有的行为。

## 交付物（Shipped Artifact）

`outputs/era-compatibility-matrix.md` 是一页速查材料，包含版本时间线、三个时代术语、并列的 stdio 与 HTTP 探测算法、覆盖所有客户端和服务器时代配对的兼容性矩阵，以及考前值得记住的关键事实。构建需要与非自己编写的服务器互通的系统时，可将它放在手边参考。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：`DiscoverResult` 被识别为现代；可识别的 `-32022` 触发重试而不回退；无法识别的错误触发回退；超时触发同样回退；命中时代缓存时不发送新探测；仅支持现代协议的服务器拒绝旧请求时列出支持版本；报文中的每段旧版交互都经过包装；整个运行期间不复用请求 id。仓库的报文检查器会直接依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/05-protocol-eras-and-compatibility
```

## 与综合实践的联系（Capstone Connection）

第 33 课的综合交互完全使用现代协议，不包含任何探测。之所以能够安全这样设计，是因为在这段交互开始前的某个环节，客户端已经执行了本课介绍的探测，并决定按现代协议处理连接。当你被要求解释某项设计为何可以跳过时代检测时，需要指出这样的检测前提，不能仅凭假设。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 现代（Modern） | 2026-07-28 或后续版本，版本与能力通过每请求元数据传递 |
| 旧版（Legacy） | 2025-11-25 或更早版本，通过握手开启连接并维持会话 |
| 双时代（Dual-era） | 同时支持两个时代，并在解析其他内容前明确判定时代的实现 |
| `initialize`（旧版） | 2026-07-28 之前用于建立旧版连接的握手，在现代时代已移除 |
| `server/discover` | 双时代客户端在 stdio 上探测服务器时代所用的请求 |
| `DiscoverResult` | 表明服务器属于现代时代并列出支持版本的响应 |
| UnsupportedProtocolVersionError | 代码 -32022；可识别的现代错误，触发重试而不触发回退 |
| 时代缓存（Era caching） | 按服务器进程或源站保存探测结论，避免每个请求重复探测 |
| 兼容性矩阵（Compatibility matrix） | 列出客户端与服务器各个时代组合结果的表格 |
| 400 正文检查（400 body inspection） | 在 HTTP 上先读取 400 响应体，寻找可识别的现代错误，再决定是否按旧版处理 |
| 现代专用服务器的拒绝（Modern-only rejection） | 仅支持现代协议的服务器拒绝旧式开场请求时，列出其支持的版本 |

## 延伸阅读（Further Reading）

- [版本与兼容性（Versioning and Compatibility）](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)
- [stdio 传输的向后兼容性（Backward Compatibility）](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio)
- [Streamable HTTP 传输的向后兼容性（Backward Compatibility）](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- [Inspector：协议时代（Protocol eras）](https://modelcontextprotocol.io/docs/2026-07-28/tools/inspector/protocol-eras)
- [2026-07-28 变更日志](https://modelcontextprotocol.io/specification/2026-07-28/changelog)、[2025-11-25 变更日志](https://modelcontextprotocol.io/specification/2025-11-25/changelog)、[2025-06-18 变更日志](https://modelcontextprotocol.io/specification/2025-06-18/changelog)、[2025-03-26 变更日志](https://modelcontextprotocol.io/specification/2025-03-26/changelog)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 1、6 节
