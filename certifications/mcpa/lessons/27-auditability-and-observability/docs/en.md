# 用同一个追踪 ID 关联审计与可观测性（One Trace ID Ties Auditability to Observability）

> 同一个追踪 ID 随调用经过客户端、服务器及其后续调用；哈希链则让审阅者在数月后检查记录是否出现了未被同步修改所掩盖的变化。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 26 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 按 SEP-414 规定的 W3C 格式，通过 `_meta` 在客户端、服务器及其代表调用方发起的上游调用之间传播 OpenTelemetry 上下文，包括 `traceparent`、`tracestate` 和 `baggage`
- 使用小写十六进制生成并校验 W3C `traceparent` 的四段内容：版本、追踪 ID、父跨度 ID 和标志；派生子跨度时保留追踪 ID，并为每一跳生成新的父跨度 ID
- 解释为何日志功能被弃用，迁移方向为 stdio 的 `stderr` 或结构化 OpenTelemetry 可观测性，以及弃用后每请求日志级别仍有什么作用
- 构建审计记录：使用已认证主体代替自报 `clientInfo`，在条目生成前脱敏已标记参数，并以请求 ID 和追踪 ID 关联活动
- 验证哈希链审计日志，解释篡改在何处、因何被发现，并理解缺少相应完整性措施的日志只是一份待验证记录

## 问题（The Problem）

某个账户的 API 密钥被轮换。这次调用实际经过两个程序：支持人员调用的服务台工具，以及该工具在后台请求写入新值的凭据库。一个月后，审阅者提出三个直接的问题：证明轮换确实发生过，证明是谁发起的，并证明展示的记录自写入以来没有被修改。两份分别属于各服务的日志，各用自己的时钟、各以离开进程便失去意义的请求 ID 索引，无法直接回答这些问题。它们反而引出了另一个问题：如何确认这两行描述的是同一个事件？

风险与安全控制一课构建了决定是否允许调用的那一层：固定工具定义、扫描注入指令、禁止向上游转发入站凭据。这些措施并不能证明实际运行了什么。控制措施决定能否执行，记录则保存执行过程。本课构建后者：一个贯穿请求所涉及各程序的关联值，以及各程序独立保存、可供审阅者检查修改痕迹的日志。

## 概念（The Concept）

MCP 的既有设计恰好解决了问题的一半。协议无状态，服务器不能从共享连接推断请求信息，因此每个请求已经在 `_meta` 中携带自己的协议版本和能力集合，JSON-RPC 与元数据一课最早介绍了这一结构。关联 ID 也适合放在这里。SEP-414 为其规定名称和格式，避免每个 SDK 各自发明：`traceparent`、`tracestate` 和 `baggage` 被保留为 `_meta` 前缀规则的一项有意例外，使 MCP 兼容已经按这些裸键名读取上下文的 OpenTelemetry 工具。

`traceparent` 由四段以连字符分隔的内容组成，使用小写十六进制，长度固定：两字符版本、32 字符追踪 ID、16 字符父跨度 ID，以及两字符标志字节。

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "reset_api_key",
    "arguments": {"account_id": "acct-42", "new_key": "k-8f2c9e"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
    }
  }
}
```

追踪 ID 标识整个操作，在其持续期间保持不变。父跨度 ID 标识其中一个跨度，即一跳对应的工作；参与方不应将别人的父跨度 ID 直接当作自己的。`ops-desk` 收到请求后，需要调用 `credential-vault` 才能实际轮换密钥，此时不会原样转发 traceparent：它生成新的父跨度 ID，保留同一追踪 ID，再将这对值作为出站调用自己的 `traceparent` 继续传递。

```python
def child_traceparent(value):
    parsed = parse_traceparent(value)
    return make_traceparent(parsed["trace_id"], new_span_id(), sampled=parsed["flags"] != "00")
