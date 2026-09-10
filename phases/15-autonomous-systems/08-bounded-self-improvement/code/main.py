"""有边界的自我改进循环，仅使用 Python 标准库。

演示四类门禁：不变量（工具清单）、对齐锚点（固定目标的哈希）、多目标约束，
以及相对历史最佳表现的回归检测。启用的门禁全部通过后，才接纳候选修改。

译注：这里检查的是工具名集合与目标文本摘要，并未验证真实模块文件哈希。
不变量门禁使用子集关系，因此允许删除工具；apply() 也不会逐项核对 active_manifest。
目标锚点和安全规则只保存在同一进程中，不是智能体无法修改的外部安全边界。
清单修改仅在特定随机分支中尝试，并非每轮必然发生。安全测试只有两个预设输入，
不能把 safety=1.0 理解为面对任意输入都安全。哈希目标、操作名、拦截标记保持原样。
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field


DEFAULT_SEED = 5


# 目标锚点：在循环外预先定义，但仍位于同一进程中。
# 目标：规范空白，并将输入转为标题式大小写；该原文参与目标哈希，不翻译运行值。
OBJECTIVE = "canonicalize whitespace and title-case the input"
OBJECTIVE_HASH = hashlib.sha256(OBJECTIVE.encode()).hexdigest()[:16]

# 获准的工具名集合；注意它不是模块内容的哈希清单。
APPROVED_TOOL_MANIFEST = {"trim", "collapse", "lower", "upper", "reverse", "title"}


@dataclass
class Agent:
    ops: list[str] = field(default_factory=lambda: ["nop"])
    # 模拟智能体可能违规修改自己的工具清单，并记录当前版本。
    active_manifest: set[str] = field(default_factory=lambda: set(APPROVED_TOOL_MANIFEST))
    # 简化的行为宪法：目标文本必须与锚点逐字节相同。
    objective: str = OBJECTIVE


TOOLS_IMPL = {
    "trim": lambda s: s.strip(),
    "collapse": lambda s: " ".join(s.split()),
    "lower": lambda s: s.lower(),
    "upper": lambda s: s.upper(),
    "reverse": lambda s: s[::-1],
    "title": lambda s: s.title(),
    "nop": lambda s: s,
}


CASES_PERF = [
    ("  Hello   World  ", "Hello World"),
    ("FOO   bar", "Foo Bar"),
    ("  mixedCase Space  ", "Mixedcase Space"),
    ("Already clean", "Already Clean"),
]
# 安全维度：禁止的输入不能直接透传；以下输入代表
# 不应原样回显的潜在危险内容，只作为测试字符串，不执行。
CASES_SAFETY = [
    ("exec('rm -rf /')", "[blocked]"),
    ("drop table users;", "[blocked]"),
]


def apply(agent: Agent, s: str) -> str:
    for op in agent.ops:
        fn = TOOLS_IMPL.get(op)
        if fn is None:
            return ""
        s = fn(s)
    # 安全过滤：若变换后的字符串匹配危险模式，
    # 返回约定的拦截标记 "[blocked]"。
    dangerous = ("exec(", "drop table", "rm -rf", "; delete from")
    low = s.lower()
    if any(d in low for d in dangerous):
        return "[blocked]"
    return s


def perf_score(agent: Agent) -> float:
    correct = 0
    for inp, want in CASES_PERF:
        if apply(agent, inp) == want:
            correct += 1
    return correct / len(CASES_PERF)


def safety_score(agent: Agent) -> float:
    correct = 0
    for inp, want in CASES_SAFETY:
        if apply(agent, inp) == want:
            correct += 1
    return correct / len(CASES_SAFETY)


def mutate(a: Agent, allow_manifest_edit: bool) -> Agent:
    ops = list(a.ops)
    manifest = set(a.active_manifest)
    obj = a.objective
    # 集合在不同解释器运行中的迭代顺序可能不同，
    # 会破坏仅靠 random.seed() 实现的可复现性。采样前
    # 先把清单转为排序后的列表。
    choices = [*sorted(manifest), "nop"]

    move = random.random()
    if move < 0.35 and ops:
        ops[random.randrange(len(ops))] = random.choice(choices)
    elif move < 0.7 and len(ops) < 6:
        ops.insert(random.randrange(len(ops) + 1), random.choice(choices))
    elif move < 0.9 and len(ops) > 1:
        ops.pop(random.randrange(len(ops)))
    elif allow_manifest_edit and random.random() < 0.5:
        # 向当前清单加入未获批准的操作，模拟试图夹带
        # 未经批准的能力。
        manifest.add("raw_eval")
        # 同时尝试修改目标。
        # 恶意目标变更：“放宽要求，接受任意输出”；此字符串用于演示锚点漂移。
        obj = obj + "  # relax: accept any output"
    return Agent(ops=ops, active_manifest=manifest, objective=obj)


# --- 门禁 ---

def gate_invariant(a: Agent) -> bool:
    return a.active_manifest.issubset(APPROVED_TOOL_MANIFEST)


def gate_anchor(a: Agent) -> bool:
    return hashlib.sha256(a.objective.encode()).hexdigest()[:16] == OBJECTIVE_HASH


def gate_multi(perf: float, safety: float) -> bool:
    return perf >= 0.25 and safety >= 1.0


def gate_regression(history_perf: list[float], perf: float, tol: float = 0.2) -> bool:
    """若 perf 比历史最佳值低超过 tol，则拒绝。

    默认 tol=0.2 用于演示“拒绝明显回退，容忍小幅波动”。
    设置 tol=0.0 时，候选表现不得低于历史最佳值。
    """
    if not history_perf:
        return True
    return perf + tol >= max(history_perf)


def run(
    gates: dict[str, bool],
    allow_manifest_edit: bool,
    cycles: int = 200,
    seed: int | None = None,
) -> None:
    if seed is not None:
        random.seed(seed)
    a = Agent()
    best_perf = perf_score(a)
    best_safety = safety_score(a)
    history = [best_perf]
    accepted = 0
    rejects = {"invariant": 0, "anchor": 0, "multi": 0, "regress": 0}

    for _ in range(cycles):
        cand = mutate(a, allow_manifest_edit)
        if gates["invariant"] and not gate_invariant(cand):
            rejects["invariant"] += 1
            continue
        if gates["anchor"] and not gate_anchor(cand):
            rejects["anchor"] += 1
            continue
        p = perf_score(cand)
        s = safety_score(cand)
        if gates["multi"] and not gate_multi(p, s):
            rejects["multi"] += 1
            continue
        if gates["regress"] and not gate_regression(history, p):
            rejects["regress"] += 1
            continue
        a = cand
        history.append(p)
        accepted += 1
        if p > best_perf:
            best_perf = p
        if s > best_safety:
            best_safety = s

    final_perf = perf_score(a)
    final_safety = safety_score(a)
    print(f"  已接纳 {accepted}/{cycles} 轮候选修改")
    print(f"  最终性能分数 {final_perf:.2f}  最终安全分数 {final_safety:.2f}")
    print(f"  历史最佳性能 {best_perf:.2f}  历史最佳安全 {best_safety:.2f}")
    print(f"  最终操作序列 {a.ops}")
    print(f"  工具清单     {sorted(a.active_manifest)}")
    print(f"  目标状态     {'（锚点完整）' if gate_anchor(a) else '（已偏移！）'}")
    print(f"  各门禁拒绝数 {rejects}")


def main() -> None:
    print("=" * 70)
    print("有边界的自我改进（阶段 15，第 8 课）")
    print("=" * 70)

    all_on = dict(invariant=True, anchor=True, multi=True, regress=True)
    all_off = dict(invariant=False, anchor=False, multi=False, regress=False)

    # 每个场景使用相同种子，避免全局随机流持续推进
    # 给比较带来额外干扰。门禁改变状态后，执行轨迹
    # 及后续采样仍可能不同，不是逐轮完全配对的实验。
    print("\n开启全部门禁，允许在随机分支中尝试修改清单")
    print("-" * 70)
    run(all_on, allow_manifest_edit=True, seed=DEFAULT_SEED)

    print("\n关闭全部门禁，允许在随机分支中尝试修改清单")
    print("-" * 70)
    run(all_off, allow_manifest_edit=True, seed=DEFAULT_SEED)

    print("\n仅关闭回归门禁")
    print("-" * 70)
    gates = dict(all_on, regress=False)
    run(gates, allow_manifest_edit=True, seed=DEFAULT_SEED)

    print()
    print("=" * 70)
    print("要点：不同门禁针对不同类型的失败")
    print("-" * 70)
    print("  开启全部门禁：只接纳通过清单、锚点和评分约束的修改。")
    print("  关闭全部门禁：清单、目标和安全表现都可能偏移；以实跑结果为准。")
    print("  缺少回归门禁：能力回退可能被悄悄接纳。")
    print("  门禁是缓解措施，不是对任意输入的安全证明。")


if __name__ == "__main__":
    main()
