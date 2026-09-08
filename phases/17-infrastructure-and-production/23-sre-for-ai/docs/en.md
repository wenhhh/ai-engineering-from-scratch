# AI 的站点可靠性工程：多智能体事件响应、运行手册与预测检测（SRE for AI — Multi-Agent Incident Response, Runbooks, Predictive Detection）

> AI SRE 通过 RAG 让 LLM 以基础设施数据（日志、运行手册、服务拓扑）为依据，自动处理调查、文档记录和协调阶段。2026 年的架构模式是多智能体编排：日志、指标、运行手册等专用智能体由监督智能体协调；AI 提出假设和查询，人工批准需要判断的决策。Datadog Bits AI 和 Azure SRE Agent 已将其作为托管产品交付。运行手册也在演进：NeuBird Hawkeye 使用对抗式评估（adversarial evaluation），让两个模型分析同一事件；一致意味着有信心，不一致意味着存在不确定性。运维记忆会在团队人员变化后继续保留。自动修复仍需谨慎：AI 建议，人工批准。完全自主操作仅限于重启 Pod、回滚指定部署等狭窄范围，并设严格护栏；宣称“设置后就不用管”的说法夸大了能力。新兴方向是事前事件预测：MIT 研究报告，一个基于历史日志、GPU 温度和 API 错误模式训练的 LLM，提前 10–15 分钟预测了 89% 的故障。预测到 2026 年底，95% 的企业 LLM 将具备自动故障转移。

**Type:** Learn
**Languages:** Python（标准库，简化的多智能体事件初步诊断模拟器）
**Prerequisites:** 阶段 17 · 13（可观测性），阶段 17 · 24（混沌工程）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 绘制多智能体 AI SRE 架构：监督智能体、日志/指标/运行手册专用智能体，以及人工审批门禁。
- 解释为什么自动修复应局限于重启 Pod、恢复部署，而不是广泛重构服务架构。
- 指出 NeuBird Hawkeye 的对抗式评估模式：两个模型一致则提高置信度，不一致则升级处理。
- 引用 MIT 提前检测 89% 故障的结果，并说明运维约束：没有后续行动的预测只是仪表盘。

## 问题（The Problem）

值班工程师凌晨 3 点收到告警：“结账服务错误率高。”他查看 Datadog、Loki、三份运行手册和部署日志。30 分钟后，才发现根因是 KV 缓存激增导致 vLLM 内存不足（OOM）。重启 Pod 后，错误消失。

在 2026 年，调查的前 20 分钟可以自动化。按服务整理日志、关联近期部署、匹配运行手册，都可以用 RAG 加工具调用完成。受监督的智能体能先做初步诊断，在工程师打开 Datadog 前提出假设。

完全自主修复是另一个问题。重启 Pod：安全。扩大 GPU 池：策略允许时安全。重新设计服务架构：绝对不行。关键是明确划出狭窄的权限边界。

## 概念（The Concept）

### 多智能体架构（Multi-agent architecture）

```
             事件
              │
              ▼
          监督智能体
         /    |    \
        ▼     ▼     ▼
   日志智能体 指标智能体 运行手册智能体
        │     │     │
        └─────┴─────┘
              │
              ▼
          假设与证据
              │
              ▼
           人工审批
              │
              ▼
        行动（有限集合）
```

监督智能体将事件拆为子查询。专用智能体可访问日志搜索、PromQL、文档检索等工具。监督智能体综合结果，将假设和证据呈现给人工。人工批准或调整调查方向。

### 自动修复范围（Auto-remediation scope）

**安全的有限操作**：重启 Pod、恢复指定部署、在预批准范围内扩缩资源池、启用预批准的功能开关。

**不安全的广泛操作**：改变服务拓扑、修改资源限制、部署新代码、修改 IAM、变更数据库。

宣称“设置后就不用管”的说法夸大了能力。随着 AI SRE 成熟，安全操作集合会扩大，但边界确实存在。

### 对抗式评估（Adversarial evaluation，NeuBird Hawkeye）

两个模型独立分析同一事件。如果根因判断一致，置信度较高；如果不一致，则向人工升级，同时展示两种假设。这种模式简单，却能有效过滤虚构的根因。

### 运维记忆（Operational memory）

