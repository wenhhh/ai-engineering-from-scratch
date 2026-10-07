# 提供 REST 与 MCP 工具

第 4 阶段，共 4 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

绑定本地服务器，要求持有者令牌，限制请求体，并通过 JSON-RPC POST 实现健康检查、REST 写入／搜索，以及 MCP 初始化／工具子集。工具执行失败在成功的 JSON-RPC 响应中使用 isError；未知协议方法使用 JSON-RPC 错误。这是教学子集，不提供会话、流式传输或生产级认证。通过实际 HTTP 字节测试，防止序列化丢失来源或修订版。

本阶段的接口边界为 `createMemoryServer`。保持前面阶段的行为不变：最终评分器会在同一个工作区运行所有阶段。

## 推演一个具体用例

持久化命令行程序选择保留的数据目录，并只绑定 127.0.0.1。REST 写入与 MCP tools/call memory_search 使用同一个 MemoryStore，因此两条序列化路径都必须保留来源和修订版。

```figure
pj-memory-server-4
```

译注：图表与实现均只按英文字符和数字分词，纯中文查询没有非零检索分数。本图不执行 Rust 编译、文件持久化或 HTTP；实际行为由对应阶段测试验证。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

在工作区的 `main.ts` 中实现 `createMemoryServer`。先尝试完成契约，再查阅参考实现导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数应返回结构化值，不在内部打印；最终结果由命令行程序打印。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

把正文分块当作字节收集，在完整请求到达后只解码一次 UTF-8，避免跨网络分块的码点被拆坏。将传入正文限制为 50,000 字节。超限时，返回 HTTP 413、{"error":"body too large"} 和 Connection: close；未完成的上传不能让连接一直保持打开。

通过 MEMORY_TOKEN 设置持有者令牌，绝不打印它。使用受支持版本初始化，检查完整的 memory_put 结构定义，再发送格式错误的参数，确认收到工具层 isError 响应。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py memory-server --stage 4 --path learning-artifacts/memory-server --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探究失败边界

使用相同目录重启服务，并查询先前记录。区分重启恢复、多写入方锁及断电持久性；此日志不提供后两项保证。

每个数据目录只使用一个写入进程。追加式 JSONL 提供重启后的恢复能力，不保证断电持久性或跨进程事务。基于哈希的词汇向量不属于语义嵌入。MCP HTTP 实现的是文档说明的工具子集，不含流式传输或会话。


## 参考资料

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
