# 无服务器 LLM 的冷启动缓解（Cold Start Mitigation for Serverless LLMs）

> 一个 20 GB 模型镜像，从冷状态到提供服务，7B 需要 5-10 分钟，70B 需要 20 多分钟。真正的无服务器（Serverless）场景中，这不是预热，而是服务中断。缓解措施作用于五层：预置节点镜像（AWS Bottlerocket 双卷架构）、模型流式加载（NVIDIA Run:ai Model Streamer，vLLM 原生集成）、GPU 显存快照（Modal 检查点，重启最多快 10 倍）、预热池（`min_workers=1`）、分层加载（ServerlessLLM 的 NVMe→DRAM→HBM 流水线，延迟降低 10-200 倍），以及传输输入词元（KB）而非 KV 缓存（GB）的在线迁移。Modal 公布的冷启动下限为 2-4s，Baseten 默认 5-10s，预热后低于一秒。本课教你测量、规划预算并叠加这五层。

**Type:** Learn
**Languages:** Python (标准库，简化冷启动路径模拟器)
**Prerequisites:** 阶段 17 · 02（推理平台经济性，Inference Platform Economics）、阶段 17 · 03（GPU 自动扩缩容，GPU Autoscaling）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 列出冷启动缓解的五层，并为每层说出一个工具或模式。
- 对 70B 模型，按节点创建、权重下载、权重载入 HBM、引擎初始化之和计算总冷启动时间。
- 解释在线迁移为何传输输入词元（KB）而非 KV 缓存（GB），以及代价是重新计算。
- 说明预热池权衡：为空闲 GPU 付费，或接受冷启动尾延迟；指出必须设置 `min_workers > 0` 的 SLA 阈值。

## 问题背景（The Problem）

无服务器 LLM 端点夜间缩容到零，早晨 8 点流量突增。第一个请求等待以下过程：

1. Karpenter 创建 GPU 节点：45-60s。
2. 容器拉取带权重的 30 GB 镜像：120-300s。
3. 引擎将权重载入 HBM：45-120s，取决于模型大小和存储速度。
4. vLLM 或 TRT-LLM 初始化 CUDA 图、KV 缓存池、分词器：10-30s。

总计 220-510s，约 3-8 分钟，才返回一个词元，而 SLA 是 2s。部署预热池（`min_workers=1`）后，问题似乎消失，但你现在要全天候为一块空闲 GPU 付费。5 个产品各留一个预热副本，就算无人调用，每月也要付 5 × 24 × 30 = 3,600 GPU 小时。

冷启动缓解的目标是保留无服务器经济性，同时接近常开服务的延迟。

## 核心概念（The Concept）

### 第 1 层：预置节点镜像（Layer 1 — pre-seeded node images，Bottlerocket）

AWS Bottlerocket 双卷架构将操作系统与数据分开。预先拉取容器镜像后为数据卷制作快照，在 `EC2NodeClass` 中引用快照 ID。新节点启动时权重已在本地 NVMe，第 2 步和第 3 步的一部分消失。它原生兼容 Karpenter，大模型每次冷启动通常节省 2-4 分钟。

GCP 对应方案是预置容器层的自定义 VM 镜像，Azure 则使用相同模式的托管磁盘快照。

### 第 2 层：模型流式加载（Layer 2 — model streaming，Run:ai Model Streamer）

不必加载完整文件后才响应首个请求，而是逐层将权重流入 GPU 显存，第一个 Transformer 块驻留后即可处理。NVIDIA Run:ai Model Streamer 在 2026 年 vLLM 中原生提供，支持 S3、GCS、本地 NVMe。通过重叠 I/O 与计算准备，大模型权重加载时间约减半。

### 第 3 层：GPU 显存快照（Layer 3 — GPU memory snapshots，Modal）

Modal 在首次加载后为 GPU 状态制作检查点，包括权重、CUDA 图、KV 缓存区域。后续重启直接反序列化到 HBM，比重新初始化快 10 倍，最接近“2 秒启动一个预热 GPU”。代价是快照绑定 GPU 拓扑，如果 Karpenter 迁移到另一 SKU，就要重新制作检查点。

### 第 4 层：预热池（Layer 4 — warm pools，min_workers=1）

最简单的缓解是始终保持一个副本就绪，成本为一块 GPU 全天候小时费率。小模型账很不划算：花 $0.85-$1.50/小时避免 30s 冷启动；大模型更划算：花 $4/小时避免 5 分钟冷启动。通常 70B+ 模型要求 TTFT P99 < 60s 时，就必须有预热池。

### 第 5 层：分层加载（Layer 5 — tiered loading，ServerlessLLM）

ServerlessLLM 将存储分层：NVMe 快且容量大，DRAM 中等并承担中间层，HBM 小但访问即时。权重预加载到 DRAM，再按需载入 HBM。论文报告，相比朴素磁盘到 HBM 加载，冷加载延迟降低 10-200 倍。生产采用仍在早期，但已有 vLLM 集成。

### 第 6 层：在线迁移，额外模式（Layer 6 — live migration，bonus pattern）

