# 预填充与解码分离（Disaggregated Prefill/Decode）：NVIDIA Dynamo 与 llm-d

> 预填充（prefill）受计算能力限制，解码（decode）受内存限制。在同一块 GPU 上运行两者，会浪费其中一种资源。分离架构将它们放入独立资源池，并通过 NIXL（RDMA/InfiniBand，或回退到 TCP）传输 KV 缓存。NVIDIA Dynamo 在 GTC 2025 发布，1.0 已正式可用；它位于 vLLM/SGLang/TRT-LLM 之上，其 Planner Profiler + SLA Planner 会自动匹配预填充与解码的速率比例，以满足 SLO。NVIDIA 发布的吞吐量增益大致如下：developer.nvidia.com 的 2025-06 文章展示了 DeepSeek-R1 MoE 在 GB200 NVL72 + Dynamo 上、中等延迟区间内约 6 倍的提升；Dynamo 产品页（developer.nvidia.com，未注明日期）宣传 GB300 NVL72 + Dynamo 相比 Hopper 的 MoE 吞吐量最高提升 50 倍。“30 倍”来自社区对 Blackwell + Dynamo + DeepSeek-R1 全栈报告的综合归纳；我们没有找到明确写出恰好 30 倍的单一一手来源，因此应将其视为趋势性说法。llm-d（Red Hat + AWS）采用 Kubernetes 原生架构：预填充、解码和路由器分别作为独立 Service，按角色配置 HPA。llm-d 0.5 增加了分层 KV 卸载、缓存感知 LoRA 路由、UCCL 网络和缩容到零。经济性方面：内部汇总多家客户披露的信息表明，在 SLA 不变的情况下，从混部服务切换到 Dynamo 分离式服务，可为 $2M 量级的推理支出节省 30–40%，即每年 $600–800K。具体的 $2M→$600–800K 数字是内部综合结果，不是单个已发表案例，只应用作数量级参考，而非引用依据。短提示词（<512 词元，输出也短）带来的收益不足以抵消传输成本。

**Type:** Learn
**Languages:** Python（标准库，简化的分离与混部对比模拟器）
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制），阶段 17 · 08（推理指标）
**Time:** ~75 分钟

## 学习目标（Learning Objectives）

- 解释为什么预填充与解码各自需要不同的最优 GPU 分配，并量化混部造成的浪费。
- 绘制分离架构：预填充池、解码池、通过 NIXL 传输 KV 的链路，以及路由器。
- 指出分离架构不划算的条件，即短提示词和短输出。
- 区分 NVIDIA Dynamo（位于服务栈之上）与 llm-d（Kubernetes 原生），并将两者匹配到适当的运维环境。

## 问题（The Problem）

你在 8 块 H100 上运行 Llama 3.3 70B。对于长提示词加短输出的混合工作负载，大部分计算发生在预填充阶段，GPU 在解码期间出现闲置。对于另一种工作负载，即短提示词加长输出，情况则相反。将预填充与解码混部，意味着两种资源都要超额配置。

对预算的影响是：20–40% 的 GPU 时间浪费在了不匹配的资源上。你购买 H100 的计算能力，却在运行受内存限制的解码；或者购买 H100 的 HBM 带宽，却在运行受计算限制的预填充。这两种浪费都很昂贵。

分离架构将预填充和解码放在独立资源池中，根据各自瓶颈确定规模。KV 缓存通过高带宽互连，从预填充池传输到解码池。

## 概念（The Concept）

### 为什么瓶颈不同（Why the bottlenecks differ）

**预填充（prefill）**：在一次前向传播中，对整个输入提示词运行 Transformer。矩阵乘法占主导，因此受计算能力限制。H100 FP8 可提供约 2000 TFLOPS 的有效吞吐量。批处理效率较好，因为一次前向传播会处理许多词元。

**解码（decode）**：每次生成一个词元，每轮迭代都读取完整权重。因此受内存带宽限制。HBM3 可提供约 3 TB/s。只有在高并发下，批处理效率才好，因为读取权重的成本可以分摊到整个批次。

将两者混部，意味着购买同时适合两者的 GPU。H100 两方面都不错，但无论用于哪一方面，价格都相同。规模扩大后，你会希望预填充池使用 H100 等计算能力强的配置，解码池使用 H200 等内存资源强的配置，或采用更激进的量化。

