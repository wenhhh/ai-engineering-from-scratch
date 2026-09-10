"""心智理论（ToM）式规则与零阶规则的代币收集对照，仅使用 Python 标准库。

三个智能体分别从三个盒子中收集一枚代币。零阶智能体忽略他人偏好；
一阶 ToM 风格规则依据已观察到的目标，尽量避开别人选择的盒子。
每组进行 200 次模拟，记录完成数、重复选择次数和轮数。

译注：ToM 组在第一轮之前额外获得了所有其他智能体的初始偏好，属于预先提供的
协调信息；不能把收益完全归因于心智推理，也不能说双方完全没有通信或共享信息。
后续使用一个滑动观察窗口而非严格的上一轮快照，冲突按插入顺序选出获胜者。
文末论文名称和编号来自固定原文，没有通过本例复现其结论。
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field


@dataclass
class World:
    n_boxes: int
    boxes_with_tokens: set[int]

    @classmethod
    def new(cls, n: int) -> "World":
        return cls(n_boxes=n, boxes_with_tokens=set(range(n)))


@dataclass
class Agent:
    name: str
    tom: bool
    target: int | None = None
    collected: bool = False
    observations: list[tuple[str, int]] = field(default_factory=list)

    def choose_target(self, world: World, rng: random.Random) -> int:
        if self.collected:
            return -1
        available = sorted(world.boxes_with_tokens)
        if not available:
            return -1
        if not self.tom:
            # 零阶规则：在剩余盒子中均匀随机选择，不使用对他人的观察记忆。
            return rng.choice(available)
        # 一阶 ToM 风格规则：根据近期观察推测他人的目标盒子，
        # 在可能时避开它们；这里取滑动窗口，不是严格只取上一轮。
        last_turn_targets = {box for _, box in self.observations[-(len(world.boxes_with_tokens) + 2):]}
        options = [b for b in available if b not in last_turn_targets]
        return rng.choice(options) if options else rng.choice(available)

    def observe(self, other: str, box: int) -> None:
        self.observations.append((other, box))


def run_trial(n_agents: int, n_boxes: int, tom: bool, seed: int, max_turns: int = 10) -> tuple[int, int, int]:
    """每轮先收集所有智能体的目标选择，再统一结算。
    同盒冲突中只有一位取得代币，其他冲突者浪费该轮。
    ToM 风格规则尽量避开近期观察到的其他智能体目标。

    初始偏好提示：ToM 组在第 0 轮前预先获得其他智能体的偏好，
    用来模拟廉价通信或先验知识；零阶组没有使用这份额外信息。"""
    rng = random.Random(seed)
    world = World.new(n_boxes)
    agents = [Agent(f"agent-{i}", tom=tom) for i in range(n_agents)]

    # 为 ToM 组预先提供其他智能体的初始偏好。
    # 每个智能体按其索引偏好一个起始盒子；ToM 组看到
    # 其他智能体的偏好，零阶组不使用这些信息。
    if tom:
        for i, a in enumerate(agents):
            for j, other in enumerate(agents):
                if i != j:
                    a.observe(other.name, j % n_boxes)

    duplications = 0
    turns = 0
    for t in range(max_turns):
        turns = t + 1
        # 每个尚未收集到代币的智能体提交本轮目标。
        commitments: dict[str, int] = {}
        for a in agents:
            if a.collected:
                continue
            choice = a.choose_target(world, rng)
            if choice < 0:
                continue
            commitments[a.name] = choice

        # 其他智能体记录本轮目标选择，ToM 组在后续选择时使用。
        for observer in agents:
            for other, box in commitments.items():
                if other == observer.name:
                    continue
                observer.observe(other, box)

        # 统计冲突：两个或更多智能体选择同一个盒子。
        choices = list(commitments.values())
        for box in set(choices):
            n = choices.count(box)
            if n >= 2:
                duplications += n - 1

        # 结算：每个盒子只让字典插入顺序中最先出现的智能体取得代币，
        # 其余冲突者在这一轮没有收获。
        taken: set[int] = set()
        for name, box in commitments.items():
            if box in taken:
                continue
            if box in world.boxes_with_tokens:
                world.boxes_with_tokens.discard(box)
                for a in agents:
                    if a.name == name:
                        a.collected = True
                taken.add(box)

        if all(a.collected for a in agents):
            break

    completions = sum(1 for a in agents if a.collected)
    return completions, duplications, turns


def bench(tom: bool, trials: int = 200) -> None:
    label = "一阶 ToM 风格规则" if tom else "零阶规则"
    tot_completions = 0
    tot_dup = 0
    tot_turns = 0
    full_trials = 0
    for t in range(trials):
        c, d, turns = run_trial(n_agents=3, n_boxes=3, tom=tom, seed=t)
        tot_completions += c
        tot_dup += d
        tot_turns += turns
        if c == 3:
            full_trials += 1
    print(f"  {label:16s} 全员完成次数={full_trials}/{trials} "
          f"  每次试验平均重复选择={tot_dup/trials:.2f}"
          f"  平均轮数={tot_turns/trials:.2f}")


def main() -> None:
    print("=" * 72)
    print("代币收集——3 个智能体、3 个盒子、最多 10 轮，每组 200 次试验")
    print("智能体观察彼此的目标选择；ToM 组还额外获得初始偏好提示")
    print("=" * 72)
    bench(tom=False)
    bench(tom=True)
    print("\n要点：")
    print("  原文描述零阶组每次试验约有一次重复选择；精确数值以本次输出为准。")
    print("  在本例预先提供互补偏好的条件下，ToM 组可避免冲突，")
    print("  并在一轮内完成；这同时包含初始信息差异的作用。")
    print("  完成轮数与重复选择可以量化协调效果，但此对照没有单独隔离“推理能力”的贡献。")
    print("  可另做去除初始偏好提示的消融实验，检验效果如何变化；此文件未自动运行该消融。")
    print("  原文还引用 Riedl 2025（arXiv:2510.05174）讨论 ToM 提示；本轮未核验论文。")
    print("  原文引用 Li 等人 2023 年讨论长程退化；本例默认最多 10 轮，并未运行 30 轮复现。")


if __name__ == "__main__":
    main()
