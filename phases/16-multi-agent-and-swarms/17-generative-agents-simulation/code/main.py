"""生成式智能体的最小模拟：仅用标准库演示 Smallville 风格结构。

五个智能体共享一个小世界。先为 agent-0 设定聚会目标，再按预设时点传播邀请，
通过观察记忆、规则式反思和计划更新，让智能体在指定时点前往咖啡馆。

译注：邀请的发送者、接收者和发送时点全部由主循环写死，不是模型自主生成的
社交网络。信念形成仅做英文子串匹配，检索也只用词面匹配；保留相关英文语料，
附中文解释。函数虽暴露 n_agents 参数，硬编码邀请却访问 agent-4，不能将
少于五个智能体当作已经支持的输入。这里没有真实 LLM，也没有实际时间等待。
"""
from __future__ import annotations

import math
import time
from dataclasses import dataclass, field


TICK_DURATION_S = 0.01  # 模拟步长；当前代码没有使用它进行真实等待


@dataclass
class Memory:
    ts: int
    kind: str
    content: str
    importance: int


@dataclass
class Plan:
    tick: int
    where: str
    note: str


@dataclass
class Agent:
    name: str
    location: str
    stream: list[Memory] = field(default_factory=list)
    plans: list[Plan] = field(default_factory=list)
    beliefs: list[str] = field(default_factory=list)

    def observe(self, tick: int, content: str, importance: int = 3) -> None:
        self.stream.append(Memory(tick, "observation", content, importance))

    def reflect(self, tick: int) -> None:
        recent_important = [m for m in self.stream if m.importance >= 6 and tick - m.ts <= 5]
        for m in recent_important:
            if "invited" in m.content and "party at" in m.content:
                # 信念夹具：有一个邀请我参加的聚会。此原句用于相等与成员关系判断。
                belief = f"there is a party I was invited to"
                if belief not in self.beliefs:
                    self.beliefs.append(belief)
                    self.stream.append(Memory(tick, "reflection", belief, 8))

    def update_plan(self, tick: int) -> None:
        # 信念夹具：有一个邀请我参加的聚会。此原句用于相等与成员关系判断。
        if "there is a party I was invited to" in self.beliefs:
            if not any(p.where == "HobbsCafe" for p in self.plans):
                self.plans.append(Plan(tick=5, where="HobbsCafe", note="参加聚会"))

    def act(self, tick: int) -> str:
        for p in self.plans:
            if p.tick == tick:
                self.location = p.where
                # 动作前缀：移动到指定地点；后续 startswith 检查依赖英文 moves。
                return f"{self.name} moves to {p.where} ({p.note})"
        # 动作说明：仍留在当前位置。
        return f"{self.name} remains at {self.location}"


def retrieve_top_k(stream: list[Memory], query: str, tick: int, k: int = 3) -> list[Memory]:
    def score(m: Memory) -> float:
        recency = math.exp(-0.3 * (tick - m.ts))
        importance = m.importance / 10.0
        relevance = 0.6 if any(w in m.content.lower() for w in query.lower().split()) else 0.1
        return recency + importance + relevance
    return sorted(stream, key=score, reverse=True)[:k]


def run_simulation(n_agents: int = 5, ticks: int = 6) -> None:
    agents = [Agent(f"agent-{i}", location="home") for i in range(n_agents)]

    # 为 agent-0 写入聚会目标。
    # 目标记忆：在时点 5 于 HobbsCafe 举办情人节聚会。
    agents[0].stream.append(Memory(0, "goal", "host a Valentine's party at HobbsCafe at tick 5", 10))
    agents[0].plans.append(Plan(tick=5, where="HobbsCafe", note="举办聚会"))
    # 信念夹具：有一个邀请我参加的聚会。此原句用于相等与成员关系判断。
    agents[0].beliefs.append("there is a party I was invited to")

    print("=" * 72)
    print(f"生成式智能体结构（最小模拟）——{n_agents} 个智能体，{ticks} 个时点")
    print("=" * 72)

    for tick in range(ticks):
        print(f"\n--- 时点 {tick} ---")
        # 预设邀请传播：时点 0 由 agent-0 邀请 agent-1、agent-2，
        # 时点 1、2 分别安排 agent-1 邀请 agent-3、agent-2 邀请 agent-4。
        if tick == 0:
            for i in (1, 2):
                # 观察记忆：agent-0 邀请我在时点 5 到 HobbsCafe 聚会；invited 与 party at 用于匹配。
                agents[i].observe(tick, f"agent-0 invited me to a party at HobbsCafe at tick 5", importance=8)
                print(f"  agent-0 -> agent-{i}：发出邀请")
        if tick == 1:
            # 观察记忆：agent-1 发出的同一聚会邀请。
            agents[3].observe(tick, f"agent-1 invited me to a party at HobbsCafe at tick 5", importance=7)
            print(f"  agent-1 -> agent-3：二度传播的邀请")
        if tick == 2:
            # 观察记忆：agent-2 发出的同一聚会邀请。
            agents[4].observe(tick, f"agent-2 invited me to a party at HobbsCafe at tick 5", importance=7)
            print(f"  agent-2 -> agent-4：二度传播的邀请")

        for a in agents:
            a.reflect(tick)
            a.update_plan(tick)
            action = a.act(tick)
            if action.startswith(a.name + " moves"):
                print(f"  {action}")

    # 最终状态
    print("\n" + "=" * 72)
    print("最终位置：")
    for a in agents:
        print(f"  {a.name:10s} 位于 {a.location}")

    at_party = sum(1 for a in agents if a.location == "HobbsCafe")
    print(f"\n{at_party}/{n_agents} 个智能体到达 HobbsCafe 参加聚会。")
    print("从一个初始目标出发，通过记忆、反思规则和计划实现到达；邀请事件仍由主循环预设。")


def demo_retrieval() -> None:
    print("\n" + "=" * 72)
    print("检索演示——按新近程度、重要性和相关性之和选取前 k 条")
    print("=" * 72)
    stream = [
        # 检索语料：在咖啡馆看见 Isabella。
        Memory(0, "observation", "saw Isabella at the cafe", importance=4),
        # 检索语料：Isabella 说她正在筹划聚会。
        Memory(1, "observation", "Isabella said she is planning a party", importance=7),
        # 检索语料：我会喜欢在咖啡馆参加聚会。
        Memory(2, "reflection", "I would enjoy a party at the cafe", importance=6),
        # 检索语料：Klaus 提到自己正在写论文。
        Memory(3, "observation", "Klaus mentioned he is writing a paper", importance=3),
    ]
    top = retrieve_top_k(stream, query="party cafe", tick=4, k=3)
    print("  查询：party cafe（聚会、咖啡馆），当前时点为 4")
    for m in top:
        print(f"  [t={m.ts}] {m.kind:11s} 重要性={m.importance} :: {m.content}")


def main() -> None:
    run_simulation()
    demo_retrieval()
    print("\n要点：")
    print("  初始目标、预设邀请和三个组件共同形成协同到达；不能将结果当作自主社交的实证。")
    print("  反思规则负责把观察转换为信念；移除它会阻断被邀请者的信念形成。")
    print("  本例检索将新近程度、重要性和词面相关性相加；未独立评测各项贡献。")


if __name__ == "__main__":
    main()
