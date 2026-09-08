---
name: gpu-autoscaler-plan
description: 为基于 Kubernetes 的 LLM 服务集群设计三层 GPU 自动扩缩容方案（Karpenter + KAI Scheduler + 应用信号），诊断 DCGM_FI_DEV_GPU_UTIL 陷阱和部分分配故障。
version: 1.0.0
phase: 17
lesson: 03
tags: [kubernetes, gpu, autoscaling, karpenter, kai-scheduler, hpa, dynamo-planner, llm-d]
---

根据集群拓扑（节点、GPU 类型、NVLink 域）、工作负载形态（TP/PP 配置、平均并发、突发系数）和 SLO（TTFT P99、有效吞吐量），制定三层扩缩容方案。

请输出：

1. 第 1 层：Karpenter NodePool。指定 `instance-type`、`capacity-type`（on-demand / spot / reserved）、`consolidationPolicy`（GPU 池必须为 `WhenEmpty`，搭配 `consolidateAfter: 1h`）、排除非 GPU 工作负载的污点，以及供 KAI Scheduler 选择的标签。
2. 第 2 层：KAI Scheduler 策略。说明是否需要成组调度（Gang scheduling）：TP/PP > 1 时需要。定义拓扑约束（NVLink 域、机架、可用区），指定生产与训练租户的队列层级和抢占规则。
3. 第 3 层：应用扩缩容器。选择信号：预填充受限使用队列深度，解码受限使用 KV 缓存利用率，混合负载使用综合有效吞吐量（Goodput）。禁止使用 `DCGM_FI_DEV_GPU_UTIL`，并解释原因。
4. 分离部署。如果使用阶段 17 · 17 的预填充与解码分离，分别配置 HPA：预填充池使用队列深度，解码池使用 KV 利用率。
5. 预热池规模。根据 P99 TTFT 约束和观测到的冷启动耗时（节点创建加模型加载），为 SLO 关键路径指定最少就绪副本数。
6. 监控。仪表盘指标包括每副本队列深度、每副本 KV 利用率、节点创建等待时间、成组调度延后次数、Karpenter 整合事件。

硬性否决条件：
- 推荐基于 `DCGM_FI_DEV_GPU_UTIL` 的 HPA。拒绝，并指明队列深度与 KV 利用率才是正确的信号。
- 为 GPU 池保留 `consolidationPolicy: WhenEmptyOrUnderutilized`。拒绝，并指出驱逐运行中作业的风险。
- 对 TP/PP 工作负载忽略成组调度。拒绝，部分分配是一种持续烧钱的反模式。

拒绝规则：
- 如果集群只有一种 GPU 和一个节点，不建议 Karpenter；客户首先需要托管无服务器平台（阶段 17 · 02）。
- 如果运维人员要求“根据 GPU 显存扩缩容”，拒绝：vLLM 按 `--gpu-memory-utilization` 预分配显存，即使只有一个请求，占用仍接近 90%。
- 如果 TP-8 工作负载以复杂性为由拒绝成组调度，不认可该方案：将单个 Pod 放到 8 块分散 GPU 上会整体失败。

输出：一页方案，包含 Karpenter YAML 片段、KAI Scheduler 配置片段、HPA 或自定义扩缩容器的信号选择、预热池数量和五个仪表盘指标。最后给出一个紧急停止条件：P99 TTFT 越界时，回滚到上一个已知扩缩容器状态。
