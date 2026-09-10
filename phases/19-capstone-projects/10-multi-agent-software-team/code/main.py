"""多智能体软件团队：带类型的任务看板与交接计量示例。

以消息看板协调架构师、编码者、评审者和测试者，演示角色之间的任务交接与
词元用量统计。模型调用、代码实现和测试均为桩函数，可离线观察消息流程。

运行：python main.py

译注：代码没有并行调度、真实工作树、源码改写或追踪 span；编码者按顺序执行。
词元数、通过率与所谓 412/412 测试通过均为预设或合成值，不是实际模型评测。
评审要求修改时总是交给 coder-A，随后直接清除所有 diff 的缺陷标记；
返回的 approved 仍是第一次评审结果，不是修订后的最终批准状态。
计划固定包含四项；n_coders 少于四时会略过剩余子任务，不保证需求全部实现。
单智能体基线与团队使用不同的合成机制，不能由此推断现实中的优劣。
"""

from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum


# ---------------------------------------------------------------------------
# 带类型的消息任务看板：A2A 风格的教学结构，不是真实协议实现。
# ---------------------------------------------------------------------------

class MsgKind(Enum):
    PLAN_REQUEST = "plan_request"
    SUBTASK = "subtask"
    DIFF_READY = "diff_ready"
    REVIEW_NEEDED = "review_needed"
    REVIEW_FEEDBACK = "review_feedback"
    APPROVED = "approved"
    TEST_NEEDED = "test_needed"
    TEST_PASSED = "test_passed"
    TEST_FAILED = "test_failed"


@dataclass
class Msg:
    kind: MsgKind
    by: str
    to: str
    payload: dict = field(default_factory=dict)
    tokens: int = 0


@dataclass
class Board:
    messages: list[Msg] = field(default_factory=list)
    tokens_by_role: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def post(self, m: Msg) -> None:
        self.messages.append(m)
        self.tokens_by_role[m.by] += m.tokens

    def inbox(self, role: str) -> list[Msg]:
        return [m for m in self.messages if m.to == role]


# ---------------------------------------------------------------------------
# 角色桩函数：架构师、编码者、评审者、测试者。
# ---------------------------------------------------------------------------

@dataclass
class Subtask:
    name: str
    files: list[str]
    lines_changed: int = 0
    has_bug: bool = False  # 用于模拟注入缺陷的探测。


def architect_plan(issue: str, rng: random.Random) -> list[Subtask]:
    """架构师的固定计划桩，不依据输入问题生成新计划。"""
    subs = [
        Subtask("parser", ["src/parser.py"]),
        Subtask("cache", ["src/cache.py", "src/cache_test.py"]),
        Subtask("api", ["src/api.py"]),
        Subtask("migration", ["src/migrate.py"]),
    ]
    # 随机选择一个子任务，并以一定概率标记缺陷，用来探测评审分支。
    subs[rng.randrange(len(subs))].has_bug = rng.random() < 0.3
    return subs


def coder_implement(sub: Subtask, rng: random.Random) -> dict:
    sub.lines_changed = rng.randint(15, 95)
    return {"subtask": sub.name, "lines": sub.lines_changed,
            "has_bug": sub.has_bug}


def reviewer_check(diffs: list[dict], rng: random.Random) -> tuple[bool, str]:
    """评审桩：存在缺陷时，以约 85% 的设定概率检出，其余情况错误批准。"""
    buggy = [d for d in diffs if d["has_bug"]]
    if not buggy:
        return True, "看起来没问题"
    if rng.random() < 0.85:
        return False, f"发现缺陷，子任务：{buggy[0]['subtask']}；请重新检查"
    return True, "看起来没问题（错误批准）"


def tester_run(diffs: list[dict], rng: random.Random) -> tuple[bool, str]:
    """测试桩：读取剩余缺陷标记；无缺陷时仍有约 3% 的设定概率报告不稳定测试。"""
    buggy = [d for d in diffs if d["has_bug"]]
    if buggy:
        return False, f"测试失败，模块：{buggy[0]['subtask']} 模块"
    if rng.random() < 0.03:
        return False, "测试不稳定"
    return True, "412/412 通过（模拟结果）"


# ---------------------------------------------------------------------------
# 编排器：执行消息流程并计算合成词元放大倍数。
# ---------------------------------------------------------------------------

