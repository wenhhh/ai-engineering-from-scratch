"""带检查点、幂等键、前置条件、事后核验和回滚的工作流。

模拟四种情况：正常运行；执行后崩溃再重试；前置条件失败而不执行；核验失败后回滚。

译注：DB 只是进程内字典，不会随检查点一起持久化。检查点采用临时文件、文件刷盘、
原子替换，但未处理并发写入，也没有同步目录元数据。代码在转账前就写下 committed：
若此后、转账前崩溃，重试会跳过尚未发生的转账；若进程重启导致内存 DB 丢失，
持久化检查点也可能与目标状态不一致。这里的重试安全只覆盖选定的单进程演示路径。
原文对《欧盟人工智能法案》第 14 条的关联属于教学解读，不是本轮核验的合规判断。
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from dataclasses import dataclass


# ---------- 微型内存数据库 ----------

DB = {"balance_A": 1500, "balance_B": 200, "last_transfer_id": None}


def persist_transfer(txid: str, from_acct: str, to_acct: str, amount: int) -> None:
    DB[f"balance_{from_acct}"] -= amount
    DB[f"balance_{to_acct}"] += amount
    DB["last_transfer_id"] = txid


def rollback_transfer(txid: str, from_acct: str, to_acct: str, amount: int,
                      prior_last_transfer_id: str | None) -> None:
    # 补偿事务：恢复账户余额，以及先前的转账 ID。
    DB[f"balance_{from_acct}"] += amount
    DB[f"balance_{to_acct}"] -= amount
    DB["last_transfer_id"] = prior_last_transfer_id


# ---------- 检查点存储 ----------

@dataclass
class Checkpoint:
    path: str

    def __post_init__(self) -> None:
        if not os.path.exists(self.path):
            with open(self.path, "w") as f:
                json.dump({}, f)

    def load(self) -> dict:
        with open(self.path) as f:
            return json.load(f)

    def save(self, k: str, v: dict) -> None:
        # 原子写入：先序列化到同目录临时文件，fsync 刷盘后
        # 再替换目标文件。若进程在临时文件写入期间崩溃，
        # 原文件仍保留，后续重试可读取先前的幂等记录，
        # 而不是被截断的 JSON。此处未实现并发事务或目录刷盘。
        data = self.load()
        data[k] = v
        tmp_path = f"{self.path}.tmp"
        with open(tmp_path, "w") as f:
            json.dump(data, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, self.path)


# ---------- 工作流 ----------

def key(txid: str) -> str:
    return hashlib.sha256(txid.encode()).hexdigest()[:12]


def run_transfer(cp: Checkpoint, txid: str, from_acct: str, to_acct: str,
                 amount: int, min_balance: int,
                 inject_crash_after_execute: bool = False,
                 inject_verify_fail: bool = False) -> str:
    k = key(txid)
    record = cp.load().get(k, {"status": "new"})

    # 对所有终态应用幂等处理。同一个 txid 在任何终态之后重试，
    # 包括 committed（已记提交）、verified（已核验）、rolled-back（已回滚）
    # 和 aborted-precondition（前置条件失败），都直接返回对应结果，
    # 不再执行转账。注意 committed 不保证真实转账已经发生。
    terminal_results = {
        "committed": "idempotent-skip",
        "verified": "ok",
        "rolled-back": "verify-fail-rolled-back",
        "aborted-precondition": "aborted-precondition",
    }
    if record["status"] in terminal_results:
        return terminal_results[record["status"]]

    # 前置条件：转出后余额必须仍然不低于 min_balance。
    if DB[f"balance_{from_acct}"] - amount < min_balance:
        cp.save(k, {"status": "aborted-precondition", "txid": txid})
        return "aborted-precondition"

    # 保存先前状态，使回滚能够恢复原状，而不只是反向增减余额。
    prior_last_transfer_id = DB["last_transfer_id"]

    # 在副作用之前记录意图。如果保存后、执行 persist_transfer 前崩溃，
    # 会遗留 committed 标记，重试检测到它后直接跳过。
    # 只有下面的事后读取确认副作用已落地，才将状态提升
    # 为 verified。未到这一步就崩溃时，仍存在状态缺口。
    #
    # 本课演示的持久性缺口：如果进程在 cp.save 之后、
    # persist_transfer 之前崩溃，重试会看到
    # status == "committed" 并返回 "idempotent-skip"，
    # 尽管转账根本没有执行。生产设计需要在真正的副作用边界
    # 使用幂等键，并让目标数据库以原子方式去重和更新；
    # 或在恢复时核对目标状态后再决定如何提交。
    # 原文也提出提交后的目标读取，但仅正常路径执行 verify
    # 并不足以修复崩溃路径；当前代码在看到 committed 时
    # 已提前返回，不会重新核验目标。
    cp.save(k, {"status": "committed", "txid": txid,
                "from_acct": from_acct, "to_acct": to_acct,
                "amount": amount,
                "prior_last_transfer_id": prior_last_transfer_id})
    persist_transfer(txid, from_acct, to_acct, amount)
    if inject_crash_after_execute:
        # 模拟在转账执行后崩溃；异常文本保持原值。
        raise RuntimeError("simulated crash after execute")

    # 执行后的核验
    if inject_verify_fail or DB["last_transfer_id"] != txid:
        rollback_transfer(txid, from_acct, to_acct, amount, prior_last_transfer_id)
        cp.save(k, {"status": "rolled-back", "txid": txid})
        return "verify-fail-rolled-back"

    cp.save(k, {"status": "verified", "txid": txid})
    return "ok"


# ---------- 演示入口 ----------

def main() -> None:
    print("=" * 80)
    print("检查点与回滚（阶段 15，第 16 课）")
    print("=" * 80)

    tmp = tempfile.mkdtemp()
    print()
    print("场景 1：正常运行")
    print("-" * 80)
    cp = Checkpoint(os.path.join(tmp, "cp1.json"))
    out = run_transfer(cp, "tx-001", "A", "B", 100, min_balance=200)
    print(f"  结果={out}  DB={DB}")

    print("\n场景 2：转账执行后崩溃并重试（幂等记录阻止重复执行）")
    print("-" * 80)
    cp = Checkpoint(os.path.join(tmp, "cp2.json"))
    try:
        run_transfer(cp, "tx-002", "A", "B", 100, min_balance=200,
                     inject_crash_after_execute=True)
    except RuntimeError as e:
        print(f"  崩溃：{e}")
    # 崩溃后重试
    out = run_transfer(cp, "tx-002", "A", "B", 100, min_balance=200)
    print(f"  重试结果={out}  DB={DB}")

    print("\n场景 3：前置条件失败（余额将低于下限）")
    print("-" * 80)
    cp = Checkpoint(os.path.join(tmp, "cp3.json"))
    out = run_transfer(cp, "tx-003", "A", "B", 10_000, min_balance=200)
    print(f"  结果={out}  DB={DB}")

    print("\n场景 4：核验失败 -> 回滚")
    print("-" * 80)
    cp = Checkpoint(os.path.join(tmp, "cp4.json"))
    balances_before = dict(DB)
    out = run_transfer(cp, "tx-004", "A", "B", 100, min_balance=200,
                       inject_verify_fail=True)
    balances_after = dict(DB)
    print(f"  结果={out}  前后状态完全一致="
          f"{balances_before == balances_after}")

    print()
    print("=" * 80)
    print("要点：幂等性 + 前置条件 + 核验 + 回滚")
    print("-" * 80)
    print("  需要四类机制配合，每一项针对不同的失败情形：")
    print("  幂等性 -> 在明确的故障边界内安全重试，不能忽略提交缺口")
    print("  前置条件 -> 检查审批与提交之间的状态漂移")
    print("  核验 -> 确认副作用确实发生，而不是只以为它已经发生")
    print("  回滚 -> 恢复已知错误状态，或明确告警")
    print("  原文对第 14 条的操作性解读：检查点可查询、回滚经过演练、")
    print("  审计记录跨部署保留；本例没有完整实现这些合规能力。")


if __name__ == "__main__":
    main()
