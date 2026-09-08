# 心智理论与涌现协调（Theory of Mind and Emergent Coordination）

> Li 等人（arXiv:2310.10701）表明，协作式文字游戏中的 LLM 智能体会表现出**涌现的高阶心智理论（Theory of Mind，ToM）**，即推理另一智能体对第三个智能体信念的看法，但由于上下文管理和幻觉问题，在长程规划中失败。Riedl（arXiv:2510.05174）测量了智能体群体的高阶协同效应，发现**只有** ToM 提示条件会产生与身份关联的分化及目标导向的互补；能力较低的 LLM 仅表现出伪涌现。也就是说，协调的涌现取决于提示条件和模型，并非免费获得。本课实现一个最小化的 ToM 感知智能体，在有、无 ToM 提示的条件下运行协作任务，并按 Riedl 2025 协议测量协调差异。

**Type:** Learn + Build
**Languages:** Python (stdlib)
**Prerequisites:** Phase 16 · 07 心智社会与辩论（Society of Mind and Debate）, Phase 16 · 17 生成式智能体（Generative Agents）
**Time:** ~75 分钟

## 问题（Problem）

多智能体协调往往看起来很神奇：智能体分工、预判彼此行为、避免重复工作。通常，这种“涌现”只是提示工程的产物：有人告诉智能体要“协调”。移除提示，协调也随之消失。

Riedl 在 2025 年的发现更严格：在受控条件下，只有提示智能体推理**其他智能体的心智**（ToM），协调才会涌现。没有 ToM 提示，即使强模型表现出的协调模式也无法经受统计控制检验。这对生产环境很重要：团队交付的“多智能体协调”功能可能依赖提示且十分脆弱。

本课将 ToM 视为一种特定能力，即推理关于信念的信念，构建一个最小化的 ToM 感知智能体，并测量真实协调与提示包装的区别。

## 概念（Concept）

### ToM 的含义（What ToM means）

发展心理学：3 岁儿童认为任何人的内心世界都和自己一样。5 岁儿童理解别人拥有不同的信念。7 岁儿童会推理关于信念的信念（“她认为我觉得球在杯子下面”）。这些分别是零阶、一阶和二阶 ToM。

对 LLM 智能体而言，ToM 的阶数对应以下能力：

- **零阶（Zeroth-order）：**没有他人模型。智能体只根据自己的观察行动。
- **一阶（First-order）：**智能体为其他每个智能体的信念建立模型。“Alice 相信 X。”
- **二阶（Second-order）：**智能体对递归信念建模。“Alice 认为 Bob 相信 X。”

Li 等人在 2023 年发现，协作游戏中的 LLM 智能体会涌现一阶和二阶 ToM，但其表现随任务跨度增长和通信不可靠而下降。

### Sally-Anne 测试简介（The Sally-Anne test, in brief）

1985 年提出的错误信念测试：Sally 把一颗弹珠放进篮子 A 后离开。Anne 将弹珠移到篮子 B。Sally 回来后会去哪里找？拥有一阶 ToM 的儿童会回答篮子 A（Sally 的信念与现实不同）；没有这一能力的儿童会回答篮子 B。

GPT-4 时代的 LLM 能通过直白表述的 Sally-Anne 类测试。当叙事很长、场景多次变化或问题以间接方式表达时，它们会失败。这就是 2026 年生产级 LLM 中 ToM 的实际状况。

### Riedl 的协调测量（Riedl's coordination measurement）

Riedl（arXiv:2510.05174）构建了群体规模的测试：N 个智能体、一个协作目标、多种提示条件。测量内容包括：

1. **身份关联分化（Identity-linked differentiation）。**智能体是否随时间形成稳定的角色差异？
2. **目标导向互补（Goal-directed complementarity）。**智能体的行动是否相互补充（执行不同子任务），而非重复？
3. **高阶协同效应（Higher-order synergy）。**统计测量群体是否实现了任何子集都无法实现的结果。