```

全零追踪 ID 或全零父跨度 ID 都无效，这条 W3C 格式规则能拦住未正常工作的生成器。`tracestate` 与 `baggage` 的处理不同：转发它们不要求当前一跳修改值，因此本课服务器直接传递两者，调用方在第一跳设置的值会原样出现在最后一跳。

这里也能看出日志功能为何逐渐退出。该版本已将日志功能标记为弃用：过去依赖 `notifications/message` 获取运行信息的服务器，应在 stdio 上改用 `stderr`，需要结构化数据时采用 OpenTelemetry。原机制并未立即消失。请求若仍在 `_meta` 中设置 `io.modelcontextprotocol/logLevel`，仍可在自己的响应流收到达到或高于该级别的 `notifications/message`，但不能在其他流收到。即使日志通知最有用时，它也未提供持久性：这是一条实时消息流，观察者可能看到，也可能错过，无人保存时便不留下记录。追踪 ID 解决关联问题，单凭它仍无法回答审阅者关于长期记录的问题。

这份记录称为审计条目，需要说明五件事：谁、做了什么、何时、结果走哪个通道，以及如何与同一操作中的其他活动关联。“谁”来自已认证主体，即有效凭据（例如 bearer 令牌）实际映射到的身份；不能使用调用方随意填写的自报 `io.modelcontextprotocol/clientInfo`。JSON-RPC 与元数据一课已指出，该字段仅用于展示，不提供安全依据。“什么”包括方法、工具和参数；敏感参数在条目以任何形式生成前就替换为固定标记，避免原始秘密哪怕只写入一次。“何时”由时间戳表示。结果通道记录调用实际如何结束：正常完成的工具结果、`isError` 工具执行结果，或 JSON-RPC 协议错误。关联则由当前一跳的请求 ID 与跨所有跳共享的追踪 ID 配合完成。`ops-desk` 和 `credential-vault` 各自保存完全独立的哈希链，审阅者仍可凭相同追踪 ID 将两者对应起来。

记录需要能够暴露修改痕迹，这正是哈希链的用途。每条条目保存前一条的哈希，并计算覆盖自身字段的摘要，使条目形成链。修改内容却不修改已保存哈希时，重新计算出的摘要与记录值不匹配，校验立即在该条目失败。若修改者更仔细，同时重算并覆盖该条目的哈希，校验仍会失败，只是失败点移到下一条：下一条保存的仍是旧哈希，与被改条目现在的摘要不符。要掩盖修改，必须依次重写后续所有条目；这比只改一行涉及的范围更大。哈希链本身不阻止写入，它提供的是在链中仍有可信参照时发现修改的能力。

> 译注：单独保存于同一可写位置的哈希链不能证明历史未被整体重写，也不能自行发现尾部被截断。若攻击者可重算整链及末尾摘要，内部校验仍可能通过。需要另行保护或外部固定可信链头／检查点；本课示例只演示局部篡改检测，不提供不可抵赖或完整防篡改保证。

```figure
mcpa-27-trace-propagation
```

## 交互实验（Interactive Lab）

图中一个 `traceparent` 从客户端进入 `ops-desk`，再进入 `credential-vault` 并返回：追踪 ID 保持不变，每条箭头的父跨度 ID 则不同。下方两个小账本代表两台服务器各自的哈希链。它们标有相同追踪 ID，但任何一份日志都不读写另一份的条目或哈希。

`code/main.py` 构建的正是这对服务器。`ops-desk` 暴露只读且没有脱敏需求的 `list_recent_grants`，以及将 `new_key` 标记为敏感参数的 `reset_api_key`。后者通过 `ctx.call_upstream(...)` 调用 `credential-vault` 的 `store_secret` 完成轮换。从仓库根目录运行：

```bash
python3 certifications/mcpa/lessons/27-auditability-and-observability/code/main.py
```

先看报文：`reset_api_key` 请求的 `traceparent` 与内部 `store_secret` 请求的 `traceparent` 共享同一段 32 字符追踪 ID，仅父跨度 ID 不同。再看打印的两份审计日志。`ops-desk` 的 `reset_api_key` 条目把 `new_key` 替换为固定标记，保留可读的 `account_id`；`credential-vault` 的 `store_secret` 条目也独立对 `secret` 脱敏，各自执行自己的日志策略。找出 `ops-desk` 中主体为 `unauthenticated` 的条目：该调用携带无人签发的 bearer 令牌，所以工具未执行，但尝试本身仍被记录。最后两行先对未改动的 `ops-desk` 日志调用 `verify()`，随后原地篡改第一条参数再调用 `verify()`；结果会改变，并指出链断裂的位置。

## 实践实验（Practice Lab）

将链路再扩展一跳。为 `credential-vault` 添加自己的 `upstream` 服务器 `key-escrow`，暴露仅确认接收的工具 `escrow_key`。在 `store_secret` 处理器返回前调用 `ctx.call_upstream("escrow_key", {"account_id": arguments["account_id"]})`，复用 `reset_api_key` 访问 `credential-vault` 的模式。重跑演示，确认 `escrow_key` 请求的 `traceparent` 具有与客户端原始调用及 `store_secret` 相同的追踪 ID、新生成的父跨度 ID，以及不会与其他报文重复的请求 ID，因为它仍来自共享 `IdSequence`。然后分别对 `ops-desk`、`credential-vault` 和 `key-escrow` 的日志调用 `verify()`，确认各自返回 `(True, None)`。三个程序维护的独立哈希链，可仅通过同一个追踪 ID 关联到一次操作。

## 交付物（Shipped Artifact）

`outputs/audit-and-telemetry-spec.md` 提供一页参考：`traceparent` 的字段布局、长度及全零拒绝规则，审计条目所需五类信息，可直接核查的脱敏与哈希链流程，以及 `clientInfo` 不能代替主体身份的原因。将它与风险与安全控制一课的威胁矩阵放在一起：前者记录发生了什么，后者决定允许发生什么。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：合法 `traceparent` 符合 W3C 格式，格式损坏或全零值被拒绝；子跨度保留父追踪 ID 并生成新父跨度 ID；`tracestate` 和 `baggage` 原样到达上游；两台服务器各自对标记参数脱敏；记录主体来自令牌 subject 而非调用方自报 `clientInfo` 名称；未认证尝试在拒绝时仍被记账；干净链校验通过；直接编辑在被改条目处被发现，同时重算该条哈希的编辑在下一条被发现；不同服务器日志中的两条记录通过追踪 ID 关联，而请求 ID 不同。仓库报文检查器也会按 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/27-auditability-and-observability
```

