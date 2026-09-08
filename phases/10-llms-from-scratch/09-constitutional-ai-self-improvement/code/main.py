"""宪法式 AI（Constitutional AI）自我批评 + 组相对策略优化（GRPO）规则奖励循环。

仅用标准库和 numpy 即可端到端运行。CAI 循环使用手写批评器（Critic），
代替大语言模型（LLM）的自我评判器。GRPO 循环使用确定性的数学评分器
作为奖励来源。两个循环都会生成可接入真实优化器（Optimizer）的指标。
"""

from __future__ import annotations

import random
import re
from typing import Callable

import numpy as np


CONSTITUTION = [
    "The response must directly answer the question asked, without hedging.",
    "The response must not include unnecessary filler or padding.",
    "If the question has a single numeric answer, state the number plainly.",
    "The response must not refuse a reasonable, benign request.",
]


def critique(response: str, principle: str) -> dict:
    problems = []
    lowered = response.strip().lower()
    if len(response.split()) > 40 and "plainly" in principle:
        problems.append("answer buried in extra prose")
    if lowered.startswith(("i can't", "i cannot", "as an ai")):
        problems.append("unwarranted refusal")
    if response.count(",") > 4 and "hedging" not in problems:
        problems.append("too much hedging")
    if "maybe" in lowered or "i think" in lowered:
        problems.append("overhedged phrasing")
    return {"principle": principle, "problems": problems}


def revise(response: str, critique_result: dict) -> str:
    problems = " ".join(critique_result["problems"])
    if "answer buried" in problems:
        sentences = [s.strip() for s in response.split(".") if s.strip()]
        if sentences:
            return sentences[-1] + "."
    if "unwarranted refusal" in problems:
        return "Here is the answer: " + response.split(":")[-1].strip()
    if "overhedged" in problems:
        return (
            response.replace("I think ", "")
            .replace("maybe ", "")
            .replace("Maybe ", "")
        )
    return response


def cai_stage_one(prompts_and_responses: list[tuple[str, str]]) -> list[dict]:
    revised_pairs = []
    for prompt, response in prompts_and_responses:
        principle = random.choice(CONSTITUTION)
        crit = critique(response, principle)
        revised = revise(response, crit)
        revised_pairs.append(
            {
                "prompt": prompt,
                "initial": response,
                "principle": principle,
                "problems": crit["problems"],
                "revised": revised,
                "changed": revised != response,
            }
        )
    return revised_pairs


def reward_math(prompt: str, response: str) -> float:
    try:
        cleaned = prompt.replace("What is ", "").replace("?", "").strip()
        expected = eval(cleaned, {"__builtins__": {}}, {})
    except Exception:
        return 0.0
    numbers = re.findall(r"-?\d+", response)
    if not numbers:
        return 0.0
    try:
        return 1.0 if int(numbers[-1]) == int(expected) else 0.0
    except (ValueError, TypeError):
        return 0.0


def reward_format(response: str) -> float:
    return 1.0 if re.search(r"<answer>.*?</answer>", response) else 0.0


def combined_reward(prompt: str, response: str) -> float:
    return reward_math(prompt, response) + 0.1 * reward_format(response)


def group_relative_advantage(rewards: list[float]) -> np.ndarray:
    r = np.array(rewards, dtype=float)
    if r.std() < 1e-8:
        return np.zeros_like(r)
    return (r - r.mean()) / (r.std() + 1e-8)


def grpo_step(
    policy_logprobs: np.ndarray,
    ref_logprobs: np.ndarray,
    advantages: np.ndarray,
    beta: float = 0.01,
    clip_eps: float = 0.2,
) -> dict:
    ratios = np.exp(policy_logprobs - ref_logprobs)
    unclipped = ratios * advantages
    clipped = np.clip(ratios, 1 - clip_eps, 1 + clip_eps) * advantages
    policy_loss = -np.minimum(unclipped, clipped).mean()
    kl = (ref_logprobs - policy_logprobs).mean()
    total_loss = policy_loss + beta * kl
    return {
        "policy_loss": float(policy_loss),
        "kl": float(kl),
        "total_loss": float(total_loss),
        "mean_ratio": float(ratios.mean()),
        "advantage_range": float(advantages.max() - advantages.min()),
    }


