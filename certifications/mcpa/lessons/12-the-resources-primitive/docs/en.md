# 资源：无状态服务器中的可寻址内容（Resources: Addressable Content for a Stateless Server）

> 工具通过执行动作提供答案；资源提供宿主可以指向的已有内容。资源使用 URI 定位，由宿主决定何时交给模型。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 11 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 将 `resources/list`、`resources/templates/list` 和 `resources/read` 视为三个不同方法，理解各自不同的结果。
- 将 RFC 6570 URI 模板展开成具体 URI，再像读取其他资源一样读取它。
- 解释缺失资源为何返回携带 `data.uri` 的 JSON-RPC 错误 `-32602`，而不能返回空 `contents` 数组。
- 根据内容可共享还是属于单一调用方，为读取结果选择 `ttlMs` 和 `cacheScope`。
- 在 URI 进入存储查询前完成清理与边界校验，防止模板被用于读取服务器根目录以外的内容。

## 问题（The Problem）

宿主希望把项目 README、工单正文或用户笔记放入模型上下文时，是在选择模型回答前应当知道什么，并未要求模型执行动作。如果用工具实现这种选择，就会引入并不需要的工具语义：由模型决定是否调用，参数可能校验失败，每次普通读取也在报文中表现为一次动作。如果完全绕过 MCP，让宿主直接读取磁盘文件，又会失去 MCP 提供的重要能力：服务器迁移到另一台机器、采用另一种传输或由另一团队管理时，宿主仍可无须改动代码。

资源恰好填补这个缺口。它们提供内容，使用 URI 定位，由应用决定何时进入上下文。笔记服务器暴露 `notes://alice/welcome` 后，无论宿主将它展示在侧栏、自动提供给模型，还是在某一轮完全不读取它，资源自身的协议语义都相同。协议负责描述内容并正确回答读取请求；获取后怎样使用资源，仍由应用决定，就像工具并不替应用决定提示词与界面设计一样。

## 概念（The Concept）

在 MCP 的控制方划分中，资源由应用驱动：工具由模型控制，提示词由用户控制，资源则由宿主选择。客户端按宿主要求发现并获取内容，宿主可以采用自动启发式、界面选择器，或始终加入某个固定资源集合。

三个方法覆盖这套功能。`resources/list` 返回当前调用方可见资源，包含 `uri`、`name`，以及可选 `description`、`mimeType` 和 `icons`。集合可以为空，也可以随时间变化，但不能随连接变化，只能依据当前请求呈现的授权区分可见范围，因为第 04 课的无状态核心禁止服务器依靠记忆中的连接身份判断。`resources/templates/list` 返回按 RFC 6570 描述的参数化 URI 模板，例如 `file:///project/{+path}`，适用于规模过大或变化过快、无法逐项列举的资源族。`resources/read` 接收 `uri`，在 `contents` 中返回一个或多个内容项。

内容项分两种结构：文本为 `{uri, mimeType, text}`；二进制为 `{uri, mimeType, blob}`，其中 `blob` 是 base64 编码的字节。一次读取可以返回多项内容，例如一个代表目录的资源，可以在同一个 `contents` 数组中返回其下多个文件，每项都有自己的 `uri` 和 `mimeType`。

URI 方案需要经过设计。只有具备相应能力的客户端能够不经 MCP 服务器、直接从网页获取相同内容时，才使用 `https://`；如果服务器是内容的唯一访问路径，宜遵循 RFC 3986，使用 `file://`、`git://` 或自定义方案。`file://` URI 不必对应真实文件系统上的路径，只需是服务器理解的稳定、带命名空间的标识。因此，服务器可以从内存树提供 `file:///project/{+path}`，同时像遍历真实目录一样校验每次展开结果：查询前，先相对于一个虚拟根目录规范化路径片段，确保任何 `..` 序列都不能使查询越过该根目录。

资源错误的处理与工具不同。请求 URI 不存在时，服务器返回 JSON-RPC 错误 `-32602`（Invalid params），并用 `data.uri` 标明请求目标。SEP-2164 有意采用这个错误：`-32602` 通常表示参数无效，不存在的 URI 正属于客户端提供但无法对应服务器内容的参数。旧版服务器使用 `-32002`，它来自 JSON-RPC 服务器错误范围，规范从未正式将它保留给这一含义。2026-07-28 服务器不能再发送该代码，但需要与旧版对端互通的客户端仍应识别它。无论新旧错误码，服务器都不能用正常结果加空 `contents` 数组表示资源不存在；空数组无法区分资源存在但为空与资源根本不存在，因此协议将缺失明确表示为错误响应。

`resources/read` 是完整结果必须携带缓存提示的六个方法之一。`ttlMs` 表示客户端可将结果视为新鲜内容的毫秒数；`cacheScope` 取 `public` 或 `private`。对所有调用方内容相同的资源，例如公开变更日志，可以使用 `public` 和较长 `ttlMs`。属于单个用户的数据必须使用 `private`，避免一位调用方的读取结果满足另一位调用方的缓存请求。`cacheScope` 仅说明缓存副本的共享范围，本身不执行访问控制，因此服务器仍须对每次读取进行授权，无论之后报告什么缓存范围。

