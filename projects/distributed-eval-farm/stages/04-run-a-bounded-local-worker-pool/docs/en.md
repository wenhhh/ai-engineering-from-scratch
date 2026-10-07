# 运行有并发上限的本地工作池（Run a bounded local worker pool）

> 每个派发的工作进程都采用相同的持久化领取和凭据提交流程，并发才真正有用。

**Type:** Build
**Languages:** Go
**Prerequisites:** 完成第 1 至 3 阶段，并理解其导出类型和失败契约。
**Stage:** 4 of 4
**Time:** ~2 小时

## 构建目标

让整个评估集群跨进程运行。在已初始化的工作区实现 `stage4.go`。随附 CLI 调用你的实现，不导入参考解答。

## 理解运行机制

围绕注入回调实现有并发上限的 goroutine 池。channel 传递唯一工作 ID，同时调用回调的数量最多为配置的工作者数。收集成功的 Item 并按 ID 排序。若一个回调失败，将它的错误与实际收集到的成功结果一起返回。取消操作阻止继续开展新工作，并传入每个回调。

最终的 `run` 命令用这个池启动操作系统工作进程。每个回调以 worker 命令执行同一个已编译二进制程序；每个进程领取一个持久化分片，评估已记录预测，并使用当前租约提交。工作分批有界运行，直到所有分片完成，或每个剩余分片都有尚未到期的持有者。

四用例样本配合 workers 2，会分两批创建四个短生命周期进程。上限 2 描述同时运行的进程数，不能当作总进程数。结果报告显示四个答案中三个正确、完整覆盖、数据集哈希、分片持有者和实际进程 ID。PID 每次可能不同，分数来自提供的响应。

最后一阶段的测试让延迟的旧工作进程与接替者同时运行。接替者提交后，旧进程因版本令牌校验失败退出，持久化快照保持不变。测试还会让进程崩溃、从磁盘恢复、拒绝变化的数据集，并保留损坏输入用于诊断。这些属于同主机协调，不包含跨机器传输。

```figure
pj-distributed-eval-farm-4
```

## 实现契约

```go
func Parallel(ctx context.Context, ids []string, workers int, run func(context.Context, string) (string, error)) ([]Item, error)
```

保留 `types.go` 中的公开签名和错误定义。拒绝调用时，必须保持调用方先前状态不变。阅读[项目 API](../../../API.md)，了解最终交付物的文件与进程边界。

## 实现提示

只有派发 goroutine 负责关闭 jobs channel；全部工作者退出后再关闭 results。为结果收集保留足够容量，或在出错后继续消费结果，避免发送者阻塞无法退出。

## 验证实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py distributed-eval-farm --stage 4 --path /tmp/distributed-eval-farm-work --strict
```

评分器检查你选择的工作区，包括前面阶段。参考模式属于独立的教学检查，不计为学习者完成。

## 检查失败边界

分别用 workers 1 和 2 运行样本，比较覆盖情况与凭据，不以实际运行速度作为结论。尝试 workers 0 和已取消的 context，说明为何忽略 context 的回调仍可能延迟工作池关闭。

## 来源与限制

按需学习标准库的 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习与样本均为原创。进程恢复只在单主机范围演示；改造交付物时，应保留 README 中明确列出的文件系统与评估限制。
