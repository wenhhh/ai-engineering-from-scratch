# 使用租约和版本领取任务

> 领取成功时，工作进程才获得执行资格。开始工作前先持久化领取记录。

**Type:** Build
**Languages:** Go
**Prerequisites:** 完成第 1 阶段，理解其导出类型和失败契约。
**Stage:** 2 of 4
**Time:** ~2 小时

## 构建内容

预留执行时间窗口。在初始化后的工作区实现 `stage2.go`。随附 CLI 调用你的实现，不导入参考解答。

## 推演实现机制

从 queued、版本 0、尝试次数 0 开始。在 100 ms 以预期版本 0 领取 10 ms，结果变为 running、版本 1、尝试次数 1、租约到期时间 110。租约区间为 [100,110)，不包含右端点。

两个工作进程可能同时读到版本 0，但只有第一个成功领取者能继续。如果先修改记录再检查预期版本，就会丢失拒绝第二个工作进程所需的依据。给任何字段赋值前，先校验状态、预期版本、尝试上限、时钟和溢出。

`ClaimJob` 是纯内存状态转换。随附 `ClaimNext` 包装器在加载、转换和 Save 整个过程中持有操作系统文件锁。独立进程打开同一个 `ledger.lock`，进程崩溃后内核释放锁。`jobs.json` 被替换时，稳定的锁文件保持不动。如果锁定被重命名的快照本身，各进程可能锁到不同文件对象。

恢复后仍保留尝试计数。上限为 3 时，崩溃三次的任务应继续以 queued、尝试次数 3 的状态可见；静默清零会产生无限重试。

```figure
pj-durable-agent-jobs-2
```

## 实现契约

```go
func ClaimJob(j *Job, expected int, now, ttl int64, maxAttempts int) error
```

保留公共签名及 `types.go` 中的错误。调用被拒绝时，调用方先前状态必须保持不变。最终交付物的文件与进程边界见[项目 API](../../../API.md)。

## 实现提示

每条拒绝路径都提前返回。加法前检查 `now > MaxInt64-ttl`；通过后再设置租约、版本、尝试次数和状态。

## 验证你的实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 2 --path /tmp/durable-agent-jobs-work --strict
```

评分器测试你选定的工作区，包括之前的阶段。参考模式是独立的教师检查，不能获得学习者完成资格。

## 探查失败情况

预测两个调用方都传入 expected 0 之后的快照。再设置 maxAttempts 为 1，并回收首次尝试。即使状态已经是 queued，下次领取为何仍然失败？

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复只在单台主机演示；修改交付物时，必须保留 README 所列文件系统与评估边界。
