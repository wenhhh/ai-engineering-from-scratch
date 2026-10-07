# 持久化队列集成

在完成实现的工作区执行 `go build -o jobs .`。CLI 没有外部依赖或网络连接。JSON 输出到 stdout，错误输出到 stderr；普通失败以 1 退出，注入崩溃按设计以 86 退出。

| 命令 | 输入 | 结果 |
|---|---|---|
| `enqueue --store DIR --input FILE` | 包含 id/text 对象的 JSON 数组 | 请求记录数，包括内容相同的重复投递 |
| `worker --store DIR` | 已持久化的输入 | Schema1 事件，含 id、领取版本、state 和 reused_effect |
| `status --store DIR` | 已存在或空目录 | Schema1 任务、可用执行结果及 scope |
| `demo --input FILE` | 相同输入格式 | 临时存储中的子进程崩溃／恢复记录 |

标识符匹配 `[a-z][a-z0-9-]{0,63}`。每条记录最多 1,000,000 个 UTF-8 字节，每个请求数组最多 10,000 条记录，每个 JSON 文档最多 4 MiB。未知输入字段和尾随 JSON 文档均失败。标识符永久绑定最初的文本；报告内容改变时，应使用新标识符。

工作进程选项包括 `--lease-ms`（默认 30000）、`--max-attempts`（3）、`--max-jobs`（1）、`--delay-ms`（0..60000）、`--crash-after claim|effect` 和 `--now-ms`（默认 -1，使用当前墙上时钟）。显式传入非负 now-ms 时，演示使用固定逻辑时钟。不要在同一存储中混用逻辑时钟与真实时钟。

存储包含 `ledger.lock`、`jobs.json`、不可变的 `inputs/<id>.json` 和 `effects/<id>.json`。任务字段保留阶段 API 的 Go 名称：ID、State、Version、LeaseUntil、Attempts。租约使用整数毫秒；执行结果字段为 id、input_sha256、bytes 和 words。

`Enqueue`、`ClaimNext`、`CompleteClaim`、`Work` 和 `Status` 组合调用各阶段函数。所有账本的读取—修改—写回操作都获取同一把建议锁。ClaimNext 回收租约过期的 running 记录，保留尝试次数，保存新领取记录，再于执行前释放锁。完成时，在同一把锁下重新加载并检查当前版本。

发布凭据时使用已同步的临时文件，以及拒绝替换目标的原子硬链接。已有凭据的数据必须与预期输入摘要及计数完全匹配。因此，两个执行过程竞争发布同一本地结果时仍能正确处理。这展示的是接收方负责的幂等契约，不能扩展为外部操作恰好执行一次的保证。

status 调用锁住任务快照后，另外读取执行结果文件，因此可能显示凭据已经存在、完成记录仍待写入的状态。这是实际中间状态，不能将其当作事务一致的组合快照。不要把 status 视为密码学审计，也不要在工作进程运行时编辑存储文件。

接入远程副作用时，保留输入标识与租约版本校验，先设计接收方的持久化幂等键和对账协议。仅复制 `Finish` 调用，无法保护接收方免受重复请求影响。
