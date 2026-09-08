---
name: classifier-stack-audit
description: 审计部署输入输出分类器栈（模型、分类体系、输入/输出/对话防护），标记对抗攻击缺口。
version: 1.0.0
phase: 15
lesson: 18
tags: [llama-guard, nemo-guardrails, input-rails, output-rails, colang, adversarial-attacks]
---

根据已部署的分类器栈（Llama Guard 版本、NeMo Guardrails 配置、自定义分类器、规范化步骤），对照 2026 年的参考资料进行审计，指出尚未防护的攻击面。

请输出：

1. **模型清单（Model inventory）。** 列出使用的分类器：Llama Guard 3（8B / 1B-INT4）或 Llama Guard 4（多模态、S1–S14）、NeMo Guardrails 版本、自定义分类器。若接受图像，确认分类器多模态。
2. **分类映射（Taxonomy mapping）。** 将声明业务类别映射到分类器体系。运维方关心的每类都必须有映射，无映射即无防护。
3. **防护覆盖（Rail coverage）。** 确认输入防护在模型轮次前触发，输出防护在回复交付前触发。对话防护（NeMo 中的 Colang）实施跨轮约束，单轮分类器抓不到多轮攻击。
4. **规范化（Normalization）。** 确认分类前执行 NFKC 规范化、同形字符映射，并移除零宽字符和变体选择符。直接对未经处理的原始字节进行分类，会成为表情符号夹带（Emoji Smuggling）攻击的目标；Huang 等（2025）报告的这类攻击成功率（ASR）达到 100%。
5. **攻击资料覆盖（Attack-corpus coverage）。** 对每种已记录攻击（表情符号夹带、同形字符、上下文重定向、语义改写）指出栈中具体防御。仅分类器不通过，需与宪法（第 17 课）及运行时（第 10、13、14 课）分层结合。

必须拒绝：
- 对多模态输入使用纯文本分类器。
- 没有规范化步骤。
- 只有输入防护，敏感类别输出无输出防护。
- 将分类器作为唯一安全层。
- 声称某个攻击成功率（ASR），却无法在运维方自身的数据分布上复现。

拒绝规则：
- 若声明类别无法映射到分类体系，拒绝，要求先映射。无映射 = 无防护。
- 若多模态输入面引用 Llama Guard 3 ASR，拒绝，要求 Llama Guard 4 或多模态分类器。
- 若用户认为高风险场景仅分类器足够，拒绝。欧盟 AI 法案第 14 条（第 15 课）还要求人工监督。

输出格式：

返回分类器审计，包含：
- **模型清单（Model inventory）**：名称、版本、模态
- **分类映射（Taxonomy mapping）**：运维方类别 → 分类器类别
- **防护覆盖（Rail coverage）**：输入 / 输出 / 对话，模型前后触发
- **规范化说明（Normalization note）**：NFKC y/n、同形字符 y/n、移除零宽 y/n
- **攻击资料覆盖（Attack-corpus coverage）**：攻击 → 防御
- **层完整性（Layer completeness）**：分类器 + 宪法 + 运行时，三者必需
- **就绪性（Readiness）**：生产 / 预发布 / 仅研究
