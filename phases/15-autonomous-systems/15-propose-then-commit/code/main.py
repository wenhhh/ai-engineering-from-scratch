"""先提议、后提交的人在回路（HITL）状态机，仅使用 Python 标准库。

四步流程：propose 保存带幂等键的提议；surface 展示意图、来源、影响范围和回滚方式；
commit 要求批准后执行；verify 检查动作是否已发生。三个演示分别覆盖正常审批、
重复提交，以及不经核对的“盖章式批准”与逐项确认清单的差别。

译注：实际后端只是 SIDE_EFFECTS 内存列表，verify 只检查列表中是否包含相同字符串，
没有读取真实资源。审批由代码传入布尔值，不验证操作者身份、理解程度或证据真实性。
执行动作与保存 committed 状态不是一个事务，二者之间崩溃可能导致重试重复执行；
已提交记录若被再次审批，也可能重置为 approved 后重复执行。JSON 存储未原子写入，
幂等键只含线程、动作和载荷，不含供审查的元数据。演示因此不是生产级审批服务。
原文关联到《欧盟人工智能法案》第 14 条；这里只保留其教学解读，不作合规结论。
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from dataclasses import dataclass, field


@dataclass
class Proposal:
    thread_id: str
    action: str
    payload: dict
    intent: str
    lineage: str
    blast_radius: str
    rollback: str

    def key(self) -> str:
        sig = json.dumps({"t": self.thread_id, "a": self.action,
                          "p": self.payload}, sort_keys=True)
        return hashlib.sha256(sig.encode()).hexdigest()[:16]


@dataclass
class Store:
    path: str

    def __post_init__(self) -> None:
        if not os.path.exists(self.path):
            with open(self.path, "w") as f:
                json.dump({}, f)

    def all(self) -> dict:
        with open(self.path) as f:
            return json.load(f)

    def save(self, key: str, record: dict) -> None:
        data = self.all()
        data[key] = record
        with open(self.path, "w") as f:
            json.dump(data, f)


# ---------- 已执行副作用的记录器（模拟后端） ----------

SIDE_EFFECTS: list[str] = []


def execute(proposal: Proposal) -> bool:
    SIDE_EFFECTS.append(f"{proposal.action}:{json.dumps(proposal.payload)}")
    return True


def verify(proposal: Proposal) -> bool:
    # 真实系统应重新读取目标资源；这里仅检索内存列表。
    needle = f"{proposal.action}:{json.dumps(proposal.payload)}"
    return needle in SIDE_EFFECTS


# ---------- 流程 ----------

def propose(store: Store, p: Proposal) -> str:
    k = p.key()
    existing = store.all().get(k)
    if existing:
        print(f"  [提议] 幂等命中：记录 {k} 已存在 "
              f"（状态={existing['status']})")
        return k
    record = {"status": "waiting", **vars(p)}
    store.save(k, record)
    print(f"  [提议] 记录 {k} 已保存，等待审查")
    return k


def surface(store: Store, k: str) -> None:
    r = store.all()[k]
    print(f"  [展示] 提议 {k}")
    # 使用 name 而不是 field，避免遮蔽 dataclasses.field；
    # 防止读者以后在下面新增数据类时触发 Ruff F402。
    for name in ("intent", "lineage", "blast_radius", "rollback"):
        print(f"    {name:<14} {r[name]}")


def rubber_stamp_approve(store: Store, k: str) -> bool:
    r = store.all()
    rec = r[k]
    rec["status"] = "approved"
    rec["ack_mode"] = "rubber_stamp"
    store.save(k, rec)
    print("  [审批：盖章式] 点击批准（未核对清单）")
    return True


def checklist_approve(store: Store, k: str,
                      understood: bool, verified: bool,
                      rollback_ready: bool) -> bool:
    if not (understood and verified and rollback_ready):
        print("  [审批：核对清单] 已拒绝（确认项不完整）")
        return False
    r = store.all()
    rec = r[k]
    rec["status"] = "approved"
    rec["ack_mode"] = "challenge_response"
    store.save(k, rec)
    print("  [审批：核对清单] 已批准（三项均确认）")
    return True


def commit(store: Store, k: str) -> bool:
    data = store.all()
    rec = data[k]
    if rec["status"] == "committed":
        print(f"  [提交] 幂等命中：{k} 已提交，不再执行")
        return True
    if rec["status"] != "approved":
        print(f"  [提交] 拒绝：{k} 状态={rec['status']}")
        return False
    p = Proposal(
        thread_id=rec["thread_id"], action=rec["action"],
        payload=rec["payload"], intent=rec["intent"],
        lineage=rec["lineage"], blast_radius=rec["blast_radius"],
        rollback=rec["rollback"],
    )
    execute(p)
    rec["status"] = "committed"
    store.save(k, rec)
    print(f"  [提交] 已执行；核验结果={verify(p)}")
    return True


# ---------- 演示 ----------

def main() -> None:
    print("=" * 80)
    print("先提议、后提交的人在回路流程（阶段 15，第 15 课）")
    print("=" * 80)
    tmp = tempfile.mkdtemp()
    store = Store(os.path.join(tmp, "proposals.json"))

    p = Proposal(
        thread_id="t-001",
        action="email.send",
        payload={"to": "team@example.com", "subject": "release"},
        intent="向团队邮件列表通知 v1.2 发布",
        lineage="发布说明页面 /releases/1.2",
        blast_radius="37 位收件人；误发可能造成对外声誉影响",
        rollback="无法直接撤销发送；后续发送更正邮件",
    )

    print("\n演示 1：正常审批流程（逐项提问与确认）")
    print("-" * 80)
    k = propose(store, p)
    surface(store, k)
    checklist_approve(store, k, understood=True, verified=True, rollback_ready=True)
    commit(store, k)

    print("\n演示 2：提交完成后重试；幂等记录阻止重复执行")
    print("-" * 80)
    initial = len(SIDE_EFFECTS)
    commit(store, k)  # 重试
    commit(store, k)  # 重试
    print(f"  两次重试后的副作用总数：{len(SIDE_EFFECTS)} "
          f"（重试前为 {initial}）-> 本路径保持幂等")

    print("\n演示 3：盖章式审批与逐项确认的对照")
    print("-" * 80)
    p2 = Proposal(
        thread_id="t-002", action="db.update",
        payload={"row": 42, "col": "status", "val": "closed"},
        intent="关闭长期未更新的问题单",
        lineage="定期扫描长期未更新问题的仪表板",
        blast_radius="一条数据库记录；声称可在 1 小时备份窗口内恢复",
        rollback="从每夜备份恢复该记录",
    )
    k2 = propose(store, p2)
    rubber_stamp_approve(store, k2)
    commit(store, k2)

    p3 = Proposal(
        thread_id="t-003", action="db.drop_table",
        payload={"table": "old_users"},
        intent="删除未使用的数据表（依据清理操作手册）",
        lineage="操作手册 #RB-17",
        blast_radius="破坏性操作；删除 42 万行；24 小时内无法恢复",
        rollback="从每周备份恢复；最多可能丢失 6 天数据",
    )
    k3 = propose(store, p3)
    # 审查者无法确认回滚已准备就绪，因此清单审批拒绝。
    ok = checklist_approve(store, k3, understood=True, verified=True,
                           rollback_ready=False)
    # 为了教学演示，对未获批准的提议仍调用 commit()，
    # 让日志显示：状态仍是 waiting 而不是 approved 时，
    # commit() 会拒绝执行。这里就是要看到
    # 这条拒绝日志，而不是隐藏预期失败。
    if not ok:
        commit(store, k3)

    print()
    print("=" * 80)
    print("要点：让结构化审查成为最容易遵循的路径")
    print("-" * 80)
    print("  幂等键在本例已记录 committed 的重试路径中避免重复执行。")
    print("  持久化可支持延迟审批，但本例没有过期控制或提交前重新验权。")
    print("  逐项提问与确认清单用于缓解机械批准风险。原文将其关联到")
    print("  《欧盟人工智能法案》第 14 条的人类监督要求；此处不是合规证明。")
    print("  提交后应核验真实资源，不能只因为执行函数返回，就认为动作已完成。")


if __name__ == "__main__":
    main()
