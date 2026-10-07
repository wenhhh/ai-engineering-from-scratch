# MCP 工具发现工作台（MCP Tool Discovery Workbench）

具有明确范围的 MCP 清单服务器，在可测量的上下文预算内发现工具结构定义。

需要 Python 3.10+、Node 22.18+，并掌握字典、JSON-RPC 请求 id、stdin/stdout 和子进程。核心使用标准库。评分器检查你选择的工作区，绝不会从参考实现中补入缺失行为。

## 构建并运行自己的版本

从仓库根目录初始化一次。新的起始代码按设计应当失败。

```bash
python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale
python3 scripts/project_test.py mcp-at-scale --stage 1 --path learning-artifacts/mcp-at-scale --strict
```

逐阶段完成实现，再运行累计评分器和随附输入驱动程序：

```bash
python3 scripts/project_test.py mcp-at-scale --all --path learning-artifacts/mcp-at-scale --strict
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

驱动程序和离线样本属于随附脚手架，其导入会解析到你的实现。公开输入类型与函数签名位于起始代码及 [API 契约](API.md)中。

## 单独检查参考实现

从仓库根目录执行：

```bash
python3 scripts/project_test.py mcp-at-scale --all --solution --strict
cd projects/mcp-at-scale/solution
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 观察变化

文件提供三类资源，对外暴露十五个读取工具以及 catalog_search。搜索在 tools 数组精确序列化预算内返回匹配程度最高的结构定义。完整的教学注册表仍包含 250 个工具。

修改样本副本并再次运行命令。将输入与输出保存在一起，便于他人复现；随附样本是人工编写的教学数据。

## 集成与限制

运行 `python3 cli.py /absolute/inventory.json --serve` 启动 stdio 服务器。tools/call catalog_search 接收 query、max_chars 和 k；响应返回选中的公开结构定义及其字符数量。

stdio 传输实现文档中说明的 2025-06-18 与 2025-11-25 初始化／工具子集，不宣称完全符合当前 MCP。清单读取使用本地响应记录；生成 250 个工具，也不代表接入了 250 个独立系统。

## 阶段

1. [构建包含 250 个只读工具的目录](stages/01-registry/docs/en.md)
2. [在明确上下文预算内选择工具](stages/02-discovery/docs/en.md)
3. [通过 stdio 实现带初始化的 JSON-RPC](stages/03-protocol/docs/en.md)
4. [通过协议分页审计目录覆盖情况](stages/04-audit/docs/en.md)
5. [使用带类型客户端验证实际通信链路](stages/05-typed-client/docs/en.md)


## 权威参考资料

- [MCP 工具规范](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification)

## 可选的标准 MCP 客户端验证

可选路线使用 `mcp==2.1.1` 官方 Python 客户端，与项目实际运行的 stdio 进程通信，协商声明的 2025-11-25 旧版工具契约。这不能证明支持所有更新的协议特性。

```bash
python3 -m venv .venv-mcp
.venv-mcp/bin/python -m pip install -r projects/mcp-at-scale/requirements-framework.txt
.venv-mcp/bin/python scripts/project_test.py mcp-at-scale --all --solution --optional --strict
```

使用 `--path learning-artifacts/mcp-at-scale`，让同一客户端测试你的实现。默认路线仍只使用标准库；缺少可选依赖时返回 SKIP，严格可选评分会因此失败。

## 导入小型 REST 契约

`rest_adapter.py` 导入 OpenAPI 3 的 GET 操作，要求 operationId 唯一，路径和查询参数采用基本类型。不支持的参数形式会明确失败；写操作被排除。每个导入操作保留规范化来源规范的 SHA-256。

```bash
python3 cli.py samples/api-recordings.json --openapi samples/api.json --query "incident" --max-chars 800
python3 cli.py samples/api-recordings.json --openapi samples/api.json --serve
```

使用 {"id":"checkout-1"} 调用 incident_get。人工编写的响应记录必须匹配传入参数；不同 id 会被拒绝，不会收到可能误导调用方的固定答案。`--base-url http://127.0.0.1:PORT` 明确启用对回环夹具的实际 GET。重定向及非回环端点被拒绝，请求五秒超时，响应字节数限制为一兆字节。这个范围有限的导入器不保证完整覆盖 OpenAPI。

译注：工具名称与描述参与英文词汇检索及精确序列化字符计数，因此保留原值；文档、代码说明与控件文案已译。元数据中上游生成的分词标签也保留。本项目保持明确声明的旧版工具契约，不因汉化升级协议。
