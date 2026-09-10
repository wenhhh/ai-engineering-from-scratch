"""简化的网页智能体评测框架：按执行结果评测，并衡量行动轨迹的步数效率。

模拟一个最小购物应用，为三个任务指定参考轨迹步数；脚本式智能体逐个尝试任务，
记录是否成功，以及相对于参考步数的倍率，借此说明 OSWorld-Human 风格的效率分析。

译注：没有真实网页、浏览器或官方基准数据。gold_steps 是手工设定的参考步数，
trace 中的每条记录都计作一步，包括改选商品的记录；倍率越低表示使用的步骤越少。
购物数据、动作日志和错误消息保留英文；unknown sku 表示未知商品编号，
not in cart 表示商品不在购物车中，empty cart 表示购物车为空。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


class ShoppingApp:
    def __init__(self) -> None:
        self.items = {
            "sku-001": {"name": "headphones", "price": 199},
            "sku-002": {"name": "keyboard", "price": 129},
            "sku-003": {"name": "mouse", "price": 59},
        }
        self.cart: dict[str, int] = {}
        self.orders: list[dict[str, Any]] = []

    def list_items(self) -> list[dict[str, Any]]:
        return [{"sku": sku, **meta} for sku, meta in self.items.items()]

    def add_to_cart(self, sku: str, qty: int = 1) -> str:
        if sku not in self.items:
            return "error: unknown sku"
        self.cart[sku] = self.cart.get(sku, 0) + qty
        return f"added {qty} x {sku}"

    def remove_from_cart(self, sku: str) -> str:
        if sku not in self.cart:
            return "error: not in cart"
        del self.cart[sku]
        return f"removed {sku}"

    def checkout(self) -> str:
        if not self.cart:
            return "error: empty cart"
        total = sum(self.items[sku]["price"] * qty
                    for sku, qty in self.cart.items())
        oid = f"ord-{len(self.orders) + 1:03d}"
        self.orders.append({"oid": oid, "items": dict(self.cart), "total": total})
        self.cart = {}
        return oid


@dataclass
class Task:
    tid: str
    description: str
    agent: Callable[[ShoppingApp], list[str]]
    gold_steps: int
    success: Callable[[ShoppingApp], bool]


def _agent_task_1(app: ShoppingApp) -> list[str]:
    trace: list[str] = []
    trace.append(f"list_items -> {len(app.list_items())} items")
    trace.append(f"add_to_cart sku-001 -> {app.add_to_cart('sku-001')}")
    trace.append(f"checkout -> {app.checkout()}")
    return trace


def _agent_task_2(app: ShoppingApp) -> list[str]:
    trace: list[str] = []
    trace.append(f"list_items")
    app.list_items()
    trace.append(f"add_to_cart sku-002 -> {app.add_to_cart('sku-002')}")
    trace.append(f"add_to_cart sku-003 -> {app.add_to_cart('sku-003')}")
    trace.append(f"checkout -> {app.checkout()}")
    return trace


def _agent_task_3(app: ShoppingApp) -> list[str]:
    trace: list[str] = []
    trace.append(f"list_items")
    app.list_items()
    trace.append(f"add_to_cart sku-001 -> {app.add_to_cart('sku-001')}")
    trace.append(f"add_to_cart sku-002 -> {app.add_to_cart('sku-002')}")
    trace.append("revised_choice: remove keyboard")
    trace.append(f"remove_from_cart sku-002 -> {app.remove_from_cart('sku-002')}")
    trace.append(f"add_to_cart sku-003 -> {app.add_to_cart('sku-003')}")
    trace.append(f"checkout -> {app.checkout()}")
    return trace


def main() -> None:
    print("=" * 70)
    print("WEBARENA/OSWORLD 风格评测框架——阶段 14，第 20 课")
    print("=" * 70)

    tasks = [
        Task(
            tid="buy_headphones",
            description="购买耳机",
            agent=_agent_task_1,
            gold_steps=3,
            success=lambda app: any(
                o["items"].get("sku-001") == 1 for o in app.orders
            ),
        ),
        Task(
            tid="buy_bundle",
            description="同时购买键盘和鼠标",
            agent=_agent_task_2,
            gold_steps=4,
            success=lambda app: any(
                o["items"].get("sku-002") == 1 and o["items"].get("sku-003") == 1
                for o in app.orders
            ),
        ),
        Task(
            tid="revised_order",
            description="下单过程中将键盘换成鼠标",
            agent=_agent_task_3,
            gold_steps=5,
            success=lambda app: any(
                o["items"].get("sku-001") == 1 and
                o["items"].get("sku-003") == 1 and
                "sku-002" not in o["items"]
                for o in app.orders
            ),
        ),
    ]

    total_success = 0
    total_steps = 0
    total_gold = 0
    for task in tasks:
        app = ShoppingApp()
        trace = task.agent(app)
        ok = task.success(app)
        steps = len(trace)
        efficiency = steps / task.gold_steps
        print(f"\n[{task.tid}] {task.description}")
        print(f"  是否成功：{ok}")
        print(f"  执行步数：{steps}  （参考步数 {task.gold_steps}，"
              f"相对步数倍率 {efficiency:.2f} 倍）")
        for line in trace:
            print(f"    - {line}")
        if ok:
            total_success += 1
        total_steps += steps
        total_gold += task.gold_steps

    print(f"\n汇总")
    print(f"  成功率：       {total_success}/{len(tasks)}")
    print(f"  相对步数倍率： {total_steps / total_gold:.2f} 倍于参考步数")
    print()
    print("WebArena 的设计思路：通过环境接口执行动作，以最终状态检查判定成功。")
    print("原文关于 OSWorld-Human 的参考结论：智能体步数是参考轨迹的 1.4—2.7 倍；不是本例实测范围。")


if __name__ == "__main__":
    main()
