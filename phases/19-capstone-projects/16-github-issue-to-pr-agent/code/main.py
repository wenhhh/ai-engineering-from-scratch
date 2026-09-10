"""GitHub 问题到 PR 的异步云端智能体：调度、预算与安全关卡模拟。

本例展示按仓库检查预算、模拟安装令牌、推进沙箱状态与验证状态的控制流。
运行：python main.py

译注：仓库、令牌、克隆、容器、CI 与 PR 都只是内存对象或状态标记，不连接 GitHub。
can 只拒绝两种字符串模式，未按 permissions 校验其他动作，open_pr 也不核对令牌仓库。
permit 用每任务上限检查日预算，但没有实际预留、并发锁或按日重置；dispatch 没有
把账本自定义上限传入 run_agent。循环先计费再检查，最后一轮可能超过费用或时间阈值。
因此该示例不是隔离保证或生产级费用硬上限。失败原因与轨迹值保留机器契约并加中文说明。
"""

from __future__ import annotations

import random
import time
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from enum import Enum, auto


# ---------------------------------------------------------------------------
# Webhook 到任务入队：这里仅定义任务结构，未实现标签触发或真实队列
# ---------------------------------------------------------------------------

@dataclass
class Task:
    task_id: int
    repo: str
    issue_num: int
    title: str
    created_at: float = field(default_factory=time.time)


# ---------------------------------------------------------------------------
# 预算账本：按仓库记录费用与 PR 数，日切换需外部处理
# ---------------------------------------------------------------------------

@dataclass
class BudgetLedger:
    daily_dollar_cap: float = 50.0
    daily_pr_cap: int = 5
    per_task_dollar_cap: float = 20.0
    spent_today: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    prs_today: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def permit(self, repo: str, estimated_cost: float) -> tuple[bool, str]:
        if estimated_cost > self.per_task_dollar_cap:
            # 准入拒绝：估计费用高于单任务费用上限。
            return False, f"task estimate ${estimated_cost:.2f} > cap ${self.per_task_dollar_cap}"
        # 按每任务费用上限而非估计值做准入检查。此处只比较数值，不实际预留资金。
        # 原意是用最坏单任务支出约束准入；但 run_agent 有自己的默认阈值，
        # dispatch 没有同步自定义账本阈值，且循环先累计一轮支出再检查上限。
        # 因而不能保证并发或边界情况下的日预算不被超出。record 只累计
        # 实际模拟费用；代码没有真正的预留与归还事务。
        worst_case = self.per_task_dollar_cap
        if self.spent_today[repo] + worst_case > self.daily_dollar_cap:
            # 准入拒绝：该仓库的日费用上限将被超过。
            return False, f"daily $ cap for {repo} would be exceeded"
        if self.prs_today[repo] >= self.daily_pr_cap:
            # 准入拒绝：该仓库的日 PR 数量已达到上限。
            return False, f"daily PR cap ({self.daily_pr_cap}) for {repo} reached"
        # 准入结果：当前检查允许任务进入。
        return True, "ok"

    def record(self, repo: str, spent: float, opened_pr: bool) -> None:
        self.spent_today[repo] += spent
        if opened_pr:
            self.prs_today[repo] += 1


# ---------------------------------------------------------------------------
# GitHub App 身份模拟：短期有效的本地令牌对象与权限字段
# ---------------------------------------------------------------------------

@dataclass
class InstallationToken:
    repo: str
    expires_at: float
    permissions: dict[str, str] = field(default_factory=dict)

    @classmethod
    def mint(cls, repo: str) -> "InstallationToken":
        return cls(repo=repo,
                   expires_at=time.time() + 3600,
                   permissions={"issues": "rw", "pull_requests": "rw",
                                "contents": "rw", "workflows": "r"})

    def can(self, action: str) -> bool:
        # 固定拒绝规则：禁止 force_push；没有真正执行 Git 命令
        if action == "force_push":
            return False
        if action.startswith("write:main"):
            return False
        return True


# ---------------------------------------------------------------------------
# 沙箱状态模拟：CLONE → INFER → AGENT → VERIFY → PR
# ---------------------------------------------------------------------------

class SState(Enum):
    CLONE = auto()
    INFER = auto()
    AGENT = auto()
    VERIFY = auto()
    PR = auto()
    DONE = auto()
    FAILED = auto()


@dataclass
class SandboxRun:
    task: Task
    state: SState = SState.CLONE
    turns: int = 0
    dollars: float = 0.0
    wall_min: float = 0.0
    coverage_delta: float = 0.0
    ci_green: bool = False
    pr_opened: bool = False
    failure: str | None = None
    trace: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 智能体循环桩：每轮成功概率由合成难度决定
# ---------------------------------------------------------------------------

