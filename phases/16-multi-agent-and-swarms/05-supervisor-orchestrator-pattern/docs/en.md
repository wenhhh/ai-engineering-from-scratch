# 监督者 / 编排者-工作者模式（Supervisor / Orchestrator-Worker Pattern）

> 一个领队智能体负责规划与委派，专职工作者在并行上下文中执行并汇报。这是 Anthropic Research 系统背后的模式（Claude Opus 4 任领队，Sonnet 4 任子智能体），内部研究评估中比单智能体 Opus 4 提升 90.2%。Anthropic 工程文章称，仅词元使用量就能解释 BrowseComp 上 80% 的方差：多智能体胜出，很大程度上是因为每个子智能体获得全新的上下文窗口。本课从原语构建监督者模式，并介绍 2026 年生产部署中的工程经验。

**Type:** Learn + Build
**Languages:** Python (stdlib, `threading`)
**Prerequisites:** Phase 16 · 04 原语模型（Primitive Model）
**Time:** ~75 分钟

## 问题（Problem）

研究是单智能体系统失败的典型任务。你问“2023 至 2026 年多智能体系统发生了什么变化？”单智能体依次阅读五篇论文，其文本占据一半上下文，随后还得综合推理。读到第五篇时，它已经忘记第一篇，而且无法并行。

监督者模式解决这一点：领队智能体规划搜索，把每个子问题委派给工作者，最后综合结果。每个工作者为一个狭窄问题获得自己的 200k 词元窗口。领队从不看到原始论文，只看工作者摘要。

Anthropic 生产级 Research 系统报告，在内部研究评估中比单个 Opus 4 提升 90.2%。同一文章指出，*仅词元使用量*就能解释 BrowseComp 方差的 80%。每个子智能体的全新上下文是主要机制。

## 概念（Concept）

### 模式（The pattern）

```
                 ┌──────────────┐
                 │   主智能体   │  规划、分解、
                 │  (Opus 4)    │  综合
                 └──┬────┬───┬──┘
                    │    │   │
            ┌───────┘    │   └───────┐
            ▼            ▼           ▼
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │ 工作者1 │  │ 工作者2 │  │ 工作者3 │
      │(Sonnet) │  │(Sonnet) │  │(Sonnet) │
      └─────────┘  └─────────┘  └─────────┘
         全新         全新         全新
         上下文       上下文       上下文
```

领队从不阅读原始材料。直到领队综合时，工作者也看不到彼此工作。每条箭头都是携带范围有限交付物的交接（Handoff）。

### 为什么有效（Why it wins）

三个机制：

1. **每个子智能体拥有全新上下文（Fresh context）。** 研究“FIPA-ACL 传承”的工作者不携带领队规划时消耗的 40k 词元，而是为一个问题获得 200k 窗口。
2. **通过提示词专门化。** 领队提示词是“分解与综合”，不是“研究”。每个工作者提示词范围狭窄：“找出 X 的变化。”聚焦提示词产生聚焦输出。
3. **并行性（Parallelism）。** 工作者并发运行。墙钟时间（Wall-clock time）大致为 `max(worker_times) + plan + synthesis`，而非 `sum(worker_times)`。

### 工程经验（Engineering lessons，Anthropic 2025）

Anthropic 文章列出了若干到 2026 年仍适用的生产经验：

- **按查询复杂度调整投入（Scale effort）。** 简单查询：一个智能体、3-10 次工具调用。复杂查询：10 个以上智能体。必须由领队估算，而非调用者。
- **先广后窄。** 先分解成宽泛子问题，若答案需要深挖，再为每个子问题创建更多工作者。
- **彩虹部署（Rainbow deployments）。** 智能体长时间运行且有状态，传统蓝绿部署不适用。Anthropic 使用彩虹部署：旧版本逐渐完成存量工作，同时渐进推出新版本。
- **词元使用量占主导。** 多智能体约消耗单智能体 15 倍词元。只有任务价值足以支持成本时才运行。

### 图原生的转向（The graph-native turn）

LangGraph 最初提供 `langgraph-supervisor` 库及高级辅助函数 `create_supervisor`。2025 年，LangChain 改为推荐直接通过工具调用实现监督者模式，因为工具调用能更好地控制*监督者看到什么*，即上下文工程（Context engineering）。库仍可用，但文档现在推荐工具调用形式。

### 故障模式（The failure modes）

- **领队为计划产生幻觉。** 若领队生成的子问题没有分解真实问题，工作者就会针对错误目标进行精确研究。
- **工作者过度探索。** 没有明确范围边界，工作者会偏离分配的子问题，污染综合步骤。
- **综合冲突（Synthesis conflicts）。** 两个工作者返回矛盾事实。领队必须重新询问（增加一轮），或明确指出分歧。静默选择一方是最糟糕的失败：用户根本不知道曾有分歧。

### 何时不适合监督者（When supervisor is wrong）

