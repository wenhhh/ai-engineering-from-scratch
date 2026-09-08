# 合规：SOC 2、HIPAA、GDPR、PCI-DSS、EU AI Act、ISO 42001（Compliance — SOC 2, HIPAA, GDPR, PCI-DSS, EU AI Act, ISO 42001）

> 多框架覆盖是 2026 年企业交易的基本门槛。**欧盟人工智能法案（EU AI Act）** 自 2024 年 8 月 1 日生效，多数高风险要求于 2026 年 8 月 2 日执行。违反高风险系统义务的罚款最高为 €15M 或全球年营业额的 3%（第 99(4) 条）；违反禁止性 AI 实践的罚款最高为 €35M 或 7%（第 99(3) 条）。只要服务欧盟用户，就可能在全球范围适用。**科罗拉多州人工智能法案（Colorado AI Act）** 于 2026 年 6 月 30 日生效，SB25B-004 将原定 2026 年 2 月的日期推迟；要求高风险系统进行影响评估，并赋予对 AI 决策提出申诉的权利。弗吉尼亚州对信贷、就业、住房和教育也有类似规定。**SOC 2 Type II** 是 B2B AI 事实上的要求；金融科技需要 Type II，而不是 Type I。**GDPR**：有记录的最大 AI 专项罚款是荷兰数据保护机构于 2024 年 9 月对 Clearview AI 处以 €30.5M；意大利 Garante 于 2024 年 12 月对 OpenAI 处以 €15M，后在 2026 年 3 月上诉中被撤销。推理时实时 PII 脱敏是可辩护的标准，事后清理不够。**HIPAA** 适用于医疗：没有 BAA，不能将 PHI 发送给外部 AI 服务。**PCI-DSS** 对 AI 交互层的覆盖需要配置和合同，并非自动获得。**ISO 42001** 是新兴 AI 治理标准，与 ISO 27001 一起日益成为采购要求。参考合规概况：OpenAI 维持 SOC 2 Type 2、ISO/IEC 27001:2022、ISO/IEC 27701:2019、GDPR/CCPA/HIPAA（BAA）/FERPA，以及覆盖 ChatGPT 支付组件的 PCI-DSS。跨框架映射可减少审计疲劳，例如访问控制可映射到 ISO 27001 A.5.15-5.18、GDPR Art. 32、HIPAA §164.312(a)。

**Type:** Learn
**Languages:** （Python 可选；合规依靠策略与流程，而非代码）
**Prerequisites:** 阶段 17 · 25（安全），阶段 17 · 13（可观测性）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 列出 2026 年与 LLM 产品相关的七个框架，并将各框架对应到客户群体。
- 引用 EU AI Act 执行时间线：2024 年 8 月生效，2026 年 8 月执行高风险要求；说明两档罚款上限：高风险义务 €15M / 3%，禁止性实践 €35M / 7%。
- 解释为什么事后 PII 清理不足以满足可辩护的 GDPR 安排，并指出推理层实时脱敏这一标准。
- 描述跨框架控制映射，例如访问控制对应 ISO 27001 A.5.15-5.18 + GDPR Art. 32 + HIPAA §164.312(a)。

## 问题（The Problem）

企业客户采购要求 SOC 2 Type II、GDPR、HIPAA BAA、ISO 27001 和“EU AI Act 合规声明”。你的团队只有 SOC 2 Type I，距离 Type II 还有六个月，连 GDPR 第 30 条记录都没开始准备。

多框架覆盖并非 LLM 独有问题，而是企业 SaaS 问题，叠加了 LLM 特有要求。2026 年的采购团队想要一份每行一个框架、每列一项控制的矩阵，而不只是一份 PDF。

## 概念（The Concept）

### 七个框架（The seven frameworks）

