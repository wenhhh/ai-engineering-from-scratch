# 投票、自一致性与辩论拓扑（Voting, Self-Consistency, and Debate Topology）

> 最便宜的聚合是采样 N 个独立智能体并多数投票。Wang 等人 2022 年的自一致性（Self-consistency）对一个模型采样 N 次。多智能体通过**异构（Heterogeneous）**成员扩展它，使用不同模型、提示词、温度、上下文摆脱单一模型生态。除多数投票外，辩论拓扑也重要：MultiAgentBench（arXiv:2503.01935，ACL 2025）评估星形/链/树/图协调，发现**图最适合研究**，约 4 个智能体以上出现“协调税（Coordination tax）”。AgentVerse（ICLR 2024）记录志愿行为和从众行为两种涌现模式，从众既是达成共识的功能，也是群体思维（Groupthink，第 24 课）风险。本课映射拓扑空间、构建各变体并测量协调税。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 07 心智社会与辩论（Society of Mind and Debate）, Phase 16 · 14 共识与拜占庭容错（Consensus and BFT）
**Time:** ~75 分钟

## 问题（Problem）

辩论能提高准确率（Du 等，arXiv:2305.14325），也可能降低。是否有益取决于四项结构选择：

1. 谁与谁交流，即拓扑。
2. 多少轮（Du 2023：轮数和智能体数各自独立重要）。
3. 是否异构，不同基础模型打破单一生态。
4. 是否有对抗声音，即钢人化（Steel-manning）还是稻草人化（Straw-manning）。

给任务附加“运行 5 个智能体再投票”的团队常比单智能体退步。失败并非随机，而是随拓扑与异构性变化。本课就是拓扑地图。

## 概念（Concept）

### 自一致性：单模型基线（Self-consistency, the single-model baseline）

Wang 等人 2022 年《自一致性改善思维链推理》在温度 > 0 时对同模型采样 N 次，按推理路径答案多数投票。GSM8K 上 N=40 相比单次贪心解码有显著收益。自一致性是多智能体投票的单智能体前身。

局限：只用一个基础模型，错误天然相关。模型有系统偏差时，N 个样本都共享它。

### 多智能体投票：异构扩展（Multi-agent vote, the heterogeneous extension）

以 N 个*不同*智能体替代 N 次采样：不同基础模型（Claude、GPT、Llama）、提示词、工具访问。收益是错误不相关；代价是各智能体成本不同，协调增加开销。

2026 年异构辩论的典型名称是 **A-HMAD**，对抗异构多智能体辩论（Adversarial Heterogeneous Multi-Agent Debate）。尚未普遍采用，但论文用它表示“不同模型辩论，减少单一生态坍塌的相关错误”。

### 四种拓扑（The four topologies）

```
星形                链形                树形                图

    ┌─A─┐           A─B─C─D         ┌──A──┐              A───B
    │   │                           │     │              │ × │
    B   C                           B     C              D───C
    │   │                          / \   / \
    D   E                         D   E F   G           （全连接）
```

星形（Star）：一个枢纽，其余只与枢纽交流，相当于无旁路通信的监督者-工作者。
链（Chain）：线性，每个智能体看前一个输出，类似流水线。
树（Tree）：层级，层级智能体系统使用（第 06 课）。
图（Graph）：任意互通，包括全连接团和任意 DAG。

### 协调税（The coordination tax，MultiAgentBench）

MultiAgentBench（MARBLE，ACL 2025，arXiv:2503.01935）在研究、编码、规划等任务套件中测试星形、链、树、图。关键实测结果：

- **图**在研究任务胜出，信息任意互通，智能体可互相批评。
- **星形**在快速事实回答胜出，枢纽过滤并汇总。
- **链**在逐步流水线、分阶段细化中胜出。
- 图拓扑超过约 4 个智能体出现**协调税**，墙钟时间与词元成本比质量增长更快。

4 智能体上限是经验性的，不是根本限制。它反映 2026 年 LLM 上下文容量：每个上下文被同伴输出填满，当人人可见彼此时，加入第 N+1 个的边际价值下降。

### 多智能体辩论策略（Multi-Agent Debate Strategies，“Should we be going MAD?”）

arXiv:2311.17371 是 2023 年 MAD 策略综述。经他人复现的关键发现：*结构类似*自一致性（独立采样 + 聚合）的 MAD 变体，在相同预算下常不如自一致性。真正异构且具有对抗结构（一个智能体反对）时，MAD 帮助最大。

### AgentVerse 涌现模式（AgentVerse emergent patterns）

AgentVerse（ICLR 2024，https://proceedings.iclr.cc/paper_files/paper/2024/file/578e65cdee35d00c708d4c64bce32971-Paper-Conference.pdf）记录了即使未显式设计也会涌现的两种行为：

- **志愿（Volunteer）。** 智能体主动提供帮助：“我可以接下一步。”它把子任务分配给最有能力的智能体，因而有益。
- **从众（Conformity）。** 即使批评者错误，智能体也调整立场迎合它，是辩论中的迎合（第 14 课）。

从众解释了为何辩论直到一致会奖励强势者。有界轮数与独立裁判可缓解。

### 异构性：真正影响准确率的维度（Heterogeneity: the actual knob that moves accuracy）

2024–2026 年实践文献呈现规律：把 N 个智能体之一换为不同基础模型，比把 N 增加 1 更能提升准确率。直觉在于单一生态：一个新的独立错误来源比额外相关样本更值钱。

归根结底，异构性胜过数量。多数有清晰真实基准的任务中，三种不同模型胜过一个模型的五份副本。

