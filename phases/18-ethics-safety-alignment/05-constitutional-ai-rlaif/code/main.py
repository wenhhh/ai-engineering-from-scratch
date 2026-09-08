"""宪法式 AI（Constitutional AI）的批评与修订教学循环，仅使用 Python 标准库。

回答是从词表中抽取的一组词元（Token）。“原则”标记有害子集中的词元，
批评模型识别有害词元，修订过程依据映射将其替换为安全词元。
对整个语料执行这一过程，创建新的监督微调（SFT）数据集，
随后测量处理前后的有害词元占比。

用法：python3 code/main.py
"""

from __future__ import annotations

import random
from dataclasses import dataclass


random.seed(11)

SAFE_TOKENS = [
    "please", "help", "explain", "consider", "inform",
    "guide", "describe", "understand", "thoughts", "share",
]
HARMFUL_TOKENS = [
    "harm", "attack", "exploit", "hack", "destroy",
    "weapon", "manipulate", "deceive",
]
REPLACEMENT = {
    "harm": "help",
    "attack": "understand",
    "exploit": "describe",
    "hack": "explain",
    "destroy": "consider",
    "weapon": "resource",
    "manipulate": "guide",
    "deceive": "inform",
}

PRINCIPLES = [
    "avoid outputs that could cause physical, psychological, or material harm",
    "do not provide operational uplift for attacks",
    "prefer clear, non-violent explanations",
    "help the user while protecting third parties",
]


def base_model_sample(n_tokens: int = 6, p_harmful: float = 0.35) -> list[str]:
    """基础模型：可能以 p_harmful 的概率输出有害词元。"""
    out = []
    for _ in range(n_tokens):
        if random.random() < p_harmful:
            out.append(random.choice(HARMFUL_TOKENS))
        else:
            out.append(random.choice(SAFE_TOKENS))
    return out


def harmful_token_rate(response: list[str]) -> float:
    if not response:
        return 0.0
    return sum(1 for t in response if t in HARMFUL_TOKENS) / len(response)


def critique(response: list[str], principle: str) -> list[str]:
    """识别违反所采样原则的词元。"""
    return [t for t in response if t in HARMFUL_TOKENS]


def revise(response: list[str], bad: list[str]) -> list[str]:
    """依据映射，将有害词元替换为安全词元。"""
    bad_set = set(bad)
    return [REPLACEMENT.get(t, t) if t in bad_set else t for t in response]


@dataclass
class SftCorpus:
    prompts: list[list[str]]
    targets: list[list[str]]


def build_cai_sft_corpus(n_examples: int = 500) -> SftCorpus:
    """阶段 1：生成初始回答，进行批评与修订，将修订后的回答作为 SFT 目标。"""
    prompts = []
    targets = []
    for _ in range(n_examples):
        prompt = base_model_sample(n_tokens=4, p_harmful=0.1)
        response = base_model_sample()
        principle = random.choice(PRINCIPLES)
        bad = critique(response, principle)
        revised = revise(response, bad)
        prompts.append(prompt)
        targets.append(revised)
    return SftCorpus(prompts, targets)


def toy_sft_train(corpus: SftCorpus) -> dict[tuple[str, ...], list[str]]:
    """构建提示词前缀到补全文本的查找表，作为 SFT 的简单替代模型。"""
    model = {}
    for p, t in zip(corpus.prompts, corpus.targets):
        key = tuple(p[-2:]) if len(p) >= 2 else tuple(p)
        model[key] = t
    return model


def cai_model_sample(prompt: list[str], model: dict, n_tokens: int = 6) -> list[str]:
    key = tuple(prompt[-2:]) if len(prompt) >= 2 else tuple(prompt)
    if key in model:
        return list(model[key])
    return [random.choice(SAFE_TOKENS) for _ in range(n_tokens)]


def ai_feedback_rank(a: list[str], b: list[str]) -> int:
    """阶段 2：AI 反馈强化学习（RLAIF），AI 标注者偏好有害词元占比更低的回答。"""
    ra = harmful_token_rate(a)
    rb = harmful_token_rate(b)
    if ra < rb:
        return 0
    if rb < ra:
        return 1
    return random.randint(0, 1)


def evaluate(model_fn, n: int = 200) -> float:
    rates = []
    for _ in range(n):
        prompt = base_model_sample(n_tokens=4, p_harmful=0.1)
        resp = model_fn(prompt)
        rates.append(harmful_token_rate(resp))
    return sum(rates) / len(rates)


def main() -> None:
    print("=" * 70)
    print("宪法式 AI 教学流水线（阶段 18，第 5 课）")
    print("=" * 70)

    print("\n阶段 0：基础模型（未对齐）。")
    base = lambda prompt: base_model_sample()
    base_rate = evaluate(base)
    print(f"  200 条提示词上的有害词元占比：{base_rate:.3f}")

    print("\n阶段 1：生成批评与修订 SFT 语料。")
    corpus = build_cai_sft_corpus(500)
    trained = toy_sft_train(corpus)
    print(f"  语料规模：{len(corpus.prompts)} 个样本")
    print(f"  原则池：{len(PRINCIPLES)} 条原则")

    cai = lambda prompt: cai_model_sample(prompt, trained)
    cai_rate = evaluate(cai)
    print(f"  CAI-SFT 后的有害词元占比：{cai_rate:.3f}")
    print(f"  降幅："
          f"{(base_rate - cai_rate) / base_rate * 100:.1f}%")

    print("\n阶段 2：RLAIF（针对成对补全文本的 AI 反馈）。")
    wins = 0
    trials = 500
    for _ in range(trials):
        prompt = base_model_sample(n_tokens=4, p_harmful=0.1)
        a = base(prompt)
        b = cai(prompt)
        if ai_feedback_rank(a, b) == 1:
            wins += 1
    print(f"  AI 反馈中 CAI 相对基础模型的获胜次数：{wins}/{trials} "
          f"= {wins/trials:.1%}")

    print("\n" + "=" * 70)
    print("要点：仅 CAI-SFT 就能大幅降低有害词元占比。")
    print("RLAIF 增加了用于进一步优化的偏好信号。")
    print("这种信号可以理解：你可以阅读原则，")
    print("检查每条批评由哪条原则驱动。这是它相对")
    print("人工标签的主要优势，而非成本。")
    print("=" * 70)


if __name__ == "__main__":
    main()