结果：只有在 ToM 提示条件下，这三个指标才全部产生高于基线的信号。没有 ToM 提示时，中等能力模型的指标徘徊在随机水平附近。大型模型在没有显式 ToM 提示时也表现出一定协调，但效果弱于显式提示条件。

### 协调假象（The coordination illusion）

若无统计控制，演示中的“涌现协调”往往反映的是：

- 将协调预先写入提示的提示工程（例如要求“共同合作”的系统提示）。
- 观察者偏差（我们看到自己预期的模式）。
- 事后挑选成功的运行记录。

生产系统在没有可测量信号的情况下宣传“涌现协调”，应将其视为营销。先测量，再作出主张。

### 最小化的 ToM 感知智能体（A minimal ToM-aware agent）

结构：

```
智能体状态：
  own_beliefs:    {智能体相信的事实}
  other_models:   {other_agent_id -> {beliefs_the_agent_attributes_to_them}}
  actions_last_N: [其他智能体的行动历史]

观察更新：
  - 根据直接观察更新 own_beliefs
  - 根据对方的行动与先前信念更新 other_models[agent_id]

行动选择：
  - 枚举候选行动
  - 对每个候选，根据所建模的信念，预测其他各智能体下一步会做什么
  - 在这些预测下，选择使联合结果最大化的行动
```

`other_models` 属性就是 ToM 状态。一阶 ToM 只保留一层。二阶增加 `other_models[i][other_models_of_j]`，即我认为智能体 i 如何看待智能体 j 的信念。

### 长程任务为何造成损害（Why long-horizon hurts）

Li 等人记录了以下现象：上下文限制会让智能体忘记哪个信念属于谁。幻觉会把错误信念加入其他智能体的模型。两者都会造成“我以为他认为 X”的错误，并随时间累积。

论文及 2024–2026 年后续研究记录的缓解方法包括：

- **在提示中显式呈现 ToM 状态（Explicit ToM state in the prompt）。**使用结构化格式：`{agent_id: belief_list}`。强制检索过程保留身份与信念的绑定。
- **缩短推理链（Shorter reasoning chains）。**减少每轮 ToM 更新次数，以降低幻觉累积。
- **外部 ToM 存储（External ToM store）。**在 LLM 上下文之外维护模型，每轮只注入相关部分。

### ToM 在生产环境中的失败场景（Where ToM fails in production）

- **对抗环境（Adversarial settings）。**ToM 能力较好的智能体更容易被操纵（你可以对它们眼中的你建模，再利用这一点）。
- **异构团队（Heterogeneous teams）。**当模型不同时，适用于一个对手的 ToM 模型无法泛化。
- **依赖真实事实的任务（Ground-truth-dependent tasks）。**ToM 关注信念；如果正确性取决于事实，ToM 可能分散注意力。

### 能够实际测量的协调（The coordination you can actually measure）

判断团队协调真实存在而非提示包装的三个实用信号：

1. **随时间保持互补（Complementarity over time）。**在多轮任务中，智能体的行动是否覆盖互不重叠的子任务？
2. **预判（Anticipation）。**智能体 A 在 T+1 轮的行动，是否依赖于一个后来证实正确的、关于 B 在 T+2 轮行动的预测？
3. **纠正（Correction）。**当 A 在 T 轮误读 B 的信念时，A 是否会在 T+2 轮前纠正？

这些信号可以在有日志记录的多智能体系统中测量。它们是“协调”叙事的实质版本。

```figure
sw-theory-of-mind
```

## 动手构建（Build It）

`code/main.py` 实现了：

- `ToMAgent`：追踪自身信念，以及针对其他各个智能体的信念模型。
- 一个协作任务：三个智能体必须从三个盒子收集三个令牌；每个盒子可容纳一个令牌。智能体不能通信，只能从彼此行动推断意图。
- 两种配置：`zeroth_order`（无 ToM）和 `first_order`（具有一层信念模型的 ToM）。
- 在 200 次随机试验中测量完成率、重复率（两个智能体选择同一盒子）和平均完成轮数。

运行：

```
python3 code/main.py
```

