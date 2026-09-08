# FIPA-ACL 与言语行为的传承（Heritage of FIPA-ACL and Speech Acts）

> 在 MCP 和 A2A 之前，已有 FIPA-ACL。2000 年，IEEE 智能物理智能体基金会批准了一种智能体通信语言，包含二十种施为类型（Performative）、两种内容语言，以及契约网、订阅/通知、条件请求等交互协议。它因本体（Ontology）开销对 Web 过重而淡出行业，但 LLM 带来的多智能体复兴正在悄然重现同样的思想，只是没有形式语义：JSON 契约代替施为类型，自然语言代替本体。本课认真研读 FIPA-ACL，帮助你识别 2026 年协议决策中哪些是重新发明、哪些是真正创新，以及当前浪潮将在哪些地方再次遇到 2000 年代已解决的问题。

**Type:** Learn
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 01 为什么使用多智能体（Why Multi-Agent）
**Time:** ~60 分钟

## 问题（Problem）

2026 年的智能体协议领域十分繁忙：MCP 面向工具，A2A 面向智能体，ACP 面向企业审计，ANP 面向去中心化信任，NLIP 面向自然语言内容，还有 CA-MCP 及二十多项研究提案。每份规范都宣称自己具有基础性地位。

坦率地说，其中大部分都在重新发现一棵二十年前就已有的具体决策树。Austin（1962）和 Searle（1969）的言语行为理论（Speech-act theory）提出“话语就是行动”。KQML（1993）将其变成线上传输协议。FIPA-ACL（2000 年批准）完成了具有参考意义的标准化：二十种施为类型、SL0/SL1 内容语言，以及契约网和订阅通知交互协议。JADE 和 JACK 是 Java 参考平台。到 2010 年左右，这项工作因本体开销过重、Web 占据优势而逐渐衰落。

当你查看 MCP 的 `tools/call`、A2A 的任务生命周期或 CA-MCP 的共享上下文存储时，看到的是 FIPA 决策的一个约束更宽松、JSON 原生的翻版。了解这段传承可以告诉你两件事：哪些新“创新”其实是重新发明，以及新规范会再次遇到哪些旧故障模式。

## 概念（Concept）

### 一段话理解言语行为（Speech acts, in one paragraph）

Austin 注意到，一些句子不是描述世界，而是在改变世界。“我承诺。”“我请求。”“我宣布。”他称其为施为话语（Performative utterance）。Searle 将其形式化为五类：断言、指令、承诺、表达和宣告。KQML（Finin 等，1993）将其应用于软件智能体：一条消息由施为类型（行动）和内容（行动所针对的事物）组成。FIPA-ACL 弥补了 KQML 的缺口，并围绕二十种施为类型进行标准化。

### FIPA 的二十种施为类型，部分列表（The twenty FIPA performatives）

| 施为类型（Performative） | 意图 |
|---|---|
| `inform` | “我告诉你 P 为真” |
| `request` | “我请求你执行 X” |
| `query-if` | “P 为真吗？” |
| `query-ref` | “X 的值是什么？” |
| `propose` | “我提议我们执行 X” |
| `accept-proposal` | “我接受该提案” |
| `reject-proposal` | “我拒绝该提案” |
| `agree` | “我同意执行 X” |
| `refuse` | “我拒绝执行 X” |
| `confirm` | “我确认 P 为真” |
| `disconfirm` | “我否认 P” |
| `not-understood` | “你的消息无法解析” |
| `cfp` | “征集关于 X 的提案” |
| `subscribe` | “X 变化时通知我” |
| `cancel` | “取消正在进行的 X” |
| `failure` | “我尝试了 X，但失败了” |

完整列表见 `fipa00037.pdf`（FIPA ACL 消息结构）。重点不是背诵，而是认识到其中每一项都对应 LLM 协议最终会重新加入的一种原语（Primitive）。

### 标准 FIPA-ACL 消息（Canonical FIPA-ACL message）

```
(inform
  :sender       agent1@platform
  :receiver     agent2@platform
  :content      "((price IBM 83))"
  :language     SL0
  :ontology     finance
  :protocol     fipa-request
  :conversation-id   conv-42
  :reply-with   msg-17
)
```

七个字段承载协议信封（Envelope），一个字段（`content`）承载有效载荷（Payload）。其余字段正是每次为 JSON 协议补上重试、会话串联和本体时会重新发明的内容。

### 两个传统平台（The two legacy platforms）

**JADE**（Java Agent DEvelopment framework，1999–2020 年代）曾是使用最多的 FIPA 兼容运行时。智能体继承基类、交换 ACL 消息、在容器内运行，并通过“行为（Behavior）”协调。交互协议库提供了契约网、订阅通知、条件请求和提议接受协议。

**JACK**（Agent Oriented Software，商业产品）在 FIPA 消息之上强调信念-愿望-意图（Belief-Desire-Intention，BDI）推理。形式化程度更高，采用者更少。

Web 技术栈接管多智能体用例后，两者都走向衰落。MCP 和 A2A 是 2026 年的运行时“容器”。

