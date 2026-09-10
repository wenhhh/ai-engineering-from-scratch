"""简化的视觉自回归（Visual Autoregressive，VAR）模型：在金字塔上预测下一个尺度。

使用 NumPy 对 docs/en.md 中描述的 VAR 机制进行最小实现，包含三个部分：

1. 面向微型 8×8“图像”的多尺度残差向量量化（residual VQ）分词器。
   图像来自一个小型图案库：纯色、渐变、圆环、棋盘格和十字。尺度 k 的词元
   编码尺度 1..k-1 留下的残差。解码器将各尺度的嵌入上采样后求和。
2. 以尺度为条件的下一尺度预测器（在小词表上运行的逻辑回归 / softmax 微型语言模型）。
   这里用各尺度的条件直方图近似“Transformer”；本课要演示的结构是
   按尺度顺序建立条件依赖，以及同一尺度内的并行预测，而非深层注意力。
3. 生成循环执行 K 次 Transformer 前向传播（每个尺度一次），并根据条件分布
   并行采样当前尺度的所有位置。将各尺度嵌入解码并求和，即可重建图像。

本示例旨在练习按尺度排序的训练数据、同尺度内的并行采样和残差 VQ 重建。
真实的 VAR 会用 Transformer 替换直方图，用图像数据集替换图案库；
围绕它们的执行框架（harness）保持不变。

仅依赖 Python 标准库和 NumPy。

运行：
    python main.py
"""

from __future__ import annotations

import numpy as np


IMG = 8
SCALES = (1, 2, 4, 8)
CODEBOOK = 16


def make_patterns(rng: np.random.Generator, n: int) -> np.ndarray:
    """从微型图案库中抽取 n 幅 8×8 灰度图案。"""
    out = np.zeros((n, IMG, IMG), dtype=np.float32)
    yy, xx = np.mgrid[0:IMG, 0:IMG].astype(np.float32)
    for i in range(n):
        kind = int(rng.integers(0, 5))
        if kind == 0:
            out[i] = rng.uniform(0.1, 0.9)
        elif kind == 1:
            out[i] = (xx + yy) / (2 * (IMG - 1))
        elif kind == 2:
            cx, cy = IMG / 2 - 0.5, IMG / 2 - 0.5
            r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
            out[i] = np.clip(1.0 - r / (IMG / 2), 0.0, 1.0)
        elif kind == 3:
            out[i] = ((xx.astype(int) + yy.astype(int)) % 2).astype(np.float32)
        else:
            mid = IMG // 2
            cross = ((xx == mid) | (yy == mid)).astype(np.float32)
            out[i] = cross * 0.9 + 0.05
    return out


def fit_codebook(samples: np.ndarray, k: int, iters: int = 30,
                 seed: int = 0) -> np.ndarray:
    """对标量样本执行 k-means，返回长度为 k 的码本（codebook）。"""
    rng = np.random.default_rng(seed)
    flat = samples.reshape(-1)
    if flat.size < k:
        raise ValueError(f"初始化码本至少需要 {k} 个样本，实际只有 {flat.size}")
    idx = rng.choice(flat.size, size=k, replace=False)
    centers = flat[idx].astype(np.float32)
    for _ in range(iters):
        dists = (flat[:, None] - centers[None, :]) ** 2
        assign = dists.argmin(axis=1)
        for j in range(k):
            mask = assign == j
            if mask.any():
                centers[j] = flat[mask].mean()
    return np.sort(centers)


def encode(values: np.ndarray, codebook: np.ndarray) -> np.ndarray:
    """将每个数值映射到最近的码字，返回整数词元。"""
    dists = (values[..., None] - codebook[None, None, :]) ** 2
    return dists.argmin(axis=-1).astype(np.int32)


def downsample(img: np.ndarray, target: int) -> np.ndarray:
    """通过平均池化，将 H×W 图像缩小到 target×target。"""
    h, w = img.shape
    if target == h:
        return img.copy()
    factor = h // target
    return img.reshape(target, factor, target, factor).mean(axis=(1, 3))


def upsample(grid: np.ndarray, target: int) -> np.ndarray:
    """通过最近邻上采样，将 H×W 网格放大到 target×target。"""
    h, w = grid.shape
    if target == h:
        return grid.copy()
    factor = target // h
    return grid.repeat(factor, axis=0).repeat(factor, axis=1)


def tokenize_multiscale(img: np.ndarray, codebooks: list[np.ndarray]
                        ) -> list[np.ndarray]:
    """残差 VQ：每个尺度对先前尺度尚未表示的部分进行词元化。"""
    residual = img.copy()
    tokens: list[np.ndarray] = []
    for scale, book in zip(SCALES, codebooks):
        coarse = downsample(residual, scale)
        tok = encode(coarse, book)
        recon = book[tok]
        residual = residual - upsample(recon, IMG)
        tokens.append(tok)
    return tokens


