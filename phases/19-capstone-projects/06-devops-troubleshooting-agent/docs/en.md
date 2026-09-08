# 综合实践 06：Kubernetes 运维故障排查智能体（DevOps Troubleshooting Agent for Kubernetes）

> AWS 的 DevOps Agent 已正式发布（General Availability，GA），Resolve AI 发布了 K8s 操作手册，NeuBird 演示了语义监控（Semantic Monitoring），Metoro 将 AI 站点可靠性工程（Site Reliability Engineering，SRE）与逐服务的服务等级目标（Service-Level Objective，SLO）关联起来。生产形态已经确定：告警触发网络回调（Webhook），智能体读取遥测（Telemetry），遍历 K8s 对象图，对根因假设排序，并向 Slack 发布带审批按钮的简报。默认只读，每项修复都需人工批准。本综合实践构建这一智能体，在 20 个合成故障上评估，并在三个相同案例上与 AWS 的 Agent 对比。

**Type:** Capstone
**Languages:** Python（智能体）, TypeScript（Slack 集成）
**Prerequisites:** 阶段 11（大语言模型工程）、阶段 13（工具与 MCP）、阶段 14（智能体）、阶段 15（自主系统）、阶段 17（基础设施）、阶段 18（安全）
**涉及阶段（Phases exercised）:** P11 · P13 · P14 · P15 · P17 · P18
**Time:** 30 小时

## 问题（Problem）

2025 至 2026 年的 SRE 主张变为：“AI 智能体分诊故障，人工批准修复。”AWS DevOps Agent、Resolve AI、NeuBird、Metoro 和 PagerDuty AIOps 都在生产中采用这一形态。智能体读取 Prometheus 指标、Loki 日志、Tempo 轨迹、kube-state-metrics，以及 K8s 对象知识图谱（Knowledge Graph），在五分钟以内生成带有遥测引用的根因假设排名。未经 Slack 上明确的人工批准，它绝不执行破坏性命令。

大多数难点在于范围界定和安全，而非推理过程（Reasoning）。智能体需要默认只读的基于角色的访问控制（Role-Based Access Control，RBAC）权限面、加固的模型上下文协议（Model Context Protocol，MCP）工具服务器，以及记录每条已考虑与已执行命令的审计日志（Audit Log）。它必须知道何时超出自身能力并升级处理。运行还必须足够便宜，避免内存不足终止（OOM-Kill）的级联故障产生 5000 美元智能体账单。

## 概念（Concept）

智能体在知识图谱上工作。节点包括 K8s 对象（Pod、Deployment、Service、Node、HPA、PVC）和遥测来源（Prometheus 序列、Loki 流、Tempo 轨迹）。边编码所属关系（Pod -> ReplicaSet -> Deployment）、调度关系（Pod -> Node）以及观测关系（Pod -> Prometheus 序列）。图谱通过 kube-state-metrics 同步保持最新，并在每次告警时重新采样。

告警触发时，智能体从受影响对象出发分析根因。它遍历边，拉取相关遥测切片（最近 15 分钟），并起草假设。假设按证据排序：有多少遥测引用支持、证据有多新、具体到什么程度。排名前三的假设发送到 Slack，附图路径可视化和修复操作审批按钮。

修复（Remediation）受到审批关卡约束。默认允许的操作均为只读。破坏性操作（缩容、回滚、删除 Pod）需要 Slack 审批；ArgoCD 回滚钩子需要智能体从不持有的认证令牌（Auth Token）。审计日志记录智能体*考虑过*的每条命令，而不仅是执行过的命令，使审查过程能够发现险些发生的事故（Near-Miss）。

## 架构（Architecture）

