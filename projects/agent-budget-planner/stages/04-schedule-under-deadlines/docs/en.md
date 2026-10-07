# 在费用与时间限制内调度（Schedule within cost and time limits）

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

有资源限制的智能体不仅需要费用计数器。在每个顺序任务运行前检查截止时间和费用上限，再追加明确的 completed 或 rejected 事件。测试使用确定性时长，无须真实休眠。

这里模拟的是准入决策，与实际执行明确分开。JSON 记录便于检查每个任务被哪项约束拒绝，其结果不构成模型延迟基准。

## 推演一个具体案例（Work through one concrete case）

预算上限为 100，两个任务各预留 70。执行模式中，第一个任务实际结算 20，随后第二个可以获准运行，也结算 20。若按 70 和 70 的费用保守回放，则只有第一个能够获准。两条轨迹不同，因为各自依据的费用证据不同。

```figure
pj-agent-budget-planner-4
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

根据规定的契约实现 `schedule`。通过 `events[].status` 输出各次结果：获准任务为 `completed`，被拒绝任务为 `rejected`，并注明截止时间或预算原因。执行驱动使用相同状态字段，用量凭据不确定时还会返回 `needs_reconciliation`。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

让 schedule 保持确定性的准入回放功能。配套 execute_jobs 驱动程序在实际回调前后调用你的 reserve 和 settle；不能用预测时长替换回调的真实耗时。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 4 --path learning-artifacts/agent-budget-planner --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探查失效边界（Investigate the failure boundary）

加入一个休眠至超过截止时间的调用。后续任务必须停止派发，但这个同步实现无法中断已经运行的回调。

费用来自调用方提供的整数用量凭据。基于单调时钟的截止时间控制是否派发下一任务，无法中断正在执行的同步回调。账本仅存在于单个进程的内存中。


## 参考资料（References）

[一手技术资料](https://docs.python.org/3/library/decimal.html)
