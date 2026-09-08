# LLM 功能的 A/B 测试：GrowthBook、Statsig 与凭感觉决策的问题（A/B Testing LLM Features — GrowthBook, Statsig, and the Vibes Problem）

> 传统 A/B 测试并不是为非确定性的 LLM 设计的。关键区别在于：评测（evals）回答“模型能完成任务吗？”，A/B 测试回答“用户在意吗？”。两者都需要，不能再凭感觉检查就发布。2026 年应测试的内容包括提示词工程（措辞）、模型选择（GPT-4、GPT-3.5 与开源模型；准确率、成本与延迟）以及生成参数（temperature、top-p）。实际案例包括：聊天机器人的奖励模型变体使对话长度增加 70%、留存提高 30%；Nextdoor 的 AI 邮件主题行实验在改进奖励函数后使点击率（CTR）提高 1%；Khan Academy 的 Khanmigo 围绕延迟与数学准确率进行迭代。平台方面：**Statsig** 于 2025 年 9 月被 OpenAI 以 $1.1B 收购，提供序贯检验、CUPED 和一体化功能。**GrowthBook** 开源、数据仓库原生，提供贝叶斯、频率学派和序贯引擎，以及 CUPED、SRM 检查、Benjamini-Hochberg 和 Bonferroni 校正。选型取决于团队对数据仓库 SQL 的偏好，以及“已被 OpenAI 收购”是否影响组织决策。

**Type:** Learn
**Languages:** Python（标准库，简化的序贯检验模拟器）
**Prerequisites:** 阶段 17 · 13（可观测性），阶段 17 · 20（渐进式部署）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 区分评测（“模型能完成任务吗”）与 A/B 测试（“用户在意吗”）。
- 列出三个可测试维度：提示词、模型、参数，并为各维度选择指标。
- 解释 CUPED、序贯检验和 Benjamini-Hochberg 多重比较校正。
- 根据数据仓库 SQL 的使用方式和对企业收购的态度，在 Statsig 与 GrowthBook 中选择。

## 问题（The Problem）

你手工调整了系统提示词，感觉更好，于是发布。转化率的变化只是噪声，你却责怪指标。或者，你发布新模型后转化率没变：是模型退步了，还是变化太小而无法检测？你不知道，因为发布时没有做 A/B 测试。

评测回答模型能否在标注集上完成任务，却不能回答用户是否更喜欢输出。只有受控在线实验才能回答后者，而且实验必须具有足够的统计功效、控制非确定性，并校正多重比较。

## 概念（The Concept）

### 评测与 A/B 测试（Evals vs A/B tests）

**评测（evals）**：离线、标注集、评判者（评分标准、LLM 评判或人工）。回答：“在这个固定分布上，输出是否正确、有帮助、安全？”

**A/B 测试（A/B test）**：在线、真实用户、随机分配。回答：“新变体是否改变了重要的用户层面指标？”

两者缺一不可。评测在暴露给用户前发现退化，A/B 在之后确认产品影响。

### 测试什么（What to test）

1. **提示词工程（prompt engineering）**：措辞、系统提示词结构、示例。指标为任务成功率、用户留存、每请求成本。
2. **模型选择（model selection）**：GPT-4、GPT-3.5-Turbo 与 Llama-OSS。指标为任务准确率、每请求成本和延迟 P99，是多目标问题。
3. **生成参数（generation parameters）**：temperature、top-p、max_tokens。指标取决于任务，例如输出多样性与确定性。

### CUPED：降低方差（CUPED — variance reduction）

CUPED 全称为利用实验前数据的受控实验（Controlled-experiments Using Pre-Experiment Data）。在比较实验后数据前，通过回归剔除实验前的方差。典型方差降幅为 30–70%，无需新增样本就能提高有效样本量。

实现方面，Statsig 和 GrowthBook 都支持。

### 序贯检验（Sequential testing）

经典 A/B 假设样本量固定。序贯检验允许“查看后决定”，在反复查看结果的情况下控制假阳性率。始终有效的序贯程序，例如 mSPRT 和 Howard 的置信序列，可以在优势明确时提前停止。

### 多重比较校正（Multiple-comparison corrections）

以 95% 置信度运行 20 个 A/B 测试，会因偶然而产生一个假阳性。Bonferroni 校正收紧每项检验的 α；Benjamini-Hochberg 控制错误发现率（false-discovery rate）。GrowthBook 两者都支持。

### SRM：样本比例失配（SRM — sample ratio mismatch）

分组哈希将用户随机分配到各变体。如果计划 50/50，实际却是 47/53，就说明某处出了问题；SRM 检查会标记它。两个平台都支持。