### 架构（The architecture）

```
            ┌──────────────┐
  请求 →    │    路由器    │ ───────────────────────┐
            └──────┬───────┘                        │
                   │                                │
                   ▼（仅提示词）                    │
            ┌──────────────┐    KV 缓存     ┌───────▼──────┐
            │   预填充池   │ ─── NIXL ────► │    解码池    │
            │ （计算密集） │                │ （内存密集） │
            └──────────────┘                └──────┬───────┘
                                                   │ 词元
                                                   ▼
                                                 客户端
```

NIXL 是 NVIDIA 的节点间传输机制。有 RDMA/InfiniBand 时使用它们，否则回退到 TCP。传输延迟不可忽视：对于 70B FP8 模型、4K 词元提示词的 KV 缓存，通常需要 20–80ms。这就是短提示词不适合分离架构的原因：传输开销超过了节省。

### Dynamo 与 llm-d（Dynamo vs llm-d）

**NVIDIA Dynamo**（GTC 2025 发布，1.0 正式可用）：
- 作为编排器运行在 vLLM、SGLang 和 TRT-LLM 之上。
- Planner Profiler 测量工作负载，SLA Planner 自动配置预填充与解码的比例。
- 核心使用 Rust，并支持 Python 扩展。
- 吞吐量增益：NVIDIA 报告 DeepSeek-R1 MoE 在 GB200 NVL72 + Dynamo 上、中等延迟区间内提升 6 倍（developer.nvidia.com，2025-06）；社区关于完整 Blackwell + Dynamo + DeepSeek-R1 服务栈“最高 30 倍”的报告缺少单一一手来源，应视为趋势性描述。
- GB300 NVL72 + Dynamo：根据 Dynamo 产品页（developer.nvidia.com，未注明日期），MoE 吞吐量相比 Hopper 最高提升 50 倍。

**llm-d**（Red Hat + AWS，Kubernetes 原生）：
- 预填充、解码和路由器分别作为独立 Kubernetes Service。
- 按角色配置 HPA，预填充使用队列深度信号，解码使用 KV 利用率信号。
- `topologyConstraint packDomain: rack` 将预填充与解码实例组集中放在同一机架，以实现高带宽 KV 传输。
- llm-d 0.5（2026）：分层 KV 卸载、缓存感知 LoRA 路由、UCCL 网络、缩容到零。

如果希望使用位于服务栈之上的托管编排器，就选择 Dynamo。如果希望采用 Kubernetes 原生基础能力，并已决定投入 CNCF 生态，就选择 llm-d。

### 经济性（Economics）

内部综合结果，不是单个已发表案例，仅作数量级参考：

- 混部服务每年推理支出为 $2M。
- 切换为使用 Dynamo 的分离式服务。
- 请求量不变，P99 延迟 SLA 不变。
- 报告的节省为每年 $600K–$800K，降幅 30–40%。
- 没有新增硬件。

这个数字由多家客户披露的信息综合而来，并非单个可引用案例。最接近的公开数据点是：Baseten 使用 Dynamo KV 路由后，TTFT 加快 2 倍、吞吐量提高 61%（baseten.co，2025-10）；VAST + CoreWeave 则预计，在 KV 命中率为 40–60% 时，每美元可获得的词元数增加 60–130%（vastdata.com，2025-12）。节省来自为各资源池配置合适规模。预填充占比较高的工作负载，例如前缀超过 8K 的 RAG，比均衡型工作负载收益更大。

### 何时不应分离（When NOT to disaggregate）

- 提示词少于 512 词元，且输出少于 200 词元：传输开销超过收益。
- 小型集群（<4 块 GPU）：无法形成足够多样的资源池配置。
- 团队无法运维两个按角色独立扩缩的 GPU 池：Dynamo 有帮助，但并非轻而易举。
- 没有 RDMA 网络：TCP 的传输开销更高。

### 路由器与阶段 17 · 11 的集成（The router integrates with Phase 17 · 11）

分离式路由器具备 KV 缓存感知能力（阶段 17 · 11）。请求会落到持有其前缀的解码池；如果未匹配，则沿预填充 → 解码的路径运行。缓存命中率和分离架构的收益可以叠加：缓存感知路由器决定是否需要重新预填充。

