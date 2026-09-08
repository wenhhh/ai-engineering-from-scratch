# 红队工具（Red-Team Tooling）— Garak、Llama Guard、PyRIT

> 三款生产工具构成了 2026 年的红队工具栈。Llama Guard（Meta）是一款基于 14 个 MLCommons 危害类别微调的 Llama-3.1-8B 分类器；2025 年推出的 Llama Guard 4 则是从 Llama 4 Scout 剪枝而来的 12B 原生多模态分类器。Garak（NVIDIA）是开源的大语言模型（LLM）漏洞扫描器，提供静态、动态和自适应探针，用于检测幻觉、数据泄露、提示词注入、有害内容和越狱。PyRIT（Microsoft）通过 Crescendo、TAP 和自定义转换器链开展多轮红队测试，深入探索漏洞利用。Meta 的《Llama 3 模型家族》（arXiv:2407.21783）介绍了 Llama Guard 3；arXiv:2411.17713 介绍了 Llama Guard 3-1B-INT4；github.com/NVIDIA/garak 介绍了 Garak 的探针架构。这些工具是 2026 年连接红队研究（第 12–15 课）与部署（第 17 课及后续课程）的生产接口。

**Type:** Build
**Languages:** Python (stdlib, tool-architecture simulator and Llama Guard-style classifier mock)
**Prerequisites:** 阶段 18 · 12-15（越狱与间接提示词注入（jailbreaks and IPI））
**Time:** ~75 分钟

## 学习目标（Learning Objectives）
- 说明 Llama Guard 3/4 在安全工具栈中的位置：输入分类器、输出分类器，或同时承担这两种角色。
- 列出 14 个 MLCommons 危害类别，并指出一个不那么显而易见的类别：代码解释器滥用（Code Interpreter Abuse）。
- 说明 Garak 的探针架构：探针、检测器与测试框架。
- 说明 PyRIT 的多轮测试结构，以及它如何与 Garak 探针配合。

## 问题（The Problem）
第 12–15 课介绍了攻击面。生产部署需要可重复、可扩展的评估。2026 年的三款主要工具是 Llama Guard（防御分类器）、Garak（扫描器）和 PyRIT（测试编排器）。它们分别面向红队工作生命周期的不同层次。

## 核心概念（The Concept）
### Llama Guard（Meta）
Llama Guard 3 是经过微调的 Llama-3.1-8B 模型，用于按照 MLCommons AILuminate 的 14 个类别对输入和输出进行分类：
- 暴力犯罪、非暴力犯罪、性相关内容、儿童性虐待材料（CSAM）、诽谤
- 专业建议、隐私、知识产权（IP）、无差别杀伤武器、仇恨
- 自杀与自残、性内容、选举、代码解释器滥用

它支持 8 种语言。使用时，可以将它放在 LLM 前面进行输入审核（Input Moderation），放在后面进行输出审核（Output Moderation），或同时放在两处。这两种用途对应不同的训练分布，而 Llama Guard 3 以一个模型同时处理两者。

Llama Guard 3-1B-INT4（arXiv:2411.17713，440MB，在移动端 CPU 上约为 30 tokens/s）是面向边缘设备的量化版本。

Llama Guard 4（2025 年 4 月）具有 12B 参数，原生支持多模态，由 Llama 4 Scout 剪枝而来。它用一个可以接收文本和图像的分类器，替代此前的 8B 文本模型和 11B 视觉模型。

### Garak（NVIDIA）
这是一个开源漏洞扫描器，其架构包括：
- **探针（Probes）。** 为幻觉、数据泄露、提示词注入、有害内容和越狱生成攻击。探针可以是静态的（固定提示词）、动态的（生成提示词），或自适应的（根据目标输出作出调整）。
- **检测器（Detectors）。** 根据预期失效模式对输出评分，例如是否含有有害内容、是否泄露信息、是否被越狱。
- **测试框架（Harnesses）。** 管理探针与检测器的配对，执行测试活动并生成报告。

TrustyAI 将 Garak 与 Llama-Stack 的防护组件集成，包括 Prompt-Guard-86M 输入分类器和 Llama-Guard-3-8B 输出分类器，用于对受防护的目标进行端到端评估。分级评分（Tier-Based Scoring，TBSA）取代了二元的通过或失败判断：同一个探针下，模型可能在严重程度第 3 级通过，而在第 5 级失败。

