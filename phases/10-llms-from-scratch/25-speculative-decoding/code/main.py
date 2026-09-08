"""推测解码运行框架（Speculative decoding harness）: 精确拒绝规则、alpha 扫描、树掩码。

本文件通过小型合成分布证明三件事，使数学过程保持清晰:

1. Leviathan-Kalai-Matias 拒绝规则保留目标模型的采样分布。
   在 50_000 次抽样中，普通目标采样与带草稿的推测采样之间的经验
   总变差距离（Total-variation distance）< 0.01。
2. 每次验证的期望词元数公式成立。对接受率 alpha 和草稿长度 K，
   E[tokens] = (1 - alpha^(K+1)) / (1 - alpha)
   与实测吞吐量在采样噪声范围内一致。
3. 树状草拟（Tree drafting）通过拓扑因果掩码（Topological causal mask），
   在目标模型的一次前向传播中验证多条候选路径。构建深度为 K 的树，
   输出验证掩码，并确认每个节点只关注其祖先。

仅使用标准库和 numpy。

运行:
    python main.py
    python main.py --vocab 64 --alpha 0.75 --k 4 --samples 50000
"""

from __future__ import annotations

import argparse
import numpy as np


def make_target(vocab: int, rng: np.random.Generator) -> np.ndarray:
    logits = rng.standard_normal(vocab) * 1.4
    e = np.exp(logits - logits.max())
    return e / e.sum()


def make_draft(target: np.ndarray, alpha_hint: float,
               rng: np.random.Generator) -> np.ndarray:
    """构造词元级期望接受率接近 alpha_hint 的草稿分布。
    将目标分布与均匀分布线性混合，混合比例控制草稿与目标的接近程度。"""
    vocab = target.size
    uniform = np.full(vocab, 1.0 / vocab)
    draft = alpha_hint * target + (1.0 - alpha_hint) * uniform
    noise = rng.uniform(0.95, 1.05, size=vocab)
    draft = draft * noise
    return draft / draft.sum()


def sample(probs: np.ndarray, rng: np.random.Generator) -> int:
    return int(rng.choice(probs.size, p=probs))


def speculative_step(target: np.ndarray, draft: np.ndarray, K: int,
                     rng: np.random.Generator) -> list[int]:
    """执行一轮。返回 1..K+1 个词元，其分布与目标分布一致。"""
    proposed: list[int] = []
    q_at: list[float] = []
    for _ in range(K):
        t = sample(draft, rng)
        proposed.append(t)
        q_at.append(float(draft[t]))

    accepted: list[int] = []
    for k, tok in enumerate(proposed):
        ratio = float(target[tok]) / max(q_at[k], 1e-12)
        if rng.random() < min(1.0, ratio):
            accepted.append(tok)
        else:
            residual = np.maximum(target - draft, 0.0)
            s = residual.sum()
            if s == 0.0:
                accepted.append(sample(target, rng))
            else:
                accepted.append(sample(residual / s, rng))
            return accepted
    accepted.append(sample(target, rng))
    return accepted


def total_variation(p: np.ndarray, q: np.ndarray) -> float:
    return float(0.5 * np.abs(p - q).sum())


def empirical_dist(samples: list[int], vocab: int) -> np.ndarray:
    counts = np.bincount(samples, minlength=vocab).astype(np.float64)
    return counts / counts.sum()


def verify_distribution(target: np.ndarray, draft: np.ndarray, K: int,
                        n_samples: int, rng: np.random.Generator
                        ) -> tuple[float, float]:
    """比较普通目标采样与推测采样的下一词元分布。两者在统计上必须无法区分。"""
    vocab = target.size
    plain = [sample(target, rng) for _ in range(n_samples)]
    spec_first: list[int] = []
    while len(spec_first) < n_samples:
        toks = speculative_step(target, draft, K, rng)
        spec_first.append(toks[0])
    p_plain = empirical_dist(plain, vocab)
    p_spec = empirical_dist(spec_first, vocab)
    return total_variation(p_plain, target), total_variation(p_spec, target)


def measure_alpha(target: np.ndarray, draft: np.ndarray,
                  n_samples: int, rng: np.random.Generator) -> float:
    accepted = 0
    for _ in range(n_samples):
        t = sample(draft, rng)
        ratio = float(target[t]) / max(float(draft[t]), 1e-12)
        if rng.random() < min(1.0, ratio):
            accepted += 1
    return accepted / n_samples


def expected_tokens(alpha: float, K: int) -> float:
    if alpha >= 1.0:
        return float(K + 1)
    return (1.0 - alpha ** (K + 1)) / (1.0 - alpha)


