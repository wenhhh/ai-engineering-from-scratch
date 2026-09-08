# 综合实践 15：宪法式安全框架与红队靶场（Constitutional Safety Harness + Red-Team Range）

> Anthropic 的宪法式分类器（Constitutional Classifiers）、Meta 的 Llama Guard 4、Google 的 ShieldGemma-2、NVIDIA 的 Nemotron 3 Content Safety，以及覆盖多语言的 X-Guard，定义了 2026 年安全分类器技术栈。garak、PyRIT、NVIDIA Aegis 和 promptfoo 成为标准对抗评估（Adversarial Evaluation）工具，NeMo Guardrails v0.12 将它们接入生产流水线。本综合实践整合所有部分：围绕目标应用的分层安全框架（Layered Safety Harness）、运行六类以上攻击的自主红队智能体，以及产生可测无害性（Harmlessness）变化的宪法式自我批评（Constitutional Self-Critique）运行。

**Type:** Capstone
**Languages:** Python（安全流水线、红队）, YAML（策略配置）
**Prerequisites:** 阶段 10（从零构建大语言模型）、阶段 11（大语言模型工程）、阶段 13（工具）、阶段 14（智能体）、阶段 18（伦理、安全、对齐）
**涉及阶段（Phases exercised）:** P10 · P11 · P13 · P14 · P18
**Time:** 25 小时

## 问题（Problem）

2026 年 LLM 安全的前沿不在于分类器是否有效，它们大体有效，而在于如何围绕生产应用正确组合，既不过度拒绝（Over-Refusal），也不留下明显漏洞。Llama Guard 4 处理英语策略违规，X-Guard 覆盖 132 种语言的多语言越狱（Jailbreak），ShieldGemma-2 捕获基于图像的提示词注入（Prompt Injection），NVIDIA Nemotron 3 Content Safety 覆盖企业类别。Anthropic 的宪法式分类器是另一条路线，用于训练而非服务阶段。

攻击演化也重要。PAIR 和 TAP 自动发现越狱，GCG 执行基于梯度的后缀攻击（Suffix Attack）。多轮与语码切换（Code-Switch）攻击利用智能体记忆。任何已部署 LLM 都需要红队靶场，garak 与 PyRIT 是典型驱动工具，还需记录缓解措施，以及按通用漏洞评分系统（Common Vulnerability Scoring System，CVSS）评分的发现。

你将加固目标应用，即 8B 指令微调模型或其他综合实践中的 RAG 聊天机器人，对其运行六类以上攻击，生成加固前后无害性测量。

## 概念（Concept）

安全流水线分五层。**输入清理（Input Sanitize）**：移除零宽字符、解码 base64/rot13、规范化 Unicode。**策略层（Policy Layer）**：NeMo Guardrails v0.12 规则，处理领域外问题、毒性与个人身份信息（Personally Identifiable Information，PII）提取。**分类器关卡（Classifier Gate）**：Llama Guard 4 处理输入，X-Guard 处理非英语，ShieldGemma-2 处理图像输入。**模型（Model）**：目标 LLM。**输出过滤器（Output Filter）**：Llama Guard 4 处理输出，Presidio 清理 PII，适用时强制引用。**人在回路层（Human-in-the-loop，HITL Tier）**：高风险标记输出进入 Slack 队列。

红队靶场由调度器运行。PAIR 和 TAP 自主发现越狱，GCG 运行基于梯度的后缀攻击；还有 ASCII / base64 / rot13 编码攻击、多轮攻击（采用设定角色、利用记忆）和语码切换攻击（英语混合斯瓦希里语或泰语）。每次运行生成结构化发现文件，附 CVSS 评分与披露时间线（Disclosure Timeline）。

宪法式自我批评是训练阶段干预。取 1000 条有害尝试提示词，让模型起草回答，依据书面宪法，即不造成伤害的规则，批评回答，再基于批评循环重新训练。在留出评估（Held-Out Eval）上测量前后无害性变化。

