"""Chameleon 风格的早期融合（early fusion）：简化 VQ 量化器与共享词表自回归解码器。

端到端流程：
  1. 类 VQ-VAE 量化器：8×8 灰度图块 -> 整数码本索引，K=16。
  2. 共享词表：文本 ID 为 0..31，图像 ID 为 32..47，分隔符为
     48（<image>）和 49（</image>）。
  3. 在合成的（文本 + <image> 码字 </image>）配对上训练二元模型解码器。
  4. 通过采样循环输出混合模态内容。

仅使用标准库。这里用二元计数表代替 Transformer，目的是以微型实例
呈现共享词表中的生成循环，而不是追求图像质量。

译注：red（红）、blue（蓝）、green（绿）、gray（灰）是样本类别键，
参与条件判断和查表，因此保留原值。w 前缀表示文本词元，i 前缀表示
图像码字；<image> 与 </image> 是模态分隔符，保持原样。
"""

from __future__ import annotations

import math
import random
from collections import defaultdict

random.seed(42)

VOCAB_TEXT = 32
VOCAB_IMG = 16
IMG_OFFSET = VOCAB_TEXT
SEP_OPEN = VOCAB_TEXT + VOCAB_IMG
SEP_CLOSE = SEP_OPEN + 1
VOCAB_SIZE = SEP_CLOSE + 1


CODEBOOK = [[(i * 7 + 3 * j) % 8 for j in range(4)] for i in range(VOCAB_IMG)]


def quantize_patch(patch: list[int]) -> int:
    """根据 L2 距离查找最近的码本条目。"""
    best = 0
    best_d = float("inf")
    for k, code in enumerate(CODEBOOK):
        d = sum((p - c) ** 2 for p, c in zip(patch, code))
        if d < best_d:
            best_d = d
            best = k
    return best + IMG_OFFSET


def image_to_tokens(img: list[list[int]]) -> list[int]:
    """8×8 灰度图 -> 4 个图块，每块包含 4 个经下采样的浮点数；返回词元 ID。
    译注：“浮点数”沿用原注释；当前代码使用整除，实际得到整数。"""
    patches = []
    for pr in range(0, 8, 4):
        for pc in range(0, 8, 4):
            flat = []
            for r in range(2):
                for c in range(2):
                    s = 0
                    for dr in range(2):
                        for dc in range(2):
                            s += img[pr + 2 * r + dr][pc + 2 * c + dc]
                    flat.append(s // 4)
            patches.append(flat)
    return [quantize_patch(p) for p in patches]


def synthesize_caption(kind: str) -> list[int]:
    """选择一段简短的合成文本词元序列。"""
    if kind == "red":
        return [1, 5, 3, 7]
    if kind == "blue":
        return [2, 5, 3, 8]
    if kind == "green":
        return [1, 5, 3, 9]
    return [1, 5, 3, 10]


def synth_image(kind: str) -> list[list[int]]:
    shade = {"red": 7, "blue": 2, "green": 4, "gray": 5}[kind]
    return [[(shade + (r + c) % 3) for c in range(8)] for r in range(8)]


def make_dataset(n: int = 40) -> list[list[int]]:
    kinds = ["red", "blue", "green", "gray"]
    corpus = []
    for _ in range(n):
        k = random.choice(kinds)
        tokens = synthesize_caption(k) + [SEP_OPEN] + image_to_tokens(synth_image(k)) + [SEP_CLOSE]
        if random.random() < 0.4:
            tokens = [SEP_OPEN] + image_to_tokens(synth_image(k)) + [SEP_CLOSE] + synthesize_caption(k)
        corpus.append(tokens)
    return corpus


def train_bigram(corpus: list[list[int]]) -> dict:
    counts: dict = defaultdict(lambda: defaultdict(int))
    for seq in corpus:
        for a, b in zip(seq, seq[1:]):
            counts[a][b] += 1
    return counts


def sample_next(bigram: dict, prev: int) -> int:
    dist = bigram.get(prev, {})
    if not dist:
        return random.randrange(VOCAB_SIZE)
    total = sum(dist.values())
    r = random.random() * total
    acc = 0
    for tok, c in dist.items():
        acc += c
        if r <= acc:
            return tok
    return next(iter(dist))


def generate(bigram: dict, prompt: list[int], max_len: int = 40) -> list[int]:
    out = list(prompt)
    while len(out) < max_len:
        nxt = sample_next(bigram, out[-1])
        out.append(nxt)
        if nxt == SEP_CLOSE and any(t < VOCAB_TEXT for t in out):
            break
    return out


def render(tokens: list[int]) -> str:
    parts = []
    for t in tokens:
        if t == SEP_OPEN:
            parts.append("<image>")
        elif t == SEP_CLOSE:
            parts.append("</image>")
        elif t < VOCAB_TEXT:
            parts.append(f"w{t}")
        else:
            parts.append(f"i{t - IMG_OFFSET}")
    return " ".join(parts)


def main() -> None:
    print("=" * 60)
    print("Chameleon 早期融合简化示例（阶段 12，第 11 课）")
    print("=" * 60)

    print("\n1. VQ 分词器——8×8 灰度图 -> 4 个图块 -> 4 个图像词元")
    print("-" * 60)
    for kind in ["red", "blue", "green", "gray"]:
        img = synth_image(kind)
        codes = image_to_tokens(img)
        print(f"  {kind:<6} -> 码字 {codes}")

    print("\n2. 共享词表布局")
    print("-" * 60)
    print(f"  文本词元范围：0..{VOCAB_TEXT - 1}")
    print(f"  图像词元范围：{IMG_OFFSET}..{IMG_OFFSET + VOCAB_IMG - 1}")
    print(f"  <image>       : {SEP_OPEN}")
    print(f"  </image>      : {SEP_CLOSE}")
    print(f"  词表总大小  ：{VOCAB_SIZE}")

    print("\n3. 数据集（40 条文本与图像词元交错的序列）")
    print("-" * 60)
    corpus = make_dataset(40)
    for seq in corpus[:4]:
        print("  " + render(seq))

    print("\n4. 训练二元模型，采样混合模态输出")
    print("-" * 60)
    bigram = train_bigram(corpus)
    for _ in range(3):
        out = generate(bigram, [1, 5], max_len=30)
        print("  " + render(out))

    print("\n要点")
    print("-" * 60)
    print("  一个模型、一个词表、一种损失 -> 自然得到混合模态输出")
    print("  分词器质量决定图像保真度的上限（见 Emu3 的第 12.12 课）")
    print("  扩大规模时，需要 QK-Norm 和精心设置的 dropout 来稳定训练")


if __name__ == "__main__":
    main()