### PyRIT（Microsoft）
Python 风险识别工具包（Python Risk Identification Toolkit）用于多轮红队测试，主要包括：
- **转换器（Converters）。** 对种子提示词进行变换，例如改写、编码、翻译和角色扮演。
- **编排器（Orchestrators）。** 执行测试活动，包括 Crescendo（逐步升级）、TAP（分支探索）和 RedTeaming（自定义循环）。
- **评分（Scoring）。** 使用 LLM 作为评判器（LLM-as-Judge），或使用分类器作为评判器（Classifier-as-Judge）。

相较于 Garak，PyRIT 更为重量级。Garak 执行数千个单轮探针；PyRIT 则开展深入的多轮测试，专门尝试触发特定失效模式。

### 工具栈（The Stack）
在模型的输入端和输出端都部署 Llama Guard，每晚运行 Garak 进行回归测试，并在发布前运行 PyRIT 开展测试活动。这是 2026 年大多数生产部署的默认配置。

### 评估陷阱（Evaluation Pitfalls）
- **评判器身份（Judge Identity）。** 三款工具都可以使用 LLM 评判器；评判器的校准决定了报告中的攻击成功率（ASR，见第 12 课）。说明工具时，也要说明所用的评判器。
- **探针陈旧（Probe Staleness）。** 随着模型针对已有探针修补，Garak 探针会逐渐过时。类似 PAIR 的自适应探针比静态探针过时得更慢。
- **Llama Guard 对良性内容的误报率（FPR）。** 早期版本的 Llama Guard 对政治和 LGBTQ+ 内容存在过度标记问题；Llama Guard 3/4 的校准已有改进，但并未针对每个部署单独校准。

### 在第 18 阶段中的位置（Where This Fits in Phase 18）
第 12–15 课介绍攻击类别，第 16 课介绍生产工具。第 17 课（WMDP）介绍双用途能力评估。第 18 课介绍前沿安全框架，这些框架用政策结构将上述工具组织起来。

```figure
al-guard-stack
```

## 动手使用（Use It）
`code/main.py` 构建了一个 Llama Guard 风格的玩具分类器（结合关键词与语义特征，覆盖 14 个类别）、一个 Garak 风格的玩具测试框架（探针与检测器循环），以及一个 PyRIT 风格的多轮转换器链。你可以用这三款工具测试模拟目标，观察它们各自的覆盖特征。

## 交付成果（Ship It）
本课产出 `outputs/skill-red-team-stack.md`。给定部署说明，它会指出三款工具中哪些适用、每款工具应配置什么，以及回归测试应按什么频率执行。

## 练习（Exercises）
1. 运行 `code/main.py`。比较 Llama Guard 风格分类器对单轮攻击与多轮攻击的检出率。
2. 实现一个新的 Garak 探针：经过 base64 编码的有害请求。测量 Llama Guard 风格分类器对它的检测效果。
3. 在 PyRIT 风格的转换器链中加入“先翻译成法语，再改写”的转换器，重新测量攻击成功率。
4. 阅读 Llama Guard 3 的危害类别列表，找出两个类别：在这些类别中，训练数据在实际情况下可能导致合法开发者内容出现较高误报率。
5. 比较 Garak 与 PyRIT 的设计原则，并分别论证一种适合使用它们的部署场景。

## 关键术语（Key Terms）
| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| Llama Guard | “分类器” | 经过微调的 Llama-3.1-8B/4-12B 安全分类器，覆盖 14 个危害类别 |
| Garak | “扫描器” | NVIDIA 的开源漏洞扫描器，由探针、检测器和测试框架组成 |
| PyRIT | “测试活动工具” | Microsoft 的多轮红队编排工具，由转换器、编排器和评分组件组成 |
| Prompt-Guard | “小分类器” | Meta 的 86M 提示词注入分类器，与 Llama Guard 配合使用 |
| 分级评分（TBSA） | “按等级评分” | Garak 用于取代二元结果的分级通过或失败判断 |
| 转换器链（Converter Chain） | “改写 + 编码 + ……” | PyRIT 中用于构建多步骤攻击的组合原语 |
| MLCommons 危害类别（MLCommons Hazard Categories） | “14 类分类体系” | Llama Guard 所针对的行业标准分类体系 |

## 延伸阅读（Further Reading）
- [Meta — Llama Guard 3（见 Llama 3 模型家族论文，arXiv:2407.21783）](https://arxiv.org/abs/2407.21783) — 8B 分类器
- [Meta — Llama Guard 3-1B-INT4（arXiv:2411.17713）](https://arxiv.org/abs/2411.17713) — 量化移动端分类器
- [NVIDIA Garak — GitHub](https://github.com/NVIDIA/garak) — 扫描器仓库与文档
- [Microsoft PyRIT — GitHub](https://github.com/Azure/PyRIT) — 红队测试工具包
