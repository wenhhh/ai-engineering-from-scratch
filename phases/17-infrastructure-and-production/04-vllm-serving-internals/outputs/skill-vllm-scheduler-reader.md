---
name: vllm-scheduler-reader
description: 阅读调度器级参数，诊断 vLLM 服务配置，识别 PagedAttention、连续批处理和分块预填充中的瓶颈。
version: 1.0.0
phase: 17
lesson: 04
tags: [vllm, paged-attention, continuous-batching, chunked-prefill, serving, scheduler]
---

给定 vLLM 服务配置（model、dtype、硬件、`--gpu-memory-utilization`、`--max-num-batched-tokens`、`--enable-chunked-prefill`、`--speculative-config`、最大并发数，以及观测到的 TTFT 均值/P99、ITL 均值/P99、吞吐量 tok/s），给出调度器层面的诊断。

请输出：

1. 配置解读。对每个参数说明其控制的调度行为及 2026 年默认值。标出非默认设置，并解释原因。
2. 瓶颈识别。将瓶颈归为以下之一：PagedAttention 资源不足（KV 块短缺）、连续批处理停滞（WAITING 队列增长）、预填充分块大小不当（TTFT 尾延迟尖峰）、解码受计算限制（ITL 下限），或 HBM 受限（无法容纳批次）。使用报告指标论证。
3. 参数建议。给出明确且有顺序的行动：改哪个开关、尝试哪个值、观察哪个指标。未穷尽调度器级调优前，不要建议“增加 GPU”。
4. 兼容性检查。对照配置中具体 vLLM 版本的兼容性矩阵，检查每一对已启用功能。v0.18.0 的矩阵将推测解码与分块预填充、前缀缓存标记为兼容。
5. 后续阅读。根据诊断发现，指向 vLLM v0.18.0 发行说明、PagedAttention 论文或 Aleksa Gordic 的 V1 调度器详解中的一项。

硬性否决条件：
- 缺少四项核心指标（TTFT、ITL、吞吐量、并发）就诊断。拒绝，并要求提供指标集。
- 未检查推测解码配置就推荐 `--enable-chunked-prefill`。
- 将 `DCGM_FI_DEV_GPU_UTIL` 视为扩缩容信号。vLLM 会预分配 KV，占空比数值有误导性。

拒绝规则：
- 如果 H100 上报告吞吐量低于 100 tok/s，瓶颈可能不在 vLLM；检查客户端分词器、Python GIL 或请求级串行化。
- 如果 `--gpu-memory-utilization` 低于 0.7，拒绝继续调优：运维人员主动闲置了 HBM，应先提高上限，再修改调度参数。
- 操作者要求提供推测解码与分块预填充组合方案时，先依据其 vLLM 版本的兼容性矩阵核查，再回答；草稿方法可参考阶段 17 · 05 的 EAGLE-3。

输出：一页调度器诊断，列出参数、瓶颈、有序建议、兼容性说明和后续阅读。最后用一段“下一步测量什么”，根据已识别瓶颈，在 P99 ITL、块分配速率或 WAITING 队列深度中选择一项。
