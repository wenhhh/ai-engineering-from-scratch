# 同时保留文本、命名空间与来源

第 1 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

每条记忆都需要有长度边界的 id、命名空间、文本和来源定位信息。不要返回与来源脱离的孤立字符串。小型特征哈希嵌入将规范化词项映射到固定向量，是确定性的词汇投影，不是预训练语义模型。哈希碰撞在预期之中，因此检索仍需保留词汇证据。

本阶段的接口边界为 `validateMemory, embed`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

记忆 {id:cache-policy,namespace:docs,text:...,source:policies/cache.md:12} 将内容和证据保存在一起。相同 id 放在 namespace:private 中则属于另一条记录。

```figure
pj-memory-server-1
```

译注：图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `validateMemory, embed`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

先校验 JSON 边界，再计算哈希或写入。特征哈希将词项放入 32 个桶，因此无关词可能碰撞；保留词汇覆盖率来揭示这一限制。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py memory-server --stage 1 --path learning-artifacts/memory-server --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探究失败边界

创建两个命名空间，写入相同文本。在 docs 中查询时，绝不能返回 private 中的记录。




## 参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)
