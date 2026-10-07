# 通过 stdio 实现带初始化的 JSON-RPC

第 3 阶段，共 5 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

协议具有生命周期：先协商版本、接收 initialized 通知，再列出或调用工具。通知不接收响应。区分传输错误与工具执行错误，保留请求 id，并对目录分页，避免一次返回全部 250 个结构定义。

## 推演一个具体用例

带 id1 的 initialize 返回版本和能力。notifications/initialized 不含 id，也不输出任何行。随后带 id2 的 tools/call 返回对应 id2，以及内容或协议错误。若将输入行数当作预期响应数，就会挂起。

```figure
pj-mcp-at-scale-3
```

译注：图表限制：控件最多可设为 50 类，但简化计算器实际只生成前六类资源的候选工具；工具数和页数按控件值估算，不能作为实际目录覆盖证据。字符预算针对本图的简化结构定义，完整 Python 目录的描述与必填约束不同。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

实现 `protocol.py`：`handle`、`serve`。这是“包含 250 个工具的 MCP 服务器”的第 3 阶段交付物，接收明确输入，返回可供下一阶段使用、且能检查的结果。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

分别维护 negotiated 与 initialized 状态。命令行程序向 serve 提供限定范围的目录；catalog_search 工具调用的 discover 函数，与第 2 阶段测试的是同一个函数。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 3 --path learning-artifacts/mcp-at-scale --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探究失败边界

先在初始化之前调用工具，再完成生命周期，针对示例清单调用 pods_count。比较协议错误 -32002 与成功的文本结果 "2"。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
