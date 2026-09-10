"""代码迁移智能体：确定性改写配方与智能体循环回退的示例框架。

核心是两层处理结构：先运行易于审计的确定性改写配方，再让智能体循环处理
剩余失败，配合预算限制和失败分类。本例用 50 个合成仓库演示不同结果。

运行：python main.py

译注：本例没有打开或修改真实仓库、执行 OpenRewrite/libcst、编译、运行测试
或创建 PR。改写次数、覆盖率、耗时、费用与失败类别均为公式或随机数模拟。
预算在每轮开始前检查，当前轮仍可能使费用或时间超过上限；直接通过分支
没有执行智能体分支中的覆盖率回退检查。失败分类是按固定权重抽样，
不是读取构建日志后确定的根因。状态值和失败类别保留英文，便于机器匹配。
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# 仓库数据与失败分类表。
# ---------------------------------------------------------------------------

FAILURE_CLASSES = [
    # 失败类别：需要升级依赖。
    "dep_upgrade_required",
    # 失败类别：构建工具漂移。
    "build_tool_drift",
    # 失败类别：自定义注解。
    "custom_annotation",
    # 失败类别：测试不稳定。
    "test_flake",
    # 失败类别：语法边界情况。
    "syntax_edge_case",
    # 失败类别：预算耗尽。
    "budget_exhausted",
    # 失败类别：覆盖率回退。
    "coverage_regression",
]


@dataclass
class Repo:
    name: str
    loc: int
    lang: str          # 语言标识："java" 或 "python"。
    hardness: float    # 难度范围为 0..1。


@dataclass
class Attempt:
    repo: Repo
    recipe_applied: int = 0
    agent_turns: int = 0
    cost_usd: float = 0.0
    wall_min: float = 0.0
    status: str = "pending"  # 终态标识："pass"（通过）或 "fail"（失败）。
    failure_class: str | None = None
    coverage_base: float = 80.0
    coverage_final: float = 80.0


# ---------------------------------------------------------------------------
# 确定性配方阶段：仅模拟 OpenRewrite/libcst 的改写次数。
# ---------------------------------------------------------------------------

def run_recipes(repo: Repo) -> int:
    """返回模拟应用的改写次数，不改动真实源码。"""
    base = 20 + int(repo.loc / 500)
    return int(base * (1 - 0.2 * repo.hardness))


# ---------------------------------------------------------------------------
# 智能体循环：模拟修复尝试并检查预算；失败后再分类。
# ---------------------------------------------------------------------------

BUDGET_MIN = 30.0
BUDGET_USD = 8.0
BUDGET_TURNS = 20


def agent_loop(attempt: Attempt, rng: random.Random) -> None:
    """模拟计划／行动循环，直到通过、覆盖率回退或预算耗尽。"""
    # 每轮耗时与费用随仓库难度变化。
    per_turn_min = 2.8 + attempt.repo.hardness * 2.0
    per_turn_usd = 0.45 + attempt.repo.hardness * 0.65

    # 每轮通过概率随难度变化，以实际公式为准；最低限制为 0.02。
    turn_pass_p = max(0.02, 0.22 * (1 - attempt.repo.hardness * 0.95))

    while True:
        if attempt.agent_turns >= BUDGET_TURNS:
            attempt.status = "fail"
            # 失败类别：预算耗尽。
            attempt.failure_class = "budget_exhausted"
            return
        if attempt.wall_min >= BUDGET_MIN or attempt.cost_usd >= BUDGET_USD:
            attempt.status = "fail"
            # 失败类别：预算耗尽。
            attempt.failure_class = "budget_exhausted"
            return

        attempt.agent_turns += 1
        attempt.wall_min += per_turn_min
        attempt.cost_usd += per_turn_usd

        if rng.random() < turn_pass_p:
            # 检查合成覆盖率是否回退超过 2 个百分点。
            delta = rng.gauss(0.0, 0.6)
            attempt.coverage_final = attempt.coverage_base + delta
            if attempt.coverage_final < attempt.coverage_base - 2.0:
                attempt.status = "fail"
                # 失败类别：覆盖率回退。
                attempt.failure_class = "coverage_regression"
                return
            attempt.status = "pass"
            return


# ---------------------------------------------------------------------------
# 将停滞仓库归入失败类别。
# ---------------------------------------------------------------------------

def classify_failure(rng: random.Random) -> str:
    """失败分类器的占位实现。真实实现应读取构建日志和测试输出；
    此处仅按固定权重随机抽取类别。"""
    weights = {
        # 失败类别：需要升级依赖。
        "dep_upgrade_required": 0.30,
        # 失败类别：构建工具漂移。
        "build_tool_drift": 0.20,
        # 失败类别：自定义注解。
        "custom_annotation": 0.18,
        # 失败类别：测试不稳定。
        "test_flake": 0.15,
        # 失败类别：语法边界情况。
        "syntax_edge_case": 0.17,
    }
    r = rng.random()
    acc = 0.0
    for cls, w in weights.items():
        acc += w
        if r <= acc:
            return cls
    # 失败类别：语法边界情况。
    return "syntax_edge_case"


# ---------------------------------------------------------------------------
# 流水线：先配方、后智能体，最后返回内存结果；不实际生成 PR。
# ---------------------------------------------------------------------------

def migrate(repo: Repo, rng: random.Random) -> Attempt:
    attempt = Attempt(repo=repo)
    attempt.recipe_applied = run_recipes(repo)

    # 简单仓库有较高概率在配方阶段后直接通过。
    straight_through_p = 0.55 * (1 - repo.hardness)
    if rng.random() < straight_through_p:
        delta = rng.gauss(0.0, 0.4)
        attempt.coverage_final = attempt.coverage_base + delta
        attempt.status = "pass"
        attempt.wall_min = 3.0 + rng.random() * 4
        attempt.cost_usd = 0.30
        return attempt

    # 否则进入智能体循环。
    agent_loop(attempt, rng)

    # 失败类别：预算耗尽。
    if attempt.status == "fail" and attempt.failure_class == "budget_exhausted":
        # 对部分预算耗尽的结果随机分配失败类别，不代表已查明根因。
        if rng.random() < 0.75:
            attempt.failure_class = classify_failure(rng)
    return attempt


# ---------------------------------------------------------------------------
# 50 个合成仓库的模拟实验。
# ---------------------------------------------------------------------------

def synth_bench(rng: random.Random) -> list[Repo]:
    bench: list[Repo] = []
    for i in range(50):
        lang = "java" if rng.random() < 0.6 else "python"
        hardness = min(0.95, max(0.05, rng.gauss(0.65, 0.18)))
        bench.append(Repo(name=f"repo-{i:02d}-{lang}",
                          loc=rng.randint(800, 40_000),
                          lang=lang,
                          hardness=hardness))
    return bench


def main() -> None:
    rng = random.Random(19)
    bench = synth_bench(rng)

    results: list[Attempt] = []
    for repo in bench:
        results.append(migrate(repo, rng))

    passed = [a for a in results if a.status == "pass"]
    failed = [a for a in results if a.status == "fail"]

    print(f"=== 代码迁移模拟基准（50 个仓库） ===")
    print(f"通过：{len(passed):2d}  ({len(passed) / 50:.1%})")
    print(f"失败：{len(failed):2d}")

    print("\n失败分类：")
    taxonomy: dict[str, int] = {}
    for a in failed:
        taxonomy[a.failure_class or "unknown"] = taxonomy.get(a.failure_class or "unknown", 0) + 1
    for cls, n in sorted(taxonomy.items(), key=lambda x: -x[1]):
        print(f"  {cls:24s} {n}")

    if passed:
        mean_cost = sum(a.cost_usd for a in passed) / len(passed)
        mean_min = sum(a.wall_min for a in passed) / len(passed)
        mean_turns = sum(a.agent_turns for a in passed) / len(passed)
        mean_cov_delta = sum(a.coverage_final - a.coverage_base for a in passed) / len(passed)
        print("\n通过仓库的指标：")
        print(f"  每仓库平均费用：${mean_cost:.2f}")
        print(f"  平均耗时（分钟）：{mean_min:.1f}")
        print(f"  平均智能体轮数：{mean_turns:.1f}")
        print(f"  平均覆盖率变化：{mean_cov_delta:+.2f} 个百分点")


if __name__ == "__main__":
    main()
