# 串行执行带修订版的写入

第 2 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

加载带版本的事件日志，为每个 namespace/id 组合重建最新记录。更新必须声明预期修订版。将写入串行化，防止两个调用方同时从修订版零开始竞争，却都成功。先追加日志，再修改内存映射。这是单进程存储：追加完成不保证断电持久性；多个服务器进程需要外部锁或数据库。

本阶段的接口边界为 `MemoryStore.put, MemoryStore.list`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

同一进程中的两个写入方都为相同 id 提出 expectedRevision 0。串行队列允许一次创建，拒绝另一次；回放 JSONL 日志后重建修订版 1。

```figure
pj-memory-server-2
```

译注：图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `MemoryStore.put, MemoryStore.list`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

先追加日志，再修改映射。追加失败时，内存值不能假装持久化已经成功。一次操作失败后，仍须让队尾 Promise 可用，以便后续独立写入继续执行。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py memory-server --stage 2 --path learning-artifacts/memory-server --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探究失败边界

通过不同进程连续两次以修订版 0 运行 cli.ts --put。第二次应失败。随后使用修订版 1，再通过 --history 检查两条日志记录。




## 参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)
