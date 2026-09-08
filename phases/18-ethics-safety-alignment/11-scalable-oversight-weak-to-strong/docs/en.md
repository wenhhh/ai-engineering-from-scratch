# 可扩展监督与弱到强泛化（Scalable Oversight and Weak-to-Strong Generalization）

> Burns 等人（OpenAI Superalignment，《弱到强泛化》，Weak-to-Strong Generalization，2023）提出了超级对齐（Superalignment）问题的一个代理研究设置：使用较弱模型生成的标签微调强模型。如果强模型能从不完美的弱监督中正确泛化，当前人类能力尺度的对齐方法就可能扩展到超人系统。可扩展监督（Scalable oversight）与弱到强泛化（W2SG）相互补充。可扩展监督通过辩论、递归奖励建模和任务分解，提高监督者的实际能力，使其跟上被监督模型。W2SG 则确保强模型能从监督者提供的任何不完美监督中正确泛化。《辩论有助于弱到强泛化》（Debate Helps W2SG，arXiv:2501.13124，2025 年 1 月）将两者结合。

**Type:** Learn
**Languages:** Python (stdlib, W2SG gap simulator)
**Prerequisites:** 阶段 18 · 01（指令遵循（instruction-following））、阶段 18 · 10（AI 控制（AI Control））、阶段 09（强化学习基础（RL foundations））
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 定义可扩展监督和弱到强泛化，并解释它们如何互补。
- 描述 Burns 等人 2023 年的实验设置，即使用 GPT-2 的标签微调 GPT-4。
- 解释性能差距恢复率（Performance Gap Recovered，PGR）指标及其测量内容。
- 说出三种主要可扩展监督机制，即辩论、递归奖励建模和任务分解，并分别说明一个优点。

## 问题（The Problem）

截至目前，阶段 18 的每种对齐技术都假设监督者能够评估模型行为。当模型超越人类能力时，监督者就成为薄弱环节。超级对齐的问题是：较弱的监督者能否可靠地产生更强且对齐的模型？

Burns 等人将它转化为可操作的实证设置：用弱模型监督强模型，测量强模型在弱监督下保留了多少能力。这不是超级对齐的解决方案，而是让我们能够测量进展的代理指标。

## 概念（The Concept）

### W2SG：Burns 等人的设置（The Burns et al. setup）

- 弱模型：GPT-2 级别。
- 强模型：GPT-4 级别。
- 目标：强模型 GPT-4 在任务上的能力上限。

步骤：
1. 获取弱模型在任务上的零样本（Zero-shot）预测。
2. 在弱模型标注的数据上微调强模型。
3. 测量微调后强模型的准确率。

基线包括弱模型自身的准确率，以及强模型在金标准标签监督下的上限。

差距指标为性能差距恢复率（PGR）= (fine-tuned - weak) / (ceiling - weak)。PGR 为 1.0 表示弱监督完全弥补了差距；PGR 为 0 表示弱监督没有帮助。

### Burns 等人的实证发现（Burns et al. empirical findings）

在自然语言处理（NLP）、国际象棋谜题和奖励建模任务中，PGR 始终为正：强模型能够泛化，超越弱监督者的错误。不同任务的 PGR 从约 20% 到约 80% 不等。强模型从不完美标签中“理解”目标任务，再用预训练先验补足。

Burns 等人指出的限制：
- 这里的弱强差距是能力差距，而不是对齐差距。弱模型已经对齐；真正的超人模型可能由人类对齐，但双方能力差距大得多。
- 强模型的泛化可能更多来自任务先验，而不是恢复真实意图。
- 诱发强模型的潜在知识才是真正的问题，PGR 测量的是一种具体实验实现。

### 可扩展监督的三种机制（Scalable oversight: three mechanisms）

- **辩论（Debate，Irving 等，2018）。** 两个 U 实例为相反立场辩论，弱评判者作出决定。假设是：找到令人信服的真实答案，比找到令人信服的错误答案更容易。2024–2025 年近期研究（Khan 等、Michael 等）表明，辩论有时有帮助，有时没有，是否有效取决于任务结构。
- **递归奖励建模（Recursive Reward Modeling，Leike 等，2018）。** U 帮助人类训练 U+1 的奖励模型。监督者的实际能力随模型能力一起增长。
- **任务分解（Task Decomposition，Christiano、Shlegeris、Amodei，2018）。** 递归地将困难任务拆成可由人类检查的子任务。这假设任务可分解。

每种机制都对任务结构或中间组件的对齐作出了假设。

### 为什么可扩展监督与 W2SG 互补（Why scalable oversight and W2SG are complementary）

