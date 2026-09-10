"""AI Scientist v2 研究循环模拟器，仅使用 Python 标准库。

将研究循环建模为状态机，为各阶段设置可调的失败概率，多次试验后报告结果分布，
尤其关注“论文呈现完善，但实验或新颖性存在缺陷”的类别。原文称部分参数参考
Beel 等人（2025）的研究；本例并不是该研究的可复现统计分析，本轮未重新核验来源。

译注：重试恢复后的实验被模型一律标为仍有缺陷，这是一项建模假设。
polished_hides_weakness 虽然会被计算，却不参与后续审稿判定；因此输出不能证明
美化导致了缺陷论文被接收。该参数还会影响随机数的消耗顺序，不能简单用相同种子的
两次输出差异推断因果。experiment/writeup/internal_review 为中止阶段标签，
分别表示实验、写作和内部审稿，保留以维持结果结构。
"""

from __future__ import annotations

import argparse
import random
from dataclasses import dataclass


DEFAULT_SEED = 42


@dataclass
class LoopConfig:
    # 本无新意的想法被误标为有新意的概率。
    novelty_mislabel: float = 0.25
    # 实验因编码错误失败的概率（原文引述 Beel 等人约为 0.42，未在本轮核验）。
    experiment_failure: float = 0.42
    # 失败实验中，可以通过重试恢复的比例。
    retry_recovery: float = 0.55
    # 即使底层实验有问题，视觉语言模型的图表评议仍能产生
    # 看起来完善的图表的概率。
    polish_masks_weakness: float = 0.70
    # 自动写作阶段依据可能有缺陷的实验数据，
    # 产出行文连贯论文的概率。
    writeup_success: float = 0.85
    # 内部审稿人接收论文的概率（弱审查者）。
    internal_review_accept: float = 0.50


@dataclass
class Outcome:
    submitted: bool
    has_novelty_flaw: bool
    has_experiment_flaw: bool
    polished_but_flawed: bool
    polished_ok: bool
    abandoned_stage: str


def run_one(cfg: LoopConfig) -> Outcome:
    # 本玩具模型假定想法生成总能成功。
    has_novelty_flaw = random.random() < cfg.novelty_mislabel

    # 实验执行：失败概率与重试恢复概率。
    failed = random.random() < cfg.experiment_failure
    if failed:
        recovered = random.random() < cfg.retry_recovery
        if not recovered:
            return Outcome(
                submitted=False,
                has_novelty_flaw=has_novelty_flaw,
                has_experiment_flaw=True,
                polished_but_flawed=False,
                polished_ok=False,
                abandoned_stage="experiment",
            )
        # 建模假设：即使实验经重试恢复，仍残留缺陷，
        # 例如静默数值错误，或修补张量形状不匹配后
        # 没有重新验证。原文将这种残留缺陷视作可被
        # 后续美化掩盖的问题，也是“呈现完善但有缺陷”
        # 这一结果类别的主要来源。
        has_experiment_flaw = True
    else:
        has_experiment_flaw = False

    # 视觉语言模型的图表美化；此布尔结果不参与下游接收判定。
    polished_hides_weakness = (
        has_experiment_flaw and random.random() < cfg.polish_masks_weakness
    )

    # 论文写作阶段。
    if random.random() > cfg.writeup_success:
        return Outcome(
            submitted=False,
            has_novelty_flaw=has_novelty_flaw,
            has_experiment_flaw=has_experiment_flaw,
            polished_but_flawed=False,
            polished_ok=False,
            abandoned_stage="writeup",
        )

    # 内部审稿阶段。
    if random.random() > cfg.internal_review_accept:
        return Outcome(
            submitted=False,
            has_novelty_flaw=has_novelty_flaw,
            has_experiment_flaw=has_experiment_flaw,
            polished_but_flawed=False,
            polished_ok=False,
            abandoned_stage="internal_review",
        )

    polished_ok = not has_experiment_flaw and not has_novelty_flaw
    # 任何存在缺陷但仍被提交的论文都计入 polished_but_flawed：
    # 无论美化阶段有没有掩盖缺陷，弱内部审查都让它通过了。
    # 这样两个类别恰好覆盖所有已提交论文：
    # polished_ok 数量 + polished_but_flawed 数量 == len(submitted)。
    polished_but_flawed = has_experiment_flaw or has_novelty_flaw
    return Outcome(
        submitted=True,
        has_novelty_flaw=has_novelty_flaw,
        has_experiment_flaw=has_experiment_flaw,
        polished_but_flawed=polished_but_flawed,
        polished_ok=polished_ok,
        abandoned_stage="",
    )