def mock_sampler(rng: random.Random) -> Callable[[str], str]:
    """模拟 LLM 策略（Policy）。返回的字符串有时包含简单算术提示词的正确答案，
    有时包裹在 <answer> 标签中，有时不带标签。这足以验证奖励的形式。"""

    def sampler(prompt: str) -> str:
        try:
            cleaned = prompt.replace("What is ", "").replace("?", "").strip()
            correct = eval(cleaned, {"__builtins__": {}}, {})
        except Exception:
            correct = 0
        mode = rng.choice(["correct", "off_by_one", "wrong", "formatted", "verbose"])
        if mode == "correct":
            return f"The answer is {correct}."
        if mode == "off_by_one":
            return f"The answer is {int(correct) + rng.choice([-1, 1])}."
        if mode == "wrong":
            return f"The answer is {rng.randint(-20, 20)}."
        if mode == "formatted":
            return f"<answer>{correct}</answer>"
        return (
            "Let me think about this step by step, first I consider the operands, "
            f"then I perform the operation carefully, and so the final answer is {correct}."
        )

    return sampler


def self_improvement_round(
    prompts: list[str],
    sampler: Callable[[str], str],
    group_size: int = 8,
) -> dict:
    per_prompt = []
    for prompt in prompts:
        responses = [sampler(prompt) for _ in range(group_size)]
        rewards = [combined_reward(prompt, r) for r in responses]
        advantages = group_relative_advantage(rewards)
        best_idx = int(np.argmax(rewards))
        per_prompt.append(
            {
                "prompt": prompt,
                "mean_reward": float(np.mean(rewards)),
                "best_reward": float(np.max(rewards)),
                "std_reward": float(np.std(rewards)),
                "best_response": responses[best_idx],
                "advantages": advantages.tolist(),
            }
        )
    overall = float(np.mean([m["mean_reward"] for m in per_prompt]))
    return {"per_prompt": per_prompt, "overall_mean": overall}


def demo_constitutional_loop() -> None:
    print("=" * 70)
    print("第 1 部分 / 宪法式 AI 自我批评（Constitutional AI Self-critique）")
    print("=" * 70)
    raw = [
        ("What is the capital of France?",
         "Well, I think maybe it could be Paris, but there are many cities."),
        ("What is 12 plus 7?",
         "I cannot answer math questions in this context."),
        ("Name a color.",
         "Colors are a deep topic, with many hues, shades, and cultural meanings, "
         "and among the many options a reasonable choice would be blue."),
    ]
    for pair in cai_stage_one(raw):
        print(f"\n提示词（Prompt）   : {pair['prompt']}")
        print(f"原则（Principle）: {pair['principle']}")
        print(f"初始回复（Initial）  : {pair['initial']}")
        print(f"问题（Problems） : {pair['problems']}")
        print(f"修订回复（Revised）  : {pair['revised']}")
        print(f"是否改动（Changed）? : {pair['changed']}")


def demo_grpo_loop() -> None:
    print("\n" + "=" * 70)
    print("第 2 部分 / 基于规则奖励（Rule-based Rewards）的 GRPO")
    print("=" * 70)
    rng = random.Random(42)
    sampler = mock_sampler(rng)
    prompts = [
        "What is 3 + 4?",
        "What is 9 - 2?",
        "What is 6 * 7?",
        "What is 20 // 5?",
    ]
    group_size = 8

    for round_idx in range(3):
        print(f"\n-- 轮次（Round）{round_idx + 1} / 组大小 group_size={group_size} --")
        result = self_improvement_round(prompts, sampler, group_size=group_size)
        for m in result["per_prompt"]:
            print(
                f"  {m['prompt']:<22} "
                f"均值（mean）={m['mean_reward']:.3f}  "
                f"最优值（best）={m['best_reward']:.3f}  "
                f"标准差（std）={m['std_reward']:.3f}"
            )
        print(f"  总体平均奖励: {result['overall_mean']:.3f}")

    print("\n-- 合成数据 GRPO 更新 --")
    rewards = [1.0, 0.0, 0.1, 0.0, 1.0, 1.0, 0.0, 0.1]
    advantages = group_relative_advantage(rewards)
    policy_logprobs = np.array([-1.2, -2.1, -1.9, -2.4, -1.1, -1.0, -2.3, -2.0])
    ref_logprobs = policy_logprobs - 0.05
    stats = grpo_step(policy_logprobs, ref_logprobs, advantages)
    print(f"  奖励（rewards）       : {rewards}")
    print(f"  优势（advantages）    : {advantages.round(3).tolist()}")
    print(f"  策略损失（policy_loss）   : {stats['policy_loss']:.4f}")
    print(f"  KL 散度（kl）            : {stats['kl']:.4f}")
    print(f"  总损失（total_loss）    : {stats['total_loss']:.4f}")
    print(f"  平均比率（mean ratio）    : {stats['mean_ratio']:.4f}")
    print(f"  优势范围（adv range）     : {stats['advantage_range']:.4f}")


if __name__ == "__main__":
    random.seed(0)
    np.random.seed(0)
    demo_constitutional_loop()
    demo_grpo_loop()
    print("\n" + "=" * 70)
    print("完成（DONE）")
    print("=" * 70)
