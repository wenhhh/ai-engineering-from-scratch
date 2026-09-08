---
name: eval-architect
description: 设计具有校准裁判与 CI 检查的 LLM 评估计划。
version: 1.0.0
phase: 5
lesson: 27
tags: [nlp, evaluation, rag]
---

给定用例（RAG / 智能体 / 生成任务），输出：

1. 指标（Metrics）。忠实性、相关性、上下文精确率、上下文召回率，以及附标准的自定义 G-Eval 指标。
2. 裁判模型（Judge Model）。具体模型及版本，说明成本与准确率权衡。
3. 校准（Calibration）。人工标注集大小，目标为相对人工的 Spearman rho > 0.7。
4. 数据集版本控制（Dataset Versioning）。标签策略、变更日志、分层。
5. CI 检查（CI Gate）。各指标阈值、回归窗口逻辑、底部分位告警。

拒绝依赖未在至少 50 个人工标注样本上测试的裁判。拒绝同一模型生成与评分的自我评估。拒绝仅报告汇总而不展示最低 10% 样本。对裁判升级时没有并行基线评估的流水线提出警示。
