"""粒子群优化（PSO）与蚁群优化（ACO）风格路由，仅使用 Python 标准库。

PSO 在二维参数空间中搜索，两个维度类比 temperature 和 top_k_weight，
适应度来自预设数学函数，并非真实模型评估。AMRO-S 风格路由用信息素矩阵
为四类任务分配三个智能体，按合成质量反馈强化或衰减路由权重。

译注：原文把 (0.72, 0.40) 称为适应度 1.0 的最优点，但代入函数实际得到 0.84。
函数只截断负值，不将结果限制在 1.0 以下，周围波纹也可能产生更高值。
路由亲和度和噪声均为手工设定；质量门槛不是对真实智能体正确性的保证。
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field


# ---------- LMPSO ----------

@dataclass
class Particle:
    x: list[float]
    v: list[float]
    p_best: list[float]
    p_best_fit: float


def fitness(x: list[float]) -> float:
    """带余弦波纹的合成适应度函数，用来观察无梯度搜索过程。
    (0.72, 0.40) 是偏移参考中心，该点值为 0.84，并非已证明的最优点。"""
    cx, cy = 0.72, 0.40
    dx, dy = x[0] - cx, x[1] - cy
    dist2 = dx * dx + dy * dy
    ripple = 0.08 * (math.cos(8 * math.pi * dx) + math.cos(8 * math.pi * dy))
    return max(0.0, 1.0 - 6.0 * dist2 - ripple)


def run_lmpso(n_particles: int = 20, iterations: int = 30, seed: int = 0) -> list[float]:
    rng = random.Random(seed)
    w, c1, c2 = 0.6, 1.2, 1.2
    bounds = ((0.0, 1.0), (0.0, 1.0))

    particles: list[Particle] = []
    for _ in range(n_particles):
        x = [rng.uniform(*bounds[0]), rng.uniform(*bounds[1])]
        v = [rng.uniform(-0.1, 0.1), rng.uniform(-0.1, 0.1)]
        f = fitness(x)
        particles.append(Particle(x=list(x), v=v, p_best=list(x), p_best_fit=f))

    g_best = max(particles, key=lambda p: p.p_best_fit)
    g_best_x = list(g_best.p_best)
    g_best_fit = g_best.p_best_fit

    history: list[float] = [g_best_fit]

    for _ in range(iterations):
        for p in particles:
            r1, r2 = rng.random(), rng.random()
            for d in range(2):
                cognitive = c1 * r1 * (p.p_best[d] - p.x[d])
                social = c2 * r2 * (g_best_x[d] - p.x[d])
                p.v[d] = w * p.v[d] + cognitive + social
                p.x[d] += p.v[d]
                p.x[d] = max(bounds[d][0], min(bounds[d][1], p.x[d]))
            f = fitness(p.x)
            if f > p.p_best_fit:
                p.p_best = list(p.x)
                p.p_best_fit = f
                if f > g_best_fit:
                    g_best_x = list(p.x)
                    g_best_fit = f
        history.append(g_best_fit)

    return history


# ---------- AMRO-S（ACO 风格路由）----------

class PheromoneRouter:
    def __init__(self, task_types: list[str], agents: list[str],
                 decay: float = 0.05, reinforce: float = 0.2,
                 quality_threshold: float = 0.6) -> None:
        self.task_types = task_types
        self.agents = agents
        self.decay = decay
        self.reinforce = reinforce
        self.quality_threshold = quality_threshold
        self.pheromones = {t: {a: 1.0 for a in agents} for t in task_types}

    def choose(self, task_type: str, rng: random.Random) -> str:
        table = self.pheromones[task_type]
        total = sum(table.values())
        r = rng.random() * total
        upto = 0.0
        for a, p in table.items():
            upto += p
            if r <= upto:
                return a
        return self.agents[-1]

    def deposit(self, task_type: str, agent: str, quality: float) -> None:
        for a in self.agents:
            self.pheromones[task_type][a] *= (1.0 - self.decay)
        if quality >= self.quality_threshold:
            self.pheromones[task_type][agent] += self.reinforce * quality


AGENT_TASK_AFFINITY = {
    "coder": {"code": 0.9, "math": 0.5, "writing": 0.3, "planning": 0.4},
    "mathematician": {"code": 0.4, "math": 0.95, "writing": 0.2, "planning": 0.5},
    "writer": {"code": 0.2, "math": 0.2, "writing": 0.9, "planning": 0.6},
}


def simulate_task(agent: str, task_type: str, rng: random.Random) -> float:
    base = AGENT_TASK_AFFINITY[agent][task_type]
    return max(0.0, min(1.0, base + rng.uniform(-0.15, 0.15)))


def run_amro_s(n_tasks: int = 200, seed: int = 0) -> tuple[float, float, PheromoneRouter]:
    rng = random.Random(seed)
    task_types = ["code", "math", "writing", "planning"]
    agents = list(AGENT_TASK_AFFINITY.keys())

    router = PheromoneRouter(task_types, agents)
    random_router_quality = 0.0
    aco_quality = 0.0

    for i in range(n_tasks):
        tt = task_types[i % len(task_types)]

        # 随机路由对照组
        rand_agent = rng.choice(agents)
        rq = simulate_task(rand_agent, tt, rng)
        random_router_quality += rq

        # ACO 风格信息素路由
        aco_agent = router.choose(tt, rng)
        aq = simulate_task(aco_agent, tt, rng)
        aco_quality += aq
        router.deposit(tt, aco_agent, aq)

    return random_router_quality / n_tasks, aco_quality / n_tasks, router


def print_pheromone_table(router: PheromoneRouter) -> None:
    print(f"  {'任务类型':12s} " + " ".join(f"{a:>14s}" for a in router.agents))
    for tt in router.task_types:
        row = [f"{router.pheromones[tt][a]:>14.3f}" for a in router.agents]
        print(f"  {tt:12s} " + " ".join(row))


def main() -> None:
    print("=" * 72)
    print("LMPSO 风格模拟——20 个粒子、30 次迭代、二维参数空间")
    print("=" * 72)
    history = run_lmpso()
    for i in range(0, len(history), 5):
        bar = "#" * max(1, int(history[i] * 40))
        print(f"  迭代 {i:3d}  全局最佳适应度={history[i]:.4f}  {bar}")
    print(f"  最终全局最佳适应度={history[-1]:.4f}（参考中心 (0.72, 0.40) 的值为 0.84，不是原文所称的最优值 1.0）")

    print("\n" + "=" * 72)
    print("AMRO-S 风格模拟——200 个任务，3 个智能体 × 4 类任务")
    print("=" * 72)
    rand_quality, aco_quality, router = run_amro_s()
    print(f"  随机路由平均质量：{rand_quality:.3f}")
    print(f"  ACO 路由平均质量：{aco_quality:.3f}")
    print(f"  相对改善：{(aco_quality - rand_quality) / rand_quality * 100:+.1f}%")

    # 展示刚才这次运行所得的信息素表
    print("\n  最终信息素表（完成 200 个任务后）：")
    print_pheromone_table(router)

    print("\n要点：")
    print("  PSO 只使用适应度评估而不需要梯度；本例的改进轨迹不等于全局最优证明。")
    print("  ACO 信息素表使任务路由偏好可见，但权重本身不证明质量评分可靠。")
    print("  只有质量达到 0.6 才增加信息素；效果依赖质量信号可信，本例没有建模执行速度。")


if __name__ == "__main__":
    main()
