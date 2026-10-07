# 派发前预留额度（Reserve capacity before dispatch）

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

只检查可用预算而不预留，会让多个排队请求占用同一份额度。将预留额度与已结算支出分开保存；接纳新请求时，必须同时计入这两部分。

这个单进程状态机用于讲解不变条件，不提供分布式并发安全保证。改成服务时，必须用原子事务或锁保护这一状态转换。

## 推演一个具体案例（Work through one concrete case）

初始 limit 为 100、spent 为 20、holds={A:30}。可用额度为 50，因此预留 B:60 会失败，A 的状态保持不变。再次用 ID A 申请预留也会失败，即使只申请 1 单位。

```figure
pj-agent-budget-planner-2
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

根据规定的契约实现 `reserve`。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

验证标识和金额后，才构建新的 holds 字典。准入判断与额度预留必须构成一次状态转换；仅在此前调用 available() 检查，仍可能导致同一额度被重复占用。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 2 --path learning-artifacts/agent-budget-planner --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探查失效边界（Investigate the failure boundary）

推演两个调用方同时读到 50 单位可用额度的情况。说明服务应在 reserve 周围使用哪种锁或数据库事务。




## 参考资料（References）

[一手技术资料](https://docs.python.org/3/library/decimal.html)
