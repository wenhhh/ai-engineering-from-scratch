"""多智能体强化学习（MARL）模式的概念模拟：集中训练与分散执行（CTDE）等。

两个智能体在 4×4 网格中收集两个目标物，比较独立选择最近目标与集中分配目标。
以 MADDPG、QMIX 和 MAPPO 命名的函数都使用预设策略，没有梯度更新、价值网络
或真实强化学习训练，因此不能据此评价这些算法的训练速度或性能。

译注：原文开头写一个目标物，实际有两个；环境只要求目标全部收集，并不强制
每个智能体各收集一个。没有额外碰撞惩罚或奖励函数。协调版每一步仍调用集中式
分配，而且两个智能体都会移动；不是仅在训练时使用中央信息的部署实现。
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field


GRID = 4


@dataclass
class Env:
    """合作任务：网格中有两个目标物，全部收集后结束。
    当前实现不记录每个智能体的收集配额，也不对碰撞额外计罚；
    外层策略仅统计循环步数。"""
    agent0: tuple[int, int]
    agent1: tuple[int, int]
    pellet0: tuple[int, int]
    pellet1: tuple[int, int]
    pellets_remaining: set[tuple[int, int]] = field(default_factory=set)

    @staticmethod
    def new(rng: random.Random) -> "Env":
        positions: set[tuple[int, int]] = set()
        while len(positions) < 4:
            positions.add((rng.randint(0, GRID - 1), rng.randint(0, GRID - 1)))
        a0, a1, p0, p1 = list(positions)
        return Env(agent0=a0, agent1=a1, pellet0=p0, pellet1=p1,
                   pellets_remaining={p0, p1})

    @property
    def done(self) -> bool:
        return not self.pellets_remaining

    def collect_if_on_pellet(self) -> None:
        for pos in (self.agent0, self.agent1):
            self.pellets_remaining.discard(pos)


def manhattan(a: tuple[int, int], b: tuple[int, int]) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def step_toward(pos: tuple[int, int], target: tuple[int, int]) -> tuple[int, int]:
    dx = (target[0] - pos[0])
    dy = (target[1] - pos[1])
    if abs(dx) >= abs(dy):
        nx = pos[0] + (1 if dx > 0 else -1 if dx < 0 else 0)
        ny = pos[1]
    else:
        nx = pos[0]
        ny = pos[1] + (1 if dy > 0 else -1 if dy < 0 else 0)
    nx = max(0, min(GRID - 1, nx))
    ny = max(0, min(GRID - 1, ny))
    return (nx, ny)


def move_or_wait(pos: tuple[int, int], target: tuple[int, int], wait: bool) -> tuple[int, int]:
    if wait:
        return pos
    return step_toward(pos, target)


def run_independent(env: Env, max_steps: int = 50) -> int:
    """每个智能体独立选择最近的目标物，不考虑另一个智能体的目标，
    因而可能发生重复奔赴同一目标的情况。"""
    steps = 0
    while not env.done and steps < max_steps:
        p0_target = min(env.pellets_remaining, key=lambda p: manhattan(env.agent0, p))
        p1_target = min(env.pellets_remaining, key=lambda p: manhattan(env.agent1, p))
        env.agent0 = step_toward(env.agent0, p0_target)
        env.agent1 = step_toward(env.agent1, p1_target)
        env.collect_if_on_pellet()
        steps += 1
    return steps


def _assigned_targets(env: Env) -> tuple[tuple[int, int], tuple[int, int]]:
    """集中分配两个目标，选择曼哈顿距离总和更小的配对；只剩一个目标时两者都指向它。"""
    pellets = list(env.pellets_remaining)
    if len(pellets) == 1:
        return pellets[0], pellets[0]
    p, q = pellets[0], pellets[1]
    cost_pq = manhattan(env.agent0, p) + manhattan(env.agent1, q)
    cost_qp = manhattan(env.agent0, q) + manhattan(env.agent1, p)
    return (p, q) if cost_pq <= cost_qp else (q, p)


def run_maddpg_style(env: Env, max_steps: int = 50) -> int:
    """用集中式目标分配类比协作策略：每一步重新分配目标，两者都向目标移动。
    本例没有训练 critic/actor，执行时也仍然访问全局环境。"""
    steps = 0
    while not env.done and steps < max_steps:
        t0, t1 = _assigned_targets(env)
        env.agent0 = step_toward(env.agent0, t0)
        env.agent1 = step_toward(env.agent1, t1)
        env.collect_if_on_pellet()
        steps += 1
    return steps


def run_qmix_style(env: Env, max_steps: int = 50) -> int:
    """以 QMIX 命名的教学占位策略：实际仍使用同一个集中目标分配函数。
    没有实现局部 Q 函数、单调混合网络或价值分解训练。"""
    steps = 0
    while not env.done and steps < max_steps:
        if len(env.pellets_remaining) >= 2:
            t0, t1 = _assigned_targets(env)
        else:
            only = next(iter(env.pellets_remaining))
            t0, t1 = only, only
        env.agent0 = step_toward(env.agent0, t0)
        env.agent1 = step_toward(env.agent1, t1)
        env.collect_if_on_pellet()
        steps += 1
    return steps


def run_mappo_style(env: Env, max_steps: int = 50) -> int:
    """以 MAPPO 命名的教学占位策略，直接调用 run_maddpg_style。
    两者结果相同来自函数复用，不是训练后策略相似的实验结论。"""
    return run_maddpg_style(env, max_steps)


def bench(label: str, runner) -> None:
    total = 0
    trials = 500
    for i in range(trials):
        rng = random.Random(i)
        env = Env.new(rng)
        total += runner(env)
    print(f"  {label:20s} 平均完成步数 = {total / trials:.2f}")


def main() -> None:
    print("=" * 72)
    print("MARL 模式概念模拟：4×4 网格、2 个智能体与 2 个目标物（合作任务）")
    print("=" * 72)
    bench("独立策略（无协调）", run_independent)
    bench("MADDPG 风格占位策略", run_maddpg_style)
    bench("QMIX 风格占位策略", run_qmix_style)
    bench("MAPPO 风格占位策略", run_mappo_style)
    print("\n要点：")
    print("  独立策略可能把步数浪费在重复追逐同一目标上。")
    print("  本例协调版通过分配目标减少重复，两位智能体仍在每步同时移动。")
    print("  QMIX、MAPPO 与 MADDPG 风格函数在这里共享目标分配或直接复用实现，")
    print("  没有不同训练过程，不能从相同结果推断真实算法会学习出相同策略。")
    print("  对 LLM 智能体系统，可以借鉴“路由器分配协作目标”的结构，")
    print("  但要区分运行期协调与真正的集中训练、分散执行。")


if __name__ == "__main__":
    main()
