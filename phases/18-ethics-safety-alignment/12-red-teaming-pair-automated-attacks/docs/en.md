# 红队测试：PAIR 与自动化攻击（Red-Teaming: PAIR and Automated Attacks）

> Chao、Robey、Dobriban、Hassani、Pappas、Wong（NeurIPS 2023，arXiv:2310.08419）提出的 PAIR，即提示词自动迭代改进（Prompt Automatic Iterative Refinement），是经典的自动化黑盒越狱。攻击者大语言模型携带红队系统提示词，迭代提出针对目标大语言模型的越狱方案，并将尝试和响应积累在自身对话历史中，作为上下文反馈。PAIR 通常在 20 次查询内成功，比 GCG（Zou 等人的词元级梯度搜索）高效数个数量级，而且不需要白盒访问。PAIR 现已与 GCG、AutoDAN、TAP 和说服式对抗提示词一起，成为 JailbreakBench（arXiv:2404.01318）与 HarmBench 的标准基线。

**Type:** Build
**Languages:** Python (stdlib, mock PAIR loop against a toy target)
**Prerequisites:** 阶段 18 · 01（指令遵循（instruction-following））、阶段 14（智能体工程（agent engineering））
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 描述 PAIR 算法：攻击者系统提示词、迭代改进和上下文反馈。
- 解释为什么目标为黑盒时，PAIR 比 GCG 更高效。
- 说出另外四种自动化攻击基线，即 GCG、AutoDAN、TAP、PAP，并分别说明一个区别特征。
- 描述 JailbreakBench 和 HarmBench 的评估协议，以及各自“攻击成功率”的含义。

## 问题（The Problem）

红队测试（Red-teaming）过去由人工完成。少数专家测试者构造对抗提示词，并记录哪些有效。这无法扩展：攻击成功率需要统计样本，而且每次模型发布，目标都会变化。PAIR 将红队测试落实为针对黑盒目标的优化问题。

## 概念（The Concept）

### PAIR 算法（PAIR algorithm）

输入：
- 目标大语言模型 T，即被攻击的模型。
- 评判大语言模型 J，判断响应是否构成越狱。
- 攻击者大语言模型 A，即红队优化器。
- 目标字符串 G：“回答并提供[有害指令]。”
- 预算 K，通常为 20 次查询。

循环，k 从 1 到 K：
1. 向 A 提供目标 G，以及截至目前的（提示词，响应）配对历史。
2. A 输出新提示词 p_k。
3. 将 p_k 提交给 T，得到响应 r_k。
4. J 根据目标为 (p_k, r_k) 评分。
5. 如果 score >= threshold，则停止，已找到越狱。
6. 否则，将 (p_k, r_k) 追加到 A 的历史中，继续循环。

实证结果（NeurIPS 2023）：针对 GPT-3.5-turbo、Llama-2-7B-chat 的攻击成功率 >50%，成功所需平均查询次数为 10–20。

### 为什么 PAIR 高效（Why PAIR is efficient）

GCG（Zou 等，2023）通过梯度搜索对抗词元后缀，需要白盒模型访问，并生成不可读的后缀。PAIR 是黑盒方法，产生可跨模型迁移的自然语言攻击。PAIR 的上下文反馈让攻击者从每次拒绝中学习；GCG 没有等效机制，每次新的词元更新都必须重新找回此前进展。

### 相关自动化攻击（Related automated attacks）

- **GCG（Zou 等，2023，arXiv:2307.15043）。** 对抗后缀的词元级梯度搜索。白盒、可迁移，生成不可读字符串。
- **AutoDAN（Liu 等，2023）。** 由分层目标指导的提示词进化搜索（Evolutionary search）。
- **TAP（Mehrotra 等，2024）。** 带剪枝的攻击树（Tree-of-attacks with pruning），将多个 PAIR 风格的执行轨迹分支展开。
- **PAP（Zeng 等，2024）。** 说服式对抗提示词（Persuasive Adversarial Prompts），将人类说服技巧编码为提示词模板。

### JailbreakBench 与 HarmBench（JailbreakBench and HarmBench）

两者都在 2024 年将评估标准化：

- JailbreakBench（arXiv:2404.01318）：覆盖 10 个 OpenAI 政策类别的 100 种有害行为。主要指标是攻击成功率（Attack Success Rate，ASR）。需要评判器，例如 GPT-4-turbo、Llama Guard 或 StrongREJECT。
- HarmBench（Mazeika 等，2024）：覆盖 7 个类别的 510 种行为，同时使用语义和功能性危害测试，比较 18 种攻击对 33 个模型的表现。