def run_agent(run: SandboxRun, difficulty: float, rng: random.Random,
              turn_cap: int = 20, dollar_cap: float = 20.0,
              minute_cap: float = 30.0) -> None:
    run.state = SState.AGENT
    per_turn_p = max(0.05, 0.35 * (1 - difficulty))
    per_turn_min = 0.9 + difficulty * 0.6
    per_turn_usd = 0.25 + difficulty * 0.45

    while True:
        run.turns += 1
        run.wall_min += per_turn_min
        run.dollars += per_turn_usd
        # 轨迹格式保留：记录轮数及累计模拟费用。
        run.trace.append(f"turn {run.turns}: $={run.dollars:.2f}")

        if run.turns >= turn_cap:
            # 失败状态：达到轮数上限。
            run.failure = "turn_cap"
            run.state = SState.FAILED
            return
        if run.dollars >= dollar_cap:
            # 失败状态：累计模拟费用达到或超过上限。
            run.failure = "dollar_cap"
            run.state = SState.FAILED
            return
        if run.wall_min >= minute_cap:
            # 失败状态：累计模拟时间达到或超过上限。
            run.failure = "minute_cap"
            run.state = SState.FAILED
            return

        if rng.random() < per_turn_p:
            run.state = SState.VERIFY
            return


def run_verify(run: SandboxRun, difficulty: float, rng: random.Random) -> None:
    flake = rng.random() < 0.05
    if flake:
        run.ci_green = False
        # 失败状态：随机产生的测试不稳定标记，不是真实测试执行。
        run.failure = "flaky_test"
        run.state = SState.FAILED
        return
    run.ci_green = True
    run.coverage_delta = rng.gauss(0.0, 0.6)
    if run.coverage_delta < -2.0:
        # 失败状态：合成覆盖率变化低于允许阈值。
        run.failure = "coverage_regression"
        run.state = SState.FAILED
        return
    run.state = SState.PR


def open_pr(run: SandboxRun, token: InstallationToken) -> None:
    # 显式运行时检查：不使用会被 python -O 去除的 assert 作为这里的关卡。
    # 实际只检查到期与 can 返回值；这不等于完整的仓库授权或权限检查。
    if time.time() >= token.expires_at:
        # 失败状态：令牌已过期。
        run.failure = "token_expired"
        run.state = SState.FAILED
        return
    if not token.can("pull_request.open"):
        # 失败状态：令牌对象的 can 检查拒绝。
        run.failure = "policy_denied"
        run.state = SState.FAILED
        return
    run.pr_opened = True
    run.state = SState.DONE


# ---------------------------------------------------------------------------
# 调度器：处理传入任务，检查账本并推进模拟沙箱流程
# ---------------------------------------------------------------------------

def dispatch(task: Task, ledger: BudgetLedger, rng: random.Random) -> SandboxRun:
    difficulty = rng.uniform(0.3, 0.92)
    estimated = 2.0 + difficulty * 8.0
    allowed, reason = ledger.permit(task.repo, estimated)
    if not allowed:
        run = SandboxRun(task)
        run.failure = f"dispatcher: {reason}"
        run.state = SState.FAILED
        return run

    token = InstallationToken.mint(task.repo)
    run = SandboxRun(task)
    # 轨迹标记：模拟克隆，没有执行克隆命令。
    run.trace.append("state: CLONE")
    run.state = SState.INFER
    # 轨迹标记：模拟环境推断，没有实际合成 Dockerfile。
    run.trace.append("state: INFER (dockerfile synthesized)")
    run_agent(run, difficulty, rng)
    if run.state == SState.VERIFY:
        run_verify(run, difficulty, rng)
    if run.state == SState.PR:
        open_pr(run, token)
    ledger.record(task.repo, run.dollars, run.pr_opened)
    return run


# ---------------------------------------------------------------------------
# 演示：三个仓库的 20 个模拟问题，部分请求会触发预算拒绝
# ---------------------------------------------------------------------------

def main() -> None:
    rng = random.Random(9)
    ledger = BudgetLedger()
    repos = ["acme/widget", "acme/service", "acme/library"]
    runs: list[SandboxRun] = []

    for i in range(20):
        task = Task(task_id=i, repo=rng.choice(repos), issue_num=800 + i,
                    title=f"修复模块中的空指针异常，模块 {i}")
        run = dispatch(task, ledger, rng)
        runs.append(run)

    opened = sum(1 for r in runs if r.pr_opened)
    failed = sum(1 for r in runs if r.state == SState.FAILED)
    print(f"=== 调度结果（{len(runs)} 个任务） ===")
    print(f"模拟开启的 PR：{opened}")
    print(f"失败任务数：{failed}")

    print("\n失败原因（原状态值）：")
    reasons = defaultdict(int)
    for r in runs:
        if r.failure:
            reasons[r.failure] += 1
    for reason, n in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f"  {reason:24s} {n}")

    print("\n预算汇总：")
    for repo in repos:
        print(f"  {repo:20s} 支出=${ledger.spent_today[repo]:.2f}  "
              f"PRs={ledger.prs_today[repo]}")

    if opened:
        mean_cost = sum(r.dollars for r in runs if r.pr_opened) / opened
        mean_turns = sum(r.turns for r in runs if r.pr_opened) / opened
        print(f"\n成功集合：每个 PR 的平均费用=${mean_cost:.2f}  平均轮数={mean_turns:.1f}")


if __name__ == "__main__":
    main()
