# Kubernetes GPU 自动扩缩容（GPU Autoscaling on Kubernetes）：Karpenter、KAI Scheduler 与成组调度

> 自动扩缩容有三层，而不是一层。Karpenter 动态创建节点，耗时不到一分钟，比 Cluster Autoscaler 快 40%。KAI Scheduler 负责成组调度（Gang scheduling）、拓扑感知（Topology awareness）和分层队列（Hierarchical queues），防止“8 缺 1”的部分分配陷阱：七个节点等待缺失的一块 GPU，却持续产生费用。应用层扩缩容器（NVIDIA Dynamo Planner、llm-d Workload Variant Autoscaler）依据队列深度、KV 缓存利用率等推理信号扩缩容，而非 CPU 或 DCGM 占空比。典型 HPA 陷阱在于 `DCGM_FI_DEV_GPU_UTIL` 测量的是占空比：100% 既可能对应 10 个请求，也可能对应 100 个。vLLM 预分配 KV 缓存显存，因此显存用量永远不会触发缩容。本课教你组合这三层，并避免默认 Karpenter `WhenEmptyOrUnderutilized` 策略在推理途中终止 GPU 作业。

**Type:** Learn
**Languages:** Python (标准库，队列深度扩缩容器的简化模拟器)
**Prerequisites:** 阶段 17 · 02（推理平台经济性，Inference Platform Economics）、阶段 17 · 04（服务引擎内部机制，Serving Engine Internals）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 绘制扩缩容三层结构（节点创建、成组调度、应用层），指明各层工具。
- 解释为何 `DCGM_FI_DEV_GPU_UTIL` 不适合作为 vLLM 的 HPA 信号，并说出两个替代信号：队列深度和 KV 缓存利用率。
- 描述成组调度，以及 KAI Scheduler 防止的部分分配故障：8 块 GPU 中有 7 块空等。
- 指明会终止运行中 GPU 作业的 Karpenter 整合策略（`WhenEmptyOrUnderutilized`），并说明 2026 年的安全替代设置。

## 问题背景（The Problem）

团队在 Kubernetes 上交付了 LLM 服务，配置 HPA 以 `DCGM_FI_DEV_GPU_UTIL` 为信号。工作时段利用率一直为 100%，HPA 从不扩容，因为它已经认为资源满载。你手动增加副本后，TTFT 下降，HPA 却仍不扩容。这个信号在误导你。

另一个问题是节点使用 Cluster Autoscaler。凌晨 2 点收到一个 1M 词元提示词，集群花 3 分钟创建节点，请求因此超时。

还有一个问题：你部署需要跨 2 个节点使用 8 块 GPU 的 70B 模型。集群有 7 块空闲 GPU，另 1 块的资源分散在 3 个节点上。Cluster Autoscaler 为缺少的 1 块 GPU 创建节点。Kubernetes 启动最后一块 GPU 时，七个节点等待 4 分钟，持续花钱。

三层对应三种故障模式。2026 年的 GPU 感知扩缩容不是“打开 HPA”，而是组合节点创建、成组调度和基于应用信号的扩缩容。

## 核心概念（The Concept）

### 第 1 层：节点创建（Layer 1 — node provisioning，Karpenter）

Karpenter 监视等待中的 Pod，在约 45-60 秒内创建节点；Cluster Autoscaler 创建 GPU 节点通常需要 90-120 秒。它依据 `NodePool` 约束动态选择实例类型。如果 Pod 需要 8 块 H100，而集群没有匹配节点，Karpenter 会直接创建一个，而不是扩展现有节点组。

**整合陷阱（The consolidation trap）**：Karpenter 默认的 `consolidationPolicy: WhenEmptyOrUnderutilized` 对 GPU 池很危险。它会终止运行中的 GPU 节点，将 Pod 迁到更便宜、规格更合适的实例。对推理工作负载而言，这意味着驱逐运行中的请求，并在新节点重新加载 70B 模型，损失数分钟容量并导致请求失败。

GPU 池的安全设置：

