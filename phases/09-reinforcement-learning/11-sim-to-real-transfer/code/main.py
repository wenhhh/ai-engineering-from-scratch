import random
from collections import defaultdict


GRID = 5
TERMINAL = (GRID - 1, GRID - 1)
ACTIONS = ("up", "down", "left", "right")
DELTAS = {"up": (-1, 0), "down": (1, 0), "left": (0, -1), "right": (0, 1)}


def step(state, action, slip, rng):
    if state == TERMINAL:
        return state, 0.0, True
    if rng.random() < slip:
        perp = ("left", "right") if action in ("up", "down") else ("up", "down")
        action = rng.choice(perp)
    dr, dc = DELTAS[action]
    r, c = state
    nr = min(max(r + dr, 0), GRID - 1)
    nc = min(max(c + dc, 0), GRID - 1)
    return (nr, nc), -1.0, (nr, nc) == TERMINAL


def default_q():
    return {a: 0.0 for a in ACTIONS}


def epsilon_greedy(Q, s, rng, eps):
    if rng.random() < eps:
        return rng.choice(ACTIONS)
    q = Q[s]
    return max(ACTIONS, key=lambda a: q[a])


def train_fixed(slip, episodes=3000, alpha=0.1, gamma=0.95, eps=0.15, rng=None):
    rng = rng or random.Random(0)
    Q = defaultdict(default_q)
    for _ in range(episodes):
        s = (0, 0)
        for _ in range(100):
            a = epsilon_greedy(Q, s, rng, eps)
            s_next, r, done = step(s, a, slip, rng)
            if done:
                Q[s][a] += alpha * (r - Q[s][a])
                break
            best_next = max(Q[s_next].values())
            Q[s][a] += alpha * ((r + gamma * best_next) - Q[s][a])
            s = s_next
    return Q


def train_dr(slip_low, slip_high, episodes=3000, alpha=0.1, gamma=0.95, eps=0.15, rng=None):
    rng = rng or random.Random(0)
    Q = defaultdict(default_q)
    for _ in range(episodes):
        slip_ep = rng.uniform(slip_low, slip_high)
        s = (0, 0)
        for _ in range(100):
            a = epsilon_greedy(Q, s, rng, eps)
            s_next, r, done = step(s, a, slip_ep, rng)
            if done:
                Q[s][a] += alpha * (r - Q[s][a])
                break
            best_next = max(Q[s_next].values())
            Q[s][a] += alpha * ((r + gamma * best_next) - Q[s][a])
            s = s_next
    return Q


def evaluate(Q, slip, episodes=200, rng=None):
    rng = rng or random.Random(42)
    total = 0.0
    for _ in range(episodes):
        s = (0, 0)
        ep_total = 0.0
        for _ in range(100):
            a = max(ACTIONS, key=lambda a: Q[s][a])
            s, r, done = step(s, a, slip, rng)
            ep_total += r
            if done:
                break
        total += ep_total
    return total / episodes


def main():
    print(f"=== 仿真到现实迁移（Sim-to-real）：在仿真中训练，在“现实”中评估 ===")
    print(f"环境：{GRID}x{GRID} 网格世界（GridWorld），slip 表示向垂直方向偏移的概率")
    print()

    print("用相同计算预算训练两个策略：")
    print("  策略 A：固定 slip = 0.0，不使用域随机化（Domain Randomization）")
    print("  策略 B：slip ~ Uniform[0.0, 0.3]，使用域随机化（Domain Randomization）")
    print()

    rng = random.Random(1)
    Q_fixed = train_fixed(0.0, rng=rng)
    rng = random.Random(1)
    Q_dr = train_dr(0.0, 0.3, rng=rng)

    print("在“现实”偏移概率下评估：每种概率进行 200 个回合的贪心评估")
    print(f"  {'slip':<10}{'固定偏移策略':<22}{'域随机化训练策略':<22}")
    for slip in (0.0, 0.1, 0.2, 0.3, 0.5, 0.7):
        r_fixed = evaluate(Q_fixed, slip)
        r_dr = evaluate(Q_dr, slip)
        label = ""
        if slip <= 0.3:
            label = "（位于域随机化的分布支持范围内）"
        else:
            label = "（超出域随机化分布，OOD）"
        print(f"  {slip:<10.2f}{r_fixed:<22.2f}{r_dr:<22.2f}{label}")

    print()
    print("结论：域随机化（DR）训练的策略性能平缓下降；固定偏移策略在分布外（OOD）条件下较脆弱。")


if __name__ == "__main__":
    main()
