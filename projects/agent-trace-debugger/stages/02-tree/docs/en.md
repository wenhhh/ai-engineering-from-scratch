# 校验父子关系（Validate parent relationships）

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

子跨度必须引用存在的父跨度，且时间区间完全位于父区间之内。检查每条祖先链中的环，并拒绝重复 ID。追踪可包含重叠的独立运行，因此允许多个根。先校验再聚合，避免损坏的关系图生成看似可信的图表。

本阶段的实现边界为 `validateTree`。保留先前阶段的行为；最终评分器会针对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

根跨度运行于 0..100，childA 运行于 10..80。childB 若在 110 结束，即使各自时长均非负，也违反父子区间包含规则。A->B->A 构成祖先关系环，即使所有起止时间完全相同也无效。

```figure
pj-agent-trace-debugger-2
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `validateTree`。先尝试完成契约，再查看参考实现的导出类型。保留起始代码中的公开名称，方便测试调用你的实现。核心函数返回结构化值，不直接打印；最终结果由命令行程序输出。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

遍历祖先前，先构建 ID 映射。为每个跨度使用新的 visited 集合，既能发现环，也不会把两个合法子跨度共享祖先误判为环。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 2 --path learning-artifacts/agent-trace-debugger --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失效边界（Investigate the failure boundary）

创建两个时间重叠的独立根跨度。这是合法输入；第 3 阶段必须合并其区间，不能简单相加得到总历时。




## 参考资料（References）

[OpenTelemetry 追踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