```yaml
disruption:
  consolidationPolicy: WhenEmpty
  consolidateAfter: 1h
```

它允许 Karpenter 在一小时后整合真正空闲的节点，但不会驱逐运行中的作业。

### 第 2 层：成组调度（Layer 2 — gang scheduling，KAI Scheduler）

KAI Scheduler（最初名为“Karp”，后更名）处理默认 kube-scheduler 不具备的能力：

**成组调度（Gang scheduling）**：要么全部调度，要么全部不调度。需要 8 块 GPU 的分布式推理 Pod，要么 8 块一起启动，要么都不启动。否则就会出现部分分配陷阱：8 个 Pod 中 7 个启动，无限等待并持续花钱。

**拓扑感知（Topology awareness）**：识别哪些 GPU 共用 NVLink，哪些在同一机架，哪些之间通过 InfiniBand 连接，据此放置 Pod。DeepSeek-V3 67B 张量并行工作负载必须保持在同一 NVLink 域，KAI Scheduler 会遵守这一要求。

**分层队列（Hierarchical queues）**：多个团队按优先级与配额竞争同一 GPU 池。只有优先级规则允许时，团队 B 的训练作业才能抢占团队 A 紧张的生产资源。

KAI 作为辅助调度器与 kube-scheduler 并列部署，通过工作负载注解选择使用它。Ray 与 vLLM production-stack 都提供集成。

### 第 3 层：应用级信号（Layer 3 — application-level signals）

**HPA 陷阱（The HPA trap）**：`DCGM_FI_DEV_GPU_UTIL` 是占空比指标，测量每个采样间隔 GPU 是否在工作。100% 利用率既可能意味着 10 个并发请求，也可能意味着 100 个；两种情况下 GPU 都忙。根据占空比扩缩容无异于盲目决策。

更糟的是，vLLM 等引擎会预分配 KV 缓存显存，上限由 `--gpu-memory-utilization` 决定。即使只有一个请求，显存占用也保持在约 90%，基于显存的 HPA 永远不会缩容。

**2026 年的替代信号（2026 replacement signals）**：

- 队列深度（Queue depth）：等待预填充（Prefill）的请求数。
- KV 缓存利用率（KV cache utilization）：分配给活跃序列的块占比。
- 每副本 P99 TTFT：对应你的 SLA 信号。
- 有效吞吐量（Goodput）：每秒满足全部服务等级目标（SLO）的请求数。

NVIDIA Dynamo Planner 和 llm-d Workload Variant Autoscaler 使用这些信号扩缩副本，在 LLM 服务中完全替代 HPA。

### 何时使用哪种工具（When to use what）

| 扩缩容决策 | 工具 |
|----------------|------|
| 增删节点 | Karpenter |
| 调度多 GPU 作业 | KAI Scheduler |
| 增删副本 | Dynamo Planner / llm-d WVA，或基于队列深度的自定义 HPA |
| 选择 GPU 类型 | Karpenter NodePool |
| 抢占低优先级资源 | KAI Scheduler 队列 |

### 预填充与解码分离会增加复杂度（Disaggregated prefill/decode complicates everything）

如果采用预填充与解码分离（阶段 17 · 17），就会有两类 Pod 和不同触发信号：预填充 Pod 根据队列深度扩缩容，解码 Pod 根据 KV 缓存压力扩缩容。llm-d 将它们暴露为独立的 `Services`，按角色配置 HPA。不要尝试用同一个 HPA 管理两者。

### 冷启动在这里同样重要（Cold start matters here too）

节点创建耗时会在冷启动缓解（阶段 17 · 10）中变成用户可感知的延迟。Karpenter 需要 45-60 秒预热，再加上加载 20GB 模型和初始化引擎，从零启动的请求需要 2-5 分钟。对 SLO 关键路径保留预热池（`min_workers=1`），或在应用层使用类似 Modal 的检查点机制（Checkpointing）。

### 应记住的数值（Numbers you should remember）

