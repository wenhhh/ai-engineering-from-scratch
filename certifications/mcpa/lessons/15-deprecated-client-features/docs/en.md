# 已弃用但仍可用：Roots、Sampling 与 Logging（Deprecated, Not Removed: Roots, Sampling, and Logging）

> 在 MCP 2026-07-28 中，弃用不等于功能消失：roots、sampling 和 logging 仍可正常响应，只是至少十二个月的移除等待期已经开始。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 14 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 依据 MCP 功能生命周期区分已弃用（Deprecated）与已移除（Removed），包括至少十二个月的等待期及最早移除时间的计算方式
- 跟踪 roots 和 sampling 如何作为 MRTR 输入请求传递，以及调用方必须在当前请求中声明的客户端能力如何构成使用前提
- 解释 logging 为何迁移到每请求 `io.modelcontextprotocol/logLevel` 键，以及服务器何时可以、何时不能发送 `notifications/message`
- 说明各项弃用功能的迁移路径：roots、sampling、logging、动态客户端注册、带范围的 `includeContext`，以及 HTTP+SSE
- 识别 2026-07-28 真正删除的少量方法，例如 `logging/setLevel` 和 `notifications/roots/list_changed`，并解释无状态核心为何无法继续保留它们

## 问题（The Problem）

把“已弃用”理解为“已经消失”的考生，会在一类可预见的 MCPA 题目上失分；把它理解为“可以永久保留、不必理会”的考生，则会在另一类题目上失分。MCP 2026-07-28 同时弃用了 roots、sampling 和 logging 三项面向客户端的完整功能，又在同一版本中彻底删除了另一组范围更小的方法。这两类处理不同，考试恰恰会考查其差别。工具调用通过 `input_required` 结果请求 `roots/list` 或 `sampling/createMessage`，仍然属于正常的 2026-07-28 报文；距离这些功能最早允许消失的时间，可能还有数月甚至数年。继续尝试 `logging/setLevel` 的请求则会直接得到“找不到方法”，因为这条消息依赖连接范围的会话，而无状态核心已经不再提供它。本课要建立的能力，就是知道每个名称属于哪一类，以及背后的原因。

## 概念（The Concept）

MCP 规范中的每项功能都处于三种生命周期状态之一：启用（Active）、已弃用（Deprecated）或已移除（Removed）。Active 表示按其规范性文本实现，与当前版本中的其他功能相同。Deprecated 表示功能仍完整保留在规范中，也仍然能够工作，但核心维护者已决定将来移除它，并发布了迁移路径。Removed 表示功能已从规范草案删除，下一份当前版本（Current）也不再包含它，不过最后保留该功能的定稿版本（Final）仍会记录相关说明。从首次将功能标记为 Deprecated 的版本发布之日起，至少经过十二个月，功能才具备被移除的资格；实际移除日期由核心维护者在之后的发布准备阶段另行决定，可能远晚于等待期结束，也可能始终不移除。依据 SEP-2577，Roots、Sampling 和 Logging 从 2026-07-28 发布时起被弃用，因此最早只能在 2027-07-28 当天或之后发布的首个规范版本中移除。它们不会恰好在该日自动消失，也不能因为碰巧有下个版本发布就提前移除。

SEP-2577 将这三项功能归为一组，因为它们表现出相同特征：实际采用率较低，却带来不可忽视的实现成本。Roots 为服务器提供目录提示，服务器没有义务遵守，而真正实现目录选择界面的客户端也不多。Sampling 让服务器借用客户端的模型访问能力，但正确实现需要人工审核、模型选择逻辑，并且从 2025-11-25 起还需要完整的工具循环；尽管如此，采用率仍然不高。Logging 则重复了运行环境通常已经提供的设施：stdio 传输上的 `stderr`，以及其他场景中的 OpenTelemetry。这三项功能均不影响定义 MCP 核心用途的资源、工具和提示词模型，因此弃用它们可以缩小实现范围，而不缩小协议的主要用途。

