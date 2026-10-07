# 阅读 MCP 规范（Reading the MCP Specification）

> 规范使用具有约束力的文字：MUST 决定实现必须做什么，SHOULD 留出判断空间，功能的 Deprecated 状态则告诉你还能依赖它多久。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 00 课
**Time:** ~45 minutes

## 学习目标（Learning Objectives）

- 掌握规范结构，区分所有实现 MUST 支持的部分与按需增加的部分。
- 正确理解 RFC 2119 和 RFC 8174 关键字的约束强度，包括小写词不具有规范性效力的规则。
- 解释 schema.ts 与 schema.json 的关系，以及 TypeScript 文件为何是权威来源。
- 区分修订版的 Draft、Current、Final 状态与功能自身的 Active、Deprecated、Removed 状态。
- 沿变更日志追溯对应的 SEP，并根据弃用窗口计算功能最早可能移除的时间。

## 问题（The Problem）

本课程的每项事实都追溯到同一份文档：modelcontextprotocol.io 上基于 TypeScript 模式构建的规范。团队如果依靠博客、训练数据早于当前修订版的模型，或对旧版本的记忆学习 MCP，就会偏离规范的实际要求；考试依据规范编写。即使某个实现准确遵循 2025-06-18 版本，只要没有重读现行文本，仍可能错误实现 2026-07-28，因为旧版 MUST 可以被不同规则替代，曾处于协议核心的功能也可能转为 Deprecated，并附带迁移路径，同时继续按原方式运行。

阅读规范本身就是一种技能：找到规范性文本，理解关键字对实现的约束，区分文档成熟度与单项功能状态，并追溯产生规则的提案，避免只相信摘要。

## 概念（The Concept）

规范由几个主要部分组成：架构、基础协议、版本与兼容性、消息模式、授权、服务器功能、客户端功能和实用功能，之上还可叠加可选扩展。概览明确规定，所有实现 MUST 支持基础协议、版本管理和消息模式。其他部分，包括授权、服务器功能、客户端功能和实用功能，都 MAY 按应用需要实现。这句话划定最低要求：一个不提供资源和提示词、只通过 stdio 提供工具且完全不使用授权的服务器，只要正确实现基础协议、版本管理和消息模式，仍可符合 MCP 规范。

本课程和考试涉及的全部消息结构，最终都来自规范仓库中的 TypeScript 模式文件 schema.ts。说明页面用于帮助阅读该模式；当文字与模式似乎不一致时，以 schema.ts 为准。schema.json 由 schema.ts 自动生成，供不能解析 TypeScript 的工具使用，不具有独立权威。题目涉及结果或错误的精确结构时，应到模式文件中寻找答案。

规范性语言遵循 BCP 14，即 RFC 2119 与 RFC 8174 的组合。MUST、MUST NOT、REQUIRED、SHALL、SHALL NOT、SHOULD、SHOULD NOT、RECOMMENDED、NOT RECOMMENDED、MAY、OPTIONAL 只有完全以大写形式出现时，才具有各自定义的约束强度。小写的“client must not batch requests”属于普通说明，没有规范性约束；同样内容写为 MUST NOT 才构成硬性禁止。因此必须关注大小写。MUST 和 MUST NOT 是实现不可违反的底线；SHOULD 和 SHOULD NOT 是强烈建议的默认做法，只有具体且充分理解的理由才能覆盖；MAY 和 OPTIONAL 则提供真正的可选项，不预设选择方向。

