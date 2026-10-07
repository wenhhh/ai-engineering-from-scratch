# 发现服务器、路由请求与判断可信度（Finding, Routing To, and Trusting a Server）

> 注册目录中的名称说明谁发布了服务器；网关决定请求能否到达它；SDK 等级描述实现覆盖与维护承诺。这三个问题需要分别判断。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 31 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 解释 MCP Registry 保存什么、有意不保存什么，为何只接纳公开可访问服务器，以及本课资料所述预览阶段的含义
- 按 GitHub 或域名认证验证反向 DNS 命名空间，并将它与软件包所有权证明分开
- 阅读 server.json 的 packages 与 remotes，解释其模式版本为何独立于运行服务器协商的协议版本
- 说明无状态网关的职责：核对 Mcp-Method、Mcp-Name 与请求体，利用请求头路由，并遵守 cacheScope 的共享限制
- 将 SDK 符合性等级作为可移植性和维护信号，解释如何取得等级以及何时可能降级

## 问题（The Problem）

团队决定给内部助手添加第三方 MCP 服务器时，会遇到三个不同问题。在哪里寻找候选，如何确认名称真的属于其声称代表的组织？服务器获准接入后，如何让内部客户端通过统一入口访问并执行策略，而不要求快速路由路径完整理解每个 JSON-RPC 请求体？准备自己编写服务器时，面对持续变化的协议，又应该选择哪个 SDK？

它们分别对应协议外围三种基础设施：MCP Registry、网关和 SDK 分级体系。虽然可以把发布、路由、SDK 选型串成一条供应链，但每层提供的保证范围不同。注册目录验证谁能发布某个名称，不自动扫描代码漏洞，也不运行服务器确认行为。网关核查请求并执行准入策略，不替后端出版者背书。SDK 等级是某个实现的完整性和维护信号，不证明基于它构建的具体服务器或某条注册信息安全。理解这些界限，正是用例与生态领域场景题考查的重点。

## 概念（The Concept）

### 注册目录：保存元数据，不托管代码

按本课固定资料，MCP Registry 是集中托管的官方公开服务器元数据索引，仍处于预览阶段，维护者提示正式可用前可能发生破坏性变更或数据重置。每个发布版本对应一份 `server.json`：包含反向 DNS 名称、标题、描述、版本，以及 `packages`、`remotes` 数组之一或两者。目录不托管服务器本身。`packages` 指定 `registryType`（`npm`、`pypi`、`nuget`、`cargo`、`oci`，或用于预构建二进制的 `mcpb`）和实际由 npm、PyPI、Docker Hub 等提供的 `identifier`。`remotes` 指定 `streamable-http` 或已弃用的 `sse` 传输，以及直接提供服务的 URL，还可包含多租户模板用 `variables` 和客户端必需发送的 `headers`。两种路径可并存，让宿主选择安装方式。

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.acme/weather-mcp",
  "title": "Weather",
  "version": "1.0.0",
  "packages": [
    {"registryType": "npm", "identifier": "@acme/weather-mcp", "version": "1.0.0", "transport": {"type": "stdio"}}
  ],
  "remotes": [
    {"type": "streamable-http", "url": "https://weather.acme.example/mcp"}
  ]
}
```

注意 `$schema`：示例中的 `2025-12-11` 描述 `server.json` 自身结构。它与运行服务器在 `server/discover` 及报文中协商的 MCP 协议版本 `2026-07-28` 无关。目录条目可使用较新或较旧模式，后端则实现另一个协议版本；两者分别维护，不能把两个日期当成同一事实。

名称所有权是目录的核心验证点。GitHub 认证发布者使用 `io.github.username/server` 或 `io.github.orgname/server`；通过 DNS TXT 或 well-known HTTP 文件证明控制 `example.com` 的发布者，可使用 `com.example/server`。目录在每次发布时校验相应权限，阻止无关方冒用他人组织名称。它与底层软件包的所有权标记不同：npm 检查 `package.json` 中的 `mcpName`；PyPI、NuGet、Cargo 检查渲染 README 中的 `mcp-name: name`（Cargo 必须使用可见文本，因为 crates.io 会移除其他两者保留的 HTML 注释）；Docker 或 OCI 使用 `io.modelcontextprotocol.server.name` 标签。目录名称与其指向的制品是两项不同证明，均需与 `server.json` 一致。

版本也有明确限制：每次发布的版本字符串必须唯一，发布后不可变。推荐使用语义化版本，便于自动标记 latest；`^1.2.3`、`~1.2.3`、`>=1.2.3`、`1.x` 等范围字符串不允许，因为它们不能唯一指向制品。公开目录只接纳公开可访问服务器：软件包位于公开包仓库，或远程 URL 可从公网访问。仅能在私网或私有源访问的服务，应使用实现相同 OpenAPI 接口的自建目录。安全扫描交给底层包仓库和下游聚合方，目录审核本身较宽松：移除违法内容、恶意软件、垃圾信息和不可用服务器，但不会仅因质量差、缺陷、漏洞或重复而移除。宿主应用也不应直接频繁查询官方目录，而应使用下游聚合器或市场；聚合器低频轮询只读 REST API，维护副本，并可叠加人工筛选、评价与安全扫描。

### 网关：基于报文路由，不继承注册信任

网关在一个或多个后端前提供统一 MCP 端点。无状态核心移除会话后，无需将客户端固定到特定副本；任意健康实例都可处理自描述请求，沿用第 04 课的副本模型。网关仍需要快速判断请求去向及是否允许，而第 19 课的 HTTP 请求头镜像正用于此。POST 携带 `MCP-Protocol-Version` 和 `Mcp-Method`；`tools/call`、`resources/read`、`prompts/get` 还带 `Mcp-Name`。快速路由路径可读取这些头，无需先完整反序列化并理解业务正文。

请求头只是路由捷径，不能产生第二套权威值。将请求视为有效前，网关或后端必须核对：`Mcp-Method` 对应 `method`；`Mcp-Name` 对应 `params.name` 或 `params.uri`；`MCP-Protocol-Version` 对应 `params._meta["io.modelcontextprotocol/protocolVersion"]`。不一致时在访问后端前返回 `HeaderMismatch`、`-32020` 和 HTTP `400`。跳过核对会让攻击者用请求头让网关记录或限流一个工具，却让正文执行另一个更敏感工具。

```http
POST /mcp HTTP/1.1
MCP-Protocol-Version: 2026-07-28
Mcp-Method: prompts/get
Mcp-Name: lookup_account

