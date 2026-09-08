# 记忆块与休眠时计算（Memory Blocks and Sleep-Time Compute）

> 将记忆划分为各有用途、可由模型直接编辑的记忆块（Memory block）；在主智能体空闲时，由休眠时智能体异步整合记忆。这两项设计让记忆不再局限于单次对话。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 07（MemGPT）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说出 Letta 的三个记忆层级：核心（Core）、回忆（Recall）、归档（Archival），以及各自作用。
- 解释记忆块模式：用户块（Human block）、角色设定块（Persona block）和用户自定义块是一等的带类型对象。
- 描述什么是休眠时计算（Sleep-time compute）、为什么它位于关键路径之外，以及为什么它可以使用比主智能体更强的模型。
- 实现脚本化双智能体循环，主智能体响应用户，休眠时智能体在轮次之间整合记忆块。

## 问题（The Problem）

MemGPT（第 07 课）解决了虚拟内存控制流，但生产中出现三个问题：

1. **延迟（Latency）。** 每项记忆操作都在关键路径上。如果用户等待时智能体还要裁剪、总结或协调冲突，尾延迟（Tail latency）就会激增。
2. **记忆腐化（Memory rot）。** 写入不断积累，被反驳的事实仍然保留，检索被过时内容淹没。
3. **结构丢失（Structure loss）。** 平面归档存储无法表达“用户块始终在提示词中；角色设定块始终在提示词中；任务块按会话更换”。

Letta（letta.com）是原 MemGPT 项目于 2024 年采用的平台名称，论文中的模式仍称 MemGPT；2026 年的 Letta V1 重写则是后来独立的一步。记忆块使结构显式化，休眠时计算将整合移出关键路径。

## 概念（The Concept）

### 三个层级（Three tiers）

| 层级 | 范围 | 存放位置 | 写入者 |
|------|-------|----------------|------------|
| 核心（Core） | 始终可见 | 主提示词内部 | 智能体工具调用 + 休眠时重写 |
| 回忆（Recall） | 对话历史 | 可检索 | 自动记录轮次 |
| 归档（Archival） | 任意事实 | 向量 + KV + 图 | 智能体工具调用 + 休眠时摄入 |

核心层对应 MemGPT 的核心记忆，回忆层是对话缓冲区及被驱逐的尾部，归档层是外部存储。这一划分消除了 MemGPT 双层设计承载多重职责的问题。

### 记忆块（Memory blocks）

块是核心层中带类型、持久、可编辑的章节。原 MemGPT 论文定义了两个：

- **用户块（Human block）**：关于用户的事实，如姓名、角色、偏好、目标。
- **角色设定块（Persona block）**：智能体的自我概念，如身份、语气、约束。

Letta 将其推广为任意用户自定义块：保存当前目标的 `Task` 块、保存代码库事实的 `Project` 块、保存硬约束的 `Safety` 块。每个块有 `id`、`label`、`value`、`limit`（字符上限）、`description`（让模型知道何时编辑它）。

块可通过工具接口编辑：

- `block_append(label, text)`
- `block_replace(label, old, new)`
- `block_read(label)`
- `block_summarize(label)`：压缩接近上限的块。

### 休眠时计算（Sleep-time compute）

Letta 在 2025 年增加了这项能力：在后台、关键路径之外运行第二个智能体。休眠时智能体处理对话记录和代码库上下文，将 `learned_context` 写入共享块，并整合归档记录或使其失效。

由此带来的性质包括：

- **没有延迟代价（No latency cost）。** 主响应无需等待记忆操作。
- **允许使用更强模型（Stronger model allowed）。** 休眠时智能体可以使用更贵、更慢的模型，因为它不受延迟约束。
- **自然的整合时机（Natural consolidation window）。** 用户不在等待时，进行去重、总结，并使被反驳的事实失效。

这种形态类似人的工作方式：先做任务，睡一觉，长期记忆在夜间逐渐巩固。

### 原生推理（Native reasoning）

Letta V1（`letta_v1_agent`，2026）弃用 `send_message`/心跳和内联 `Thought:` 词元，转向原生推理。Responses API（OpenAI）和带扩展思考的 Messages API（Anthropic）在独立通道输出推理，并跨轮次透传；生产环境中跨提供商传递时采用加密。控制循环仍然是 ReAct。思考轨迹成为结构的一部分，而不是提示词形式的文本。

