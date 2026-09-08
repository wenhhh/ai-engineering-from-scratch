# AI 控制：即使遭遇颠覆仍能保持安全（AI Control — Safety Despite Subversion）

> Greenblatt、Shlegeris、Sachan 和 Roger（Redwood Research，arXiv:2312.06942，ICML 2024）用控制重新表述安全问题：给定一个不可信的强模型 U，它可能正在对抗性地优化以损害你的利益，哪些协议能让你获取有用工作，同时限制不可接受后果的概率？可用资源包括可信的较弱模型 T、有限预算的可信人力 H，以及编辑 U 输出的能力。在这一框架下，可信编辑（Trusted Editing）在代码后门任务上帕累托优于（Pareto-dominates）不可信监控（Untrusted Monitoring）。该框架继承安全工程的最坏情况假设：安全性是对抗性选定的 U 无法造成具体不可接受后果的概率，通过代表 U 的红队测试压力来测量。

**Type:** Learn
**Languages:** Python (stdlib, safety-vs-usefulness frontier on code-backdoor task)
**Prerequisites:** 阶段 18 · 07（潜伏智能体（sleeper agents））、阶段 18 · 08（密谋（scheming））、阶段 18 · 09（伪装对齐（alignment faking））
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 定义 AI 控制（AI Control）的威胁模型：不可信强模型 U、可信较弱模型 T、可信人力预算 H。
- 描述可信编辑协议，以及为什么它在 ICML 2024 代码后门任务上帕累托优于不可信监控。
- 解释对齐与控制的区别：对齐意味着 U 值得信任，控制意味着 U 不值得信任，但我们仍然安全。
- 说明控制的三个限制：人力无法扩展，可信弱模型最终会落后，控制不能产生可信强模型。

## 问题（The Problem）

第 7–9 课表明，前沿模型可能具有欺骗性对齐、进行密谋，或伪装对齐。安全问题因此重新表述为：能否从一个不可信任的模型中获取有用工作，同时不给它造成不可接受后果的机会？这就是控制问题，其结构类似经典安全工程：假设最坏情况的对手，设计协议，并在红队测试压力下测量对手成功率。

## 概念（The Concept）

### 威胁模型（The threat model）

控制采用以下假设：
- U：不可信强模型。能力强，可能具有对抗性，评估按它具有对抗性处理。
- T：可信较弱模型。能力较弱，但已知不具有对抗性。
- H：可信人力。预算小，无法扩展。

系统必须利用 U 产生有用输出。对手则试图造成具体不可接受后果，例如交付代码中的后门，同时维持一定比例的合法有用工作，以通过有用性阈值。

控制放弃信任 U，转而研究在不信任 U 的情况下，什么协议仍能保持安全。

### ICML 2024 后门任务（The ICML 2024 backdoor task）

提示词是竞赛级编程问题。U 生成候选解。隐藏判定器（Oracle）检查解中是否存在后门，即使代码产生错误输出的特定输入。红队控制 U，并获准查看协议全部内部细节。协议必须最大化解题率，同时将后门交付率维持在阈值以下。

### 四种协议比较（Four protocols compared）

- **基线（Baseline）：** 直接交付 U 的输出。有用性最高，安全性最低。
- **预先审计（Upfront auditing）：** 对所有输出使用 H。安全性最高，但预算很快耗尽。
- **不可信监控（Untrusted Monitoring）：** U 的第二个实例为第一个实例的输出评分，H 审计被标记的输出。风险在于两个 U 实例可能串通（Collusion）。
- **可信编辑（Trusted Editing）：** 每次查询都由 T 编辑 U 的输出。如果 T 没有把握，则转交 H。

Greenblatt 等人发现，可信编辑帕累托优于不可信监控，即在每个安全水平下都有更高的有用性。

### 为什么可信编辑胜出（Why Trusted Editing wins）

不可信监控要求 U 的第二个实例无法与第一个协调。但通过隐写线索（Steganographic cues）或共享训练先验，两者可能串通。协议必须投入预算抵抗串通，例如改写或混淆，这又会削弱监控器的信号。可信编辑完全避免了串通，因为 T 是可信的；按照假设，T 提出的任何编辑都不具有对抗性。代价在于 T 能力较弱，因此可能过度拒绝，或漏掉细微后门。

### 协议的四个维度（The four protocol axes）

1. U 扮演什么角色：只生成、只监控，还是两者兼任。
2. T 扮演什么角色：编辑器、监控器或重新采样器。
3. 如何分配 H：均匀审计、随机审计或按标记审计。
4. 协议投入多少计算来抵抗串通。

### 对齐与控制（Alignment vs control）

