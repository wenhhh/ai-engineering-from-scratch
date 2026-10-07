# 工具调用生命周期（The Tool Invocation Lifecycle）

> 一次工具调用会依次经过固定检查点。它究竟停在哪一步，决定了应使用哪个错误通道，以及调用方接下来该做什么。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 16 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 沿工具调用走完每个检查点：发现、列举、选择、确认、调用、校验、执行和结果
- 区分仅存在于宿主应用内部的检查点，与实际向传输通道发送消息的检查点
- 解释未知工具为何始终属于协议错误，而无效工具参数通常属于工具执行错误
- 将重试规则应用于 input_required 结果和中断的流：每次使用新的 JSON-RPC id，不复用已经结束或失败的请求 id
- 判断盲目重新发起调用是否安全时，将 idempotentHint 视为不可信提示，而非执行保证
- 区分使客户端放弃等待的硬超时，与只让逻辑调用暂时等待更多输入的 input_required 结果

## 问题（The Problem）

设想智能体请求服务器查询构建状态、发布版本或查找信息。在最简单的叙述中，工具调用只有一个事件：发送请求，收到答案，结束。但真实调用往往没有这么简单。从模型决定使用工具，到调用方取得可据以行动的最终结果，请求会经过多个不同检查点，每一步都可能以不同方式结束。如果调用方对所有失败采用同一处理，就会不断作出错误决定：重试无论发送多少次都无法成功的请求，放弃只需修正一个参数就能完成的调用，甚至盲目重复一个可能已经产生副作用的操作。

解决问题依靠的是熟悉每次工具调用遵循的固定结构，让“停在哪一步”自然回答“现在怎么办”。连工具是否存在都没有检查通过的调用，与已经进入处理器却违反业务规则的调用，失败原因不同，需要的响应也不同。这正是考试大纲中占比最大的“交互与执行”领域反复考查的内容：究竟属于协议错误还是工具执行错误，发生在哪个检查点？

## 概念（The Concept）

2026-07-28 中的工具调用按固定顺序经过八个检查点：发现、列举、选择、确认、调用、校验、执行和结果。只有一部分涉及传输消息，另一部分完全存在于宿主应用内部。仅观察 JSON-RPC 流量的客户端无法直接看到这些内部步骤，但它们仍决定模型被允许采取什么行动。

**发现与列举（Discover and list）**对应报文交互，结果都可缓存。客户端通过 `server/discover` 了解服务器支持的版本、能力及可选 `instructions`，结果携带 `ttlMs` 和 `cacheScope`。客户端可以选择不调用发现方法，但服务器必须实现它。`tools/list` 返回每个工具的名称、描述、`inputSchema` 和注解，结果同样可缓存，且不能因连接不同而变化，不过可以随当前请求的授权变化。设计良好的客户端复用缓存列表，不在每次调用前重新查询，因此“列举”和“调用”是两个独立检查点。

**选择与确认（Select and confirm）**完全不发送协议消息。选择由模型根据上下文中的工具描述和结构定义，决定调用哪个工具。确认由宿主决定：立即执行这一选择，还是先征求人工批准。规范将其表述为应当（SHOULD）遵循的应用行为，而非某条协议消息：应用应明确展示暴露了哪些工具，在调用前显示输入，并在敏感操作前安排确认。`destructiveHint` 等注解可以辅助判断，但除非服务器本身可信，否则这些注解也不可信，不能作为强制执行的保证。用户拒绝时，生命周期就在这里结束；不会发送 `tools/call`，后续校验和执行也无事可做。

**调用（Call）**是 `tools/call` 真正发出的时刻。与本版本中的每个请求一样，它携带自己的元数据，不依赖之前的握手：

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "get_build_status",
    "arguments": {"build_id": "bld_7"},
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientCapabilities": {},
      "progressToken": "pt-9"
    }
  }
}
```

**校验（Validate）**是本课生命周期中服务器收到请求后的首个检查点，只回答一个问题：服务器是否确实暴露了指定工具？此时尚不检查工具参数。如果名称与服务器列表中任何工具都不匹配，调用就在这里以协议错误结束，错误码始终是 `-32602`，不能用 `-32601`。原因是 JSON-RPC 方法 `tools/call` 本身已知，未知的只是其中的工具名称：

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "error": {"code": -32602, "message": "Unknown tool: delete_all_builds"}
}
```

