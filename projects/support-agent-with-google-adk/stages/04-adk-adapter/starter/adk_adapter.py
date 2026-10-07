"""通过会话交接运行两个真实 ADK 智能体。

课程：projects/support-agent-with-google-adk/stages/04-adk-adapter/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""


def collect_events(events):
    raise NotImplementedError("Stage 4: implement collect_events")


async def run_adk(
    ticket_text,
    route_reply=None,
    answer_reply=None,
    *,
    ticket_id="local-ticket",
    requested_tool=None,
    model=None,
):
    raise NotImplementedError("Stage 4: implement run_adk")
