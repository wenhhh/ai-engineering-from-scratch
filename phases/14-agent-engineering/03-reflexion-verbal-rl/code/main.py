"""教学用 Reflexion 循环——行动器（Actor）、评估器（Evaluator）、自我反思器（Self-Reflector）与情景记忆（Episodic memory）。

任务：从 1..9 中选出三个整数，使其和等于目标值。行动器按预设脚本
从错误策略开始，并在存在反思记录时调整策略。
"""

from __future__ import annotations

from dataclasses import dataclass, field


TARGET = 20


@dataclass
class Reflection:
    trial: int
    text: str


@dataclass
class EpisodicMemory:
    items: list[Reflection] = field(default_factory=list)
    max_len: int = 6

    def add(self, r: Reflection) -> None:
        self.items.append(r)
        if len(self.items) > self.max_len:
            self.items.pop(0)

    def as_prompt(self) -> str:
        if not self.items:
            return "（无先前反思）"
        lines = [f"- 第 {r.trial} 次尝试： {r.text}" for r in self.items]
        return "\n".join(lines)


class Actor:
    """预设脚本策略。没有反思时持续做出错误选择；
    只要有至少一条反思，就开始向目标和靠近。"""

    def act(self, memory: EpisodicMemory) -> list[int]:
        n = len(memory.items)
        if n == 0:
            return [1, 2, 3]
        if n == 1:
            return [5, 6, 7]
        if n == 2:
            return [6, 7, 7]
        return [6, 7, 7]


def binary_evaluator(attempt: list[int], target: int) -> tuple[bool, int]:
    total = sum(attempt)
    return total == target, total - target


class SelfReflector:
    def reflect(self, attempt: list[int], delta: int) -> str:
        if delta < 0:
            return f"当前和为 {sum(attempt)}，还差 {-delta}；请选择更大的数值"
        if delta > 0:
            return f"当前和为 {sum(attempt)}，超出 {delta}；请选择更小的数值"
        return "成功"


@dataclass
class TrialResult:
    trial: int
    attempt: list[int]
    success: bool
    delta: int
    reflection: str


def run_reflexion(max_trials: int, use_memory: bool) -> list[TrialResult]:
    actor = Actor()
    reflector = SelfReflector()
    memory = EpisodicMemory()
    trials: list[TrialResult] = []
    for t in range(1, max_trials + 1):
        attempt = actor.act(memory if use_memory else EpisodicMemory())
        success, delta = binary_evaluator(attempt, TARGET)
        text = reflector.reflect(attempt, delta)
        trials.append(TrialResult(t, attempt, success, delta, text))
        if success:
            break
        memory.add(Reflection(trial=t, text=text))
    return trials


def summarize(trials: list[TrialResult], name: str) -> None:
    print(f"\n{name}")
    print("-" * 60)
    for r in trials:
        mark = "成功 " if r.success else "..."
        print(f"  第 {r.trial} 次尝试：{r.attempt} 和={sum(r.attempt)} "
              f"差值={r.delta:+d} {mark} -> {r.reflection}")
    last = trials[-1]
    print(f"  最终结果：{'成功' if last.success else '失败'} "
          f"在第 {last.trial} 次尝试时")


def main() -> None:
    print("=" * 70)
    print(f"Reflexion——从 [1..9] 选三个整数，使其和为 {TARGET}")
    print("第 14 阶段，第 03 课")
    print("=" * 70)

    trials_no_mem = run_reflexion(max_trials=4, use_memory=False)
    summarize(trials_no_mem, "基线（Baseline，不使用情景记忆）")

    trials_mem = run_reflexion(max_trials=4, use_memory=True)
    summarize(trials_mem, "Reflexion（启用情景记忆）")

    baseline_steps = len(trials_no_mem)
    reflex_steps = len(trials_mem)
    print()
    print(f"基线使用了 {baseline_steps} 次尝试；Reflexion 使用了 {reflex_steps} 次。")
    print("提示词（Prompt）中没有反思记录时，脚本式行动器始终不会调整。")
    print("有一条反思时，行动器开始纠正；有两条时，便收敛到目标。")


if __name__ == "__main__":
    main()