### FIPA 为何衰落（Why FIPA faded）

- **本体开销（Ontology overhead）。** FIPA 要求使用共享本体解析 `content`。就本体达成一致是耗时数年的标准制定过程，而 Web 直接使用 HTTP + JSON。
- **无人采用的形式语义（Formal semantics）。** 语义语言（Semantic Language，SL）给出了严格的真值条件，但大多数生产系统使用自由格式内容，忽略形式化规定。
- **工具锁定（Tooling lock-in）。** JADE 仅支持 Java；JACK 是商业产品。多语言团队绕开了两者。
- **互联网技术栈胜出。** REST，随后是 JSON-RPC 和 gRPC，取代了 ACL 的传输方式。

### LLM 复兴是轻量版 FIPA（The LLM revival is FIPA-lite）

比较 FIPA 的 `request` 与 MCP 的 `tools/call`：

```
(request                                {
  :sender  agent1                         "jsonrpc": "2.0",
  :receiver tool-server                   "method":  "tools/call",
  :content "(lookup stock IBM)"           "params":  {"name":"lookup_stock",
  :ontology finance                                   "arguments":{"symbol":"IBM"}},
  :conversation-id c42                    "id": 42
)                                        }
```

相同的信封，不同的语法。两者都携带：谁发出、发给谁、意图、有效载荷、关联标识符（Correlation id）。彼此都谈不上革命，不过是同一设计中的不同权衡。

Liu 等人 2025 年的综述（《智能体互操作协议综述：MCP、ACP、A2A、ANP》，arXiv:2505.02279）明确指出了这一谱系：MCP 对应工具使用言语行为，A2A 对应智能体对等言语行为，ACP 对应审计轨迹言语行为，ANP 对应去中心化身份扩展。新规范是采用 JSON 语法和更宽松语义的 ACL 后代。

### 直说这种权衡（The trade-off, stated plainly）

**FIPA 提供而现代规范舍弃的内容：**

- 形式语义：可以证明 `inform` 意味着发送者相信消息内容。
- 标准施为类型目录：不必再次争论“是否应该有 `cancel`？”。
- 几十年积累的交互协议模式，如契约网、订阅通知、提议接受，且具有已知的正确性性质。

**现代规范提供而 FIPA 没有的内容：**

- 与所有现代工具兼容的 JSON 原生有效载荷。
- LLM 无需手工编码本体即可理解的自然语言内容。
- Web 技术栈传输方式（HTTP、SSE、WebSocket）。
- 通过实时 MCP `server/discover` 和 A2A 智能体卡片（Agent Card）发现能力。

用更宽松的意图语义换取更容易的实现。这就是确切的权衡。

### 值得移植的交互协议（Interaction protocols worth porting）

FIPA 提供了约 15 种交互协议。其中三种值得沿用到 LLM 多智能体系统：

1. **契约网协议（Contract Net Protocol，CNP）。** 管理者发出 `cfp`（征集提案）；竞标者以 `propose` 响应；管理者接受或拒绝。这是标准任务市场模式（阶段 16 · 16 协商）。
2. **订阅/通知（Subscribe/Notify）。** 订阅者发送 `subscribe`；发布者在主题变化时发送 `inform`。2026 年的每个事件总线都采用这个思路。
3. **条件请求（Request-When）。** “条件 Y 成立时执行 X。”即带前置条件的延迟行动。2026 年对应的是持久工作流引擎中的延后任务（阶段 16 · 22 生产扩展）。

每一种都能自然映射到现代消息队列、HTTP + 轮询或 SSE 流式传输。

### 舍弃本体会破坏什么（What breaks when you drop the ontology）

没有共享本体时，智能体从自然语言内容推断含义。2026 年已有记录的故障模式是**语义漂移（Semantic drift）**：两个智能体用同一个词（`"customer"`）表示略有不同的概念，接收者按错误解释行动，而模式校验器无法发现。FIPA 的本体要求本会在解析阶段拒绝该消息。

不采用完整本体时的缓解措施：

- 为 `content` 使用 JSON Schema：在线路边界拒绝结构错误。
- 类型化交付物（Typed artifacts，A2A）：拒绝错误模态。
- 在信封中明确施为类型：即使内容是自然语言，意图也不会含糊。

### 2026 年规范与言语行为传统的映射（The 2026 specs, mapped to speech-act heritage）

| 现代规范 | FIPA 对应物 | 保留内容 | 舍弃内容 |
|---|---|---|---|
| MCP `tools/call` | `request` | 显式意图、关联标识符 | 形式语义、本体 |
| MCP `resources/read` | `query-ref` | 显式意图、关联标识符 | 形式语义 |
| A2A 任务生命周期 | 契约网 + 条件请求 | 异步生命周期、状态转换 | 形式完备性保证 |
| A2A 流式事件 | 订阅/通知 | 异步推送 | 类型化谓词订阅 |
| CA-MCP 共享上下文 | 黑板（Blackboard，Hayes-Roth 1985） | 多写入者共享内存 | 逻辑一致性模型 |
| NLIP | 自然语言内容 | LLM 原生 | 模式（Schema） |

