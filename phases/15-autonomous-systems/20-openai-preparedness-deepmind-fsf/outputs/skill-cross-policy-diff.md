---
name: cross-policy-diff
description: 以 OpenAI 准备度框架 v2、Anthropic RSP v3.0 和 DeepMind FSF v3 为参照，针对特定能力生成跨政策比较。
version: 1.0.0
phase: 15
lesson: 20
tags: [preparedness-framework, fsf, rsp, cross-policy, scaling-policy]
---

给定一种具体的前沿能力（例如“长程自主性”“自主复制与适应”“研发自动化”），生成跨政策差异比较，展示三种框架各自如何对该能力分类，以及会触发哪些缓解措施。

请生成：

1. **OpenAI PF v2 分类（classification）。** 属于跟踪类别（Tracked）还是研究类别（Research）。若属于跟踪类别，指明能力报告与防护措施报告的触发条件。若属于研究类别，注明政策措辞是“潜在的”缓解措施。
2. **Anthropic RSP v3.0 分类。** 对应哪个阈值（ASL-3、AI R&D-4、硬编码禁令）？对应哪种缓解措施（正面论证、安全与部署措施）？确认承诺位于 Anthropic 单方面行动层，还是行业建议层。
3. **DeepMind FSF v3 分类。** 对应哪个领域（网络安全（Cyber）、生物（Bio）、机器学习研发（ML R&D）、化生放核（CBRN））？对应哪个关键能力等级（CCL）或跟踪能力等级（Tracked Capability Level）？是否启用欺骗性对齐监控？
4. **共识摘要（Convergence summary）。** 三份政策对该能力的严重程度是否一致，还是存在实质分歧？哪种分类最严格，哪种最宽松？
5. **测量依赖（Measurement dependency）。** 每种分类都依赖能力测量。说明如何测量该能力，以及由哪个评估方（METR、Apollo、内部或第三方）负责测量。

硬性拒绝条件（Hard rejects）：
- 仅凭公告措辞相似就声称跨政策一致，却没有文档层面的证据。
- 任何无法指向源文档具体条款的分类。
- 将“研究类别”（OpenAI）等同于“跟踪类别”：两者产生的实际操作后果不同。

拒绝规则（Refusal rules）：
- 如果用户无法提供每项分类对应的源文档段落，拒绝并要求先提供引用。
- 如果用户把政策的存在当作缓解措施已在实践中生效的证据，拒绝并要求提供具体缓解措施实际触发的证据。
- 如果声称某框架“覆盖”某项能力，但文档中没有出现该词，拒绝并要求提供具体条款引用。

输出格式（Output format）：

返回一份差异比较文档，包含：
- **能力定义**（一句话）
- **OpenAI PF v2 行**（分类、触发条件、源条款）
- **Anthropic RSP v3.0 行**（分类、触发条件、单方面行动或行业建议）
- **DeepMind FSF v3 行**（领域、CCL / TCL、是否涉及欺骗性对齐）
- **共识摘要**（一致之处及实质分歧）
- **测量责任方（Measurement ownership）**（评估方、评估频率）
- **给读者的建议**（最严格、最宽松，给出理由）
