# 为每项论断要求证据

> 论断引用 e99，但台账只有 e1，判为无效

**Type:** Build
**Languages:** Go
**Stage:** 第 3 阶段，共 4 阶段
**Time:** 约 2 小时

## 区分引用和结论

有效引用指向已知且不重复的事件，只能证明来源存在，不能证明该事件在逻辑上足以建立因果论断。组合后的审阅台还会校验逐字引文，保留待审阅论断，并要求已批准记录具有明确审阅者和匹配的来源哈希。

## 推演一个用例

论断“部署后出现了告警”引用 e1 和 e2。两个 ID 都存在，来源校验因此通过。更强的论断“部署导致了故障”即使引用相同 ID，也仍需调查。若来源只写了“latency high”，却引用“database failed”，必须拒绝该引文。

```figure
pj-postmortem-writer-3
```

译注：图表范围：这里只演示事件时间、引用和审批状态；不实际导入 JSONL、计算来源哈希或校验所有整数与文件写入边界。完整来源及批准检查由 Go 实现执行。

## 你的任务

```go
func Verify(claim Claim,events []Event)error
```

在工作区中实现这些公开签名。区分无效输入、预算上限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已纳入版本库的参考实现中编写另一个函数，并不会推进你的阶段进度。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 3 --path /tmp/postmortem-writer-work
```

本阶段检查 Supported、Dangling、NoEvidence、Duplicate、Blank。使用失败用例定位违反的不变条件；仅通过正常示例不足以说明边界行为。

## 实现提示

构建已知事件 ID 集合，并为论断中的证据 ID 维护独立集合。拒绝空白论断、缺少证据、重复引用及悬空引用。绝不为缺失来源填入看似合理的替代项。

先处理一个有效记录，再加入应拒绝的用例，之后才做优化。失败时保持源数据不变，便于调用方诊断。用能表达边界的最小函数实现；额外框架会掩盖当前要学习的机制。

## 检查理解

构造两项引用相同事件的不同论断。说明代码能够检查哪些内容，哪些判断仍需要审阅者完成。底层日志变化后，为什么已批准决策必须视为过期？

运行测试前先写下预测。若结果出乎意料，沿校验、状态构建和输出逐步跟踪输入。通过测试的参考实现用于比较；只有自己的工作区通过累计评分，才能作为完成证据。

## 使用自己的数据

`--events FILE --review FILE --out DIRECTORY` 会生成 index.html、packet.json 和 packet.txt。使用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行随附文件。不传参数时，命令行程序打印一个小型原创夹具。证据检查确认来源；因果判断和审阅者身份仍需人工负责。

## 来源

[Google SRE 事故复盘实践](https://sre.google/workbook/postmortem-culture/)。
