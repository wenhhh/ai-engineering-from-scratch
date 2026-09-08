# 多区域 LLM 服务与 KV 缓存局部性（Multi-Region LLM Serving and KV Cache Locality）

> 轮询负载均衡（Round-robin load balancing）会直接损害有缓存的 LLM 推理。请求未落到持有其前缀的节点，就要支付完整预填充成本：长提示词的 P50 约 800 ms，缓存命中则约 80 ms。2026 年生产模式是缓存感知路由器（Rust 实现的 vLLM Router、llm-d router），消费 KV 缓存事件，按前缀哈希匹配路由。近期研究 GORGO 将跨区域网络延迟显式纳入路由目标。商业“跨区域推理”，如 Bedrock cross-region inference、GKE 多集群网关，将推理视为黑箱，处理可用性而非 TTFT。JPMorgan 与 Mayo Clinic 在 2024 年 11 月进行 us-east-1 故障转移，耗时约 22 分钟。灾难恢复（Disaster Recovery，DR）的现实是：32% 的 LLM 灾备失败，是因为团队备份权重却忘记分词器文件或量化配置。

**Type:** Learn
**Languages:** Python (标准库，简化前缀缓存感知路由模拟器)
**Prerequisites:** 阶段 17 · 04（vLLM 服务，vLLM Serving）、阶段 17 · 06（SGLang RadixAttention）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 解释轮询均衡为何破坏缓存推理，并量化 TTFT 代价。
- 绘制缓存感知路由器：输入 KV 缓存事件，算法为前缀哈希匹配，平局时按 GPU 利用率选择。
- 说出导致 32% LLM 灾备失败的原因，即缺少分词器文件或量化配置，并列出三项灾备文件清单。
- 区分商业跨区域服务（Bedrock CRI、GKE Multi-Cluster Gateway）与 KV 感知路由。

## 问题背景（The Problem）

服务运行于 us-east-1、us-west-2、eu-west-1，前面放了轮询 ALB。生产前缀缓存命中率降到 8%，TTFT P50 增至三倍，vLLM 日志显示每请求都承担完整预填充成本。

轮询适合无状态服务，但 LLM 推理天生有状态，KV 缓存编码了模型见过的内容。盲目路由就是路由到错误缓存。

另一个问题是灾备计划。团队将模型权重跨区域备份到 S3，区域故障后尝试切换，副本却拒绝启动。你忘了 tokenizer.json、量化配置和 RoPE 缩放配置在另一个未同步的桶中。

多区域 LLM 服务是缓存、路由和灾备完整性问题，而非仅是负载均衡器问题。

## 核心概念（The Concept）

### 缓存感知路由（Cache-aware routing）

带提示词的请求到达后，路由器对前缀，例如前 512 词元，计算哈希，并询问副本是否缓存该前缀。副本在分配、淘汰块时通过发布/订阅通道发布 KV 缓存事件。路由器选匹配副本；无人匹配则按 GPU 利用率决定。

**vLLM Router**（Rust，2026 production-stack）：订阅 `kv.cache.block_added` 事件，维护前缀哈希到副本的索引，以 O(1) 查找路由；未命中则选择最短队列。

**llm-d router**：同样模式，Kubernetes 原生，通过 ControlPlane API 发布事件。

**SGLang RadixAttention**（阶段 17 · 06）是副本内部的对应机制，跨副本路由严格位于其上游。

### 数值（Numbers）

H100 上 Llama 3.3 70B FP8，2K 词元提示词的 TTFT P50：
- 缓存命中，同副本且前缀驻留：约 80 ms。
- 缓存未命中，冷预填充：约 800 ms。

相差 10 倍。跨副本前缀缓存命中率为 60-80% 时，能以 N 副本容量接近单副本性能；仅 10% 时，则接近朴素扩容。

### 跨区域的新约束：网络延迟（Cross-region has a new constraint — network latency）

区域间往返时间（Round-trip time，RTT）：
- us-east-1 ↔ us-west-2：约 65 ms。
- us-east-1 ↔ eu-west-1：约 75 ms。
- us-east-1 ↔ ap-southeast-1：约 220 ms。

若将 us-east-1 请求路由到 ap-southeast-1 的热门前缀，节省的预填充（800 → 80 ms）相较 440 ms 往返开销就显得不足。GORGO（2026 年研究）明确这一点：联合最小化 `prefill_time + network_latency`，而非只最小化预填充。通常应保持区域内路由，除非前缀达到数 MB、预填充占主导。

### 商业“跨区域推理”无法解决此问题（Commercial "cross-region inference" does not help here）

AWS Bedrock cross-region inference 在容量紧张时自动将请求路由到其他区域，优化的是可用性而非 TTFT，将推理作为黑箱。GKE Multi-Cluster Gateway 也一样：服务级故障转移，不感知 KV 缓存。