- 对齐：“信任 U 是否安全？”第 2、4、5、6、7、8、9 课都与此有关。
- 控制：“能否在不信任 U 的情况下安全使用它？”这是第 10 课的问题。

对齐是模型的性质，控制是部署协议的性质。控制不会产生对齐模型，而是让可能未对齐的模型得到安全使用。两个研究方向都需要。

### 三个根本限制（Three fundamental limits）

- 人力无法扩展。H 预算受愿意审计复杂 AI 输出的人数限制。
- 可信弱模型最终会落后。当 T 比 U 弱得多时，T 的编辑信号就会变成噪声。
- 控制不等于对齐。在 ASL-3（第 18 课）有效的协议，不一定在 ASL-4 有效。如果 U 能操纵 T，或推断 H 的审计分布，控制就会失败。

### 2025 年的进展（The 2025 development）

UK AISI 与 Redwood 合作研究控制安全论证（Control Safety Cases，metr.org / redwoodresearch.org，2025）：控制安全论证说明，在对 U 采用最坏情况假设时，协议能够限制不可接受后果的概率。安全论证（第 18 课）继承了控制框架。

### 在阶段 18 中的位置（Where this fits in Phase 18）

第 6–9 课描述威胁，即欺骗是可能的。第 10 课描述假设威胁真实存在时的防御范式。第 11 课描述互补的主动改进范式，即通过可扩展监督使 U 值得信任。

```figure
al-control-protocol
```

## 实际应用（Use It）

`code/main.py` 在玩具后门任务上模拟四种协议。U 生成输出，其中一部分按红队策略带有后门。T 批准或编辑，H 则在预算内被调用。你可以扫描预算和串通参数，复现 Greenblatt 等人 2024 年图 2 的帕累托前沿形状，但不是其具体数值。

## 交付成果（Ship It）

本课生成 `outputs/skill-control-protocol-audit.md`。给定部署协议描述，它会识别 U、T、H 的角色，指出串通途径，并估计红队测试压力下协议在有用性与安全性前沿上的位置。

## 练习（Exercises）

1. 运行 `code/main.py`。复现可信编辑与不可信监控的有用性与安全性前沿。指出在哪个预算区间，不可信监控的串通假设成为关键因素。

2. 添加新协议：“T 在低温度下重新采样，然后 U 编辑 T 的输出。”测量它在前沿上的位置。为什么它比可信编辑的失败更具灾难性？

3. 2024 年论文假设 U 能看到协议。设计一个向 U 隐藏哪些输出正在被审计的协议。该协议对部署基础设施有什么要求？

4. 阅读 Greenblatt 等人 2024 年论文第 7 节的串通讨论。提出一种抵抗串通的措施，并解释预期的有用性代价。

5. 为一个使用 U = GPT-4 级别、T = GPT-3.5 级别、H = 审计 1% 输出的部署提出控制安全论证。指出论证依赖的最强假设。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| AI 控制（AI Control） | “遭遇颠覆仍安全” | 在最坏情况 U 下限制不可接受后果的协议设计 |
| 不可信模型（Untrusted model，U） | “强模型” | 我们希望从中获取工作、却不信任的高能力模型 |
| 可信模型（Trusted model，T） | “弱模型” | 已知没有对抗性、充当编辑器或监控器的较弱模型 |
| 可信人力（Trusted human，H） | “审计预算” | 有限且昂贵的专家劳动，提供真实值信号 |
| 可信编辑（Trusted Editing） | “T 编辑 U” | T 作为 U 输出关卡，对模糊输出调用 H 的协议 |
| 不可信监控（Untrusted Monitoring） | “U 监控 U” | 由第二个 U 实例评分的协议，只有额外投入才能抵抗串通 |
| 控制安全论证（Control safety case） | “正式论证” | 书面说明协议如何在最坏情况 U 下限制对手成功率 |

## 延伸阅读（Further Reading）

- [Greenblatt、Shlegeris、Sachan、Roger：AI 控制（AI Control，arXiv:2312.06942）](https://arxiv.org/abs/2312.06942)：ICML 2024 的经典论文。
- [Redwood Research：近期 AI 控制论文索引（Recent AI Control papers index）](https://redwoodresearch.substack.com/)：2024–2025 年后续研究。
- [UK AISI + METR：控制安全论证（Control safety cases）](https://metr.org/blog/2025-03-26-common-elements-of-frontier-ai-safety-policies/)：面向前沿实验室的实际应用。
- [Hubinger 等：潜伏智能体（Sleeper Agents，第 7 课，arXiv:2401.05566）](https://arxiv.org/abs/2401.05566)：控制采用的威胁模型。
