# 接收幂等的完成凭据（Accept idempotent completion receipts）

> 使用错误租约提交的结果，即使答案正确，也仍是过期结果。

**Type:** Build
**Languages:** Go
**Prerequisites:** 完成第 1 至 2 阶段，并理解其导出类型和失败契约。
**Stage:** 3 of 4
**Time:** ~2 小时

## 构建目标

为一个租约接受一个结果。在已初始化的工作区实现 `stage3.go`。随附 CLI 调用你的实现，不导入参考解答。

## 理解运行机制

结果与分片、持有者和版本绑定。假设 old/v1 算出了正确答案，但 new/v2 已完成该分片；old/v1 的提交必须在比较结果文本前就失败。工作进程算得再好，也不会因此获得当前写入权限。

首次完成前，要求 now < Until，且结果非空、最多 1 MiB。完成后，同一持有者、版本和完全相同的结果可以再次成功交付，即使租期已经过去；这只是确认已有凭据，不会重新开启评估。修改任意结果字节都会冲突。

CLI 先转为小写并合并空白，再将提供的已记录响应与预期文本比较。`GET` 与 ` get ` 匹配，`no` 与 `yes` 不匹配。每个分片凭据保存有序用例 ID、正确性标志和实际工作进程 PID。协调器在写入持久化 Lease.Result 之前，检查凭据的覆盖情况与计数。

这是一种范围有限的精确匹配评估器，不能评判改写、引用支撑或模型推理。替换评估器之前，应先定义稳定的评分版本，并将版本纳入运行标识。

```figure
pj-distributed-eval-farm-3
```

## 实现契约

```go
func Submit(l *Lease, worker string, version int, now int64, result string) error
```

保留 `types.go` 中的公开签名和错误定义。拒绝调用时，必须保持调用方先前状态不变。阅读[项目 API](../../../API.md)，了解最终交付物的文件与进程边界。

## 实现提示

先检查持有者和版本，再处理已经完成的结果。只对首次完成应用到期条件；这种顺序允许重新交付相同凭据。

## 验证实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py distributed-eval-farm --stage 3 --path /tmp/distributed-eval-farm-work --strict
```

评分器检查你选择的工作区，包括前面阶段。参考模式属于独立的教学检查，不计为学习者完成。

## 检查失败边界

在 109 完成，在 200 重新交付相同数据，然后改动一个结果字节。预测三种结果。再让旧持有者提交相同数据，解释为何仍然失败。

## 来源与限制

按需学习标准库的 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习与样本均为原创。进程恢复只在单主机范围演示；改造交付物时，应保留 README 中明确列出的文件系统与评估限制。