| 框架 | 范围 | LLM 特有要求 |
|-----------|-------|--------------------------|
| SOC 2 Type II | B2B SaaS 基准 | 对持续运行 6–12 个月的流程控制进行审计 |
| HIPAA | 美国医疗 | 必须有 BAA；未签署协议时，PHI 不能离开基础设施 |
| GDPR | 欧盟用户 | 实时 PII 脱敏、数据主体权利、第 30 条记录 |
| PCI-DSS | 支付数据 | 涉及支付的 AI 需要配置与合同 |
| EU AI Act | 服务欧盟用户 | 风险分级；高风险系统需合格评定、文档、日志 |
| Colorado AI Act | 服务科罗拉多州居民 | 影响评估、申诉权 |
| ISO 42001 | AI 治理 | 新兴标准，与 ISO 27001 配套 |

### EU AI Act 时间线（EU AI Act timeline）

- 2024 年 8 月 1 日：生效。
- 2025 年 2 月 2 日：执行禁止性 AI 实践规定。
- 2026 年 8 月 2 日：执行高风险系统要求，包括合格评定、文档、日志。
- 2027 年 8 月：适用于协调立法所覆盖产品中的高风险系统。

风险等级为不可接受（禁止）、高风险（合格评定与日志）、有限风险（透明度）、最低风险（无约束）。多数 B2B LLM SaaS 属于有限风险；就业、信贷、教育、执法、移民和基本服务会进入高风险范围。

罚款（第 99 条）：违反高风险系统义务，最高 €15M 或全球年营业额的 3%（第 99(4) 条）；违反禁止性 AI 实践，最高 €35M 或 7%（第 99(3) 条）；适用较高者。

### GDPR：实时脱敏是标准（GDPR — real-time redaction is the standard）

事后清理，即 LLM 已看到数据后才脱敏 PII，无法构成可辩护的安排，因为模型已经接触数据。推理层实时脱敏是 2026 年的标准：

- LLM 调用前进行实体识别。
- 一致性令牌化（Mesh 方法）保留语义。
- 仅存储脱敏提示词，以及用户同意主动选择保留的原文。

近期执法：荷兰数据保护机构 2024 年 9 月对 Clearview AI 的 €30.5M 罚款，是迄今有记录的最大 AI 专项 GDPR 罚款；意大利 Garante 2024 年 12 月对 OpenAI 的 €15M 罚款，是最大的 LLM 专项罚款，但已在 2026 年 3 月上诉中被撤销，裁决仍在进一步审查。声称事后处理即可的做法未能通过审计。

### HIPAA：BAA 不是可选项（HIPAA — BAA is not optional）

没有签署业务伙伴协议（Business Associate Agreement），就不能将 PHI 发送给外部 AI 服务。三家超大规模云的 LLM 平台 Bedrock、Azure OpenAI、Vertex 都提供 BAA。OpenAI 直连 API 和 Anthropic 直连 API 也提供 BAA。发送 PHI 前必须确认。

### SOC 2 Type II 的要求（SOC 2 Type II）

Type I：控制已设计并形成文档。
Type II：控制在 6–12 个月内有效运行。

2026 年 B2B 采购默认要求 Type II。Type I 是起点，Type II 才是门槛。

常见审计关注点包括访问日志（谁看到了什么）、变更管理（如何部署）、季度风险评估，以及事件响应是否经过测试。阶段 17 · 25 的审计日志可以直接复用。

### 跨框架映射（Cross-framework mapping）

一项访问控制策略可以满足多个框架控制：

| 控制 | 框架 |
|---------|-----------|
| 访问日志 | ISO 27001 A.5.15-5.18、GDPR Art. 32、HIPAA §164.312(a) |
| 变更管理 | ISO 27001 A.8.32、PCI DSS Req. 6、HIPAA 泄露通知范围 |
| 传输中加密 | ISO 27001 A.8.24、GDPR Art. 32、HIPAA §164.312(e) |
| 密钥管理 | ISO 27001 A.8.19、PCI DSS Req. 8、SOC 2 CC6.1 |

Drata、Vanta、Secureframe 等合规工具可以自动完成映射。规模扩大后，这笔费用值得投入。

### ISO 42001：新兴标准（ISO 42001 — emerging）

发布于 2023 年末，正与 ISO 27001 一起成为越来越常见的采购要求。它是 AI 治理框架，覆盖风险管理、数据质量、透明度和人工监督。

