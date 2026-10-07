# 结算实际用量并释放剩余额度（Settle actual usage and release unused budget）

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

预留额度表示费用上限，实际账单仍需根据用量确定。请求完成后，移除预留并计入实际支出。取消时按零支出结算并释放预留；但必须先确认没有发生费用，不能把凭据缺失当作零费用。

报告的实际费用超过预留额度时，会破坏账本约束。应保留原账本并抛出错误，让调用方进行核对，不要静默生成负余额。

## 推演一个具体案例（Work through one concrete case）

预留 70 单位而实际凭据为 20 单位时，释放 50，并将 20 计入支出。凭据缺失时，完整保留 70 单位预留；报告 71 时进入待核对状态，不能悄悄扩大预算。

```figure
pj-agent-budget-planner-3
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

根据规定的契约实现 `settle`。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

保存已关闭请求的 ID，防止重复凭据再次计费。发生异常后读取旧状态，验证它确实没有改变。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 3 --path learning-artifacts/agent-budget-planner --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探查失效边界（Investigate the failure boundary）

集成回调已经执行了工作，却随后抛出异常。解释此时释放预留为何会隐藏尚未确认的费用责任。




## 参考资料（References）

[一手技术资料](https://docs.python.org/3/library/decimal.html)