### Blackwell 上的 MoE 才能体现显著收益（MoE on Blackwell is where the real numbers are）

GB300 NVL72 + Dynamo 相比 Hopper 基准，展示了 50 倍的 MoE 吞吐量。MoE 专家路由在预填充阶段偏重计算，在解码阶段偏重内存（专家缓存），因此分离架构可以同时优化两方面。2026 年前沿模型服务以 MoE 为主，包括 DeepSeek-V3 和未来的 GPT-5 变体。

### 应记住的数字（Numbers you should remember）

基准数字会变化，NVIDIA 和推理服务栈每季度都会发布更新结果。引用前应重新核查。

- GB200 NVL72 + Dynamo 上的 DeepSeek-R1：中等延迟区间内，相比基准吞吐量约提升 6 倍（developer.nvidia.com，2025-06）；社区对完整 Blackwell + Dynamo 服务栈“最高 30 倍”的说法是趋势性汇总，缺少单一一手来源。
- GB300 NVL72 + Dynamo：相比 Hopper，MoE 吞吐量最高提升 50 倍（developer.nvidia.com，未注明日期）。
- 节省参考值，内部综合结果而非单个案例：在 SLA 不变的情况下，从每年 $2M 支出中节省 $600–800K。
- 分离阈值：提示词 >512 词元，且输出 >200 词元。
- 通过 NIXL 传输 KV：70B FP8 模型上，4K 提示词的 KV 传输需要 20–80ms。

```figure
prefill-decode-split
```

## 动手使用（Use It）

`code/main.py` 模拟混部与分离式服务，报告吞吐量、每请求成本，以及提示词长度达到何值时分离更有利。

## 交付成果（Ship It）

本课产出 `outputs/skill-disaggregation-decider.md`。它根据工作负载和集群，决定是否采用分离架构。

## 练习（Exercises）

1. 运行 `code/main.py`。提示词达到多长时，分离架构优于混部？
2. 为 P99 前缀长度为 8K、输出为 300 词元的 RAG 服务设计预填充池和解码池。
3. 对于完全使用 Kubernetes、对 Python 运行时没有偏好的团队，在 Dynamo 与 llm-d 中选择一个。
4. 计算 KV 传输成本：70B FP8 上的 4K 预填充 = 约 500 MB KV。RDMA 100 GB/s 下，传输 = 5ms；TCP 10 GB/s 下 = 50ms。哪一个会影响你的 SLA？
5. MoE 专家路由会改变 KV 访问模式。如果 MoE 为每个词元激活不同专家，分离架构会如何表现？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 分离式服务（Disaggregated serving） | “拆开预填充与解码” | 为两个阶段使用独立 GPU 池 |
| NIXL | “NVIDIA 传输” | Dynamo 的节点间 KV 传输机制（RDMA/TCP） |
| NVIDIA Dynamo | “编排器” | 位于 vLLM/SGLang/TRT-LLM 之上的协调器 |
| llm-d | “Kubernetes 原生” | Red Hat + AWS 的 K8s 分离式服务栈 |
| Planner Profiler | “Dynamo 自动配置” | 测量工作负载，配置资源池比例 |
| SLA Planner | “Dynamo 策略” | 自动匹配预填充与解码速率，以满足 SLO |
| `packDomain: rack` | “llm-d 拓扑” | 将预填充与解码放在同一机架，以加快 KV 传输 |
| UCCL | “统一集合通信” | llm-d 0.5 中支持缩容到零的网络层 |
| MoE 专家路由（MoE expert routing） | “逐词元选择专家” | DeepSeek-V3 的模式，分离架构有助于优化 |

## 延伸阅读（Further Reading）

- [NVIDIA：Dynamo 简介](https://developer.nvidia.com/blog/introducing-nvidia-dynamo-a-low-latency-distributed-inference-framework-for-scaling-reasoning-ai-models/)
- [NVIDIA：在 Kubernetes 上部署分离式 LLM 推理](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)
- [TensorRT-LLM 分离式服务博客](https://nvidia.github.io/TensorRT-LLM/blogs/tech_blog/blog5_Disaggregated_Serving_in_TensorRT-LLM.html)
- [llm-d 的 GitHub 仓库](https://github.com/llm-d/llm-d)
- [llm-d 0.5 发布说明](https://github.com/llm-d/llm-d/releases)