### 陪审团方法（Jury methods）

Sibyl 框架（Minsky-LLM 文献引用）形式化“陪审团（Jury）”：少量专职智能体每阶段投票细化答案。不同于普通多数投票，陪审团有角色：一个交叉质询，一个提供上下文，一个评估可信性。它介于普通投票（便宜，易单一生态）与完整 MAD（昂贵，易从众）之间。

### 辩论投票何时占优（When vote-with-debate dominates）

- 问题有真实基准（事实、数学、代码行为），投票收敛有意义。
- 智能体可访问不同来源或工具，能够异构。
- 轮数有界，通常 2-3，且有独立裁判或验证者。
- 预算支持 3-5 个智能体，图拓扑超过 5-7 个时协调税占主导。

### 辩论投票何时有害（When vote-with-debate hurts）

- 问题偏观点，收敛到最自信而非最正确答案。
- 同基础模型，单一生态使共识无意义。
- 轮数无界，从众总会胜出。
- 任务简单，单智能体 N=5 自一致性更便宜且同样准确。

```figure
sw-debate-topology
```

## 动手实现（Build It）

`code/main.py` 实现：

- `run_star(agents, hub, question)`：枢纽轮询各工作者并聚合。
- `run_chain(agents, question)`：顺序细化。
- `run_tree(root, children, question)`：深度 2 聚合的层级结构。
- `run_graph(agents, question, rounds)`：有界轮数全互连辩论。
- 脚本化异构性调节：每个智能体用 `error_bias` 表示系统性错误。
- 测量框架在 N=3、5、7 运行各拓扑，报告 (accuracy, total_tokens, wallclock_simulated)。

运行：

```
python3 code/main.py
```

预期输出：拓扑 × N →（准确率、词元、延迟）表。研究型任务 N=3-5 时图胜出，快速事实任务星形胜出；N=7 的图体现协调税，延迟比准确率增长更快。

## 实际应用（Use It）

`outputs/skill-topology-picker.md` 读取任务描述，推荐拓扑（星形/链/树/图）、N（智能体数）、异构性配置（使用哪些基础模型）与轮数上限。

## 交付成果（Ship It）

任何集成都应：

- 从强基础模型的 **N=5 自一致性**开始，作为便宜基线。
- 准确率重要时升级 **N=3 异构投票**，测量差值。
- 只有任务有结构（研究、多步）且轮数可控时，才升级**辩论拓扑**。
- 始终记录少数簇。少数持续正确是多样性信号。
- 同时测试墙钟时间、词元与准确率。“10 倍成本换更高准确率”是业务决策。

## 练习（Exercises）

1. 运行 `code/main.py`，画图拓扑协调税曲线：准确率对 N、词元对 N。拐点在哪个 N？
2. 实现 A-HMAD，三个智能体刻意有不同偏差。第 14 课单一生态攻击下，全相同偏差基线与 A-HMAD 相比如何？
3. 在图中增加不投票、只评最终共识的裁判角色，会改变涌现从众吗？
4. 阅读 AgentVerse（ICLR 2024），指出实现中最明显的涌现行为。能改提示词引出相反行为吗？
5. 阅读 MultiAgentBench（arXiv:2503.01935）第 4 节拓扑实验，用自己的测试框架在文中一项任务复现“图最适合研究”。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 自一致性（Self-consistency） | “采样 N 次，投票” | Wang 2022，单模型温度>0 采样 N 次，按推理路径多数投票。 |
| 异构性（Heterogeneity） | “不同模型” | 不同基础模型或提示词族的集成，打破单一生态。 |
| 多智能体辩论（Multi-agent debate，MAD） | “多智能体辩论” | 多轮互评的总称，见 Du 2023。 |
| 对抗异构 MAD（A-HMAD） | “对抗异构多智能体辩论” | 强调不同模型与对抗结构的 MAD 变体。 |
| 拓扑（Topology） | “谁与谁交流” | 星形、链、树、图，决定信息流。 |
| 协调税（Coordination tax） | “收益递减” | 图上约 4 个以上智能体，成本比质量增长更快。 |
| 志愿行为（Volunteer behavior） | “主动帮助” | AgentVerse 涌现模式，智能体主动接一步。 |
| 从众行为（Conformity behavior） | “压力下同意” | AgentVerse 涌现模式，智能体迎合批评者。 |
| 陪审团（Jury） | “小型专职小组” | Sibyl 式角色集成：质询者、上下文提供者、评分者。 |

## 延伸阅读（Further Reading）

- [Wang 等：自一致性改善思维链推理（Self-Consistency Improves Chain of Thought Reasoning）](https://arxiv.org/abs/2203.11171)：单模型基线
- [Du 等：多智能体辩论改善事实性与推理（Improving Factuality and Reasoning via Multiagent Debate）](https://arxiv.org/abs/2305.14325)：智能体数和轮数各自独立重要
- [MultiAgentBench / MARBLE](https://arxiv.org/abs/2503.01935)：拓扑基准，图最适合研究，链最适合流水线
- [我们应该采用 MAD 吗（Should we be going MAD?）](https://arxiv.org/abs/2311.17371)：策略综述，相同预算 MAD 常输给自一致性
- [AgentVerse（ICLR 2024）](https://proceedings.iclr.cc/paper_files/paper/2024/file/578e65cdee35d00c708d4c64bce32971-Paper-Conference.pdf)：志愿与从众涌现模式
- [MARBLE 仓库（repo）](https://github.com/ulab-uiuc/MARBLE)：基准参考实现
