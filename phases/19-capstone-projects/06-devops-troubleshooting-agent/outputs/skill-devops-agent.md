---
name: devops-agent
description: 构建 Kubernetes 故障排查智能体（Troubleshooting Agent），遍历集群知识图谱（Knowledge Graph）、对根因排序，并通过 Slack 审批每项修复。
version: 1.0.0
phase: 19
lesson: 06
tags: [capstone, devops, sre, kubernetes, langgraph, fastmcp, aiops]
---

给定 K8s 集群与告警来源（PagerDuty 或 Alertmanager），构建智能体，在五分钟以内产生根因假设排名，并通过 Slack 审批卡片控制每项修复。

构建计划（Build Plan）：

1. 每 30 秒将 kube-state-metrics 摄取到 Neo4j 或 kuzu。构建由 Pod、Deployment、Service、Node、PVC、HPA 组成的图谱，并添加通向 Prometheus、Loki 和 Tempo 来源的遥测叠加边。
2. 搭建接收 PagerDuty 和 Alertmanager 网络回调（Webhook）的 FastAPI 接收器。
3. 通过采用 StreamableHTTP 传输的 FastMCP 暴露只读工具：kubectl get/describe、promql、logql、traceql。
4. 构建含三个节点的 LangGraph 根因分析智能体：`sample`（拉取 15 分钟遥测）、`walk`（遍历相邻图节点）、`hypothesize`（按时新性 × 具体性 × 引用数量排序候选项）。
5. 将排名前三的假设与图路径可视化发布到 Slack，附审批按钮。
6. 将破坏性工具（scale、rollback、delete）放在独立 FastMCP 服务器上，受审批令牌保护；智能体只有在 Slack 签批后才能获得该令牌。
7. 维护仅追加（Append-Only）的审计日志：每条*考虑过*的命令、是否批准、是否执行、由谁批准。
8. 构建 20 种合成故障场景（OOMKill、DNS 抖动、HPA 震荡、PVC 占满、吵闹邻居（Noisy Neighbor）、故障边车（Sidecar）、ConfigMap 错误发布、证书轮换、镜像拉取退避、探针失败，另加 10 种）。按根因分析（Root Cause Analysis，RCA）准确率和假设生成耗时评分。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 场景套件上的 RCA 准确率 | 在 20 个合成故障中根因正确率至少 80% |
| 20 | 安全 | 审计日志中没有 Slack 批准时，破坏性操作防护绝不放行 |
| 20 | 假设生成耗时（Time-to-Hypothesis） | 从告警到 Slack 简报的 p50 小于 5 分钟 |
| 20 | 可解释性（Explainability） | 每个假设都附图路径和遥测引用 |
| 15 | 集成完整性 | PagerDuty、Slack、ArgoCD、Prometheus 端到端可用 |

直接判定不合格的情况（Hard Rejects）：

- 智能体在单个 MCP 服务器中混用只读工具与破坏性工具。
- 任何没有遥测引用的 RCA。必须拒绝无引用的假设。
- 审计日志只记录执行情况。必须记录每条考虑过的命令。
- 未带随机种子在 20 场景套件上运行智能体，就声称准确率。

拒绝规则（Refusal Rules）：

- 未获人工值班人员在 Slack 上批准，拒绝修复，即使假设显而易见。
- 拒绝通过只读 MCP 暴露 `kubectl exec`、`kubectl port-forward` 或任何交互式工具。这些工具的实际效果具有破坏性。
- 没有逐部署审批卡片时，拒绝跨多个部署批量应用修复。

输出：一个仓库，包含 FastAPI 接收器、LangGraph 智能体、只读与破坏性 MCP 服务器、Slack 集成、20 场景测试套件、针对三个相同故障与 AWS DevOps Agent 的并排比较，以及一周观察窗口内险情命令的报告（智能体*考虑过*但未执行的命令）。
