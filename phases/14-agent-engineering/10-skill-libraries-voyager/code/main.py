"""Voyager 式技能库（Skill library）：注册、检索、组合与改进。

仅使用标准库。动作空间（Action space）由代码构成；技能可检索、可组合；
失败反馈用于改进下一版本。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Skill:
    name: str
    description: str
    code: str
    fn: Callable[..., Any]
    version: int = 1
    tags: tuple[str, ...] = ()
    depends_on: tuple[str, ...] = ()
    history: list[str] = field(default_factory=list)


class SkillLibrary:
    def __init__(self) -> None:
        self._skills: dict[str, Skill] = {}

    def register(self, skill: Skill, dedup: bool = True) -> str:
        if dedup and skill.name in self._skills:
            existing = self._skills[skill.name]
            existing.history.append(existing.code)
            existing.code = skill.code
            existing.fn = skill.fn
            existing.description = skill.description
            existing.tags = skill.tags
            existing.depends_on = skill.depends_on
            existing.version += 1
            return f"已改进 {skill.name} -> v{existing.version}"
        self._skills[skill.name] = skill
        return f"已注册 {skill.name} v{skill.version}"

    def search(self, query: str, top_k: int = 3,
               tag_filter: str | None = None) -> list[tuple[float, Skill]]:
        q_tokens = set(query.lower().split())
        scored: list[tuple[float, Skill]] = []
        for skill in self._skills.values():
            if tag_filter and tag_filter not in skill.tags:
                continue
            d_tokens = set(skill.description.lower().split())
            if not d_tokens:
                continue
            overlap = len(q_tokens & d_tokens)
            if overlap == 0:
                continue
            score = overlap / len(q_tokens | d_tokens)
            scored.append((score, skill))
        scored.sort(key=lambda x: -x[0])
        return scored[:top_k]

    def get(self, name: str) -> Skill | None:
        return self._skills.get(name)

    def topo_order(self, name: str) -> list[str]:
        visited: set[str] = set()
        order: list[str] = []
        stack = [(name, False)]
        while stack:
            node, processed = stack.pop()
            if processed:
                order.append(node)
                continue
            if node in visited:
                continue
            visited.add(node)
            stack.append((node, True))
            skill = self._skills.get(node)
            if skill is None:
                continue
            for dep in skill.depends_on:
                if dep not in visited:
                    stack.append((dep, False))
        return order

    def execute(self, name: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
        if context is None:
            context = {}
        context.setdefault("log", [])
        for skill_name in self.topo_order(name):
            skill = self._skills.get(skill_name)
            if skill is None:
                context["log"].append(f"缺少技能： {skill_name}")
                context["failed"] = True
                return context
            try:
                result = skill.fn(context)
                context["log"].append(
                    f"已运行 {skill.name} v{skill.version}: {result}"
                )
            except Exception as e:
                context["log"].append(
                    f"执行出错 {skill.name} v{skill.version}: "
                    f"{type(e).__name__}: {e}"
                )
                context["failed"] = True
                return context
        context["failed"] = False
        return context

    def list_names(self) -> list[str]:
        return sorted(self._skills)


def _mine(context: dict[str, Any]) -> str:
    context["resources"] = context.get("resources", {})
    context["resources"]["ore"] = context["resources"].get("ore", 0) + 3
    return "+3 矿石（ore）"


def _place_table(context: dict[str, Any]) -> str:
    context["has_table"] = True
    return "已放置工作台（Crafting table）"


def _craft_iron_pick_v1(context: dict[str, Any]) -> str:
    if not context.get("has_table"):
        raise RuntimeError("上下文中没有工作台，无法合成")
    ore = context.get("resources", {}).get("ore", 0)
    stick = context.get("resources", {}).get("stick", 0)
    if ore < 3:
        raise RuntimeError(f"需要 3 个矿石，当前有 {ore} 个")
    if stick < 2:
        raise RuntimeError(f"需要 2 根木棍，当前有 {stick} 根")
    context["resources"]["ore"] -= 3
    context["resources"]["stick"] -= 2
    context["inventory"] = context.get("inventory", [])
    context["inventory"].append("iron_pickaxe")
    return "已合成铁镐（iron_pickaxe）"


def _craft_iron_pick_v2(context: dict[str, Any]) -> str:
    if not context.get("has_table"):
        return "跳过合成：尚无工作台"
    ore = context.get("resources", {}).get("ore", 0)
    stick = context.get("resources", {}).get("stick", 0)
    if ore < 3 or stick < 2:
        return f"跳过合成：矿石（ore）={ore}，木棍（stick）={stick}"
    context["resources"]["ore"] -= 3
    context["resources"]["stick"] -= 2
    context["inventory"] = context.get("inventory", [])
    context["inventory"].append("iron_pickaxe")
    return "已合成铁镐（iron_pickaxe）"


def _gather_sticks(context: dict[str, Any]) -> str:
    context["resources"] = context.get("resources", {})
    context["resources"]["stick"] = context["resources"].get("stick", 0) + 2
    return "+2 木棍（stick）"


def main() -> None:
    print("=" * 70)
    print("Voyager 技能库（Skill library）——第 14 阶段，第 10 课")
    print("=" * 70)

    lib = SkillLibrary()

    print("\n步骤 1：注册基础技能")
    print("  " + lib.register(Skill(
        name="mine_ore",
        description="mine iron ore from nearby rock formations",
        code="mine(3)",
        fn=_mine,
        tags=("gather", "ore"),
    )))
    print("  " + lib.register(Skill(
        name="place_crafting_table",
        description="place a crafting table at current position",
        code="place_table()",
        fn=_place_table,
        tags=("setup", "crafting"),
    )))
    print("  " + lib.register(Skill(
        name="gather_sticks",
        description="gather sticks from tree or broken planks",
        code="gather(2, stick)",
        fn=_gather_sticks,
        tags=("gather", "stick"),
    )))

    print("\n步骤 2：组合高阶技能（v1）")
    print("  " + lib.register(Skill(
        name="craft_iron_pickaxe",
        description="craft an iron pickaxe using ore and a crafting table",
        code="mine_ore(); place_table(); craft('iron_pickaxe')",
        fn=_craft_iron_pick_v1,
        depends_on=("mine_ore", "place_crafting_table"),
        tags=("craft", "tool"),
    )))

    print("\n步骤 3：检索 'I need a pickaxe'")
    for score, skill in lib.search("I need a pickaxe"):
        print(f"  {score:.3f}  {skill.name} v{skill.version}: {skill.description}")

    print("\n步骤 4：执行 craft_iron_pickaxe（预期失败，缺少木棍）")
    context = lib.execute("craft_iron_pickaxe")
    for line in context["log"]:
        print(f"  {line}")
    print(f"  是否失败： {context.get('failed')}")

    print("\n步骤 5：迭代改进（Iterative refinement），重写为 v2 并加入木棍依赖")
    print("  " + lib.register(Skill(
        name="craft_iron_pickaxe",
        description="craft an iron pickaxe using ore, sticks, and a crafting table",
        code="mine_ore(); gather_sticks(); place_table(); craft('iron_pickaxe')",
        fn=_craft_iron_pick_v2,
        depends_on=("mine_ore", "gather_sticks", "place_crafting_table"),
        tags=("craft", "tool"),
    )))

    print("\n步骤 6：重新执行（预期成功）")
    context = lib.execute("craft_iron_pickaxe")
    for line in context["log"]:
        print(f"  {line}")
    print(f"  物品栏（Inventory）： {context.get('inventory')}")
    print(f"  是否失败： {context.get('failed')}")

    print("\n技能库状态")
    for name in lib.list_names():
        skill = lib.get(name)
        assert skill is not None
        print(f"  {name} v{skill.version}  依赖={skill.depends_on}  "
              f"标签={skill.tags}")

    print()
    print("模式：检索可组合技能、执行，再将反馈纳入 v2。")
    print("Claude Agent SDK 技能和 skillkit 注册表也使用同样的循环。")


if __name__ == "__main__":
    main()
