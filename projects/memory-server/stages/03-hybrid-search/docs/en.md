# 在实际 Rust 进程中计算向量分数

第 3 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

使用标准 Rust 工具链编译 score.rs，经 stdin 传送查询和文档向量。计算余弦相似度，零范数向量返回零。将 60% 的词汇查询覆盖率与 40% 的余弦分数组合，分数相同时用 id 决定顺序。跨越进程边界前，检查维度及数值是否有限。将 Rust 二进制编译到私有临时目录，并在进程正常退出时清除它。绝不信任预先出现在可预测共享临时路径上的可执行文件。

本阶段的接口边界为 `cosineScores, MemoryStore.search`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

查询向量 [1,1] 与文档向量 [1,0] 的余弦相似度为 1/sqrt(2)，约 0.707。词汇覆盖率为 0.5 时，混合分数为 0.6*0.5+0.4*0.707，约 0.583。

```figure
pj-memory-server-3
```

译注：图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `cosineScores, MemoryStore.search`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

向 Rust 发送逗号分隔的行之前，先校验向量数值有限且维度相等。零范数的分数按 0 处理，并检查实际子进程返回的结果数量。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py memory-server --stage 3 --path learning-artifacts/memory-server --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探究失败边界

修改实验查询，查看两部分分数的贡献。哈希余弦分数很高却没有字面重叠，可能源于碰撞，不代表语义支持。




## 参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)
