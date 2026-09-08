# 基于角色的智能体团队：角色、任务、执行过程（Role-Based Agent Teams — Roles, Tasks, Processes）

> 四个基本元素：智能体（Agent）、任务（Task）、团队（Crew）、执行过程（Process）。两种顶层形态：团队（Crews，自主、基于角色的协作）和流程（Flows，事件驱动、确定性）。CrewAI 是 2026 年的参考实现，其文档直言：“任何准备投入生产的应用，都应从 Flow 开始。”

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 12（工作流模式，Workflow Patterns）、阶段 14 · 14（参与者模型，Actor Model）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说出 CrewAI 的四个基本元素：Agent、Task、Crew、Process，以及各自负责什么。
- 区分顺序式（Sequential）、分层式（Hierarchical）和计划中的共识式（Consensus）执行过程，为每种工作负载选择一种。
- 区分自主、基于角色的 Crew 与事件驱动、确定性的 Flow，解释文档中的生产建议。
- 通过 `@tool` 装饰器和 `BaseTool` 子类接入工具，分析结构化输出与自由文本的区别。
- 说出 CrewAI 的四种记忆类型，以及它们何时值得使用。
- 用标准库实现研究者、写作者、编辑组成的三智能体团队，生成简报。
- 识别 CrewAI 的三种故障模式：提示词膨胀、管理者 LLM 额外成本、脆弱交接。

## 问题（The Problem）

采用多智能体框架的团队总会遇到同一道障碍。“自主协作”在演示里听起来不错，但随后客户报告缺陷，你需要确定性回放；财务询问由 LLM 路由的团队每次运行花多少钱；值班人员需要知道凌晨 3 点哪个智能体停滞。

自由形式、LLM 路由的团队无法清楚回答这些问题。纯 DAG 可以回答，却失去了头脑风暴智能体所需的探索形态。

CrewAI 的划分明确体现了这一权衡：Crew 用于基于角色协作的探索工作；Flow 用于事件驱动、由代码控制且可审计的生产流程。同一框架提供两种形态，可以根据各部分工作的需要选择。

## 概念（The Concept）

### 四个基本元素（Four primitives）

CrewAI 的接口不大。记住以下内容，其余都是配置。

- **智能体（Agent）。** `role + goal + backstory + tools + (optional) llm`。背景故事（Backstory）至关重要，会影响语气、判断以及何时停止。工具是智能体可调用的函数，下文详述。
- **任务（Task）。** `description + expected_output + agent + (optional) context + (optional) output_pydantic`。可复用的工作单元。`expected_output` 是契约。`context` 列出输出会传入的上游任务。`output_pydantic` 强制结构化形态。
- **团队（Crew）。** 容器，负责 `agents` 列表、`tasks` 列表、`process`，以及可选 `memory` + `verbose` + `manager_llm` 设置。
- **执行过程（Process）。** 执行策略，包含 Sequential、Hierarchical、Consensus（计划中），决定运行形态。

智能体不能直接看到彼此。任务引用智能体，Crew 为任务排序，Process 决定由谁选择下一个任务。完整心智模型就是如此。

