# 技能库与终身学习（Skill Libraries and Lifelong Learning，Voyager）

> Voyager（Wang 等人，TMLR 2024）将可执行代码视为技能（Skill）。技能有名称、可检索、可组合，并由环境反馈推动改进。这是 Claude Agent SDK 技能、skillkit 和 2026 年技能库模式的参考架构。

**Type:** Build
**Languages:** Python (stdlib)
**Prerequisites:** 阶段 14 · 07（MemGPT）、阶段 14 · 08（Letta 记忆块，Letta Blocks）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 说出 Voyager 的三个组件：自动课程（Automatic curriculum）、技能库（Skill library）、迭代提示（Iterative prompting），以及各自作用。
- 解释为什么 Voyager 将行动空间（Action space）设为代码，而不是原始命令。
- 用标准库实现支持注册、检索、组合和失败驱动改进的技能库。
- 将 Voyager 模式映射到 2026 年 Claude Agent SDK 技能和 skillkit 生态。

## 问题（The Problem）

每次会话都从头重建所有能力的智能体，会犯三个错误：

1. **浪费词元（Waste tokens）。** 每项任务都重新引出相同的推理。
2. **丢失进展（Lose progress）。** 会话 A 学到的纠正无法迁移到会话 B。
3. **无法完成长时程组合（Fail on long-horizon composition）。** 复杂任务需要能力层级，单次提示无法表达。

Voyager 的回答是：将每项可复用能力视为命名代码片段，存入库中，按相似度检索，与其他技能组合，并依据执行反馈改进。

## 概念（The Concept）

### 三个组件（Three components）

Voyager（arXiv:2305.16291）围绕以下组件组织智能体：

1. **自动课程（Automatic curriculum）。** 好奇心驱动的提议器根据智能体当前技能集和环境状态，选择下一个任务。探索是自底向上的。
2. **技能库（Skill library）。** 每项技能都是可执行代码。任务成功时添加新技能，按查询与描述之间的相似度检索技能。
3. **迭代提示机制（Iterative prompting mechanism）。** 失败时，智能体接收执行错误、环境反馈和自我验证输出，再改进技能。

Minecraft 评估（Wang 等人，2024）显示，相比基线，独特物品数量为 3.3 倍，获得石制工具速度为 8.5 倍、铁制工具为 6.4 倍，地图探索距离为 2.3 倍。这些数字专属于 Minecraft，但模式可以迁移。

### 行动空间 = 代码（Action space = code）

大多数智能体输出原始命令，Voyager 输出 JavaScript 函数。一项技能如下：

```
async function craftIronPickaxe(bot) {
  await mineIron(bot, 3);
  await mineStick(bot, 2);
  await placeCraftingTable(bot);
  await craft(bot, 'iron_pickaxe');
}
```

它由子技能组成，按描述和嵌入存储索引，检索得到的是程序，而不是提示词。

这就是 2026 年 Claude Agent SDK 的技能：命名、可检索的代码片段加指令，由智能体按需加载。

### 技能检索（Skill retrieval）

面对新任务“制作一把钻石镐”，智能体：

1. 对任务描述生成嵌入。
2. 查询技能库中最相似的 top-k 技能。
3. 检索 `craftIronPickaxe`、`mineDiamond`、`placeCraftingTable` 等。
4. 用检索到的基础技能加新逻辑组合出新技能。

这就是 MCP 资源（阶段 13）与 Agent SDK 技能实现的模式：在知识和代码范围内检索，并限定于当前任务。

### 迭代改进（Iterative refinement）

Voyager 的反馈循环：

1. 智能体编写技能。
2. 技能在环境中运行。
3. 返回三种信号之一：`success`、`error`（带堆栈轨迹）、`self-verification failure`。
4. 智能体以信号为上下文重写技能。
5. 循环直到成功或达到最大轮数。

这是将 Self-Refine（第 05 课）应用到代码生成，并以环境为依据进行验证。CRITIC（第 05 课）是相同模式，只是以外部工具作为验证器。

### 课程与探索（Curriculum and exploration）

Voyager 的课程模块根据智能体现有能力和尚未完成的工作，提出“在湖边建庇护所”之类的任务。提议器用环境状态和技能清单，选择略高于当前能力的任务，这正是适宜探索的难度。