def run_team(issue: str, n_coders: int = 4, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random(0)
    board = Board()

    # 架构师制定计划。
    plan = architect_plan(issue, rng)
    board.post(Msg(MsgKind.PLAN_REQUEST, by="architect", to="board",
                   payload={"issue": issue, "subtasks": [s.name for s in plan]},
                   tokens=4500))

    # 将所选子任务分发给编码者。
    for i, sub in enumerate(plan[:n_coders]):
        coder = f"coder-{chr(65 + i)}"
        board.post(Msg(MsgKind.SUBTASK, by="architect", to=coder,
                       payload={"subtask": sub.name, "files": sub.files},
                       tokens=1200))

    # 依次调用编码者桩；本循环没有实际并行执行。
    diffs: list[dict] = []
    for i, sub in enumerate(plan[:n_coders]):
        coder = f"coder-{chr(65 + i)}"
        result = coder_implement(sub, rng)
        diffs.append(result)
        board.post(Msg(MsgKind.DIFF_READY, by=coder, to="merge_coord",
                       payload=result, tokens=3200 + result["lines"] * 30))

    # 合并占位步骤：预设文件互不冲突，没有实际合并代码。
    board.post(Msg(MsgKind.REVIEW_NEEDED, by="merge_coord", to="reviewer",
                   payload={"diffs": diffs}, tokens=2000))

    # 评审者检查缺陷标记。
    approved, comment = reviewer_check(diffs, rng)
    if approved:
        board.post(Msg(MsgKind.APPROVED, by="reviewer", to="tester",
                       payload={"comment": comment}, tokens=1800))
    else:
        # 简化路由：始终交回第一个编码者，而非查找缺陷所属者。
        board.post(Msg(MsgKind.REVIEW_FEEDBACK, by="reviewer", to="coder-A",
                       payload={"comment": comment}, tokens=1800))
        # 编码者提交模拟修订消息。
        board.post(Msg(MsgKind.DIFF_READY, by="coder-A", to="merge_coord",
                       payload={"subtask": "parser", "lines": 52, "has_bug": False},
                       tokens=3100))
        # 直接记录重新批准；没有再次调用评审函数。
        board.post(Msg(MsgKind.APPROVED, by="reviewer", to="tester",
                       payload={"comment": "修改后看起来没问题"}, tokens=1500))
        # 将全部 diff 的缺陷标记直接清除，不实际修改代码。
        diffs = [{"subtask": d["subtask"], "lines": d["lines"], "has_bug": False}
                 for d in diffs]

    # 测试者读取缺陷标记并返回合成结果。
    passed, testmsg = tester_run(diffs, rng)
    if passed:
        board.post(Msg(MsgKind.TEST_PASSED, by="tester", to="pr_opener",
                       payload={"msg": testmsg}, tokens=1200))
    else:
        board.post(Msg(MsgKind.TEST_FAILED, by="tester", to="coder-A",
                       payload={"msg": testmsg}, tokens=1400))

    return {
        "approved": approved,
        "review_comment": comment,
        "tested_passed": passed,
        "test_msg": testmsg,
        "total_tokens": sum(board.tokens_by_role.values()),
        "tokens_by_role": dict(board.tokens_by_role),
        "handoffs": sum(1 for m in board.messages if m.to != m.by),
    }


# ---------------------------------------------------------------------------
# 对比若干模拟问题上的团队与单智能体基线。
# ---------------------------------------------------------------------------

def single_agent_baseline(issue: str, rng: random.Random) -> dict:
    """占位基线：原文设想由一个 Sonnet 4.7 在单一工作树完成任务；此处仅返回随机结果。"""
    # 词元数为预设范围内的随机值；此处没有测量速度或实际交接开销。
    return {
        "passed": rng.random() < 0.68,
        "total_tokens": 18_000 + rng.randint(0, 6_000),
    }


def main() -> None:
    rng = random.Random(11)
    print("=== 多智能体团队模拟运行 ===")
    result = run_team("修复组件解析器的竞态问题", n_coders=4, rng=rng)
    print(f"首次评审批准：{result['approved']}  ({result['review_comment']})")
    print(f"模拟测试通过：{result['tested_passed']}  ({result['test_msg']})")
    print(f"交接次数：{result['handoffs']}")
    print(f"合成词元总数：{result['total_tokens']:,}")
    print("按角色统计合成词元：")
    for role, n in sorted(result['tokens_by_role'].items(), key=lambda x: -x[1]):
        print(f"  {role:14s} {n:>6,}")

    print("\n=== 10 次团队与单智能体基线模拟对比 ===")
    team_pass = 0
    baseline_pass = 0
    team_tok_sum = 0
    base_tok_sum = 0
    rng2 = random.Random(17)
    for i in range(10):
        r_team = run_team(f"issue-{i}", n_coders=4, rng=rng2)
        r_base = single_agent_baseline(f"issue-{i}", rng2)
        if r_team['tested_passed']:
            team_pass += 1
        if r_base['passed']:
            baseline_pass += 1
        team_tok_sum += r_team['total_tokens']
        base_tok_sum += r_base['total_tokens']

    print(f"团队通过：{team_pass}/10，每次合成词元数：{team_tok_sum/10:,.0f}")
    print(f"基线通过：{baseline_pass}/10，每次合成词元数：{base_tok_sum/10:,.0f}")
    print(f"词元放大倍数：{team_tok_sum / max(1, base_tok_sum):.2f}x")


if __name__ == "__main__":
    main()