资源还可携带 `audience`、`priority` 和 `lastModified` 注解，帮助宿主决定优先展示什么。`subscribe` 能力标志允许客户端通过 `subscriptions/listen` 和 `resourceSubscriptions` 过滤器监视 URI 变化，替代已移除的独立订阅调用。流的确认、多路分发和取消机制会在后续课程专门展开；请求本身仍采用消息封套课程以来一直使用的无状态、每请求 `_meta` 结构。

```figure
mcpa-12-resource-read
```

## 交互实验（Interactive Lab）

图中跟踪 URI 从模板到结果的过程。左侧模板 `file:///project/{+path}` 将路径片段展开为具体 URI；`+` 保留嵌套路径中的斜杠，而普通 `{path}` 展开会将其转义。中间是 `resources/read`，先按服务器根目录校验展开的 URI，再执行查询。随后分成两条路径：能定位真实内容的 URI 返回含 `contents`、`ttlMs` 和 `cacheScope` 的完整结果；无法定位内容的 URI，无论从未注册还是 `..` 试图越过根目录，都返回 `-32602`，在 `data.uri` 中指出目标，不能静默返回空 `contents`。阅读代码前先跟踪两条路径，它们代表每个资源服务器都必须正确处理的两种结果。

## 实践实验（Practice Lab）

打开 `code/main.py`。它构建一个内存工作区服务器，包含 `README.md`、`src/` 下的两个文件、二进制 `logo.png`、使用 `git://` URI 的版本化变更日志，以及使用 `user://` URI 的私有笔记。在本课目录运行：

```bash
python3 code/main.py
```

将输出报文与概念部分对照。`resources/list` 返回按 URI 排序的目录，并携带 `cacheScope: public` 与 `ttlMs`。`resources/templates/list` 返回模板 `file:///project/{+path}`，演示将其以 `path=src/utils.py` 展开后直接读取。读取目录项 `file:///project/src` 时，同一 `contents` 数组包含两个内容项，每个对应目录下一个文件。读取 `logo.png` 返回 `blob` 而非 `text`，可解码并与源字节比较。读取 `user://alice/notes/welcome` 得到 `cacheScope: private` 和较短 `ttlMs`，因为内容属于单个用户，不能与所有可连接服务器的调用方共享。最后两次读取故意失败：未注册 URI 返回 `-32602` 并设置 `data.uri`；通过 `..` 片段试图离开项目根目录的 URI 无法解析为有效资源，以相同方式失败，不会访问受限根目录外的文件。修改模板展开目标或添加自己的资源，再次运行，观察目录和读取结果同步变化，客户端无须修改。

## 交付物（Shipped Artifact）

`outputs/resource-design-guide.md` 提供设计与审查资源的一页参考：URI 方案选择表、三个方法及其返回内容、两种内容结构、围绕 `-32602` 与 `data.uri` 的错误处理清单、缓存范围决策表，以及 URI 清理和边界校验的安全检查项。编写或评审资源处理器时可逐项对照。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证以下主张：目录有序且携带缓存提示；模板展开后读取正确文件；二进制读取包含 base64 `blob`；缺失 URI 返回 `-32602` 和 `data.uri`；`..` 无法解析到项目根目录以外；目录读取返回多个内容项；私有笔记携带 `cacheScope: private`；缺少正确协议元数据的请求，与其他方法一样被拒绝。仓库报文检查器还依据 2026-07-28 规则验证同一记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/12-the-resources-primitive
```

## 与综合实践的联系（Capstone Connection）

综合实践的单份端到端记录，除工具调用和同意授权外，还需要至少一次资源读取，并按本课规则处理错误：缺失资源返回带 `data.uri` 的 `-32602`，不能只给空 `contents`；每个完整读取结果都包含 `ttlMs` 与 `cacheScope`。也要延续先做路径清理和边界校验、再查询的习惯，综合实践中的授权检查同样依赖这一纪律。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 资源（Resource） | 通过 URI 标识、由应用选择的内容 |
| `resources/list` | 返回调用方可见的资源目录和缓存提示 |
| `resources/templates/list` | 返回适用于资源族的 RFC 6570 URI 模板 |
| `resources/read` | 针对 URI，在 `contents` 中返回一个或多个内容项 |
| 文本内容（Text content） | 使用 `{uri, mimeType, text}` 结构 |
| 二进制内容（Binary content） | 使用 `{uri, mimeType, blob}` 结构，blob 采用 base64 编码 |
| `-32602` | Invalid params；缺失或无效资源 URI 的错误码，携带 `data.uri` |
| `ttlMs` | 客户端可将缓存读取结果视为新鲜内容的毫秒数 |
| `cacheScope` | `public` 可共享，`private` 限定于一个授权上下文 |
| `subscriptions/listen` | 监视资源变化的现代方式，替代已移除的 `resources/subscribe` |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：资源（Resources）](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP 规范 2026-07-28：缓存（Caching）](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10 节
- `phases/13-tools-and-protocols/10-mcp-resources-and-prompts`，深入构建资源与提示词服务器
