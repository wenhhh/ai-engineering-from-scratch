# 构建包含 250 个只读工具的目录

第 1 阶段，共 5 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

为 50 类资源分别创建五种范围明确的读取操作。名称和结构定义保持稳定；执行时读取注入的清单，不连接集群。工具结构定义精确规定可接受的键和值，避免未知参数意外进入处理器。

## 推演一个具体用例

五十类资源乘以五种操作，得到 250 个教学工具，但它们共用同一套本地清单机制。传入只含 pods 的清单时，对外暴露五个有效的资源工具；组合服务器再加入 catalog_search，成为第六个。

```figure
pj-mcp-at-scale-1
```

译注：图表限制：控件最多可设为 50 类，但简化计算器实际只生成前六类资源的候选工具；工具数和页数按控件值估算，不能作为实际目录覆盖证据。字符预算针对本图的简化结构定义，完整 Python 目录的描述与必填约束不同。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

实现 `registry.py`：`catalog`、`execute`。这是“包含 250 个工具的 MCP 服务器”的第 1 阶段交付物，接收明确输入，返回可供下一阶段使用、且能检查的结果。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

将公开的 name、description 和 inputSchema 与内部资源／操作元数据分开。读取清单前，先精确校验参数键。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 1 --path learning-artifacts/mcp-at-scale --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探究失败边界

向 pods_search 传入 {query:"worker",extra:true}。必须失败，不能静默忽略无法识别的指令。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