预期输出：零阶智能体的工作重复率约为 35%，约 60% 的试验能在 10 轮内完成。一阶 ToM 智能体的重复率约为 5%，完成率约为 95%。两者之差就是可测量的协调效应。

## 实际使用（Use It）

`outputs/skill-tom-auditor.md` 是一个审计多智能体系统“涌现协调”主张的技能。它检查提示包装、相对对照组的统计显著性，以及测得的互补性。

## 交付上线（Ship It）

协调主张检查清单：

- **对照条件（Control condition）。**提供一个没有协调提示的系统版本，并测量两者。
- **统计检验（Statistical test）。**系统与对照组在所选指标上的差异，是否达到 `p < 0.05` 的显著性？
- **互补性度量（Complementarity measure）。**测量随时间变化的行动不重叠程度，而不只看最终成功。
- **失败案例日志（Failure-case log）。**智能体协调失误时，ToM 状态是什么样的？
- **模型能力披露（Model-capacity disclosure）。**如果效果在较小模型上消失，应明确说明。

## 练习（Exercises）

1. 运行 `code/main.py`。确认一阶 ToM 将重复率降低约 7 倍。扩展为 5 个智能体和 5 个盒子后，差距是否仍然存在？
2. 实现二阶 ToM（智能体 A 为 B 对 C 的看法建模）。它是否优于一阶？在哪些任务上？
3. 向 ToM 状态注入**幻觉（hallucination）**：每轮随机翻转一个信念。这会使一阶表现下降多少？
4. 阅读 Li 等人的论文（arXiv:2310.10701）。复现“长程退化”发现：当轮数从 10 增至 30 时，一阶 ToM 的表现如何变化？
5. 阅读 Riedl 2025（arXiv:2510.05174）。在模拟日志上实现高阶协同效应统计量。没有 ToM 提示条件时，该效应是否存在？

## 关键术语（Key Terms）

| 术语 | 直观理解 | 定义 |
|------|----------------|------------------------|
| 心智理论（Theory of Mind） | “理解他人的心智” | 为另一智能体的信念建模的能力，按阶数（0、1、2+）分级。 |
| Sally-Anne 测试（Sally-Anne test） | “错误信念测试” | 源于 1985 年发展心理学；LLM 能通过简单版本，但在复杂版本中失败。 |
| 一阶 ToM（First-order ToM） | “A 相信 X” | 为另一个体关于事实的信念建模。 |
| 二阶 ToM（Second-order ToM） | “A 认为 B 相信 X” | 递归地加深一层建模。 |
| 身份关联分化（Identity-linked differentiation） | “随时间稳定的角色” | Riedl 的指标：角色持续存在，而非随机变化。 |
| 目标导向互补（Goal-directed complementarity） | “不重叠的行动” | 智能体瞄准不同子任务，而非同一个。 |
| 高阶协同效应（Higher-order synergy） | “群体超越任何子集” | Riedl 用来衡量真实协调的统计量。 |
| 协调假象（Coordination illusion） | “看起来协调” | 经提示包装形成的协调表象，没有可测量信号。 |

## 延伸阅读（Further Reading）

- [Li 等：通过大语言模型实现多智能体协作的心智理论（Theory of Mind for Multi-Agent Collaboration via Large Language Models）](https://arxiv.org/abs/2310.10701)：协作游戏中涌现的 ToM，以及长程任务失败模式。
- [Riedl：多智能体语言模型中的涌现协调（Emergent Coordination in Multi-Agent Language Models）](https://arxiv.org/abs/2510.05174)：群体规模测量；ToM 提示是支撑效果的关键条件。
- [Premack 与 Woodruff：黑猩猩是否拥有心智理论？（Does the chimpanzee have a theory of mind?）](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/does-the-chimpanzee-have-a-theory-of-mind/1E96B02CD9850E69AF20F81FA7EB3595)：1978 年 ToM 概念的起源。
- [Baron-Cohen、Leslie、Frith：自闭症儿童是否拥有心智理论？（Does the autistic child have a theory of mind?）](https://doi.org/10.1016/0010-0277(85)90022-8)：Sally-Anne 论文（1985）。