即使采用这些服务，仍需应用层缓存感知路由器。它们处理“us-east-1 出故障”的场景，缓存感知路由处理 TTFT。

### 灾备完整性：32% 的缺文件问题（DR hygiene — the 32% missing-files problem）

2026 年广泛引用的统计是：32% LLM 灾备失败，源于团队备份权重却忘记：

- `tokenizer.json` 或 `tokenizer.model`。
- 量化配置：`quantize_config.json`、AWQ 缩放因子、GPTQ 零点。
- 模型专用配置：RoPE 缩放、注意力掩码、聊天模板。
- 引擎配置：`vllm_config.yaml`、采样默认值、LoRA 适配器清单。

修复是至少包含三项的灾备文件清单：

1. HF 模型仓库全部文件：权重、配置、分词器。
2. 引擎专用服务配置。
3. 部署清单：K8s YAML、Dockerfile、依赖锁文件。

另外每季度进行灾备演练。JPMorgan 2024 年 11 月 us-east-1 演练能在 22 分钟恢复，正是因为操作手册已演练过。

### 数据驻留是独立约束（Data residency is orthogonal）

欧盟客户的受保护健康信息（PHI）不能离开欧盟。若缓存感知路由器为匹配前缀，将巴黎请求发往 us-east-1，无论 TTFT 改善多少，都违反 GDPR。先按数据驻留边界划分路由器，再优化缓存。

### 应记住的数值（Numbers you should remember）

- 2K 提示词缓存命中与未命中的 TTFT 差距约 10 倍：80 ms 与 800 ms。
- 美国与欧盟区域间 RTT：约 75 ms。
- 32% 灾备失败缺少分词器或量化配置。
- JPMorgan 2024 年 11 月 us-east-1 故障转移：22 分钟，SLA 为 30 分钟。

```figure
cache-aware-router
```

## 实际应用（Use It）

`code/main.py` 在多区域负载上模拟轮询、区域内缓存感知、全局缓存感知三种路由，报告命中率、TTFT P50/P99 和跨区域账单。

## 交付成果（Ship It）

本课产出 `outputs/skill-multi-region-router.md`。根据区域、驻留约束和 SLA 设计路由方案。

## 练习（Exercises）

1. 运行 `code/main.py`。RTT 为 75 ms 时，提示词多长，跨区域路由才优于仅本地路由？
2. 缓存命中率从 70% 降到 12%，诊断三个可能原因，并列出能确认各原因的观测量。
3. 为 vLLM 上带 5 个 LoRA 适配器的 70B AWQ 模型设计灾备清单，列出每个文件与配置。
4. 对 TTFT SLO 严格的金融科技服务，Bedrock 跨区域推理是否“足够”？引用具体行为论证。
5. 巴黎请求匹配 us-east-1 前缀，是否路由过去？写出策略。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| 缓存感知路由（Cache-aware routing） | “智能负载均衡” | 按前缀哈希匹配，路由到持有 KV 缓存的副本 |
| KV 缓存事件（KV-cache events） | “缓存发布订阅” | 副本发布块增加/淘汰事件，路由器建立索引 |
| 前缀哈希（Prefix hash） | “缓存键” | 前 N 词元的哈希，供路由器查找 |
| GORGO | “跨区域路由研究” | arXiv 2602.11688，将网络延迟显式纳入目标 |
| 跨区域推理（Cross-region inference） | “Bedrock CRI” | AWS 产品，处理可用性故障转移，不感知 TTFT |
| 灾备清单（DR manifest） | “备份列表” | 恢复所需全部文件，而不只是权重 |
| 数据驻留（Data residency） | “GDPR 边界” | 哪些区域可看到用户数据的法律约束 |
| 往返时间（RTT） | “来回耗时” | 网络延迟，美国至欧盟 75 ms，至亚太 220 ms |
| LLM 感知负载均衡（LLM-aware LB） | “缓存命中负载均衡” | 作为产品类别的缓存感知路由器 |

## 延伸阅读（Further Reading）

- [BentoML：多云与跨区域推理](https://bentoml.com/llm/infrastructure-and-operations/multi-cloud-and-cross-region-inference)
- [arXiv：GORGO 论文（2602.11688）](https://arxiv.org/html/2602.11688v1)：包含网络延迟项的跨区域 KV 缓存复用。
- [TianPan：多区域 LLM 服务的缓存局部性](https://tianpan.co/blog/2026-04-17-multi-region-llm-serving-data-residency-routing)
- [AWS Bedrock 跨区域推理](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html)：可用性故障转移文档。
- [vLLM Production Stack 路由器](https://github.com/vllm-project/production-stack)：缓存感知路由源码。
