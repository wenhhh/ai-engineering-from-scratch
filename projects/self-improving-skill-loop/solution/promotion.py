"""晋升之前要求独立门禁。

课程： projects/self-improving-skill-loop/stages/04-promotion/docs/en.md
实现为原创，采用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import hashlib
import json
from skill import evaluate


def gate(holdout, baseline, candidate, min_gain=0.05):
    if not holdout:
        raise ValueError("nonempty holdout required")
    if min_gain < 0:
        raise ValueError("nonnegative gain required")
    old, new = evaluate(holdout, baseline), evaluate(holdout, candidate)
    old_good = {r["id"] for r in old["rows"] if r["expected"] == r["predicted"]}
    new_bad = {r["id"] for r in new["errors"]}
    regressions = sorted(old_good & new_bad)
    gain = new["accuracy"] - old["accuracy"]
    digest = hashlib.sha256(json.dumps(candidate, sort_keys=True).encode()).hexdigest()
    return {
        "promote": gain >= min_gain and not regressions,
        "gain": gain,
        "regressions": regressions,
        "candidate_sha256": digest,
        "baseline": old["accuracy"],
        "candidate": new["accuracy"],
    }