def report(n: int, cfg: LoopConfig) -> None:
    outs = [run_one(cfg) for _ in range(n)]

    submitted = [o for o in outs if o.submitted]
    abandoned = [o for o in outs if not o.submitted]
    polished_ok = [o for o in submitted if o.polished_ok]
    polished_but_flawed = [o for o in submitted if o.polished_but_flawed]

    print("  配置")
    print(f"    新颖性误标率      ：{cfg.novelty_mislabel:.2f}")
    print(f"    实验失败率        ：{cfg.experiment_failure:.2f}")
    print(f"    重试恢复比例      ：{cfg.retry_recovery:.2f}")
    print(f"    美化掩盖缺陷的概率：{cfg.polish_masks_weakness:.2f}")
    print(f"    写作成功率        ：{cfg.writeup_success:.2f}")
    print(f"    内部审稿接收概率  ：{cfg.internal_review_accept:.2f}")

    print()
    print(f"  试验次数：{n}")
    print(f"  已提交  ：{len(submitted)} ({len(submitted) / n:.1%})")
    print(f"  已中止  ：{len(abandoned)} ({len(abandoned) / n:.1%})")
    by_stage = {}
    for o in abandoned:
        by_stage[o.abandoned_stage] = by_stage.get(o.abandoned_stage, 0) + 1
    for stage, count in sorted(by_stage.items()):
        print(f"    中止于 {stage:<18}: {count}")

    print()
    print("  已提交论文的质量分布")
    print(f"    无缺陷（有新意且有效）：{len(polished_ok)} "
          f"({len(polished_ok) / n:.1%}，占全部试验；"
          f"{len(polished_ok) / max(1, len(submitted)):.1%}，占已提交论文）")
    print(f"    呈现完善但存在缺陷    ：{len(polished_but_flawed)} "
          f"({len(polished_but_flawed) / n:.1%}，占全部试验；"
          f"{len(polished_but_flawed) / max(1, len(submitted)):.1%}，占已提交论文）")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--experiment-failure", type=float, default=None,
                        help="覆盖基准运行的 LoopConfig.experiment_failure 参数")
    parser.add_argument("--novelty-mislabel", type=float, default=None,
                        help="覆盖基准运行的 LoopConfig.novelty_mislabel 参数")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED,
                        help="随机数种子（默认值：%(default)s）")
    args = parser.parse_args()

    random.seed(args.seed)
    print("=" * 70)
    print("AI Scientist v2 循环模拟器（阶段 15，第 5 课）")
    print("=" * 70)

    overrides = {}
    if args.experiment_failure is not None:
        overrides["experiment_failure"] = args.experiment_failure
    if args.novelty_mislabel is not None:
        overrides["novelty_mislabel"] = args.novelty_mislabel
    baseline_cfg = LoopConfig(**overrides)

    label = "基准情形（原文参考 Beel 研究设定的参数）" if not overrides else "基准情形（已覆盖参数）"
    print(f"\n{label}")
    print("-" * 70)
    report(1000, baseline_cfg)

    print("\n乐观情形（采用更有利的参数）")
    print("-" * 70)
    report(1000, LoopConfig(
        novelty_mislabel=0.10,
        experiment_failure=0.20,
        retry_recovery=0.80,
        polish_masks_weakness=0.40,
        writeup_success=0.92,
        internal_review_accept=0.60,
    ))

    print()
    print("=" * 70)
    print("要点：提交论文的数量不等于可靠研究的数量")
    print("-" * 70)
    print("  即使采用乐观参数，也可能有不可忽略的已提交论文仍存在缺陷。")
    print("  本例演示这种质量分布，但没有建模美化对审稿决定的因果作用。")
    print("  应当区分“呈现质量”与“研究质量”；在自动循环与正式投稿")
    print("  之间，仍需要真实的质量复核与人工审批。")


if __name__ == "__main__":
    main()
