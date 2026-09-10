"""自动化对齐研究（AAR）论坛模拟器，仅使用 Python 标准库。

模拟三位自动化对齐研究者在两种工作方式下处理任务：人类预定的固定流程，
或自由拆解。结果写入一个带哈希链的论坛。一位研究者的某条结果被悄悄改高，
随后校验哈希链以发现该次修改。

译注：实现通过普通 for 循环顺序生成随机分数，并没有并行执行研究、创建沙箱、
写入外部只追加存储或建立备份。哈希链可以发现未同步重算摘要的改动，但如果攻击者
可改写全部记录与链头，它本身不构成不可伪造的证据。输出中的“沙箱外备份”是设计
建议，而非本例已经实现的能力。任务名、研究者 ID、fixed/free 标签参与哈希，保留原值。
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field


@dataclass
class ForumRecord:
    author: str
    task: str
    regime: str
    result: float
    prev_hash: str
    my_hash: str = ""


@dataclass
class Forum:
    records: list[ForumRecord] = field(default_factory=list)
    genesis: str = "0" * 16

    def head(self) -> str:
        return self.records[-1].my_hash if self.records else self.genesis

    def post(self, rec: ForumRecord) -> None:
        rec.prev_hash = self.head()
        payload = (f"{rec.author}|{rec.task}|{rec.regime}|"
                   f"{rec.result:.3f}|{rec.prev_hash}")
        rec.my_hash = hashlib.sha256(payload.encode()).hexdigest()[:16]
        self.records.append(rec)

    def verify(self) -> list[int]:
        """返回校验失败记录的下标。"""
        bad = []
        prev = self.genesis
        for i, r in enumerate(self.records):
            payload = (f"{r.author}|{r.task}|{r.regime}|"
                       f"{r.result:.3f}|{prev}")
            expected = hashlib.sha256(payload.encode()).hexdigest()[:16]
            if expected != r.my_hash or r.prev_hash != prev:
                bad.append(i)
            prev = r.my_hash
        return bad


TASKS = [
    # 弱到强蒸馏；任务 ID 参与日志哈希，保留英文。
    ("weak-to-strong-distill", 0.40),
    # 奖励模型诊断。
    ("reward-model-diagnosis", 0.30),
    # 上下文内安全探测。
    ("in-context-safety-probe", 0.50),
    # RLHF 超参数扫描。
    ("RLHF-hyperparam-sweep", 0.45),
    # 伪装对齐检测器。
    ("alignment-faking-detector", 0.25),
]


def solve(agent: str, task: tuple[str, float], regime: str) -> float:
    _name, base = task
    if regime == "fixed":
        # 预定流程：收益有明确上界，方差较低。
        return base + random.random() * 0.25
    # 自由拆解：分布尾部更宽，有时明显更好，有时更差。
    return base + random.gauss(0.15, 0.22)


def run_regime(regime: str) -> list[ForumRecord]:
    forum = Forum()
    agents = ["AAR-A", "AAR-B", "AAR-C"]
    for task in TASKS:
        for agent in agents:
            r = solve(agent, task, regime)
            forum.post(ForumRecord(
                author=agent,
                task=task[0],
                regime=regime,
                result=r,
                prev_hash="",
            ))
    return forum.records


def attempt_tamper(forum_records: list[ForumRecord]) -> Forum:
    """从记录重建论坛，然后模拟一次静默篡改。"""
    f = Forum()
    for r in forum_records:
        f.post(ForumRecord(
            author=r.author, task=r.task, regime=r.regime,
            result=r.result, prev_hash="",
        ))
    # 选择 AAR-A 得分最低的记录进行篡改。
    worst_idx = -1
    worst_val = float("inf")
    for i, r in enumerate(f.records):
        if r.author == "AAR-A" and r.result < worst_val:
            worst_val = r.result
            worst_idx = i
    if worst_idx >= 0:
        # 静默修改：将智能体自己的得分改高，使结果显得更好。
        # 始终加上固定增量，不使用 max(..., 0.85)。
        # 后者在原分数已经高于阈值时不会产生任何变化，
        # 会使某些随机种子下的篡改检测演示失去前提，
        # 因为那时实际上没有发生修改。
        f.records[worst_idx].result = f.records[worst_idx].result + 0.5
    return f


def regime_report(regime: str) -> None:
    records = run_regime(regime)
    by_task: dict[str, list[float]] = {}
    for r in records:
        by_task.setdefault(r.task, []).append(r.result)
    print(f"\n工作方式：{regime}")
    print(f"  {'任务':<32}  {'均值':>8}  {'最大值':>8}  {'最小值':>8}")
    means = []
    for task, values in by_task.items():
        mean = sum(values) / len(values)
        means.append(mean)
        print(f"  {task:<32}  {mean:>8.3f}  {max(values):>8.3f}  {min(values):>8.3f}")
    print(f"  所有任务的平均值：{sum(means) / len(means):.3f}")


def tamper_demo() -> None:
    print("\n日志篡改检测")
    print("-" * 70)
    baseline = run_regime("free")
    # attempt_tamper() 只执行一次静默修改，将 AAR-A 的最低得分提高。
    # 仅保留这一次篡改，使 verify() 返回的异常下标
    # 在固定随机种子下可确定、可复现。
    tampered = attempt_tamper(baseline)
    bad = tampered.verify()
    print(f"  verify() 标记了 {len(bad)} 条校验失败记录 "
          f"，下标为 {bad}")
    print("  被改动记录的内容与所存摘要不再一致。")
    print("  设计上还需与可信的沙箱外备份交叉核对；本例未实现备份。")


def main() -> None:
    random.seed(3)
    print("=" * 70)
    print("自动化对齐研究论坛（阶段 15，第 6 课）")
    print("=" * 70)

    regime_report("fixed")
    regime_report("free")

    print("\nfixed（固定流程）与 free（自由拆解）：前者方差较低，后者上行空间更大")
    tamper_demo()

    print()
    print("=" * 70)
    print("要点：可信的沙箱外日志 + 自由拆解 + 人工审查")
    print("-" * 70)
    print("  自由拆解可能提高自动化研究的能力上限，也增加审计工作。")
    print("  可验证的防篡改日志为审计提供依据，但发布决定仍应由")
    print("  审查者作出。自动化可以压缩研究流程中间环节的工作，")
    print("  不能据此省去问题定义和最终审查。")


if __name__ == "__main__":
    main()
