# 将指令遵循作为对齐信号（Instruction-Following as Alignment Signal）

> 后续对基于人类反馈的强化学习（Reinforcement Learning from Human Feedback，RLHF）的每一种批评，都针对这条流水线。研究优化压力如何扭曲代理指标（Proxy）之前，你必须先认识这个代理指标。InstructGPT（Ouyang 等，2022）确立了参考架构：先用指令与回答对进行监督微调（Supervised Fine-tuning，SFT），再根据成对的偏好排序训练奖励模型（Reward Model，RM），最后针对奖励模型进行近端策略优化（Proximal Policy Optimization，PPO），并加入相对于 SFT 策略的 KL 惩罚。人们更偏好 1.3B 的 InstructGPT，而不是 175B 的 GPT-3。正是这一结果，使得 2026 年的每一家前沿实验室仍然采用具有 RLHF 结构的后训练流水线。

**Type:** Learn
**Languages:** Python (stdlib, toy three-stage pipeline)
**Prerequisites:** 阶段 10 · 06（监督微调（SFT））、阶段 10 · 07（人类反馈强化学习（RLHF））、阶段 10 · 08（直接偏好优化（DPO））
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 说出 InstructGPT 流水线的三个阶段，以及每个阶段使用的损失函数。
- 解释为什么经过指令微调的 1.3B 模型在人类偏好评估中胜过未经处理的 175B GPT-3。
- 说明第 3 阶段的 KL 惩罚在防范什么，以及移除它为何会使模型退化为寻模行为（Mode-seeking behaviour）。
- 描述对齐税（Alignment tax），以及 Ouyang 等人为缓解它而使用的 PPO-ptx 方法。

## 问题（The Problem）

预训练语言模型会补全文本，而不是回答问题。向 GPT-3 提出“编写一个反转列表的 Python 函数”，你常常会得到另一个提示词（Prompt），因为训练分布中的大部分内容都是后面接着更多网页文本的网页文本。模型完成了自己的任务，但这个任务本身就不对。

各家认真研究这一问题的实验室，都使用人类偏好（Human preference）作为解决问题的代理指标。评估者看到两个补全结果后选出更好的一个，奖励模型则学习评估者的判断。随后，强化学习（Reinforcement Learning，RL）循环推动策略产生奖励模型评分较高的输出。这三句话概括了 InstructGPT 的全部核心主张；论文的其余部分讨论的是工程实现。

## 概念（The Concept）

### 阶段 1：监督微调（Supervised fine-tuning，SFT）

收集提示词与回答对，其中的回答应当是一位善意的人会写出的内容。Ouyang 等人使用了来自标注员和 OpenAI API 的 13k 个提示词。使用标准的交叉熵损失（Cross-entropy loss），在这些数据上微调基础模型。

SFT 带来的变化是：模型现在会回答问题，而不再续写问题。它没有提供的是：当多个答案都看似合理时，评估者更偏好哪个答案的信号。

### 阶段 2：奖励模型（Reward model，RM）

对于每个提示词，从 SFT 模型中采样 K 个补全结果，由标注员为它们排序。训练一个能够为任意提示词与回答对评分的奖励模型；对于 `y_w` 比 `y_l` 更受偏好的配对，采用以下损失：

```
L_RM = -log sigmoid(r(x, y_w) - r(x, y_l))
```

这就是 Bradley-Terry 成对偏好损失（Pairwise preference loss）。奖励模型通常由 SFT 模型初始化，并将语言模型头（LM head）替换为标量头（Scalar head）。

奖励模型的规模很小：对于 175B 的 InstructGPT，6B 就已经足够。它们也很脆弱：论文第 5 节主要讨论了在小规模实验中出现的奖励投机（Reward hacking）行为。

### 阶段 3：带 KL 惩罚的 PPO（PPO with a KL penalty）

定义以下目标函数：

```
J(pi) = E_{x~D, y~pi(.|x)} [ r(x, y) ] - beta * KL(pi(.|x) || pi_SFT(.|x))
```

使用 PPO 最大化该目标。KL 项防止 `pi` 偏离 SFT 策略过远。没有这一项，优化器就会找到对抗样本（Adversarial examples）：这些字符串之所以在奖励模型下得分很高，是因为奖励模型从未见过它们，而不是因为人类真的偏好它们。

KL 系数 `beta` 是 RLHF 中最重要的超参数（Hyperparameter）。它过低会导致奖励投机，过高则无法取得超出 SFT 的改进。

### 对齐税（The alignment tax）

经过 RLHF 后，模型更受人类偏好，却在标准基准测试（Benchmark）SQuAD、HellaSwag 和 DROP 上出现性能退化。Ouyang 等人将其称为对齐税，并用 PPO-ptx 解决：将预训练梯度混入强化学习目标，使模型不会忘记如何执行那些从未给它带来奖励的下游任务。

```
J_ptx(pi) = J(pi) + gamma * E_{x~D_pretrain} [ log pi(x) ]
```

PPO-ptx 后来成为标准做法。Anthropic、DeepMind 和 Meta 都使用了它的某种变体。

### 结果（The result）

在约 70% 的情况下，标注员更偏好 1.3B 的 InstructGPT（SFT + RM + PPO-ptx），而不是 175B 的基础 GPT-3。对于来自生产流量的隐藏测试提示词，这一差距还会扩大。这个数字体现了两点：