Roots 和 sampling 的内部报文结构保持不变，变化的是交付机制。2026-07-28 之前，服务器在已打开的连接上直接向客户端发起 `roots/list` 或 `sampling/createMessage` 请求。无状态核心移除了这种依赖连接的交互方式，因此两种请求现在与其他服务器向客户端索取输入的操作一样，放入 `InputRequiredResult` 的 `inputRequests` 映射中，并由携带新 JSON-RPC id 的重试请求回答。这就是替代服务器主动请求的多轮往返模式。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "resultType": "input_required",
    "inputRequests": {
      "workspace_roots": {"method": "roots/list"},
      "workspace_summary": {
        "method": "sampling/createMessage",
        "params": {
          "messages": [
            {"role": "user", "content": {"type": "text", "text": "Summarize this workspace in one sentence."}}
          ],
          "maxTokens": 100
        }
      }
    },
    "requestState": "summarize-workspace:v1"
  }
}
```

只有客户端在当前请求的 `io.modelcontextprotocol/clientCapabilities` 中声明相应的 `roots: {}` 或 `sampling: {}` 能力，对应输入请求才合法。如果服务器需要某项能力，而客户端未声明，就必须返回 `-32021`，并通过 `data.requiredCapabilities` 列出所需能力。这与其他不能由服务器自行假定存在的客户端功能采用相同门禁。客户端以全新 id 重试原请求，在 `params.inputResponses` 中使用与 `inputRequests` 相同的键提供答案，并逐字节回传 `params.requestState`，不能自行编造状态。

采样请求仍可携带 `includeContext`，但其中 `"thisServer"` 和 `"allServers"` 两个取值也已被单独弃用；这是更早的弃用通知，以另一个 SEP 归入同一生命周期登记表。该字段始终默认取 `"none"`，因此最简单的正确做法是省略它，而不主动选择已弃用的值。

Logging 的处理略有不同，因为这个功能名称涵盖了两种独立报文行为，其中只有一种保留下来。保留的是每请求机制：客户端在某个请求的 `_meta` 中加入 `io.modelcontextprotocol/logLevel`，服务器便可以发送达到或高于该严重级别的 `notifications/message`。这些通知只能出现在该请求自己的响应流上，而且必须早于最终结果；当前请求没有这个键时，服务器完全不能发送日志通知。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "warning",
    "logger": "diagnostics",
    "data": {"message": "cache subsystem degraded"}
  }
}
```

没有保留的是连接范围的隐式设置：过去客户端只需发送一次 `logging/setLevel`，同一连接后续消息就继承这个级别，直到再次修改。这只有在连接能够跨请求保存状态时才有意义。无状态核心没有位置存放连接级日志设置，因此 `logging/setLevel` 已经彻底移除，而不仅仅是弃用。现代服务器没有对应处理器，会像面对其他未知方法一样返回 `-32601`（Method not found），不会返回工具执行错误，也不会返回 `-32602`。

还有两项功能与 roots、sampling、logging 一同列在弃用登记表中。动态客户端注册将迁移到客户端 ID 元数据文档（Client ID Metadata Documents），后续课程会深入介绍注册方式的完整选择流程。首个公开版本中的 HTTP+SSE 传输则迁移到 Streamable HTTP。它们遵循相同规则：仍有规范说明，仍可能合法出现，也受到相应弃用等待期约束。考试常见陷阱是把整张清单都当作“已移除”。2026-07-28 真正删除的是另一份清单：`initialize` 握手与 `notifications/initialized`、`Mcp-Session-Id` 和会话级 HTTP 端点、`ping`、`resources/subscribe`、`logging/setLevel`、`notifications/roots/list_changed`、`Last-Event-ID` 与 SSE 恢复能力、MRTR 之外的所有服务器主动请求、`tasks/result` 与 `tasks/list`，以及与 `notifications/elicitation/complete` 相关的 URL 模式信息征询字段。它们不再属于弃用登记表，因为登记表记录的是仍然存在、需要逐步迁出的功能。

还有一个不对称之处值得指出：为什么 roots 功能保留了下来，`notifications/roots/list_changed` 却消失了？后者是客户端向服务器推送的通知，用于告知暴露的根目录已改变。MRTR 用请求与重试替代了服务器主动请求，而 2026-07-28 保留的监听通道只有 `subscriptions/listen`，由客户端向服务器打开，没有反向的对应通道。原文据此解释，根目录变更通知在新的交互模型中失去了原有传递路径，因此随承载它的连接模型一同移除，而没有像 roots 本身那样继续保留。

```figure
mcpa-15-deprecation-timeline
```

## 交互实验（Interactive Lab）

图中时间线标出 2026-07-28 发布日，以及一年后的最早可移除时间，为 roots、sampling 和 logging 各画一条轨道：实线表示弃用后的保留期，越过最早可移除标记后转为虚线，因为具备移除资格不代表已安排移除。下方两列对比仍能在报文中正常出现的 `roots/list`、`sampling/createMessage`、每请求 `logLevel` 与 `notifications/message`，以及已经移除的 `logging/setLevel` 和 `notifications/roots/list_changed`。沿轨道越过移除标记，线条仍在延伸，因为实际移除日期由核心维护者决定，不会仅凭日历自动触发。

## 实践实验（Practice Lab）

