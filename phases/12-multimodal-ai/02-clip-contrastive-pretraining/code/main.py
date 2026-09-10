"""CLIP / SigLIP 对比损失简化示例——仅使用 Python 标准库。

在手工构造的相似度矩阵上实现 InfoNCE（softmax）和 sigmoid 成对损失。
还会使用合成的图像嵌入与文本嵌入，演示一个小型零样本分类流程。

不依赖 NumPy 或 PyTorch。目的是看清损失函数的数学计算和 argmax 的使用方式。

译注：类别键 cat（猫）、dog（狗）、bird（鸟）、car（汽车）保留原值。
三个英文模板均表达“一张 {class} 的图片”；golden retriever 表示“金毛寻回犬”。
这些模板的字符参与随机种子计算，不能直接译成中文而不改变实验。
"""

from __future__ import annotations

import math
import random


def normalize(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def similarity_matrix(images: list[list[float]],
                      texts: list[list[float]],
                      tau: float) -> list[list[float]]:
    I = [normalize(v) for v in images]
    T = [normalize(v) for v in texts]
    N = len(I)
    S = [[0.0] * N for _ in range(N)]
    for i in range(N):
        for j in range(N):
            S[i][j] = cosine(I[i], T[j]) / tau
    return S


def log_sum_exp(row: list[float]) -> float:
    m = max(row)
    return m + math.log(sum(math.exp(x - m) for x in row))


def infonce_loss(S: list[list[float]]) -> float:
    """同时沿行和列计算对称的 InfoNCE 损失。"""
    N = len(S)
    loss_i2t = 0.0
    for i in range(N):
        loss_i2t += -S[i][i] + log_sum_exp(S[i])
    loss_t2i = 0.0
    for j in range(N):
        col = [S[i][j] for i in range(N)]
        loss_t2i += -S[j][j] + log_sum_exp(col)
    return (loss_i2t + loss_t2i) / (2 * N)


def sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def sigmoid_loss(S: list[list[float]], bias: float = 0.0) -> float:
    """SigLIP 风格的逐对二元交叉熵（BCE）；对角线上的配对为正例。"""
    N = len(S)
    total = 0.0
    count = 0
    for i in range(N):
        for j in range(N):
            logit = S[i][j] + bias
            y = 1.0 if i == j else 0.0
            p = sigmoid(logit)
            eps = 1e-9
            term = y * math.log(p + eps) + (1 - y) * math.log(1 - p + eps)
            total += -term
            count += 1
    return total / count


def zero_shot_classify(image: list[float],
                       class_texts: dict[str, list[float]]) -> list[tuple[str, float]]:
    """对各类别提示词的余弦相似度取 argmax，选出最匹配的类别。"""
    img = normalize(image)
    scores = []
    for name, vec in class_texts.items():
        scores.append((name, cosine(img, normalize(vec))))
    scores.sort(key=lambda p: p[1], reverse=True)
    return scores


def make_fake_embedding(seed: int, dim: int = 64) -> list[float]:
    rng = random.Random(seed)
    return [rng.gauss(0, 1) for _ in range(dim)]


def demo_infonce() -> None:
    print("\n演示 1：在 4 对对齐样本上计算 InfoNCE")
    print("-" * 60)
    images = [make_fake_embedding(i) for i in range(4)]
    texts = [[x + 0.05 * make_fake_embedding(i + 100)[k] for k, x in enumerate(v)]
             for i, v in enumerate(images)]

    for tau in (0.07, 0.1, 1.0):
        S = similarity_matrix(images, texts, tau=tau)
        loss = infonce_loss(S)
        slip = sigmoid_loss(S)
        print(f"  tau={tau:4.2f}  InfoNCE={loss:.4f}  SigLIP={slip:.4f}")


def demo_shuffled() -> None:
    print("\n演示 2：样本配对未对齐时会怎样")
    print("-" * 60)
    images = [make_fake_embedding(i) for i in range(6)]
    texts = [make_fake_embedding(i + 500) for i in range(6)]
    S = similarity_matrix(images, texts, tau=0.07)
    loss = infonce_loss(S)
    slip = sigmoid_loss(S)
    print(f"  未对齐：InfoNCE={loss:.4f}  SigLIP={slip:.4f}")
    aligned_imgs = [make_fake_embedding(i) for i in range(6)]
    aligned_txt = [[x + 0.02 for x in v] for v in aligned_imgs]
    S2 = similarity_matrix(aligned_imgs, aligned_txt, tau=0.07)
    print(f"  已对齐：InfoNCE={infonce_loss(S2):.4f}  "
          f"SigLIP={sigmoid_loss(S2):.4f}")
    print("  对齐样本的损失小于未对齐样本，验证了梯度信号的方向。")


def demo_zero_shot() -> None:
    print("\n演示 3：零样本分类（zero-shot classification）")
    print("-" * 60)
    classes = {
        "cat": make_fake_embedding(42),
        "dog": make_fake_embedding(43),
        "bird": make_fake_embedding(44),
        "car": make_fake_embedding(45),
    }
    query_image = [c + 0.3 * make_fake_embedding(999)[i]
                   for i, c in enumerate(classes["dog"])]

    ranked = zero_shot_classify(query_image, classes)
    print("  查询图像（接近 dog，即“狗”的类别原型）：")
    for name, score in ranked:
        print(f"    {name:6s}: {score:+.4f}")
    print(f"  排名第一的类别：{ranked[0][0]}")


def demo_prompt_ensemble() -> None:
    print("\n演示 4：提示词模板集成（prompt template ensemble）")
    print("-" * 60)
    templates = [
        "a photo of a {class}",
        "a picture of a {class}",
        "an image of a {class}",
    ]
    class_name = "golden retriever"
    ensemble_vec = [0.0] * 64
    count = 0
    for t in templates:
        prompt = t.format(**{"class": class_name})
        seed = sum(ord(c) for c in prompt)
        emb = make_fake_embedding(seed)
        for k in range(64):
            ensemble_vec[k] += emb[k]
        count += 1
    ensemble_vec = [x / count for x in ensemble_vec]
    print(f"  已集成 {count} 个提示词，目标类别为“{class_name}”")
    print(f"  前 6 个维度：{[round(x, 3) for x in ensemble_vec[:6]]}")
    print("  单一模板的噪声更大；模板集成在真实基准测试中可提高 1–3 个点。")


def main() -> None:
    print("=" * 60)
    print("CLIP / SigLIP 对比训练（阶段 12，第 02 课）")
    print("=" * 60)
    demo_infonce()
    demo_shuffled()
    demo_zero_shot()
    demo_prompt_ensemble()
    print("\n" + "=" * 60)
    print("要点")
    print("-" * 60)
    print("  · InfoNCE 同时对行和列施加损失（对称形式）")
    print("  · tau 越小 -> softmax 越尖锐 -> 对困难负例的区分压力越大")
    print("  · sigmoid 损失使各配对相互解耦 -> 分布式运行时不需要 all-gather")
    print("  · 零样本分类 = 在所有类别提示词上计算 argmax cos(image, prompt)")


if __name__ == "__main__":
    main()