团队流动会在不易察觉的情况下削弱传统 SRE，因为经验知识随人员离开。AI SRE 将运行手册和事后复盘存入向量数据库，每次新事件发生时由智能体检索。新工程师加入时，AI 仍持有完整历史。

### 事前事件预测（Pre-incident prediction）

MIT 2025 年研究：以历史日志、GPU 温度、API 错误模式训练的 LLM，在测试集上提前 10–15 分钟预测了 89% 的故障。

现实检查：没有行动的预测只是仪表盘。运维问题是“预测到故障后，我们做什么？”提前排空流量、呼叫值班人员，还是自动扩容？答案取决于具体策略。

### 2026 年的产品（Products in 2026）

- **Datadog Bits AI**：Datadog 内的托管 SRE 助手。
- **Azure SRE Agent**：Azure 原生。
- **NeuBird Hawkeye**：对抗式评估与运维记忆。
- **PagerDuty AIOps**：初步诊断与去重。
- **Incident.io Autopilot**：事件指挥与协调。

### 运行手册即代码（Runbooks as code）

运行手册正从 Confluence 页面演进为版本化 Markdown，使用症状、假设、验证、行动等结构化章节。结构化运行手册能改善 RAG 检索。任何 AI SRE 推进都应先将非结构化运行手册改为结构化形式。

### 应记住的数字（Numbers you should remember）

- MIT 提前检测：89% 的故障，提前 10–15 分钟。
- 多智能体初步诊断：监督智能体 + 日志/指标/运行手册智能体 + 人工。
- 安全自动修复集合：重启 Pod、恢复部署、在边界内扩缩。
- 对抗式评估：两个模型独立分析，一致则提高置信度。

```figure
i4-incident-agents
```

## 动手使用（Use It）

`code/main.py` 模拟多智能体初步诊断：日志智能体发现错误，指标智能体发现 CPU 激增，运行手册智能体匹配已知问题。监督智能体对假设排序。

## 交付成果（Ship It）

本课产出 `outputs/skill-ai-sre-plan.md`。它根据当前值班安排、事件数量和团队成熟度，设计 AI SRE 推进方案。

## 练习（Exercises）

1. 运行 `code/main.py`。如果日志与指标智能体意见不同，监督智能体如何解决？
2. 为你的服务定义三种“安全”的自动修复动作，并逐一说明理由。
3. 编写结构化运行手册模板，包含章节、必填字段和验证命令。
4. 预测检测提前 12 分钟触发。你的策略是什么：呼叫值班人员、提前排空，还是两者都做？
5. 论证三人团队应在 2026 年采用 AI SRE，还是等待。考虑成熟度、事件数量和风险。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| AI SRE | “值班智能体” | 由 LLM 支持的事件调查与协调 |
| 监督智能体（Supervisor agent） | “编排器” | 将事件拆为子查询的顶层智能体 |
| 专用智能体（Specialized agent） | “领域智能体” | 可访问日志、指标、运行手册工具的子智能体 |
| 自动修复（Auto-remediation） | “AI 来修” | 有限的预批准动作，不是广泛重构架构 |
| 运维记忆（Operational memory） | “向量化运行手册” | 向量数据库中的复盘与运行手册，供 RAG 使用 |
| 对抗式评估（Adversarial eval） | “双模型检查” | 独立分析，一致则提高置信度 |
| NeuBird Hawkeye | “对抗式的那个” | 采用对抗式评估与记忆模式的产品 |
| Bits AI | “Datadog 的 SRE 智能体” | Datadog 托管的 AI SRE |
| 事前事件预测（Pre-incident prediction） | “提前检测” | 提前 10–15 分钟预测故障 |

## 延伸阅读（Further Reading）

- [incident.io：2026 年 AI SRE 完整指南](https://incident.io/blog/what-is-ai-sre-complete-guide-2026)
- [InfoQ：以人为中心的 SRE AI](https://www.infoq.com/news/2026/01/opsworker-ai-sre/)
- [DZone：2026 年 SRE 中的 AI](https://dzone.com/articles/ai-in-sre-whats-actually-coming-in-2026)
- [Datadog Bits AI 产品页](https://www.datadoghq.com/product/bits-ai/)
- [NeuBird Hawkeye 产品页](https://www.neubird.ai/)
- [awesome-ai-sre 资源列表](https://github.com/agamm/awesome-ai-sre)