节点因竞价实例回收或排空而不可用时，传统模式是冷启动另一个副本，并排空请求队列。在线迁移（Live migration）将输入词元，只有数 KB，移到已加载模型的目标节点，再在那里重算 KV 缓存。重算比通过网络传输数 GB 的 KV 缓存便宜，适用于分离式部署。

### 预热池计算（The warm-pool math）

对 P99 TTFT SLA 为 2s 的服务，问题不是“是否需要预热池”，而是“多少预热副本、分配给哪些路径”。

- 高价值交互路径，如在线聊天、语音智能体：`min_workers=1-2`。
- 后台批处理路径，如夜间分类：允许缩到零，可接受 5-10 分钟冷启动。
- 高级付费档位：每租户设置 `min_workers`，使用专用容量。

### 先测量再优化（Measure before optimizing）

新节点上 70B 模型冷启动分解，以下为示例：

| 阶段 | 时间 | 缓解措施 |
|-------|------|-----------|
| 节点创建 | 50s | Bottlerocket + 预置镜像、预热池 |
| 镜像拉取 | 180s | 预置数据卷，可消除 |
| 权重载入 HBM | 75s | 模型流式加载减半；GPU 快照消除 |
| 引擎初始化 | 20s | 持久化 CUDA 图缓存 |
| 首次前向 | 3s | 固有延迟下限 |
| **原始冷启动总计** | **328s** | |
| **缓解后总计** | **~15s** | 降低 22 倍 |

### 应记住的数值（Numbers you should remember）

- Modal 冷启动：2-4s，使用 GPU 快照。
- Baseten 默认冷启动：5-10s，预热后低于一秒。
- 原始 70B 冷启动：3-8 分钟。
- Run:ai Model Streamer：权重加载约加速 2 倍。
- ServerlessLLM 分层加载：延迟降低 10-200 倍，为论文数值。

```figure
cold-start-pipeline
```

## 实际应用（Use It）

`code/main.py` 为各项缓解措施开启和关闭时的冷启动路径建模，报告总耗时、预热池成本，以及超过后预热池能收回成本的盈亏平衡请求率。

## 交付成果（Ship It）

本课产出 `outputs/skill-cold-start-planner.md`。根据 SLA、模型规模和流量形态，选择叠加哪些缓解措施。

## 练习（Exercises）

1. 运行 `code/main.py`。计算请求率达到多少时，预热副本比因冷启动导致额外 SLO 丢请求而付出的代价便宜。
2. 部署 13B 模型，P99 TTFT SLA 为 3s。选择能达成目标、层数最少的缓解组合。
3. Bottlerocket 预置消除镜像拉取，但权重仍需从快照载入 HBM。快照后端 NVMe 读取为 7 GB/s 时，计算 70B 模型实际耗时。
4. 无服务器服务商 Modal 提供 GPU 快照，团队以“快照泄露个人身份信息（PII）”为由拒绝。论证双方观点：真实风险是什么，如何通过临时快照、加密、命名空间隔离缓解？
5. 设计分档预热池策略：付费用户、试用用户、批处理负载各需要多少预热副本？展示计算。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 冷启动（Cold start） | “长时间停顿” | 新副本从请求到首词元的时间 |
| 预热池（Warm pool） | “最少常开实例” | `min_workers >= 1`，至少一个副本就绪 |
| 预置镜像（Pre-seeded image） | “预制 AMI” | 容器权重预先驻留的节点镜像 |
| Bottlerocket | “AWS 节点系统” | AWS 面向容器优化的操作系统，支持双卷快照 |
| 模型流式加载器（Model streamer） | “流式加载” | 重叠权重 I/O 与计算准备 |
| GPU 快照（GPU snapshot） | “恢复检查点到 HBM” | 序列化加载后 GPU 状态，重启时反序列化 |
| 分层加载（Tiered loading） | “NVMe + DRAM + HBM” | 存储层级结构，按需加载 |
| 在线迁移（Live migration） | “移动词元” | 传输 KB 级输入，在目标重算 KV |
| `min_workers` | “预热副本数” | 无服务器最少保活数量 |
| 缩容到零（Scale-to-zero） | “完全无服务器” | 空闲不收费，但承担完整冷启动代价 |

## 延伸阅读（Further Reading）

- [Modal：冷启动性能](https://modal.com/docs/guide/cold-start)：公开基准与检查点架构。
- [AWS Bottlerocket 仓库](https://github.com/bottlerocket-os/bottlerocket)：预置数据卷快照模式。
- [NVIDIA Run:ai Model Streamer 仓库](https://github.com/run-ai/runai-model-streamer)：重叠权重加载与计算准备。
- [Baseten：冷启动缓解](https://www.baseten.co/blog/cold-start-mitigation/)：预热操作指南。
- [ServerlessLLM 论文（USENIX OSDI'24）](https://www.usenix.org/conference/osdi24/presentation/fu)：分层加载设计。
- [NVIDIA：Kubernetes 上的分离式 LLM 推理](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)：分离式部署的在线迁移。
