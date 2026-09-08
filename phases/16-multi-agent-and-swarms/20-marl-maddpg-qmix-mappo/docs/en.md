# 多智能体强化学习（MARL）：MADDPG、QMIX、MAPPO

> 多智能体协调的强化学习传统，至今仍影响着 2026 年的 LLM 智能体系统。**MADDPG**（Lowe 等，NeurIPS 2017，arXiv:1706.02275）提出集中训练、分散执行（Centralized Training, Decentralized Execution，CTDE）：训练期间，每个评论家看到所有智能体的状态与动作；测试时只运行局部行动者。它适用于合作、竞争及混合环境。**QMIX**（Rashid 等，ICML 2018，arXiv:1803.11485）通过单调混合网络进行价值分解；各智能体的 Q 合成为联合 Q，让 `argmax` 能直接分解到各智能体，在 StarCraft Multi-Agent Challenge（SMAC）中占主导地位。**MAPPO**（Yu 等，NeurIPS 2022，arXiv:2103.01955）是采用集中式价值函数的 PPO；只需少量调优，就在 particle-world、SMAC、Google Research Football 和 Hanabi 中取得“令人意外的有效性”。这些方法支撑着必须分散行动的智能体团队的策略训练。MAPPO 是 **2026 年合作式 MARL 的默认基线**。本课从小型网格世界玩具示例构建各个模式，在接触 LLM 智能体训练前，将这三个思想练成肌肉记忆。

**Type:** Learn
**Languages:** Python (stdlib, small NumPy-free implementations)
**Prerequisites:** Phase 09 强化学习（Reinforcement Learning）, Phase 16 · 09 并行群体网络（Parallel Swarm Networks）
**Time:** ~90 分钟

## 问题（Problem）

LLM 智能体系统越来越多地为智能体间协调训练策略：何时让渡、何时行动、调用哪个同伴。指导这类策略训练的文献领域是多智能体强化学习（Multi-Agent Reinforcement Learning，MARL），它早于 LLM 浪潮，且由少数主流算法主导。

缺少模式术语，阅读 MARL 论文会很困难。集中训练、分散执行（CTDE）、价值分解和集中式评论家不是流行词，而是针对具体问题的具体答案：

- 独立强化学习（每个智能体单独学习）：从每个智能体的视角看，环境非平稳。这很糟糕。
- 集中式强化学习（一个智能体控制一切）：无法扩展，并违反执行约束。
- CTDE 兼得两者优势：利用全局信息训练，以局部策略部署。

## 概念（Concept）

### 论文使用的三类环境（Three environments the papers use）

- **Particle World（多智能体粒子环境）。**包含合作 / 竞争任务的简单二维物理环境。MADDPG 最初的试验平台。
- **StarCraft Multi-Agent Challenge（SMAC）。**合作式微操，部分可观测。QMIX 的试验平台。动作离散、状态连续。
- **Google Research Football、Hanabi、MPE。**MAPPO 的基线环境。

不同环境具有不同的动作 / 观察类型，应据此选择算法。

### MADDPG（2017）：CTDE 模式（the CTDE pattern）

每个智能体 `i` 拥有行动者（actor）`mu_i(o_i)`，将自身观察映射为动作。每个智能体还拥有评论家（critic）`Q_i(x, a_1, ..., a_n)`，训练时能看到所有观察和动作。行动者根据评论家的评估，通过策略梯度更新。

```
行动者更新：    grad_theta_i J = E[grad_theta mu_i(o_i) * grad_a_i Q_i(x, a_1..n) at a_i=mu_i(o_i)]
评论家更新：    给定下一状态联合估计，对 Q_i(x, a_1..n) 执行时序差分（TD）更新
```

为什么采用 CTDE：训练时，我们知道所有智能体的动作，用它降低各评论家的方差。部署时，每个智能体只看到 `o_i` 并调用 `mu_i(o_i)`。

失败模式：评论家的规模随 N 个智能体增长（输入包含所有动作）。不采用近似时，难以扩展到约 10 个以上智能体。

### QMIX（2018）：价值分解（value decomposition）

仅用于合作环境。全局奖励由各智能体 Q 值的单调函数求和得到：

```
Q_tot(tau, a) = f(Q_1(tau_1, a_1), ..., Q_n(tau_n, a_n)),   df/dQ_i >= 0
```

单调性保证：每个智能体独立选择 `argmax_{a_i} Q_i`，就可以算出 `argmax_a Q_tot`。这**恰好就是所需的分散执行性质**。训练时，混合网络根据各智能体的 Q 生成 `Q_tot`。

