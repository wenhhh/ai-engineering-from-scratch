# 缓存新鲜度与游标分页（Cache Freshness and Cursor-Based Pagination）

> 可缓存结果告诉客户端可以信任多久、哪些调用方能够复用；分页结果则返回不透明的位置标记，不向客户端承诺页码。

**Type:** Reference
**Languages:** Python
**Prerequisites:** 第 19 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 列出返回 `CacheableResult` 的六种操作，并说明其中 `ttlMs` 与 `cacheScope` 的含义
- 应用 2026-07-28 客户端的新鲜度规则：`ttlMs` 为 `0` 时立即过期，负值按 `0` 处理，缺失也默认 `0`
- 解释 `cacheScope` 的 `public` 与 `private` 如何决定谁能复用缓存，以及为何它们不构成访问授权
- 跟踪不透明游标在 `resources/list` 中的流转：省略游标从头开始，空字符串可以代表中间位置，无法识别的游标返回 `-32602`
- 解释 `list_changed` 通知为何无视剩余 TTL 而立即使缓存失效，以及 MRTR 重试产生的结果为何不能缓存

## 问题（The Problem）

第 04 课的无状态核心意味着，服务器不在请求之间记住客户端，因此客户端无法依赖连接上残留的协议状态来避免重复查询。但多数查询内容并不经常变化：工具目录可能一周才调整一次，资源字节可能一小时内都相同。如果模型每次作决定前都重新调用 `tools/list` 或读取同一资源，就会为没有变化的数据重复进行网络往返；通过互联网访问服务器时，每次往返都有实际延迟。

另一个独立成本出现在大结果集上。包含一万条资源的目录若一次返回完整 JSON 数组，即使客户端只需要前几个名称，也必须接收整个列表。这还会使客户端依赖固定的响应形态，增加服务器更换底层存储、增删条目或将目录分片时的兼容成本。

MCP 为适合复用的结果增加缓存信息来处理前一种成本：存活时间，以及说明哪些调用方可以共享字节的范围。后一种成本由游标分页处理：服务器返回大小适中的一部分内容，加上用于继续读取的不透明标记，不承诺稳定总页数或固定页大小。两种机制都遵循同一原则：客户端需要的事实，无论是结果何时过期，还是列表从哪里继续，都显式出现在消息里，不靠某条连接恰好仍然打开来暗示。

## 概念（The Concept）

六种操作返回 `CacheableResult`：`server/discover`、`tools/list`、`prompts/list`、`resources/list`、`resources/templates/list` 和 `resources/read`。它们返回 `resultType: "complete"` 时，结果包含两个字段。`ttlMs` 是不小于 `0` 的整数，表示客户端可以把响应视为新鲜的毫秒数，类似 HTTP 的 `Cache-Control: max-age`。`cacheScope` 则取 `"public"` 或 `"private"`，说明缓存副本的共享范围。

