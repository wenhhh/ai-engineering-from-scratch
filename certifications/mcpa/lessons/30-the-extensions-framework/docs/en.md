# 扩展框架（The Extensions Framework）

> 扩展提供核心之外的可选能力：以必需的供应商前缀命名，在每个请求中重新声明，并允许不支持的一方回退，让核心协议不必容纳所有厂商的设计。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 29 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 根据必需供应商前缀识别合法扩展标识，并举出官方和第三方标识示例
- 说明客户端通过 `_meta`、服务器通过发现结果在何处声明支持，以及如何以每请求声明替代一次性握手
- 根据客户端请求和服务器实际支持，计算当前请求的有效扩展集合
- 实施平稳回退：可选扩展不可用时采用核心行为；调用依赖的必需扩展未被双方共同启用时拒绝请求
- 跟踪扩展从实验孵化、Extensions Track SEP 到官方标识的生命周期，并指出何种变更必须使用新标识

## 问题（The Problem）

MCP 核心规范必须保持为每个实现都能完整支持的共同基础，才能让客户端发现并使用此前从未见过的服务器。真实部署还需要一些不适合强制所有人实现的能力：用交互图表代替大段文字、提交慢任务后轮询、没有浏览器参与的机器间认证，或发布可复用操作流程。若核心不断吸收这些能力，规范就会持续扩张。两年前构建的服务器，可能只因后来加入了从未需要的功能，就悄悄失去完整符合 MCP 的资格。

没有共同约定而自行添加能力更糟。两个厂商都要让服务器渲染界面，却选择不同 `_meta` 字段；客户端无法可靠询问对方是否理解它；安全评审者也没有统一位置查询含义。具体到实现，服务器团队希望调用方支持时返回更丰富结果，却不知道如何声明，避免旧客户端因陌生字段出错；客户端团队则希望在依赖某项功能构造请求前，确认这台服务器在这次调用中确实支持它。

## 概念（The Concept）

MCP 扩展是在核心协议之外增加的可选能力，双方都可以选择是否实现，并通过命名避免无关厂商冲突。标识采用 `{vendor-prefix}/{extension-name}`，前缀必填。规则类似 `_meta` 键，但扩展不允许省略前缀。MCP 维护的官方扩展使用 `io.modelcontextprotocol`，例如 `io.modelcontextprotocol/oauth-client-credentials`。第三方应采用自己实际控制的反向域名；拥有 example.com 的组织可发布 `com.example/my-extension`。没有斜杠的裸名称并不合法，因为没有命名空间区分不同厂商。

双方都将支持信息放进消息数据中，不依赖一次性初始化。客户端在当前请求的 `_meta["io.modelcontextprotocol/clientCapabilities"].extensions` 声明希望使用的扩展，将标识映射到设置对象：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {"location": "New York"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {
        "extensions": {
          "io.modelcontextprotocol/ui": {"mimeTypes": ["text/html;profile=mcp-app"]}
        }
      }
    }
  }
}
```

服务器在 `server/discover` 结果的 `capabilities.extensions` 中声明自己实现的扩展，使用相同映射结构：

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {
      "tools": {},
      "extensions": {"io.modelcontextprotocol/ui": {}}
    },
    "ttlMs": 3600000,
    "cacheScope": "public"
  }
}
```

空设置对象 `{}` 是完整且合法的声明，表示支持但无需额外配置。非空对象则携带该扩展定义的细粒度配置，例如上面的 `mimeTypes`。客户端声明随 `_meta` 在每次调用重新发送，上一次不会延续到下一次。这沿用协议版本和其他能力的无状态规则，没有为扩展另设特殊会话。

某扩展仅在双方都声明时对当前调用生效：客户端在这个请求提出它，服务器能力也明确支持它。因此有效集合是两个映射按标识取交集。缺少必需前缀的错误标识，即使恰好同时出现在双方声明中，也不能进入结果。校验标识结构是计算有效集合的一部分，不能省略。

