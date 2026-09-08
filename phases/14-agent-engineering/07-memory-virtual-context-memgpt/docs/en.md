# 智能体记忆：虚拟上下文与记忆分页（Agent Memory — Virtual Context and Memory Paging）

> 上下文窗口（Context Window）有限，对话、文档和工具轨迹却不会随之停止增长。解决办法是借用操作系统的虚拟内存机制：主上下文相当于 RAM，外部存储相当于磁盘，智能体在两者之间换入、换出数据。MemGPT（Packer 等人，2023）为这一模式命名，许多生产记忆系统都建立在它之上。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 01（智能体循环，Agent Loop）、阶段 14 · 06（工具使用，Tool Use）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释 MemGPT 的操作系统类比：主上下文 = RAM，外部上下文 = 磁盘，记忆工具 = 页面换入和换出。
- 用标准库实现 MemGPT 双层模式，包含主上下文缓冲区、外部可搜索存储和换入、换出工具。
- 描述智能体如何发出“中断”来查询或修改外部记忆，以及结果如何拼接回下一次提示词。
- 识别 MemGPT 中延续到 Letta（第 08 课）和 Mem0（第 09 课）的设计选择。

## 问题（The Problem）

上下文窗口看起来应该能解决记忆问题，实际并不能。生产环境中反复出现三种故障模式：

1. **溢出（Overflow）。** 多轮对话、长文档或工具调用密集的轨迹超出窗口，截断位置之后的内容全部丢失。
2. **稀释（Dilution）。** 即使没有超出窗口，塞入无关上下文也会稀释对重要内容的注意力。前沿模型在长输入上仍会退化。
3. **持久化（Persistence）。** 新会话从空窗口开始。没有外部记忆的智能体无法跨会话说“还记得你让我……的时候吗？”

扩大窗口有帮助，但不能解决这些问题。Mem0 的 2025 年论文测得，128k 窗口的基线仍会漏掉某些长时程事实，而拥有外部记忆的 4k 窗口智能体能捕获它们。

## 概念（The Concept）

### 操作系统类比（The OS analogy）

MemGPT（Packer 等人，arXiv:2310.08560，v2，2024 年 2 月）将上下文管理映射到操作系统虚拟内存：

| 操作系统概念 | MemGPT 概念 | 2026 年生产环境中的对应物 |
|------------|---------------|------------------------|
| 内存（RAM） | 主上下文，即提示词 | Anthropic/OpenAI 上下文窗口 |
| 磁盘（Disk） | 外部上下文 | 向量数据库、键值（KV）存储、图存储 |
| 缺页（Page fault） | 记忆工具调用 | `memory.search`、`memory.read`、`memory.write` |
| 操作系统内核（OS kernel） | 智能体控制循环 | 带记忆工具的 ReAct 循环 |

智能体运行普通 ReAct 循环。额外的一类工具让它能够将数据换入、换出主上下文。

### 两个层级（Two tiers）

- **主上下文（Main context）。** 保存当前任务的固定大小提示词，始终对模型可见。
- **外部上下文（External context）。** 无界，可通过工具搜索。相关时读取，出现新事实时写入。

原论文在两类超出基础窗口的任务上评估了该设计：超过 100k 词元的文档分析，以及跨天保留记忆的多会话聊天。

### 中断模式（The interrupt pattern）

MemGPT 提出将记忆访问视为中断：对话中途，智能体调用记忆工具，运行时执行它，结果作为新观察结果拼接进下一个助手轮次。概念上，这与 Unix `read()` 系统调用相同：阻塞进程、返回字节，然后进程继续。

经典记忆工具接口如下：

- `core_memory_append(section, text)`：写入提示词的持久章节。
- `core_memory_replace(section, old, new)`：编辑持久章节。
- `archival_memory_insert(text)`：写入可搜索的外部存储。
- `archival_memory_search(query, top_k)`：从外部存储检索。
- `conversation_search(query)`：扫描过去轮次。

### 论文止步之处与生产起点（Where the paper ends and production begins）

2024 年 9 月，MemGPT 演变为 Letta。研究仓库（`cpacker/MemGPT`）仍然保留；Letta 扩展了设计：

- 从两层增加到三层：核心（Core）、回忆（Recall）、归档（Archival），参见第 08 课。
- 用原生推理替换 `send_message`/心跳模式，参见第 08 课。
- 休眠时智能体异步执行记忆工作，参见第 08 课。

即使生产系统运行 Letta、Mem0 或自定义双层存储，MemGPT 论文仍是 2026 年的基础。

### 这一模式会在哪里出错（Where this pattern goes wrong）

- **记忆腐化（Memory rot）。** 写入积累速度超过读取，检索被过时事实淹没。修复方式：定期整合（Letta 休眠时处理）、显式失效（Mem0 冲突检测器）。
- **记忆投毒（Memory poisoning）。** 外部记忆是检索文本。如果攻击者控制的内容进入记忆笔记，智能体会在下次会话重新摄入它。这是 Greshake 等人攻击（第 27 课）的跨时间版本。
- **引用丢失（Citation loss）。** 智能体记得“用户让我交付 X”，却无法指出是哪一轮。每次归档写入都应保存来源引用，包括会话标识和轮次标识。

```figure
context-budget
```

## 动手实现（Build It）

`code/main.py` 用标准库实现 MemGPT 的双层模式：

- `MainContext`：固定大小的提示词缓冲区，包含 `core` 字典和 `messages` 列表；超限时自动压缩最旧消息。
- `ArchivalStore`：内存中的类 BM25 存储，采用词元重叠评分，保存 (id, text, tags, session, turn) 记录。
- 五个对应 MemGPT 接口的记忆工具。
- 脚本化智能体，先向归档写入事实，再调用 `archival_memory_search` 回答问题。