def detokenize_multiscale(tokens: list[np.ndarray],
                          codebooks: list[np.ndarray]) -> np.ndarray:
    """解码器：对各尺度的嵌入上采样后求和。"""
    out = np.zeros((IMG, IMG), dtype=np.float32)
    for tok, book, scale in zip(tokens, codebooks, SCALES):
        out = out + upsample(book[tok], IMG)
    return out


def train_codebooks(images: np.ndarray) -> list[np.ndarray]:
    """使用小型图像集中的残差，拟合各尺度的码本。"""
    residuals = images.copy()
    books: list[np.ndarray] = []
    for scale in SCALES:
        pooled = np.stack([downsample(r, scale) for r in residuals])
        book = fit_codebook(pooled, CODEBOOK)
        books.append(book)
        recon = np.stack([upsample(book[encode(p[None], book)[0]], IMG)
                          for p in pooled])
        residuals = residuals - recon
    return books


def context_key(prev_tokens: list[np.ndarray]) -> tuple:
    """将所有先前尺度的词元概括为可哈希的摘要。"""
    return tuple(int(t.mean() * 1000) for t in prev_tokens) if prev_tokens else ()


def fit_predictor(token_streams: list[list[np.ndarray]]
                  ) -> list[dict[tuple, np.ndarray]]:
    """每个尺度使用一个条件直方图，以先前尺度的摘要作为键。

    这里用它代替 Transformer：训练时，在尺度 1..k-1 的粗粒度摘要条件下，
    统计哪些词元出现在尺度 k。
    """
    predictors: list[dict[tuple, np.ndarray]] = [
        {} for _ in SCALES
    ]
    for stream in token_streams:
        for k in range(len(SCALES)):
            ctx = context_key(stream[:k])
            table = predictors[k].setdefault(ctx, np.ones(CODEBOOK,
                                                          dtype=np.float64))
            for tok in stream[k].reshape(-1):
                table[int(tok)] += 1.0
    for table in predictors:
        for key, counts in table.items():
            table[key] = counts / counts.sum()
    return predictors


def sample_categorical(probs: np.ndarray, rng: np.random.Generator) -> int:
    return int(rng.choice(len(probs), p=probs))


def generate(predictors: list[dict[tuple, np.ndarray]],
             codebooks: list[np.ndarray],
             rng: np.random.Generator) -> tuple[np.ndarray, list[np.ndarray]]:
    """生成一个 VAR 样本：执行 K 次前向传播，尺度内并行，尺度间保持因果顺序。"""
    drawn: list[np.ndarray] = []
    for k, scale in enumerate(SCALES):
        ctx = context_key(drawn[:k])
        table = predictors[k]
        probs = table.get(ctx)
        if probs is None:
            probs = np.ones(CODEBOOK) / CODEBOOK
        size = scale * scale
        flat = np.array([sample_categorical(probs, rng) for _ in range(size)],
                        dtype=np.int32)
        drawn.append(flat.reshape(scale, scale))
    image = detokenize_multiscale(drawn, codebooks)
    return image, drawn


def reconstruction_mse(images: np.ndarray,
                       codebooks: list[np.ndarray]) -> float:
    errs = []
    for img in images:
        toks = tokenize_multiscale(img, codebooks)
        recon = detokenize_multiscale(toks, codebooks)
        errs.append(float(np.mean((recon - img) ** 2)))
    return float(np.mean(errs))


def main() -> None:
    rng = np.random.default_rng(0)
    train_imgs = make_patterns(rng, 64)
    val_imgs = make_patterns(rng, 16)

    codebooks = train_codebooks(train_imgs)
    train_token_streams = [tokenize_multiscale(img, codebooks) for img in train_imgs]
    predictors = fit_predictor(train_token_streams)

    print(f"图像尺寸：{IMG}x{IMG}")
    print(f"尺度：{SCALES}")
    print(f"每个尺度的码本大小：{CODEBOOK}")
    print(f"训练集重建均方误差（MSE）：{reconstruction_mse(train_imgs, codebooks):.5f}")
    print(f"验证集重建均方误差（MSE）：{reconstruction_mse(val_imgs, codebooks):.5f}")

    print()
    print("生成：执行 4 次 Transformer 前向传播，同一尺度内所有位置并行")
    for trial in range(3):
        img, toks = generate(predictors, codebooks, rng)
        shapes = [t.shape for t in toks]
        print(f"  试验 {trial}：各尺度形状={shapes}  数值范围=[{img.min():.2f}, {img.max():.2f}]")

    print()
    print("按尺度排序的注意力检查：每个尺度 k 只能看到尺度 1..k-1")
    for k, scale in enumerate(SCALES):
        n_pos = scale * scale
        prior_seen = sum(s * s for s in SCALES[:k])
        print(f"  尺度 {k}（尺寸 {scale}x{scale}, {n_pos} 个词元）："
              f"关注之前的 {prior_seen} 个词元")


if __name__ == "__main__":
    main()