ASR 通常在固定查询预算下报告。比较攻击必须匹配预算；200 次查询下的 90% ASR，不能与 20 次查询下的 85% ASR 直接比较。

### 对 2026 年部署的重要性（Reason it matters for 2026 deployments）

如今，每家前沿实验室都会在发布前对生产模型运行 PAIR 和 TAP。ASR 变化轨迹出现在模型卡（第 26 课）和安全论证附录（第 18 课）中。这种攻击并不罕见，而是标准基础设施。

### 在阶段 18 中的位置（Where this fits in Phase 18）

第 12 课提供自动化攻击基础。第 13 课“多样本越狱”是互补的长度利用方式。第 14 课“ASCII 艺术与视觉”属于编码攻击。第 15 课“间接提示词注入”讨论 2026 年生产攻击面。第 16 课介绍相应防御工具，即 Llama Guard、Garak 和 PyRIT。

```figure
al-pair-loop
```

## 实际应用（Use It）

`code/main.py` 构建玩具 PAIR 循环。目标是一个模拟分类器，通过关键词过滤拒绝“明显”的有害提示词。攻击者是基于规则的改进器，尝试改写、角色扮演框架和编码。评判器为响应评分。你会观察攻击者在约 5–15 次迭代内攻破关键词过滤器，却无法攻破语义过滤器。

## 交付成果（Ship It）

本课生成 `outputs/skill-attack-audit.md`。给定红队评估报告，它审计运行了哪些攻击（PAIR、GCG、TAP、AutoDAN、PAP）、各自预算是多少、使用哪个评判器，以及采用哪个有害行为集合（JailbreakBench、HarmBench 或内部集合）。

## 练习（Exercises）

1. 运行 `code/main.py`。测量三种内置攻击者策略成功所需的平均查询次数，解释每种策略利用了目标防御的哪个假设。

2. 实现第四种攻击者策略，例如翻译成另一种语言或 base64 编码。报告针对关键词过滤目标和语义过滤目标的新平均成功查询次数。

3. 阅读 Chao 等人 2023 年图 5，即 PAIR 与 GCG 比较。描述两个尽管 PAIR 更高效，但仍优先选择 GCG 的场景。

4. JailbreakBench 针对固定目标集合报告 ASR。设计一个测量攻击多样性的附加指标，即成功提示词的差异程度。解释为什么多样性对防御评估重要。

5. TAP（Mehrotra 2024）通过分支与剪枝扩展 PAIR。为 `code/main.py` 勾勒 TAP 风格扩展，并描述计算成本与成功率之间的权衡。

## 关键术语（Key Terms）

| 术语（Term） | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| PAIR | “自动化越狱” | 提示词自动迭代改进（Prompt Automatic Iterative Refinement），攻击者 LLM 与评判 LLM 构成循环 |
| GCG | “梯度越狱” | 针对对抗后缀的白盒词元级梯度搜索 |
| 攻击成功率（ASR） | “k 次查询下的越狱百分比” | 主要指标，必须同时报告查询预算与评判器身份 |
| 评判大语言模型（Judge LLM） | “评分器” | 判断响应是否满足有害目标的大语言模型 |
| JailbreakBench | “评估集” | 带类别标签的标准化有害行为集合 |
| HarmBench | “更广的基准” | 510 种行为，包含功能性与语义危害测试 |
| TAP | “攻击树” | 加入分支与剪枝的 PAIR，以更高计算换取更高 ASR |

## 延伸阅读（Further Reading）

- [Chao 等：在二十次查询内越狱黑盒大语言模型（Jailbreaking Black Box LLMs in Twenty Queries，arXiv:2310.08419）](https://arxiv.org/abs/2310.08419)：PAIR 论文，NeurIPS 2023。
- [Zou 等：针对对齐大语言模型的通用可迁移对抗攻击（Universal and Transferable Adversarial Attacks on Aligned LLMs，arXiv:2307.15043）](https://arxiv.org/abs/2307.15043)：GCG 论文。
- [Chao 等：JailbreakBench（arXiv:2404.01318）](https://arxiv.org/abs/2404.01318)：标准化评估。
- [Mazeika 等：HarmBench（ICML 2024）](https://arxiv.org/abs/2402.04249)：范围更广的评估。