之后怎样处理，取决于扩展对这次调用是否必需。如果它只是叠加在已有能力上的增强，不支持的一方应得到核心行为：可提供交互仪表盘的工具，仍向未声明 UI 扩展的客户端返回有用文本。如果该调用必须依赖扩展，例如返回客户端没有扩展就无法轮询的持久任务句柄，则应明确拒绝，不能只回答一半。拒绝复用第 07 课的能力门禁：`MissingRequiredClientCapabilityError`，代码 `-32021`，以 `data.requiredCapabilities` 指出所需扩展，形如 `{"extensions": {"<identifier>": {}}}`。它沿用普通每请求能力错误，只是名称换成扩展标识。双方都须主动启用：SDK 无须实现任何扩展便可完整符合核心协议；即使实现了扩展，也应默认关闭，等待开发者显式启用。

扩展采用与核心功能不同的加入流程。它以 Extensions Track SEP 进入主 MCP 仓库；与 Standards Track 不同，提交 Core Maintainer 评审前，必须已经在官方 SDK 中具有可工作的参考实现。批准后，规范放到 modelcontextprotocol GitHub 组织内以 `ext-` 开头的仓库，例如授权扩展的 `ext-auth` 或 MCP Apps 的 `ext-apps`。Core Maintainer 保有最终权限，日常修改委托给该仓库维护者，无须每次重新经过核心评审。工作组或兴趣组也可在 SEP 之前，通过 `experimental-ext-` 仓库孵化想法；这类仓库明确标记为非官方，避免把原型当作承诺。Core Maintainer 仍可自行决定归档或移除实验仓库。

扩展独立于核心及其他扩展发布版本，新版无需核心再次评审。但破坏性变更有硬规则：删除或重命名字段、改变字段类型、改变现有行为含义，或增加新必需字段，都不能继续使用旧标识。需要新标识，通常增加后缀，例如 `io.modelcontextprotocol/my-extension-v2`，使仍声明旧标识的实现继续获得原行为。新增可选字段，或在设置对象中增加版本标记，只要没有改变原有契约，就无需新标识。

本课固定资料列出四类官方扩展。Tasks（`io.modelcontextprotocol/tasks`，SEP-2663）是第 21 课的持久任务：服务器返回任务代替阻塞，客户端随后轮询。MCP Apps（`io.modelcontextprotocol/ui`，SEP-1865）允许工具引用可在沙箱渲染的界面，下一课展开。Skills over MCP（`io.modelcontextprotocol/skills`，SEP-2640）让服务器发布可复用工作流指令，客户端通过已有资源原语发现并读取。以 `resources/read` 获取技能的 `SKILL.md` 只是在取回文本；技能内容仍是不可信输入，是否放入模型上下文须由明确用户策略决定。宿主应允许用户先查看；MCP 技能中扩大权限的前置字段，例如 `allowed-tools`，除非用户批准该授权，否则应忽略。`ext-auth` 中的授权扩展在核心授权之上增加客户端凭据及企业托管流程。每个客户端独立选择支持哪些扩展，设计依赖某项能力前应核对扩展站点的客户端支持矩阵。位于真实客户端与后端之间的网关，自身也是后端的客户端；它必须独立决定声明哪些能力，不能照搬原始调用方声明。声明自己无法正确中介的扩展，甚至比不声明更危险。

在更早版本中，扩展通过 `initialize` 请求的 `capabilities.extensions` 声明一次，在 `initialize` 响应中回传一次，随后假定整条连接都有效。SEP-2133 的历史文本仍保留当时结构。2026-07-28 已无连接级握手，也没有跨请求保存声明的位置，因此不能延用这一假设。客户端扩展现在随每个请求的 `_meta` 传递，服务器不能从该客户端或任何其他客户端先前的声明推断当前支持情况。

```figure
mcpa-30-extension-negotiation
```

## 交互实验（Interactive Lab）

图中并列客户端与服务器的扩展声明。`com.example/priority-routing` 同时出现在两个框中，汇入中间有效集合，这次调用得到增强行为。`io.modelcontextprotocol/ui` 只在客户端一侧，`io.modelcontextprotocol/tasks` 只在服务器一侧，都不进入交集。下方列出三种结果：可选扩展双方都支持时启用；仅一方支持时回退核心；必需扩展未被共同启用时，以指出缺失项的 `-32021` 拒绝。

