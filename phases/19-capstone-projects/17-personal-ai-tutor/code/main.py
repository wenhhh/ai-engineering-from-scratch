"""个人 AI 导师：贝叶斯知识追踪与苏格拉底式策略骨架。

学习者模型在每次交互后更新各知识点的掌握概率，再沿先修关系图选择下一知识点。
本例实现 BKT 更新、课程有向无环图、辅导动作选择，并模拟自适应与固定轮询两种策略。
运行：python main.py

译注：没有真实题目、教师、学习者或大语言模型。“两周”只是展示标签，代码运行
10 组配对模拟、每组最多 60 次交互，没有日历时间或真实教育效果研究。
所谓收益是期末掌握概率之和，没有减去初始值；自适应组还人为获得难度与掌握度加成，
不能当作只改变选课顺序的对照。末尾轨迹展示每个已见知识点的最终掌握度，而非逐轮历史。
知识点与策略标识是程序键，保留原值并附中文释义；本例未实现中文对话导师。
"""

from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# 贝叶斯知识追踪：四参数模型
# ---------------------------------------------------------------------------

@dataclass
class BKTParams:
    p_init: float = 0.2     # 初始掌握概率；LearnerState 的默认值另行固定为 0.2
    p_learn: float = 0.12   # 每次练习后从未掌握转为掌握的概率
    p_slip: float = 0.10    # 已掌握但因失误答错的概率（纠正原注释，与下面公式一致）
    p_guess: float = 0.15   # 未掌握但猜对的概率


def bkt_update(mastery: float, correct: bool, p: BKTParams) -> float:
    if correct:
        num = mastery * (1 - p.p_slip)
        denom = num + (1 - mastery) * p.p_guess
    else:
        num = mastery * p.p_slip
        denom = num + (1 - mastery) * (1 - p.p_guess)
    posterior = num / max(denom, 1e-6)
    # 状态转移：本次交互可能带来学习
    return posterior + (1 - posterior) * p.p_learn


# ---------------------------------------------------------------------------
# 课程图：以先修关系为边的知识点有向无环图
# ---------------------------------------------------------------------------

@dataclass
class Concept:
    name: str
    prereqs: list[str] = field(default_factory=list)


ALGEBRA = [
    # 知识点 ID：数轴。
    Concept("number_line", []),
    # 知识点 ID：加减法。
    # 知识点 ID：数轴。
    Concept("addition_subtraction", ["number_line"]),
    # 知识点 ID：乘除法。
    # 知识点 ID：加减法。
    Concept("multiplication_division", ["addition_subtraction"]),
    # 知识点 ID：负数。
    # 知识点 ID：加减法。
    Concept("negative_numbers", ["addition_subtraction"]),
    # 知识点 ID：等式。
    # 知识点 ID：加减法。
    Concept("equality", ["addition_subtraction"]),
    # 知识点 ID：一步求解未知数。
    # 知识点 ID：等式。
    # 知识点 ID：加减法。
    Concept("isolating_variable_one_step", ["equality", "addition_subtraction"]),
    # 知识点 ID：两步求解未知数。
    # 知识点 ID：一步求解未知数。
    # 知识点 ID：乘除法。
    Concept("isolating_variable_two_step", ["isolating_variable_one_step", "multiplication_division"]),
    # 知识点 ID：分配律。
    # 知识点 ID：乘除法。
    Concept("distributive_property", ["multiplication_division"]),
    # 知识点 ID：合并同类项。
    # 知识点 ID：加减法。
    # 知识点 ID：分配律。
    Concept("combining_like_terms", ["addition_subtraction", "distributive_property"]),
    # 知识点 ID：一次方程。
    # 知识点 ID：两步求解未知数。
    # 知识点 ID：合并同类项。
    Concept("linear_equations", ["isolating_variable_two_step", "combining_like_terms"]),
    # 知识点 ID：二次方程基础。
    # 知识点 ID：一次方程。
    # 知识点 ID：乘除法。
    Concept("quadratic_basics", ["linear_equations", "multiplication_division"]),
]


def curriculum_map(concepts: list[Concept]) -> dict[str, Concept]:
    return {c.name: c for c in concepts}


# ---------------------------------------------------------------------------
# 学习者状态：各知识点的掌握概率与作答历史
# ---------------------------------------------------------------------------

@dataclass
class LearnerState:
    learner_id: str
    mastery: dict[str, float] = field(default_factory=lambda: defaultdict(lambda: 0.2))
    history: list[tuple[str, bool]] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 知识点选择：按给定顺序选首个先修达标且自身尚未掌握的知识点
# ---------------------------------------------------------------------------

def next_concept(state: LearnerState, cmap: dict[str, Concept],
                 master_threshold: float = 0.85) -> str | None:
    for c in cmap.values():
        if state.mastery[c.name] >= master_threshold:
            continue
        if all(state.mastery[pr] >= master_threshold for pr in c.prereqs):
            return c.name
    return None


# ---------------------------------------------------------------------------
# 苏格拉底式策略示意：选择搭建学习支架、下一题或鼓励等动作
# ---------------------------------------------------------------------------

def socratic_policy(state: LearnerState, concept: str, correct: bool) -> str:
    m = state.mastery[concept]
    if correct and m > 0.8:
        # 动作 ID：鼓励并推进；本例不会直接调用选课器推进。
        return "celebrate_and_advance"
    if correct:
        # 动作 ID：巩固后进入下一题；本例没有生成题目。
        return "reinforce_and_next_question"
    if m > 0.5:
        # 动作 ID：提示。
        return "hint"
    # 动作 ID：借助先修知识搭建学习支架。
    return "scaffold_from_prereq"