### 这一模式会在哪里出错（Where this pattern goes wrong）

- **块膨胀（Block bloat）。** 无限调用 `block_append` 很快就会达到上限。在会导致超限的写入之前接入块摘要器。
- **静默偏移（Silent drift）。** 休眠时智能体重写块，主智能体却从未注意到。为块添加版本，并在轨迹中呈现差异。
- **整合投毒（Poisoned consolidation）。** 休眠时智能体将攻击者可触达的内容处理后写入核心层。第 27 课也适用于休眠时处理范围。

```figure
memory-blocks
```

## 动手实现（Build It）

`code/main.py` 实现：

- `Block`：id、label、value、limit、description。
- `BlockStore`：增删改查（CRUD）与 `near_limit(label)` 辅助方法。
- 两个脚本化智能体：`PrimaryAgent` 处理轮次，`SleepTimeAgent` 在轮次之间整合。
- 轨迹展示三轮对话及块写入，再展示一次休眠时处理，对块进行总结并使一个过时事实失效。

运行：

```
python3 code/main.py
```

记录展示了职责划分：主轮次快速响应并产生原始写入，休眠时处理负责压缩与清理。

## 实际应用（Use It）

- **Letta**（letta.com）提供参考实现，可自托管或使用托管云。
- **Claude Agent SDK 技能（Skills）**可视为块状知识：技能是命名、有版本、可检索的指令块，智能体按需加载。
- **自定义构建（Custom builds）**适合希望掌控存储后端的团队。采用 Letta API 契约，方便以后迁移。

## 交付成果（Ship It）

`outputs/skill-memory-blocks.md` 为任意运行时生成带休眠时钩子的 Letta 式块系统，包括安全规则和引用连接。

## 练习（Exercises）

1. 添加 `block_summarize` 工具，在 `near_limit` 返回 true 时，用模型生成的摘要替换块值。哪个触发阈值能同时尽量减少摘要调用和块溢出？
2. 对归档实现休眠时去重：文本词元重叠 >90% 的两条记录合并为一条。只在休眠时处理阶段执行，绝不放在关键路径上。
3. 为块添加版本。每次写入记录旧值和差异。暴露 `block_history(label)`，让运维人员能调试“智能体为什么忘记 X”。
4. 将休眠时智能体视为不可信写入者。它们触及角色设定块或安全块时，提交前要求第二个智能体评审。
5. 将示例迁移为使用 Letta API（`letta_v1_agent`）。块的结构定义（Schema）有何变化？原生推理如何改变轨迹结构？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 记忆块（Memory block） | “可编辑提示词章节” | 核心记忆中带类型、持久、可由 LLM 编辑的片段 |
| 用户块（Human block） | “用户记忆” | 关于用户的事实，固定在核心层 |
| 角色设定块（Persona block） | “智能体身份” | 自我概念、语气、约束，固定在核心层 |
| 休眠时计算（Sleep-time compute） | “异步记忆工作” | 第二个智能体在关键路径之外进行整合 |
| 核心 / 回忆 / 归档（Core / Recall / Archival） | “层级” | 三层记忆划分：始终可见 / 对话 / 外部 |
| 块上限（Block limit） | “容量上限” | 每块的字符限制，会强制触发总结 |
| 原生推理（Native reasoning） | “思考通道” | 提供商级推理输出，不是提示词级 `Thought:` |
| 已学习上下文（Learned context） | “休眠输出” | 休眠时智能体写入共享块的事实 |

## 延伸阅读（Further Reading）

- [Letta，记忆块博客（Memory Blocks）](https://www.letta.com/blog/memory-blocks)：块模式。
- [Letta，休眠时计算博客（Sleep-time Compute）](https://www.letta.com/blog/sleep-time-compute)：异步整合。
- [Letta，重新设计智能体循环（Rearchitecting the Agent Loop）](https://www.letta.com/blog/letta-v1-agent)：原生推理重写。
- [Packer 等人，MemGPT（arXiv:2310.08560）](https://arxiv.org/abs/2310.08560)：起源。
