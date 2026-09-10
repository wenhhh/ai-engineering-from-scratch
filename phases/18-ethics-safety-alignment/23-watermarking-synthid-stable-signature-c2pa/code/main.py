"""玩具词元水印演示，仅使用 Python 标准库。

词表为整数 0..N-1。每步对前 k 个词元做哈希，再按 (词元编号 + 哈希值) 的
奇偶性划分绿色与红色集合；生成时偏向绿色集合，检测时统计绿色词元的 z 分数。
演示为 1000 个新增词元（另带 k 个前缀词元），不调用语言模型。

运行方式：python3 code/main.py

译注：此划分实际上只会选出偶数编号或奇数编号两种集合，不是 SynthID 的
完整实现。paraphrase 只是随机替换词元，不理解或保留语义；未加水印样本
也是随机整数，不是真实人类文本。本例没有测试文本压缩、图像水印、Stable
Signature 或 C2PA 元数据，也不能凭 100 次样本估计就证明误报率小于 1%。
"""

from __future__ import annotations

import hashlib
import math
import random


random.seed(61)


VOCAB = 200
K = 4  # 哈希上下文长度。


def green_set(prev_tokens: list[int]) -> set[int]:
    """根据上下文哈希的奇偶性选择词表的一半作为绿色集合。"""
    seed = ",".join(str(t) for t in prev_tokens[-K:])
    digest = hashlib.sha256(seed.encode()).hexdigest()
    h = int(digest, 16)
    # 划分规则：(词元编号 + h) mod 2 == 0 时，该词元属于绿色集合。
    return {t for t in range(VOCAB) if (t + h) % 2 == 0}


def unwatermarked_sample(n: int, seed_prefix: list[int]) -> list[int]:
    out = list(seed_prefix)
    for _ in range(n):
        out.append(random.randrange(VOCAB))
    return out


def watermarked_sample(n: int, seed_prefix: list[int], bias: float = 0.9) -> list[int]:
    """bias 表示从绿色集合中采样的概率。"""
    out = list(seed_prefix)
    for _ in range(n):
        greens = green_set(out)
        use_green = random.random() < bias
        pool = list(greens) if use_green else list(set(range(VOCAB)) - greens)
        out.append(random.choice(pool))
    return out


def detect(tokens: list[int]) -> float:
    """返回 z 分数：(绿色词元数 - n×p) / sqrt(n×p×(1-p))，本例 p=0.5。"""
    if len(tokens) <= K:
        return 0.0
    green_count = 0
    for i in range(K, len(tokens)):
        greens = green_set(tokens[:i])
        if tokens[i] in greens:
            green_count += 1
    n = len(tokens) - K
    expected = n * 0.5
    std = math.sqrt(n * 0.5 * 0.5)
    return (green_count - expected) / std


def paraphrase(tokens: list[int], ratio: float = 0.3) -> list[int]:
    """以 ratio 的概率将每个词元替换为随机词元；不是语义改写。"""
    out = list(tokens)
    for i in range(len(out)):
        if random.random() < ratio:
            out[i] = random.randrange(VOCAB)
    return out


def main() -> None:
    print("=" * 70)
    print("玩具词元水印（阶段 18，第 23 课）")
    print("=" * 70)

    seed = [random.randrange(VOCAB) for _ in range(K)]

    watermarked = watermarked_sample(1000, seed)
    plain = unwatermarked_sample(1000, seed)

    print(f"\n带水印样本的 z 分数：{detect(watermarked):.2f}")
    print(f"无水印样本的 z 分数：{detect(plain):.2f}")
    print("（本例以 z >= 4 作为水印判定阈值；实际可信程度仍需校准。）")

    # 原文称“改写攻击”；实际操作是随机替换词元。
    para = paraphrase(watermarked, ratio=0.3)
    print(f"以 30% 概率随机替换词元后：{detect(para):.2f}")
    para2 = paraphrase(watermarked, ratio=0.6)
    print(f"以 60% 概率随机替换词元后：{detect(para2):.2f}")

    # 用随机生成的无水印词元估计误报率，不是真实人类文本。
    fprs = [detect(unwatermarked_sample(1000, seed)) for _ in range(100)]
    fpr_above_4 = sum(1 for z in fprs if z >= 4) / len(fprs)
    print(f"\n100 个随机无水印样本的误报率（z >= 4）：{fpr_above_4:.3f}")

    print("\n" + "=" * 70)
    print("原文要点：较长文本能积累水印检测信号，但效果依赖生成与检测假设。")
    print("本例在 1000 个词元上比较 z 分数；原文所称误报率低于 1% 不能由这 100 次抽样证明。")
    print("随机替换会削弱信号，但本例没有测试真实语义改写，不能推出所有文本水印的结论。")
    print("原文建议结合 C2PA 元数据与水印，并讨论压缩或元数据剥离的影响。")
    print("本例未实现或验证这些机制；元数据可被剥离，鲁棒性须按具体方案评估。")
    print("=" * 70)


if __name__ == "__main__":
    main()
