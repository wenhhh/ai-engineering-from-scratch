# 分布式评估集群协调器（Distributed Eval Farm Coordinator）

将记录了模型预测的文件转为可恢复的评估运行。独立工作进程领取持久化分片，比较答案，并发布经过版本令牌校验的凭据。在领取后终止一个工作进程，再重新启动运行，证明旧工作进程无法覆盖接替者的结果。 译注：本轮汉化环境没有 Go 工具链，本项目编译、阶段测试和命令行运行尚未完成；以下演示描述沿用上游，历史录屏不作为本轮实跑证据。

Go 适合这类协调器：同一个不依赖第三方库的二进制程序可以启动子工作进程、限制并发，并协调文件系统状态。本实现将工作分配到同一台 Linux 或 macOS 主机上的多个进程，不提供跨机器传输，也不执行模型推理。

四阶段约需 8 小时。需要 Go 1.22+、用于评分器的 Python 3.10+，以及结构体、错误、JSON、goroutine、channel 和取消机制知识。若不熟悉 channel，可先学习 [Go 语言之旅](https://go.dev/tour/)与 [Go 流水线](https://go.dev/blog/pipelines)。完成[持久化智能体任务](../durable-agent-jobs/README.md)会让持久化阶段更容易上手。

## 构建并运行自己的版本（Build and run your version）

从仓库根目录运行：

```bash
python3 scripts/project_test.py distributed-eval-farm --init /tmp/distributed-eval-farm-work
python3 scripts/project_test.py distributed-eval-farm --stage 1 --path /tmp/distributed-eval-farm-work --strict
```

初始化会提供类型、进程衔接代码和预测样本。实现 `stage1.go` 之前，第一个测试会有意失败。完成全部四阶段后，再运行组装出的交付物：

```bash
python3 scripts/project_test.py distributed-eval-farm --all --path /tmp/distributed-eval-farm-work --strict --report /tmp/farm-learner.json
cd /tmp/distributed-eval-farm-work
go build -o /tmp/farm-learner .
/tmp/farm-learner demo --input samples/cases.json --workers 2 --shards 4
```

演示让一个真实工作进程在持久化领取信息后崩溃，打印未完成快照，再在到期边界启动接替进程。随附协调器调用你实现的阶段函数。参考实现通过属于教学验证，不能当作学习者完成的证据。

## 用预测文件运行参考实现

```bash
cd projects/distributed-eval-farm/solution
go build -o /tmp/eval-farm .
STORE=$(mktemp -d /tmp/eval-farm.XXXXXX)
/tmp/eval-farm init --store "$STORE" --input samples/cases.json --shards 4
/tmp/eval-farm run --store "$STORE" --input samples/cases.json --shards 4 --workers 2
/tmp/eval-farm status --store "$STORE"
```

每条输入记录包含 id、prompt、expected 和 response。可以传入自己的 JSON 数组，或编辑样本副本。评分先转为小写并合并空白，再比较 expected 和 response。四条原创样本记录得分为 3/4。run 之前，completed_shards 和 evaluated 都为 0；之后 complete 为 true、completed_shards 为 4、evaluated 为 4、correct 为 3。

报告保留有序数据集的 SHA256、各分片的用例结果、持有者、版本和实际工作进程 PID。使用样本并配置 workers 2 时，两批有界执行会启动四个短生命周期进程。PID 会变化，并发上限仍为 2。已完成运行再次执行时不产生新的工作进程事件，并保留已有凭据。记录好的样本答案用于演示协调机制，不构成模型基准成绩。

## 恢复崩溃的工作进程

使用独立存储和一个分片，让恢复过程容易追踪：

```bash
CRASH_STORE=$(mktemp -d /tmp/eval-crash.XXXXXX)
/tmp/eval-farm init --store "$CRASH_STORE" --input samples/cases.json --shards 1
/tmp/eval-farm worker --store "$CRASH_STORE" --worker-id old --now-ms 100 --lease-ms 10 --crash-after-claim
/tmp/eval-farm status --store "$CRASH_STORE"
/tmp/eval-farm run --store "$CRASH_STORE" --input samples/cases.json --shards 1 --workers 2 --now-ms 110 --lease-ms 10
```

崩溃会有意返回退出码 86。状态显示 owner 为 old、version 为 1、到期时间为 110、Done 为 false。在 110 恢复后，版本 2 完成并包含全部四个用例结果；在 109 恢复则报告仍有待完成工作，并以 1 退出，不会抢占有效租约。省略 now-ms 可使用实际时钟。`--delay-ms` 在领取后暂停，用于暴露旧工作进程竞态，不改变评分函数。

## 学习与集成

1. [按稳定用例标识分片](stages/01-partition-stable-case-identities/docs/en.md).
2. [持久化分片租约并校验版本令牌](stages/02-fence-each-shard-lease/docs/en.md).
3. [接收幂等凭据](stages/03-accept-idempotent-completion-receipts/docs/en.md).
4. [组装有并发上限的进程协调器](stages/04-run-a-bounded-local-worker-pool/docs/en.md).

[API.md](API.md) 说明 JSON 和进程边界。任意语言都能写入预测文件并解析报告。最后一阶段的测试会构建所选学习者二进制程序，启动实际工作进程，验证崩溃恢复、延迟的过期写入、数据集变化和损坏状态保留：

```bash
python3 scripts/project_test.py distributed-eval-farm --all --solution --strict
```

## 明确限制

协调器使用 4 MiB 的整次运行快照和本地 POSIX 建议锁，所有写入者都必须配合遵守锁规则。网络文件系统、不可信存储写入者和多主机时钟均不在契约范围内。文件同步与原子重命名用于演示进程崩溃恢复；目录同步及断电保证尚未实现。

预测已提前记录。精确匹配评分不评判语义质量、引用或公平性，也不调用任何模型 API。这里没有网络工作进程协议、租约心跳、动态重分片、重试退避或调度守护进程。`run` 分批执行有界工作并报告待完成租约，不无限等待；到期后可再次调用。上下文取消约束配合取消的回调，CLI 另外为运行设置两分钟截止时间。这些都是可见的高级扩展起点，不能视为隐藏的生产保证。
