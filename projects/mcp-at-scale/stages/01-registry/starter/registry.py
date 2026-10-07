"""构建包含 250 个只读工具的目录。

课程：projects/mcp-at-scale/stages/01-registry/docs/en.md
原创实现，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
工具描述、协议值与错误消息参与检索、预算及互操作，保留原值。"""


def catalog():
    raise NotImplementedError("Stage 1: implement catalog")


def execute(tool, arguments, inventory):
    raise NotImplementedError("Stage 1: implement execute")
