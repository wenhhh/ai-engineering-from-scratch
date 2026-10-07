# 创建具有稳定标识的任务

> 生产方丢失了确认消息，同一报告请求因而到达两次。两次投递应指向同一个任务。

**Type:** Build
**Languages:** Go
**Prerequisites:** Go 结构体、指针、错误、JSON 文件和 shell；按顺序完成此前阶段。
**Stage:** 1 of 4
**Time:** ~2 小时

## 构建内容

让重试沿用同一标识。在初始化后的工作区实现 `stage1.go`。随附 CLI 调用你的实现，不导入参考解答。

## 推演实现机制

任务记录需要持久保存的执行意图。函数创建记录，但不执行意图本身。保持 `ID`、`State`、`Version`、`LeaseUntil` 和 `Attempts` 可见，不要压缩成单个布尔值；布尔值无法说明任务是否正由其他工作进程持有。

对 `report-1` 返回 queued，版本 0、尝试次数 0、租约 0。拒绝 `../report`、空串、大写首字母、空格及超过 64 字符的标识符。接受小写字母开头，后跟小写字母、数字或连字符的形式。不要通过修剪，把无效标识符变成另一个有效标识。

随附 CLI 后续将 `{id,text}` 与任务状态分开保存。同一标识符及完全相同的文本重复入队时不做修改；已有标识符的文本变化会冲突。这样生产方重试时，不会意外替换已执行的工作。

```figure
pj-durable-agent-jobs-1
```

## 实现契约

```go
func NewJob(id string) (Job, error)
```

保留公共签名及 `types.go` 中的错误。调用被拒绝时，调用方先前状态必须保持不变。最终交付物的文件与进程边界见[项目 API](../../../API.md)。

## 实现提示

构造 Job 前检查整个标识符。零值 Job 的状态为空，因此只有成功时才返回显式 queued 状态。

## 验证你的实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 1 --path /tmp/durable-agent-jobs-work --strict
```

评分器测试你选定的工作区，包括之前的阶段。参考模式是独立的教师检查，不能获得学习者完成资格。

## 探查失败情况

创建 `a`，再尝试 `a ` 和 `a/`。说明修剪空白或清理路径为何会让重试产生歧义。给载荷增加报告格式前，先决定格式变化是否需要新标识符。

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复只在单台主机演示；修改交付物时，必须保留 README 所列文件系统与评估边界。