> **核验版本（Validated against）**：CrewAI 0.86（2026-05）。新版本可能重命名或合并执行过程类型；依赖特定形态前，请检查 [CrewAI 执行过程文档（Processes docs）](https://docs.crewai.com/concepts/processes)。

### 顺序式、分层式与共识式（Sequential vs Hierarchical vs Consensus）

- **顺序式（Sequential）。** 任务按声明顺序运行。任务 N 的输出可作为 `context` 供任务 N+1 使用。成本最低、最可预测，适用于顺序固定的情况。
- **分层式（Hierarchical）。** 管理者智能体通过额外 LLM 调用在专门智能体之间路由。CrewAI 根据你的 `manager_llm` 配置或默认设置创建管理者。管理者每轮选择下一个任务，并可拒绝或重新路由。适用于四个或更多专门智能体、且顺序确实取决于先前输出的情况。
- **共识式（Consensus）。** 处于计划中，公开 API 尚未实现。文档为未来基于投票的执行过程保留该名称，目前不要依赖它。

Hierarchical 在每次专门智能体调用之外，每轮增加一次管理者 LLM 调用。五步运行的词元成本可能增至三倍，只有需要路由时才为它付费。

### 团队与流程（Crews vs Flows）

这是文档在 2026 年优先采用的表述框架。

- **团队（Crew）。** LLM 驱动的自主性，框架在运行时选择形态。适合研究、头脑风暴、初稿，以及路径本身也是答案一部分的情况。难以回放、难以测试，但原型成本低。
- **流程（Flow）。** 由你掌控的事件驱动图。`@start` 标记入口。`@listen(topic)` 标记另一步骤发出该主题时触发的步骤。每一步都是普通 Python，内部可调用 Crew。适合生产，可观察、可测试、确定性。

文档在 2026 年的生产建议是：从 Flow 开始。自主性值得其成本时，在 Flow 步骤内部以 `Crew.kickoff()` 调用接入 Crew。Flow 提供审计轨迹，Crew 提供探索能力。应组合，而不是二选一。

### 工具集成（Tool integration）

给 Agent 提供工具有三种方式。选择适用的最简单方式。

1. **`@tool` 装饰器。** 将纯函数变为工具。函数签名充当结构定义（Schema），文档字符串则是 LLM 看到的描述，最适合一次性辅助函数。

   ```python
   from crewai.tools import tool

   @tool("Search the web")
   def search(query: str) -> str:
       """Return top results for the query."""
       return run_search(query)
   ```

2. **`BaseTool` 子类。** 基于类的工具，具有显式的参数结构定义（Schema），并支持异步执行和重试。当工具需要保存客户端、缓存等状态，或需要结构化参数时使用。

   ```python
   from crewai.tools import BaseTool
   from pydantic import BaseModel

   class SearchArgs(BaseModel):
       query: str
       limit: int = 10

   class SearchTool(BaseTool):
       name = "web_search"
       description = "Search the web and return top results."
       args_schema = SearchArgs

       def _run(self, query: str, limit: int = 10) -> str:
           return self.client.search(query, limit=limit)
   ```

3. **内置工具包（Built-in toolkits）。** CrewAI 提供第一方适配器：`SerperDevTool`、`FileReadTool`、`DirectoryReadTool`、`CodeInterpreterTool`、`RagTool`、`WebsiteSearchTool`。一次导入即可接入。

结构化输出使用 Pydantic。在 Task 上传入 `output_pydantic=MyModel`。CrewAI 根据模型验证 LLM 响应，再执行强制转换或重试。配合明确的 `expected_output` 字符串使用。自由文本输出适合草稿，结构化输出才能供下游 Flow 消费。

### 记忆钩子（Memory hooks）

CrewAI 开箱即用地提供四种记忆。它们可组合，一个 Crew 可以同时启用全部四种。

> **核验版本（Validated against）**：CrewAI 0.86（2026-05）。近期版本通过统一的 `Memory` 系统路由所有内容，该系统封装这四种存储。下述概念模型仍成立，但新版本的公开类接口可能收敛为单一 `Memory` 入口；当前 API 请查阅 [CrewAI 记忆文档（Memory docs）](https://docs.crewai.com/concepts/memory)。

- **短期记忆（Short-term）。** 单次运行内的对话缓冲区，结束时清除。
- **长期记忆（Long-term）。** 跨运行持久化，存入向量数据库，默认 Chroma，可替换。按与当前任务的相似度检索。
- **实体记忆（Entity）。** 每实体事实，例如“客户 X 使用企业套餐”。按实体而非相似度索引，跨运行保留。
- **上下文记忆（Contextual）。** 在组装时检索。Agent 需要时才拉取相关记忆，而不是预加载。

通过 Crew 上的 `memory=True` 或按类型配置启用。底层使用你配置的嵌入提供商，默认 OpenAI，可替换为本地。相比更轻量框架，记忆是 CrewAI 体现价值的地方之一；纯 LangGraph 需要你自行接好每一种。

### 基于角色的团队何时适用（When role-based teams fit）

- 三到六个智能体，具有命名角色和协作工作流，如起草、评审、规划、头脑风暴。
- LLM 对下一步的判断本身具有价值的路由，适用 Hierarchical。
- 团队更愿意阅读 `role + goal + backstory`，而不是图定义的场景。

### 何时不适用（When they do not）

- 严格排序的确定性 DAG。使用 LangGraph（第 13 课）。图形态才是合适抽象，CrewAI 的角色表述会增加阻力。
- 亚秒级延迟预算。Hierarchical 增加往返，即使 Sequential 也要序列化包含背景故事和先前输出的提示词。
- 单智能体循环。跳过框架，智能体循环（第 1 课）加工具注册表更短。

第 17 课（智能体框架权衡，Agent Framework Tradeoffs）用矩阵展开这些内容。简言之，CrewAI 位于“协作式、基于角色”这一类。

### 依赖形态（Dependency shape）

独立于 LangChain，支持 Python 3.10 到 3.13，使用 `uv`。星标数量参见 [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)，快照截至 2026-05。AWS Bedrock 集成有文档；厂商基准报告，在问答工作负载上相对 LangGraph 有明显加速，但方法，包括数据集、硬件、评估指标，未公开，因此框架厂商数字只能作为方向性参考。

### 这一模式会在哪里出错（Where this pattern goes wrong）

- **背景故事导致提示词膨胀（Prompt-bloat from backstories）。** 五智能体团队中，每个智能体有 2000 词背景故事，会在第一次工具调用前耗尽上下文预算。背景故事应少于 200 词。跨智能体复用措辞，不要重复五次统一写作风格。
- **管理者 LLM 的词元额外成本（Manager-LLM token tax）。** Hierarchical 在每次专门智能体调用前增加管理者 LLM 调用。五任务团队因此有六次而不是五次 LLM 调用，管理者调用还携带完整任务列表和先前输出。除非路由依赖输出，否则切换到 Sequential。
- **脆弱交接（Brittle handoffs）。** 任务 N 的 `expected_output` 是“大纲”，任务 N+1 将其作为 `context` 读取，尝试解析三个章节，但 LLM 生成了四个，下游 Agent 只好即兴应对。为任务 N 添加 `output_pydantic`，使任务 N+1 读取带类型对象，而不是自由文本。
- **将 Crew 直接用于生产（Crew-as-prod）。** 自由形式 Crew 没有 Flow 包装就交付生产，输出变动大、无法回放，值班人员无法对比失败与成功运行的差异。应使用 Flow 包装。

```figure
ae-crew-vs-flow
```

## 动手实现（Build It）

`code/main.py` 实现两种形态的标准库版本，以及三智能体团队。

结构如下：

- 与 CrewAI 接口对应的 `Agent`、`Task` 数据类。
- `SequentialCrew.kickoff(inputs)` 按声明顺序运行任务，将输出作为 `context` 串联传递。
- `HierarchicalCrew.kickoff(topic)` 添加管理者 Agent，每轮选择下一个专门智能体，到“done”时停止。
- `Flow` 包含 `@start`、`@listen(topic)` 装饰器、小型事件循环和轨迹。
- `tool(name)` 装饰器对应 CrewAI 的 `@tool` 形态。
- `Memory` 包含 `short_term`、`long_term`、`entity` 存储；模拟相似度使用 numpy。
- 模拟 LLM 响应是按角色和输入前缀索引的硬编码字符串。无网络，确定性运行。

具体演示：研究者、写作者、编辑组成团队，生成关于“2026 年智能体工程”的简报。研究者拉取模拟来源，写作者起草，编辑精简。同一团队通过 Flow 运行，展示确定性形态。

运行：

```bash
python3 code/main.py
```

轨迹覆盖：顺序团队通过 `context` 串联输出；分层团队由管理者选择研究者、写作者、编辑，最后“done”；流程以显式主题 `researched`、`drafted`、`edited` 运行相同三步；工具调用通过 `@tool` 路由；长期记忆跨两次启动保留。

Crew 轨迹可变，管理者原则上可以重新排序；Flow 轨迹固定。如何选择，就是本课要点。

## 实际应用（Use It）

- **CrewAI Flow** 用于生产。即使 Flow 只有一步，调用 `Crew.kickoff()`，它仍提供审计边界。
- **CrewAI Crew（Sequential）** 用于顺序明确的协作工作，尤其初稿和评审循环。
- **CrewAI Crew（Hierarchical）** 用于路由依赖输出、且有四个或更多专门智能体的情况。
- **LangGraph**（第 13 课）用于显式状态机、持久恢复、严格排序。
- **AutoGen v0.4**（第 14 课）用于参与者模型并发和故障隔离。
- **OpenAI Agents SDK**（第 16 课）用于以 OpenAI 为主、需要交接和防护机制的产品。
- **Claude Agent SDK**（第 17 课）用于以 Claude 为主、需要子智能体和会话存储的产品。

## 交付成果（Ship It）

`outputs/skill-crew-or-flow.md` 为任务选择 Crew 或 Flow，并搭建最小实现。严格拒绝没有背景故事的 Crew、没有显式主题的 Flow，以及少于三个专门智能体的 Hierarchical。

## 陷阱（Pitfalls）

- **将背景故事视为装饰（Backstory as flavor）。** 它影响输出。每个智能体测试三个变体，差异真实存在。选择一个并固定。
- **跳过 `expected_output`。** 如果每项任务没有明确契约，下游就只能接收 LLM 随意生成的内容。Crew 可以运行，审计却会失败。
- **记忆始终开启（Memory always-on）。** 长期记忆每次运行都写入，向量数据库增长，检索噪声增大。只在事实具有持久性的任务中写入。
- **管理者提示词偏移（Manager prompt drift）。** Hierarchical 的管理者提示词是隐式的。路由异常时，在详细模式中输出并阅读它。
- **Crew 中的工具副作用（Tool side effects in Crews）。** Crew 调用工具的次数可能超过预期。POST、DELETE、支付应放在 Flow 步骤中，绝不能作为 Crew 工具。

## 练习（Exercises）

1. 将 Sequential 团队转为 Flow。统计哪些环节变得更可预测，并记录哪些部分的可读性反而降低了。
2. 为团队添加实体记忆，让客户事实跨启动保留。验证检索拉取正确实体。
3. 实现 Hierarchical 执行过程：写作者输出至少三个段落前，管理者拒绝路由到编辑。追踪重试。
4. 为模拟网页搜索接入 `BaseTool` 子类，与 `@tool` 装饰器版本比较轨迹形态。
5. 为编辑任务添加 `output_pydantic=Brief`，其中 `Brief` 包含 `title`、`summary`、`sections`。让写作者任务输出一次格式错误的 JSON，在轨迹中验证 CrewAI 的重试行为。
6. 阅读 CrewAI 文档介绍，将玩具实现迁移到真实 `crewai` API。标准库版本省略了哪些保证？
7. 为真实运行接入 AgentOps 或 Langfuse（第 24 课）。标准库版本漏掉了哪些轨迹？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 智能体（Agent） | “角色设定” | 角色 + 目标 + 背景故事 + 工具 |
| 任务（Task） | “工作单元” | 描述 + 预期输出 + 执行者 + 可选结构化输出 |
| 团队（Crew） | “智能体团队” | Agent + Task + Process 的容器 |
| 执行过程（Process） | “执行策略” | Sequential / Hierarchical / Consensus（计划中） |
| 流程（Flow） | “确定性工作流” | 事件驱动、代码掌控、可测试 |
| 背景故事（Backstory） | “角色设定提示词” | 塑造 Agent 的语气和判断 |
| `@tool` | “函数工具” | 将函数变为 Agent 可调用工具的装饰器 |
| `BaseTool` | “类工具” | 基于类的工具，具有参数结构定义（Schema），支持重试和异步执行 |
| 实体记忆（Entity memory） | “每实体事实” | 限定于客户、账户或问题的记忆 |
| 长期记忆（Long-term memory） | “跨运行记忆” | 向量支持的记忆，跨启动保留 |
| 上下文记忆（Contextual memory） | “即时检索” | Agent 需要时才拉取的记忆 |
| 管理者 LLM（Manager LLM） | “路由智能体” | Hierarchical 中额外的 LLM，负责选择下一任务 |
| `expected_output` | “任务契约” | 告诉 Agent 和审计应返回何种结构的字符串 |

## 延伸阅读（Further Reading）

- [CrewAI 文档介绍（Docs introduction）](https://docs.crewai.com/en/introduction)：概念与推荐生产路径。
- [CrewAI 流程指南（Flows guide）](https://docs.crewai.com/en/concepts/flows)：事件驱动形态、`@start`、`@listen`。
- [CrewAI 工具参考（Tools reference）](https://docs.crewai.com/en/concepts/tools)：`@tool`、`BaseTool`、内置工具包。
- [CrewAI 记忆（Memory）](https://docs.crewai.com/en/concepts/memory)：短期、长期、实体、上下文记忆。
- [Anthropic，构建有效智能体（Building Effective Agents）](https://www.anthropic.com/research/building-effective-agents)：多智能体何时有帮助，何时没有。
- [LangGraph 概览（Overview）](https://docs.langchain.com/oss/python/langgraph/overview)：状态机替代方案。
