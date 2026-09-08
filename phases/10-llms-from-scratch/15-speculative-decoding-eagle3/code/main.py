"""带 N 词元草稿和 KV 回滚（Rollback）的推测解码（Speculative decoding，Leviathan 2023）。

实现完整的生产级推测解码循环:
  - 从 p 草拟 N 个词元（成本低）
  - 在 q 的一次并行前向传播中验证 N 个位置
  - 拒绝规则: 以 min(1, q(d)/p(d)) 的概率接受
  - 拒绝时进行残差采样（Residual sampling）: 重新归一化 (q - p)_+
  - 全部接受时生成额外词元（Bonus token）
  - 记录 KV 缓存回滚状态

仅使用标准库。数值与阶段 7 第 16 课的数学证明及阶段 10 第 12 课的运行说明
一致。本课将两者连接起来。
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import List


def sample(probs: List[float], rng: random.Random) -> int:
    u = rng.random()
    acc = 0.0
    for i, p in enumerate(probs):
        acc += p
        if u < acc:
            return i
    return len(probs) - 1


def residual(q: List[float], p: List[float]) -> List[float]:
    raw = [max(0.0, qi - pi) for qi, pi in zip(q, p)]
    s = sum(raw)
    if s == 0.0:
        return list(q)
    return [r / s for r in raw]


def kl(q: List[float], p: List[float]) -> float:
    total = 0.0
    for qi, pi in zip(q, p):
        if qi > 0 and pi > 0:
            total += qi * math.log(qi / pi)
    return total


@dataclass
class KVBuffer:
    """跟踪验证器（Verifier）的逻辑缓存长度。物理字节数仅作概念表示。"""
    length: int = 0

    def extend(self, n: int) -> None:
        self.length += n

    def truncate_to(self, n: int) -> None:
        self.length = n


def spec_step(q: List[float], p: List[float], N: int, kv: KVBuffer,
              rng: random.Random) -> tuple[List[int], int]:
    """执行一个推测步骤: 从 p 草拟 N 个词元，用 q 验证。

    返回 (tokens_emitted, verifier_forwards_used)。此处 verifier_forwards_used
    始终为 1，这正是关键。tokens_emitted 的数量在 1 到 N+1 之间。

    为便于教学，q 和 p 是各位置共享、与上下文无关的分布。数学原理可扩展到
    依赖位置的 q_i、p_i，无需改变循环。
    """
    prefix_len = kv.length
    drafts: List[int] = []
    p_probs: List[float] = []
    for _ in range(N):
        d = sample(p, rng)
        drafts.append(d)
        p_probs.append(p[d])

    emitted: List[int] = []
    for i, d in enumerate(drafts):
        u = rng.random()
        q_prob = q[d]
        p_prob = p_probs[i]
        ratio = q_prob / p_prob if p_prob > 0 else float("inf")
        if u < min(1.0, ratio):
            emitted.append(d)
            kv.extend(1)
        else:
            correction = sample(residual(q, p), rng)
            emitted.append(correction)
            kv.truncate_to(prefix_len + len(emitted))
            return emitted, 1

    bonus = sample(q, rng)
    emitted.append(bonus)
    kv.extend(1)
    return emitted, 1


def direct_sample(q: List[float], n: int, rng: random.Random) -> List[int]:
    return [sample(q, rng) for _ in range(n)]


def distribution_check(q: List[float], p: List[float], n_steps: int,
                       rng: random.Random) -> tuple[List[int], List[int]]:
    """检查发出的第一个词元（由 Leviathan 方法采样）是否服从 q 分布。
    接受时它是草稿词元；拒绝时它是残差修正词元。全部接受后追加的额外词元
    也服从 q，但属于第二次抽样，不应混入此处的统计。"""
    spec_counts = [0] * len(q)
    direct_counts = [0] * len(q)
    for _ in range(n_steps):
        kv = KVBuffer()
        tokens, _ = spec_step(q, p, N=1, kv=kv, rng=rng)
        spec_counts[tokens[0]] += 1
        direct_counts[sample(q, rng)] += 1
    return spec_counts, direct_counts


def chi_square(observed: List[int], expected: List[int]) -> float:
    total_obs = sum(observed)
    total_exp = sum(expected)
    if total_obs == 0 or total_exp == 0:
        return 0.0
    result = 0.0
    for o, e in zip(observed, expected):
        e_norm = e * total_obs / total_exp
        if e_norm > 0:
            result += (o - e_norm) ** 2 / e_norm
    return result


def measure_alpha(q: List[float], p: List[float], n_samples: int,
                  rng: random.Random) -> float:
    hits = 0
    for _ in range(n_samples):
        d = sample(p, rng)
        u = rng.random()
        q_prob = q[d]
        p_prob = p[d]
        if p_prob > 0 and u < min(1.0, q_prob / p_prob):
            hits += 1
    return hits / n_samples


def expected_tokens_per_verify(alpha: float, N: int) -> float:
    if alpha >= 1.0:
        return N + 1
    if alpha <= 0.0:
        return 1.0
    return (1.0 - alpha ** (N + 1)) / (1.0 - alpha)


def wall_time_per_token(alpha: float, N: int, c: float) -> float:
    """相对于验证器（成本 1.0），草稿每词元成本为 c。

    每次验证器调用的成本为 1.0，再加草稿成本 N * c。发出词元数的期望为
    (1 - alpha^(N+1)) / (1 - alpha)。
    """
    return (1.0 + N * c) / expected_tokens_per_verify(alpha, N)


def perturb(q: List[float], amount: float, rng: random.Random) -> List[float]:
    p = [max(1e-6, qi + amount * rng.gauss(0, 1)) for qi in q]
    s = sum(p)
    return [pi / s for pi in p]


def main() -> None:
    rng = random.Random(42)

    q = [0.30, 0.22, 0.15, 0.10, 0.08, 0.07, 0.05, 0.03]
    p_eagle3 = perturb(q, amount=0.005, rng=random.Random(1))
    p_eagle1 = perturb(q, amount=0.02, rng=random.Random(2))
    p_vanilla = perturb(q, amount=0.08, rng=random.Random(3))

    print("=" * 70)
    print("推测解码（Speculative Decoding）与 EAGLE-3（阶段 10，第 15 课）")
    print("=" * 70)
    print()
    print("验证器（Verifier）q:  " + " ".join(f"{qi:.3f}" for qi in q))
    print()

    print("-" * 70)
    print("步骤 1: Leviathan 分布等价性检查（Distribution-equivalence，N=1，50000 次试验）")
    print("-" * 70)
    spec_c, direct_c = distribution_check(q, p_eagle1, 50000, rng)
    chi = chi_square(spec_c, direct_c)
    print(f"  推测采样计数（spec）: {spec_c}")
    print(f"  直接采样计数（direct）: {direct_c}")
    print(f"  chi^2 = {chi:.2f}  (df={len(q) - 1}; 95% 临界值 ~14.07)")
    verdict = "PASS" if chi < 14.07 else "CHECK"
    print(f"  结论（Verdict）: {verdict}  （推测解码分布与验证器匹配）")
    print()

    print("-" * 70)
    print("步骤 2: 测量不同草稿质量下的接受率 alpha")
    print("-" * 70)
    print(f"  {'草稿（draft）':<12} {'KL(q||p)':>10} {'alpha':>8}")
    for name, p in [("vanilla", p_vanilla), ("eagle-1", p_eagle1),
                    ("eagle-3", p_eagle3)]:
        a = measure_alpha(q, p, 20000, random.Random(7))
        print(f"  {name:<12} {kl(q, p):>10.4f} {a:>8.3f}")
    print()

    print("-" * 70)
    print("步骤 3: 每次验证器调用的期望词元数（理论值）")
    print("-" * 70)
    Ns = [1, 3, 5, 7, 10]
    alphas = [0.55, 0.70, 0.80, 0.90, 0.95]
    print(f"  {'alpha':>6}  " + "".join(f"{f'N={N}':>8}" for N in Ns))
    for a in alphas:
        row = f"  {a:>6.2f}  " + "".join(
            f"{expected_tokens_per_verify(a, N):>8.2f}" for N in Ns
        )
        print(row)
    print()

    print("-" * 70)
    print("步骤 4: c=0.04 时每词元的实际耗时（EAGLE-3 级别草稿成本）")
    print("-" * 70)
    print(f"  {'alpha':>6}  " + "".join(f"{f'N={N}':>8}" for N in Ns))
    for a in alphas:
        row = f"  {a:>6.2f}  " + "".join(
            f"{wall_time_per_token(a, N, c=0.04):>8.3f}" for N in Ns
        )
        print(row)
    print("  （越低越快。无推测解码的基线 = 每词元 1.000）")
    print()

    print("-" * 70)
    print("步骤 5: 端到端模拟运行，N=5，draft=eagle-3，1000 轮")
    print("-" * 70)
    kv = KVBuffer()
    total_tokens = 0
    total_forwards = 0
    accepted_per_round: List[int] = []
    for _ in range(1000):
        tokens, forwards = spec_step(q, p_eagle3, N=5, kv=kv, rng=rng)
        total_tokens += len(tokens)
        total_forwards += forwards
        accepted_per_round.append(len(tokens))
    mean_tokens = total_tokens / 1000
    print(f"  发出词元总数 : {total_tokens}")
    print(f"  验证器前向传播次数 : {total_forwards}")
    print(f"  每次前向传播平均词元数: {mean_tokens:.2f}")
    print(f"  KV 逻辑长度 : {kv.length}   （跟踪已接受的前缀）")
    print(f"  alpha=0.95, N=5 时的期望值: "
          f"{expected_tokens_per_verify(0.95, 5):.2f}")
    print()

    print("要点: 在 N=5 时，EAGLE-3 级别的草稿质量（alpha~0.9）可让")
    print("          每次验证器前向传播生成 ~4-5 个词元。EAGLE-3 论文报告的 3-6.5x")
    print("          加速来自这一比率，再加上树搜索（Tree-search）和 TTT 的收益。")


if __name__ == "__main__":
    main()