打开 `code/main.py`。`advise_migrations` 是实验说明中的迁移建议器：传入服务器和客户端能力，它会列出双方正在使用的每项弃用功能，并给出对应 SEP、迁移路径，以及由 `add_months` 根据十二个月等待期计算的最早可移除时间。配套 `Server` 暴露两个工具。`summarize_workspace` 同时需要 roots 和 sampling：两者都未声明时，客户端立即收到 `-32021`，其中列出缺失能力；两者都声明时，服务器返回包含 `workspace_roots` 和 `workspace_summary` 条目的 `input_required` 结果。客户端回答后，用新 id 和原样回传的 `requestState` 重试，得到完成结果。回传错误 `requestState` 的重试会被拒绝。`run_diagnostic` 不需要任何额外能力：未指定日志级别时保持静默；指定 `logLevel: "info"` 时，为 info 和 warning 事件发送 `notifications/message`，跳过 debug；级别无法识别时返回 `-32602`。

```bash
python3 code/main.py
```

阅读输出的最后一部分：一段经过包装并明确标注为旧版的交互，向同一台服务器发送 `logging/setLevel`，收到 `-32601`，即找不到方法。它具体展示了仍然存在的弃用功能与已经移除的方法之间的区别。

## 交付物（Shipped Artifact）

`outputs/deprecation-migration-guide.md` 是本课的一页参考：解释生命周期政策中的 Deprecated，列表比较 SEP-2577 的三项功能、动态客户端注册与 HTTP+SSE，列出 2026-07-28 真正移除的名称，以及那些已弃用但仍可不加旧版包装、直接通过报文检查的名称。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：roots、sampling 和 logging 均被识别，并附有迁移路径及正确计算的最早可移除时间；不包含弃用功能的能力集不会产生问题记录；`summarize_workspace` 在能力未声明时返回 `-32021`，能力齐备时开启正确的 MRTR 往返，客户端通过新 id 和原样回传的 `requestState` 完成重试；不匹配的 `requestState` 被拒绝；`run_diagnostic` 在没有日志级别时保持静默，设置级别后只发送达到或高于该级别的事件，拒绝无法识别的级别；经过旧版包装的示例展示现代服务器对真正移除的方法返回 `-32601`。仓库的报文检查器还会依据 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/15-deprecated-client-features
```

## 与综合实践的联系（Capstone Connection）

综合实践的端到端交互要求你能够直接区分已弃用和已移除的功能：它使用 MRTR 征求同意，就像本课使用 MRTR 请求 roots 和 sampling；构造报文时不会调用 `initialize` 或 `logging/setLevel`。本课迁移建议器的结构也会被之后的策略引擎和审计流水线复用：检查能力集或报文记录，报告哪些部分应在相应迁移窗口内调整。这里的时间约束是一个窗口，不能简单当作固定移除日期。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 启用（Active） | 当前版本中仍有完整规范、按相应要求实现的功能 |
| 已弃用（Deprecated） | 仍有规范且可以工作，已有迁移路径，至少经过十二个月等待期才可能被移除的功能 |
| 已移除（Removed） | 已从规范草案删除，下一份 Current 版本不再包含的功能 |
| 最早可移除时间（Earliest removal） | 功能弃用等待期结束当天或之后发布的首个规范版本 |
| Roots | 已弃用的客户端功能，为服务器提供目录提示，现在通过 MRTR 输入请求索取 |
| Sampling | 已弃用的客户端功能，允许服务器借用客户端模型访问能力，现在通过 MRTR 输入请求索取 |
| `io.modelcontextprotocol/logLevel` | 让某个请求接收 `notifications/message` 的每请求 `_meta` 键 |
| `notifications/message` | 服务器只能在设置了 `logLevel` 的请求响应流中发送的日志通知 |
| `logging/setLevel` | 已移除的连接级日志设置方法，无状态核心不再为它保存状态 |
| SEP-2577 | 在 2026-07-28 中一并弃用 roots、sampling 和 logging 的提案 |

## 延伸阅读（Further Reading）

- [Roots（已弃用）](https://modelcontextprotocol.io/specification/2026-07-28/client/roots)
- [Sampling（已弃用）](https://modelcontextprotocol.io/specification/2026-07-28/client/sampling)
- [Logging（已弃用）](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/logging)
- [已弃用功能登记表](https://modelcontextprotocol.io/specification/2026-07-28/deprecated)
- [功能生命周期与弃用政策](https://modelcontextprotocol.io/community/feature-lifecycle)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 11、15 节
- `phases/13-tools-and-protocols/11-mcp-sampling`，深入构建采样功能的迁移路径
