"""推测解码服务器：草稿生成／验证调度器骨架。

草稿模型提出 k 个候选词元，目标模型验证候选前缀，调度器提交接受的词元，
再从目标分布采样下一个词元。本例使用合成概率，便于观察接受／拒绝流程与调用计数。

运行：python main.py

译注：这不是保持目标采样分布不变的完整推测解码算法。接受规则只是目标概率
不低于该位置最大概率的一半，没有草稿／目标概率比与拒绝后的残差分布校正。
草稿直接读取目标分布；所谓批量验证仅计作一次调用，没有真实模型或 GPU 批处理。
上下文只按位置递增，不由已生成的词元决定；baseline 也是采样而非贪心解码。
speedup 是目标调用次数之比，未计草稿成本、批量验证时间或实际吞吐。
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# 合成模型：小词表上的概率分布
# ---------------------------------------------------------------------------

VOCAB = list("abcdefghij")


def softmax_from(seed: int) -> list[float]:
    rnd = random.Random(seed)
    weights = [rnd.random() for _ in VOCAB]
    total = sum(weights)
    return [w / total for w in weights]


def sample(dist: list[float], rng: random.Random) -> int:
    r = rng.random()
    acc = 0.0
    for i, p in enumerate(dist):
        acc += p
        if r <= acc:
            return i
    return len(dist) - 1


# ---------------------------------------------------------------------------
# 目标模型：在模拟中被视为开销较大的模型，希望减少其调用次数
# ---------------------------------------------------------------------------

@dataclass
class TargetModel:
    calls: int = 0
    tokens_verified: int = 0

    def distribution(self, ctx_seed: int) -> list[float]:
        return softmax_from(ctx_seed * 7 + 13)

    def verify(self, draft_tokens: list[int], ctx_seed: int,
               rng: random.Random) -> tuple[list[int], int]:
        """返回 (accepted_tokens, resampled_next)，即接受的前缀与新采样词元。
        将整批验证计作一次目标调用：逐位置查看目标概率，遇到第一次拒绝即停止。
        本例只模拟调用计数，不执行真实批量推理。"""
        self.calls += 1
        self.tokens_verified += len(draft_tokens) + 1
        accepted: list[int] = []
        for pos, tok in enumerate(draft_tokens):
            dist = self.distribution(ctx_seed + pos)
            # 简化接受条件：此词元的目标概率 >= 0.5 × 该位置的最大概率
            if dist[tok] >= 0.5 * max(dist):
                accepted.append(tok)
            else:
                break
        # 在接受前缀后的下一个位置，从目标分布重新采样一个词元
        ctx = ctx_seed + len(accepted)
        dist = self.distribution(ctx)
        next_tok = sample(dist, rng)
        return accepted, next_tok


# ---------------------------------------------------------------------------
# 草稿模型：模拟较低成本、与目标偏好较一致的模型
# ---------------------------------------------------------------------------

@dataclass
class DraftModel:
    calls: int = 0
    alignment: float = 0.80     # 草稿选择目标分布最大概率词元的概率

    def propose(self, ctx_seed: int, k: int, rng: random.Random,
                target: TargetModel) -> list[int]:
        self.calls += 1
        draft_tokens: list[int] = []
        for pos in range(k):
            dist = target.distribution(ctx_seed + pos)
            # 以 alignment 的概率选择目标最优词元，否则从完整目标分布采样
            if rng.random() < self.alignment:
                draft_tokens.append(max(range(len(dist)), key=lambda i: dist[i]))
            else:
                draft_tokens.append(sample(dist, rng))
        return draft_tokens


# ---------------------------------------------------------------------------
# 解码调度器：推测循环与逐词元采样基线（原例并非贪心解码）
# ---------------------------------------------------------------------------

@dataclass
class Metrics:
    generated: int = 0
    target_calls: int = 0
    draft_calls: int = 0
    accepted_sum: int = 0

    def acceptance_rate(self, k: int) -> float:
        if self.target_calls == 0:
            return 0.0
        return self.accepted_sum / (self.target_calls * k)

    def tokens_per_target_call(self) -> float:
        return self.generated / max(1, self.target_calls)


def speculative_decode(n_tokens: int, k: int, rng: random.Random,
                       target: TargetModel, draft: DraftModel) -> Metrics:
    m = Metrics()
    ctx_seed = 1
    while m.generated < n_tokens:
        draft_tokens = draft.propose(ctx_seed, k, rng, target)
        m.draft_calls += 1
        accepted, next_tok = target.verify(draft_tokens, ctx_seed, rng)
        m.target_calls += 1
        m.accepted_sum += len(accepted)
        for tok in accepted:
            m.generated += 1
            ctx_seed += 1
            if m.generated >= n_tokens:
                break
        if m.generated < n_tokens:
            m.generated += 1     # 为重新采样的 next_tok 计数
            ctx_seed += 1
    return m


def baseline_decode(n_tokens: int, rng: random.Random,
                    target: TargetModel) -> Metrics:
    m = Metrics()
    ctx_seed = 1
    while m.generated < n_tokens:
        target.calls += 1
        m.target_calls += 1
        dist = target.distribution(ctx_seed)
        _ = sample(dist, rng)
        m.generated += 1
        ctx_seed += 1
    return m


# ---------------------------------------------------------------------------
# 参数扫描：比较不同 k 与草稿一致性下的目标调用次数比
# ---------------------------------------------------------------------------

def main() -> None:
    n_tokens = 500
    print(f"=== 生成 {n_tokens} 个词元：比较逐词元基线与推测解码 ===")

    target = TargetModel()
    rng = random.Random(7)
    base = baseline_decode(n_tokens, rng, target)
    print(f"基线：{base.target_calls} 次目标调用，"
          f"{base.tokens_per_target_call():.2f} 个词元／目标调用")

    for alignment in (0.60, 0.75, 0.90):
        for k in (2, 4, 6):
            target = TargetModel()
            draft = DraftModel(alignment=alignment)
            rng = random.Random(7)
            m = speculative_decode(n_tokens, k, rng, target, draft)
            speedup = base.target_calls / max(1, m.target_calls)
            print(f"  一致性={alignment:.2f} k={k}  "
                  f"目标调用次数={m.target_calls:3d}  "
                  f"接受率={m.acceptance_rate(k):.2f}  "
                  f"词元／目标调用={m.tokens_per_target_call():.2f}  "
                  f"目标调用次数比={speedup:.2f}x")


if __name__ == "__main__":
    main()