对生产智能体，这对应“缺少什么”的操作：给定当前技能库和一个领域，哪些技能尚未覆盖？团队通常通过人工课程评审实现这一点。

### 这一模式会在哪里出错（Where this pattern goes wrong）

- **技能库腐化（Skill library rot）。** 同一技能以略有不同的描述添加 10 次。写入时去重，检索只返回一项。
- **组合技能偏移（Composed-skill drift）。** 父技能依赖的子技能被改进。应给技能加版本；固定到 v1 的父技能不会自动获得 v3。
- **检索质量（Retrieval quality）。** 技能库超过几百项后，基于描述的向量检索会退化。补充标签过滤和硬约束，例如“只要 `category=tooling` 的技能”。

```figure
voyager-skills
```

## 动手实现（Build It）

`code/main.py` 实现标准库技能库：

- `Skill`：name、description、code（字符串形式）、version、tags、dependencies。
- `SkillLibrary`：注册、搜索（词元重叠）、组合（依赖拓扑排序）和改进（更新时递增版本）。
- 脚本化智能体注册三个基础技能、组合出第四个、遇到失败并改进。

运行：

```
python3 code/main.py
```

轨迹展示技能库写入、检索、组合、一次执行失败，以及 v2 改进，端到端呈现 Voyager 循环。

## 实际应用（Use It）

- **Claude Agent SDK 技能（Skills）**（Anthropic）：2026 年参考实现，每项技能有描述、代码和指令，在智能体会话中按需加载。
- **skillkit**（npm: skillkit）：面向 32+ 个 AI 编码智能体的跨智能体技能管理。
- **自定义技能库（Custom skill libraries）**：用于专门领域，如数据智能体的 SQL 技能、基础设施智能体的 Terraform 技能。Voyager 模式也适用于小规模实现。
- **OpenAI Agents SDK `tools`**：最简形式，每个工具都是轻量技能。

## 交付成果（Ship It）

`outputs/skill-skill-library.md` 为任意目标运行时生成 Voyager 式技能库，接好注册、检索、版本管理和改进。

## 练习（Exercises）

1. 为 `compose()` 添加依赖环检测器。技能 A 依赖 B，而 B 又依赖 A 时会怎样？应报错还是警告？
2. 实现每技能版本固定。父技能组合子技能 `crafting@1` 时，改进为 `crafting@2` 不得悄悄升级父技能。
3. 用 sentence-transformers 嵌入或标准库 BM25 实现替换词元重叠检索。在含 50 个技能的玩具库上测量 retrieval@5。
4. 添加“课程”智能体：给定当前技能库和领域描述，提出 5 项缺失技能。每周调用一次。
5. 阅读 Anthropic 的 Claude Agent SDK 技能文档。调整示例技能库，使其符合 SDK 的技能结构定义（Schema）。技能的可发现性有何变化？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 技能（Skill） | “可复用能力” | 命名代码片段 + 描述，可按相似度检索 |
| 技能库（Skill library） | “智能体的操作经验记忆” | 技能的持久存储，可搜索、可组合 |
| 课程（Curriculum） | “任务提议器” | 由当前能力差距驱动、自底向上的目标生成器 |
| 组合（Composition） | “技能 DAG” | 技能调用技能，执行时按拓扑排序 |
| 迭代改进（Iterative refinement） | “自我纠错循环” | 环境反馈、错误、自我验证被纳入下一版本 |
| 代码即行动空间（Action-space-as-code） | “程序化行动” | 输出函数而不是原始命令，以支持跨时间延展的行为 |
| 写入去重（Dedup on write） | “技能合并” | 将近似重复描述合并为一个规范技能 |

## 延伸阅读（Further Reading）

- [Wang 等人，Voyager（arXiv:2305.16291）](https://arxiv.org/abs/2305.16291)：原始技能库论文。
- [Claude Agent SDK 概览（Overview）](https://platform.claude.com/docs/en/agent-sdk/overview)：技能在 2026 年的产品化。
- [Anthropic，用 Claude Agent SDK 构建智能体（Building agents with the Claude Agent SDK）](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)：技能和子智能体实践。
- [Madaan 等人，Self-Refine（arXiv:2303.17651）](https://arxiv.org/abs/2303.17651)：Voyager 底层的改进循环。
