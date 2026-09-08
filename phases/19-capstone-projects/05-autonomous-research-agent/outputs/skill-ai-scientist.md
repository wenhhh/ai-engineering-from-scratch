---
name: ai-scientist
description: 构建自主研究智能体（Autonomous Research Agent），执行实验树搜索（Tree Search），利用视觉评议（Vision Critique）撰写 LaTeX 论文，并通过沙箱逃逸（Sandbox Escape）红队测试。
version: 1.0.0
phase: 19
lesson: 05
tags: [capstone, autonomous-agent, ai-scientist, sakana, langgraph, sandbox, research]
---

给定一个初始想法、一个狭窄领域和 30 美元计算预算，构建智能体（Agent），执行实验树搜索、撰写可供评审的 LaTeX 论文，并输出可复现材料包（Reproducibility Bundle）。

构建计划（Build Plan）：

1. 文献调研（Literature Pass）：Semantic Scholar Graph API + OpenAlex；将摘要缓存在 FAISS 中；生成一页领域概览。
2. 树搜索：对实验节点实现最佳优先扩展（Best-First Expansion），使用 `expand(node) -> children`（每个子节点修改一项配置）以及 `score(node) = novelty*0.4 + quality*0.5 + budget*0.1`。
3. 每节点沙箱（Per-Node Sandbox）：每个实验运行 `docker run --network=none --memory=8g --cpus=2 --pids-limit=256 --read-only` 或等效 E2B 策略；使用确定性随机种子；强制执行资源上限。
4. 计划／执行／验证（Plan-Execute-Verify）：验证步骤检查损失是否收敛、基线是否运行，以及消融实验是否隔离出论断所指效应。
5. 写作器（Writer）：生成 LaTeX、编译成 PDF，将 PDF 交给 Claude Opus 4.7 视觉模式评议版式及论断与证据的一致性，最多迭代 3 次。
6. 评审器集成（Reviewer Ensemble）：五个裁判（Opus 4.7、GPT-5.4、Gemini 3 Pro、DeepSeek R1、Qwen3-Max）按 NeurIPS 标准为新颖性、严谨性、清晰度、可复现性和影响力评分；平均分 < 4.0 时返回写作器。
7. 红队测试（Red Team）：集成对抗任务（进程炸弹、文件系统逃逸、LLM 编写的网络调用）。确认全部被阻止。输出 `red_team.md`。
8. 可复现材料包：paper.pdf + review.md + 树搜索轨迹 JSON + 随机种子 + W&B 运行链接 + 沙箱配置 + 一行重新运行命令。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 论文质量 | 依据评分标准进行盲评，与相同初始主题的已发表研讨会论文比较 |
| 20 | 实验严谨性 | 基线、随机种子、消融；每项论断都有结果表中的一个单元格支持 |
| 20 | 成本与计算资源纪律 | 强制执行每篇论文 30 美元上限，由 Langfuse 追踪 |
| 20 | 安全 | 通过沙箱红队测试；以已记录的尝试验证网络策略和紧急停止开关（Kill-Switch） |
| 15 | 可复现性 | 一条命令用相同随机种子重新运行，即可复现论文 |

直接判定不合格的情况（Hard Rejects）：

- 实验在沙箱外运行。本综合实践的核心主张就是执行受到隔离约束。
- 写作步骤不重新读取编译后的 PDF（视觉评议是关键支撑）。
- 论文没有基线、随机种子或消融章节。
- 成本预算仅在事后告警，没有硬性上限。

拒绝规则（Refusal Rules）：

- 除非人工明确覆盖决定，否则拒绝发表评审平均分低于 4.0/5 的论文。
- 拒绝运行需要在沙箱内部访问网络的初始想法。改为增加单独的只读数据集卷（Volume）。
- 若论文的红队测试尚未执行并记录，则拒绝重新运行。

输出：一个仓库，包含树搜索引擎、沙箱策略、写作器／评审器循环、三次附带可复现材料包的示例运行、红队报告、成本台账 csv，以及说明复现了哪些 Sakana v2 失败模式及缓解措施如何起效的报告。
