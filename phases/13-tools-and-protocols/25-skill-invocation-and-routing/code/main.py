"""阶段 13，第 25 课：技能调用策略与显式、隐式路由。

执行者枚举 human/model/agent/application/skill/harness 分别表示用户、模型、
智能体、应用、技能和运行控制环境。显式通道按名称选择，隐式通道先检查
准入策略，再用英文词项集合的 Jaccard 相似度评分。
因此技能名称、描述、查询词和测试匹配的 reason 原文保持不变；
中文翻译写在各个字符串旁，不改变匹配结果、权限判断或调用深度。
"""

from __future__ import annotations

import json
import math
import re
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Iterable


class Actor(str, Enum):
    HUMAN = "human"
    MODEL = "model"
    AGENT = "agent"
    APPLICATION = "application"
    SKILL = "skill"
    HARNESS = "harness"


def _actor_label(actor: object) -> str:
    value = getattr(actor, "value", actor)
    if isinstance(value, str) and value:
        return value
    if value is None:
        return "unknown"
    return type(value).__name__


@dataclass(frozen=True)
class SkillMetadata:
    name: str
    description: str
    runtime_extensions: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class InvocationPolicy:
    allow_human: bool = True
    allow_model: bool = True
    allow_agent: bool = True
    allow_programmatic: bool = True
    allow_application: bool = True
    allow_skill: bool = False
    model_threshold: float = 0.2
    harness_allowlist: tuple[str, ...] = ()
    application_allowlist: tuple[str, ...] = ()
    skill_caller_allowlist: tuple[str, ...] = ()
    max_skill_depth: int = 1

    def __post_init__(self) -> None:
        for field_name in (
            "allow_human",
            "allow_model",
            "allow_agent",
            "allow_programmatic",
            "allow_application",
            "allow_skill",
        ):
            if type(getattr(self, field_name)) is not bool:
                # 配置诊断：此字段必须是布尔值。
                raise TypeError(f"{field_name} must be a boolean")
        if (
            isinstance(self.model_threshold, bool)
            or not isinstance(self.model_threshold, (int, float))
            or not math.isfinite(self.model_threshold)
            or not 0.0 <= self.model_threshold <= 1.0
        ):
            # 配置诊断：model_threshold 必须是 0 到 1 之间的有限数值。
            raise ValueError("model_threshold must be a finite number from 0 to 1")
        for field_name in (
            "harness_allowlist",
            "application_allowlist",
            "skill_caller_allowlist",
        ):
            value = getattr(self, field_name)
            if not isinstance(value, tuple) or not all(
                isinstance(item, str) and item for item in value
            ):
                # 配置诊断：此字段必须是由非空名称组成的元组。
                raise TypeError(f"{field_name} must be a tuple of non-empty names")
        if type(self.max_skill_depth) is not int or self.max_skill_depth < 1:
            # 配置诊断：max_skill_depth 必须是正整数。
            raise ValueError("max_skill_depth must be a positive integer")


@dataclass(frozen=True)
class InvocationRequest:
    actor: Actor
    query: str
    explicit_name: str | None = None
    caller_name: str | None = None
    depth: int = 0


@dataclass(frozen=True)
class InvocationDecision:
    activated: bool
    actor: Actor | str
    skill_name: str | None
    mode: str
    score: float
    reason: str

    def to_dict(self) -> dict[str, object]:
        data = asdict(self)
        data["actor"] = (
            self.actor.value if isinstance(self.actor, Actor) else self.actor
        )
        return data


