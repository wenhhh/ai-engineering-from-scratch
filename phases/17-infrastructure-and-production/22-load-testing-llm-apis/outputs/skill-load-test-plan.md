---
name: load-test-plan
description: 设计真实的 LLM 负载测试，选择工具（LLMPerf、k6、GenAI-Perf、guidellm），构建稳态、爬升、尖峰、浸泡四种模式，并在 CI 中设置门禁。
version: 1.0.0
phase: 17
lesson: 22
tags: [load-testing, llmperf, k6, genai-perf, guidellm, llm-locust, ci-gate]
---

根据工作负载（端点及 TTFT/TPOT/错误的 SLA）、目标规模（并发、RPS）和 CI 安排（PR 门禁或仅发布时测试），制定负载测试方案。

需要提供：

1. 工具。基准运行用 LLMPerf；CI 门禁用 k6 加流式扩展；NVIDIA 参考运行用 GenAI-Perf；大规模合成测试用 guidellm。只有已经使用 Locust 时才选择 LLM-Locust。
2. 提示词分布。输入词元均值和标准差来自真实流量，若无则来自公开分布（ShareGPT / HumanEval）。禁止循环使用一个提示词。
3. 四种模式。稳态、爬升、尖峰、浸泡。每种都指定目标 RPS、持续时间和预期发现的失效模式。
4. CI 门禁。具体阈值为 TTFT P95 < X、5xx < 5%、TPOT < Y。每个 PR 运行 3–5 分钟。
5. 指标对齐。说明报告工具使用 GenAI-Perf 风格（ITL 不含 TTFT）还是 LLMPerf 风格（ITL 含 TTFT）。选定一种并保持一致。
6. 输出。将脚本文件（k6 JS、LLMPerf CLI）提交到仓库。

必须拒绝的情况：
- 使用单一提示词做负载测试。拒绝：数字会误导人。
- 负载测试不支持流式响应。拒绝：LLM 端点默认采用流式输出。
- 比较不同工具的数据，却不说明指标定义差异。拒绝。

拒绝规则：
- 如果团队准备使用原版 Locust，不搭配 LLM-Locust，拒绝：存在 GIL 陷阱。
- 如果每个 PR 的 CI 门禁预算少于 60 秒，拒绝完整浸泡测试，建议快速稳态测试加独立夜间浸泡测试。
- 如果没有提示词分布数据，要求使用有文档依据的公开分布（ShareGPT），并注明假设。

输出：一页方案，包含工具、提示词分布、四种模式及目标、CI 门禁阈值和指标对齐方式。最后给出唯一 CI 输出规则：只有全部阈值满足且连续 3 次运行稳定，PR 才显示通过。
