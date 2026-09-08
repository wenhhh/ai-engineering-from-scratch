# 共享记忆与黑板模式（Shared Memory and Blackboard Patterns）

> 2026 年多智能体系统并存两种方式：**消息池（Message pool）**，如 AutoGen GroupChat、MetaGPT，所有人看到所有人的消息；**带订阅的黑板（Blackboard with subscription）**，如 Context-Aware MCP、Matrix，智能体订阅相关事件。两者都是多智能体系统唯一有状态的部分，因此也是重要缺陷发生处。典型故障是**记忆投毒（Memory poisoning）**：一个智能体幻觉出“事实”，其他智能体当成已验证内容，准确率逐渐下降，比即时崩溃更难调试。本课用标准库构建两种结构，注入投毒攻击，展示三种在生产中确实有效的缓解措施。

**Type:** Learn + Build
**Languages:** Python (stdlib, `threading`)
**Prerequisites:** Phase 16 · 04 原语模型（Primitive Model）, Phase 16 · 09 并行群体网络（Parallel Swarm Networks）
**Time:** ~75 分钟

## 问题（Problem）

多智能体需要共享事实的位置。“全用消息传递”是直接方案，却以额外复制重新发明共享状态；“给所有人全局日志”会无限增长且易被投毒；“为每个智能体投影视图”可扩展，但模式设计负担重。

一个智能体把幻觉写入共享状态，所有读取它的下游智能体就会把幻觉当事实。人类发现时，推理链已经深入五步，根因却是最早写入的第三条消息。调试多智能体准确率衰减比调试崩溃更难。

这就是记忆投毒。它是 MAST 分类法（Cemri 等，arXiv:2503.13657）中记录第二多的故障族，而且是结构性的：缺少来源追踪与不可写验证者的任何共享记忆设计，最终都会出现它。

## 概念（Concept）

### 两种主要拓扑（The two main topologies）

**完整消息池（Full message pool）。** 每个智能体读取全部消息，AutoGen GroupChat 和 MetaGPT 使用这种方式。简单、透明、可检查，但难扩展到约 10 个以上智能体，因为各上下文被其他智能体工作填满。

```
agent-A ──写入──▶ ┌────────────────┐ ◀──读取── agent-D
                  │ 消息池         │
agent-B ──写入──▶ │                │ ◀──读取── agent-E
                  │（全局日志）    │
agent-C ──写入──▶ └────────────────┘ ◀──读取── agent-F
```

**带订阅的黑板（Blackboard with subscription）。** 智能体声明感兴趣的主题，底层只路由相关消息。CA-MCP（arXiv:2601.11595）和 Matrix 去中心化框架（arXiv:2511.21686）采用它。扩展更远，但需预先设计模式，确保订阅有意义。

```
                  ┌─ 主题: prices ───┐
agent-A ──发布──▶ │                  │ ──▶ agent-D（已订阅）
                  ├─ 主题: orders ───┤
agent-B ──发布──▶ │                  │ ──▶ agent-E（已订阅）
                  ├─ 主题: alerts ───┤
agent-C ──发布──▶ │                  │ ──▶ agent-F（已订阅）
                  └──────────────────┘
```

### 各自何时占优（When each wins）

- 智能体少（< 10）、异构、对话时域短时，**完整消息池**占优。所有人看到一切时，分析谁说了什么很简单。
- 智能体很多、角色同质但实例众多（群体）、对话长时间运行时，**黑板**占优。路由节省词元成本、减少上下文污染。

生产系统常混用：顶层规划层用小型完整池，下层工作者层用黑板。

### 一个记忆投毒场景（Memory poisoning, in one scenario）

三个智能体研究任务：A 是检索者，B 是摘要者，C 是分析者。

1. A 获取页面，写入共享状态：“研究报告准确率提升 42%。”
2. 页面实际说“提升 4.2%”。A 幻觉出了小数点错误。
3. B 读取共享状态后写：“报告准确率大幅提升 42%（来源：A）。”
4. C 读取共享状态后写：“建议采用，42% 提升具有变革性。”
5. 最终报告引用从未存在的 42% 数字。

没有智能体崩溃，没有测试失败，系统“工作了”。幻觉通过共享状态从一个上下文进入所有下游推理。

### 为什么是结构性问题（Why this is structural）

没有共享状态，A 的幻觉留在 A 上下文中，下游重新获取或推导，可能发现错误。朴素共享状态让 A 的上下文成为所有人的上下文，把幻觉洗成事实。

问题不是共享状态本身，而是**没有来源追踪、没有独立验证者的共享状态**。三项措施可缓解：

1. **每次写入记录来源（Provenance）。** 每条记录保存谁写、何时写、在何种提示词下写，以及适用时引用何来源。下游按来源持怀疑态度阅读。
2. **写入版本化并仅追加。** 纠正是取代旧记录的新条目，而非原地更新，审计轨迹得以保留。
3. **至少保留一个不能写共享状态的智能体。** 只读验证者抽查条目，重新获取来源，标记不一致。不能写池，因此不能被池投毒。

### 黑板先例（Blackboard precedent，Hayes-Roth 1985）

黑板模式比 LLM 智能体早四十年。Hayes-Roth（1985，《控制的黑板架构》）描述专职知识源（Knowledge Source）观察全局黑板、贡献局部解并触发其他知识源。2026 年黑板（CA-MCP、Matrix）同样如此，只是 LLM 智能体成为知识源，JSON 块成为局部解。旧文献已有写争用、机会式控制、一致性方案，现代系统正在重新发现。

### 投影与完整视图（Projection vs full view）

