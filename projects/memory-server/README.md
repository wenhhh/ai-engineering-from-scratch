# 持久化记忆服务器（Persistent Memory Server）

带有修订历史的持久化记忆工作台，为 REST 和 MCP 提供同一套访问边界。

评分器需要 Node 22.18+、Rust 2021 和 Python 3；先掌握 Promise、追加日志、HTTP、命名空间、修订版和向量点积。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补入缺失行为。

## 构建并运行自己的版本

从仓库根目录初始化一次。新的起始代码按设计应当失败。

```bash
python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server
python3 scripts/project_test.py memory-server --stage 1 --path learning-artifacts/memory-server --strict
```

逐阶段完成实现，再运行累计评分器和随附输入驱动程序：

```bash
python3 scripts/project_test.py memory-server --all --path learning-artifacts/memory-server --strict
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

驱动程序和离线样本属于随附脚手架，其导入会解析到你的实现。公开输入类型与函数签名位于起始代码及 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录执行：

```bash
python3 scripts/project_test.py memory-server --all --solution --strict
cd projects/memory-server/solution
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 观察变化

第一个进程追加修订版 1。另一个独立进程恢复该记录，再连同来源一起检索。使用 --revision 1 更新时追加修订版 2；再次使用修订版 0 则失败，日志保持不变。

修改样本副本并再次运行命令。将输入与输出保存在一起，便于他人复现；随附样本是人工编写的教学数据。

## 集成与限制

在环境中设置 MEMORY_TOKEN，然后运行 node cli.ts --data-dir memory-data --serve --port 8788。REST 和 MCP 共用同一个存储；令牌不会写入文件。

每个数据目录只使用一个写入进程。追加式 JSONL 提供重启后的恢复能力，不保证断电持久性或跨进程事务。基于哈希的词汇向量不属于语义嵌入。MCP HTTP 实现的是文档说明的工具子集，不含流式传输或会话。

提供持久化服务时，在环境中设置 MEMORY_TOKEN，然后运行：

```bash
node cli.ts --data-dir memory-data --serve --port 8788
```

使用相同目录重启即可恢复历史。更新初始样本时，使用新的 id 或 `--revision 1`；再次以修订版 0 执行创建，按设计会产生冲突。

## 阶段

1. [同时保留文本、命名空间与来源](stages/01-record-contract/docs/en.md)
2. [串行执行带修订版的写入](stages/02-durable-log/docs/en.md)
3. [在实际 Rust 进程中计算向量分数](stages/03-hybrid-search/docs/en.md)
4. [提供 REST 与 MCP 工具](stages/04-transports/docs/en.md)


## 权威参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)

## 可选的标准 MCP 客户端验证

可选路线使用 `mcp==2.1.1` 官方 Python 客户端，与项目实际运行的回环 HTTP 服务器通信，协商声明的 2025-11-25 旧版工具契约。这不能证明支持所有更新的协议特性。

```bash
python3 -m venv .venv-mcp
.venv-mcp/bin/python -m pip install -r projects/memory-server/requirements-framework.txt
.venv-mcp/bin/python scripts/project_test.py memory-server --all --solution --optional --strict
```

使用 `--path learning-artifacts/memory-server`，让同一客户端测试你的实现。默认路线仍只使用标准库；缺少可选依赖时返回 SKIP，严格可选评分会因此失败。

## 比较来源变化

首次写入样本后，在同一个已完成的工作区执行：

```bash
node cli.ts --data-dir memory-data --put samples/memory-updated.json --revision 1
node cli.ts --data-dir memory-data --history cache-policy --html history.html
```

比较表保留两份来源定位信息及修订版。修订版 1 在 policies/cache.md:12 记录六十秒；修订版 2 在第 18 行记录九十秒。保留旧来源后，变化便可审阅。服务器不会核实外部来源文件是否仍与保存的文本一致。

译注：分词与特征哈希仅处理英文字符和数字；可以保存中文文本，但纯中文查询不会产生非零词汇或向量分数。命名空间只是检索分组，共享令牌没有逐命名空间权限控制。来源定位信息未与外部文件核验。协议值和错误保留原值。