# ---------------------------------------------------------------------------
# 学习者模拟器：用能力、掌握度和难度决定答对概率
# ---------------------------------------------------------------------------

def simulate_answer(learner_knowledge: float, concept_difficulty: float,
                    rng: random.Random) -> bool:
    """模拟学习者是否答对，不生成或评价真实作答。"""
    # 答对概率 = sigmoid(有效知识水平 - 难度)
    import math
    p = 1 / (1 + math.exp(-(learner_knowledge - concept_difficulty)))
    return rng.random() < p


# ---------------------------------------------------------------------------
# 自适应与基线组：比较 N 次模拟交互后的掌握概率总和
# ---------------------------------------------------------------------------

def run_adaptive(learner_id: str, inherent_ability: float,
                 cmap: dict[str, Concept], n_turns: int, rng: random.Random) -> LearnerState:
    state = LearnerState(learner_id=learner_id)
    p = BKTParams()
    # 保存上一轮辅导动作，传入下一轮。提示与学习支架直接降低合成难度，
    # 鼓励则直接增加掌握概率；这些是人工建模效果，不是测量结果。
    last_action: str | None = None
    for _ in range(n_turns):
        concept = next_concept(state, cmap)
        if concept is None:
            break
        difficulty = 0.3 + 0.1 * len(cmap[concept].prereqs)
        # 将上一轮动作应用于当前一轮，可能作用在新的知识点上
        # 动作 ID：借助先修知识搭建学习支架。
        if last_action == "scaffold_from_prereq":
            difficulty -= 0.15    # 用先修支架降低本轮难度
        # 动作 ID：提示。
        elif last_action == "hint":
            difficulty -= 0.08    # 用提示小幅降低本轮难度
        # 动作 ID：鼓励并推进；本例不会直接调用选课器推进。
        elif last_action == "celebrate_and_advance":
            # 鼓励通过直接增加当前知识点掌握概率起效；变化会进入后续更新
            state.mastery[concept] = min(1.0, state.mastery[concept] + 0.02)
        # 有效知识水平 = 固有能力 + 掌握概率的加权贡献
        ek = inherent_ability + state.mastery[concept] * 1.5
        correct = simulate_answer(ek, difficulty, rng)
        last_action = socratic_policy(state, concept, correct)
        state.history.append((concept, correct))
        state.mastery[concept] = bkt_update(state.mastery[concept], correct, p)
    return state


def run_baseline(learner_id: str, inherent_ability: float,
                 cmap: dict[str, Concept], n_turns: int, rng: random.Random) -> LearnerState:
    """非自适应选课：按固定顺序轮询知识点。
    掌握概率同样用 BKT 更新；本组不使用自适应组的难度调整与鼓励加成，
    也不按先修关系限制选课。"""
    state = LearnerState(learner_id=learner_id)
    p = BKTParams()
    order = list(cmap.keys())
    for i in range(n_turns):
        concept = order[i % len(order)]
        difficulty = 0.3 + 0.1 * len(cmap[concept].prereqs)
        ek = inherent_ability + state.mastery[concept] * 1.5
        correct = simulate_answer(ek, difficulty, rng)
        state.history.append((concept, correct))
        state.mastery[concept] = bkt_update(state.mastery[concept], correct, p)
    return state


def mastery_sum(state: LearnerState, cmap: dict[str, Concept]) -> float:
    return sum(state.mastery[c] for c in cmap)


def main() -> None:
    cmap = curriculum_map(ALGEBRA)
    rng = random.Random(29)

    print("=== “两周效果研究”标签下的配对模拟（不含真实时间与学习者） ===")
    print(f"课程：{len(cmap)} 个知识点")

    adaptive_gains: list[float] = []
    baseline_gains: list[float] = []
    n_learners = 10
    n_turns = 60

    for i in range(n_learners):
        ability = rng.gauss(0.3, 0.4)
        # 配对随机流：两组从相同 RNG 状态开始，降低随机种子差异的影响。
        # 这不排除其他建模差异，也不证明模拟差值对应真实教育效果。
        seed = 100 + i
        r_adapt = random.Random(seed)
        r_base = random.Random()
        r_base.setstate(r_adapt.getstate())
        s1 = run_adaptive(f"adapt_{i}", ability, cmap, n_turns, r_adapt)
        s2 = run_baseline(f"base_{i}", ability, cmap, n_turns, r_base)
        adaptive_gains.append(mastery_sum(s1, cmap))
        baseline_gains.append(mastery_sum(s2, cmap))

    def mean(xs): return sum(xs) / len(xs)
    print(f"自适应组掌握概率总和的均值={mean(adaptive_gains):.2f}")
    print(f"基线组掌握概率总和的均值={mean(baseline_gains):.2f}")
    delta = mean(adaptive_gains) - mean(baseline_gains)
    print(f"差值（自适应组 - 基线组）：{delta:+.2f} 个掌握度点，交互上限为 {n_turns} 轮")

    print("\n=== 自适应演示学习者的已见知识点最终状态 ===")
    state = run_adaptive("demo", 0.3, cmap, 20, random.Random(7))
    seen_concepts = []
    for c, ok in state.history:
        if c not in [x[0] for x in seen_concepts]:
            seen_concepts.append((c, state.mastery[c]))
    for c, m in seen_concepts[:8]:
        print(f"  {c:34s} 掌握概率={m:.2f}")


if __name__ == "__main__":
    main()