## 架构（Architecture）

```
请求（文本 / 图像 / 多语言）
      |
      v
输入清理（移除零宽字符、解码、规范化）
      |
      v
NeMo Guardrails v0.12 规则（领域外、策略）
      |
      v
分类器关卡：
  Llama Guard 4（英语）
  X-Guard（多语言，132 种）
  ShieldGemma-2（图像提示词）
  Nemotron 3 Content Safety（企业）
      |
      v（允许）
目标 LLM
      |
      v
输出过滤：Llama Guard 4 + Presidio PII + 引用检查
      |
      v
被标记输出进入 HITL 层

并行：
  红队调度器
    -> garak（经典攻击）
    -> PyRIT（编排红队）
    -> 自主越狱智能体（PAIR + TAP）
    -> GCG 后缀攻击
    -> 多语言 / 语码切换
    -> 多轮角色采用

输出：CVSS 评分发现 + 披露时间线 + 前后无害性变化
```

## 技术栈（Stack）

- 安全分类器（Safety Classifiers）：Llama Guard 4、ShieldGemma-2、NVIDIA Nemotron 3 Content Safety、X-Guard
- 防护框架（Guardrail Framework）：NeMo Guardrails v0.12 + OPA
- 红队驱动工具：garak（NVIDIA）、PyRIT（Microsoft Azure）、NVIDIA Aegis、promptfoo
- 越狱智能体：PAIR（Chao 等，2023）、攻击树（Tree-of-Attacks，TAP）、GCG 后缀
- 宪法式训练（Constitutional Training）：Anthropic 风格自我批评循环 + 对批评进行监督微调（Supervised Fine-Tuning，SFT）
- PII 清理：Presidio
- 目标：8B 指令微调模型或其他综合实践中的 RAG 聊天机器人

```figure
cf-safety-stack
```

## 动手实现（Build It）

1. **目标搭建（Target Setup）。** 在 vLLM 上部署 8B 指令微调模型，或复用其他综合实践的 RAG 聊天机器人。这就是被测应用。

2. **安全流水线封装（Safety Pipeline Wrap）。** 在目标周围连接五层流水线。验证每层可独立观测，在 Langfuse 中每层有一个跟踪区段（Span）。

3. **分类器覆盖（Classifier Coverage）。** 加载 Llama Guard 4、X-Guard（多语言）、ShieldGemma-2（图像）。分别在小型标注集上运行以建立基线。

4. **红队调度器（Red-Team Scheduler）。** 调度 garak、PyRIT、PAIR 智能体、TAP 智能体、GCG 运行器、多轮攻击者和语码切换攻击者，各自在独立队列运行。

5. **攻击套件（Attack Suite）。** 六类攻击：（1）PAIR 自动越狱，（2）TAP 攻击树，（3）GCG 梯度后缀，（4）ASCII / base64 / rot13 编码，（5）多轮角色，（6）多语言语码切换。报告逐类成功率。

6. **宪法式自我批评（Constitutional Self-Critique）。** 整理 1000 条有害尝试提示词，每条由目标起草回答。批评者 LLM 根据书面宪法评分，例如“不造成伤害”“引用证据”“拒绝违法请求”。对批评者提出异议的提示词进行重写，目标在批评改进后的样本对上微调。在留出评估上测量前后无害性。

7. **过度拒绝测量（Over-Refusal Measurement）。** 在 XSTest 等良性提示词套件上追踪假阳性率（False-Positive Rate）。目标对良性问题必须保持有帮助。

8. **CVSS 评分（CVSS Scoring）。** 对每次成功越狱按 CVSS 4.0 评分，涵盖攻击向量、复杂度和影响。生成披露时间线与缓解计划。

9. **靶场自动化（Range Automation）。** 上述所有步骤通过 cron 运行；发现写入队列；过度拒绝回归告警发送到 Slack。