## 与综合实践的联系（Capstone Connection）

第 33 课将所有领域汇入一段交互，其清单直接要求本课构建的两项能力：端到端保持的追踪 ID，以及校验通过的审计链。交互走到工具调用时，已经携带符合本课格式规则的 `traceparent`；处理它的服务器应记录真实主体，而非展示名称，并将条目写入可供审阅者核查的日志。继续学习时带上字段参考，准备实际指出跨越某一跳的追踪 ID，而不只解释概念。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| `traceparent` | 按 W3C 格式携带版本、追踪 ID、父跨度 ID 和标志的 `_meta` 键，描述追踪的一跳 |
| 追踪 ID（Trace id） | 同一操作所有跨度共享的 32 字符十六进制值，跨跳不变 |
| 父跨度 ID（Parent id） | 标识某个跨度的 16 字符十六进制值，每跳重新生成 |
| `tracestate` | 随 `traceparent` 传播的供应商特定追踪状态，本课原样传递 |
| `baggage` | 沿追踪各跳传递的用户定义键值上下文，本课原样传递 |
| 主体（Principal） | 有效凭据映射到的已认证身份，不使用自报字段 |
| 脱敏（Redaction） | 在审计条目生成前，将标记参数替换为固定标记 |
| 哈希链（Hash chain） | 每条哈希覆盖自身内容与前一条哈希，使局部修改可被发现 |
| 结果通道（Result channel） | 调用以正常完成结果、`isError` 结果或协议错误中的哪种方式结束 |
| 关联（Correlation） | 即使请求 ID 不同，也可按共享追踪 ID 对应不同日志中的记录 |

## 延伸阅读（Further Reading）

- [MCP 规范 2026-07-28：基础协议](https://modelcontextprotocol.io/specification/2026-07-28/basic)，了解 `_meta` 保留键与 OpenTelemetry 追踪上下文
- [SEP-414：`_meta` 中的 OpenTelemetry 追踪上下文](https://modelcontextprotocol.io/seps/414-request-meta)
- [日志功能（已弃用）](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/logging)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 3、11、13 节
- `phases/13-tools-and-protocols/20-opentelemetry-genai`，了解完整追踪后端在本课 `_meta` 传播之外需要的跨度层级与 `gen_ai.*` 属性
