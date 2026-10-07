# 用版本令牌保护每个分片租约（Fence each shard lease）

> 租约必须在领取它的进程结束后仍然存在，接替进程必须在同一条记录上推进版本。

**Type:** Build
**Languages:** Go
**Prerequisites:** 完成第 1 阶段，并理解其导出类型和失败契约。
**Stage:** 2 of 4
**Time:** ~2 小时

## 构建目标

使另一个进程能够安全接管。在已初始化的工作区实现 `stage2.go`。随附 CLI 调用你的实现，不导入参考解答。

## 理解运行机制

第一个工作进程在 100 ms 领取 shard-0，租期为 10 ms。持久化记录的 owner 为 old、version 为 1、until 为 110。第二个进程在 109 无法领取，在 110 则可以成为持有者 new，版本推进为 2。已完成分片无论经过多久都保持关闭。

`Acquire` 只修改内存中的一个 Lease。`ClaimShard` 在 `ledger.lock` 保护下，将它与整次运行快照结合：持锁重新加载，选择符合条件的分片，调用 Acquire，保存，最后才将用例交给工作进程。领取信息尚未持久化就开始评估，会导致崩溃后找不到可恢复的持有者。

初始化后运行 `farm worker --crash-after-claim`。它启动真实进程，在重命名后以 86 退出，将租约留在磁盘。接替进程可在到期边界恢复分片。观察这一故障不需要网络、模型服务或模拟回调。

所有参与方都必须在本地 Linux 或 macOS 文件系统上使用加锁包装。直接调用 Acquire 不会协调进程。网络文件系统或远程数据库需要各自明确的事务和时钟契约。

```figure
pj-distributed-eval-farm-2
```

## 实现契约

```go
func Acquire(l *Lease, worker string, now, ttl int64) error
```

保留 `types.go` 中的公开签名和错误定义。拒绝调用时，必须保持调用方先前状态不变。阅读[项目 API](../../../API.md)，了解最终交付物的文件与进程边界。

## 实现提示

修改前检查 Done，以及当前已被持有且尚未到期的租约。校验时钟运算，将持有者、版本和到期时间作为同一个转换更新。

## 验证实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py distributed-eval-farm --stage 2 --path /tmp/distributed-eval-farm-work --strict
```

评分器检查你选择的工作区，包括前面阶段。参考模式属于独立的教学检查，不计为学习者完成。

## 检查失败边界

让工作进程领取后暂停，再以同一个逻辑时刻运行另一个进程。确认它报告待完成工作，而不抢占租约；随后在 110 恢复，并检查持久化版本。

## 来源与限制

按需学习标准库的 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习与样本均为原创。进程恢复只在单主机范围演示；改造交付物时，应保留 README 中明确列出的文件系统与评估限制。
