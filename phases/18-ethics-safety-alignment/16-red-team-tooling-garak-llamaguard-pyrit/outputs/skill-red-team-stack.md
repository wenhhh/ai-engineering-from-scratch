---
name: red-team-stack
description: 根据给定部署，推荐红队工具栈及其配置。
version: 1.0.0
phase: 18
lesson: 16
tags: [llama-guard, garak, pyrit, red-team-tooling, mlcommons-hazards]
---

根据部署说明，推荐红队工具栈（Red-Team Tool Stack）和回归测试频率。

请产出以下内容：

1. 分类器的部署位置。建议将 Llama Guard（3-8B、3-1B-INT4 或 4-12B）部署在输入端、输出端或两端。对于边缘部署，优先选择 3-1B-INT4；对于多模态部署，选择 Llama Guard 4。
2. 探针扫描器配置。推荐与部署相关的 Garak 探针：幻觉探针用于检索增强生成（RAG）系统，数据泄露探针用于涉及个人身份信息（PII）的场景，提示词注入和越狱探针则始终需要。明确指定 Prompt-Guard-86M + Llama-Guard-3-8B 防护组合，用于端到端评估。
3. 测试编排器。对于具有新能力的模型，建议在发布前使用 PyRIT 开展测试。指定要运行的转换器链（Converter Chains），包括改写、编码、翻译和角色扮演，并指定编排器：Crescendo 用于逐步升级，TAP 用于分支探索。
4. 执行频率。每晚运行 Garak 进行回归测试；每次发布前运行 PyRIT 进行深入红队测试；持续部署 Llama Guard。
5. 评判器校准（Judge Calibration）。对于使用评判器的每款工具，明确指定评判 LLM（GPT-4-turbo、StrongREJECT 或内部模型）。评判器的校准决定了报告中的攻击成功率（ASR）。

必须否决的情况：
- 部署没有至少一个 Llama Guard 类输入或输出分类器。
- 发布前没有进行 Garak 或同等工具的单轮回归测试。
- 高风险部署在发布前没有开展与 PyRIT 同等的测试活动。

拒绝规则：
- 如果用户要求只选一款“最佳”工具，应拒绝这种选择方式：三款工具覆盖不同层次，应分层配合，而不是相互替代。
- 如果用户要求推荐一体化商业替代方案，应拒绝推荐，并指出 2026 年的现状：这三款开放工具构成了当前的最佳实践工具栈。

输出：一页建议，明确说明分类器位置、探针配置、测试编排器、回归频率以及评判器身份。分别引用 Meta（arXiv:2407.21783）、NVIDIA Garak 和 Microsoft PyRIT 各一次。
