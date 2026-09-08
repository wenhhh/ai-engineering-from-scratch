import math
import random


def simulate_copy_accuracy(seq_len, context_dim=8, epochs=200, n_train=300, seed=0):
    rng = random.Random(seed)
    vocab = list("abcdefghij")
    vocab_size = len(vocab)

    embed = [[rng.gauss(0, 0.3) for _ in range(context_dim)] for _ in range(vocab_size)]
    context = [0.0] * context_dim

    def encode(sequence):
        c = [0.0] * context_dim
        decay = 0.85
        for token in sequence:
            idx = vocab.index(token)
            for d in range(context_dim):
                c[d] = c[d] * decay + embed[idx][d]
        return c

    def decode_score(context, target):
        total = 0.0
        recovery = 1.0
        for token in target:
            idx = vocab.index(token)
            score = sum(context[d] * embed[idx][d] for d in range(context_dim))
            normed = math.tanh(score) * recovery
            total += max(0.0, normed)
            recovery *= 0.9
        return total / max(1, len(target))

    hits = 0
    trials = 100
    for _ in range(trials):
        seq = [rng.choice(vocab) for _ in range(seq_len)]
        c = encode(seq)
        target_score = decode_score(c, seq)

        noise_score = decode_score(c, [rng.choice(vocab) for _ in range(seq_len)])
        if target_score > noise_score:
            hits += 1
    return hits / trials


def main():
    print("编码器-解码器瓶颈（Encoder-decoder bottleneck）的小型模拟")
    print("上下文向量（Context vector）的固定大小 = 8 个浮点数")
    print("编码器每步将状态乘以 0.85 衰减（模拟遗忘）")
    print()
    print(f"{'序列长度（Sequence length）':>8}  {'准确率（Accuracy）':>10}")
    for length in [5, 10, 20, 40, 80]:
        acc = simulate_copy_accuracy(length)
        print(f"{length:>8}  {acc:>9.0%}")
    print()
    print("实际长短期记忆网络（LSTM）的衰减更缓和，但仍受到相同限制。")
    print("注意力（Attention，第 10 课）去除了固定大小的约束。")


if __name__ == "__main__":
    main()
