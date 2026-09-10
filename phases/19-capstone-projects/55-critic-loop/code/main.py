"""针对论文草稿的多轮审稿循环，使用五个固定评分维度。

概念参考：
- ./docs/en.md（本课正文）
- 阶段 19 第 54 课（论文写作器，提供草稿结构）
- 阶段 19 第 50—53 课（自动研究流程的前置阶段）

仅使用标准库。运行：python3 code/main.py

译注：评分仅看正文长度、原创性标签、图表/引用数量和英文章节标题。
修订器通过追加 x 字符、改标签和添加占位引用提高分数，不验证真实研究质量。
英文正文长度与标题参与计分和规则匹配，故保留原值并加中文释义。
plateau 只要求近期增量未超过阈值，也可能包括退步；converged 不一定表示达标。
预算耗尽时返回的分数来自最后一次修订之前；停滞轮的建议计数也不等于实际执行数。"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Callable, Protocol


DIMENSIONS: tuple[str, ...] = (
    "clarity",
    "novelty",
    "evidence",
    "methodology",
    "related_work",
)


@dataclass
class MiniSection:
    """审稿循环使用的最小章节结构，对应第 54 课的 Section。"""
    id: str
    title: str
    body: str = ""
    figure_refs: list[str] = field(default_factory=list)
    cites: list[str] = field(default_factory=list)


@dataclass
class MiniPaper:
    """审稿循环使用的最小论文结构，对应第 54 课的 Paper。"""
    title: str
    abstract: str
    sections: list[MiniSection] = field(default_factory=list)
    originality_tag: str = "low"
    citation_count_target: int = 4
    figure_count_target: int = 2


@dataclass
class Suggestion:
    dimension: str
    target_section_id: str | None
    edit: str

    def to_dict(self) -> dict:
        return {
            "dimension": self.dimension,
            "target_section_id": self.target_section_id,
            "edit": self.edit,
        }


@dataclass
class Critique:
    round: int
    scores: dict[str, float]
    suggestions: list[Suggestion]
    reason: str

    def mean(self) -> float:
        if not self.scores:
            return 0.0
        return sum(self.scores.values()) / len(self.scores)

    def to_dict(self) -> dict:
        return {
            "round": self.round,
            "scores": dict(self.scores),
            "mean": self.mean(),
            "suggestions": [s.to_dict() for s in self.suggestions],
            "reason": self.reason,
        }


class Critic(Protocol):
    def __call__(self, paper: MiniPaper, round_: int) -> Critique: ...


class Reviser(Protocol):
    def __call__(self, paper: MiniPaper, suggestions: list[Suggestion]) -> MiniPaper: ...


@dataclass
class LoopTrace:
    round: int
    scores: dict[str, float]
    mean: float
    suggestions_applied: int
    verdict: str

    def to_dict(self) -> dict:
        return {
            "round": self.round,
            "scores": dict(self.scores),
            "mean": self.mean,
            "suggestions_applied": self.suggestions_applied,
            "verdict": self.verdict,
        }


@dataclass
class LoopResult:
    status: str
    reason: str
    rounds_used: int
    final_scores: dict[str, float]
    final_mean: float
    paper: MiniPaper
    trace: list[LoopTrace]

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "reason": self.reason,
            "rounds_used": self.rounds_used,
            "final_scores": dict(self.final_scores),
            "final_mean": self.final_mean,
            "trace": [t.to_dict() for t in self.trace],
        }


class CriticLoop:
    """循环执行审稿、停止条件检查与修订，直到触发停止条件。"""

    def __init__(
        self,
        critic: Critic,
        reviser: Reviser,
        max_rounds: int = 5,
        target_score: float = 8.0,
        plateau_epsilon: float = 0.1,
        plateau_window: int = 2,
    ) -> None:
        if max_rounds < 1:
            # 最大轮数必须至少为 1。
            raise ValueError("max_rounds must be >= 1")
        if plateau_window < 1:
            # 停滞检测窗口必须至少为 1。
            raise ValueError("plateau_window must be >= 1")
        self.critic = critic
        self.reviser = reviser
        self.max_rounds = max_rounds
        self.target_score = target_score
        self.plateau_epsilon = plateau_epsilon
        self.plateau_window = plateau_window

    def _target_met(self, critique: Critique) -> bool:
        return all(critique.scores.get(d, 0.0) >= self.target_score for d in DIMENSIONS)

    def _plateau(self, trace: list[LoopTrace]) -> bool:
        if len(trace) < self.plateau_window + 1:
            return False
        recent = trace[-(self.plateau_window + 1):]
        for i in range(1, len(recent)):
            if recent[i].mean - recent[i - 1].mean > self.plateau_epsilon:
                return False
        return True

    def run(self, paper: MiniPaper) -> LoopResult:
        trace: list[LoopTrace] = []
        critique: Critique | None = None

        for round_ in range(1, self.max_rounds + 1):
            critique = self.critic(paper, round_)
            applied = len(critique.suggestions)

            if self._target_met(critique):
                trace.append(LoopTrace(
                    round=round_, scores=dict(critique.scores),
                    mean=critique.mean(), suggestions_applied=0,
                    verdict="target",
                ))
                return LoopResult(
                    status="converged", reason="target",
                    rounds_used=round_, final_scores=dict(critique.scores),
                    final_mean=critique.mean(), paper=paper, trace=trace,
                )

            interim = LoopTrace(
                round=round_, scores=dict(critique.scores),
                mean=critique.mean(), suggestions_applied=applied,
                verdict="continue",
            )
            trace.append(interim)

            if self._plateau(trace):
                interim.verdict = "plateau"
                return LoopResult(
                    status="converged", reason="plateau",
                    rounds_used=round_, final_scores=dict(critique.scores),
                    final_mean=critique.mean(), paper=paper, trace=trace,
                )

            paper = self.reviser(paper, critique.suggestions)

        final_scores = dict(critique.scores) if critique is not None else {d: 0.0 for d in DIMENSIONS}
        final_mean = critique.mean() if critique is not None else 0.0
        if trace:
            trace[-1].verdict = "budget"
        return LoopResult(
            status="stopped", reason="budget",
            rounds_used=self.max_rounds, final_scores=final_scores,
            final_mean=final_mean, paper=paper, trace=trace,
        )


def deterministic_score(paper: MiniPaper) -> dict[str, float]:
    """按五个维度确定性计分，每项范围为 0—10；这是结构启发式，不是语义质量评分。"""
    body_lens = [len(s.body) for s in paper.sections]
    avg_body = (sum(body_lens) / len(body_lens)) if body_lens else 0.0
    section_titles = {s.title.lower() for s in paper.sections}

    clarity = min(10.0, 3.0 + avg_body / 50.0)

    if paper.originality_tag == "high":
        novelty = 9.0
    elif paper.originality_tag == "medium":
        novelty = 6.0
    else:
        novelty = 3.0

    fig_refs = sum(1 for s in paper.sections for _ in s.figure_refs)
    cites = sum(len(s.cites) for s in paper.sections)
    evidence = min(10.0, 2.0 + 2.0 * fig_refs + 1.5 * cites)

    has_method = any(
        s.title.lower().startswith("method") and s.body for s in paper.sections
    )
    methodology = 9.0 if has_method else 4.0

    has_related = (
        "related work" in section_titles
        and any(
            s.title.lower() == "related work" and s.body
            for s in paper.sections
        )
    )
    related_work = 9.0 if has_related else 4.0

    return {
        "clarity": round(clarity, 2),
        "novelty": round(novelty, 2),
        "evidence": round(evidence, 2),
        "methodology": round(methodology, 2),
        "related_work": round(related_work, 2),
    }


def deterministic_critic(paper: MiniPaper, round_: int) -> Critique:
    """为论文评分，并为低于固定目标 8 分的每个维度生成一条建议。"""
    scores = deterministic_score(paper)
    suggestions: list[Suggestion] = []

    def first_section_id(default: str = "intro") -> str:
        return paper.sections[0].id if paper.sections else default

    if scores["clarity"] < 8.0:
        target = paper.sections[-1].id if paper.sections else None
        suggestions.append(Suggestion(
            dimension="clarity",
            target_section_id=target,
            # 动作：扩展正文；字符串同时用于分发，保留原值。
            edit="expand-body",
        ))
    if scores["novelty"] < 8.0:
        suggestions.append(Suggestion(
            dimension="novelty",
            target_section_id=None,
            # 动作：提高原创性标签；并没有查验新的原创贡献。
            edit="bump-originality",
        ))
    if scores["evidence"] < 8.0:
        suggestions.append(Suggestion(
            dimension="evidence",
            target_section_id=first_section_id(),
            # 动作：添加图表引用与文献引用占位符。
            edit="add-figure-and-cite",
        ))
    if scores["methodology"] < 8.0:
        suggestions.append(Suggestion(
            dimension="methodology",
            target_section_id=None,
            # 动作：添加方法章节。
            edit="add-method-section",
        ))
    if scores["related_work"] < 8.0:
        suggestions.append(Suggestion(
            dimension="related_work",
            target_section_id=None,
            # 动作：添加相关工作章节。
            edit="add-related-work-section",
        ))

    # 诊断标记：所有维度达到固定目标。
    # 诊断：对应数量的维度尚未达到目标。
    reason = "fully-met" if not suggestions else f"{len(suggestions)} below target"
    return Critique(round=round_, scores=scores, suggestions=suggestions, reason=reason)


def deterministic_reviser(paper: MiniPaper, suggestions: list[Suggestion]) -> MiniPaper:
    """确定性执行每条建议的 edit 动作，原地修改论文并返回同一对象。"""
    fig_counter = 0
    cite_counter = 0
    for s in paper.sections:
        fig_counter += len(s.figure_refs)
        cite_counter += len(s.cites)

    for sug in suggestions:
        # 动作：扩展正文；字符串同时用于分发，保留原值。
        if sug.edit == "expand-body":
            for sec in paper.sections:
                if sec.id == sug.target_section_id:
                    sec.body = (sec.body + " " + ("x" * 80)).strip()
                    break
        # 动作：提高原创性标签；并没有查验新的原创贡献。
        elif sug.edit == "bump-originality":
            if paper.originality_tag == "low":
                paper.originality_tag = "medium"
            elif paper.originality_tag == "medium":
                paper.originality_tag = "high"
        # 动作：添加图表引用与文献引用占位符。
        elif sug.edit == "add-figure-and-cite":
            target_id = sug.target_section_id or (paper.sections[0].id if paper.sections else None)
            for sec in paper.sections:
                if sec.id == target_id:
                    fig_counter += 1
                    cite_counter += 1
                    sec.figure_refs.append(f"f{fig_counter}")
                    sec.cites.append(f"c{cite_counter}")
                    break
        # 动作：添加方法章节。
        elif sug.edit == "add-method-section":
            if not any(s.title.lower().startswith("method") for s in paper.sections):
                paper.sections.append(MiniSection(
                    # 方法章节；该英文标题参与规则匹配。
                    id="method", title="Method",
                    # 计分夹具：下面介绍方法。英文长度参与分数，故不替换。
                    body="A description of the method follows. " + ("x" * 200),
                ))
            else:
                for sec in paper.sections:
                    if sec.title.lower().startswith("method") and not sec.body:
                        # 计分夹具：下面介绍方法。英文长度参与分数，故不替换。
                        sec.body = "A description of the method follows. " + ("x" * 200)
                        break
        # 动作：添加相关工作章节。
        elif sug.edit == "add-related-work-section":
            if not any(s.title.lower() == "related work" for s in paper.sections):
                paper.sections.append(MiniSection(
                    # 相关工作章节；该英文标题参与规则匹配。
                    id="related-work", title="Related Work",
                    # 计分夹具：综述相邻研究。英文长度参与分数，故不替换。
                    body="We survey adjacent work. " + ("x" * 200),
                ))
            else:
                for sec in paper.sections:
                    if sec.title.lower() == "related work" and not sec.body:
                        # 计分夹具：综述相邻研究。英文长度参与分数，故不替换。
                        sec.body = "We survey adjacent work. " + ("x" * 200)
                        break
    return paper


def make_deterministic_critic_pair() -> tuple[Critic, Reviser]:
    return deterministic_critic, deterministic_reviser


def demo() -> dict:
    paper = MiniPaper(
        # 示例标题：自动研究循环。
        title="Auto-Research Loop",
        abstract="abstract",
        sections=[
            # 计分夹具：简短引言。
            MiniSection(id="intro", title="Introduction", body="short intro"),
        ],
        originality_tag="low",
    )
    critic, reviser = make_deterministic_critic_pair()
    loop = CriticLoop(critic=critic, reviser=reviser, max_rounds=6, target_score=8.0)
    result = loop.run(paper)
    return result.to_dict()


if __name__ == "__main__":
    print(json.dumps(demo(), indent=2))
