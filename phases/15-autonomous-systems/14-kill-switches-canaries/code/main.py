"""紧急停止开关、熔断器与金丝雀检测模拟器，仅使用 Python 标准库。

三类检测器分别用于人工紧急停止、连续相同工具调用，以及诱饵凭据路径的访问告警。
第 10 课的分类器、第 13 课的预算层与这些机制相互补充；本课聚焦可触发的告警边界。

译注：所谓“外部开关”只是同一 Python 进程里的字典，并没有权限隔离。
默认轨迹会先在第五次连续相同调用时 break，后面的金丝雀读取不会执行；
打开停止开关时又会立即结束。因此 main() 本身没有实际触发金丝雀示例。
熔断器在这里终止的是整条轨迹，未实现 half_open 恢复状态。金丝雀仅按路径匹配，
检测到后打印提示并继续，不读取真实凭据，也不能仅凭访问推断恶意意图。
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ---------- 模拟外部状态（代码未真正隔离写入权限） ----------

EXTERNAL_KILL_SWITCH = {"enabled": False}


# 预设的工作区诱饵凭据；仅为内存夹具，不是真实秘密。
CANARY_FILES = {
    "~/.env.canary": "AWS_SECRET_ACCESS_KEY=canary-xxxxxxxxxxxxxxxx",
    "~/notes/fake-credentials.txt": "token = 'canary-sk-ABC-NEVER-USE'",
}


# ---------- 熔断器 ----------

@dataclass
class CircuitBreaker:
    threshold: int = 5
    state: str = "closed"   # closed：闭合放行；open：断开阻止；half_open：半开（本例未实现）
    recent: list[str] = field(default_factory=list)

    def record(self, action_key: str) -> bool:
        """允许动作继续时返回 True；熔断器已断开或本次触发时返回 False。"""
        if self.state == "open":
            return False
        self.recent.append(action_key)
        if len(self.recent) >= self.threshold:
            tail = self.recent[-self.threshold:]
            if all(a == tail[0] for a in tail):
                self.state = "open"
                return False
        return True


# ---------- 金丝雀检测器 ----------

@dataclass
class Canary:
    triggered: list[tuple[int, str]] = field(default_factory=list)

    def check_read(self, turn: int, path: str) -> bool:
        if path in CANARY_FILES:
            self.triggered.append((turn, path))
            return True
        return False


# ---------- 执行动作轨迹的模拟 ----------

@dataclass
class Action:
    kind: str    # tool：工具动作；read：读取动作
    payload: str


def run_trajectory(traj: list[Action], kill_switch: dict) -> None:
    breaker = CircuitBreaker(threshold=5)
    canary = Canary()
    kill_fired = False
    breaker_fired = False

    for i, a in enumerate(traj, 1):
        # 检测器 1：紧急停止开关
        if kill_switch["enabled"]:
            print(f"  {i:>2}. [紧急停止已启用] 拒绝动作 {a.kind}:{a.payload}")
            kill_fired = True
            break

        # 检测器 2：熔断器
        allowed = breaker.record(f"{a.kind}:{a.payload}")
        if not allowed:
            print(f"  {i:>2}. [熔断器已断开] {a.kind}:{a.payload}  "
                  f"原因=连续五次相同调用")
            breaker_fired = True
            break

        # 检测器 3：金丝雀诱饵
        if a.kind == "read":
            hit = canary.check_read(i, a.payload)
            if hit:
                print(f"  {i:>2}. [金丝雀已触发] 读取 {a.payload!r}  "
                      f"-> 已发出模拟告警")
                continue

        print(f"  {i:>2}. 通过  {a.kind}:{a.payload}")

    print(f"  汇总：紧急停止触发={kill_fired}  熔断触发={breaker_fired}  "
          f"金丝雀命中数={len(canary.triggered)}")


def main() -> None:
    print("=" * 80)
    print("告警机制：紧急停止、熔断器、金丝雀（阶段 15，第 14 课）")
    print("=" * 80)

    traj = [
        Action("tool", "read:src/app.py"),
        Action("tool", "edit:src/app.py"),
        Action("tool", "read:logs/app.log"),   # 开始连续相同的读取动作
        Action("tool", "read:logs/app.log"),
        Action("tool", "read:logs/app.log"),
        Action("tool", "read:logs/app.log"),
        Action("tool", "read:logs/app.log"),   # 第五次相同动作 -> 触发熔断
        Action("read", "~/notes/checklist.md"),
        Action("read", "~/.env.canary"),       # 金丝雀路径；默认轨迹已在此前熔断，因此本行不会到达
    ]

    print("\n紧急停止开关关闭")
    print("-" * 80)
    run_trajectory(traj, EXTERNAL_KILL_SWITCH)

    print("\n紧急停止开关开启（模拟操作者切换）")
    print("-" * 80)
    EXTERNAL_KILL_SWITCH["enabled"] = True
    run_trajectory(traj, EXTERNAL_KILL_SWITCH)
    EXTERNAL_KILL_SWITCH["enabled"] = False

    print()
    print("=" * 80)
    print("要点：三类检测器分别针对不同失败情形")
    print("-" * 80)
    print("  紧急停止开关响应操作者，停止整条动作轨迹。")
    print("  熔断器由特定重复模式触发；本实现会终止当前整条轨迹。")
    print("  金丝雀可提示诱饵路径被访问，但不能直接证明访问意图。")
    print("  这些机制都不能单独识别语义层面的组合攻击（参见第 10 课）。")
    print("  第 17 课的硬性行为限制提供另一层约束，不构成完整安全保证。")


if __name__ == "__main__":
    main()
