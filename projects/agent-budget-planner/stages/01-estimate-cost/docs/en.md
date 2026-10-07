# 用整数微额度估算请求（Estimate requests in integer microcredits）

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

浮点费用计算会累积舍入误差。应明确计量单位，并用整数表示费率与费用。请求估算分别采用输入词元费率和输出词元费率，计算提示词成本与输出上限成本。

样本中的费率使用人为设定的教学单位，不代表服务商价格。按输出上限预留最坏情况下的费用，让调度器能够在调用模型前作出决策；实际用量随后再结算。

## 推演一个具体案例（Work through one concrete case）

提示词含 120 个词元，最多允许输出 40 个词元。整数费率分别为 2 和 5 时，费用上限为 120*2+40*5=440 单位。即使 output_limit=0，上限仍为 240。

```figure
pj-agent-budget-planner-1
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

根据规定的契约实现 `estimate`。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

在 Python 中区分布尔值与整数：不能把 True 当成一个词元。乘法之前先验证每个操作数，并在结果旁保留调用方使用的计量单位。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 1 --path learning-artifacts/agent-budget-planner --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探查失效边界（Investigate the failure boundary）

将输出上限从 40 改为 400，估算费用变为 2240 单位。实际输出 40 个词元时，账单为 440，差额为 1800；没有实际输出时，账单为 240，达到最大差额 2000。解释按上限预留与按实际凭据结算为何不同。




## 参考资料（References）

[一手技术资料](https://docs.python.org/3/library/decimal.html)
