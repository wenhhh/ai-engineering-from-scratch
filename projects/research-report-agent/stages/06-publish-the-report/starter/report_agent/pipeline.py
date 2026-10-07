"""端到端流水线：规划、收集、写作、验证和发布。
各步骤记录轨迹并计入预算，最终状态为 completed、needs_review 或 failed。
译注：gather 与 write 在完成相应工作后才扣预算；不能将其当作事前资源预留保证。
配套课程：projects/research-report-agent/stages/06-publish-the-report/docs/en.md"""

from report_agent.corpus import load_corpus
from report_agent.critic import (
    Budget,
    BudgetExceeded,
    apply_verdicts,
    decide_state,
    estimate_tokens,
    review,
)
from report_agent.planner import plan_research
from report_agent.publish import Tracer, render_html, report_payload, write_outputs
from report_agent.search import BM25Index
from report_agent.writer import Report, gather_snippets, to_markdown, write_report


def run_pipeline(
    question, corpus_dir, out_dir=None, model=None, budget=None, max_sentences=3
):
    """依次执行 index、plan、gather、write、verify，记录轨迹并计入预算。
    遇到 BudgetExceeded 时追加 budget_exceeded 步骤。通过 decide_state 设置 terminal_state，
    填写 counts 和 budget，渲染 HTML；提供 out_dir 时写入文件，返回
    (report, trace_dict, html_text)。"""
    raise NotImplementedError(
        "Stage 6: implement run_pipeline in report_agent/pipeline.py"
    )
