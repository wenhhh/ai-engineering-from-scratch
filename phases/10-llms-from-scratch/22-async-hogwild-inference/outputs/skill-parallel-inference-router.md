---
name: parallel-inference-router
description: 为推理负载选择投票（Voting）、思维树（Tree of Thought）、多智能体（Multi-Agent）、Hogwild! 或推测解码（Speculative Decoding）策略。
version: 1.0.0
phase: 10
lesson: 22
tags: [parallel-inference, hogwild, speculative-decoding, tree-of-thought, multi-agent, reasoning]
---

给定推理负载概况（每任务词元预算、任务并行特征、模型家族、部署目标、延迟预算），推荐并行推理策略或组合。

产出：

1. 任务分类。长推理（5k 以上词元）、中等思维链（Chain of Thought，CoT）（1k–5k）、短聊天（小于 1k）或分类，以此驱动初步决策。
2. 并行维度。序列内（推测解码）或跨序列（投票、Hogwild!、多智能体）。多数负载应先从序列内并行获益。
3. 策略推荐。从以下选择：仅推测解码（超过 100 词元负载的稳妥默认值）；推测解码 + Hogwild!（有可并行结构的长推理）；思维树（显式分支剪枝问题）；多智能体（角色专业分工问题）；投票集成（高风险分类）。
4. 参数设置。推测解码：草稿家族（默认 EAGLE-3）及 `N`（阶段 10 · 15 技能）。Hogwild!：工作进程（Worker）数 N（2–4，很少更多）、协调提示词模板、确认单节点部署。
5. 组合加速估计。若组合推测解码与 Hogwild!，报告相乘的加速比，典型范围为 3 倍推测解码 * 1.5–2 倍 Hogwild! = 4.5–6 倍。

必须拒绝的情况：
- 少于 2000 词元的负载采用 Hogwild!，协调开销主导。
- 非推理模型采用 Hogwild!，不会涌现协调。
- 无自然角色分解的问题采用多智能体框架。
- 无显式分支剪枝逻辑的思维树，否则退化为线性 CoT。
- 跨节点运行 Hogwild!，缓存同步太慢。

拒绝规则：
- 若负载为实验研究，将 Hogwild! 推荐为实验，而非生产押注。截至 2026 年 4 月，加速依赖任务，现实部署仍少见。
- 若用户要求保证加速，则拒绝，并解释只有推测解码具备强保证性质，即保持输出分布；Hogwild! 依赖经验。
- 若用户显存（Video RAM，VRAM）有限，拒绝 Hogwild! N>2。虽然缓存共享，每个进程仍需自己的激活内存（Activation Memory）。

输出：一页推荐，列出任务分类、并行维度、策略、参数和组合加速估计。以“回滚触发条件”段落结尾，明确具体延迟或准确率指标：若 Hogwild! 在前 100 个生产请求中没有收益，应据此恢复仅使用推测解码。
