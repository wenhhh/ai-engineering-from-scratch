# 公开实现契约

在应用边界调用 guard(raw,schema)，或调用 repair(generate,schema,maxAttempts)；其中 generate 接收结构化的 Issue[] 反馈，以及从 1 开始的尝试编号。

本项目只实现明确限定的 JSON Schema 子集，拒绝 $ref、format 和组合关键字。通过结构定义校验并不能证明答案事实正确。回放响应记录进行修复，也不属于在线模型调用。

### main.ts

```typescript
export function checkSchema(schema: Schema, depth = 0): void
export function parseJSON(raw: string): unknown
export function validate( value: unknown, schema: Schema, pointer = "$", depth = 0, ): Issue[]
export function guard( raw: string, schema: Schema, ):
export async function repair( generate: (feedback: Issue[], attempt: number) => Promise<string>, schema: Schema, maxAttempts = 3, )
```

起始代码已提供记录与类的接口。方法在完成实现之前会故意抛出异常。

阶段测试规定正常结果与应拒绝的输入。不要将学习者实现的导入替换为参考实现。最终阶段还会使用随附输入驱动程序运行你的累计实现。