可扩展监督提高监督者实际提供的信号质量。
W2SG 则从监督者能够提供的任何不完美信号中弥补差距。

Lang 等人的《辩论有助于弱到强泛化》（Debate Helps Weak-to-Strong Generalization，arXiv:2501.13124）将两者结合：辩论协议提供更好的弱标签，再用这些标签训练强模型。研究报告 NLP 任务上的 PGR 得到提升。

### 组织变动（The organizational drama）

Jan Leike 离开 OpenAI 加入 Anthropic 后，OpenAI 的 Superalignment 团队于 2024 年 5 月解散。可扩展监督、W2SG 和自动化对齐研究等方向，继续在 Anthropic 及学术实验室推进，包括 MATS（第 28 课）、Redwood（第 10 课）、Apollo（第 8 课）和 METR（第 28 课）。组织结构变了，研究问题没有变。

### 在阶段 18 中的位置（Where this fits in Phase 18）

第 6–10 课在 U 不可信的假设下描述威胁与防御范式。第 11 课是主动改进范式：让监督者足够强，能够验证 U 的对齐。第 12–16 课随后转向对抗评估的实用工具。

```figure
scalable-oversight
```

## 实际应用（Use It）

`code/main.py` 在合成任务上模拟 W2SG 微调。弱标注器准确率为 70%，具有结构性错误；强模型在金标准标签下的能力上限为 95%。你会在弱标签上微调强模型，测量 PGR，并与金标准监督强模型及单独弱模型比较。

## 交付成果（Ship It）

本课生成 `outputs/skill-w2sg-pgr.md`。给定监督设置描述，它会识别弱监督者、强模型和监督质量，并计算或要求提供 PGR。它会指出主张究竟是“弱者可以监督强者”，还是“弱者加监督机制可以监督强者”。

## 练习（Exercises）

1. 运行 `code/main.py`。报告 weak_accuracy = 0.60、0.70、0.80 时的 PGR，解释 PGR 曲线的形状。

2. 修改弱标注器，使其具有结构性错误，例如在特定输入类别上总是出错。PGR 会增加、下降，还是保持不变？请解释。

3. 阅读 Burns 等人 2023 年论文第 4.3 节的 NLP 任务。复现“置信度辅助损失”的直觉：当强模型比弱标签更有把握时，谁占上风？

4. 为软件工程任务设计结合辩论与任务分解的可扩展监督协议。分别指出每个组件的一种失效模式，并解释组合如何解决或未能解决这些问题。

5. 说明什么证据会证伪“弱到强泛化是通往超级对齐的可行路径”这一主张。具体描述你需要看到的实证特征。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 可扩展监督（Scalable oversight） | “让监督者更强” | 提高监督者评估更强模型能力的机制 |
| 弱到强泛化（W2SG） | “弱者监督强者” | 在弱标签上微调强模型，并测量恢复的能力 |
| 性能差距恢复率（PGR） | “恢复的性能差距” | (fine-tuned - weak) / (ceiling - weak)；1.0 表示完全弥补，0 表示无帮助 |
| 辩论（Debate） | “两个 U 实例争辩” | 弱评判者在两个 U 辩护者之间作出选择的可扩展监督机制 |
| 递归奖励建模（RRM） | “递归奖励建模” | U 帮助训练 U+1 的奖励模型，监督者能力跟随 U |
| 任务分解（Task decomposition） | “由人类检查的子任务” | 递归地将困难任务拆成可由人类验证的子任务 |
| 超级对齐（Superalignment） | “对齐超人 AI” | 研究如何对齐人类无法直接评估的模型 |

## 延伸阅读（Further Reading）

- [Burns 等：弱到强泛化（Weak-to-Strong Generalization，OpenAI 2023）](https://openai.com/index/weak-to-strong-generalization/)：W2SG 论文。
- [Irving、Christiano、Amodei：通过辩论实现 AI 安全（AI safety via debate，arXiv:1805.00899）](https://arxiv.org/abs/1805.00899)：辩论机制。
- [Leike 等：通过奖励建模实现可扩展智能体对齐（Scalable agent alignment via reward modeling，arXiv:1811.07871）](https://arxiv.org/abs/1811.07871)：递归奖励建模。
- [Khan 等：与更有说服力的大语言模型辩论会带来更真实的答案（Debating with More Persuasive LLMs Leads to More Truthful Answers，arXiv:2402.06782）](https://arxiv.org/abs/2402.06782)：2024 年关于更强辩论者的实证研究。
- [Lang 等：辩论有助于弱到强泛化（Debate Helps Weak-to-Strong Generalization，arXiv:2501.13124）](https://arxiv.org/abs/2501.13124)：2025 年将辩论与 W2SG 结合的研究。
