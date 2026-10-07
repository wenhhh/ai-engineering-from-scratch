# 智能体预算规划器（Agent Budget Planner）

构建一个依据实际用量凭据进行结算的预算控制器，让尚未确认的支出始终可见。

需要 Python 3.10+，以及函数、字典、异常、整数运算和回调函数基础。核心使用标准库。评分器只检查你指定的工作区，不会借用参考实现来补全缺失功能。

## 构建并运行自己的版本（Build and run your version）

在仓库根目录执行一次初始化。起始代码尚未实现所需功能，因此新工作区的测试预期失败。

```bash
python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner
python3 scripts/project_test.py agent-budget-planner --stage 1 --path learning-artifacts/agent-budget-planner --strict
```

依次实现各阶段，再运行累计评分器和配套输入驱动程序：

```bash
python3 scripts/project_test.py agent-budget-planner --all --path learning-artifacts/agent-budget-planner --strict
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

驱动程序和离线样本属于配套脚手架，其导入指向你的实现。公开输入类型和函数签名见起始代码及 [API 契约](API.md)。

## 单独检查参考实现（Inspect the reference separately）

从仓库根目录运行：

```bash
python3 scripts/project_test.py agent-budget-planner --all --solution --strict
cd projects/agent-budget-planner/solution
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 观察变化（Observe the change）

录屏中的任务共申请 190 单位，预算上限为 100 单位。执行配套哈希任务时，两个任务获准运行，一个被拒绝，最终结算 95 单位；缺少用量凭据时继续保留预留额度。录屏及其记录文件保留上游英文原始证据，不将其中的时间或输出改写成新一次运行。

修改样本副本后重新执行命令。将输入与输出一起保存，方便其他人复现结果；配套样本是专门编写的教学数据。

## 集成方式与限制（Integration and limits）

导入 execute_jobs，并提供 invoke(job) -> (value, actual_cost) 回调。只有费率和用量凭据都已换算为相应单位时，才能使用 unit=nano_dollars。execute_jobs 位于配套 cli.py 中；它调用你的预算预留与结算实现。

费用来自调用方提供的整数用量凭据。基于单调时钟的截止时间控制是否派发下一任务，无法中断正在执行的同步回调。账本仅存在于单个进程的内存中。

## 分阶段构建（Stages）

1. [用整数微额度估算请求](stages/01-estimate-cost/docs/en.md)
2. [派发前预留额度](stages/02-reserve-capacity/docs/en.md)
3. [结算实际用量并释放剩余额度](stages/03-settle-and-release/docs/en.md)
4. [在费用与时间限制内调度](stages/04-schedule-under-deadlines/docs/en.md)


## 一手参考资料（Primary references）

[机制与 API 参考](https://docs.python.org/3/library/decimal.html)