客户端获取资源时，记录接收响应的本地时间，记为 `t_received`；只要 `now < t_received + ttlMs`，响应就仍然新鲜。考试会关注三个边界情况：`ttlMs` 为 `0` 时立即过期，下一次需要时可以重新获取；服务器发送负 `ttlMs` 时，客户端将其按 `0` 处理，而不是取绝对值；`ttlMs` 完全缺失时，通常表示对端是早于该机制的旧服务器，客户端同样按 `0`，再依据自身策略或变更通知决定后续行为。TTL 不等于轮询间隔：客户端在下一次需要数据时惰性检查新鲜度，无须启动定时器持续主动刷新。实现若仍选择轮询，就必须加入随机抖动和退避，避免大量客户端同步发起请求。

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "resultType": "complete",
    "resources": [
      {"uri": "note://private/journal", "name": "journal"},
      {"uri": "note://private/vault", "name": "vault"}
    ],
    "nextCursor": "",
    "ttlMs": 120000,
    "cacheScope": "public"
  }
}
```

`cacheScope` 回答的是“给谁复用”。`"public"` 表示响应不包含调用方专属内容，客户端、网关或代理可以只存一份，提供给其他调用方；所有用户都相同的工具目录是常见的 `public` 例子。`"private"` 表示内容与调用方有关，只能在相同授权上下文中复用，不能交给另一枚令牌。共享 README 读取可用 `public`，调用方自己的私人笔记则用 `private`，因为即使报文中的请求形式相同，返回字节也可能因人而异。`cacheScope` 是缓存指引，不代替安全边界：`public` 允许共享不含用户专属信息的字节，却不授予任何人调用方法的权限。服务器仍须逐请求执行相应功能的访问控制，不能依赖上一次缓存响应的声明。

缓存条目由请求方法和影响结果的参数共同标识，例如 `resources/read` 的 `uri`，或分页列表的 `cursor`。方法或相关参数与产生缓存的请求不同，就不能拿该缓存作答。经过多轮往返重试而产生的结果，即第 14 课的 MRTR 模式，也完全不能缓存，因为它依赖 `inputResponses`，这些答案并未包含在常规缓存键中。中间的 `input_required` 同样不可缓存，本来也不携带 `ttlMs` 或 `cacheScope`；尚待回答的问题不能当作可复用的最终结果保存。

TTL 与推送通知互为补充。服务器可以只提供 `ttlMs` 而不声明 `listChanged: true`，此时 TTL 是客户端唯一的新鲜度提示。也可以两者都提供：TTL 避免通知之间不必要的重复获取，通知则在内容真正变化时立即使缓存失效，第 16 课已深入介绍。如果客户端在缓存 TTL 尚未结束时，通过订阅流收到 `notifications/resources/list_changed`、`notifications/tools/list_changed` 或 `notifications/prompts/list_changed`，必须立即以通知为准，将对应缓存视为过期，无论剩余时间还有多少。

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/resources/list_changed",
  "params": {"_meta": {"io.modelcontextprotocol/subscriptionId": 7}}
}
```

分页使用不透明游标，不使用客户端自行推算的页码。`resources/list`、`resources/templates/list`、`prompts/list` 和 `tools/list` 都采用相同方式：响应可以包含 `nextCursor`，存在时，客户端将完全相同的字符串作为下次请求的 `cursor` 传回。服务器选择页大小，客户端不能假定其固定，也不能解析、解码或推断游标内容，因为字符串只对签发它的服务器有意义。缺少 `nextCursor` 才表示列表结束。常见陷阱是空字符串：`""` 是合法游标，可以表示真实的中间位置，既不意味着结束，也不意味着从头开始。使用 `if cursor:` 而不是 `if cursor is not None:` 的客户端，会在服务器恰好返回空游标时提前停止分页。服务器未签发或已无法解析的游标，则返回 `-32602 Invalid params`。

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "error": {"code": -32602, "message": "Invalid cursor: 'not-a-real-cursor'"}
}
```

分页与缓存的交互也有明确规则。每一页都是独立可缓存的响应，拥有自己的 `ttlMs`，新鲜度从该页收到时开始计算，不从第一页收到时统一计时。服务器甚至可以让早期稳定页面拥有较长 TTL，而变化频繁的末页采用较短 TTL。协议不保证跨页一致性：底层列表在两次取页之间改变时，客户端可能重复看到某项，也可能漏掉某项，这与其他 HTTP 分页的权衡类似。原文建议需要完整重新读取时省略游标、从头获取，但这本身并不增加协议未提供的原子快照保证。服务器不能在同一次列表遍历的不同页之间改变 `cacheScope`；例如第一页 `resources/list` 为 `private`，后续各页也必须为 `private`。

最后是顺序。`tools/list` 及其他列表操作应在相同条件下保持稳定、确定的顺序。这有两方面价值：客户端自己的缓存与分页记录更可预测；同一工具目录再次序列化到系统提示词时，上游大语言模型服务商的提示缓存也更容易识别逐字节相同的前缀。后一项收益来自稳定输出，与 MCP 自身缓存是两种不同机制，都能减少延迟或成本。

```figure
mcpa-20-cache-freshness
```

## 交互实验（Interactive Lab）

图中将一个缓存响应放在时间线上。响应在 `t_received` 到达，阴影范围向后延伸 `ttlMs`，范围内客户端直接使用缓存，不产生协议流量。第二条相同时间线展示另一种情况：`list_changed` 在 TTL 结束前到达，新鲜度线就在那里提前截断。图注强调的规则是：通知一到达就使缓存失效，从那一刻开始，原本还剩多少 TTL 不再重要。

## 实践实验（Practice Lab）

打开 `code/main.py`。它构建一个小型 `notes` 资源服务器，包含三份共享公开笔记和两份私人笔记。前面的 `ClientCache` 由 `alice-token` 和 `bob-token` 两个身份共享，模拟网关缓存的行为。

```bash
python3 code/main.py
```

将输出与概念部分对照。最初五次客户端操作遍历 `resources/list`：第二次命中缓存，不产生新报文；第三次发送 `cursor: ""`，得到中间页而非第一页；第四次继续跟随 `nextCursor` 到最后一页；第五次发送服务器从未签发的游标，得到 `-32602`。接下来读取笔记：alice 与 bob 共享公开 README 的同一缓存副本，因为它的 `cacheScope` 是 `"public"`；私人日志则各自获取，因为 `"private"` 条目即使放在共享缓存中，也不能跨令牌复用。然后 alice 打开 `subscriptions/listen`，服务器目录改变，下一次 `resources/list` 即使 TTL 尚未到期也必须重新发送。读取私人 vault 笔记会触发携带 `elicitation/create` 的 `input_required`；客户端回答后，使用新 id 和原样回传的 `requestState` 重试。完成后的读取结果刻意不入缓存，因此读取两次就要征询两次。报文末尾是一个故意违规包装，模拟早于 SEP-2549 的服务器完全省略 `ttlMs` 和 `cacheScope` 的 `resources/list` 响应，展示客户端应退回 `ttlMs: 0` 默认值的情况。

## 交付物（Shipped Artifact）

`outputs/caching-decision-guide.md` 提供一页决策参考，引用研究简报，说明如何选择 `ttlMs` 和 `cacheScope`，以及怎样正确实现客户端缓存。编写调用 `resources/list`、`resources/read`、`tools/list`、`prompts/list`、`resources/templates/list` 或 `server/discover` 的代码时可放在旁边参考。

## 验证结果（Verify It）

在本课目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试验证本课的主张：新鲜缓存直接返回而不发新请求，TTL 过期后重新获取；私人条目不跨令牌，公开条目可跨令牌共享；`list_changed` 在 TTL 到期前使缓存立即失效；`input_required` 和 MRTR 重试后的完成结果都不缓存；空字符串游标继续分页，不提前结束；未知游标返回 `-32602`；列表按确定性顺序返回；缺失或负 `ttlMs` 均归为零。仓库报文检查器还会依据 2026-07-28 规则验证本课记录：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/20-caching-and-pagination
```

