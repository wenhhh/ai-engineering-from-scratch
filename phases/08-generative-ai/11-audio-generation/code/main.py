import math
import random


VOCAB = 16
NUM_STYLES = 2


def make_tokens(style, length, rng):
    """按风格生成合成“音频词元”（audio token）序列。"""
    if style == 0:  # 交替变化，类似语音
        return [(i + rng.randint(0, 1)) % VOCAB for i in range(length)]
    return [(i * 3 + rng.randint(0, 1)) % VOCAB for i in range(length)]


def init_counts():
    return [[[1.0 for _ in range(VOCAB)] for _ in range(VOCAB)] for _ in range(NUM_STYLES)]


def update_counts(counts, sequence, style):
    for i in range(len(sequence) - 1):
        counts[style][sequence[i]][sequence[i + 1]] += 1.0


def probs(counts, style, prev_tok):
    row = counts[style][prev_tok]
    total = sum(row)
    return [x / total for x in row]


def entropy(p):
    return -sum(pi * math.log(max(pi, 1e-10)) for pi in p)


def sample_from(p, rng):
    r = rng.random()
    acc = 0.0
    for i, pi in enumerate(p):
        acc += pi
        if r <= acc:
            return i
    return len(p) - 1


def generate(counts, style, start, length, rng, temperature=1.0):
    out = [start]
    for _ in range(length - 1):
        p = probs(counts, style, out[-1])
        if temperature != 1.0:
            p = [pi ** (1 / temperature) for pi in p]
            total = sum(p)
            p = [x / total for x in p]
        out.append(sample_from(p, rng))
    return out


def main():
    rng = random.Random(42)
    counts = init_counts()

    print("=== 为每种风格训练编解码器词元二元模型（bigram），每种使用 500 条序列 ===")
    for _ in range(500):
        for style in range(NUM_STYLES):
            seq = make_tokens(style, length=20, rng=rng)
            update_counts(counts, seq, style)

    print()
    print("=== 从 start=0 开始，为每种风格生成 20 个词元 ===")
    for style in range(NUM_STYLES):
        label = "类语音（交替变化）" if style == 0 else "类音乐（斜坡变化）"
        print(f"\n风格 {style}: {label}")
        for temp in [0.7, 1.0]:
            out = generate(counts, style, start=0, length=20, rng=rng, temperature=temp)
            print(f"  温度 {temp:.1f}: {out}")

    print()
    print("=== 风格 0 下，以词元 5 为条件时各位置的熵 ===")
    p = probs(counts, 0, 5)
    top3 = sorted(range(VOCAB), key=lambda i: -p[i])[:3]
    print(f"  p(下一个词元 | 风格=0, 前一个词元=5)：H = {entropy(p):.3f}")
    print(f"  概率最高的 3 个词元：{[(i, round(p[i], 3)) for i in top3]}")

    print()
    print("=== VALL-E 风格的提示续写 ===")
    prompt = make_tokens(0, length=5, rng=rng)[:5]
    print(f"  3 秒语音提示（词元）：{prompt}")
    continuation = list(prompt)
    for _ in range(15):
        p = probs(counts, 0, continuation[-1])
        continuation.append(sample_from(p, rng))
    print(f"  续写结果：{continuation}")

    print()
    print("要点：词元 + Transformer 构成完整的文本转语音（TTS）/音乐生成基础。")
    print("      Encodec / DAC 的残差向量量化（RVQ）让真实音频也能接入同一套生成循环。")


if __name__ == "__main__":
    main()