整份带日期的规范修订版有三种状态。Draft 表示仍在编写，不适合直接采用。Current 是正在使用的唯一修订版；本课程对应的 Current 为 2026-07-28，它仍可接收向后兼容的更改。YYYY-MM-DD 形式的版本标识代表最后一次发生不兼容更改的日期，因此 Current 可以吸收兼容修正而不更名。Final 表示过去的完整版本，不再变更。协议采用无状态设计；客户端要知道服务器支持哪个版本，无须猜测文档，可以调用规范入口 server/discover，直接从报文中读取答案。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "server/discover",
  "params": {
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "supportedVersions": ["2026-07-28"],
    "capabilities": {"tools": {"listChanged": false}},
    "ttlMs": 300000,
    "cacheScope": "public"
  }
}
```

Current 修订版中的每项功能，一条消息、一种能力或一种传输，具有独立于修订版标签的状态。Active 表示按要求实现，尚无移除计划。Deprecated 表示仍有完整定义并能正常工作，但已提供迁移路径且计划移除，新实现不应再采用。Removed 表示已从草案规范删除，不会进入下一份 Current 修订版。Roots、Sampling、Logging 和 Dynamic Client Registration 在 2026-07-28 中均为 Deprecated，仍按规范正常工作，支持它们的服务器和客户端不会立即失效。弃用功能注册表集中列出所有 Deprecated 或 Removed 功能，读者无须从零散变更日志拼凑全貌。

弃用政策给出最短期限，而非固定移除日程。功能必须保持 Deprecated 至少十二个月，才具备移除资格。窗口从首次将其标记为 Deprecated 的规范修订版发布日计算，不从相关提案达到 Final 的日期计算。窗口结束后的首个 Current 修订版，是最早可能移除该功能的版本；是否在该版、之后某版移除，或继续保留 Deprecated 状态，由核心维护者在发布准备阶段决定。Roots、Sampling、Logging 和 Dynamic Client Registration 都在 2026-07-28 发布的修订版中被标记为 Deprecated，因此共同的最早移除机会是 2027-07-28 当天或之后发布的首个版本，与单项提案的进度无关。

规范的重大变更，新功能、破坏性变更、治理变更，都经过规范增强提案（Specification Enhancement Proposal，SEP）。它是 seps 目录中的 Markdown 文件，记录动机、精确规范文本、设计理由、向后兼容性和安全影响。SEP 经历草案和评审，随后被接受或拒绝；只有具备参考实现，并且对有可观测行为的标准类变更提供一致性场景后，才达到 final。扩展类（Extensions Track）SEP 遵循同样流程，但描述可选扩展。每条变更日志都会引用对应 SEP；认真阅读提案才能核实规则。本课使用的功能生命周期与弃用政策来自 SEP-2596，这是一份通过完整描述上述机制而达到 Final 的流程类（Process）SEP。

JSON-RPC 批处理是制定生命周期政策时要避免重演的例子：它在 2025-03-26 发布的版本中加入，仅隔一个版本，就于 2025-06-18 被移除，完全没有弃用期。在 2026-07-28 的政策下，同类变更应先提供至少十二个月的 Deprecated 窗口和书面迁移路径。

```figure
mcpa-01-spec-map
```

## 交互实验（Interactive Lab）

图示围绕一个根节点展开规范：三个 MUST 方框代表基础协议、版本管理和消息模式；四个 MAY 方框代表授权、服务器功能、客户端功能和实用功能。下方三个标签展示功能自身从 Active 到 Deprecated 再到 Removed 的生命周期，这些状态属于功能，独立于规范修订版。某个类别可以是 MUST，而其下的具体实现选择，例如服务器提供哪些工具或资源，仍完全由实现决定。

## 实践实验（Practice Lab）

打开 `code/main.py`。它没有网络调用，将规范建模为数据，而不连接真实服务器：包括弃用功能注册表、按 SEP 编号索引的小型变更日志，以及关键字分类器。

```bash
python3 code/main.py
```

将输出与概念部分对照。`classify_requirement` 读取句子并返回约束强度；同样的词写成小写时返回 `unspecified`，不会返回 `forbidden`。`feature_state` 查询指定修订版中 roots、sampling 或 JSON-RPC batching 是 active、deprecated 还是 removed。`earliest_removal` 根据弃用窗口计算 2027-07-28，无须硬编码该结果。`changelog_lookup` 根据 SEP 编号返回引用它的记录。最后，演示发送一个 `server/discover` 请求并打印交互，同时故意展示缺少必需 `_meta` 块的请求；符合规范的服务器必须拒绝它。可以为 `DEPRECATED_REGISTRY` 添加带独立窗口的新记录，或更改 `include-context-this-server-all-servers` 跟随哪个功能的时间安排，再运行观察 `earliest_removal` 和 `feature_state` 如何随数据变化，无须调整其他代码。

## 交付物（Shipped Artifact）

`outputs/spec-reading-guide.md` 是阅读真实规范时可随手参考的单页指南，包含 MUST 支持项、关键字强度表、修订版状态与功能状态的区别，以及带准确时间锚点的弃用规则。在向同事解释或回答考试题目中“某项内容是否仍有效”之前，用它逐项核查。

## 验证结果（Verify It）

从课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课主张：MUST 和 MUST NOT 分别归类为 required、forbidden；相同小写词归类为 unspecified；SHOULD 和 MAY 对应 recommended、optional；SHOULD NOT 与 NOT RECOMMENDED 均为 not recommended；功能在弃用版本之前为 active，在该版本及以后为 deprecated；只有移除日期、没有 Deprecated 阶段的功能不会被误报为 current；最早移除时间根据十二个月窗口计算；跟随另一功能时间安排的功能具有相同最早移除时间；未知功能名得到妥善处理而不抛异常；SEP 编号可以找到变更记录，未知 SEP 返回空；查询修订版可正确报告 Current、Final 或 unknown。仓库的报文检查器还会依据 2026-07-28 规则校验交互记录。以下命令从仓库根目录运行：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/01-reading-the-specification
```