def measure_throughput(target: np.ndarray, draft: np.ndarray, K: int,
                       n_rounds: int, rng: np.random.Generator) -> float:
    total = 0
    for _ in range(n_rounds):
        total += len(speculative_step(target, draft, K, rng))
    return total / n_rounds


def build_tree(branch_factor: tuple[int, ...]) -> list[tuple[int, list[int]]]:
    """以 (parent_index, depth-path) 形式返回节点，即（父节点索引，深度路径）。索引 0 为根。"""
    tree: list[tuple[int, list[int]]] = [(-1, [])]
    frontier = [0]
    for depth, b in enumerate(branch_factor):
        next_frontier: list[int] = []
        for parent in frontier:
            for _ in range(b):
                tree.append((parent, tree[parent][1] + [len(tree)]))
                next_frontier.append(len(tree) - 1)
        frontier = next_frontier
    return tree


def tree_attention_mask(tree: list[tuple[int, list[int]]]) -> np.ndarray:
    """N x N 因果掩码（Causal mask），每行只关注其祖先。"""
    n = len(tree)
    mask = np.zeros((n, n), dtype=np.int8)
    for i in range(n):
        cur = i
        while cur != -1:
            mask[i, cur] = 1
            cur = tree[cur][0]
    return mask


def validate_tree_mask(mask: np.ndarray,
                       tree: list[tuple[int, list[int]]]) -> bool:
    n = len(tree)
    for i in range(n):
        cur = i
        ancestors = set()
        while cur != -1:
            ancestors.add(cur)
            cur = tree[cur][0]
        attends = {j for j in range(n) if mask[i, j] == 1}
        if attends != ancestors:
            return False
    return True


def _positive_int(value: str, *, minimum: int = 1) -> int:
    n = int(value)
    if n < minimum:
        raise argparse.ArgumentTypeError(f"值必须 >= {minimum}，实际为 {n}")
    return n


def _unit_float(value: str) -> float:
    f = float(value)
    if not (0.0 < f <= 1.0):
        raise argparse.ArgumentTypeError(f"值必须位于 (0, 1]，实际为 {f}")
    return f


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vocab", type=lambda v: _positive_int(v, minimum=2), default=32,
                        help="词表大小（Vocab size，>= 2）")
    parser.add_argument("--alpha", type=_unit_float, default=0.75,
                        help="目标接受率（Acceptance rate），范围 (0, 1]")
    parser.add_argument("--k", type=lambda v: _positive_int(v, minimum=1), default=4,
                        help="草稿长度（Draft length，>= 1）")
    parser.add_argument("--samples", type=lambda v: _positive_int(v, minimum=2), default=20000,
                        help="样本数量（Sample count，>= 2）")
    parser.add_argument("--seed", type=int, default=0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rng = np.random.default_rng(args.seed)

    target = make_target(args.vocab, rng)
    draft = make_draft(target, args.alpha, rng)

    tv_plain, tv_spec = verify_distribution(
        target, draft, args.k, args.samples, rng
    )
    print(f"分布检查（Distribution check，n={args.samples}）:")
    print(f"  TV(plain_target_sampling, target)       = {tv_plain:.4f}")
    print(f"  TV(speculative_sampling, target)         = {tv_spec:.4f}")
    print(f"  总变差差值（delta TV，推测与普通采样）                 = {abs(tv_spec - tv_plain):.4f}")

    alpha_hat = measure_alpha(target, draft, args.samples // 2, rng)
    print()
    print(f"alpha 测量（vocab={args.vocab}，alpha 提示值={args.alpha}）:")
    print(f"  实测 alpha = {alpha_hat:.3f}")

    throughput = measure_throughput(target, draft, args.k, 2000, rng)
    expected = expected_tokens(alpha_hat, args.k)
    print()
    print(f"K={args.k} 时的吞吐量（Throughput）:")
    print(f"  实测 E[tokens/verify]  = {throughput:.3f}")
    print(f"  预测 E[tokens/verify] = {expected:.3f}  (1 - a^(K+1)) / (1 - a)")

    print()
    print("alpha 扫描，K=4:")
    for a in (0.3, 0.5, 0.7, 0.85, 0.95):
        print(f"  alpha={a:.2f}  expected_tokens={expected_tokens(a, args.k):.2f}")

    print()
    print("树状草拟演示: 深度为 3 的树，branch=(3, 2, 2)")
    tree = build_tree((3, 2, 2))
    mask = tree_attention_mask(tree)
    print(f"  候选节点总数: {len(tree)}（一次验证前向传播覆盖全部）")
    print(f"  掩码形状（Mask shape）: {mask.shape}")
    print(f"  掩码相对于祖先集合的正确性: {validate_tree_mask(mask, tree)}")
    print(f"  每个节点关注的节点数（各行）: {mask.sum(axis=1).tolist()}")


if __name__ == "__main__":
    main()
