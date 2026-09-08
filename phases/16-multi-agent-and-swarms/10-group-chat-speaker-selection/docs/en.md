# 群聊与发言者选择（Group Chat and Speaker Selection）

> 共享对话编排把 N 个智能体放进一场对话，由选择函数（LLM、轮询或自定义）决定谁接着发言。这是涌现式多智能体对话的原型：智能体不知道自己在静态图中的角色，只对共享池作出反应。AutoGen GroupChat 和 AG2 GroupChat 是参考实现：AG2 分支保留了 AutoGen v0.2 的 GroupChat 语义，AutoGen v0.4 则重写为事件驱动行为者模型（Actor model）。Microsoft 在 2026 年 2 月将 AutoGen 转为维护模式，并与 Semantic Kernel 合并成 Microsoft Agent Framework（2026 年 2 月 RC）。GroupChat 原语在 AG2 和 Microsoft Agent Framework 中都得以延续，一次学会，处处可用。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 04 原语模型（Primitive Model）
**Time:** ~60 分钟

## 问题（Problem）

工作流已知时，静态图（LangGraph）很适合。但真实对话不是静态的：编码者有时问评审员，有时问研究员，有时问写作者。硬编码所有可能交接会导致边数量爆炸。你需要*智能体对共享池作出反应*，由某个函数决定谁接着说。

这正是 AutoGen GroupChat 的作用。

## 概念（Concept）

### 结构（The shape）

```
              ┌─── 共享消息池 ─────┐
              │   m1  m2  m3  ...  │
              └─────────┬──────────┘
                        │（所有人读取全部消息）
      ┌─────────┬───────┼─────────┬─────────┐
      ▼         ▼       ▼         ▼         ▼
   智能体 A  智能体 B 智能体 C  智能体 D  选择器
                                             │
                                             ▼
                                     “下一发言者 = C”
```

每个智能体看到所有消息。每轮调用选择函数，决定下一位发言者。

### 三种选择器（The three selector flavors）

**轮询（Round-robin）。** 固定循环、确定性。随 N 线性扩展，但忽略上下文：即使讨论法务评审，也会轮到编码者。

**LLM 选择（LLM-selected）。** 调用 LLM 读取近期消息池，返回最适合的下一位发言者。感知上下文但慢，每轮多一次 LLM 调用。这是 AutoGen 的默认方式。

**自定义（Custom）。** 按需编写 Python 函数。常见做法是 LLM 选择加兜底规则，如“编码者之后总让验证者发言”。

### ConversableAgent API（The ConversableAgent API）

```
agent = ConversableAgent(
    name="coder",
    system_message="You write Python.",
    llm_config={...},
)
chat = GroupChat(agents=[coder, reviewer, tester], messages=[])
manager = GroupChatManager(groupchat=chat, llm_config={...})
```

`GroupChatManager` 持有选择器。智能体完成一轮后，管理器调用选择器返回下一个智能体，循环直至终止条件成立。

### 终止（Termination）

三种常见模式：

- **最大轮数。** 总轮数硬上限。
- **“TERMINATE”词元。** 智能体可发出哨兵消息，管理器看到后停止。
- **目标达成检查。** 每轮运行轻量验证者，完成后结束聊天。

### 谱系：分支与合并（Lineage: forks and mergers）

2025 年初，Microsoft 开始围绕事件驱动行为者模型大幅重写 AutoGen（v0.4）。社区将 AutoGen v0.2 的 GroupChat 语义分支为 AG2，保留早期采用者已集成的 API。

2026 年 2 月，Microsoft 宣布 AutoGen 转入维护模式，事件驱动行为者模型并入 **Microsoft Agent Framework**（2026 年 2 月 RC，现与 Semantic Kernel 合并）。GroupChat 概念在两条路线都保留，但实现细节不同。兼容 v0.2 的代码应优先选 AG2 为上游。

### GroupChat 何时适合（When GroupChat fits）

- **涌现式对话。** 不想预先连接所有可能的下一位发言者。
- **角色混合任务。** 编码者问研究员，研究员问档案员，档案员再问编码者，流程不是有向无环图（DAG）。
- **探索式解题。** 类似“头脑风暴会议”，而非“装配线”。

### 何时失败（When it fails）