## 与综合实践的联系（Capstone Connection）

综合实践将端到端组装一次完整的 2026-07-28 交互，要求你无须临时查询，就能判断消息结构、错误码或所用功能是否仍适用。后续每课都会引用具体规范页面或 SEP，并沿用这里的方法：根据关键字强度、功能状态和真正产生规则的提案阅读。当综合实践或考试依赖 MUST 与 SHOULD、Deprecated 与 Removed 的区别时，你使用的就是本课建模的同一注册表和关键字。

## 关键术语（Key Terms）

| 术语 | 含义 |
|------|------|
| 基础协议（Base protocol） | 每个实现 MUST 支持的 JSON-RPC 消息结构 |
| BCP 14 | RFC 2119 与 RFC 8174 规定：MUST、SHOULD、MAY 等只有全大写时才具有规范性强度 |
| schema.ts | 定义所有 MCP 消息和结构的权威 TypeScript 文件 |
| 当前修订版（Current revision） | 唯一正在使用的规范修订版；本课程对应 2026-07-28 |
| Draft、Current、Final | 规范修订版的三种状态：草案、现行、定稿 |
| Active | 按规范要求实现，且尚无移除计划的功能状态 |
| Deprecated | 仍有定义并能运行，但已提供迁移路径、计划移除的功能状态 |
| Removed | 功能已从草案规范中删除的状态 |
| 最早移除时间（Earliest removal） | 弃用最短窗口结束当天或之后发布的首个 Current 修订版 |
| SEP | 规范增强提案，用于提出并记录规范变更的 Markdown 文档 |

## 延伸阅读（Further Reading）

- [MCP 2026-07-28 规范](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP 2026-07-28 规范：基础协议](https://modelcontextprotocol.io/specification/2026-07-28/basic)
- [MCP 2026-07-28 规范：变更日志](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP 2026-07-28 规范：弃用功能](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
- [功能生命周期与弃用政策](https://modelcontextprotocol.io/community/feature-lifecycle)
- [SEP 指南](https://modelcontextprotocol.io/community/sep-guidelines)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 1、15 节。
- `phases/13-tools-and-protocols/31-mcp-conformance-versioning-and-operations`：基于这些版本规则构建一致性验证框架。