{"jsonrpc": "2.0", "id": 7, "method": "tools/call", "params": {"name": "lookup_account", "arguments": {"accountId": "acct-1"}, "_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}}}
```

```json
{"jsonrpc": "2.0", "id": 7, "error": {"code": -32020, "message": "Header mismatch: Mcp-Method", "data": {"headers": ["Mcp-Method"]}}}
```

网关的其他责任遵循同一原则：增加策略，但不擅自取得协议未赋予的权限。它控制哪个主体可访问哪些后端和工具，不重新发出旧版 `-32000` 至 `-32019` 错误，也不在规范保留的 `-32020` 至 `-32099` 区间发明新代码。转发 `server/discover`、`tools/list`、`prompts/list`、`resources/list`、`resources/templates/list` 或 `resources/read` 的可缓存结果时，应保留 `ttlMs` 与 `cacheScope`，因为调用方依赖这些提示。`cacheScope` 的关键规则是：`"private"` 结果不能跨不同授权调用方复用，即使请求表面完全相同；`"public"` 可共享。网关缓存只是在源站提示上的优化，不能为了方便把私有结果提升为公开。私有项必须按已认证调用方分区，不能只按请求结构索引。令牌处理也必须保持第 23 课的边界：不得把入站令牌直接透传到不属于其受众的上游，不能凭空制造或复用不匹配凭据；调用方身份用于日志和缓存分区，也不能因此被随意塞入转发的 JSON-RPC 消息。

> 译注：原文关于网关“终止令牌并另发令牌”的概括容易与分跳授权混淆。入站认证、受众校验和对后端的独立授权应分别设计；本课模拟只使用调用方标识划分缓存，没有实现完整 OAuth 网关，不能从其报文中不含令牌推导出真实部署已安全授权。

### SDK 等级：可移植性与维护信号

选择服务器或客户端 SDK 时，SDK Tiering System 用于衡量实现覆盖与维护承诺。按固定资料，Tier 1 要求自动符合性测试全部通过，在规范发布前或同时支持新功能，两个工作日内分诊 issue，七天内修复关键缺陷，至少发布一个稳定版本并说明破坏性变更政策，还需完整文档、依赖更新政策和公开路线图。Tier 2 要求至少 80% 符合性，六个月内支持新功能，一个月内分诊，两周内修复关键缺陷，有稳定版、基础文档，以及提升至 Tier 1 的计划或留在 Tier 2 的理由。Tier 3 没有这些最低承诺，适用于实验、部分实现或专门用途。Tasks、MCP Apps 等扩展不影响任何等级的核心要求：完整符合核心协议的 Tier 1 SDK 仍可选择不实现某个扩展。

等级并非一次性证书。符合性持续针对当前稳定版本测量：Tier 1 若连续四周未通过任意符合性测试，将降为 Tier 2；Tier 2 若连续四周超过 20% 失败，将降为 Tier 3；问题两个月无人处理也可能触发降级。晋级则由维护者自评，附证据提出 issue，通过自动测试并获得 SDK 工作组确认。这连接第 02 课的 N 加 M 可移植性论点：声明报文兼容与正确实现所有必需行为是两回事，部分实现可能遗漏 `_meta`、必需头或第 14 课的 MRTR 重试行为。判断可移植性应同时查看运行时能力声明、`server/discover` 发现信息及构建所用 SDK 的等级，不能只背一张静态支持表。

```figure
mcpa-32-registry-flow
```

## 交互实验（Interactive Lab）

图中追踪服务器从发布到实际调用。左侧，证明命名空间所有权的发布者提交 `server.json`；目录在命名空间和公开可访问条件通过后接纳；聚合器按自己的节奏轮询并向宿主提供信息。右侧，客户端向网关发送带 `Mcp-Method`、`Mcp-Name` 的请求；核对头与正文后，一致则访问正确后端，不一致则在触及后端前返回 `-32020`。下方三个等级徽标显示代码中保存的符合性比例。注意，正确注册的名称不会让请求获得网关特权，两道检查相互独立。

## 实践实验（Practice Lab）

打开 `code/main.py`。纯函数 `admit_to_registry` 用 `split_namespace` 拆分名称的 authority 与 slug，拒绝发布者未验证的命名空间、`visibility` 为 `"private"` 的条目，以及被 `looks_like_version_range` 判为范围的版本。让同一名称分别由其已验证所有者和另一发布者提交，比较 `reason`。`resolve_install_target` 从 `packages` 或 `remotes` 选择安装路径；`schema_version_from_url` 从 `$schema` URL 提取模式日期，可与独立的 `PROTOCOL_VERSION` 对照。

`Gateway` 实现模拟 MCP 交互。`call_tool` 和 `read_resource` 构造普通请求，使用 `_headers_for` 生成 Streamable HTTP 请求头，并通过 `self.routes.get(headers["Mcp-Name"])` 选择路由。路由读取镜像头而非重新读取正文，正体现镜像用途；但 `_validate_headers` 必须先核对三个字段，再访问后端。`call_tool_with_mismatched_method_header` 只修改合法请求的 `Mcp-Method`，用 `"violation"` 包装故意错误的条目，紧跟真实 `-32020` 响应。运行后查看 `accounts.read_count`：`token-alice` 两次读取私有资源，`token-bob` 读取同一 URI 一次，计数为二，因为 alice 第二次命中缓存，bob 不共享。对照公开资源的 `status.read_count`，两位调用方共享一个缓存，计数为一。最后以 `"secret-token-value"` 调用 `call_tool`，搜索 `gateway.log`，确认字面令牌没有写入转发消息；它仅用于本例网关内部的缓存分区逻辑。

```bash
python3 code/main.py
```

## 交付物（Shipped Artifact）

`outputs/registry-and-gateway-guide.md` 提供目录准入清单、packages 与 remotes 选择、路由前头部核对顺序、cacheScope 规则，以及 SDK 等级要求与降级阈值。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证：发布者只能使用已验证命名空间，冒用他人名称被拒绝；即使名称合法，私有条目也不能进入公共目录；范围版本被拒绝；server.json 模式与协议版本独立；`resolve_install_target` 优先远程并回退软件包；网关按 `Mcp-Name` 路由；头体不一致返回 `-32020` 且后端不被调用；私有资源不跨调用方缓存，公开资源可以共享；令牌不出现在转发的 JSON-RPC 中；SDK 表符合本课固定规则；降级阈值只在连续四周失败后触发。仓库报文检查器也会按 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/32-registry-gateways-and-sdk-tiers
```

## 与综合实践的联系（Capstone Connection）

综合交互从第一条请求前，就假定候选服务器已被发现并评估。本课把这种判断拆为可核查环节。解释请求为何到达正确后端，应指出头体核对；解释缓存为何复用或不复用，应引用 `cacheScope`；判断某实现是否覆盖 2026-07-28 核心能力，应查看真实测试与 SDK 等级，而非凭期待。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| MCP Registry | 本课资料中的官方预览阶段公开 server.json 元数据索引 |
| server.json | 保存名称、版本及 packages／remotes 的目录元数据文档 |
| 命名空间验证（Namespace verification） | 经 GitHub 或域名挑战证明发布者控制所声明 authority |
| 聚合器（Aggregator） | 轮询目录 REST API，再向宿主提供信息的下游消费者 |
| 子目录（Subregistry） | 同时实现目录 OpenAPI 接口的聚合器 |
| 网关（Gateway） | 为一个或多个后端提供统一入口，逐请求路由并实施策略 |
| HeaderMismatch | 镜像头与正文不一致时返回的 `-32020` 错误 |
| cacheScope | 可缓存结果的 `public` 或 `private` 提示，私有项不能跨调用方共享 |
| SDK 等级（SDK tier） | 根据符合性和维护水平持续测量的 Tier 1、2、3 等级 |
| 降级（Relegation） | 连续四周出现规定程度的符合性失败时降低 SDK 等级的规则 |

## 延伸阅读（Further Reading）

- [MCP Registry](https://modelcontextprotocol.io/registry/about)
- [注册目录软件包类型](https://modelcontextprotocol.io/registry/package-types)
- [注册目录认证](https://modelcontextprotocol.io/registry/authentication)
- [注册目录聚合器](https://modelcontextprotocol.io/registry/registry-aggregators)
- [SDK 分级体系](https://modelcontextprotocol.io/community/sdk-tiers)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 9、10、15 节
- `phases/13-tools-and-protocols/17-mcp-gateways-and-registries`，深入构建完整网关策略引擎