QMIX 为何在 SMAC 上占优：合作式 StarCraft 微操具有同构智能体、局部观察、全局奖励，完美匹配价值分解。

失败模式：单调性约束较强；某些任务的奖励结构无法单调分解（某个智能体为团队牺牲）。扩展方法（QTRAN、QPLEX）放宽了这一约束。

### MAPPO（2022）：被忽视的默认方案（the overlooked default）

多智能体 PPO（Multi-Agent PPO）：具有集中式价值函数的 PPO。每个智能体拥有自己的策略；所有智能体共享（或各自拥有）能看到完整状态的价值函数。Yu 等在 2022 年的五个基准上，对比了 MAPPO、MADDPG、QMIX 及其扩展，发现：

- MAPPO 在 particle-world、SMAC、Google Research Football、Hanabi、MPE 上达到或超过离策略 MARL 方法。
- 只需少量超参数调优。
- 训练稳定，可跨随机种子复现。

在这篇论文之前，社区低估了同策略 MARL。2026 年，MAPPO 是合作式 MARL 的默认基线；任何新方法都必须超越它。

### LLM 智能体工程师为何应关注（Why LLM-agent engineers should care）

三个直接用途：

1. **路由器训练（Router training）。**元智能体选择由哪个子智能体处理任务。这是一个包含 N 个分散子智能体和一个集中路由器的 MARL 问题。MAPPO 适用。
2. **角色涌现（Role emergence）。**在生成式智能体模拟中，训练智能体随时间承担互补角色，本质上是 MARL 问题。QMIX 风格的价值分解从构造上强制互补。
3. **多智能体工具使用（Multi-agent tool use）。**当智能体共享工具并竞争预算时，通过 CTDE 训练，可获得遵守资源约束且可部署的局部策略。

实际注意事项：2026 年，多数生产级 LLM 智能体系统通过提示设定策略，而非训练。只有具备（a）大量交互数据、（b）明确奖励信号、（c）投入训练基础设施的意愿时，才适合引入 MARL。

### 超越强化学习的 CTDE 设计模式（CTDE as a design pattern beyond RL）

即使不训练，CTDE 也是有用的架构模式：

- 在*设计*阶段，假设具有完整团队可见性。
- 在*运行时*，强制分散执行：每个智能体只看到 `o_i`。

这一模式迫使你显式维护逐智能体状态，并提前思考部分可观测性。许多生产多智能体系统暗中假设处处共享状态；CTDE 规范能防止这种情况。

### 非平稳性问题（The non-stationarity problem）

多个智能体同时学习时，每个智能体的环境（包含其他智能体的策略）都非平稳。经典单智能体强化学习的证明不再成立。本课的 MARL 算法都在处理这一问题：

- MADDPG：全局评论家看到所有动作，因此其价值估计是平稳的。
- QMIX：价值分解将学习移到最优性定义明确的联合 Q 空间。
- MAPPO：集中式价值函数抑制其他智能体策略变化引起的方差。

在 LLM 智能体系统中，非平稳性表现为：“我的智能体上个月还正常，现在上游另一个智能体变了，我的就行为异常。”使用 CTDE 训练 MARL 是有理论依据的修复；提示层面的修复更快，但不够持久。

### 本课不涵盖的内容（What this lesson does NOT cover）

实际网络训练属于第 09 阶段。本课构建脚本化策略版本，不进行梯度更新，演示 CTDE、价值分解和集中式价值模式。目的是在使用完整 MARL 库（PyMARL、MARLlib、RLlib multi-agent）前，先内化这些模式。

```figure
sw-ctde
```

## 动手构建（Build It）

`code/main.py` 在微型双智能体合作网格世界中实现了三个模式演示：

- 环境：4×4 网格上的 2 个智能体、一个奖励点。任一智能体到达奖励点，则奖励 = 1，任务结束。
- `IndependentAgents`：每个智能体将其他智能体视为环境。作为基线。
- `MADDPGStyle`：集中式评论家计算联合价值，行动者策略据此更新。采用脚本化策略改进。
- `QMIXStyle`：使用单调混合器进行价值分解。
- `MAPPOStyle`：集中式价值函数；策略相对共享基线更新。

四种方法运行相同回合，报告到达目标的平均步数。CTDE 变体收敛到比独立基线更短的路径。

运行：

```
python3 code/main.py
```

预期输出：独立智能体平均需要约 6 步；CTDE 变体趋于约 3.5 步（4×4 网格的最优值为 3）。即使使用脚本化策略，仍能体现模式差异。

