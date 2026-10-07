# 构建稳定且有界的时间线

> 事件 b 在第 5 秒、a 在第 1 秒，排序后先 a 再 b

**Type:** Build
**Languages:** Go
**Stage:** 第 2 阶段，共 4 阶段
**Time:** 约 2 小时

## 区分接收顺序与时间线顺序

日志可能乱序到达。时间线排列已观察到的事件，但不把先后顺序当作因果证明。复制输入，使其他使用者仍可检查到达顺序。两个事件发生在同一秒时，按事件 ID 决定先后。

## 推演一个用例

假设 b 在第 35 秒到达、a 在第 0 秒到达、c 也在第 35 秒到达，排序后为 a、b、c。时间上界设为 30 时操作失败，不能丢弃 b 和 c；被删掉的事件可能恰好反驳草稿中的解释。

```figure
pj-postmortem-writer-2
```

译注：图表范围：这里只演示事件时间、引用和审批状态；不实际导入 JSONL、计算来源哈希或校验所有整数与文件写入边界。完整来源及批准检查由 Go 实现执行。

## 你的任务

```go
func Timeline(events []Event,horizon int)([]Event,error)
```

在工作区中实现这些公开签名。区分无效输入、预算上限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已纳入版本库的参考实现中编写另一个函数，并不会推进你的阶段进度。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 2 --path /tmp/postmortem-writer-work
```

本阶段检查 Ordered、Tied、NoMutation、Bound、Empty。使用失败用例定位违反的不变条件；仅通过正常示例不足以说明边界行为。

## 实现提示

先校验时间上界和每个事件的时间。复制切片，再以秒数为主键、ID 为次键排序。测试同时检查输出顺序和输入是否保持不变。

先处理一个有效记录，再加入应拒绝的用例，之后才做优化。失败时保持源数据不变，便于调用方诊断。用能表达边界的最小函数实现；额外框架会掩盖当前要学习的机制。

## 检查理解

时间上界恰好设为 35 时，同样三条记录会怎样？改变同时间戳事件的到达位置，证明最终材料包仍一致。

运行测试前先写下预测。若结果出乎意料，沿校验、状态构建和输出逐步跟踪输入。通过测试的参考实现用于比较；只有自己的工作区通过累计评分，才能作为完成证据。

## 使用自己的数据

`--events FILE --review FILE --out DIRECTORY` 会生成 index.html、packet.json 和 packet.txt。使用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行随附文件。不传参数时，命令行程序打印一个小型原创夹具。证据检查确认来源；因果判断和审阅者身份仍需人工负责。

## 来源

[Google SRE 事故复盘实践](https://sre.google/workbook/postmortem-culture/)。
