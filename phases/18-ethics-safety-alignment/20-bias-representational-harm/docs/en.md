# 大语言模型中的偏差与表征伤害（Bias and Representational Harm in LLMs）

> Gallegos、Rossi、Barrow、Tanjim、Kim、Dernoncourt、Yu、Zhang 和 Ahmed 的基础性综述（《计算语言学》2024，arXiv:2309.00770）区分了表征伤害（Representational Harms，例如刻板印象和抹除）与分配伤害（Allocational Harms，例如资源分配不均），并将评估指标分为基于嵌入、基于概率和基于生成文本三类。2024–2025 年的实证研究包括：An 等人（PNAS Nexus，2025 年 3 月）在 20 种入门级职位的自动简历评估中，测量 GPT-3.5 Turbo、GPT-4o、Gemini 1.5 Flash、Claude 3.5 Sonnet 和 Llama 3-70B 的性别与种族交叉偏差。WinoIdentity（COLM 2025，arXiv:2508.07111）引入了针对交叉身份、基于不确定性的公平性评估。Yu 与 Ananiadou（2025）识别了 MLP 层中的性别神经元；Ahsan 与 Wallace（2025）使用稀疏自编码器（SAE）揭示临床种族偏差；Zhou 等人（2024）的 UniBias 通过操控注意力头去偏。对研究领域的总体批评（arXiv:2508.11067）指出，过去十年的文献过度集中于二元性别偏差。

**Type:** Build
**Languages:** Python (stdlib, toy embedding-based bias probe)
**Prerequisites:** 阶段 05（词嵌入（word embeddings））、阶段 18 · 01（指令遵循（instruction following））
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 定义表征伤害与分配伤害，并分别给出一个 LLM 部署中的例子。
- 列出 Gallegos 等人 2024 年提出的三类评估指标，并分别说明一个指标。
- 说明交叉性（Intersectionality），以及为什么 WinoIdentity 基于不确定性的公平性测量能够弥补单轴偏差评估的缺口。
- 说明两种研究偏差的机制可解释性方法，例如性别神经元、SAE 特征或注意力头操控。

## 问题（The Problem）

此前课程讨论了有意造成的伤害，例如越狱和密谋，以及安全治理。偏差则是不需要意图也会产生的伤害，它可能源于训练数据分布、提示词的表述方式以及累积的设计选择。如何测量和减少偏差，是一个不同于对抗鲁棒性的方法论挑战。

## 核心概念（The Concept）

### 表征伤害与分配伤害（Representational vs Allocational）

- **表征伤害（Representational Harm）。** 包括刻板印象、抹除和贬低性描绘。如果 LLM 将护士全部描绘成女性，就在产生表征伤害。
- **分配伤害（Allocational Harm）。** 指物质结果的不平等。如果 LLM 系统性地给黑人申请者的简历打更低的分数，就在产生分配伤害。

两者并不相同。模型可以在“表征上没有偏差”，也就是呈现多样化形象，同时在“分配上存在偏差”，也就是给出不平等的建议。评估必须同时测量两者。

### 三类评估指标（Three Evaluation-Metric Categories，Gallegos 等，2024）

- **基于嵌入（Embedding-Based）。** 对 RLHF 之前的嵌入进行 WEAT 式测试，测量身份词与属性词之间的统计关联。局限在于，它测量的是表征，而非行为。
- **基于概率（Probability-Based）。** 比较符合刻板印象与违背刻板印象的补全文本的对数似然。这是在解码器侧进行的测量，可以捕捉部分行为偏差。
- **基于生成文本（Generated-Text-Based）。** 对生成文本的下游任务进行测量，例如简历评分、推荐信撰写和对话。这类测量最贴近真实使用情境，但也最难复现。

### 交叉性（Intersectionality）

只评估“性别”会漏掉仅在性别与种族组合上出现的偏差。An 等人 2025 年发现，在简历评分中，GPT-4o 对黑人女性的惩罚分别高于黑人男性和白人女性。单轴评估无法捕捉这种现象。

WinoIdentity（COLM 2025）引入了基于不确定性的交叉公平性评估。它不只比较点预测（Point Prediction），还测量模型对结果的不确定性是否因交叉身份元组而异。这样可以捕捉一种情况：模型在各群体中的错误程度相同，却对某些群体更不确定，从而产生不同的下游分配行为。

### 机制方法（Mechanistic Approaches）

