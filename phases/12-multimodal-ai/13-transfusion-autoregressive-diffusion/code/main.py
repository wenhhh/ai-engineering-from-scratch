"""Transfusion 简化示例：在 4×4 灰度图与简短图像描述上训练双损失模型。

仅使用标准库。这里用共享线性映射代替 Transformer，重点是双损失的
衔接方式与块三角注意力掩码（block-triangular attention mask）。
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

random.seed(1)

VOCAB = 8
IMG_PATCH_DIM = 4
HIDDEN = 8
SEP_OPEN = -1
SEP_CLOSE = -2


@dataclass
class Pair:
    caption: list[int]
    image: list[list[float]]


def make_dataset(n: int = 24) -> list[Pair]:
    pairs = []
    for _ in range(n):
        cls = random.randint(0, VOCAB - 2)
        cap = [1, 2, cls, 3]
        shade = (cls + 1) / VOCAB
        img = [[shade * ((r * 4 + c) % 3 + 1) for c in range(IMG_PATCH_DIM)]
               for r in range(IMG_PATCH_DIM)]
        pairs.append(Pair(caption=cap, image=img))
    return pairs


def patch_to_vec(patch: list[float]) -> list[float]:
    return patch[:HIDDEN] + [0.0] * max(0, HIDDEN - len(patch))


def build_mask(tokens: list) -> list[list[int]]:
    """块三角掩码：文本部分采用因果注意力，同一图像内部采用双向注意力。"""
    n = len(tokens)
    img_ranges = []
    i = 0
    while i < n:
        if tokens[i] == SEP_OPEN:
            start = i + 1
            while i < n and tokens[i] != SEP_CLOSE:
                i += 1
            img_ranges.append((start, i))
        i += 1

    def same_img(a: int, b: int) -> bool:
        for s, e in img_ranges:
            if s <= a < e and s <= b < e:
                return True
        return False

    def in_text(idx: int) -> bool:
        return not any(s <= idx < e for s, e in img_ranges) and tokens[idx] not in (SEP_OPEN, SEP_CLOSE)

    mask = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if in_text(i) and in_text(j) and j <= i:
                mask[i][j] = 1
            elif not in_text(i) and not in_text(j) and same_img(i, j):
                mask[i][j] = 1
            elif in_text(i) and not in_text(j) and j <= i:
                mask[i][j] = 1
            elif not in_text(i) and in_text(j) and j <= i:
                mask[i][j] = 1
    return mask


def mse(a: list[float], b: list[float]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) / max(1, len(a))


def cross_entropy_toy(prob: float) -> float:
    prob = max(prob, 1e-6)
    return -math.log(prob)


def two_loss_step(pair: Pair, weights: dict) -> dict:
    """模拟一个训练步骤，计算文本损失与图像损失。
    这里的“Transformer”只是替身，返回输入加上权重扰动的结果。"""
    text_probs = [0.3 + 0.05 * weights["text_scale"]
                  for _ in pair.caption]
    text_loss = sum(cross_entropy_toy(p) for p in text_probs) / len(text_probs)

    noise = [[random.gauss(0, 1) for _ in range(IMG_PATCH_DIM)] for _ in range(IMG_PATCH_DIM)]
    t = random.random()
    xt = [[(1 - t) * x + t * n for x, n in zip(row_x, row_n)]
          for row_x, row_n in zip(pair.image, noise)]
    predicted_vel = [[(n - x) * (0.8 + 0.02 * weights["img_scale"])
                      for x, n in zip(row_x, row_n)]
                     for row_x, row_n in zip(pair.image, noise)]
    target_vel = [[n - x for x, n in zip(row_x, row_n)]
                  for row_x, row_n in zip(pair.image, noise)]
    pred_flat = sum(predicted_vel, [])
    tgt_flat = sum(target_vel, [])
    img_loss = mse(pred_flat, tgt_flat)

    total = weights["text_w"] * text_loss + weights["img_w"] * img_loss
    return {"text_loss": text_loss, "img_loss": img_loss, "total": total}


def train(pairs: list[Pair], steps: int = 10) -> None:
    weights = {"text_scale": 0, "img_scale": 0, "text_w": 1.0, "img_w": 0.1}
    for step in range(steps):
        pair = random.choice(pairs)
        losses = two_loss_step(pair, weights)
        weights["text_scale"] += 1
        weights["img_scale"] += 1
        if step % 2 == 0:
            print(f"  步骤 {step:>2}  文本损失={losses['text_loss']:.3f}"
                  f"  图像损失={losses['img_loss']:.3f}"
                  f"  总损失={losses['total']:.3f}")


def demo_mask() -> None:
    print("\n以下序列的块三角掩码：")
    tokens = [10, 11, SEP_OPEN, "p0", "p1", "p2", "p3", SEP_CLOSE, 12, 13]
    print(f"  词元：{tokens}")
    mask = build_mask(tokens)
    print("\n  注意力掩码（1=允许关注，.=屏蔽）：")
    for i, row in enumerate(mask):
        print(f"    {i:>2} | " + " ".join("1" if v else "." for v in row))


def main() -> None:
    print("=" * 60)
    print("Transfusion 简化示例（阶段 12，第 13 课）")
    print("=" * 60)

    demo_mask()

    print("\n" + "=" * 60)
    print("双损失训练（文本采用下一词元预测 NTP，图像采用流匹配）")
    print("-" * 60)
    pairs = make_dataset(24)
    train(pairs, steps=10)

    print("\n" + "=" * 60)
    print("Transfusion、MMDiT 与 Chameleon 的对比")
    print("-" * 60)
    print("  Chameleon  ：离散图像词元，仅使用下一词元预测（NTP）")
    print("  Transfusion：连续图像图块 + NTP（文本）+ 流匹配（图像）")
    print("  MMDiT (SD3)：与 Transfusion 思路相近，使用各模态专属的块权重")
    print("  Show-o     ：NTP（文本）+ 掩码离散扩散（图像）")


if __name__ == "__main__":
    main()
