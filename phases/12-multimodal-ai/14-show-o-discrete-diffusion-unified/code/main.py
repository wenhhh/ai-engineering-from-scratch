"""Show-o 掩码离散扩散（masked discrete diffusion）采样器——仅使用标准库。

使用 16 个词元、大小为 K=8 的词表、T=8 个步骤和余弦调度。
通过模拟“Transformer”的 logits，把重点放在采样循环而非模型本身。
打印掩码随步骤变化的过程。
"""

from __future__ import annotations

import math
import random

random.seed(2)

VOCAB = 8
SEQ_LEN = 16
MASK = -1


def cosine_schedule(T: int) -> list[float]:
    """步骤 t 的掩码比例，取值范围为 [0, 1]，从 1.0 降至 0.0。"""
    return [math.cos(math.pi * (t + 1) / (2 * T)) for t in range(T)]


def mock_logits(tokens: list[int], prompt_seed: int = 0) -> list[list[float]]:
    """模拟 Transformer：根据提示和位置，使特定词元获得更高的 logit。"""
    logits = []
    for i, t in enumerate(tokens):
        base = [random.gauss(0, 0.3) for _ in range(VOCAB)]
        bias = (prompt_seed + i) % VOCAB
        base[bias] += 2.5
        if t != MASK:
            base[t] += 3.0
        logits.append(base)
    return logits


def softmax(xs: list[float]) -> list[float]:
    m = max(xs)
    e = [math.exp(x - m) for x in xs]
    z = sum(e)
    return [x / z for x in e]


def step_unmask(tokens: list[int], prompt_seed: int, keep_ratio: float) -> list[int]:
    """预测所有被掩码的词元，并保留其中置信度最高、比例为 keep_ratio 的预测。"""
    logits = mock_logits(tokens, prompt_seed)
    preds = []
    confs = []
    for i, t in enumerate(tokens):
        if t == MASK:
            probs = softmax(logits[i])
            top = max(range(VOCAB), key=lambda k: probs[k])
            preds.append((i, top, probs[top]))
        else:
            preds.append((i, t, 1.0))
        confs.append(preds[-1][2])
    masked_indices = [i for i, t in enumerate(tokens) if t == MASK]
    masked_indices.sort(key=lambda i: -preds[i][2])
    n_to_keep = max(1, int(len(masked_indices) * keep_ratio))
    new_tokens = list(tokens)
    for idx in masked_indices[:n_to_keep]:
        new_tokens[idx] = preds[idx][1]
    return new_tokens


def sample(prompt_seed: int, T: int = 8) -> list[list[int]]:
    tokens = [MASK] * SEQ_LEN
    traces = [list(tokens)]
    ratios = cosine_schedule(T)
    for step in range(T):
        remaining = sum(1 for t in tokens if t == MASK)
        if remaining == 0:
            break
        keep_ratio = max(0.15, 1 - ratios[step])
        tokens = step_unmask(tokens, prompt_seed, keep_ratio)
        traces.append(list(tokens))
    while any(t == MASK for t in tokens):
        tokens = step_unmask(tokens, prompt_seed, 1.0)
        traces.append(list(tokens))
    return traces


def render(tokens: list[int]) -> str:
    return " ".join(f"{t:>2}" if t != MASK else " ." for t in tokens)


def main() -> None:
    print("=" * 60)
    print("Show-o 掩码离散扩散采样器（阶段 12，第 14 课）")
    print("=" * 60)

    T = 8
    print(f"\n调度计划（余弦调度，T={T} 步）")
    print("-" * 60)
    for t, r in enumerate(cosine_schedule(T)):
        print(f"  步骤 {t:>2}  掩码比例 = {r:.3f}")

    print("\n采样轨迹（prompt_seed=3）")
    print("-" * 60)
    traces = sample(prompt_seed=3, T=T)
    for i, tr in enumerate(traces):
        n_mask = sum(1 for x in tr if x == MASK)
        print(f"  步骤 {i:>2}  剩余掩码数={n_mask:>2}  | {render(tr)}")

    print("\n四种任务，共用一个模型检查点")
    print("-" * 60)
    print("  1. 文本生成：对文本词元执行标准下一词元预测（NTP）")
    print("  2. 视觉问答（VQA）：输入图像 -> 输出文本（文本侧采用因果 NTP）")
    print("  3. 文生图（T2I）：输入文本 -> 被掩码的图像 + 扩散采样器")
    print("  4. 局部重绘（inpainting）：部分区域被掩码的图像 -> 使用同一循环补全")


if __name__ == "__main__":
    main()