## 实际使用（Use It）

`outputs/skill-marl-picker.md` 是为给定多智能体任务选择 MARL 算法的技能，考虑合作或竞争、同构或异构、动作空间类型、规模及奖励信号。

## 交付上线（Ship It）

生产环境中 MARL 并不常见。确实使用时：

- **从 MAPPO 开始（Start with MAPPO）。**2022 年论文确立了它的基线地位；先复现它，可省去数周追逐花哨方法的时间。
- **记录每个智能体的观察与动作流（Log every agent's observation and action stream）。**没有逐智能体轨迹，调试 MARL 几乎无望。
- **分离训练代码与执行代码（Separate training code from execution code）。**CTDE 是一项规范；让执行路径真正只能看到 `o_i`。
- **奖励塑形警告（Reward shaping warning）。**MARL 对奖励设计极其敏感。塑形中的一个协调漏洞就会被智能体学会利用。运行对抗测试。
- **对于 LLM 智能体（For LLM agents）**，先考虑提示层面的策略。只有交互数据、奖励信号、基础设施全部齐备时，才投入 MARL 训练。

## 练习（Exercises）

1. 运行 `code/main.py`。测量独立智能体与 MAPPO 风格智能体到达目标的步数差距。在 6×6 网格上，差距扩大还是缩小？
2. 实现竞争变体：两个智能体、一个奖励点，只有先到达者获得奖励。哪种模式能自然处理竞争？历史上是 MADDPG。
3. 阅读 MADDPG（arXiv:1706.02275）第 3 节。用你自己的表述，在伪代码中以符号形式实现精确的评论家更新规则。
4. 阅读 MAPPO（arXiv:2103.01955）。作者为何认为，集中式价值 + PPO 能在其基准上击败离策略 MARL？列出三项最有力的主张。
5. 将 CTDE 作为设计模式，应用到假想的 LLM 智能体系统（例如研究智能体 + 摘要器 + 编码器）。哪些联合信息在设计时可用，而运行时不可用？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 多智能体强化学习（MARL） | “Multi-Agent RL” | 用于多智能体系统的强化学习。 |
| 集中训练、分散执行（CTDE） | “Centralized Training, Decentralized Execution” | 利用全局信息训练；以局部策略部署。 |
| MADDPG | “多智能体 DDPG（Multi-Agent DDPG）” | 使用逐智能体评论家的 CTDE；评论家看到所有观察与动作。 |
| QMIX | “价值分解” | 对逐智能体 Q 做单调混合。用于合作环境。 |
| MAPPO | “多智能体 PPO（Multi-Agent PPO）” | 具有集中式价值函数的 PPO。2026 年默认基线。 |
| 价值分解（Value decomposition） | “各个 Q 之和” | 将联合 Q 表示为逐智能体 Q 的单调函数。 |
| 非平稳性（Non-stationarity） | “移动目标” | 其他智能体学习时，每个智能体的环境随之变化。MARL 的核心问题。 |
| 同策略 / 离策略（On-policy / off-policy） | “从当前策略 / 回放中学习” | PPO 是同策略（MAPPO）；DDPG 和 Q-learning 是离策略。 |
| SMAC | “StarCraft Multi-Agent Challenge” | 合作式微操基准，QMIX 最初成长的试验场。 |

## 延伸阅读（Further Reading）

- [Lowe 等：用于混合合作竞争环境的多智能体行动者评论家（Multi-Agent Actor-Critic for Mixed Cooperative-Competitive Environments）](https://arxiv.org/abs/1706.02275)：MADDPG；NeurIPS 2017。
- [Rashid 等：QMIX：深度多智能体强化学习的单调价值函数分解（Monotonic Value Function Factorisation for Deep Multi-Agent Reinforcement Learning）](https://arxiv.org/abs/1803.11485)：QMIX；ICML 2018。
- [Yu 等：PPO 在合作多智能体游戏中的意外有效性（The Surprising Effectiveness of PPO in Cooperative Multi-Agent Games）](https://arxiv.org/abs/2103.01955)：MAPPO；NeurIPS 2022。
- [BAIR 关于 MAPPO 的博客文章（BAIR blog post on MAPPO）](https://bair.berkeley.edu/blog/2021/07/14/mappo/)：以易读方式介绍 MAPPO 结果。
- [SMAC 仓库（SMAC repository）](https://github.com/oxwhirl/smac)：StarCraft Multi-Agent Challenge。