```
PagerDuty / Alertmanager 网络回调（Webhook）
           |
           v
     FastAPI 接收器（Receiver）
           |
           v
   LangGraph 根因分析智能体（Root-Cause Agent）
           |
           +---- 只读 MCP 工具 ----------+
           |                             |
           v                             v
   K8s 知识图谱                     遥测切片
     (Neo4j / kuzu)              Prometheus, Loki, Tempo
   所属关系 + 调度关系             最近 15 分钟，限定范围
           |
           v
   假设排序（Hypothesis Ranking；证据权重）
           |
           v
   Slack 简报 + 审批按钮
           |
           v（已批准）
   ArgoCD 回滚钩子 / PagerDuty 升级处理
           |
           v
   审计日志：逐条命令记录已考虑与已执行情况
```

## 技术栈（Stack）

- 可观测性（Observability）来源：Prometheus、Loki、Tempo、kube-state-metrics
- 知识图谱：Neo4j（托管）或 kuzu（嵌入式），包含 K8s 对象与遥测边
- 智能体：LangGraph，逐工具设置允许列表（Allow-List），默认只读
- 工具传输：通过 StreamableHTTP 使用 FastMCP；破坏性工具放在审批关卡后的独立服务器
- 模型：Claude Sonnet 4.7 进行根因推理，Gemini 2.5 Flash 汇总日志
- 修复：ArgoCD 回滚网络回调、PagerDuty 升级处理、Slack 审批卡片
- 审计：仅追加（Append-Only）的结构化日志（考虑、执行、批准、结果）
- 部署：K8s 部署，使用独立命名空间和专属的窄范围 RBAC 角色

```figure
ce-rootcause-walk
```

## 动手实现（Build It）

1. **图谱摄取（Graph Ingestion）。** 每 30 秒将 kube-state-metrics 同步到 Neo4j/kuzu。节点：Pod、Deployment、Node、Service、PVC、HPA。边：OWNED_BY、SCHEDULED_ON、EXPOSES、MOUNTS、SCALES。遥测叠加边：OBSERVED_BY（Pod 由 Prometheus 序列观测）。

2. **告警接收器（Alert Receiver）。** 构建接收 PagerDuty 或 Alertmanager 网络回调的 FastAPI 端点。提取受影响对象及 SLO 违约情况。

3. **只读工具权限面（Read-Only Tool Surface）。** 通过 FastMCP 封装 kubectl、Prometheus 查询、Loki logql 和 Tempo traceql。每个工具仅具有受限 RBAC 动作（“get”“list”“describe”）。默认服务器不包含“delete”“exec”“scale”。

4. **根因分析智能体（Root-Cause Agent）。** LangGraph 包含三个节点：`sample` 拉取最近 15 分钟遥测切片，`walk` 查询图中的相邻对象，`hypothesize` 起草带遥测引用的根因候选项排名。

5. **证据评分（Evidence Scoring）。** 每个假设的评分 = 时新性 * 具体性 * 图路径长度的倒数 * 引用数量。返回前三项。

6. **Slack 简报（Slack Brief）。** 发布包含假设、图路径可视化（服务器端渲染的子图图像）和审批按钮的附件，最多针对一项修复操作。

7. **修复审批关卡（Remediation Gate）。** 破坏性工具（缩容、回滚、删除）位于第二个 MCP 服务器，受审批令牌保护。只有人工批准 Slack 卡片后，智能体才能调用。

8. **审计日志（Audit Log）。** 使用仅追加的 JSONL：对每条候选命令记录是否考虑过、是否执行过以及由谁批准。每日发送至 S3。

9. **合成故障套件（Synthetic Incident Suite）。** 构建 20 种场景：OOMKill 级联、DNS 抖动、HPA 震荡、PVC 占满、吵闹邻居（Noisy Neighbor）、故障边车（Sidecar）、错误 ConfigMap 发布、证书轮换、镜像拉取退避等。按根因准确率及假设生成耗时为智能体评分。

## 实际应用（Use It）

```
webhook: alert.pagerduty.com -> checkout-api SLO breach, error rate 14%
[graph]   affected: Deployment checkout-api (3 Pods, Node ip-10-2-3-4)
[walk]    neighbors: ReplicaSet checkout-api-abc, Service checkout-api,
           recent rollout 14m ago
[sample]  prometheus error_rate 14%, up-trend; loki 500s on /api/v2/pay
[hypo]    #1 bad rollout: latest image checkout-api:v2.41 fails /healthz
          citations: deploy.yaml (rev 42), prometheus errorRate, loki 500 stack
[slack]   [ROLL BACK to v2.40]  [ESCALATE]  [IGNORE]
          (approval required; agent does not roll back unilaterally)
```

