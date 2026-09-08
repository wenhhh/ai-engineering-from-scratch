"""教学用 Self-Refine 与 CRITIC 循环。

任务：生成包含 3 个要点的摘要，每个要点少于 60 个字符，且不包含
已知事实错误。Self-Refine 使用大语言模型（LLM）式自我批评（Self-critique）；
CRITIC 则通过外部事实列表完成验证。
"""

from __future__ import annotations

from dataclasses import dataclass, field


KNOWN_WRONG_FACTS = [
    "paris is the capital of germany",
    "mt everest is in europe",
    "the sun orbits the earth",
]


@dataclass
class Attempt:
    iteration: int
    output: str
    critique: str
    verified: bool


def generate(topic: str, history: list[Attempt]) -> str:
    if not history:
        return (
            "- Paris is the capital of Germany\n"
            "- Mt Everest is in Europe\n"
            "- Water boils at 100C"
        )
    last = history[-1]
    if "germany" in last.critique.lower():
        return (
            "- Paris is the capital of France\n"
            "- Mt Everest is in Europe\n"
            "- Water boils at 100C"
        )
    if "everest" in last.critique.lower():
        return (
            "- Paris is the capital of France\n"
            "- Mt Everest is in Asia\n"
            "- Water boils at 100C at sea level"
        )
    return history[-1].output


def feedback_self(output: str) -> tuple[str, bool]:
    if "Germany" in output and "Paris" in output:
        return "第一个要点看起来有误，请复核首都", False
    if "Europe" in output and "Everest" in output:
        return "第二个要点中的大洲似乎不对", False
    return "没有问题", True


def verify_external(output: str) -> tuple[str, bool]:
    text = output.lower()
    for fact in KNOWN_WRONG_FACTS:
        key = fact.split(" is ")[0] if " is " in fact else fact
        if "paris" in text and "germany" in text:
            return f"验证器（Verifier）：'paris is the capital of germany' 与参考数据矛盾", False
        if "everest" in text and "europe" in text:
            return f"验证器（Verifier）：'mt everest is in europe' 与参考数据矛盾", False
    if len([l for l in output.splitlines() if l.startswith("-")]) != 3:
        return "验证器：应有 3 行要点", False
    if any(len(l) > 60 for l in output.splitlines()):
        return "验证器：要点超过 60 个字符", False
    return "验证器：通过", True


def refine(topic: str, prev: str, critique: str, history: list[Attempt]) -> str:
    return generate(topic, history)


def run_loop(topic: str, use_critic: bool, max_iters: int = 4) -> list[Attempt]:
    history: list[Attempt] = []
    output = generate(topic, history)
    verify = verify_external if use_critic else (lambda o: feedback_self(o))
    for i in range(1, max_iters + 1):
        critique, ok = verify(output)
        history.append(Attempt(i, output, critique, ok))
        if ok:
            break
        output = refine(topic, output, critique, history)
    return history


def print_run(label: str, history: list[Attempt]) -> None:
    print(f"\n{label}")
    print("-" * 60)
    for a in history:
        tag = "通过 " if a.verified else "..."
        print(f"  第 {a.iteration} 轮 {tag} 批评意见： {a.critique}")
        for line in a.output.splitlines():
            print(f"    {line}")


def main() -> None:
    print("=" * 70)
    print("Self-Refine 与 CRITIC——第 14 阶段，第 05 课")
    print("=" * 70)

    hist_self = run_loop("world facts", use_critic=False)
    print_run("Self-Refine（仅自我批评）", hist_self)

    hist_critic = run_loop("world facts", use_critic=True)
    print_run("CRITIC（外部验证器）", hist_critic)

    def summary(hist: list[Attempt]) -> str:
        return "通过" if hist and hist[-1].verified else "未收敛"

    print()
    print(f"Self-Refine 结束：{summary(hist_self)}  共 {len(hist_self)} 轮")
    print(f"CRITIC 结束：{summary(hist_critic)}  共 {len(hist_critic)} 轮")
    print()
    print("观察：CRITIC 的验证器以参考数据为依据；")
    print("自我批评器可能无法识别自己那些听起来很笃定的幻觉（Hallucination）。")


if __name__ == "__main__":
    main()