纯黑板给每个订阅者同样的主题范围投影。更进一步是**逐智能体投影（Per-agent projection）**：为角色定制视图。LangGraph 状态归约器是 2026 年典型实现，归约函数将全局状态折叠成角色切片。

逐智能体投影扩展更远，但需要模式，否则每个智能体提示词都在重新拼凑临时投影。

### 写争用模式（Write-contention patterns）

多个智能体同时写入是并发问题，不只是 LLM 问题。有三种有效模式：

- **串行写入者（Sequential writer，单生产者）。** 所有写入经过一个协调智能体串行化，简单但有瓶颈。
- **带版本的乐观并发（Optimistic concurrency）。** 每条记录有版本，版本不符则写失败并重试，是经典数据库技术。
- **主题分区（Topic partitioning）。** 不同智能体拥有不同主题，无跨主题争用，但需设计分区边界。

多数 2026 年框架默认串行写入者，因为 LLM 调用足够慢，争用罕见，瓶颈没有明显影响。

### 不可写验证者（The unwritable verifier）

最关键的缓解措施是只读验证者。实现规则：

- 验证者与团队共享状态，读取黑板或消息池。
- 验证者没有共享状态写句柄，只能写独立验证通道。
- 验证者独立获取写入引用的来源，标记分歧。
- 验证者输出路由给人类或独立决策智能体，绝不反馈回池。

没有隔离，验证输出会成为池中新条目，受污染的池污染验证者，验证者再污染验证结果。

```figure
swarm-blackboard
```

## 动手实现（Build It）

`code/main.py` 用标准库 Python 实现两种拓扑、简化投毒攻击及三种缓解措施。

- `MessagePool`：可完整读取的线程安全仅追加日志。
- `Blackboard`：主题键控发布/订阅，支持逐智能体订阅。
- `ProvenanceEntry`：每次写入记录 (writer, timestamp, prompt_hash, source_uri)。
- `PoisoningScenario`：三智能体研究任务，A 幻觉出小数点错误，打印最终报告。
- `Verifier`：重新获取来源、标记不一致的只读智能体，加入验证者后重跑相同场景。

运行：

```
python3 code/main.py
```

预期输出：
- 运行 1（无验证者）：幻觉的 42% 传播到最终报告。
- 运行 2（有验证者）：验证者标记不一致，池标为“flagged”，最终报告包含撤回声明。

## 实际应用（Use It）

`outputs/skill-memory-auditor.md` 审计多智能体共享记忆设计的来源追踪、版本管理、验证者隔离。新架构投产前运行。

## 交付成果（Ship It）

任何共享记忆设计都应：

- 每次写入记录来源：`(writer, timestamp, prompt_hash, tool_calls_cited, source_uri)`。
- 日志仅追加。纠正是引用被取代记录的新条目。
- 至少部署一个有独立来源访问能力的只读验证智能体。
- 验证输出走独立通道，不回共享池。
- 记录替代性写入占比，上升是幻觉模式的早期证据。

## 练习（Exercises）

1. 运行 `code/main.py`，确认运行 1 传播幻觉，运行 2 发现它。
2. 增加第二个幻觉：B 编造数据集大小。验证者应发现两者，无需专门为任何一个调校。
3. 将完整池改为按 `prices`、`summaries`、`analyses` 主题分区的黑板。主题分区使哪些投毒更难，哪些没有帮助？
4. 阅读 Hayes-Roth（1985，《控制的黑板架构》），找出两种本课未讨论、2026 年系统可以受益的控制模式。
5. 阅读 CA-MCP（arXiv:2601.11595），把共享上下文存储映射到 `code/main.py` 中 MessagePool 或 Blackboard 类。CA-MCP 额外增加哪些原语？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 消息池（Message pool） | “共享聊天历史” | 所有智能体读取的仅追加日志，完全透明，扩展差。 |
| 黑板（Blackboard） | “共享工作区” | 主题键控发布/订阅，订阅相关主题，扩展更远。 |
| 来源追踪（Provenance） | “谁写了什么” | 每次写入的元数据：写者、时间戳、提示词、来源。 |
| 记忆投毒（Memory poisoning） | “幻觉传播” | 一个错误进入共享状态，下游当成事实。 |
| 仅追加（Append-only） | “不原地更新” | 纠正用新条目取代旧条目，保留审计轨迹。 |
| 不可写验证者（Unwritable verifier） | “独立审计员” | 重新获取来源并标记不一致的只读智能体。 |
| 投影（Projection） | “限域视图” | 从全局状态计算的逐智能体视图，LangGraph 归约器是典型。 |
| 知识源（Knowledge Source） | “专职智能体” | Hayes-Roth 1985 年对黑板参与者的称呼。 |

## 延伸阅读（Further Reading）

- [Cemri 等：多智能体 LLM 系统为何失败（Why Do Multi-Agent LLM Systems Fail?）](https://arxiv.org/abs/2503.13657)：MAST 分类，记忆投毒是协调故障子类
- [CA-MCP：上下文感知多服务器 MCP（Context-Aware Multi-Server MCP）](https://arxiv.org/abs/2601.11595)：协调 MCP 服务器的共享上下文存储
- [Matrix：去中心化多智能体框架（decentralized multi-agent framework）](https://arxiv.org/abs/2511.21686)：无中心编排者的消息队列黑板
- [LangGraph 状态与归约器（state and reducers）](https://docs.langchain.com/oss/python/langgraph/workflows-agents)：生产中的逐智能体投影
- [Anthropic：如何构建多智能体研究系统（How we built our multi-agent research system）](https://www.anthropic.com/engineering/multi-agent-research-system)：生产部署的来源与验证说明
