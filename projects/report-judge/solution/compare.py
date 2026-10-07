"""使用自助法区间比较配对版本

配套课程：projects/report-judge/stages/04-compare/docs/en.md
本原创实现使用明确的本地数据契约。通过 scripts/project_test.py 运行测试。
"""

import random


def compare(baseline, candidate, seed=7, samples=2000):
    if set(baseline) != set(candidate) or not baseline:
        raise ValueError("paired nonempty question ids required")
    if samples < 10:
        raise ValueError("at least ten resamples required")
    ids = sorted(baseline)
    delta = [candidate[k] - baseline[k] for k in ids]
    rng = random.Random(seed)
    means = sorted(
        sum(rng.choice(delta) for _ in delta) / len(delta) for _ in range(samples)
    )
    low, high = (
        means[int(0.025 * samples)],
        means[min(samples - 1, int(0.975 * samples))],
    )
    return {
        "mean_delta": sum(delta) / len(delta),
        "interval": [low, high],
        "regressions": [k for k in ids if candidate[k] < baseline[k]],
        "promote": low > 0 and all(d >= 0 for d in delta),
    }
