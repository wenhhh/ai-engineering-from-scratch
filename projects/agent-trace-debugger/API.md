# 公开实现契约（Public implementation contract）

从埋点系统逐行导出 Span JSON 对象，并在持续集成中将 trace.json 与 trace.html 一起保存。

默认输入采用文档定义的 JSONL Span 契约。`--format otlp` 还接受配套 OTLP JSON 子集：`resourceSpans[].scopeSpans[].spans`、追踪与跨度 ID、父节点 ID、Unix 纳秒时间戳、状态码，以及数值型 GenAI 输入／输出词元属性。适配器先把时间戳转换为相对毫秒，再执行常规跨度校验。它不接受 protobuf，也不提供 OTLP 接收端。基准文件仍使用 JSONL。

每个跨度的词元数必须只计算自身用量。来自不同机器的时钟必须在导入前完成归一化。

### main.ts

```typescript
export function parseTrace(raw: string): Span[]
export function validateTree(spans: Span[]): Map<string, Span>
export function unionDuration(intervals: [number, number][]): number
export function analyze(spans: Span[])
export function render(spans: Span[]): string
```

起始代码提供记录与类的接口。方法在实现前会主动抛出异常，明确显示缺失的功能。

阶段测试规定了正常结果和应拒绝的输入。不得将学习者实现的导入替换为参考实现。最后一个阶段还会用配套输入驱动程序检查你逐步完成的累计实现。