- GPU 节点创建：Karpenter 约 45-60s，Cluster Autoscaler 约 90-120s。
- KAI Scheduler 防止部分分配浪费，即“8 缺 1”陷阱。
- `DCGM_FI_DEV_GPU_UTIL` 不适合作为 HPA 信号，应使用队列深度或 KV 利用率。
- Karpenter `WhenEmptyOrUnderutilized` 会终止运行中的 GPU 作业。推理应使用 `WhenEmpty + consolidateAfter: 1h`。

```figure
autoscaling
```

## 实际应用（Use It）

`code/main.py` 在突发 GPU 工作负载上模拟三层扩缩容器，比较朴素 HPA（占空比）、队列深度 HPA 和 KAI 成组调度扩缩容，报告未满足的请求数、空闲 GPU 分钟数和综合得分。

## 交付成果（Ship It）

本课产出 `outputs/skill-gpu-autoscaler-plan.md`。根据集群拓扑、工作负载形态和 SLO，设计三层自动扩缩容方案。

## 练习（Exercises）

1. 运行 `code/main.py`。突发负载下，朴素占空比 HPA 丢弃、而队列深度 HPA 能处理的请求有多少？差异从何而来？
2. 为在 H100 SXM5 上运行 Llama 3.3 70B FP8 的集群设计 Karpenter NodePool。指定 `capacity-type`、`disruption.consolidationPolicy`、`consolidateAfter`，以及防止非 GPU 工作负载进入这些节点的污点（Taint）。
3. 团队报告部署卡在 Pending，因为“有 GPU 可用，但 Pod 无法调度”。诊断问题属于 Karpenter、kube-scheduler 还是 KAI Scheduler；哪些指标能确认？
4. 为分离部署的预填充 Pod 和解码 Pod 分别选择不同的扩缩容信号，并论证。
5. 一个 24x7 生产服务平均每天出现 60 次丢请求事件，P99 TTFT > 10s。计算 `WhenEmptyOrUnderutilized` 整合陷阱带来的成本。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| Karpenter | “节点创建器” | Kubernetes 节点扩缩容器，创建耗时不到一分钟 |
| Cluster Autoscaler | “旧扩缩容器” | 较早的 Kubernetes 节点扩缩容器，按组扩容且较慢 |
| KAI Scheduler | “GPU 调度器” | 提供成组调度、拓扑和队列的辅助调度器 |
| 成组调度（Gang scheduling） | “全有或全无” | 原子调度 N 个 Pod，或全部延后 |
| 拓扑感知（Topology awareness） | “机架感知” | 依据 NVLink、IB 和机架位置放置 Pod |
| `DCGM_FI_DEV_GPU_UTIL` | “GPU 利用率” | 占空比指标，不适合作为 LLM 扩缩容信号 |
| 队列深度（Queue depth） | “等待的请求” | 预填充受限扩缩容的正确 HPA 信号 |
| KV 缓存利用率（KV cache utilization） | “显存压力” | 解码受限扩缩容的正确 HPA 信号 |
| 节点整合（Consolidation） | “Karpenter 整合” | 终止节点，迁往更便宜的实例类型 |
| `WhenEmpty + 1h` | “安全整合” | 不驱逐运行中 GPU 作业的策略 |

## 延伸阅读（Further Reading）

- [KAI Scheduler GitHub 仓库](https://github.com/kai-scheduler/KAI-Scheduler)：设计文档和配置示例。
- [Karpenter 中断控制](https://karpenter.sh/docs/concepts/disruption/)：整合策略语义和 GPU 安全默认配置。
- [NVIDIA：Kubernetes 上的分离式 LLM 推理](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)：Dynamo Planner 扩缩容信号。
- [Ray 文档：RayClusters 的 KAI Scheduler](https://docs.ray.io/en/latest/cluster/kubernetes/k8s-ecosystem/kai-scheduler.html)：Ray 集成模式。
- [AWS EKS 计算与扩缩容最佳实践](https://docs.aws.amazon.com/eks/latest/best-practices/aiml-compute.html)：托管 Kubernetes 专项指南。
- [llm-d GitHub 仓库](https://github.com/llm-d/llm-d)：Workload Variant Autoscaler 设计。
