# 编排模式：监督者、群体与层级式（Orchestration Patterns: Supervisor, Swarm, Hierarchical）

> 2026 年框架中反复出现四种编排模式：监督者与工作者、群体 / 点对点、层级式、辩论。Anthropic 的建议是：“关键在于构建适合你需求的系统。”从简单方案开始，只有单个智能体加五种工作流模式不足时，才增加拓扑。

**Type:** Learn + Build
**Languages:** Python（标准库）
**Prerequisites:** 第 14 阶段 · 12（工作流模式），第 14 阶段 · 25（多智能体辩论）
**Time:** 约 60 分钟

## 学习目标（Learning Objectives）

- 列出四种反复出现的编排模式及各自适用条件。
- 描述 2026 年 LangChain 的建议：基于工具调用的监督，与监督者库的比较。
- 解释 Anthropic 的“构建合适系统”原则，以及它如何约束拓扑选择。
- 基于同一个脚本化 LLM，使用标准库实现四种模式。

## 问题（The Problem）

团队往往还没有明确需求，就先采用多智能体。四种模式在各框架中反复出现；认识它们之后，就能选择合适的模式，也能判断是否根本不需要多智能体拓扑。

## 概念（The Concept）

### 监督者与工作者（Supervisor-worker）

- 中央路由 LLM 将任务分派给专家智能体。
- 决定返回自身循环、交接给专家，或终止。
- 专家之间不直接交流，所有路由都经过监督者。

对应框架：LangGraph `create_supervisor`、Anthropic 编排器与工作者、CrewAI 层级流程（Hierarchical Process）。

**2026 年 LangChain 建议：** 通过直接工具调用实现监督，而不是使用 `create_supervisor`。这提供更精细的上下文工程控制，由你决定每位专家究竟看到什么。

### 群体 / 点对点（Swarm / peer-to-peer）

- 智能体通过共享工具接口直接交接。
- 没有中央路由器。
- 比监督者延迟低，因为跳数更少。
- 更难分析，因为没有单一控制点。

对应框架：LangGraph 群体拓扑，OpenAI Agents SDK 交接（当所有智能体都可交给其他所有智能体时）。

### 层级式（Hierarchical）

- 监督者管理子监督者，子监督者管理工作者。
- 在 LangGraph 中实现为嵌套子图，在 CrewAI 中实现为嵌套团队。
- 可扩展到大量智能体，代价是运维复杂度。

需要它的条件：单个监督者的上下文预算无法容纳所有专家的描述。

### 辩论（Debate）

- 并行提议者，加迭代交叉批评（第 25 课）。
- 严格说更接近验证而非编排，但框架中会将其列为拓扑选择。

### 自主团队与确定性流程（Autonomous crews vs deterministic flows）

CrewAI 将两种部署模式正式区分：

- **Flow**：确定性的事件驱动自动化，推荐作为生产起点。
- **Crew**：基于角色的自主协作。

这与上面四种模式相互独立，但可以映射到拓扑：Flow 通常采用监督者或层级式；Crew 通常采用带 LLM 路由器的监督者。

### Anthropic 的建议（Anthropic's guidance）

“在 LLM 领域取得成功，不在于构建最复杂的系统，而在于构建适合自身需求的系统。”

决策顺序：

1. 单个智能体 + 工作流模式（第 12 课），从这里开始。
2. 监督者与工作者：有 2–4 位专家时。
3. 群体：延迟比推理过程清晰度更重要时。
4. 层级式：仅在监督者上下文预算不足时。
5. 辩论：准确率比成本更重要时。

### 模式的失效点（Where this pattern goes wrong）

- **拓扑优先思维（Topology-first thinking）。** 尚未明确多智能体要解决什么问题，就先说“我们需要多智能体”。
- **群体中的往返交接（Bouncing handoffs in swarm）。** A -> B -> A -> B。应使用跳数计数器。
- **虚假层级（Fake hierarchy）。** 只有两个真实团队，却因为“企业级”设置三层。应压平。

```figure
orchestration-pattern
```

## 动手实现（Build It）

`code/main.py` 基于脚本化 LLM，使用标准库实现全部四种模式：

- `Supervisor`：中央路由器。
- `Swarm`：通过直接交接实现点对点协作。
- `Hierarchical`：监督者的监督者。
- `Debate`：并行提议者加批评。

每种模式处理相同的三意图任务：退款、缺陷、销售。追踪结构各不相同。

运行：

```
python3 code/main.py
```

输出：逐模式追踪与操作数。监督者最清晰，群体最短，层级式最深，辩论最昂贵。

## 实际应用（Use It）

- **LangGraph**：用于监督者和层级式（嵌套子图）。
- **OpenAI Agents SDK**：将交接作为工具，采用监督者式结构。
- **CrewAI Flow**：用于生产中的确定性流程。
- **自定义实现（Custom）**：用于辩论或需要精确控制时。

## 交付成果（Ship It）

`outputs/skill-orchestration-picker.md` 选择一种拓扑并实现它。

## 练习（Exercises）

1. 移除路由器，将监督者与工作者转换为群体。什么会出问题？什么得到改善？
2. 给群体添加跳数计数器：交接 3 次后拒绝。它能捕获 A->B->A 往返吗？
3. 为有 12 位专家的领域构建两级层级系统。不使用嵌套时，上下文预算在哪里失效？
4. 在生产式工作负载上分析四种模式。各自在延迟、成本、准确率、可调试性哪个指标上胜出？
5. 阅读 Anthropic《构建有效的智能体》（Building Effective Agents）。将每条生产流程映射到四种模式之一。是否有无法清晰映射的流程？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 监督者与工作者（Supervisor-worker） | “路由器 + 专家” | 中央 LLM 分派给专家；专家互不交流 |
| 群体（Swarm） | “点对点” | 通过共享工具直接交接，没有中央路由器 |
| 层级式（Hierarchical） | “监督者的监督者” | 为大量智能体构建嵌套子图 |
| 辩论（Debate） | “提议者 + 批评” | 并行提议者、交叉批评（第 25 课） |
| 基于工具调用的监督（Tool-call-based supervision） | “不用库的监督者” | 通过直接工具调用实现监督者，控制上下文 |
| Crew | “自主团队” | CrewAI 基于角色的协作模式 |
| Flow | “确定性工作流” | CrewAI 事件驱动的生产模式 |

## 延伸阅读（Further Reading）

- [Anthropic《构建有效的智能体》（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：五种模式，智能体与工作流
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)：监督者、群体、层级式
- [CrewAI 文档](https://docs.crewai.com/en/introduction)：Crew 与 Flow
- [Du 等，心智社会（Society of Minds，arXiv:2305.14325）](https://arxiv.org/abs/2305.14325)：辩论模式
