---
name: ai-tutor
description: 交付特定学科的自适应多模态个人导师，具备贝叶斯知识追踪、课程图谱、安全过滤，并进行两周效果研究测量。
version: 1.0.0
phase: 19
lesson: 17
tags: [capstone, tutor, adaptive, bkt, fsrs, livekit, multimodal, coppa]
---

给定学科（K-12 代数或 Python 入门），构建个人导师，具备文本、语音、数学题拍照输入，贝叶斯知识追踪（Bayesian Knowledge Tracing，BKT）学习者模型，课程图谱驱动概念选择，考虑 COPPA 的记忆与安全过滤。让 10 名学习者参加两周效果研究。

构建计划（Build Plan）：

1. Neo4j 课程图谱（Curriculum Graph）：50–150 个概念节点，附先修边与开放教育资源（Open Educational Resources，OER）内容，如 OpenStax、Open Textbook。
2. 学习者模型（Learner Model）：BKT 使用逐概念猜测／失误／学习率先验；逐学习者持久保存状态。
3. 导师策略（Tutor Policy，LangGraph 调用 Claude Sonnet 4.7，启用提示词缓存）：read_signal -> select_concept（图遍历）-> scaffold（苏格拉底式）-> update_mastery。
4. 记忆（Memory）：agentmemory 风格持久情景与语义存储；考虑 COPPA，一年后自动删除；家长可操作删除。
5. 语音：LiveKit Agents 工作者，采用 Whisper-v3-turbo ASR 和 Cartesia Sonic-2 TTS；复用综合实践 03 流水线。
6. 数学题拍照：dots.ocr 或 PaliGemma 2 识别方程，将结构化输入交给导师。
7. 安全：Llama Guard 4 处理输入／输出；适龄过滤器阻断自伤、成人内容、暴力；按学习者隔离记忆。
8. 逐学习者每周生成 PDF 进度报告。
9. 效果研究（Efficacy Study）：10 名学习者，标准化 30 题前测基线，两周每周 3 次交互，随后后测；与非自适应线性教学组比较。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 学习增益变化 | 10 学习者两周研究的前后测变化 |
| 20 | 苏格拉底式忠实度（Socratic Fidelity） | 对交互记录样本按标准评分 |
| 20 | 多模态用户体验（UX） | 语音、照片、文本端到端连贯性 |
| 20 | 安全与隐私保障 | Llama Guard 4 通过率 + 考虑 COPPA 的保留策略 + 学习者间隔离 |
| 15 | 课程广度与图谱质量 | 概念覆盖 + 先修图一致性 |

直接判定不合格的情况（Hard Rejects）：

- 导师直接倾倒答案，而非提出下一问题。苏格拉底式是硬性要求。
- 学习者模型不逐交互更新。BKT 是最低要求。
- 记忆没有考虑 COPPA 的保留策略，对 K-12 用户不可接受。
- 声称有效，却没有非自适应基线组。

拒绝规则（Refusal Rules）：

- 输入与输出未同时使用 Llama Guard 4 时，拒绝部署。
- 没有家长可用删除入口时，拒绝持久保存学习者数据。
- 未同时运行非自适应基线时，拒绝声称“自适应”。

输出：一个仓库，包含课程图谱、BKT 学习者模型、LangGraph 导师策略、多模态输入处理器、LiveKit 语音流水线、安全流水线、家长仪表盘、效果研究运行器、前后测框架，以及记录相对线性基线学习增益并附置信区间（Confidence Interval）的报告。