- **串行任务。** 若第 2 步确实需要第 1 步输出，并行不会带来收益。使用流水线（CrewAI Sequential、LangGraph 线性图）。
- **简单查询。** 单智能体处理更快、更便宜。创建工作者前，让领队先检查投入规模。
- **严格确定性。** 监督者采用 LLM 选择式委派。审计/重放比适应性更重要时，静态图更合适。

```figure
supervisor-hierarchy
```

## 动手实现（Build It）

`code/main.py` 使用 `threading` 实现管理三个并行工作者的监督者。领队把查询拆成子问题，工作者分别并发处理，再由领队综合。不使用真实 LLM，工作者以脚本模拟获取资料并生成摘要。

关键结构：

- `Lead.plan(query)` 将查询拆成 3 个子问题。
- `Worker.run(sub_q)` 返回模拟摘要（生产中可替换为任意工具使用智能体）。
- `Lead.run(query)` 在线程中启动工作者，等待线程结束，再综合结果。

运行：

```
python3 code/main.py
```

输出展示计划、含起止时间戳的并行工作者轨迹，以及最终综合结果。你可以看到墙钟时间收益：三个耗时 0.3 秒的工作者约在 0.35 秒内完成，而非 0.9 秒。

## 实际应用（Use It）

`outputs/skill-supervisor-designer.md` 接收用户查询，生成监督者模式设计：领队系统提示词、工作者角色、子问题分解规则、综合模板。构建新的研究型智能体系统前使用它。

## 交付成果（Ship It）

部署监督者模式前的检查清单：

- **模型搭配（Model pairing）。** 领队使用推理级模型（Opus 级、`o3` 级），工作者使用更快、更便宜的模型（Sonnet、`o4-mini`）。
- **工作者超时。** 超过运行时间中位数 2 倍的工作者会被终止；领队缩小范围重新创建，或缺少它也继续。
- **每个工作者的词元上限。** 硬限制（例如预期综合输入的 10 倍）可防止失控工作者耗尽预算。
- **可观测性（Observability）。** 追踪领队计划、每个工作者的工具调用和综合过程，这是事后调试的基础。
- **彩虹发布（Rainbow rollout）。** 长时间运行的有状态智能体需要渐进版本切换，而非热替换。

## 练习（Exercises）

1. 运行 `code/main.py`，再把领队改为创建 5 个而非 3 个工作者，观察墙钟时间。在此演示中，工作者数量到多少时，创建开销会超过并行节省？
2. 实现工作者超时：终止超过 0.5 秒的工作者，让领队综合剩余结果。需要怎样的可观测性才能知道某个工作者被终止？
3. 为领队综合增加冲突检测：若两个工作者返回矛盾答案，领队指出分歧而非选择一方。不调用 LLM 如何检测矛盾？
4. 阅读 Anthropic Research 系统工程文章，列出这个简化演示要投入生产需采用的三项实践。
5. 比较 LangGraph 的旧版 `create_supervisor` 与新的工具调用推荐。哪种更能控制监督者看到什么？为什么 Anthropic 明确只向综合步骤传递子答案，而非工作者原始上下文？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 监督者（Supervisor） | “领队智能体” | 负责规划、委派和综合的编排智能体，不亲自执行工作。 |
| 工作者（Worker） | “子智能体” | 由监督者调用、范围狭窄并拥有独立上下文窗口的聚焦智能体。 |
| 编排者-工作者（Orchestrator-worker） | “监督者模式” | 同一事物的不同名称，2026 年文献中两者都有使用。 |
| 全新上下文（Fresh context） | “干净窗口” | 工作者上下文从自身系统提示词和分配的问题开始，不含领队历史。 |
| 彩虹部署（Rainbow deployment） | “渐进发布” | 长时间运行的有状态智能体需要按版本排空存量再替换，而非蓝绿部署。 |
| 词元主导（Token dominance） | “上下文是变量” | 据 Anthropic，研究评估 80% 的方差来自总词元用量，而非模型选择。 |
| 调整投入（Scale effort） | “智能体数量匹配复杂度” | 领队估计查询难度，据此创建 1 个或 10 个以上工作者。 |
| 综合冲突（Synthesis conflict） | “工作者意见不一” | 两个工作者返回矛盾事实；领队必须呈现分歧，而非静默选一方。 |

## 延伸阅读（Further Reading）

- [Anthropic 工程：我们如何构建多智能体研究系统（How we built our multi-agent research system）](https://www.anthropic.com/engineering/multi-agent-research-system)：监督者模式的生产参考
- [LangGraph 工作流与智能体（LangGraph workflows and agents）](https://docs.langchain.com/oss/python/langgraph/workflows-agents)：现推荐工具调用式监督者
- [LangGraph 监督者参考（LangGraph supervisor reference）](https://reference.langchain.com/python/langgraph-supervisor)：旧辅助库，2026 年生产中仍在使用
- [OpenAI 示例指南：编排智能体，例程与交接（Orchestrating Agents: Routines and Handoffs）](https://developers.openai.com/cookbook/examples/orchestrating_agents)：基于交接的监督者变体