## 实践实验（Practice Lab）

打开 `code/main.py`。`negotiate_extensions` 遍历客户端声明，只保留格式正确、且服务器 `extensions` 也包含的标识，再将交集与客户端设置配对返回。两个工具演示其用途。`summarize_incidents` 将 `com.example/priority-routing` 视为可选：未声明时返回普通“3 open incidents”；声明为空对象 `{}` 时仍启用，使用默认“standard”层级；声明 `{"tier": "gold"}` 时按该层级排序。`export_dataset` 将 `com.example/bulk-export` 视为必需：未声明时，服务器甚至不读取业务参数，直接返回 `-32021`，用 `data.requiredCapabilities` 指出扩展；声明后同一调用正常完成。

```bash
python3 code/main.py
```

依次跟踪八段交互。第七段在合法标识之外加入虚构的 `no-slash-here`。观察错误标识被忽略，而合法扩展仍生效：`is_well_formed_extension_id` 正是为此提供保证，即使请求其他部分完全正常也要执行检查。试着添加同时依赖两个扩展的第三个工具，观察 `_call` 先报告哪个缺失项。

## 交付物（Shipped Artifact）

`outputs/extension-negotiation-guide.md` 汇总标识格式、双方声明位置、可选启用／可选回退／必需拒绝三行决策表、从 SEP 到 `ext-` 仓库的流程，以及官方扩展标识清单，均引用研究简报。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证：官方和第三方格式的标识可通过，缺少前缀的裸名称不可通过；协商取双方支持的交集；未启用可选扩展时返回普通结果；空设置对象仍表示支持，非空设置影响行为；必需扩展未声明时以 `-32021` 及 `data.requiredCapabilities` 指出问题，声明后完成；错误标识即使同时存在于两侧也不会启用；`server/discover` 提供服务器扩展及真实缓存提示。仓库报文检查器也会按 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/30-the-extensions-framework
```

## 与综合实践的联系（Capstone Connection）

综合工具生态必须对照核心规范解释每个设计选择。扩展也需说明：行为应放进工具核心响应，还是置于客户端可能没有的扩展之后；不支持时如何回退。服务器提供超出三个核心原语的行为时，参考本课有效集合计算与 `-32021` 拒绝。解释为何不直接把期望行为加入核心时，参考扩展生命周期。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 扩展（Extension） | 核心协议之外的可选能力，以 `{vendor-prefix}/{extension-name}` 标识 |
| 供应商前缀（Vendor prefix） | 必需命名空间；官方使用 `io.modelcontextprotocol`，第三方使用自己的反向域名 |
| 设置对象（Settings object） | 能力声明中某项扩展的配置；`{}` 表示支持且无需配置 |
| 有效扩展集合（Active extension set） | 当前请求实际协商出的标识，即客户端声明与服务器支持的交集 |
| 平稳回退（Graceful degradation） | 可选扩展未共同启用时返回核心行为，避免请求失败 |
| `MissingRequiredClientCapabilityError` | `-32021`，调用需要当前 `clientCapabilities` 未声明的扩展或其他能力时返回 |
| 扩展仓库（Extension repository） | modelcontextprotocol 组织内以 `ext-` 开头、维护一项或多项官方扩展的仓库 |
| 实验扩展（Experimental extension） | 工作组或兴趣组在 `experimental-ext-` 仓库孵化、尚未正式通过提案的能力 |

## 延伸阅读（Further Reading）

- [MCP 扩展概览](https://modelcontextprotocol.io/extensions/overview)
- [SEP-2133：扩展](https://modelcontextprotocol.io/seps/2133-extensions)
- [扩展协商：MCP 版本管理](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning#extension-negotiation)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 14 节
- `phases/13-tools-and-protocols/17-mcp-gateways-and-registries`，从网关视角讲解每请求能力协商
