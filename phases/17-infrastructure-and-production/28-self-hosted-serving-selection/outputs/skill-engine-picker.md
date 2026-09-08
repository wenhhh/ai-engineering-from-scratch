---
name: engine-picker
description: 根据硬件、规模和工作负载选择自托管 LLM 引擎（llama.cpp、Ollama、TGI、vLLM、SGLang），并指出 2026 年 TGI 维护模式是迁移触发因素。
version: 1.0.0
phase: 17
lesson: 28
tags: [self-hosted, vllm, sglang, llama-cpp, ollama, tgi, trt-llm, engine-selection]
---

根据硬件（CPU、Apple Silicon、AMD、NVIDIA Hopper、NVIDIA Blackwell）、规模（单用户、小团队、生产、企业）和工作负载（通用聊天、智能体、RAG、长上下文、代码），推荐引擎。

需要提供：

1. 引擎。指定具体引擎，引用先硬件、再规模、最后工作负载的决策树。
2. 为什么不选替代项。逐个说明其他引擎未被选择的原因，例如 TGI 维护模式、AMD 排除 TRT-LLM、Ollama 仅用于开发。
3. 流水线。如果用于生产，明确开发 Ollama → 预发布 llama.cpp → 生产 vLLM/SGLang 的模式，并确认 GGUF 或 HF 权重格式在各阶段的传递方式。
4. 生产组合。生产规模下，参见阶段 17 · 18（production-stack）、· 17（分离式服务）、· 11（缓存感知路由器）组合部署。
5. TGI 迁移。如果当前使用 TGI，指定迁移计划和时间线；不紧急，但应在六个月内开始。
6. 硬件注意事项。指出两项硬约束：仅 CPU → llama.cpp；AMD → 不能用 TRT-LLM。

必须拒绝的情况：
- 2026 年新项目默认选择 TGI。拒绝：已进入维护模式。
- 超过 1 个并发用户的共享生产使用 Ollama。拒绝：吞吐量存在差距。
- 未确认全部是 NVIDIA 就建议 TRT-LLM。拒绝：AMD 或非 NVIDIA 是硬性阻碍。

拒绝规则：
- 如果硬件混合使用 AMD 和 NVIDIA，要求逐集群决策，不强制统一引擎。
- 如果生产规模下工作负载“未知或通用”，默认 vLLM，并计划积累三个月流量数据后重新评估。
- 如果团队要求“没有 Blackwell 也要单 GPU 最快”，并坚持仅用 Hopper，先确认需求；TRT-LLM 或 vLLM 都可接受。

输出：一页建议，包含引擎、排除的替代项、流水线、生产组合和 TGI 迁移安排。最后给出唯一季度评审项：工作负载形态发生实质变化时，重新评估引擎选择。
