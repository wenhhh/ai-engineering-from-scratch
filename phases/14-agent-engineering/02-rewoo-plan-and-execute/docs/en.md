# ReWOO 与先规划后执行：解耦规划（ReWOO and Plan-and-Execute: Decoupled Planning）

> ReAct 在同一个流中交替进行思考和行动。ReWOO 将两者分开：先制定完整计划，再执行。词元用量降至原来的 1/5，HotpotQA 准确率提高 4 个百分点，还可以将规划器蒸馏到 7B 模型中。先规划后执行（Plan-and-Execute）将其推广为通用模式；先规划后行动（Plan-and-Act）则将其扩展到网页导航。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 解释为什么 ReWOO 的规划器（Planner）/ 执行器（Worker）/ 求解器（Solver）划分比 ReAct 的交替循环更省词元、更稳健。
- 仅用标准库实现计划有向无环图（DAG）、按依赖顺序运行的执行器，以及组合执行器输出的求解器。
- 借助 2026 年的“五种工作流模式”（Anthropic）框架，判断任务应采用先规划后执行，还是交替式 ReAct。
- 识别长时程网页或移动任务何时需要 Plan-and-Act 的合成计划数据（Synthetic plan data）。

## 问题（The Problem）

ReAct 交替进行思考、行动、观察的循环简单而灵活，但每次工具调用都必须携带完整的先前上下文，包括此前的每次思考。词元用量随深度呈二次增长。更糟的是，当工具在循环中途失败时，模型必须根据错误观察结果重新推导整个计划。

ReWOO（Xu 等人，arXiv:2305.18323，2023 年 5 月）注意到这一点，并尝试了另一条路：一开始规划全部工作，并行获取证据，最后组合答案。调用一次 LLM 进行规划，调用 N 次工具获取证据（可并行），再调用一次 LLM 求解。代价是灵活性降低，因为计划是静态的；收益则是更高的词元效率和更清晰的故障模式。

## 概念（The Concept）

### 三个角色（The three roles）

```
规划者（Planner）：user_question -> [plan_dag]
工作者（Workers）：[plan_dag] -> [evidence]（工具调用，可并行）
求解者（Solver）：user_question, plan_dag, evidence -> final_answer
```

规划器生成 DAG。每个节点指定工具名称、参数，以及它依赖哪些较早节点，使用 `#E1`、`#E2` 之类的引用。执行器按拓扑顺序（Topological order）执行节点，求解器将所有结果拼合起来。

### 为什么词元用量降至 1/5（Why 5x fewer tokens）

ReAct 的提示词长度随步数线性增长。到第 10 步，提示词包含思考 1、行动 1、观察 1，再加上思考 2、行动 2、观察 2，依此类推。每个中间步骤还会重复包含原始提示词。

ReWOO 只需一个较大的规划器提示词、N 个较小的执行器提示词（每个只有工具调用，没有完整链条），以及一个求解器提示词。论文在 HotpotQA 上测得词元用量约为原来的 1/5，同时准确率提高了 4 个百分点。

### 为什么更稳健（Why it is more robust）

在 ReAct 中，如果执行器 3 失败，循环必须中途推理如何摆脱错误。在 ReWOO 中，执行器 3 返回错误字符串；求解器结合原始计划看到该错误，可以平稳降级（Graceful degradation）。故障按节点定位，而不是按步骤定位。

### 规划器蒸馏（Planner distillation）

论文的第二项结果是：由于规划器看不到观察结果，你可以用 175B 教师模型的规划器输出微调一个 7B 模型。小模型负责规划，推理时无需大模型。如今这已成为常规做法：许多 2026 年的生产智能体使用小规划器配大执行器，或反过来。

### 先规划后执行（Plan-and-Execute，2023）

LangChain 团队在 2023 年 8 月的文章中，将 ReWOO 推广为名为 Plan-and-Execute 的模式：前置规划器输出步骤列表，执行器执行各步骤，可选的重规划器（Replanner）在观察结果后修订计划。它比 ReWOO 更接近 ReAct，因为重规划器将观察结果重新带回规划过程，但仍保留节省词元的优势。

### 先规划后行动（Plan-and-Act，Erdogan 等人，arXiv:2503.09572，ICML 2025）

Plan-and-Act 将该模式扩展到长时程网页和移动智能体。其关键贡献是合成计划数据：带标签的轨迹生成器产出显式包含计划的训练数据。这些数据用于微调规划器模型，使其在类似 WebArena 的任务中超过 30–50 步后仍能持续工作，而单条 ReAct 轨迹在这类任务中会失去连贯性。

### 何时选择哪一种（When to pick which）

