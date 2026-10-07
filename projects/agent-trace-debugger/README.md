# 智能体追踪调试器（Agent Trace Debugger）

生成前后对照的回归报告，解释时间区间重叠、自身耗时，以及失败调用消耗的词元。

需要 Node 22.18+，评分器还需要 Python 3；应掌握 TypeScript 对象、数组、Map、排序和区间运算。核心使用标准库。评分器只检查你指定的工作区，不会借用参考实现来补全缺失功能。

## 构建并运行自己的版本（Build and run your version）

在仓库根目录执行一次初始化。起始代码尚未实现所需功能，因此新工作区的测试预期失败。

```bash
python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger
python3 scripts/project_test.py agent-trace-debugger --stage 1 --path learning-artifacts/agent-trace-debugger --strict
```

依次实现各阶段，再运行累计评分器和配套输入驱动程序：

```bash
python3 scripts/project_test.py agent-trace-debugger --all --path learning-artifacts/agent-trace-debugger --strict
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

驱动程序和离线样本属于配套脚手架，其导入指向你的实现。公开输入类型和函数签名见起始代码及 [API 契约](API.md)。

## 单独检查参考实现（Inspect the reference separately）

从仓库根目录运行：

```bash
python3 scripts/project_test.py agent-trace-debugger --all --solution --strict
cd projects/agent-trace-debugger/solution
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 观察变化（Observe the change）

配套样本的总历时仍为 100 ms，但失败跨度的词元消耗增加 200，错误数增加 1。时间线揭示发生变化的跨度，避免把总历时未变误判为行为未变。录屏及其记录文件保留上游英文原始证据，不将其中的时间或输出改写成新一次运行。

修改样本副本后重新执行命令。将输入与输出一起保存，方便其他人复现结果；配套样本是专门编写的教学数据。

## 集成方式与限制（Integration and limits）

从埋点系统逐行导出 Span JSON 对象，并在持续集成中将 trace.json 与 trace.html 一起保存。

输入采用文档定义的 JSONL Span 契约，或下文说明的有限 OTLP JSON 适配器。每个跨度的词元数必须只计算该跨度自身的用量。来自不同机器的时钟必须在导入前完成归一化。

## 分阶段构建（Stages）

1. [读取 JSONL 追踪记录](stages/01-parse/docs/en.md)
2. [校验父子关系](stages/02-tree/docs/en.md)
3. [区分自身耗时与等待时间](stages/03-timing/docs/en.md)
4. [渲染可检查的时间线](stages/04-timeline/docs/en.md)


## 一手参考资料（Primary references）

[OpenTelemetry 追踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)

## 导入 OTLP JSON（Import OTLP JSON）

`otlp.ts` 接受 resourceSpans/scopeSpans/spans 这一 JSON 结构。它先用 BigInt 将纳秒时间戳归一化，再把差值转换为毫秒；以追踪 ID 作为跨度 ID 的前缀，并读取 gen_ai.usage.input_tokens/output_tokens 属性。缺少父节点仍会被树校验器拒绝。该适配器仅处理此处的 JSON 子集，不提供采集器或 protobuf 解码能力。

```bash
node cli.ts --format otlp --input samples/otlp.json --output otlp-trace.html --json otlp-trace.json
```

编写好的导出样本含一个耗时 15 ms 的错误跨度，共消耗 60 个词元。各跨度的词元属性应只记录自身用量，避免重复计数。
