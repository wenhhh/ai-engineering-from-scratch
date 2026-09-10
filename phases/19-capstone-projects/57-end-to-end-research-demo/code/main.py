"""端到端自动研究演示：种子假设 → 调度器 → 审稿循环 → 论文写作器。

概念参考：
- ./docs/en.md（本课正文）
- 阶段 19 第 54 课（论文写作器）
- 阶段 19 第 55 课（审稿循环）
- 阶段 19 第 56 课（迭代调度器）
- 阶段 19 第 50—53 课（前置研究阶段；这里用固定种子与运行器桩代替）

依赖标准库与 NumPy。运行：python3 code/main.py

译注：实际串接的是第 54—56 课，未执行假设模型、外部文献检索或真实科研实验。
奖励来自合成数据，原创性标签由奖励阈值赋予，不是论文原创性证据。
代码未要求审稿结果达到 target 才写论文；converged 也可能只是 plateau。
产物是英文 LaTeX 源文件及占位参考文献，未编译成 PDF，未创建所引用的图表。
与计分规则、LaTeX 模板有关的英文保留并加中文释义。"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
from dataclasses import dataclass, field
from typing import Awaitable, Callable


HERE = os.path.dirname(os.path.abspath(__file__))
LESSON_ROOT = os.path.dirname(os.path.dirname(HERE))


def _add(path: str) -> None:
    if path not in sys.path:
        sys.path.insert(0, path)


_add(os.path.join(LESSON_ROOT, "54-paper-writer", "code"))
_add(os.path.join(LESSON_ROOT, "55-critic-loop", "code"))
_add(os.path.join(LESSON_ROOT, "56-iteration-scheduler", "code"))

import importlib
import importlib.util


def _load_module(name: str, file_path: str):
    spec = importlib.util.spec_from_file_location(name, file_path)
    if spec is None or spec.loader is None:
        # 无法从给定路径加载模块；保留错误原值。
        raise ImportError(f"cannot load {name} from {file_path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


paper_writer_mod = _load_module(
    "_t_d2_paper_writer",
    os.path.join(LESSON_ROOT, "54-paper-writer", "code", "main.py"),
)
critic_loop_mod = _load_module(
    "_t_d2_critic_loop",
    os.path.join(LESSON_ROOT, "55-critic-loop", "code", "main.py"),
)
scheduler_mod = _load_module(
    "_t_d2_scheduler",
    os.path.join(LESSON_ROOT, "56-iteration-scheduler", "code", "main.py"),
)


Paper = paper_writer_mod.Paper
Section = paper_writer_mod.Section
Figure = paper_writer_mod.Figure
BibEntry = paper_writer_mod.BibEntry
PaperWriter = paper_writer_mod.PaperWriter
PaperValidationError = paper_writer_mod.PaperValidationError
MockProseGenerator = paper_writer_mod.MockProseGenerator

MiniPaper = critic_loop_mod.MiniPaper
MiniSection = critic_loop_mod.MiniSection
CriticLoop = critic_loop_mod.CriticLoop
deterministic_critic = critic_loop_mod.deterministic_critic
deterministic_reviser = critic_loop_mod.deterministic_reviser

Hypothesis = scheduler_mod.Hypothesis
Result = scheduler_mod.Result
IterationScheduler = scheduler_mod.IterationScheduler
SchedulerReport = scheduler_mod.SchedulerReport
make_deterministic_runner = scheduler_mod.make_deterministic_runner


class NoTriggerError(Exception):
    """没有分支超过论文触发阈值，演示无法选择最佳结果。"""


class BestResultError(Exception):
    """无法选取最佳结果，例如触发列表查找后为空或种子列表为空。"""


@dataclass
class DemoReport:
    scheduler_report: dict
    best_branch: str
    best_reward: float
    critic_result: dict
    paper_manifest: dict
    stop_reason: str

    def to_dict(self) -> dict:
        return {
            "scheduler_report": self.scheduler_report,
            "best_branch": self.best_branch,
            "best_reward": self.best_reward,
            "critic_result": self.critic_result,
            "paper_manifest": self.paper_manifest,
            "stop_reason": self.stop_reason,
        }


def make_seed_hypotheses() -> list[Hypothesis]:
    """生成三个种子假设，每个研究分支一个，代替第 50—53 课的完整流程。"""
    return [
        Hypothesis(id="h-alpha-1", branch="alpha", payload={"q": "method-x"}),
        Hypothesis(id="h-beta-1", branch="beta", payload={"q": "method-y"}),
        Hypothesis(id="h-gamma-1", branch="gamma", payload={"q": "method-z"}),
    ]


def pick_best_branch(scheduler_report: SchedulerReport) -> tuple[str, float]:
    """从已触发论文事件的分支中选取平均奖励最高者。

    同分时按分支 ID 的字母顺序选择，以使结果可复现。"""
    if not scheduler_report.paper_triggers:
        # 没有分支超过论文触发阈值。
        raise NoTriggerError("no branch crossed the paper threshold")
    by_branch = {b.branch: b for b in scheduler_report.branches}
    triggered = [by_branch[name] for name in scheduler_report.paper_triggers if name in by_branch]
    if not triggered:
        # 触发分支查找后为空。
        raise BestResultError("trigger list empty after lookup")
    triggered.sort(key=lambda b: (-b.mean, b.branch))
    best = triggered[0]
    return best.branch, best.mean


def _originality_for_reward(reward: float) -> str:
    if reward >= 0.8:
        return "high"
    if reward >= 0.6:
        return "medium"
    return "low"


def build_mini_paper(branch: str, reward: float) -> MiniPaper:
    return MiniPaper(
        # 示例论文标题：给定分支的自动研究结果。
        title=f"Auto-Research Findings on Branch {branch}",
        # 示例摘要：总结自动研究循环中收益最高的分支。
        abstract=f"We summarise the best yielding branch {branch} from the auto-research loop.",
        sections=[
            # 计分夹具：初步观察；正文长度参与评分。
            MiniSection(id="intro", title="Introduction", body="initial observations"),
            MiniSection(id="results", title="Results", body=""),
        ],
        originality_tag=_originality_for_reward(reward),
    )


def mini_to_full_paper(mini: MiniPaper, branch: str) -> Paper:
    """将 MiniPaper 转为写作器使用的完整 Paper，不在这里检查是否达标。

    所有章节共用一张结果图的记录；参考文献由所用引用键的并集构造。
    每个章节的引用列表保留；没有引用时添加占位基线文献。
    原草稿的图表引用被替换为结果章节引用同一张图的简化布局。"""
    cites: list[str] = []
    for sec in mini.sections:
        for c in sec.cites:
            if c not in cites:
                cites.append(c)

    bib = [
        BibEntry(
            key=key, entry_type="article",
            # 占位文献标题：来源加引用键。
            # 占位作者标签：合成。
            fields={"title": f"Source {key}", "author": "Synthesised", "year": "2026"},
        )
        for key in cites
    ]
    if not bib:
        bib = [BibEntry(
            key=f"{branch}-baseline", entry_type="article",
            # 占位文献标题：基线。
            # 占位作者标签：合成。
            fields={"title": "Baseline", "author": "Synthesised", "year": "2026"},
        )]
        for sec in mini.sections:
            if sec.id == "intro":
                sec.cites.append(f"{branch}-baseline")
                break

    fig = Figure(
        id=f"{branch}-results",
        path=f"figs/{branch}.pdf",
        # 图注：给定分支的奖励轨迹；实际图文件未生成。
        caption=f"Reward trajectory on branch {branch}",
    )

    sections = []
    for s in mini.sections:
        figure_refs = [fig.id] if s.id == "results" else []
        sections.append(Section(
            id=s.id, title=s.title, body=s.body,
            cites=list(s.cites), figure_refs=figure_refs,
        ))
    return Paper(
        title=mini.title,
        # 占位作者：自动研究演示。
        authors=["Auto-Research Demo"],
        abstract=mini.abstract,
        sections=sections,
        figures=[fig],
        bibliography=bib,
    )


async def _run_demo_async(out_dir: str, seed: int = 11) -> DemoReport:
    seed_list = make_seed_hypotheses()
    if not seed_list:
        # 种子假设列表为空。
        raise BestResultError("seed list is empty")

    runner = make_deterministic_runner(
        base_rewards={"alpha": 0.82, "beta": 0.55, "gamma": 0.15},
        noise=0.04,
        delay_ms=2.0,
        seed=seed,
    )
    sched = IterationScheduler(
        runner=runner, slots=3, max_experiments=6,
        paper_threshold=0.7, prune_floor=0.2, prune_after_runs=3,
        expander=scheduler_mod.deterministic_expander,
    )
    sched_report = await sched.run(seed_list)

    branch, reward = pick_best_branch(sched_report)

    mini = build_mini_paper(branch, reward)
    loop = CriticLoop(
        critic=deterministic_critic,
        reviser=deterministic_reviser,
        max_rounds=6,
        target_score=8.0,
    )
    critic_result = loop.run(mini)

    full_paper = mini_to_full_paper(critic_result.paper, branch)
    prose = MockProseGenerator(outlines={
        # 正文提纲：研究该分支的动机。
        "intro": f"motivation for branch {branch}",
        # 正文提纲：总结该分支的奖励轨迹。
        "results": f"summary of reward trajectory on branch {branch}",
        # 正文提纲：方法描述。
        "method": "method description",
        # 正文提纲：相关工作综述。
        "related-work": "related work survey",
    })
    writer = PaperWriter(prose=prose)
    manifest = writer.write(full_paper, out_dir)

    return DemoReport(
        scheduler_report=sched_report.to_dict(),
        best_branch=branch,
        best_reward=reward,
        critic_result=critic_result.to_dict(),
        paper_manifest=manifest,
        stop_reason=sched_report.stop_reason,
    )


def run_demo(out_dir: str | None = None, seed: int = 11) -> DemoReport:
    if out_dir is None:
        out_dir = tempfile.mkdtemp(prefix="auto-research-demo-")
    return asyncio.run(_run_demo_async(out_dir, seed=seed))


def demo() -> dict:
    return run_demo().to_dict()


if __name__ == "__main__":
    rep = demo()
    print(json.dumps({
        "stop_reason": rep["stop_reason"],
        "best_branch": rep["best_branch"],
        "best_reward": rep["best_reward"],
        "critic_status": rep["critic_result"]["status"],
        "critic_rounds": rep["critic_result"]["rounds_used"],
        "paper_sections": [s["id"] for s in rep["paper_manifest"]["sections"]],
        "paper_figures": [f["id"] for f in rep["paper_manifest"]["figures"]],
        "experiments_run": rep["scheduler_report"]["experiments_run"],
    }, indent=2))