## 实际应用（Use It）

```
$ safety probe --model=target --family=PAIR --budget=50
[attacker]   PAIR agent running on target
[attack]     attempt 1/50: disguise query as academic research ... blocked
[attack]     attempt 2/50: appeal to roleplay ... blocked
[attack]     attempt 3/50: chain-of-thought coax ... SUCCEEDED
[finding]    CVSS 4.8 medium: roleplay bypass on target
[range]      7 successes out of 50 (14% success rate)
```

## 交付成果（Ship It）

`outputs/skill-safety-harness.md` 是交付物：生产级分层安全流水线，加可复现红队靶场，附前后无害性变化。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 攻击面覆盖 | 演练六类以上攻击、两种以上语言 |
| 20 | 真阳性／假阳性权衡 | 攻击阻断率与 XSTest 良性通过率对比 |
| 20 | 自我批评增益 | 留出评估上的前后无害性 |
| 20 | 文档与披露 | CVSS 评分发现，附时间线 |
| 15 | 自动化与可重复性 | 所有步骤通过 cron 运行，带告警 |
| **100** | | |

## 练习（Exercises）

1. 在 RAG 聊天机器人上运行 garak 提示词注入插件，比较启用和禁用输出过滤层的攻击成功率。

2. 增加第七类攻击：通过检索文档进行间接提示词注入（Indirect Prompt Injection）。测量需要增加哪些防御。

3. 实现“拒绝并帮助”模式：防护阻断时，目标提供更安全的相关回答，而非直接拒绝。测量 XSTest 变化。

4. 多语言覆盖缺口：找出 X-Guard 表现欠佳的语言，提出针对它的微调数据集。

5. 在 30B 模型上运行宪法式自我批评，测量增益是否随规模增长。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 分层安全（Layered Safety） | “纵深防御（Defense in Depth）” | 在输入、关卡、输出、HITL 多处设置防护 |
| Llama Guard 4 | “Meta 安全分类器” | 2026 年参考输入／输出内容分类器 |
| PAIR | “越狱智能体” | Chao 等人的论文，研究 LLM 驱动越狱发现 |
| 攻击树（Tree-of-Attacks，TAP） | “攻击树” | PAIR 的树搜索变体 |
| 贪心坐标梯度（Greedy Coordinate Gradient，GCG） | “贪心坐标梯度” | 基于梯度的对抗后缀攻击 |
| 宪法式自我批评（Constitutional Self-Critique） | “Anthropic 风格训练” | 目标起草 -> 批评者评分 -> 重写 -> 重训 |
| XSTest | “良性探测集” | 过度拒绝回归基准 |
| CVSS 4.0 | “严重程度评分” | 用于安全发现的标准漏洞评分 |

## 延伸阅读（Further Reading）

- [Anthropic 宪法式分类器](https://www.anthropic.com/research/constitutional-classifiers)：训练阶段参考
- [Meta Llama Guard 4](https://www.llama.com/docs/model-cards-and-prompt-formats/llama-guard-4/)：2026 输入／输出分类器
- [Google ShieldGemma-2](https://huggingface.co/google/shieldgemma-2b)：图像与多模态安全
- [NVIDIA Nemotron 3 Content Safety](https://developer.nvidia.com/blog/building-nvidia-nemotron-3-agents-for-reasoning-multimodal-rag-voice-and-safety/)：企业参考
- [X-Guard（arXiv:2504.08848）](https://arxiv.org/abs/2504.08848)：132 语言多语言安全
- [garak](https://github.com/NVIDIA/garak)：NVIDIA 红队工具包
- [PyRIT](https://github.com/Azure/PyRIT)：Microsoft 红队框架
- [NeMo Guardrails v0.12](https://docs.nvidia.com/nemo-guardrails/)：防护规则框架
- [PAIR（arXiv:2310.08419）](https://arxiv.org/abs/2310.08419)：越狱智能体论文
