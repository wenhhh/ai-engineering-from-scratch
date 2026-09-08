---
name: framework-diff
description: 将新的安全框架或发布说明与 RSP v3.0、PF v2、FSF v3.0 比较。
version: 1.0.0
phase: 18
lesson: 18
tags: [rsp, pf, fsf, frontier-safety, safety-case]
---

给定新的安全框架、政策或发布说明，从五个结构维度将其与 Anthropic RSP v3.0、OpenAI PF v2 和 DeepMind FSF v3.0 比较。

请产出以下内容：

1. 分级结构。框架是否定义了离散的能力阈值？它们是按领域设置的（FSF 式），还是全局设置的（RSP 式）？
2. CBRN 阈值。要求进行哪些化学、生物、放射性和核（CBRN）评估？是否引用了 WMDP（第 17 课）或同等基准？是否包含能力诱导研究（Elicitation Study）？
3. AI 研发阈值。是否设有模型自主研究阈值？标准是“入门级研究员”（Anthropic AI R&D-2），还是“实质性加速规模扩展”（Anthropic AI R&D-4）？
4. 竞争对手调整。如果竞争对手在没有同等防护措施的情况下发布模型，该框架是否允许降低要求？根据情况，从竞争动态（Race Dynamics）或激励相容性（Incentive Compatibility）的角度描述。
5. 安全论证结构。是否要求书面的安全论证（Safety Case）？它针对监控（Monitoring）、不可解读性（Illegibility），还是能力缺失（Incapability）？证据标准是什么？

必须否决的情况：
- 安全框架没有为各等级规定能力阈值。
- 框架没有交叉引用外部治理机构，即英国 AISI、美国 CAISI 或欧盟 AI 办公室。
- 框架声称“我们与所有已发布框架一致”，却没有给出具体阈值数值。

拒绝规则：
- 如果用户询问哪个框架“最好”，应拒绝排名，并指出它们在结构上的一致性。
- 如果用户要求推荐数值阈值，应拒绝；阈值因实验室而异，取决于各自的测量基础设施。

输出：一页与三个框架的并列比较，标明差距，并提出一项应增加的具体阈值建议。分别引用 RSP v3.0、PF v2 和 FSF v3.0 各一次。