1. 对齐（Alignment）与能力（Capability）是不同的维度。175B 模型的能力更强，1.3B 模型的对齐程度更高，而标注员偏好后者。
2. 能力下限由基础模型决定。你无法通过 RLHF 让基础模型知道它从未见过的事实。

### 为什么这是阶段 18 的参考起点（Why this is the reference point for Phase 18）

后续课程中的每一种批评，都针对这条流水线的某个部分，包括奖励投机（第 2 课）、直接偏好优化（Direct Preference Optimization，DPO，第 3 课）、谄媚（Sycophancy，第 4 课）、宪法式 AI（Constitutional AI，CAI，第 5 课）、潜伏智能体（Sleeper agents，第 7 课）和伪装对齐（Alignment faking，第 9 课）。奖励投机攻击第 2 阶段；DPO 将第 2、3 阶段合并；CAI 替换人类标注员；谄媚说明标注员提供的是带偏差信号；伪装对齐说明策略能够完全绕过第 3 阶段。如果脑海中没有这条流水线，你就无法理解这些批评。

```figure
al-instruct-pipeline
```

## 实际应用（Use It）

`code/main.py` 使用玩具偏好数据模拟这三个阶段。基础“策略”相当于一枚在动作 {A, B, C} 上带有偏置的硬币。第 1 阶段的 SFT 在 200 个提示词上模仿标注员的动作。第 2 阶段根据 500 组成对排序拟合 Bradley-Terry 奖励模型。第 3 阶段执行简化的 PPO 更新，并加入相对于 SFT 策略的 KL 惩罚。你可以观察奖励上升、KL 散度（KL divergence）增大和策略偏移，也可以关闭 KL 项，观察奖励投机在 50 次更新之内出现。

需要观察的内容：

- 比较 `beta = 0.1` 与 `beta = 0.0` 时的奖励轨迹。
- 观察 KL(pi || pi_SFT) 随训练步数的变化。
- 比较最终动作分布与标注员偏好。

## 交付成果（Ship It）

本课生成 `outputs/skill-instructgpt-explainer.md`。给定 RLHF 流水线描述或论文摘要，它会识别三个阶段中哪些阶段被修改、每个阶段使用什么损失函数，以及是否存在 KL 惩罚或等效的正则化项（Regularizer）。

## 练习（Exercises）

1. 运行 `code/main.py`。设置 `beta = 0.0`，报告执行 200 次 PPO 更新后的动作分布。用一段话解释寻模行为。

2. 修改奖励模型，使它对动作 B 存在 +0.5 的偏置，以模拟奖励缺陷。使用 `beta = 0.1` 运行 PPO。KL 惩罚能否阻止策略利用该偏置？当 `beta` 为多少时，这种利用开始显现？

3. 阅读 Ouyang 等人的论文（arXiv:2203.02155）图 1。分别运行 1、5、20、100 次 PPO 更新，并相对于 SFT 模型测量偏好，复现标注员偏好曲线。

4. 论文第 4.3 节报告，1.3B 的 InstructGPT 在约 70% 的情况下胜过 175B 的 GPT-3。为什么隐藏生产提示词上的胜出比例，会高于标注员自己编写的提示词？

5. 在相同偏好数据上，将 PPO 损失替换为 DPO（阶段 10 · 08）。比较最终策略偏移（相对于 SFT 的 KL）和最终奖励。在奖励相同时，哪种方法的偏移更大？

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 监督微调（SFT） | “指令微调” | 第 1 阶段：在提示词与回答对上使用交叉熵进行微调 |
| 奖励模型（Reward model） | “RM” | 以（提示词，回答）为输入的标量回归器，在成对标签上使用 Bradley-Terry 损失训练 |
| Bradley-Terry | “成对偏好损失” | -log sigmoid(r_w - r_l)；将成对排序转化为二分类 |
| KL 惩罚（KL penalty） | “正则化项” | `beta * KL(pi \|\| pi_SFT)`，使强化学习策略保持在 SFT 锚点附近 |
| PPO-ptx | “混入预训练的 PPO” | 将一部分预训练对数似然加入 PPO 目标，以抵消对齐税 |
| 对齐税（Alignment tax） | “RLHF 性能退化” | RLHF 之后，在非 RLHF 目标的标准基准测试上出现的性能下降 |
| 标注员偏好（Labeler preference） | “真实值” | 人类排序的样本；奖励模型是它的统计代理，而不是“人类价值观”的统计代理 |

## 延伸阅读（Further Reading）

- [Ouyang 等：通过人类反馈训练语言模型遵循指令（Training language models to follow instructions with human feedback，arXiv:2203.02155）](https://arxiv.org/abs/2203.02155)：InstructGPT 论文，是后续所有 RLHF 流水线的基础。
- [Stiennon 等：从人类反馈中学习摘要生成（Learning to summarize from human feedback，arXiv:2009.01325）](https://arxiv.org/abs/2009.01325)：将 RLHF 用于摘要生成的先驱研究。
- [Christiano 等：从人类偏好中进行深度强化学习（Deep reinforcement learning from human preferences，arXiv:1706.03741）](https://arxiv.org/abs/1706.03741)：最初的基于偏好的强化学习形式化描述。
- [Bai 等：使用 RLHF 训练有帮助且无害的助手（Training a Helpful and Harmless Assistant with RLHF，arXiv:2204.05862）](https://arxiv.org/abs/2204.05862)：Anthropic 在 InstructGPT 流水线基础上提出的有帮助且无害（Helpful and Harmless，HH）扩展。