| 模式（Pattern） | 适用情况 |
|---------|------|
| ReAct | 短任务、未知环境、需要即时响应的异常处理 |
| ReWOO | 工具已知的结构化任务、对词元用量敏感、证据获取可并行 |
| 先规划后执行（Plan-and-Execute） | 类似 ReWOO，但在部分执行后重新规划 |
| 先规划后行动（Plan-and-Act） | 长时程（>30 步）的网页、移动或计算机使用任务 |
| 思维树（Tree of Thoughts） | 值得为搜索付出成本时（第 04 课） |

Anthropic 在 2024 年 12 月的建议是：从最简单的方案开始。如果任务只是一次工具调用加一段摘要，就不要构建 ReWOO。如果任务是 40 步的研究作业，就不要只依靠 ReAct。

```figure
rewoo-plan
```

## 动手实现（Build It）

`code/main.py` 实现了一个玩具 ReWOO：

- `Planner`：脚本化策略，根据提示词输出计划 DAG。
- `Worker`：通过注册表分派各节点的工具调用。
- `Solver`：通过脚本化组合读取证据并生成最终答案。
- 依赖解析（Dependency resolution）：将 `#E1` 之类的引用替换为较早执行器的输出。

演示回答“法国首都的人口是多少，按百万取整？”这个问题，采用两步计划：（1）查找首都，（2）查找人口，然后求解。

运行：

```
python3 code/main.py
```

轨迹先展示完整计划，再展示执行器结果，最后展示求解器的组合过程。将词元数（程序打印的是粗略字符数）与 ReAct 式交替运行进行比较：在这类结构化任务中，ReWOO 更有优势。

## 实际应用（Use It）

LangGraph 提供 Plan-and-Execute 实现范例：ReAct 使用 `create_react_agent`，先规划后执行使用自定义图。CrewAI 的流程（Flows）直接编码这一模式：预先定义任务，再由 Flow DAG 执行。Plan-and-Act 的合成数据方法仍主要处于研究阶段；其运行时模式，即显式计划 DAG，已通过 LangGraph 和 CrewAI Flows 用于生产。

## 交付成果（Ship It）

`outputs/skill-rewoo-planner.md` 根据给定工具目录和用户请求生成 ReWOO 计划 DAG。交给执行器之前，它会验证计划无环、每个引用都可解析、每个工具都存在。

## 练习（Exercises）

1. 并行执行独立计划节点的工作。在一个有 6 个节点、2 个并行组的 DAG 上，这能带来什么收益？
2. 添加重规划器节点，只要任意执行器返回错误就触发它。要把 ReWOO 变成 Plan-and-Execute，最小改动是什么？
3. 用小模型（7B 级别）替换 `Planner`，并让 `Solver` 继续使用前沿模型。比较端到端质量：这种划分会在哪些地方失败？
4. 阅读 ReWOO 论文第 4 节的规划器蒸馏内容。从概念上复现 175B -> 7B 结果：需要什么训练数据？如何给计划质量评分？
5. 将玩具实现改为 Plan-and-Act 的轨迹形态：计划是序列而非 DAG。权衡会怎样变化？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| ReWOO | “无观察推理（Reasoning without observations）” | 先规划、再并行获取证据、最后求解；规划提示词中没有观察结果 |
| 先规划后执行（Plan-and-Execute） | “LangChain 的规划执行模式” | 在执行后增加可选重规划器节点的 ReWOO |
| 先规划后行动（Plan-and-Act） | “扩展版规划执行” | 显式划分规划器与执行器，并用合成计划训练数据支持长时程任务 |
| 证据引用（Evidence reference） | “#E1、#E2、……” | 计划节点的占位符，分派时替换为先前执行器输出 |
| 规划器蒸馏（Planner distillation） | “小规划器、大执行器” | 用大型教师模型的规划轨迹微调小模型 |
| 词元效率（Token efficiency） | “更少往返” | 论文中，在 HotpotQA 上的词元用量为 ReAct 的 1/5 |
| DAG 执行器（DAG executor） | “拓扑分派器” | 按依赖顺序运行计划节点，每一层可并行执行 |

## 延伸阅读（Further Reading）

- [Xu 等人，ReWOO：将推理与观察解耦（Decoupling Reasoning from Observations，arXiv:2305.18323）](https://arxiv.org/abs/2305.18323)：经典论文。
- [Erdogan 等人，先规划后行动（Plan-and-Act，arXiv:2503.09572）](https://arxiv.org/abs/2503.09572)：借助合成计划扩展规划器与执行器。
- [LangGraph 先规划后执行教程（Plan-and-Execute tutorial）](https://docs.langchain.com/oss/python/langgraph/overview)：框架实现范例。
- [Anthropic，构建有效智能体（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：选择最简单的可行模式。
