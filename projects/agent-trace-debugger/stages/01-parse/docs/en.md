# 读取 JSONL 追踪记录（Read a JSONL trace）

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

逐个非空行解析 JSON 对象。要求稳定的 ID、名称、有限的起止时间、非负词元数，以及明确的 ok 或 error 状态。遇到格式错误的行，应停止处理并报告行号；静默丢弃坏跨度会扭曲耗时和费用结论。时间采用相对毫秒，不采用绝对时钟时间戳。

本阶段的实现边界为 `parseTrace`。保留先前阶段的行为；最终评分器会针对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

文件依次包含空行、合法根跨度和错误文本时，必须将错误定位到第 3 行。如果先过滤空行再编号，就会错误地报告第 2 行。

```figure
pj-agent-trace-debugger-1
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `parseTrace`。先尝试完成契约，再查看参考实现的导出类型。保留起始代码中的公开名称，方便测试调用你的实现。核心函数返回结构化值，不直接打印；最终结果由命令行程序输出。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

先按实际行编号，再在循环内跳过空行。解析 JSON 后，验证 start、end 和 tokens 都是有限值。保留零时长跨度，它也是合法观测。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 1 --path learning-artifacts/agent-trace-debugger --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失效边界（Investigate the failure boundary）

从本地脚本记录一个嵌套跨度。时间保持相对毫秒，每一笔词元用量只归入一个跨度。




## 参考资料（References）

[OpenTelemetry 追踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