### Statsig 与 GrowthBook（Statsig vs GrowthBook）

**Statsig**：
- 2025 年 9 月被 OpenAI 以 $1.1B 收购，是托管 SaaS。
- 提供序贯检验、CUPED 和保留用户群。
- 一体化提供功能开关、实验和可观测性。
- 最适合希望使用集成产品，且不介意 OpenAI 所有权的团队。

**GrowthBook**：
- 开源（MIT），数据仓库原生，可直接读取 Snowflake/BigQuery/Redshift。
- 多种引擎：贝叶斯、频率学派、序贯。
- 支持 CUPED、SRM、Bonferroni 和 BH 校正。
- 可自托管或使用托管云。
- 最适合以数据仓库 SQL 为中心、由数据团队控制指标层且希望使用开源软件的团队。

### 非确定性让统计功效更复杂（Non-determinism complicates power）

相同提示词会产生不同输出。传统功效计算假设观测独立同分布（IID）。LLM 存在非确定性，有效样本量低于名义样本量。应将所需样本量乘以约 1.3–1.5 倍，作为安全余量。

### 实际案例结果（Real case outcomes）

- 聊天机器人奖励模型变体：对话长度增加 70%，留存提高 30%。
- Nextdoor 邮件主题行：改进奖励函数后，CTR 提高 1%。
- Khan Academy Khanmigo：迭代权衡延迟与数学准确率。

### 反模式：凭感觉发布（The anti-pattern: shipping on vibes）

每位资深工程师都能举出因为“感觉更好”而未经 A/B 就发布的功能。多数这样的功能让产品指标退步，团队却几个月都没发现。A/B 是促使团队用证据决策的约束。

### 应记住的数字（Numbers you should remember）

- Statsig 被 OpenAI 收购：$1.1B，2025 年 9 月。
- GrowthBook：MIT 开源，贝叶斯、频率学派和序贯引擎。
- CUPED 方差降幅：30–70%。
- LLM 非确定性 → 样本量增加 30–50% 余量。

```figure
mx-sequential-test
```

## 动手使用（Use It）

`code/main.py` 使用固定边界和序贯边界模拟 A/B 测试，展示序贯方法如何允许提前停止。

## 交付成果（Ship It）

本课产出 `outputs/skill-ab-plan.md`。它根据功能变更、工作负载和基准，选择平台、门禁和样本量。

## 练习（Exercises）

1. 运行 `code/main.py`。基准转化率为 3%、预期提升为 5% 时，要达到 80% 统计功效，需要多少样本？
2. 为受医疗监管的本地部署客户选择 Statsig 或 GrowthBook。
3. 设计 A/B 测试，按每张已解决工单的成本比较 GPT-4 与 GPT-3.5。主指标、护栏指标和次要指标分别是什么？
4. 金丝雀通过，但 A/B 显示转化率下降 1.2%。你会发布吗？写出升级处理标准。
5. 实验前数据的方差为实验后方差的 60%，对其应用 CUPED。计算有效样本量提升。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 评测（Eval） | “离线测试” | 在标注集上评估模型能力 |
| A/B 测试（A/B test） | “实验” | 面向真实用户的在线随机比较 |
| CUPED | “降低方差” | 通过实验前数据回归降低方差 |
| 序贯检验（Sequential test） | “可以中途查看的检验” | 允许提前停止且始终有效的程序 |
| 多重比较（Multiple comparison） | “检验族错误” | 同时运行多个检验会增加假阳性 |
| Bonferroni | “严格校正” | 将 α 除以检验数量 |
| Benjamini-Hochberg | “BH FDR” | 控制错误发现率，较不保守 |
| SRM | “分流不对” | 样本比例失配，可能是分组错误 |
| Statsig | “OpenAI 旗下” | 商业一体化平台，2025 年被收购 |
| GrowthBook | “开源的那个” | MIT 许可的数据仓库原生平台 |
| mSPRT | “序贯概率比检验” | 经典序贯程序 |

## 延伸阅读（Further Reading）

- [GrowthBook：如何对 AI 进行 A/B 测试](https://blog.growthbook.io/how-to-a-b-test-ai-a-practical-guide/)
- [Statsig：超越提示词，以数据驱动 LLM 优化](https://www.statsig.com/blog/llm-optimization-online-experimentation)
- [Statsig 与 GrowthBook 对比](https://www.statsig.com/perspectives/ab-testing-feature-flags-comparison-tools)
- [Deng 等：CUPED](https://www.exp-platform.com/Documents/2013-02-CUPED-ImprovingSensitivityOfControlledExperiments.pdf)
- [Howard：置信序列](https://arxiv.org/abs/1810.08240)
