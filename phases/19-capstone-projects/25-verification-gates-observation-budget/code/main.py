"""
智能体运行框架的验证门禁与观测预算。

参见：../docs/en.md（本课中文说明，沿用原文件名）；英文原文在包内 english-source/ 的对应路径。
概念参考：
  - 门禁链模式：优先执行成本最低的拒绝检查，全部通过后才放行。
  - 以观测预算作为确定性的停止条件。
文件末尾的演示处理五个预设工具调用，正常情况下返回退出码零。

译注：本例没有真实模型或工具测试。计量器使用 len(text)//4 的字符数代理，
不是实际分词器，也不保证对任意语言都保守高估。调用前检查累计预算，
当前结果可能使总量超限；本例在下一次调用前才再次检查，而非立即截断本次结果。
观测文本参与计量，故保留英文夹具；门禁原因字符串保留原契约并提供中文说明。
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from typing import Callable, Iterable, Protocol


# ---------------------------------------------------------------------------
# 传输数据结构
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ToolCall:
    """模型发出的工具调用请求。"""

    turn: int
    tool: str
    argv: tuple[str, ...]
    payload: str = ""

    def to_dict(self) -> dict:
        return {
            "turn": self.turn,
            "tool": self.tool,
            "argv": list(self.argv),
            "payload": self.payload,
        }


@dataclass(frozen=True)
class Observation:
    """工具调用后提供给模型的文本观测。"""

    turn: int
    tool: str
    text: str
    tokens: int

    def to_dict(self) -> dict:
        return {
            "turn": self.turn,
            "tool": self.tool,
            "tokens": self.tokens,
        }


@dataclass(frozen=True)
class GateDecision:
    """单个门禁的判定结果。"""

    allow: bool
    gate: str
    reason: str

    def to_dict(self) -> dict:
        return {"allow": self.allow, "gate": self.gate, "reason": self.reason}


# ---------------------------------------------------------------------------
# 词元数估算器
# ---------------------------------------------------------------------------


def estimate_tokens(text: str) -> int:
    """真实分词器的确定性占位估算器。

    真实运行框架应接入 tiktoken 或模型自身的分词器。
    门禁链需要单调且确定的计数；这里的字符数除以四只是代理，
    不具备原说明所暗示的普遍保守上界保证。
    """

    if not text:
        return 0
    return max(1, len(text) // 4)


# ---------------------------------------------------------------------------
# 观测记录账本
# ---------------------------------------------------------------------------


@dataclass
class ObservationLedger:
    """按追加方式记录提供给模型的每条观测；底层列表本身未强制不可修改。"""

    rows: list[Observation] = field(default_factory=list)

    def record(self, obs: Observation) -> None:
        self.rows.append(obs)

    def cumulative(self) -> int:
        return sum(row.tokens for row in self.rows)

    def per_tool(self, name: str) -> int:
        return sum(row.tokens for row in self.rows if row.tool == name)

    def turns_seen(self) -> list[int]:
        return sorted({row.turn for row in self.rows})

    def latest_turn(self) -> int:
        return self.rows[-1].turn if self.rows else -1

    def snapshot(self) -> list[dict]:
        return [row.to_dict() for row in self.rows]


# ---------------------------------------------------------------------------
# 门禁协议
# ---------------------------------------------------------------------------


@dataclass
class GateContext:
    """传给各门禁的上下文；约定只读，但类型未强制冻结其中的账本。"""

    ledger: ObservationLedger
    current_turn: int
    history: tuple[ToolCall, ...] = ()


class VerificationGate(Protocol):
    name: str

    def evaluate(self, call: ToolCall, ctx: GateContext) -> GateDecision: ...


# ---------------------------------------------------------------------------
# 具体门禁实现
# ---------------------------------------------------------------------------


@dataclass
class WhitelistGate:
    """拒绝不在显式允许集合中的工具；这是成本最低的门禁。"""

    allowed: frozenset[str]
    name: str = "whitelist"

    def evaluate(self, call: ToolCall, ctx: GateContext) -> GateDecision:
        if call.tool in self.allowed:
            # 门禁原因：工具位于允许集合中。
            return GateDecision(True, self.name, "tool in allow-set")
        return GateDecision(
            False,
            self.name,
            f"tool {call.tool!r} not in allow-set {sorted(self.allowed)}",
        )


@dataclass
class RegexGate:
    """将 argv 与 payload 拼接后进行正则匹配；命中任一拒绝模式便拒绝调用。"""

    refuse_patterns: tuple[re.Pattern[str], ...]
    name: str = "regex"

    @classmethod
    def from_strings(cls, patterns: Iterable[str], name: str = "regex") -> "RegexGate":
        compiled = tuple(re.compile(p) for p in patterns)
        return cls(refuse_patterns=compiled, name=name)

    def evaluate(self, call: ToolCall, ctx: GateContext) -> GateDecision:
        haystack = " ".join(call.argv) + " " + call.payload
        for pat in self.refuse_patterns:
            if pat.search(haystack):
                return GateDecision(
                    False, self.name, f"argv matched refuse pattern {pat.pattern!r}"
                )
        # 门禁原因：未命中任何拒绝模式。
        return GateDecision(True, self.name, "no refuse pattern matched")


@dataclass
class RecencyGate:
    """最近一次观测距本次调用超过 window 轮时，拒绝调用。

    目的是要求先获取新观测，避免依赖过时状态。
    会话中还没有任何观测时，这项检查始终通过。
    """

    window: int
    name: str = "recency"

    def evaluate(self, call: ToolCall, ctx: GateContext) -> GateDecision:
        last = ctx.ledger.latest_turn()
        if last < 0:
            # 门禁原因：还没有先前观测。
            return GateDecision(True, self.name, "no prior observations")
        gap = call.turn - last
        if gap > self.window:
            return GateDecision(
                False,
                self.name,
                f"observation gap {gap} turns exceeds window {self.window}",
            )
        return GateDecision(True, self.name, f"gap {gap} within window {self.window}")


@dataclass
class BudgetGate:
    """累计观测预算耗尽后拒绝调用。

    单次调用无法预先知道结果的词元数，因此先根据调用前的账本判断。
    记录新观测后，后续检查应使用更新的累计值。当前示例只在下一个
    调用之前重查，不会在记录本次结果后立即执行额外检查或截断结果。
    """

    max_tokens: int
    name: str = "budget"

    def evaluate(self, call: ToolCall, ctx: GateContext) -> GateDecision:
        used = ctx.ledger.cumulative()
        if used >= self.max_tokens:
            return GateDecision(
                False,
                self.name,
                f"observation budget exhausted: {used}/{self.max_tokens} tokens",
            )
        remaining = self.max_tokens - used
        return GateDecision(
            True, self.name, f"{remaining} tokens of budget remaining"
        )


@dataclass
class PerToolBudgetGate:
    """可选门禁：单个工具已消耗的预算达到其限额时拒绝调用。"""

    limits: dict[str, int]
    name: str = "per-tool-budget"

    def evaluate(self, call: ToolCall, ctx: GateContext) -> GateDecision:
        limit = self.limits.get(call.tool)
        if limit is None:
            return GateDecision(True, self.name, "tool has no per-tool budget")
        used = ctx.ledger.per_tool(call.tool)
        if used >= limit:
            return GateDecision(
                False,
                self.name,
                f"per-tool budget for {call.tool} exhausted: {used}/{limit}",
            )
        return GateDecision(
            True, self.name, f"per-tool {call.tool}: {limit - used} tokens remaining"
        )


# ---------------------------------------------------------------------------
# 门禁链
# ---------------------------------------------------------------------------


@dataclass
class ChainOutcome:
    """门禁链的完整结果：逐项判定以及由这些判定推导出的最终结论。"""

    decisions: list[GateDecision]

    @property
    def allow(self) -> bool:
        return all(d.allow for d in self.decisions)

    @property
    def deny_reason(self) -> str | None:
        for d in self.decisions:
            if not d.allow:
                return f"[{d.gate}] {d.reason}"
        return None

    def to_dict(self) -> dict:
        return {
            "allow": self.allow,
            "deny_reason": self.deny_reason,
            "decisions": [d.to_dict() for d in self.decisions],
        }


@dataclass
class GateChain:
    """按顺序评估的门禁列表；首次拒绝时立即短路返回。"""

    gates: tuple[VerificationGate, ...]

    def evaluate(self, call: ToolCall, ctx: GateContext) -> ChainOutcome:
        decisions: list[GateDecision] = []
        for gate in self.gates:
            decision = gate.evaluate(call, ctx)
            decisions.append(decision)
            if not decision.allow:
                return ChainOutcome(decisions=decisions)
        return ChainOutcome(decisions=decisions)


# ---------------------------------------------------------------------------
# 演示用的最小模拟智能体循环
# ---------------------------------------------------------------------------


ToolFn = Callable[[ToolCall], str]


@dataclass
class LoopReport:
    """一次模拟循环的审计记录。"""

    turns: int
    allowed: int
    refused: int
    observations: list[Observation]
    decisions: list[ChainOutcome]

    def to_dict(self) -> dict:
        return {
            "turns": self.turns,
            "allowed": self.allowed,
            "refused": self.refused,
            "observations": [o.to_dict() for o in self.observations],
            "decisions": [d.to_dict() for d in self.decisions],
        }


def run_synthetic_loop(
    calls: list[ToolCall],
    chain: GateChain,
    tool_fns: dict[str, ToolFn],
) -> LoopReport:
    """让固定的工具调用序列依次经过门禁链。

    这是运行框架的缩小示例。真实框架应向模型请求下一次工具调用；
    门禁链的调用契约可以保持相同。
    """

    ledger = ObservationLedger()
    decisions: list[ChainOutcome] = []
    observations: list[Observation] = []
    allowed = 0
    refused = 0

    history: list[ToolCall] = []

    for call in calls:
        ctx = GateContext(
            ledger=ledger, current_turn=call.turn, history=tuple(history)
        )
        outcome = chain.evaluate(call, ctx)
        decisions.append(outcome)
        history.append(call)
        if not outcome.allow:
            refused += 1
            continue
        fn = tool_fns.get(call.tool)
        if fn is None:
            refused += 1
            continue
        result = fn(call)
        obs = Observation(
            turn=call.turn,
            tool=call.tool,
            text=result,
            tokens=estimate_tokens(result),
        )
        ledger.record(obs)
        observations.append(obs)
        allowed += 1

    return LoopReport(
        turns=len(calls),
        allowed=allowed,
        refused=refused,
        observations=observations,
        decisions=decisions,
    )


# ---------------------------------------------------------------------------
# 演示组装
# ---------------------------------------------------------------------------


def _demo_tools() -> dict[str, ToolFn]:
    """三个模拟工具：read_file 返回较长文本，list_dir 返回较短文本，run_tests 返回结构化结果。"""

    def read_file(call: ToolCall) -> str:
        target = call.argv[0] if call.argv else "<missing>"
        return (
            f"# fake contents of {target}\n"
            # 固定的模拟源码行；其实际长度参与预算，不因汉化改变。原文字面声称的 60 字节不作为长度保证。
            + ("line of fake source code that is sixty bytes long " * 12)
        )

    def list_dir(call: ToolCall) -> str:
        return "main.py\nREADME.md\ntests/test_main.py\n"

    def run_tests(call: ToolCall) -> str:
        return json.dumps(
            {"status": "passed", "tests": 4, "duration_ms": 42}, indent=2
        )

    return {"read_file": read_file, "list_dir": list_dir, "run_tests": run_tests}


def build_default_chain(budget: int = 200) -> GateChain:
    """按课程文档的顺序组装四项门禁。"""

    return GateChain(
        gates=(
            WhitelistGate(
                allowed=frozenset({"read_file", "list_dir", "run_tests"})
            ),
            RegexGate.from_strings(
                patterns=(
                    r"\brm\s+-rf\b",
                    r"\bsudo\b",
                    r"^/etc/",
                )
            ),
            RecencyGate(window=3),
            BudgetGate(max_tokens=budget),
        )
    )


def run_demo() -> int:
    """自行结束的演示：打印可读轨迹，满足预期拒绝条件时返回零；此入口不打印完整 JSON 轨迹。"""

    chain = build_default_chain(budget=200)
    tools = _demo_tools()

    calls = [
        ToolCall(turn=1, tool="list_dir", argv=("./",)),
        ToolCall(turn=2, tool="read_file", argv=("main.py",)),
        ToolCall(turn=3, tool="read_file", argv=("README.md",)),
        ToolCall(turn=4, tool="run_tests", argv=("./",)),
        ToolCall(turn=5, tool="shell", argv=("rm", "-rf", "/")),
    ]

    report = run_synthetic_loop(calls, chain, tools)

    print("验证门禁演示")
    print(f"turns={report.turns} allowed={report.allowed} refused={report.refused}")
    print("")
    for idx, (call, outcome) in enumerate(zip(calls, report.decisions)):
        # 展示状态：放行。
        # 展示状态：拒绝。
        verdict = "ALLOW" if outcome.allow else "DENY"
        print(f"  [{idx}] turn={call.turn} tool={call.tool} -> {verdict}")
        if not outcome.allow:
            print(f"        原因：{outcome.deny_reason}")
    print("")
    print(f"累计观测词元估算值：{sum(o.tokens for o in report.observations)}")
    print(f"已记录观测数：{len(report.observations)}")

    if report.refused < 1:
        print("错误：演示应至少出现一次拒绝", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run_demo())