def _tokens(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", value.lower()))


def relevance_score(query: str, skill: SkillMetadata) -> float:
    query_tokens = _tokens(query)
    skill_tokens = _tokens(f"{skill.name} {skill.description}")
    if not query_tokens or not skill_tokens:
        return 0.0
    return len(query_tokens & skill_tokens) / len(query_tokens | skill_tokens)


class CorePolicyAdapter:
    """只应用调用方提供的宿主策略，忽略运行时扩展字段。"""

    def __init__(self, policy: InvocationPolicy):
        self.policy = policy

    def allows(
        self,
        skill: SkillMetadata,
        actor: Actor,
        request: InvocationRequest | None = None,
    ) -> tuple[bool, str]:
        if actor is Actor.HUMAN:
            # 理由：用户激活策略。
            return self.policy.allow_human, "human activation policy"
        if actor is Actor.MODEL:
            # 理由：模型激活策略。
            return self.policy.allow_model, "model activation policy"
        if actor is Actor.AGENT:
            # 理由：智能体激活策略。
            return self.policy.allow_agent, "agent activation policy"
        if actor is Actor.APPLICATION:
            allowed = (
                self.policy.allow_application
                and skill.name in self.policy.application_allowlist
            )
            # 理由：应用激活策略及目标技能允许名单。
            return allowed, "application activation policy and target allowlist"
        if actor is Actor.SKILL:
            if not self.policy.allow_skill:
                # 理由：技能组合策略。
                return False, "skill composition policy"
            if request is None or not request.caller_name:
                # 理由：组合调用技能时必须提供调用方身份。
                return False, "skill composition requires a caller identity"
            if request.caller_name == skill.name:
                # 理由：技能直接调用自身，形成自环。
                return False, "direct skill self-cycle"
            if request.caller_name not in self.policy.skill_caller_allowlist:
                # 理由：技能调用方允许名单。
                return False, "skill caller allowlist"
            if request.depth < 1 or request.depth > self.policy.max_skill_depth:
                # 理由：技能组合的调用深度限制。
                return False, "skill composition depth limit"
            # 理由：技能调用方允许名单与深度策略。
            return True, "skill caller allowlist and depth policy"
        if actor is Actor.HARNESS:
            allowed = (
                self.policy.allow_programmatic
                and skill.name in self.policy.harness_allowlist
            )
            # 理由：程序激活策略与允许名单。
            return allowed, "programmatic activation policy and allowlist"
        # 理由：未知的执行者没有相应的激活策略。
        return False, f"unknown actor {_actor_label(actor)!r} has no activation policy"


def _extension_false(value: object) -> bool:
    return value is False or (isinstance(value, str) and value.lower() == "false")


def _extension_true(value: object) -> bool:
    return value is True or (isinstance(value, str) and value.lower() == "true")


class ExtensionPolicyAdapter(CorePolicyAdapter):
    """适配某一宿主调用元数据约定的示例适配器。"""

    def allows(
        self,
        skill: SkillMetadata,
        actor: Actor,
        request: InvocationRequest | None = None,
    ) -> tuple[bool, str]:
        allowed, reason = super().allows(skill, actor, request)
        if not allowed:
            return allowed, reason
        fields = skill.runtime_extensions
        if actor is Actor.HUMAN and _extension_false(fields.get("user-invocable")):
            # 理由：宿主扩展 user-invocable=false，禁止用户直接激活。
            return False, "host extension user-invocable=false"
        if actor in {Actor.MODEL, Actor.AGENT} and _extension_true(
            fields.get("disable-model-invocation")
        ):
            # 理由：宿主扩展 disable-model-invocation=true，禁止模型或智能体激活。
            return False, "host extension disable-model-invocation=true"
        return True, reason


def build_invocation_matrix(
    policy: InvocationPolicy | None = None,
) -> tuple[dict[str, object], ...]:
    active = None if policy is None else (policy.allow_human, policy.allow_model)
    rows = []
    for human, model, meaning in (
        (False, False, "仅允许程序调用，或不可用"),
        (True, False, "仅允许用户显式激活"),
        (False, True, "仅允许模型隐式激活"),
        (True, True, "允许用户和模型激活"),
    ):
        rows.append(
            {
                "human": human,
                "model": model,
                "meaning": meaning,
                "active_policy": active == (human, model),
            }
        )
    return tuple(rows)


def route_request(
    skills: Iterable[SkillMetadata],
    request: InvocationRequest,
    adapter: CorePolicyAdapter,
) -> InvocationDecision:
    if not isinstance(request.actor, Actor):
        actor = _actor_label(request.actor)
        return InvocationDecision(
            False,
            actor,
            None,
            "unsupported-actor",
            0.0,
            # 理由：未知的执行者没有相应的激活策略。
            f"unknown actor {actor!r} has no activation policy",
        )
    candidates = sorted(skills, key=lambda item: item.name)
    explicit_modes = {
        Actor.HUMAN: "explicit-human",
        Actor.APPLICATION: "programmatic-application",
        Actor.SKILL: "composed-skill",
        Actor.HARNESS: "programmatic-harness",
    }
    if request.actor in explicit_modes:
        mode = explicit_modes[request.actor]
        if not request.explicit_name:
            return InvocationDecision(
                # 理由：必须提供精确的技能名称。
                False, request.actor, None, mode, 0.0, "an exact skill name is required"
            )
        selected = next(
            (skill for skill in candidates if skill.name == request.explicit_name), None
        )
        if selected is None:
            return InvocationDecision(
                # 理由：已发现的目录中没有指定技能。
                False, request.actor, None, mode, 0.0, "named skill was not discovered"
            )
        allowed, reason = adapter.allows(selected, request.actor, request)
        return InvocationDecision(
            allowed,
            request.actor,
            selected.name,
            mode,
            1.0,
            # 输出说明：受到后面的策略或规则阻止。
            reason if allowed else f"blocked by {reason}",
        )

    mode = "implicit-model" if request.actor is Actor.MODEL else "implicit-agent"
    if request.explicit_name:
        return InvocationDecision(
            False,
            request.actor,
            None,
            mode,
            0.0,
            # 理由：模型或智能体的隐式路由依靠任务相关性，而不是精确名称通道。
            "implicit model or agent routing uses task relevance rather than an exact-name channel",
        )
    if not candidates:
        # 理由：技能目录为空。
        return InvocationDecision(False, request.actor, None, mode, 0.0, "catalog is empty")

    eligible = []
    blocked_reasons = []
    for skill in candidates:
        allowed, reason = adapter.allows(skill, request.actor, request)
        if allowed:
            eligible.append((skill, reason))
        else:
            blocked_reasons.append(reason)
    if not eligible:
        # 理由：已发现的技能中，没有任何一个符合隐式路由的准入条件。
        reason = "no discovered skill is eligible for implicit routing"
        if blocked_reasons:
            reason = f"{reason}: {'; '.join(sorted(set(blocked_reasons)))}"
        return InvocationDecision(False, request.actor, None, mode, 0.0, reason)

    scored = [
        (relevance_score(request.query, skill), skill, reason)
        for skill, reason in eligible
    ]
    score, selected, eligibility_reason = max(
        scored, key=lambda item: (item[0], item[1].name)
    )
    if score < adapter.policy.model_threshold:
        return InvocationDecision(
            False,
            request.actor,
            selected.name,
            mode,
            round(score, 4),
            # 理由：最佳匹配分数仍未达到宿主设定的阈值。
            "best match did not meet the host threshold",
        )
    return InvocationDecision(
        True,
        request.actor,
        selected.name,
        mode,
        round(score, 4),
        eligibility_reason,
    )


def demo() -> None:
    skills = (
        SkillMetadata(
            "incident-triage",
            # 匹配用技能描述：梳理事件时间线，区分证据与假设。
            "Triage an incident timeline and separate evidence from hypotheses.",
        ),
        SkillMetadata(
            "release-notes",
            # 匹配用技能描述：根据已合并拉取请求的摘要撰写发布说明。
            "Draft release notes from merged pull request summaries.",
            {"user-invocable": True, "disable-model-invocation": True},
        ),
        SkillMetadata(
            "release-readiness",
            # 匹配用技能描述：审查已合并拉取请求的摘要，报告发布就绪情况。
            "Review merged pull request summaries and report release readiness.",
        ),
    )
    policy = InvocationPolicy(
        model_threshold=0.15,
        harness_allowlist=("incident-triage",),
        application_allowlist=("release-notes",),
        allow_skill=True,
        skill_caller_allowlist=("release-readiness",),
        max_skill_depth=2,
    )
    core = CorePolicyAdapter(policy)
    extensions = ExtensionPolicyAdapter(policy)
    requests = (
        InvocationRequest(Actor.HUMAN, "", explicit_name="release-notes"),
        # 匹配用请求：梳理这次事件的时间线和证据。
        InvocationRequest(Actor.MODEL, "triage this incident timeline evidence"),
        # 示例请求：夜间例行评估。
        InvocationRequest(Actor.HARNESS, "nightly evaluation", explicit_name="incident-triage"),
        # 匹配用请求：根据已合并拉取请求撰写发布说明。
        InvocationRequest(Actor.MODEL, "draft release notes from merged pull requests"),
        # 匹配用请求：梳理这次事件的时间线和证据。
        InvocationRequest(Actor.AGENT, "triage this incident timeline evidence"),
        InvocationRequest(Actor.APPLICATION, "", explicit_name="release-notes"),
        InvocationRequest(
            Actor.SKILL,
            # 示例请求：审查事件相关依赖。
            "review incident dependency",
            explicit_name="incident-triage",
            caller_name="release-readiness",
            depth=1,
        ),
    )
    result = {
        "human_model_matrix": build_invocation_matrix(policy),
        "core_decisions": [route_request(skills, request, core).to_dict() for request in requests],
        "extension_adapter_decisions": [
            route_request(skills, request, extensions).to_dict() for request in requests
        ],
    }
    print(json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False))


if __name__ == "__main__":
    demo()