从上到下阅读此表，规律是：保留结构原语，舍弃形式化约束，让 LLM 弥合歧义。

```figure
sw-contract-net
```

## 动手实现（Build It）

`code/main.py` 实现了仅使用标准库的 FIPA-ACL 转换器。它编码和解码标准 ACL 信封，展示每种 MCP / A2A 消息形状如何归结为同样七个字段。演示会：

- 将五条 MCP 风格和 A2A 风格消息编码为 FIPA-ACL。
- 将 FIPA-ACL 解码回现代等价形式。
- 使用 `cfp`、`propose`、`accept-proposal`、`reject-proposal`，在一个管理者与三个竞标者之间运行简化的契约网协商。

运行：

```
python3 code/main.py
```

输出以并排轨迹展示每条现代消息的 2026 年 JSON 形式与 FIPA-ACL 形式，然后展示一次契约网竞标的往返转换。同样的协议原语在往返中得以保留，只有语法不同。

## 实际应用（Use It）

`outputs/skill-fipa-mapper.md` 是一项技能，可读取任意智能体协议规范并生成 FIPA-ACL 映射。采用新协议之前，用它回答：“这真的新颖，还是采用 JSON 语法的 `inform`？”

## 交付成果（Ship It）

不必复兴 FIPA-ACL，而应带回它的检查清单：

- 每条消息的意图原语（施为类型）是什么？
- 请求响应和取消是否有对应的关联标识符？
- 是否明确内容语言（JSON-RPC、纯文本、结构化类型交付物）？
- 交互协议是否是一等公民，还是你在从头实现契约网？
- 两个智能体对内容含义存在分歧（语义漂移）时，会发生什么？

任何新协议进入生产环境之前，都应记录这五个问题的答案。

## 练习（Exercises）

1. 运行 `code/main.py`，观察往返编码。指出 `tools/call`、`resources/read` 和 A2A 任务创建各对应哪种 FIPA 施为类型。
2. 为契约网演示增加 `cancel` 施为类型，让管理者在竞标期间撤回任务。`cancel` 解决了哪种单靠重试无法解决的故障情况？
3. 阅读 FIPA ACL 消息结构（http://www.fipa.org/specs/fipa00037/）第 4.1–4.3 节。选择一个本课未覆盖的施为类型，描述其现代 JSON-RPC 对应物。
4. 阅读 Liu 等人的 arXiv:2505.02279。分别列出 MCP、A2A、ACP、ANP 保留和舍弃的 FIPA 施为类型族。
5. 为你自己的系统中 `request` 施为类型的 `content` 字段设计最小 JSON-Schema。相比纯自然语言，这个模式提供了什么，又付出什么代价？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 言语行为（Speech act） | “做事的话语” | Austin/Searle：话语就是行动。ACL 的理论源头。 |
| FIPA | “那个老 XML 东西” | IEEE 智能物理智能体基金会（Foundation for Intelligent Physical Agents），2000 年将 ACL 标准化。 |
| 智能体通信语言（Agent Communication Language，ACL） | “智能体通信语言” | FIPA 的信封格式：施为类型 + 内容 + 元数据。 |
| 施为类型（Performative） | “动词” | 消息的意图类别：`inform`、`request`、`propose`、`cfp` 等。 |
| 知识查询与操作语言（Knowledge Query and Manipulation Language，KQML） | “FIPA 的前身” | 1993 年提出，更简单，范围更窄。 |
| 本体（Ontology） | “共享词汇表” | 对内容语言所涉及概念的形式化定义。 |
| SL0 / SL1 | “FIPA 内容语言” | 语义语言（Semantic Language）第 0 与第 1 级，形式化内容语言族。 |
| 契约网（Contract Net） | “任务市场” | 管理者发出 cfp，竞标者提议，管理者接受。标准交互协议。 |
| 交互协议（Interaction protocol） | “消息模式” | 具有已知正确性的施为类型序列，如条件请求、订阅通知等。 |

## 延伸阅读（Further Reading）

- [Liu 等：智能体互操作协议综述（A Survey of Agent Interoperability Protocols: MCP, ACP, A2A, ANP）](https://arxiv.org/html/2505.02279v1)：将现代规范与 FIPA 传统相联系的 2025 年权威综述
- [FIPA ACL 消息结构规范（FIPA ACL Message Structure Specification，fipa00037）](http://www.fipa.org/specs/fipa00037/)：2000 年批准的信封格式
- [FIPA 通信行为库规范（FIPA Communicative Act Library Specification，fipa00037）](http://www.fipa.org/specs/fipa00037/)：完整施为类型目录
- [MCP 规范（MCP specification）2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)：当前无状态工具使用中 `request`/`query-ref` 的对应物
- [A2A 规范（A2A specification）](https://a2a-protocol.org/latest/specification/)：现代智能体对等交互中契约网和订阅通知的对应物
