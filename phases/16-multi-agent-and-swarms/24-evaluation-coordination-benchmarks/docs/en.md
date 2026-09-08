# 评估与协调基准（Evaluation and Coordination Benchmarks）

> 五个 2025–2026 年基准覆盖多智能体评估领域。**MultiAgentBench / MARBLE**（ACL 2025，arXiv:2503.01935）使用里程碑 KPI 评估星形 / 链形 / 树形 / 图拓扑；**图拓扑最适合研究**，认知规划增加约 3% 的里程碑达成率。**COMMA** 评估多模态非对称信息协调；包括 GPT-4o 在内的最先进模型都难以击败随机基线。**MedAgentBoard**（arXiv:2505.12371）覆盖四类医疗任务，常发现多智能体并不优于单个 LLM。**AgentArch**（arXiv:2509.10769）评测结合工具使用、记忆和编排的企业智能体架构。**SWE-bench Pro**（[arXiv:2509.16941](https://arxiv.org/abs/2509.16941)）包含 41 个仓库中的 1865 个问题，涵盖商业应用、B2B 服务和开发者工具；前沿模型在 Pro 上约为 23%，在 Verified 上为 70% 以上，为数据污染提供现实检验。据报告，Claude Opus 4.7（2026 年 4 月）采用显式智能体团队协调，在 Pro 上达到 **64.3%**（尚无 Anthropic 一手来源发布，应视为初步结果）；Verdent（智能体支架）在 Verified 上达到 **76.1% pass@1**（[Verdent 技术报告](https://www.verdent.ai/blog/swe-bench-verified-technical-report)）。**AAAI 2026 Bridge Program WMAC**（https://multiagents.org/2026/）是 2026 年的社区焦点。本课基于 MARBLE 指标，遍历拓扑与指标组合，并确立“仅通过 SWE-bench Verified 不构成泛化证据”的原则。

**Type:** Learn
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 15 投票与辩论拓扑（Voting and Debate Topology）, Phase 16 · 23 失败模式（Failure Modes）
**Time:** ~75 分钟

## 问题（Problem）

论文声称“我们的多智能体系统更好”时，应问：比谁好、在哪些任务上、如何测量？2023–2024 年的多智能体评估十分混乱，每个人都选择自己的指标、基线和任务集。2025–2026 年的基准带来了规范。

没有共享基准，就无法有意义地比较两个多智能体系统。更糟的是，没有留出基准，前沿模型可能发生数据污染。到 2025 年中，SWE-bench Verified 已部分进入训练语料，前沿模型分数虚高；Pro 被设计为未受污染的现实检验。

本课列举 2026 年五个典型基准，指出各自测量内容，并教你审慎阅读基准主张。

## 概念（Concept）

### MultiAgentBench（MARBLE）：ACL 2025

arXiv:2503.01935。在研究、编码和规划任务上评估四种协调拓扑（星形、链形、树形、图）。基于里程碑的 KPI 追踪部分进展，而不只看最终成功。

测量结果：

- **图（Graph）**拓扑最适合研究场景，支持任意节点间相互批评。
- **链形（Chain）**最适合逐步精化的编码任务。
- **星形（Star）**最适合快速事实汇总。
- 图拓扑超过约 4 个智能体后，会出现**协调税（Coordination tax）**。
- **认知规划（Cognitive planning）**在各拓扑中增加约 3% 的里程碑达成率。

适用场景：希望在同等条件下比较协调拓扑。MARBLE 仓库（https://github.com/ulab-uiuc/MARBLE）提供评估器。

### COMMA：多模态非对称信息（multimodal asymmetric information）

覆盖智能体具有不同观察模态、必须在无法完整共享信息的条件下协调的任务。报告结果令人不安：包括 GPT-4o 在内的前沿模型，在 COMMA 的智能体间协作上难以击败**随机基线（random baseline）**。这表明多智能体模态训练和评估不足：LLM 对单模态合作处理尚可，多模态协调却崩溃。

适用场景：系统涉及多模态或非对称信息协调。COMMA 的无显著效果结果提醒我们：先测量，再作出主张。

### MedAgentBoard：领域压力测试（domain stress test）

arXiv:2505.12371。四类医疗任务：诊断、治疗规划、报告生成、患者沟通。比较多智能体、单个 LLM 和传统规则系统。

发现：多智能体在多数类别上并不优于单个 LLM。其优势范围有限：子任务可以明确分离时，任务分解有帮助（诊断 + 治疗）；协调开销超过专业化收益时，则有害（报告生成）。

适用场景：你的领域有明确的单 LLM 基线。如果 MedAgentBoard 的经验可泛化，许多拟议的多智能体系统就是过度设计。

### AgentArch：企业架构（enterprise architectures）

arXiv:2509.10769。将工具使用、记忆、编排层叠组合的企业场景。基准隔离各层贡献：增加工具帮助多少？增加记忆呢？增加多智能体编排呢？

适用场景：你正在设计企业智能体技术栈，需要证明每层的必要性。AgentArch 帮助避免购买无法衡量价值的功能。

### SWE-bench Pro：现实检验（the reality check）

arXiv:2509.16941。41 个仓库中的 1865 个问题，涵盖商业应用、B2B 服务和开发者工具。针对更晚的训练截止时间，设计为**未受污染（uncontaminated）**。前沿模型在 Pro 上约为 23%，在 Verified 上为 70% 以上。这个差距就是污染信号。

2026 年 4 月分数：
- Claude Opus 4.7 在 Pro 上：**64.3%**（据报告采用显式智能体团队协调；尚无 Anthropic 一手来源发布，应视为初步结果）。
- Verdent（智能体支架）在 Verified 上：**76.1% pass@1**（[技术报告](https://www.verdent.ai/blog/swe-bench-verified-technical-report)）。
- 不使用智能体支架时，前沿模型在 Pro 上的原始分数约为 23–35%（[SWE-bench Pro 论文](https://arxiv.org/abs/2509.16941)）。

启示：“我们超越了 SWE-bench Verified”不再构成能力证据。Pro 是当前的准入测试。智能体团队支架在 Pro 上带来可测量收益（约 30–40 个百分点的差距），是 2026 年支持多智能体协调的最有力实证论据之一。

### AAAI 2026 WMAC

AAAI 2026 Bridge Program：多智能体协调研讨会（Workshop on Multi-Agent Coordination，https://multiagents.org/2026/）。这是 2026 年多智能体 AI 研究的社区焦点。录用论文和研讨会论文集是评估新方法的典型场所；生产决策时，相比 arXiv 预印本，应优先参考 WMAC 录用的主张。

### 审慎阅读基准主张：2026 年检查清单（Read benchmark claims skeptically — the 2026 checklist）

有人声称取得多智能体结果时：

1. **哪个基准、哪个划分（Which benchmark, which split）？**SWE-bench Verified 与 Pro 差别很大。若数字来自不对应的划分，便毫无价值。
2. **污染检查（Contamination check）。**基准是否在模型训练截止时间之后发布？否则谨慎看待。
3. **基线比较（Baseline comparison）。**与单 LLM、随机、既有多智能体工作比较，而非“与同一系统未调优的版本比较”。
4. **统计显著性（Statistical significance）。**N 次试验、p 值、置信区间。前沿模型方差较高，单次运行会误导。
5. **任务多样性（Task diversity）。**一个任务还是多个？泛化对生产很重要。
6. **成本披露（Cost disclosure）。**每任务 token 数、实际耗时。以 20 倍成本取得 90% 的方案，是商业决策，不是能力主张。

### 这些基准都未能充分测量的内容（What none of the benchmarks measure well）

- **长程协调（Long-horizon coordination）。**实际持续数天的交互。当前所有基准运行时间都较短。
- **对抗韧性（Adversarial resilience）。**一个智能体恶意行动或被攻陷时会怎样？
- **部署中的漂移（Drift under deployment）。**基准静态，生产分布会变化。
- **成本归一化性能（Cost-normalized performance）。**多数基准报告原始准确率，而非每美元准确率。

围绕真正关心的维度，构建自己的内部基准，往往是正确做法。

```figure
a5-bench-gap
```

## 动手构建（Build It）

`code/main.py` 是一个非交互式演示：

- 在玩具任务上模拟 3 个多智能体系统。
- 分别计算 MARBLE 风格的里程碑指标。
- 从“训练”集中留出任务，执行污染检查。
- 显式与随机基线比较。
- 打印基准主张评分卡。

运行：

```bash
python3 code/main.py
```

预期输出：系统评分卡，包含原始准确率、里程碑达成率、单任务成本、相对随机基线的差值，以及污染检查说明。

## 实际使用（Use It）

`outputs/skill-benchmark-reader.md` 阅读任何多智能体基准主张，并应用审查清单。输出：评级与限制说明。

## 交付上线（Ship It）

生产评估规范：

- **构建内部基准（Build an internal benchmark）**，反映真实生产分布。公共基准能提供信息，但不能替代它。
- 每次比较都**加入随机基线（Include a random baseline）**。协调任务中如果无法大幅超越随机，任务可能定义不当。
- **报告准确率时同时报告成本（Report cost alongside accuracy）。**token 成本和实际耗时。运维团队两者都需要。
- **每季度重建基准（Rebuild the benchmark quarterly）。**生产分布会变化；过时基准会误导。
- **避免对公开基准过拟合（Avoid published-benchmark overfitting）。**如果团队专门优化 SWE-bench Pro 分数，生产表现会退化。

## 练习（Exercises）

1. 运行 `code/main.py`。找出三个模拟系统中，每个里程碑成本最优的系统。它是否也是原始准确率最高的系统？
2. 阅读 MultiAgentBench（arXiv:2503.01935）。针对你的任务领域，判断 MARBLE 会推荐四种拓扑中的哪一种。用论文结果说明理由。
3. 阅读 SWE-bench Pro 论文。具体是什么让它抗污染？同样的技术能否用于你关心的其他基准？
4. 阅读 COMMA 关于多模态协调的发现。设计一个可加入内部基准的简单多模态协调任务。什么算有用的信号？
5. 将基准主张检查清单应用到一篇近期多智能体论文的主要结果。你会给该主张什么评级？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| MARBLE | “MultiAgentBench” | ACL 2025；采用里程碑 KPI 的星形 / 链形 / 树形 / 图拓扑。 |
| COMMA | “多模态基准” | 多模态非对称信息协调；前沿模型难以超越随机。 |
| MedAgentBoard | “领域压力测试” | 四类医疗任务；常发现多智能体并不优于单 LLM。 |
| AgentArch | “企业基准” | 工具 + 记忆 + 编排层叠组合。 |
| SWE-bench Pro | “抗污染” | 1865 个问题、41 个仓库；约 23%，相较 Verified 的 70% 以上（污染信号）。 |
| 里程碑达成率（Milestone achievement） | “部分得分” | 奖励进展、而非仅奖励最终成功的基准。 |
| 污染（Contamination） | “基准泄漏进训练” | 发布后，基准逐渐进入训练语料，分数虚高。 |
| WMAC | “AAAI 2026 Bridge Program” | 多智能体协调研讨会；社区焦点。 |

## 延伸阅读（Further Reading）

- [MultiAgentBench / MARBLE](https://arxiv.org/abs/2503.01935)：采用里程碑 KPI 的拓扑基准。
- [MARBLE 仓库（repository）](https://github.com/ulab-uiuc/MARBLE)：参考实现。
- [MedAgentBoard](https://arxiv.org/abs/2505.12371)：领域压力测试；多智能体往往并不占优。
- [AgentArch](https://arxiv.org/abs/2509.10769)：企业智能体架构。
- [SWE-bench 排行榜（leaderboards）](https://www.swebench.com/)：前沿模型的 Verified 与 Pro 分数。
- [AAAI 2026 WMAC](https://multiagents.org/2026/)：2026 年社区焦点。
