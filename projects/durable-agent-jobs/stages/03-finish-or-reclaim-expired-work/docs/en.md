# 完成任务或回收过期工作

> 较慢的工作进程醒来时，另一进程可能已经完成任务。旧凭据不得覆盖账本。

**Type:** Build
**Languages:** Go
**Prerequisites:** 完成第 1—2 阶段，理解其导出类型和失败契约。
**Stage:** 3 of 4
**Time:** ~2 小时

## 构建内容

区分完成结果与执行资格。在初始化后的工作区实现 `stage3.go`。随附 CLI 调用你的实现，不导入参考解答。

## 推演实现机制

工作进程 A 持有版本 1，租约到 110。在 110 完成版本 1 会失败。回收将 running v1 改为 queued v2，清除租约，同时保留尝试次数 1。B 领取 queued v2 后得到 running v3、尝试次数 2。A 迟到的完成提交仍携带版本 1，即使它的时钟显示 105，也会失败。版本检查避免旧时间视图重新取得执行资格。

B 在租约到期前完成，产生 completed v4。完成是新的状态转换，版本不同于领取时的版本。重复调用 `Finish` 会失败，因为任务已不处于 running。这与幂等输出凭据有意区别：账本转换和业务副作用各有契约。

CLI 的 `--now-ms` 仅用于可重复实验。普通工作进程在领取与完成时读取当前墙上时钟。注入固定时钟可以验证版本校验，但不模拟计算期间真实时钟的推进。多台使用独立时钟的机器需要协调方统一提供时间依据。

```figure
pj-durable-agent-jobs-3
```

## 实现契约

```go
func Finish(j *Job, expected int, now int64) error
func Reclaim(j *Job, now int64) bool
```

保留公共签名及 `types.go` 中的错误。调用被拒绝时，调用方先前状态必须保持不变。最终交付物的文件与进程边界见[项目 API](../../../API.md)。

## 实现提示

Reclaim 必须同时检查 running 状态和到期时间。queued 或 completed 记录应逐字节保持不变。Finish 必须同时检查当前版本和租约。

## 验证你的实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 3 --path /tmp/durable-agent-jobs-work --strict
```

评分器测试你选定的工作区，包括之前的阶段。参考模式是独立的教师检查，不能获得学习者完成资格。

## 探查失败情况

对租约到期时间 110，分别测试 109 和 110。然后让 A 在 B 已领取 v3 后提交完成，说明延长 A 的超时为何不能恢复其执行资格。

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复只在单台主机演示；修改交付物时，必须保留 README 所列文件系统与评估边界。
