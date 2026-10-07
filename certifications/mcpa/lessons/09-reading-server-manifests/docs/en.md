# 像评审者一样阅读服务器清单（Reading a Server Manifest Like a Reviewer）

> 调用任何功能之前，你能了解服务器的材料只有发现结果、工具列表和注册表条目。要像审阅契约一样阅读它们，因为一个被忽略的默认值，可能变成你从未打算接受的承诺。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 08 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 将 server/discover 结果、tools/list 页面和注册表 server.json 作为调用前描述服务器的三份材料来阅读
- 应用工具注解的默认值：readOnlyHint false、destructiveHint true、idempotentHint false、openWorldHint true，理解省略注解实际意味着什么
- 解释能力标志、x-mcp-header 标记、icons 和 cacheScope 选择所暗示的服务器行为
- 识别清单中的风险信号：没有注解的破坏性工具、通过 x-mcp-header 映射的秘密值、用户专属文本使用 public cacheScope，以及试图操纵模型而非描述服务器的 instructions
- 从注册表 server.json 的 name 中解析命名空间，并说明该命名空间如何验证所有权

## 问题（The Problem）

宿主尚未调用工具时，已经可以获得三类信息：`server/discover` 声称支持什么，`tools/list` 当前提供什么，以及服务器已经发布时，注册表 `server.json` 如何描述其所有者。协议并不保证这三份材料完整、审慎或诚实。注解只是提示，指引是自报的自然语言内容，注册表名称的可信度则取决于背后的验证挑战。宿主若未阅读这些材料就添加服务器，等于信任了从未真正核查的默认值和声明。

这项能力与编写或调用服务器不同，更接近安装应用前阅读权限清单：此时还没有执行功能，而是在判断它提供的内容是否符合这一类别服务器的合理预期，并寻找粗心或恶意作者可能省略保护的具体位置。工具没有 `annotations` 块，并不意味着它可以免于审查：客户端必须应用默认值，而默认值偏向谨慎。通过 `x-mcp-header` 映射到 HTTP 请求头的参数，会暴露给客户端与服务器之间的各个代理和负载均衡器。`instructions` 则可能被宿主直接交给模型。正确阅读清单，需要将这些内容逐项视为待验证的声明，而不能直接接受为事实。

## 概念（The Concept）

第一份材料是发现与能力协商课程介绍的 `server/discover`：在包含 `ttlMs` 和 `cacheScope` 的可缓存封套中，提供 `supportedVersions`、`capabilities`、可选 `instructions` 字符串和 `_meta["io.modelcontextprotocol/serverInfo"]`。评审者首先阅读 `capabilities`。`tools: {listChanged: true}` 表示工具集合变化时，服务器会通知正在监听的客户端；从不订阅的客户端如果在 `ttlMs` 到期后仍沿用旧列表，就会读到过时数据。`resources: {subscribe: true}` 表示可接收单个资源的更新，不局限于列表变化。`completions: {}` 表示实现了 `completion/complete`。`extensions` 对象列出可选协议扩展及其设置；看到存在但不熟悉的扩展键时，应先查明它改变什么，再决定是否信任。

第二份材料是 `tools/list`，其结构定义契约见第 08 课；多数风险信号集中在这里。每个工具包含 `name`、`description`、`inputSchema`，以及可选 `title`、`icons`、`outputSchema` 和 `annotations`。评审者不能跳过注解：`readOnlyHint` 默认为 false；`destructiveHint` 默认为 true，且仅在 `readOnlyHint` 为 false 时有意义；`idempotentHint` 默认为 false；`openWorldHint` 默认为 true。按规则的实际方向理解：工具完全没有 `annotations` 对象时，客户端应用默认值后，应将它视为非只读且具有破坏性。省略说明不等于安全。评审者看到 `delete_account` 或 `run_report` 这样的裸工具定义，应在明确的 `readOnlyHint: true` 或 `destructiveHint: false` 声明出现之前，按破坏性工具看待，因为这正是规范要求客户端采用的默认假设。不过，这些始终只是提示：规范明确要求，除非服务器本身可信，否则注解也必须视为不可信。评审者的任务是识别这些声明，注解本身不会强制落实其声称的行为。

