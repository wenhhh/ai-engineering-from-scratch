# 持久化智能体任务（Durable Agent Jobs）

构建本地报告队列，在领取、写出结果和标记完成之间都能中断。让另一个工作进程使用同一目录重新启动，准确检查哪些工作被重复执行。最终交付物接收文本记录，为每个任务写入一份与内容绑定的凭据。

Go 适合构建小型独立工作进程二进制，并显式执行文件系统操作。核心与 CLI 均只使用标准库。四阶段约需 8 小时；需要 Linux 或 macOS、Go 1.22+、供评分器使用的 Python 3.10+，以及结构体、指针、错误和 JSON 基础。初次接触这些概念时，先学习 [Go 语言之旅](https://go.dev/tour/)，第 4 阶段配合学习 [os 文件系统 API](https://pkg.go.dev/os)。

## 构建并运行你的版本

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --init /tmp/durable-agent-jobs-work
python3 scripts/project_test.py durable-agent-jobs --stage 1 --path /tmp/durable-agent-jobs-work --strict
```

第一条命令提供带类型的契约、CLI 和样本输入。实现 `stage1.go` 前，第一次测试会按设计失败。继续完成四个阶段，再评分并运行自己的完整工作区：

```bash
python3 scripts/project_test.py durable-agent-jobs --all --path /tmp/durable-agent-jobs-work --strict --report /tmp/durable-learner.json
cd /tmp/durable-agent-jobs-work
go build -o /tmp/durable-learner .
/tmp/durable-learner demo --input samples/jobs.json
```

演示在独立进程中调用你的二进制。只有完整的学习者报告才能证明本地完成；参考解答测试不授予证书。

## 使用自己的数据运行参考解答

```bash
cd projects/durable-agent-jobs/solution
go build -o /tmp/durable-jobs .
STORE=$(mktemp -d /tmp/durable-jobs.XXXXXX)
/tmp/durable-jobs enqueue --store "$STORE" --input samples/jobs.json
/tmp/durable-jobs worker --store "$STORE" --max-jobs 100
/tmp/durable-jobs status --store "$STORE"
```

输入是由 `{ "id": "report-one", "text": "your report text" }` 组成的 JSON 数组。修改随附样本副本，或提供自己的路径。内容完全相同的重复入队可以安全处理；已有 ID 的载荷变化会冲突。输出凭据包含 SHA256、UTF-8 字节数和按空白分隔的词数；工作进程不会通过模型生成或发送报告。

使用新存储复现崩溃：

```bash
CRASH_STORE=$(mktemp -d /tmp/durable-crash.XXXXXX)
/tmp/durable-jobs enqueue --store "$CRASH_STORE" --input samples/jobs.json
/tmp/durable-jobs worker --store "$CRASH_STORE" --now-ms 100 --lease-ms 10 --crash-after effect
/tmp/durable-jobs status --store "$CRASH_STORE"
/tmp/durable-jobs worker --store "$CRASH_STORE" --now-ms 111 --lease-ms 10 --max-jobs 100
/tmp/durable-jobs status --store "$CRASH_STORE"
```

崩溃命令按设计以 86 退出。恢复前，`incident-summary` 处于 running v1，凭据已经存在：95 字节、11 词。恢复后，它变为 completed v4，尝试次数为 2，工作进程报告 `reused_effect: true`。第二个样本完成于 v2，凭据记录 79 字节、12 词。将 `--crash-after effect` 改为 `claim`，可以观察结果尚不存在时的恢复。`go run . demo` 自动执行写出结果后的崩溃序列，并且只清理自己创建的临时目录。

`--now-ms` 注入测试时钟；省略它时使用真实墙上时钟。`--delay-ms 500` 让另一进程有机会在旧工作进程完成前，回收已过期的领取。过期版本的完成提交会失败；两个普通工作进程可以安全领取不同任务。

## 逐项学习边界

1. [创建稳定任务标识](stages/01-create-jobs-with-stable-identity/docs/en.md)。
2. [按版本和租约领取任务](stages/02-claim-with-a-lease-and-version/docs/en.md)。
3. [回收任务并拒绝旧工作进程提交](stages/03-finish-or-reclaim-expired-work/docs/en.md)。
4. [持久化快照并恢复执行结果](stages/04-write-and-recover-atomic-snapshots/docs/en.md)。

[API.md](API.md) 定义集成契约。任何语言都可调用二进制并解析其 JSON。评分器构建选定工作区，测试真实崩溃、并发工作进程、过期版本完成提交、输入变化，以及损坏状态的保留：

```bash
python3 scripts/project_test.py durable-agent-jobs --all --solution --strict
```

本批验证环境尚未安装 Go，编译、工作进程崩溃恢复和并发运行未执行。下列机制说明沿用固定上游；源结构和 JavaScript 图表对照不能替代这些运行验证。

## 如实说明限制

存储通过建议锁，在同一台主机的本地 POSIX 文件系统中协调遵守约定的进程。不要放到 NFS，不要绕过包装器或与不可信写入者共享，也不要将其当作具备身份认证的服务。Windows 需要另外的锁实现。

执行语义为至少一次。本地不可变凭据让这一特定结果具有幂等性，不能保证任意付款、邮件或远程写入都恰好发生一次。崩溃可能留下临时文件或未被引用的输入。快照重命名与文件同步支持进程恢复，但缺少目录同步时，不能承诺断电持久性。达到尝试上限后，任务继续可见，留待人工对账。该教学规模队列的快照上限为 4 MiB，不包含调度、心跳续租或远程传输。
