# 在明确上下文预算内选择工具

第 2 阶段，共 5 阶段。开始前阅读[项目先修要求](../../../README.md)；本阶段建立在此前契约之上。

## 本阶段变化

把工具送入上下文窗口前，先对元数据排序。统计选中结构定义实际紧凑 JSON 的字符数，并在达到明确预算时停止。这是字符预算，不是模型词元估算；务必准确说明单位。分数相同时按名称稳定排序，使发现过程可复现。

## 推演一个具体用例

两个紧凑长度分别为 200、220 的结构定义，放入数组后占 423 个字符：200+220，加两个方括号和一个逗号。只累加单项长度会低估用量，可能超出 420 字符预算。

```figure
pj-mcp-at-scale-2
```

译注：图表限制：控件最多可设为 50 类，但简化计算器实际只生成前六类资源的候选工具；工具数和页数按控件值估算，不能作为实际目录覆盖证据。字符预算针对本图的简化结构定义，完整 Python 目录的描述与必填约束不同。

修改实验输入，先自行计算结果，再阅读指标。图表根据这些输入计算；实现是否完成，仍以下方测试为证据。

## 实现契约

实现 `discovery.py`：`discover`。这是“包含 250 个工具的 MCP 服务器”的第 2 阶段交付物，接收明确输入，返回可供下一阶段使用、且能检查的结果。

使用[公开 API 契约](../../../API.md)和带类型的起始签名。核心函数负责返回值；文件输入、参数解析与展示由随附驱动程序负责。

接受下一个结构定义之前，先测量候选选中数组的 JSON 序列化长度。排序与装入预算是两个步骤：排名靠前但过大的结构定义可以跳过，更小且有用的结构定义仍可能放得下。

## 验证与检查

从仓库根目录执行一次 `python3 scripts/project_test.py mcp-at-scale --init learning-artifacts/mcp-at-scale` 完成初始化，再进行累计评分：

```bash
python3 scripts/project_test.py mcp-at-scale --stage 2 --path learning-artifacts/mcp-at-scale --strict
```

在完成契约之前，全新工作区应当失败。完成全部阶段后，使用随附样本运行你的实际交付物：

```bash
cd learning-artifacts/mcp-at-scale
python3 cli.py samples/inventory.json --query "pods count" --max-chars 500
```

## 探究失败边界

把 max_chars 设为一个选中结构定义数组的精确大小，再减少一个字符。在不估算模型词元的情况下验证边界。




## 参考资料

[参考资料 1](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
[参考资料 2](https://www.jsonrpc.org/specification)