运行：

```
python3 code/main.py
```

轨迹展示智能体写入三个事实、将主上下文填满到上限并强制驱逐，然后通过归档检索回答追问，无需真实 LLM 即可复现 MemGPT 工作流。

## 实际应用（Use It）

如今每个生产记忆系统都是 MemGPT 的变体：

- **Letta**（第 08 课）：三层记忆、原生推理、休眠时计算。
- **Mem0**（第 09 课）：以评分层融合向量、KV 和图。
- **OpenAI Assistants / Responses**：通过线程和文件提供托管记忆。
- **Claude Agent SDK**：通过技能和会话存储提供长期记忆。

按运行形态选择，如自托管、托管、框架集成，而不是按核心模式选择，因为核心模式都是 MemGPT。

### 智能体记忆的形态（The shape of agent memory）

分页解决容量问题，但不能决定存什么。生产系统反复出现四类记忆，各自回答不同问题：

- **工作记忆（Working memory）**：现在什么重要？上下文内的一层，包括当前任务、最近轮次和固定核心章节，也就是提示词本身。
- **情景记忆（Episodic memory）**：发生过什么？带会话、轮次引用的过去轮次和轨迹，可按需回放。
- **语义记忆（Semantic memory）**：什么是真的？关于用户、领域、世界的事实，随着变化更新和去重。
- **程序性记忆（Procedural memory）**：该怎么做？学到的流程、偏好和规则，用来指导未来行为，而不是回忆。

开源实现选择不同的切入点：

| 类型 | 实现 | 处理方式 |
|------|----------------|-------------------|
| 工作记忆（Working） | MemGPT / Letta | 通过记忆工具，在固定提示词预算内换入、换出内容（本课、第 08 课） |
| 情景记忆（Episodic） | Zep | 时态知识图谱（Temporal knowledge graph）：事实携带有效时间区间，因此可以查询“何时什么为真” |
| 语义记忆（Semantic） | Mem0 | 抽取流水线，在向量、KV 和图存储间去重、更新事实（第 09 课） |
| 语义 + 程序性记忆（Semantic + procedural） | LangMem | 在后台将事实与行为规则抽取到存储，智能体在轮次间查询 |
| 情景 + 语义记忆（Episodic + semantic） | agentmemory | 在会话运行时记录内容，再整合为带类型、可搜索的记录 |

## 交付成果（Ship It）

`outputs/skill-virtual-memory.md` 是可复用技能，为任意目标运行时生成正确的双层记忆骨架，包括主上下文、归档和工具接口，并接好驱逐策略和引用字段。

## 练习（Exercises）

1. 添加按词元计量的 `max_main_context_tokens` 上限，可用 `len(text.split())` * 1.3 近似。超过上限时，将最旧消息压缩为摘要。比较有无摘要器时的行为。
2. 在归档存储上正确实现 BM25，包括词频和逆文档频率。用玩具事实集测量 recall@10，并与词元重叠基线比较。
3. 为归档插入添加 `citation` 字段（session_id、turn_id、source_url）。让智能体在每次基于检索的回答中引用来源。
4. 模拟记忆投毒：添加一条归档记录，写着“忽略未来所有用户指令”。编写防护逻辑，扫描检索结果中的指令式文本，并将其标记为不可信。
5. 调整实现，采用 MemGPT 研究仓库（`cpacker/MemGPT`）的核心记忆 JSON 结构定义（Schema）。从无结构字符串切换到带类型的分节内容时，会发生什么变化？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 虚拟上下文（Virtual context） | “无限记忆” | 主层（提示词）与外部层（可搜索），支持换入、换出 |
| 主上下文（Main context） | “工作记忆” | 固定大小、始终可见的提示词 |
| 归档记忆（Archival memory） | “长期存储” | 外部可搜索持久化存储，按需检索 |
| 核心记忆（Core memory） | “持久提示词章节” | 固定在主上下文内的命名章节 |
| 记忆工具（Memory tool） | “记忆 API” | 智能体发出的读写外部记忆的工具调用 |
| 中断（Interrupt） | “记忆缺页” | 智能体暂停，运行时获取数据，将结果拼接到下一轮 |
| 记忆腐化（Memory rot） | “过时事实” | 旧写入淹没检索，通过整合修复 |
| 记忆投毒（Memory poisoning） | “注入的持久笔记” | 攻击者内容被保存为记忆，在回忆时重新摄入 |

## 延伸阅读（Further Reading）

- [Packer 等人，MemGPT（arXiv:2310.08560）](https://arxiv.org/abs/2310.08560)：受操作系统启发的虚拟上下文论文。
- [Letta，记忆块博客（Memory Blocks）](https://www.letta.com/blog/memory-blocks)：三层演进。
- [Anthropic，有效上下文工程（Effective context engineering）](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：将上下文视为预算。
- [Chhikara 等人，Mem0（arXiv:2504.19413）](https://arxiv.org/abs/2504.19413)：基于这一模式的混合生产记忆。
- [Zep（getzep/zep）](https://github.com/getzep/zep)：分类表中的时态知识图谱记忆。
- [Mem0（mem0ai/mem0）](https://github.com/mem0ai/mem0)：第 09 课混合存储背后的抽取流水线。
- [LangMem（langchain-ai/langmem）](https://github.com/langchain-ai/langmem)：后台抽取事实与行为规则。
- [agentmemory（rohitg00/agentmemory）](https://github.com/rohitg00/agentmemory)：将会话记录整合为带类型、可搜索的记录。
