# 写入与恢复原子快照

> 输出已经存在、队列尚未记录完成时，也可能发生崩溃。让这一间隙可以稳定复现。

**Type:** Build
**Languages:** Go
**Prerequisites:** 完成第 1—3 阶段，理解其导出类型和失败契约。
**Stage:** 4 of 4
**Time:** ~2 小时

## 构建内容

恢复执行结果和账本。在初始化后的工作区实现 `stage4.go`。随附 CLI 调用你的实现，不导入参考解答。

## 推演实现机制

打开临时快照前，校验每个任务并拒绝重复标识符。在目标目录写入，同步并关闭文件，然后重命名以替换 `jobs.json`。加载器将文件限制为 4 MiB，拒绝截断 JSON、未知字段和尾随文档。校验失败必须保留之前的快照。

组合后的工作进程先持久化领取记录，再读取不可变输入，创建 `effects/<id>.json`，最后持久化完成状态。凭据包含输入 SHA256、字节数和词数。同步临时凭据后，通过不允许替换的硬链接发布最终文件。最终凭据已含预期值时，恢复流程直接复用。

在自己的完整工作区运行 `go run . demo`。演示启动真实工作进程，在写出第一个执行结果后以 86 退出。status 显示 running v1 和一份凭据。下一工作进程使用逻辑时间 111，回收后领取 v3，发现已有凭据，再以 `reused_effect: true` 完成 v4。第二个样本任务正常完成。

原子重命名避免读者看到不完整 JSON，但不会把输入、凭据和账本合成一个事务。生产方崩溃可能留下未被引用的输入文件，内容相同的入队可以安全接纳它。缺少目录同步时，仅文件同步不能证明断电持久性。练习所验证的范围是本地文件系统上的进程崩溃恢复。

```figure
pj-durable-agent-jobs-4
```

## 实现契约

```go
func ValidateJobs(jobs []Job) error
func Save(file string, jobs []Job) error
func Load(file string) ([]Job, error)
```

保留公共签名及 `types.go` 中的错误。调用被拒绝时，调用方先前状态必须保持不变。最终交付物的文件与进程边界见[项目 API](../../../API.md)。

## 实现提示

临时文件上的每项操作成功之前，保留旧快照。不要因使用 defer 而忽略 Close 错误。阅读 `runner.go`，了解各函数如何在同一把锁下组合。

## 验证你的实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 4 --path /tmp/durable-agent-jobs-work --strict
```

评分器测试你选定的工作区，包括之前的阶段。参考模式是独立的教师检查，不能获得学习者完成资格。

## 探查失败情况

先运行 README 中的领取后崩溃实验，再运行写出结果后崩溃实验。分别统计恢复前后的凭据文件数。纸面上将写凭据替换成 HTTP 付款调用：需要什么幂等键及接收方持久化契约？

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复只在单台主机演示；修改交付物时，必须保留 README 所列文件系统与评估边界。
