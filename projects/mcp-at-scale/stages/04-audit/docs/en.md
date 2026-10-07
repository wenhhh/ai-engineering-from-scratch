# 通过协议分页审计目录覆盖情况

第 4 阶段，共 5 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

将分页视为客户端可见契约。通过处理器遍历每一页，并跨页跟踪重复名称。有限页数保护可以发现意外的游标循环。此审计验证协议清单；最后的带类型客户端还会实际跨越独立操作系统进程边界。

## 推演一个具体用例

250 个工具、每页 32 个，共需要八页：七个完整页，最后一页 26 个。跨页保留已见名称，防止换一个游标重复第一页，却伪装成已完成覆盖。

```figure
pj-mcp-at-scale-4
```

译注：图表限制：控件最多可设为 50 类，但简化计算器实际只生成前六类资源的候选工具；工具数和页数按控件值估算，不能作为实际目录覆盖证据。字符预算针对本图的简化结构定义，完整 Python 目录的描述与必填约束不同。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

实现 `audit.py`：`audit_catalog`。这是“包含 250 个工具的 MCP 服务器”的第 4 阶段交付物，接收明确输入，返回可供下一阶段使用、且能检查的结果。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

通过 handle 驱动分页，不直接调用 catalog。只审计内部数组，无法发现传输层的游标错误。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 4 --path learning-artifacts/mcp-at-scale --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探究失败边界

在测试替身中故意连续两次返回相同游标。限制分页循环并报告重复页，不要无限继续。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