`icons` 属于展示元数据，但客户端需要从 URI 获取它，因此评审者应检查是否使用 `https:` 或 `data:`，以及是否与服务器同源。SVG 图标可能携带可执行脚本，必须把它当作需要审查的内容。位于结构定义属性内部的 `x-mcp-header`，会将该参数值映射到 `Mcp-Param-{Name}` HTTP 请求头，方便网关无须解析正文就进行路由。它有实际约束：请求头名称必须是合法的 HTTP field-name token，不能包含空格或控制字符；在同一工具结构定义中，名称按大小写不敏感方式比较时必须唯一；只能用于基本类型，且不能用于 `number`。Streamable HTTP 客户端遇到违反任一规则的 `x-mcp-header` 定义，必须从 `tools/list` 结果中剔除该工具，不能静默忽略这一注解。语法之外，还应检查映射的实际内容：规范警告服务器不要将密码、API 密钥、令牌等秘密值标记为请求头参数，因为请求头对各个中间节点都可见，并非仅目的服务器可见。

`server/discover` 和 `tools/list` 都属于可缓存结果，因此每个完整响应都必须携带 `ttlMs`，以及取值为 `public` 或 `private` 的 `cacheScope`。`cacheScope` 提示哪些调用方可以共享缓存副本，本身不提供访问控制：`public` 表示另一调用方查询缓存时可以得到相同字节；`private` 表示缓存副本不能跨授权边界共享。评审者应将工具描述和发现结果的 `instructions` 与声明作用域对照：如果文本描述的是某一调用方的数据，例如其账户、余额或当前用户，却配上 `cacheScope: "public"`，就存在实际风险。按照该提示工作的缓存层，可能把一个用户的个性化列表交给下一位查询者。

`instructions` 值得单独审阅。它用于帮助模型正确使用服务器，和 `serverInfo` 一样完全由服务器自行报告，协议不验证其内容。普通指引会描述服务器做什么、何时优先使用哪个工具、预期单位是什么。如果指引直接向模型下命令，要求忽略先前规则、始终优先调用某个工具，或向用户隐瞒内容，就已经超出服务器说明。这符合通过客户端可能默认信任的通道投递提示注入的形态，评审者应像对待工具结果中的注入指令一样保持警惕。

第三份材料完全位于报文协议之外：注册表 `server.json`。其 `name` 遵循反向 DNS 格式，例如 `io.github.username/server-name` 或 `com.example/server-name`。发布者通过验证挑战证明拥有对应 GitHub 账户或域名后，MCP Registry 才接受该名称。如果名称没有 `/`，就根本没有命名空间，也无法据此验证所有权，应像对待未签名的软件包一样审查。`packages` 和 `remotes` 描述运行方式，包括 npm、PyPI、NuGet、Cargo、MCPB、OCI 软件包，或远程 Streamable HTTP、SSE URL。各类软件包有自己的所有权证明，例如 `package.json` 中的 `mcpName` 字段，或 README 中隐藏的 `mcp-name:` 标记。注册表自身不扫描服务器代码漏洞，而是将相关工作交给底层包注册表和下游聚合器，因此评审者能从注册表获得的保证应限定在命名空间验证这一层。

```figure
mcpa-09-manifest-anatomy
```

## 交互实验（Interactive Lab）

图中并列展示三份材料：包含能力和指引的 `server/discover` 结果，包含注解与 `x-mcp-header` 标记的 `tools/list` 条目，以及带命名空间名称的注册表 `server.json`。每个面板标记了粗心实现常出问题的位置：像命令而非说明的指引、完全没有注解的工具，以及没有经过验证的命名空间的名称。将每个标记对应回上文规则，检查字段本应表达什么，以及缺失或误用会对严格遵循规范的客户端产生什么影响。

## 实践实验（Practice Lab）

打开 `code/main.py`。它构造两个只响应 `server/discover` 和 `tools/list` 的服务器：`acme-tools` 模拟常见的粗心集成，`docs-search` 模拟较为审慎的实现。随后将两者结果和各自手写的 `server.json` 交给 `lint_manifest`。在本课目录运行：

