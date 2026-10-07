# 区分自身耗时与等待时间（Separate work time from waiting time）

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

包含子调用的总耗时为 end 减 start。自身耗时应减去直接子跨度区间的并集长度；并行子跨度可能重叠，因此不能减去它们的时长之和。根区间的并集给出跨多次运行的总历时。词元按跨度自身用量只累计一次。slowest 指向自身耗时最大的跨度，避免将主要在等待子调用的根误判为最慢工作。

本阶段的实现边界为 `unionDuration, analyze`。保留先前阶段的行为；最终评分器会针对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

ChildA 运行于 10..60，childB 运行于 40..90。两者时长之和为 100，重叠为 20，并集为 80。因此，时长 100 ms 的父跨度自身耗时为 20 ms，不能计成零。

```figure
pj-agent-trace-debugger-3
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `unionDuration, analyze`。先尝试完成契约，再查看参考实现的导出类型。保留起始代码中的公开名称，方便测试调用你的实现。核心函数返回结构化值，不直接打印；最终结果由命令行程序输出。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

按区间起点排序；遇到重叠就扩展当前终点，只有下一区间起点晚于当前终点时才结算当前区间。计算一个跨度的自身耗时时，只使用它的直接子跨度。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 3 --path learning-artifacts/agent-trace-debugger --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失效边界（Investigate the failure boundary）

在交互实验中把 B 的起点从 40 移到 70。观察条形图前，先预测并集为 70、父跨度自身耗时为 30。




## 参考资料（References）

[OpenTelemetry 追踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