## 交付成果（Ship It）

`outputs/skill-devops-agent.md` 是交付物（Artifact）。给定 K8s 集群与告警来源，智能体生成根因假设排名及受 Slack 审批控制的修复流程。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 场景套件上的根因分析（Root Cause Analysis，RCA）准确率 | 在 20 个合成故障中，根因正确率 ≥80% |
| 20 | 安全 | 审计日志中没有 Slack 批准时，破坏性操作防护绝不放行 |
| 20 | 假设生成耗时（Time-to-Hypothesis） | 从告警到 Slack 简报的 p50 小于 5 分钟 |
| 20 | 可解释性（Explainability） | 每个假设都附图路径和遥测引用 |
| 15 | 集成完整性 | PagerDuty、Slack、ArgoCD、Prometheus 端到端可用 |
| **100** | | |

## 练习（Exercises）

1. 在 AWS DevOps Agent 演示使用的相同三个故障上运行你的智能体。发布并排对比，报告智能体表现不同之处。

2. 增加“险些出事”审计，标记智能体*考虑过*、未经审批便会造成破坏的命令。测量一周内的险情发生率。

3. 将假设生成模型从 Claude Sonnet 4.7 更换为自托管 Llama 3.3 70B。测量 RCA 准确率变化及每次故障的美元成本。

4. 构建因果过滤器（Causal Filter）：区分相关的遥测尖峰与真正根因。用 20 个场景的标签训练小型分类器。

5. 增加回滚试运行（Dry-Run）：对具有相同清单的预发布集群执行 ArgoCD 回滚。在提供 Slack 审批按钮前，在实际集群中验证回滚计划。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| K8s 知识图谱（K8s Knowledge Graph） | “集群图” | 节点 = K8s 对象 + 遥测序列；边 = 所属、调度、观测关系 |
| 默认只读（Read-Only-by-Default） | “限定范围的 RBAC” | 智能体服务账户只有 get/list/describe 动作；破坏性动作位于审批后的独立服务器 |
| 审计日志（Audit Log） | “考虑过与执行过” | 仅追加地记录每条候选命令、是否运行及批准人 |
| 假设排序（Hypothesis Ranking） | “证据评分” | 时新性 × 具体性 × 图路径长度倒数 × 引用数量 |
| Slack 审批卡片（Slack Approval Card） | “人在回路（HITL）关卡” | 带修复按钮的交互式 Slack 消息；人工点击前智能体不能继续 |
| 遥测引用（Telemetry Citation） | “证据指针” | 支持某项论断的 Prometheus 查询、Loki 选择器或 Tempo 轨迹 URL |
| 平均修复时间（Mean Time to Repair，MTTR） | “解决耗时” | 从告警触发到 SLO 恢复的实际经过时间 |

## 延伸阅读（Further Reading）

- [AWS DevOps Agent 正式发布（GA）](https://aws.amazon.com/blogs/aws/aws-devops-agent-helps-you-accelerate-incident-response-and-improve-system-reliability-preview/)：2026 年的典型参考
- [Resolve AI K8s 故障排查](https://resolve.ai/blog/kubernetes-troubleshooting-in-resolve-ai)：竞品参考
- [NeuBird 语义监控](https://www.neubird.ai)：语义图方法
- [Metoro AI 站点可靠性工程（SRE）](https://metoro.io)：SLO 优先的生产实践思路
- [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)：集群状态来源
- [LangGraph](https://langchain-ai.github.io/langgraph/)：参考智能体编排器
- [FastMCP](https://github.com/jlowin/fastmcp)：Python MCP 服务器框架
- [ArgoCD 回滚](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/)：审批控制的修复目标