- **严格确定性。** LLM 选择器可能不一致，相同提示词在不同运行中选出不同发言者。
- **迎合级联（Sycophancy cascade）。** 智能体顺从最自信的发言者，需用提示词明确对抗。
- **上下文膨胀（Context bloat）。** 每个智能体读取所有消息，10 轮后上下文庞大。用投影（Projection，第 15 课）限制视图。
- **热点发言者（Hot speakers）。** 选择器偏爱某智能体专长，导致其主导对话。在选择器中引入发言均衡。

### 群聊与监督者（Group chat vs supervisor）

同样的原语，不同的默认设置：

- 监督者：一个智能体规划，其他执行。选择器就是“问规划者该做什么”。
- 群聊：所有智能体对等，选择器是作用于共享池的函数。

两者都使用第 04 课的四原语。群聊默认 LLM 选择式编排和完整消息池共享状态。

```figure
swarm-speaker
```

## 动手实现（Build It）

`code/main.py` 用标准库从零实现 GroupChat。包含三个智能体（编码者、评审员、管理者），轮询与 LLM 选择两种变体，并以 `TERMINATE` 词元终止。

演示打印两种变体的对话记录和选择器决策轨迹。

运行：

```
python3 code/main.py
```

## 实际应用（Use It）

`outputs/skill-groupchat-selector.md` 为给定任务配置 GroupChat 选择器：轮询、LLM 选择或自定义，以及使用哪些输入（近期消息、智能体专长、发言轮数）。

## 交付成果（Ship It）

检查清单：

- **最大轮数上限。** 始终设置，典型任务为 10-20 轮。
- **发言均衡指标。** 追踪各智能体轮数，不均衡超过阈值时告警。
- **终止词元。** `TERMINATE` 或专用验证智能体。
- **投影或限域记忆。** 约 10 条消息后，考虑只给各智能体限域视图，防止上下文膨胀。
- **选择器日志。** LLM 选择式变体同时记录输入与选择，否则无法调试。

## 练习（Exercises）

1. 运行 `code/main.py`，比较轮询与 LLM 选择的对话。各自哪个智能体占主导？
2. 在选择器中加入“每个智能体最大发言次数”规则，观察对对话记录的影响。
3. 实现目标达成终止：评审员返回“approved”时停止。它多常在轮数上限前触发？
4. 阅读 AutoGen 稳定版 GroupChat 文档（https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html），指出 `GroupChatManager` 默认选择器。
5. 阅读 AG2 仓库（https://github.com/ag2ai/ag2），比较 v0.2 GroupChat 和 v0.4 事件驱动版。v0.4 增加了哪种具体性质（吞吐量、容错、可组合性）？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 群聊（GroupChat） | “智能体同处聊天室” | 共享消息池 + 选择函数，AutoGen / AG2 原语。 |
| 发言者选择（Speaker selection） | “谁接着说” | 选择下个智能体的函数，轮询、LLM 选择或自定义。 |
| GroupChatManager | “会议主持人” | 持有选择器并循环轮次的 AutoGen 组件。 |
| ConversableAgent | “基础智能体” | AutoGen 基类，可发送和接收消息的智能体。 |
| 终止词元（Termination token） | “‘停止’词” | 结束聊天的哨兵字符串，通常为 `TERMINATE`。 |
| 热点发言者（Hot speaker） | “一个智能体主导” | 选择器反复选择同一智能体的故障模式。 |
| 上下文膨胀（Context bloat） | “池无限增长” | 每个智能体读取所有历史消息，上下文随轮次增长。 |
| 投影（Projection） | “限域视图” | 共享池面向特定角色的视图，防止上下文膨胀。 |

## 延伸阅读（Further Reading）

- [AutoGen 群聊文档（group chat docs）](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/group-chat.html)：参考实现
- [AG2 仓库（AG2 repo）](https://github.com/ag2ai/ag2)：社区延续的 AutoGen v0.2
- [Microsoft Agent Framework 文档（docs）](https://learn.microsoft.com/en-us/agent-framework/)：合并后的继任者，2026 年 2 月 RC
- [AutoGen v0.4 发布说明（release notes）](https://microsoft.github.io/autogen/stable/)：事件驱动行为者模型重写细节
