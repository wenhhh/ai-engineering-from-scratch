"""记录允许的交接状态转换。

课程：projects/support-agent-with-google-adk/stages/03-handoff/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

from routing import route


def begin(ticket):
    raise NotImplementedError("Stage 3: implement begin")


def transition(session, event, payload=None):
    raise NotImplementedError("Stage 3: implement transition")
