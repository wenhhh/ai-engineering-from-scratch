# 生产服务栈：KV 卸载与缓存感知路由（Production Serving Stack — KV Offloading and Cache-Aware Routing）

> 生产服务栈将路由器、引擎和可观测性接入同一套 Kubernetes 部署，并把 KV 缓存视为可以移出 GPU 的资源。KV 卸载（KV offloading）将 KV 缓存从 GPU 内存中提取出来，先存入 CPU DRAM，再存入磁盘/Ceph，供不同查询和引擎复用。vLLM 的 production-stack 是参考部署，LMCache 是卸载层。vLLM 0.11.0 的 KV Offloading Connector（2026 年 1 月）通过 Connector API（v0.9.0+）实现异步、可插拔的卸载。卸载路径通常不会显现在请求路径上，但缓存未命中和数据向上层迁移仍可能增加端到端延迟。即使没有共享前缀，LMCache 也有价值：当 GPU 的 KV 槽位耗尽时，被抢占的请求可以从 CPU 恢复，无需重新计算预填充。公开基准在 4 个 a3-highgpu-4g 实例上的 16 块 H100（80GB HBM）进行：当 KV 缓存超过 HBM 容量时，原生 CPU 卸载和 LMCache 都显著提高吞吐量；KV 占用较小时，各配置与基准相当，只增加少量开销。

**Type:** Learn
**Languages:** Python（标准库，简化的 KV 溢出模拟器）
**Prerequisites:** 阶段 17 · 04（服务引擎内部机制），阶段 17 · 06（SGLang/RadixAttention）
**Time:** ~60 分钟

## 学习目标（Learning Objectives）

- 绘制 vLLM production-stack 的各层：路由器、引擎、KV 卸载和可观测性。
- 解释 KV Offloading Connector API（v0.9.0+），以及 0.11.0 的异步路径如何隐藏卸载延迟。
- 量化 LMCache CPU-DRAM 何时有帮助（KV > HBM），何时只增加开销（KV 足够小，能放入 HBM）。
- 根据部署约束，在原生 vLLM CPU 卸载与 LMCache 连接器之间做出选择。

## 问题（The Problem）

你的 vLLM 服务显示 GPU 的 HBM 已占满，并发一上升就出现抢占事件。请求被驱逐、重新排队，导致同一个 2K 词元提示词在一分钟内被重新预填充四次。GPU 计算耗在重复预填充上，有效吞吐量（goodput）远低于原始吞吐量。

增加 GPU 会让成本线性增长，增加现有 GPU 的 HBM 容量则做不到。但 CPU DRAM 很便宜：单个插槽可提供 512 GB 以上的内存，延迟虽然比 HBM 高几个数量级，却足以存放“暂时保持温热”的 KV 缓存。

LMCache 将 KV 缓存提取到 CPU DRAM，让被抢占的请求快速恢复，并让不同引擎的重复前缀共享缓存，无需每个引擎都重新预填充。

## 概念（The Concept）

### vLLM 生产服务栈（vLLM production-stack）

`github.com/vllm-project/production-stack` 是参考 Kubernetes 部署：

- **路由器（router）**：具备缓存感知能力（阶段 17 · 11），消费 KV 事件。
- **引擎（engines）**：vLLM 工作进程，每块 GPU 或每个 TP/PP 组对应一个。
- **KV 缓存卸载（KV cache offload）**：LMCache 部署或原生连接器。
- **可观测性（observability）**：Prometheus 抓取、Grafana 仪表盘、OTel 链路追踪。
- **控制平面（control plane）**：服务发现、配置和滚动更新。

以 Helm chart + operator 的形式交付。

### KV 卸载连接器 API（The KV Offloading Connector API，v0.9.0+）

vLLM 0.9.0 引入 Connector API，用于可插拔的 KV 缓存后端。引擎将块卸载给连接器，连接器负责存储它们，可使用 RAM、磁盘、对象存储或 LMCache。请求需要某个块时，连接器将它加载回来。

vLLM 0.11.0（2026 年 1 月）增加了异步卸载路径：卸载可以在后台进行，因此通常不会阻塞引擎。端到端延迟和吞吐量仍取决于工作负载形态、KV 缓存命中率及系统压力；vLLM 自身的说明也指出，自定义内核卸载在低命中率下可能降低吞吐量，而且异步调度与推测解码之间存在已知交互问题。

### 原生 CPU 卸载与 LMCache（Native CPU offload vs LMCache）

**原生 vLLM CPU 卸载（native vLLM CPU offload）**：作用于引擎本地，将 KV 块存入宿主机 RAM。实现快，不经过网络跳转，但不能跨引擎共享。

**LMCache 连接器（LMCache connector）**：作用于集群，将块存入共享 LMCache 服务器（CPU DRAM + Ceph/S3 分层）。任何引擎都可以访问这些块。已有 16 块 H100 的公开基准。

