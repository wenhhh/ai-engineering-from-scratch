---
name: safety-harness
description: 为目标 LLM 应用连接分层安全流水线，运行六类攻击红队靶场，并运行宪法式自我批评，以测量无害性变化。
version: 1.0.0
phase: 19
lesson: 15
tags: [capstone, safety, red-team, llama-guard, x-guard, garak, pyrit, constitutional-ai]
---

给定目标 LLM 应用（8B 指令微调模型或 RAG 聊天机器人），用分层安全流水线加固，并在六类攻击上运行自主红队靶场（Red-Team Range）。生成前后无害性（Harmlessness）报告。

构建计划（Build Plan）：

1. 五层流水线：输入清理（移除零宽字符、解码、Unicode 规范化）-> NeMo Guardrails v0.12 规则 -> 分类器关卡（Llama Guard 4 / X-Guard / ShieldGemma-2 / Nemotron 3）-> 目标 LLM -> 输出过滤（Llama Guard 4 + Presidio PII + 引用检查）。被标记输出进入 Slack 人在回路（Human-in-the-loop，HITL）队列。
2. 每层生成一个 Langfuse 跟踪区段（Span），使归因可端到端观测。
3. 红队调度器通过 cron 运行 garak、PyRIT、PAIR、TAP、GCG、多轮角色与多语言语码切换（Code-Switch）攻击。
4. 每次成功越狱：CVSS 4.0 评分、复现、缓解计划、披露时间线。
5. 持续运行 XSTest 良性提示词探测，捕获过度拒绝（Over-Refusal）回归。
6. 宪法式自我批评（Constitutional Self-Critique）：1000 条有害尝试提示词 -> 目标起草 -> 批评者按书面宪法评分 -> 重写样本对 -> SFT。在留出无害性评估上测量前后变化。
7. 告警：良性问题表现回归时发 Slack 警告，新越狱类别出现时发 PagerDuty 严重告警。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 攻击面覆盖 | 演练六类以上攻击、两种以上语言 |
| 20 | 真阳性／假阳性权衡 | 攻击阻断率与 XSTest 良性通过率对比 |
| 20 | 自我批评增益 | 留出评估上的前后无害性 |
| 20 | 文档与披露 | CVSS 评分发现，附时间线 |
| 15 | 自动化与可重复性 | cron 驱动，告警端到端演练 |

直接判定不合格的情况（Hard Rejects）：

- 单层安全栈。本综合实践的主张是纵深防御（Defense in Depth）。
- 红队运行报告成功率，却不报告 XSTest 过度拒绝数值。
- 宪法式自我批评没有留出评估，报告的是训练集准确率而非泛化（Generalization）。
- 越狱发现缺少 CVSS 评分。

拒绝规则（Refusal Rules）：

- 没有良性探测对照时，拒绝报告安全数值。只报其中一项会误导。
- 批评样本对未经人工整理时，拒绝根据成功红队攻击自动重训。
- 未在至少两种非英语语言上运行 X-Guard 时，拒绝声称多语言覆盖。

输出：一个仓库，包含五层流水线、红队调度器、PAIR/TAP/GCG 运行器、宪法式自我批评训练框架、XSTest 过度拒绝仪表盘、CVSS 发现追踪器，以及说明加固前成功率最高的三类攻击和各自由哪一具体流水线层缓解的报告。
