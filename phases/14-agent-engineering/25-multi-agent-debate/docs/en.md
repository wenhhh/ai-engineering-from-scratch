# 多智能体辩论与协作（Multi-Agent Debate and Collaboration）

> Du 等（ICML 2024，“心智社会”，Society of Minds）运行 N 个模型实例，各自独立提出答案，再在 R 轮中相互批评并收敛。这能改善事实性、规则遵循和推理。稀疏拓扑的词元成本优于全连接网状拓扑。

**Type:** Learn + Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 12（工作流模式），第 14 阶段 · 05（自我改进（Self-Refine）与 CRITIC）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 解释辩论协议：N 个提议者、R 轮，收敛到共同答案。
- 描述辩论为什么改善事实性、规则遵循和推理。
- 解释稀疏拓扑：并非每个辩论者都需要看到所有其他辩论者。
- 基于脚本化 LLM，使用标准库实现全连接与稀疏两种辩论，测量词元成本与准确率。

## 问题（The Problem）

Self-Refine（第 05 课）由一个模型批评自己，有群体思维风险。CRITIC（第 05 课）通过外部工具为批评提供依据，但工具并不总是可用。辩论引入第三种方式：多个实例、交叉批评，通过分歧达成收敛。

## 概念（The Concept）

### 心智社会（Society of Minds，Du 等，ICML 2024）

- N 个模型实例独立回答同一个问题。
- 在 R 轮中，每个模型阅读并批评其他模型的提议。
- 模型根据批评更新答案。
- R 轮后返回收敛答案。

原始实验出于成本考虑使用 N=3、R=2。在困难问题上，更多智能体和更多轮次可提高准确率，包括 MMLU、GSM8K、国际象棋走法合法性和传记生成。

跨模型组合优于单模型辩论：ChatGPT + Bard 共同使用 > 单独使用任一模型。

### 稀疏拓扑（Sparse topology）

《通过稀疏通信拓扑改进多智能体辩论》（Improving Multi-Agent Debate with Sparse Communication Topology，arXiv:2406.11776，2024–2025）表明，全连接辩论并非总是最优。稀疏拓扑（星形、环形、中心辐射式）可以更低词元成本达到相当准确率。每个辩论者只能看到部分同伴。

这意味着：

- 全连接 N=5、R=3：5 × 3 = 15 次提议，每次阅读 4 个同伴的提议，共 60 次批评操作。
- 星形 N=5、R=3（1 个中心 + 4 个辐射节点）：15 次提议，辐射节点只阅读中心，共 12 次批评操作。

### 辩论何时有帮助（When debate helps）

- **事实性（Factuality）。** N 个独立提议通过交叉核查减少幻觉。
- **规则遵循（Rule-following）。** 在国际象棋走法合法性任务中，一个模型漏掉规则，其他模型可以发现。
- **开放式推理（Open-ended reasoning）。** 从多个角度分析问题，逐步逼近正确答案。

### 辩论何时有害（When debate hurts）

- **延迟敏感的用户体验（Latency-sensitive UX）。** N × R 串行轮次带来的延迟可能超出预算。
- **成本敏感的规模化场景（Cost-sensitive scale）。** 每个问题需要 N × R 的词元消耗。
- **简单事实查询（Simple factual lookups）。** 一次查询比五次辩论便宜。

### 2026 年实际应用（2026 practical instantiations）

- **Anthropic 编排器与工作者（Orchestrator-workers）**（第 12 课）：带综合步骤的辩论变体。
- **LangGraph 监督者（Supervisor）**（第 13 课）：中央路由器与专家智能体可将辩论实现为一个节点。
- **OpenAI Agents SDK**（第 16 课）：智能体通过来回交接进行迭代批评。
- **多智能体评估（Multi-agent evals）**：将辩论与评估器优化器结合，获得评估信号。

### 模式的失效点（Where this pattern goes wrong）

- **收敛塌缩（Convergence collapse）。** 所有智能体都收敛到第一个错误答案。通过强制分歧轮次缓解。
- **中心故障（Hub failure）。** 星形拓扑中，错误的中心会影响所有节点。应轮换中心或采用多个中心。
- **提示词同质化（Prompt homogenization）。** 所有智能体用同一提示词，产出相同答案。应使用多样化提示词和/或模型。

```figure
debate-converge
```

## 动手实现（Build It）

`code/main.py` 使用标准库实现辩论：

- `Debater` 类：脚本化 LLM，每个辩论者有各自的观点漂移。
- `FullMeshDebate` 与 `SparseDebate` 运行器。
- 三个问题：事实、规则、推理各一个。
- 指标：收敛答案、收敛所需轮次、批评操作总数。

运行：

```
python3 code/main.py
```

输出：各协议的准确率与成本；稀疏拓扑以更低成本在 2/3 的问题上达到全连接水平。

## 实际应用（Use It）

- **Anthropic 编排器与工作者（Orchestrator-workers）**：适合 2–3 个工作者的简单辩论。
- **LangGraph**：适合带检查点的有状态多轮辩论。
- **自定义实现（Custom）**：适合研究或专门的正确性保证。

## 交付成果（Ship It）

`outputs/skill-debate.md` 搭建多智能体辩论骨架，可配置拓扑、N、R 和收敛规则。

## 练习（Exercises）

1. 实现“强制分歧”规则：第 1 轮每个辩论者必须提出不同提议。测量对收敛速度的影响。
2. 添加置信度加权汇总：辩论者返回（答案、置信度），汇总器按置信度加权。有帮助吗？
3. 将一个“智能体”换成观点不同的另一种脚本化 LLM。异质性能提高准确率吗？
4. 在三个问题上测量全连接与稀疏拓扑的词元成本，绘制成本与准确率关系。
5. 阅读 Society of Minds 论文。将实验程序扩展到 N=5、R=3。什么会出问题？什么变好了？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 辩论（Debate） | “多智能体批评” | N 个提议者，R 轮交叉批评，最终收敛 |
| 全连接网状拓扑（Full mesh） | “人人阅读所有人” | 每轮每个辩论者阅读所有同伴 |
| 稀疏拓扑（Sparse topology） | “有限同伴视野” | 辩论者只阅读部分同伴 |
| 中心辐射式（Hub-and-spoke） | “星形拓扑” | 一个中心辩论者，N-1 个辐射节点只阅读中心 |
| 收敛（Convergence） | “达成一致” | 辩论者收敛到共同答案 |
| 心智社会（Society of Minds） | “Du 等的辩论论文” | ICML 2024 多智能体辩论方法 |

## 延伸阅读（Further Reading）

- [Du 等，心智社会（Society of Minds，arXiv:2305.14325）](https://arxiv.org/abs/2305.14325)：经典多智能体辩论
- [稀疏通信拓扑（Sparse Communication Topology，arXiv:2406.11776）](https://arxiv.org/abs/2406.11776)：稀疏拓扑结果
- [Anthropic《构建有效的智能体》（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：作为辩论变体的编排器与工作者
- [Madaan 等，Self-Refine（arXiv:2303.17651）](https://arxiv.org/abs/2303.17651)：单模型自我批评对应方案
