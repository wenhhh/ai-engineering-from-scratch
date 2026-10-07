# 解析事故事件台账

> e1、12、alert、latency high 以制表符分隔，得到 t=12 的事件

**Type:** Build
**Languages:** Go
**Stage:** 第 1 阶段，共 4 阶段
**Time:** 约 2 小时

## 通过稳定定位信息接收证据

先处理小型制表符台账：事件 ID、经过秒数、类型和消息。之后的每项论断都依赖这些标识。随附 JSONL 导入器会将明确的记录转换为此契约，并保留原始物理行号，计入空行。

## 推演一个用例

即使第 12 秒发生的告警是首条输入事件，它仍然有效。第二个事件使用同一 ID 时构成冲突。JSONL 缺少 second 时必须拒绝，不能静默当作零。若事件前面有一个空白首行，导入器应保留其位于第 2 行的信息。

```figure
pj-postmortem-writer-1
```

译注：图表范围：这里只演示事件时间、引用和审批状态；不实际导入 JSONL、计算来源哈希或校验所有整数与文件写入边界。完整来源及批准检查由 Go 实现执行。

## 你的任务

```go
func Parse(text string)([]Event,error)
```

在工作区中实现这些公开签名。区分无效输入、预算上限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已纳入版本库的参考实现中编写另一个函数，并不会推进你的阶段进度。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 1 --path /tmp/postmortem-writer-work
```

本阶段检查 Valid、Negative、Duplicate、Missing、Empty。使用失败用例定位违反的不变条件；仅通过正常示例不足以说明边界行为。

## 实现提示

追加记录前先解析整数。四个字段都必须存在，时间不能为负。维护 ID 集合，出现重复时拒绝整个批次。JSONL 输入契约拒绝未知字段和内嵌记录分隔符，防止转换时插入伪造台账行。

先处理一个有效记录，再加入应拒绝的用例，之后才做优化。失败时保持源数据不变，便于调用方诊断。用能表达边界的最小函数实现；额外框架会掩盖当前要学习的机制。

## 检查理解

在三条有效记录后加入一条格式损坏的记录。调用方应收到什么？解释为什么保留物理行号比只给成功解析的记录编号更有用。

运行测试前先写下预测。若结果出乎意料，沿校验、状态构建和输出逐步跟踪输入。通过测试的参考实现用于比较；只有自己的工作区通过累计评分，才能作为完成证据。

## 使用自己的数据

`--events FILE --review FILE --out DIRECTORY` 会生成 index.html、packet.json 和 packet.txt。使用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行随附文件。不传参数时，命令行程序打印一个小型原创夹具。证据检查确认来源；因果判断和审阅者身份仍需人工负责。

## 来源

[Google SRE 事故复盘实践](https://sre.google/workbook/postmortem-culture/)。