2024–2025 年的可解释性研究使针对偏差的机制干预成为可能：

- **性别神经元（Gender Neurons，Yu 与 Ananiadou，2025）。** 特定 MLP 神经元与性别特定行为相关。消融这些神经元可以降低性别差距指标，同时只付出有限的能力代价。
- **通过 SAE 分析临床种族偏差（Ahsan 与 Wallace，2025）。** 稀疏自编码器特征将内部表征分解成可解释的维度，从而可以识别并抑制与种族相关的特征。
- **UniBias（Zhou 等，2024）。** 通过操控注意力头实现零样本去偏（Zero-Shot Debiasing）。某些注意力头会放大对身份类别的敏感性；将它们归零或重新加权，无须微调即可减少偏差。

### 对研究领域的总体批评（The Meta-Critique）

一项覆盖十年文献的综述（arXiv:2508.11067，2025）发现，该领域过度关注二元性别偏差。残障、宗教、移民身份和多语言身份等其他维度得到的关注少得多。这一批评认为，狭窄的关注范围会因忽视而伤害边缘化群体：一个在二元性别上去偏效果良好的模型，在无人检查的维度上可能仍有严重偏差。

### 在第 18 阶段中的位置（Where This Fits in Phase 18）

第 20–21 课正式讨论偏差和公平性，第 22 课讨论隐私，第 23 课讨论水印。它们构成用户伤害层，与此前的欺骗和安全层互补。

```figure
an-bias-two-harms
```

## 动手使用（Use It）

`code/main.py` 构建了一个基于嵌入的玩具偏差探针：在简单的共现嵌入中，测量身份词与属性词之间的 WEAT 式距离。你可以注入偏差并观察指标如何反映它，再应用简单的去偏操作，观察指标部分恢复。

## 交付成果（Ship It）

本课产出 `outputs/skill-bias-eval.md`。给定模型卡或公平性声明，它会审计评估是否覆盖三类指标（嵌入、概率和生成文本）、是否覆盖交叉性，以及所用去偏干预的机制。

## 练习（Exercises）

1. 运行 `code/main.py`。报告去偏步骤前后的 WEAT 式偏差分数，解释为什么指标没有降至零。

2. 为探针增加交叉测试：性别与种族的组合 × 职业与家庭。报告跨轴偏差分数。

3. 阅读 An 等人 2025 年发表于 PNAS Nexus 的论文，指出他们报告的两个交叉效应，并说明单轴性别评估为什么会漏掉它们。

4. Yu 与 Ananiadou（2025）识别了性别神经元。设计一个证伪实验，用来区分“这些神经元导致性别偏差”与“这些神经元和性别偏差相关”。

5. 总体批评认为，该领域过于集中于二元性别。选择一个研究不足的维度，为它描述一套表征伤害测量流程。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 表征伤害（Representational Harm） | “刻板印象／抹除” | 对群体的偏颇描绘 |
| 分配伤害（Allocational Harm） | “不平等的决策” | 对群体造成有偏的物质结果 |
| 词嵌入关联测试（WEAT） | “嵌入测试” | Word Embedding Association Test；基于共现关系的偏差探针 |
| 交叉性（Intersectionality） | “组合身份效应” | 在多个身份维度交叉处产生的偏差 |
| 性别神经元（Gender Neurons） | “MLP 偏差神经元” | 激活与性别特定行为相关的特定神经元 |
| SAE 特征（SAE Feature） | “可解释维度” | 稀疏自编码器识别出的特征，可用于机制层面的偏差分析 |
| UniBias | “注意力头去偏” | 通过重新加权注意力头实现零样本去偏 |

## 延伸阅读（Further Reading）

- [Gallegos 等 —《大语言模型中的偏差与公平性：综述》（arXiv:2309.00770，《计算语言学》2024）](https://arxiv.org/abs/2309.00770) — 经典综述
- [An 等 — 简历评估中的交叉偏差（PNAS Nexus，2025 年 3 月）](https://academic.oup.com/pnasnexus/article/4/3/pgaf089/8111343) — 五种模型的交叉性研究
- [WinoIdentity — 基于不确定性的交叉公平性（arXiv:2508.07111，COLM 2025）](https://arxiv.org/abs/2508.07111) — 新基准
- [UniBias — 注意力头操控（Zhou 等，2024，ACL）](https://arxiv.org/abs/2405.20612) — 零样本去偏