单个引擎有 HBM 压力时选择原生卸载。多个引擎共享前缀时，例如使用共同系统提示词的 RAG 或共享模板的多租户服务，选择 LMCache。

### 基准表现（Benchmark behavior）

测试使用分布在 4 个 a3-highgpu-4g 实例上的 16 块 H100（80 GB HBM）：

- KV 占用低，提示词短、并发低：各配置与基准相当，LMCache 增加约 3–5% 开销。
- 占用中等：LMCache 开始通过跨引擎前缀复用带来收益。
- KV 超过 HBM：原生 CPU 卸载与 LMCache 都显著提高吞吐量；LMCache 因跨引擎共享而收益更大。

### LMCache 何时起决定性作用（When LMCache is decisive）

- 多租户服务中，不同租户共享系统提示词。
- RAG 中，不同查询重复使用文档块。
- 同一基础模型上的微调变体（LoRA），通过基础模型 KV 复用减少重复工作。
- 频繁抢占的工作负载：从 CPU 恢复比重新预填充更便宜。

### 何时不应启用（When NOT to enable）

- HBM 压力小：只有开销，没有收益。
- 上下文短（<1K 词元）：传输时间超过重新预填充时间。
- 单租户、单提示词工作负载：没有可利用的复用机会。

### 与分离式服务集成（Integration with disaggregated serving）

阶段 17 · 17 的分离式服务与 LMCache 可以叠加收益：从预填充池传输到解码池的 KV，如果暂未使用，就存入 LMCache；后续查询再从 LMCache 获取。阶段 17 · 11 的缓存感知路由器可以选择本地缓存或 LMCache 共享缓存匹配的引擎。

### 应记住的数字（Numbers you should remember）

- vLLM 0.9.0：发布 Connector API。
- vLLM 0.11.0（2026 年 1 月）：异步卸载路径；对端到端延迟的影响取决于工作负载、KV 命中率和系统压力，并非绝对保证。
- 16 块 H100 的基准：KV 占用超过 HBM 时，LMCache 有帮助。
- HBM 压力小时：增加 3–5% 开销，却没有收益。

```figure
zero-sharding
```

## 动手使用（Use It）

`code/main.py` 模拟频繁抢占的工作负载，对比使用和不使用 LMCache 的情况。它报告避免的重复预填充次数、吞吐量增益，以及达到收支平衡时的 HBM 利用率。

## 交付成果（Ship It）

本课产出 `outputs/skill-vllm-stack-decider.md`。它根据工作负载形态和 vLLM 部署，决定使用原生卸载、LMCache，还是两者都不用。

## 练习（Exercises）

1. 运行 `code/main.py`。HBM 利用率达到多少时，LMCache 开始划算？
2. 某租户每小时 200 次查询共享一个 6K 词元系统提示词。计算 LMCache 预计能为每个租户节省多少。
3. LMCache 服务器是单点故障。设计高可用（HA）策略，包括副本和回退到原生卸载。
4. LMCache 将数据存入使用机械磁盘的 Ceph。对于 70B FP8 上 4K 词元的 KV（500 MB），读取时间与重新预填充相比如何？
5. 论证 vLLM 0.11.0 的异步路径是否“免费”：开销隐藏在哪里？

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|------------------------|
| Production-stack | “参考部署” | vLLM 的 Kubernetes Helm chart + operator |
| Connector API | “KV 后端接口” | vLLM 0.9.0+ 的可插拔 KV 存储接口 |
| 原生 CPU 卸载（Native CPU offload） | “引擎本地溢出” | 将 KV 存入同一引擎的宿主机 RAM |
| LMCache | “集群 KV 缓存” | 基于 CPU DRAM 与磁盘的跨引擎 KV 缓存服务器 |
| 0.11.0 异步路径（0.11.0 async） | “非阻塞卸载” | 将卸载隐藏在引擎执行流之后 |
| 抢占（Preemption） | “驱逐以腾出空间” | HBM 满时调整 KV 缓存存放位置 |
| 前缀复用（Prefix reuse） | “相同系统提示词” | 多个查询共享开头，从而命中缓存 |
| Ceph 层（Ceph tier） | “磁盘层” | 缓存层级中位于 DRAM 之下的持久化存储 |

## 延伸阅读（Further Reading）

- [vLLM 博客：KV 卸载连接器（2026 年 1 月）](https://blog.vllm.ai/2026/01/08/kv-offloading-connector.html)
- [vLLM Production Stack 的 GitHub 仓库](https://github.com/vllm-project/production-stack)：Helm chart + operator。
- [用于企业级 LLM 推理的 LMCache（arXiv:2510.09665）](https://arxiv.org/html/2510.09665v2)
- [LMCache 的 GitHub 仓库](https://github.com/LMCache/LMCache)：连接器实现。
- [vLLM 0.11.0 发布说明](https://github.com/vllm-project/vllm/releases)：异步路径细节。
