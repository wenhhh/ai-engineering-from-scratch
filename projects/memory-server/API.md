# 公开实现契约

在环境中设置 MEMORY_TOKEN，然后运行 node cli.ts --data-dir memory-data --serve --port 8788。REST 和 MCP 共用同一个存储；令牌不会写入文件。

每个数据目录只使用一个写入进程。追加式 JSONL 提供重启后的恢复能力，不保证断电持久性或跨进程事务。基于哈希的词汇向量不属于语义嵌入。MCP HTTP 实现的是文档说明的工具子集，不含流式传输或会话。

### main.ts

```typescript
export function validateMemory(raw: unknown): Omit<Memory, "revision">
export function embed(text: string, dimensions = 32): number[]
export function cosineScores(query: number[], vectors: number[][]): number[]
export function createMemoryServer(store: MemoryStore, token: string)
```

起始代码已提供记录与类的接口。方法在完成实现之前会故意抛出异常。

阶段测试规定正常结果与应拒绝的输入。不要将学习者实现的导入替换为参考实现。最终阶段还会使用随附输入驱动程序运行你的累计实现。
