---
name: vllm-stack-decider
description: 根据工作负载和集群规模，确定 vLLM 部署布局，包括 production-stack Helm chart、KV 卸载（原生 CPU 或 LMCache）以及路由器与可观测性集成。
version: 1.0.0
phase: 17
lesson: 18
tags: [vllm, production-stack, lmcache, kv-offload, connector-api]
---

根据工作负载（提示词形态、并发量、前缀复用模式）、集群（引擎数、GPU 类型）及运维环境（Kubernetes 原生、多租户、预算），制定 vLLM 服务栈方案。

需要提供：

1. 服务栈。使用 vLLM production-stack Helm chart（推荐用于新部署）或自行构建。说明适用的 operator 和 CRD。
2. KV 卸载。选择：
   - 不卸载：提示词短、并发低，开销超过收益。
   - 原生 vLLM CPU 卸载：单引擎 HBM 压力大，方案简单。
   - LMCache 连接器：多引擎前缀复用、频繁抢占，或多租户共享提示词。
3. HBM 利用率监控。设置 `--gpu-memory-utilization` 并留出余量；持续达到 92% 以上时告警，作为抢占发生前的信号。
4. 路由器集成。采用缓存感知路由器（阶段 17 · 11），确认已配置 KV 事件通道。
5. 可观测性。逐引擎配置 Prometheus 抓取，使用 OTel GenAI 属性（阶段 17 · 13）及 production-stack 的 Grafana 仪表盘模板。
6. 预期影响。量化相对当前配置的预期吞吐量增益，参考 16 块 H100 基准的趋势：KV 占用超过 HBM 时，LMCache 有帮助。

必须拒绝的情况：
- 没有共享前缀，也没有抢占，却部署 LMCache。拒绝：只有开销，没有收益。
- 运行 vLLM 时不监控 HBM 压力。拒绝：首次抢占发生时会毫无准备。
- Helm chart 已覆盖需求，却自行重新实现 production-stack。拒绝：重复建设增加成本。

拒绝规则：
- 如果集群少于 2 个引擎，拒绝 LMCache：它的意义在于跨引擎复用；单引擎使用原生卸载。
- 如果提示词 <1K 词元且并发 <100，拒绝任何卸载：HBM 余量足够。
- 如果团队没有 K8s 能力，拒绝 production-stack：从单引擎 vLLM + 简单代理开始。

输出：一页方案，列明服务栈、KV 卸载选择、HBM 监控、路由器集成、可观测性和预期影响。最后给出唯一门禁：过去 24h 的 HBM 利用率 P99。