### OpenAI 的参考合规概况（OpenAI's reference profile）

OpenAI 维持 SOC 2 Type 2、ISO/IEC 27001:2022、ISO/IEC 27701:2019、GDPR/CCPA/HIPAA（BAA）/FERPA，以及覆盖 ChatGPT 支付组件的 PCI-DSS。这大致就是 2026 年企业市场的基本门槛。

### 应记住的数字（Numbers you should remember）

- EU AI Act 罚款：高风险义务最高 €15M / 3%（Art. 99(4)）；禁止性实践最高 €35M / 7%（Art. 99(3)）。
- EU AI Act 高风险要求执行：2026 年 8 月 2 日。
- 有记录的最大 AI 专项 GDPR 罚款：Clearview AI，€30.5M，荷兰数据保护机构，2024 年 9 月。
- 最大 LLM 专项 GDPR 罚款：OpenAI，€15M，意大利 Garante，2024 年 12 月；2026 年 3 月上诉撤销。
- SOC 2 Type II 时间窗口：控制运行 6–12 个月。
- Colorado AI Act 生效日期：2026 年 6 月 30 日，由 SB25B-004 从 2026 年 2 月推迟。

```figure
i4-control-matrix
```

## 动手使用（Use It）

`code/main.py` 是用 Python 实现的合规映射表：给定一项控制，列出它满足的框架。

## 交付成果（Ship It）

本课产出 `outputs/skill-compliance-matrix.md`。它根据客户群体和地区，指定所需框架及控制。

## 练习（Exercises）

1. 首个企业客户要求 SOC 2 Type II、HIPAA BAA 和 EU AI Act 声明。赢得交易所需的最低可行合规安排是什么？
2. 按 EU AI Act 风险等级对三个假设的 LLM 产品分类。进入高风险后，要求有何变化？
3. 你意外将 PHI 发给没有 BAA 的提供商。逐步说明事件响应流程。
4. 论证 ISO 42001 对中型市场 AI 供应商而言，是否“在 2026 年必不可少”。
5. 将 LLM 审计日志字段（阶段 17 · 25）映射到至少三个框架控制。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| SOC 2 Type II | “经审计的控制” | 控制运行 6–12 个月，并经独立鉴证 |
| HIPAA BAA | “医疗合同” | 业务伙伴协议，处理 PHI 所必需 |
| GDPR | “欧盟隐私” | 实时 PII 脱敏是 2026 年可辩护的标准 |
| EU AI Act | “欧盟 AI 规则” | 2026 年 8 月执行高风险要求；高风险义务 €15M / 3%，禁止性实践 €35M / 7% |
| Colorado AI Act | “美国州级 AI 法” | 2026 年 6 月 30 日生效，由 SB25B-004 推迟，要求影响评估 |
| ISO 42001 | “AI 治理” | AI 风险与透明度的新兴框架 |
| ISO 27001 | “安全 ISMS” | 信息安全管理体系基准 |
| 合格评定（Conformity assessment） | “欧盟 AI 文档包” | 高风险要求：文档、测试、日志 |
| 跨框架映射（Cross-framework mapping） | “一项控制，多个框架” | 一项策略满足多个框架控制 |

## 延伸阅读（Further Reading）

- [OpenAI 安全与隐私](https://openai.com/security-and-privacy/)：参考合规概况。
- [GuardionAI：2026 年 LLM 合规，ISO 42001、EU AI Act、SOC 2、GDPR](https://guardion.ai/blog/llm-compliance-guide-iso-42001-eu-ai-act-soc2-gdpr-2026)
- [Dsalta：2026 年 SOC 2 Type 2 审计指南，10 项 AI 控制](https://www.dsalta.com/resources/ai-compliance/soc-2-type-2-audit-guide-2026-10-ai-powered-controls-every-saas-team-needs)
- [EU AI Act 官方文本](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)：一手来源。
- [Colorado AI Act 法案文本](https://leg.colorado.gov/bills/sb24-205)：一手来源。
- [ISO/IEC 42001:2023](https://www.iso.org/standard/81230.html)：AI 管理体系标准。
