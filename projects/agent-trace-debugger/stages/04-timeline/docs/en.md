# 渲染可检查的时间线（Render an inspectable timeline）

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)，本阶段在前述契约基础上继续构建。

## 本阶段的变化（What changes）

生成独立 HTML 时间线，每个跨度占一行，用按比例缩放的条形和错误颜色展示。跨度名称插入 HTML 前必须转义。报告包含自身耗时、总耗时、总历时、词元数和错误数。空追踪也应生成可读成果。输出为本地静态报告，不加载第三方脚本。

本阶段的实现边界为 `render`。保留先前阶段的行为；最终评分器会针对同一工作区运行所有阶段测试。

## 推演一个具体案例（Work through one concrete case）

配套基准与变更后追踪的总历时都为 100 ms。变更后的模型跨度额外消耗 200 个词元，并且执行失败。仅观察总延迟会掩盖这次回归。

```figure
pj-agent-trace-debugger-4
```

修改交互实验的输入，在查看指标之前先自行计算结果。图表根据输入进行计算；完成证据仍应来自下方针对实际实现的测试。

## 实现契约（Implement the contract）

在工作区 `main.ts` 中实现 `render`。先尝试完成契约，再查看参考实现的导出类型。保留起始代码中的公开名称，方便测试调用你的实现。核心函数返回结构化值，不直接打印；最终结果由命令行程序输出。

依据[公开 API 契约](../../../API.md)和起始代码中的类型签名实现。核心函数负责返回值，文件读取、参数解析和结果展示交给配套驱动程序。

命令行程序分别分析每份输入，再对对应的汇总指标求差。跨度名称嵌入 HTML 前必须转义，同时保留 JSON 结果记录供自动比较。

## 验证并检查（Verify and inspect）

从仓库根目录执行一次初始化：`python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger`。随后进行累计评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 4 --path learning-artifacts/agent-trace-debugger --strict
```

新工作区在契约实现前应当测试失败。完成全部阶段后，用配套样本运行你实际构建的成果：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失效边界（Investigate the failure boundary）

加入一个名为 <script>alert(1)</script> 的跨度。它必须以文本形式显示，词元与错误数的差值仍保持数值类型。

本阶段核心输入采用文档定义的 JSONL Span 契约，不能直接把原生 OTLP 导出交给核心解析器。每个跨度的词元数只计算自身用量，跨机器时钟须在导入前归一化。译注：配套命令行已通过 --format otlp 提供有限的 JSON 转换入口，具体范围见 API 文档；它并不改变核心解析器的输入契约。


## 参考资料（References）

[OpenTelemetry 追踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