## 与综合实践的联系（Capstone Connection）

综合实践必须为每个可缓存调用判断结果可以信任多久、是否能够跨调用方共享，也须在不假定总页数的情况下遍历至少一个较大列表。两项决策都建立在本课之上：从结果读取 `ttlMs` 和 `cacheScope`，不随意编造缓存政策；使用方法及真正影响结果的参数作为缓存键；把空游标当作数据；不让重试结果或中间结果冒充可复用缓存。

## 关键术语（Key Terms）

| 术语（Term） | 含义（Meaning） |
|------|---------|
| `CacheableResult` | 六种操作的 `complete` 结果所携带的 `ttlMs` 与 `cacheScope` 缓存信息 |
| `ttlMs` | 响应可被视为新鲜的毫秒数；`0` 或缺失表示立即过期，负值按 `0` 处理 |
| `cacheScope` | `public` 允许跨调用方共享，`private` 仅在相同授权上下文复用；本身不执行访问控制 |
| 缓存键（Cache key） | 请求方法加影响结果的参数，例如 `uri` 或 `cursor` |
| 游标（Cursor） | 服务器选择、标记列表位置的不透明令牌；客户端不能解析，也不能假定页大小固定 |
| `nextCursor` | 用于继续分页的令牌；字段缺失才表示结束，空字符串不表示结束 |
| `list_changed` 通知 | 无论剩余 TTL 多少，都立即使缓存列表失效的推送信号 |
| MRTR 重试结果（MRTR retried result） | `input_required` 往返之后的完成结果，不具备缓存资格 |

## 延伸阅读（Further Reading）

- [MCP 缓存](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching)
- [MCP 分页](https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/pagination)
- [SEP-2549：列表结果的 TTL](https://modelcontextprotocol.io/seps/2549-ttl-for-list-results)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md`，第 10 节
- `phases/13-tools-and-protocols/10-mcp-resources-and-prompts`，介绍这些可缓存分页结果所属的资源与提示词原语