未通过校验的调用不会进入执行，也不会产生 `result`，只产生 `error`。值得在此停下来理解：完整错误分类会在后续课程介绍，但校验与执行之间的区分，已经回答了大多数工具错误考题真正关注的问题。

**执行（Execute）**在确认工具存在后才开始，涵盖此后所有工作：先按工具自己的 `inputSchema` 检查参数，再实际运行处理器。缺失或格式错误的工具参数在这个阶段被发现，而不属于上一步的工具存在性校验；它们以带有 `isError: true` 的正常完成结果返回，包含模型能够读取并据以修正的内容：

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "resultType": "complete",
    "content": [{"type": "text", "text": "Missing required argument(s): environment."}],
    "isError": true
  }
}
```

这是最常被考查的规则：未知工具在校验阶段产生协议错误；结构定义校验失败、上游 API 失败或业务规则违反，则在执行阶段产生工具执行错误，因为模型可以针对后者修正输入，而不能通过改进参数让不存在的工具出现。还有一个例外需要了解：如果执行过程中发生真正意外的服务器内部故障，而非输入或业务问题，仍以协议错误 `-32603` 报告，因为调用方简单改变下一次输入无法修复服务器自身的故障。如果请求声明了 `progressToken`，执行阶段还可以在该请求自己的响应流中发送 `notifications/progress`，每条携带相同令牌、严格递增的 `progress`，以及可选 `total` 和 `message`，不能发到其他通道。

**结果（Result）**是执行阶段的落点：本课核心生命周期返回的 `resultType` 只有 `"complete"` 和 `"input_required"`，前者不论是否设置 `isError` 都表示本次请求结束。`input_required` 尚未完成整个逻辑调用，它携带 `inputRequests`、`requestState` 或两者。客户端通过全新 JSON-RPC id 重试同一逻辑调用，提供键名匹配的 `inputResponses`，并原样回传 `requestState`。这就是前面介绍的多轮往返模式；信息征询课程已深入讲解 HMAC 等状态保护，本课刻意简化，以突出生命周期。重试会重新经历调用、校验、执行和结果，因此**重试（Retry）**与**最终结束（Final）**是循环的一部分：重试是带有先前结果信息的新调用，最终结束则是实际完成的 `complete` 结果，或调用方决定放弃的时刻。

放弃等待也有自己的处理方式。每个请求都应允许超时，并设置一个即使进度通知持续到达也不能越过的硬上限，因为有进展只证明正在工作，不保证能够按时完成。取消方式取决于传输：Streamable HTTP 通过关闭请求流取消，无须额外消息；stdio 由客户端发送 `notifications/cancelled`，指定 `requestId`，还可以说明原因。超时和取消都不会创造自己的 resultType；不存在 `"cancelled"` 或 `"timed_out"` 取值。客户端已经不再关注该请求时，即使服务器随后返回响应，也应忽略。

流中断是相关但不同的失败：请求已经发出，但任何成功或错误响应到达之前连接就断了。本版本不提供恢复机制，没有 `Last-Event-ID`，也没有 SSE 重放，所以需要继续时只能用新 id 重新发起调用。能否安全地盲目重发与 `idempotentHint` 有关，而该注解仅提供提示。谨慎的客户端应区别对待非幂等工具：不能仅凭乐观假设重复可能已产生副作用的操作。设计良好的服务器可以在第一步返回不透明的显式句柄，沿用无状态核心课程中的模式，使后续检查以及中断后的重新查询围绕句柄进行，避免无声地重复已经发生的动作。

```figure
mcpa-17-lifecycle
```

## 交互实验（Interactive Lab）

图中八个检查点自上而下排列，两条错误分支从真正发生的位置分出：校验分支通向 `-32602`，属于协议错误，不进入执行，也不产生正常结果；执行分支通向 `isError`，属于工具执行错误，但仍是 complete 结果。结果节点再分两路：complete 结束，input_required 使用新 id 回到调用节点，形成图中唯一的回边。注意，选择和确认虽然位于主链，却不在两个协议错误通道上；它们本来就不生成 JSON-RPC 消息，因此用户在确认阶段拒绝，只会在发送调用前结束流程。

## 实践实验（Practice Lab）

在本课目录运行模块：

```bash
python3 code/main.py
```

每行输出展示一个场景经过的阶段，以及最终结束方式。将输出路径与图对照：`happy_path` 完整走过一次主链，中间包含进度；`needs_input_then_retry` 再次经过调用、校验、执行和结果；`confirmation_denied` 停在确认之后，没有发送调用；`unknown_tool` 停在校验之后；`invalid_arguments` 进入执行并返回 isError；`broken_stream_reissue` 对同一构建句柄使用两个不同 id 调用两次；`timeout_then_cancel` 在进度始终未到达完成时放弃，随后忽略迟到响应；`internal_fault` 展示执行中的意外服务器故障如何作为协议错误返回，而不使用 isError。

然后在本课目录打开解释器，手动跟踪一个场景：

```python
import sys; sys.path.insert(0, "code")
import main
server, client = main.LifecycleServer(), None
client = main.Client(server)
run = main.run_needs_input_then_retry(server, client)
print(run.stages)
print(run.final)
```

修改 `main.py` 中 `publish_release` 的必需参数，或将某个构建所需的时钟步数设为超过 `run_timeout_then_cancel` 的轮询预算，再次运行，观察阶段轨迹如何变化。

## 交付物（Shipped Artifact）

`outputs/tool-lifecycle-state-chart.md` 提供一页状态图参考：各检查点是否在报文中可见、是否仅存在于宿主、可能通过哪个错误通道结束，以及调用暂停或中断时对应的准确重试规则。编写客户端或服务器时，可用它快速回答“这里应该发生什么”。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：顺利路径按文档顺序经过各阶段；input_required 后的重试使用新 id 并最终完成；确认拒绝在调用前终止；未知工具在校验阶段以 `-32602` 失败；结构定义校验失败在执行阶段产生 isError；流中断后使用新 id 对同一句柄重新发起调用；硬超时取消请求，之后的迟到响应被忽略；执行中的意外内部故障仍属于协议错误，不是 isError；`tools/list` 始终按确定性顺序返回；每个请求和结果都携带本版本必需字段。仓库的报文检查器依据相同规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/17-tool-invocation-lifecycle
```

