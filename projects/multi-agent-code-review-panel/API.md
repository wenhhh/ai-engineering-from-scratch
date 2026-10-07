# 公开实现契约

输入中的 files 将文件名映射到文本或行数组。可选 reviewers 包含 id、cost 和 findings 记录。预期标签使用 {file,line,rule}；报告记录源码指纹，并对比各评审者与共识结果的指标。

本地评审者采用不同的静态启发式规则，并不代表独立的大语言模型。共识衡量支持程度，不能判定事实真伪。外部回调必须遵守 AbortSignal；超时无法撤销远程副作用。

### main.ts

```typescript
export function validateFinding( raw: unknown, files: Record<string, string[]>, ): Finding | null
export function aggregate( reviews: Review[], files: Record<string, string[]>, quorum = 2, )
export async function runPanel( reviewers: Reviewer[], budget: number, timeoutMs = 1000, )
export function evaluate(predicted: string[], expected: string[])
```

起始代码已提供记录与类的接口。方法在完成实现之前会故意抛出异常。

阶段测试规定正常结果与应拒绝的输入。不要将学习者实现的导入替换为参考实现。最终阶段还会使用随附输入驱动程序运行你的累计实现。
