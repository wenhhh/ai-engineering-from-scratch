# 评估集群集成（Evaluation Farm Integration）

在已完成的工作区使用 `go build -o farm .` 构建。调用方提供 UTF-8 JSON 预测记录并读取 JSON 报告，无需 SDK 或推理服务。

```json
[
  {"id":"case-one","prompt":"Safe HTTP read verb?","expected":"GET","response":" get "}
]
```

ID 必须唯一、非空，且最多 256 字节；预期答案必须非空。prompt、expected 和 response 各自最多 100,000 字节。最多接受 10,000 条记录及 4 MiB JSON。未知字段和尾随的额外文档会导致失败。当前评分规则先转为小写并规范化空白，再检查是否相等。

| 命令 | 行为 |
|---|---|
| `init --store DIR --input FILE --shards N` | 绑定数据集哈希和分片数；相同初始化重放保留已有进度 |
| `worker --store DIR --worker-id NAME` | 领取、评估并提交至多一个符合条件的分片 |
| `run --store DIR --input FILE --shards N --workers W` | 初始化或校验标识；分批启动有并发上限的进程；输出覆盖情况和凭据 |
| `status --store DIR` | 校验并报告持久化快照 |
| `demo --input FILE` | 从临时存储中打印实际工作进程崩溃及恢复快照 |

分片数范围为 1..1024，并发进程槽位为 1..64。空桶不加入活动租约。包含已记录预测的有序数据集，按照本项目采用的 Go JSON 结构体编码计算哈希。这是该交付物自己的标识格式，并非跨语言 JSON 规范化标准；集成报告时应保留输出的哈希。

工作进程选项包括：`--lease-ms`（默认 30000）、`--now-ms`（默认 -1，表示使用实际时钟）、`--delay-ms`（0..60000）和 `--crash-after-claim`（故意以 86 退出）。显式给出的非负 now-ms 是测试用固定逻辑时钟。完成时重新检查当前持久化的持有者和版本，不能信任工作进程旧的内存 Lease。

`farm.json` 保存 schema_version 1、dataset_sha256、shard_count、cases 和 shards。每个分片保存 case_ids，以及包含 Shard、Worker、Version、Until、Result 和 Done 的阶段 Lease 对象。完成后的 Result 是编码后的 JSON，包含 worker_pid、有序的用例正确性标志、correct 和 total。首字母大写的租约字段名保留了原始 Go 教学 API。

`Partition` 定义归属，`InitFarm` 将归属持久化。`ClaimShard` 加锁、加载、领取并持久化之后才返回输入。`WorkShard` 在锁外执行精确匹配评估。`CompleteShard` 在持锁期间重新加载并调用 `Submit`。`RunFarm` 使用学习者实现的 `Parallel` 池启动同一个二进制程序的 worker 命令，并将取消信号传给 `exec.CommandContext`。

报告包含 complete、active_shards、completed_shards、correct、evaluated、dataset_cases、worker_processes、receipts 和完整分片账本。`worker_processes` 统计已接受凭据中不同 PID 的数量，不能当作配置的并发数测量值。run 还会输出 worker_events。每次调用的工作池限制同时运行的子进程数，进程 ID 则可能每次运行都不同。

stdout 输出 JSON，stderr 输出失败信息。退出码 0 表示命令成功；若剩余租约仍被持有，run 在打印 complete:false 后以 1 退出。格式错误输入、过期完成请求、数据集变化或损坏状态也以 1 退出。故意注入的崩溃在领取信息持久化后以 86 退出。已完成运行再次执行时不会重新计算结果。

文件系统被视为可信本地存储，不能作为经过身份认证的证据。快照校验器检查数据集标识、分区归属、租约结构以及凭据覆盖情况和计数，不会认证手工修改一致快照的人。网络扩展需要经过认证的工作进程、有边界的请求、支持事务的协调器和时钟策略；只保留 JSON 字段名远远不够。