## 与综合实践的联系（Capstone Connection）

综合实践的端到端交互会组合这套生命周期：先发现与列举，再发出需要结构校验的工具调用，处理以新 id 回答的 input_required，接收进度、可能取消，最终产生审计轨迹能够关联的结果。解释设计为何重试、为何放弃或为何这样报告错误时，应先回答“它发生在哪个检查点”，本课正是要让这种判断成为习惯。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| 检查点（Checkpoint） | 工具调用从发现到结果所经过的八个固定阶段之一 |
| 校验（Validate） | 本课中仅检查指定工具是否存在的阶段，失败时属于协议错误 |
| 执行（Execute） | 检查工具参数并运行处理器的阶段，其失败通常属于工具执行错误 |
| 协议错误（Protocol error） | JSON-RPC `error`，不会作为可修正工具参数的正常结果内容返回 |
| 工具执行错误（Tool execution error） | 带有 `isError: true` 的完成结果，包含模型能够读取并修正的问题说明 |
| 重试（Retry） | MRTR 的继续步骤：新的 JSON-RPC id、匹配的 `inputResponses`，以及原样回传的 `requestState` |
| 重新发起（Reissue） | 流中断后使用新 id 重发调用，因为传输不提供恢复机制 |
| idempotentHint | 关于重复调用是否安全的不可信提示，不构成强制执行保证 |

## 延伸阅读（Further Reading）

- [工具（Tools）](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)，重点阅读错误处理与有状态工具
- [多轮往返请求（Multi Round-Trip Requests）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr)
- [取消（Cancellation）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/cancellation)与[进度（Progress）](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/progress)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 5、7、8 节
- `phases/13-tools-and-protocols/29-mcp-reliability-cancellation-and-flow-control`，深入介绍超时、取消与流量控制
