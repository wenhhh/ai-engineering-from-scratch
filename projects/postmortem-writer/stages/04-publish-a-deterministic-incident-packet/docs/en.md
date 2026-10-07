# 发布确定性的事故材料包

> 已校验的论断与有序证据共同形成完整材料包

**Type:** Build
**Languages:** Go
**Stage:** 第 4 阶段，共 4 阶段
**Time:** 约 2 小时

## 发布能显示未完成审阅的材料包

文本材料包、HTML 工作台和 JSON 凭据描述相同的已校验输入。HTML 包含来源链接、物理行定位、所报告的影响、论断决策和带负责人的后续行动。待审阅论断与未分配工作保持可见，不会从最终报告中消失。

## 推演一个用例

运行 `go run . --events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet`。打开 index.html，从 e2 跟踪到精确日志行。批准某项论断时，将 packet.json 中的 SourceSHA256 复制到审阅文件的 sourceSHA256，把 state 设为 approved，并提供审阅者标签，然后重新构建。

```figure
pj-postmortem-writer-4
```

译注：图表范围：这里只演示事件时间、引用和审批状态；不实际导入 JSONL、计算来源哈希或校验所有整数与文件写入边界。完整来源及批准检查由 Go 实现执行。

## 你的任务

```go
func Report(events []Event,claims []Claim,maxClaims int)(string,error)
```

在工作区中实现这些公开签名。区分无效输入、预算上限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已纳入版本库的参考实现中编写另一个函数，并不会推进你的阶段进度。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 4 --path /tmp/postmortem-writer-work
```

本阶段检查 Packet、Limit、InvalidAtomic、Escaped、Deterministic。使用失败用例定位违反的不变条件；仅通过正常示例不足以说明边界行为。

## 实现提示

产生输出前，对每项论断调用 Verify，然后排序时间线。论断数量超过上限时拒绝。HTML 使用 Go 模板，使含 script 标签的消息仍按文本显示。审批身份是调用方提供的标签，未经过身份认证或签名验证。

先处理一个有效记录，再加入应拒绝的用例，之后才做优化。失败时保持源数据不变，便于调用方诊断。用能表达边界的最小函数实现；额外框架会掩盖当前要学习的机制。

## 检查理解

批准之后修改一个日志字节，确认构建因来源冲突而失败。集成测试还会拒绝伪造引文和缺失时间戳。扩展时可将日志导出器接入 JSONL；保持证据契约，不要补入虚构的因果解释。

运行测试前先写下预测。若结果出乎意料，沿校验、状态构建和输出逐步跟踪输入。通过测试的参考实现用于比较；只有自己的工作区通过累计评分，才能作为完成证据。

## 使用自己的数据

`--events FILE --review FILE --out DIRECTORY` 会生成 index.html、packet.json 和 packet.txt。使用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行随附文件。不传参数时，命令行程序打印一个小型原创夹具。证据检查确认来源；因果判断和审阅者身份仍需人工负责。

## 来源

[Google SRE 事故复盘实践](https://sre.google/workbook/postmortem-culture/)。