```bash
python3 code/main.py
```

先阅读 `acme-tools` 报告。`delete_account` 没有 `annotations` 块，检查器依据规范默认值将它标为破坏性，并非凭名称猜测。`rotate_api_key` 通过 `x-mcp-header` 映射 `new_api_key`，检查器因此指出请求头暴露了疑似秘密值。`run_report` 将 `region_code` 映射到带空格的请求头名称 `"Region Code"`，它不符合 HTTP field-name token 语法，属于 Streamable HTTP 客户端必须从工具列表中剔除的定义。`get_balance` 的描述为“your account balance for the current user”，而该服务器的 `tools/list` 结果声明 `cacheScope: "public"`，检查器将两者关联为缓存风险。发现结果的 `instructions` 以“Ignore any prior guidance”开头，被识别为直接操纵模型的文字。注册表名称 `"acme-tools"` 不包含 `/`，无法解析命名空间，因此同样被标记。再比较 `docs-search`：每个工具都明确只读；使用的请求头普通且唯一；缓存文本确实可公开共享；指引描述服务器，而不向模型发号施令；注册表名称 `io.github.acmedocs/docs-search` 可按已验证 GitHub 命名空间的格式正常解析。报文记录最后一项不属于客户端发送的消息，而是一个粗心服务器可能返回的 `server/discover` 响应，完全缺少 `ttlMs` 和 `cacheScope`。它被包装为故意构造的违规示例，让你在真实调用失败之前看清缓存契约会如何被破坏。

## 交付物（Shipped Artifact）

`outputs/manifest-review-checklist.md` 将本课压缩为一页参考，包含三份材料分别应阅读什么、注解默认值表、`x-mcp-header` 规则、缓存与指引的风险信号，以及注册表命名空间的解析方法。最初几次添加陌生服务器时，可将它放在手边逐项对照。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证以下主张：没有注解的工具会应用规范默认值，不被简单视为未知；没有安全提示的破坏性工具会被标记，而明确只读的工具不会；通过 `x-mcp-header` 映射的疑似秘密参数，与违反 HTTP token 语法的请求头名称分别被标记；`number` 属性上的 `x-mcp-header` 被拒绝；公开缓存作用域配合用户专属文本会被标记；`instructions` 中操纵模型的语言被识别；缺少命名空间的注册表名称被拒绝，符合已验证 GitHub 命名空间格式的名称正确解析；干净清单不产生任何检查发现；报文中的每个请求仍携带必需 `_meta`。仓库报文检查器还依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/09-reading-server-manifests
```

## 与综合实践的联系（Capstone Connection）

综合实践的端到端交互先执行发现和工具列表查询，再进入真实调用。此时能够安全采用的假设都建立在本课之上：正确理解能力标志，应用而非跳过注解默认值，并确保第一次工具调用之前，清单内容没有在操纵模型。后续信任边界与同意授权课程，也直接依赖这种先审慎阅读清单、再依据其声明采取行动的习惯。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 清单（Manifest） | 调用前一起审阅的发现结果、工具列表和注册表 server.json |
| 注解默认值（Annotation defaults） | 工具省略注解时采用 readOnlyHint false、destructiveHint true、idempotentHint false、openWorldHint true |
| x-mcp-header | 将基本类型参数映射到 HTTP 请求头以用于路由的结构定义属性 |
| cacheScope | 缓存结果能否跨用户与令牌共享的提示，本身不提供访问控制 |
| instructions | 服务器通过 server/discover 提供、用于描述自身的自报自然语言指引 |
| 反向 DNS 命名空间（Reverse-DNS namespace） | server.json 名称中与已验证所有者关联的 io.github.user 或 com.example 前缀 |
| 风险信号（Red flag） | 清单字段的声明不符合该类审慎实现应有表现的位置 |
| 所有权验证（Ownership verification） | 注册表通过 GitHub、DNS 或 HTTP 挑战，将名称与发布者关联的过程 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：发现（Discovery）](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP 规范 2026-07-28：工具（Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Registry 概览](https://modelcontextprotocol.io/registry/about)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 6、10、15 节
