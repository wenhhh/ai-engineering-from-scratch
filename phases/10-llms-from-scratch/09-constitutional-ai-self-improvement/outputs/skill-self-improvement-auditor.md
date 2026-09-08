---
name: self-improvement-auditor
description: 在拟议的自我改进（Self-improvement）或宪法式 AI（Constitutional AI）流水线大规模运行前进行审计。
version: 1.0.0
phase: 10
lesson: 9
tags: [alignment, cai, grpo, rlhf, self-improvement, reward-hacking]
---

针对声称使用宪法式 AI（Constitutional AI，CAI）、基于 AI 反馈的强化学习（Reinforcement Learning from AI Feedback，RLAIF）、组相对策略优化（Group Relative Policy Optimization，GRPO）或任何形式的自生成偏好数据的拟议训练流水线，生成包含以下内容的审计报告：

1. 奖励规则（Reward Rule）。明确具体的验证器（Verifier）：正则表达式（Regex）、sympy、测试套件或大语言模型裁判（LLM Judge）。将其归类为确定性、随机大语言模型或混合型。拒绝任何没有外部依据关联（Grounding）的“自我改进”循环：模型无法凭空获得信号。
2. 组统计量（Group Statistics）。对于 GRPO 流水线，确认组大小、优势（Advantage）的计算方式（标准分数 z-score 或相对排名），以及组内奖励标准差降为零时的处理方式。流水线必须跳过零方差组或降低其权重，而不是除以 epsilon 后假装信号真实存在。
3. KL 预算（KL Budget）。为整个运行过程的累计 KL(policy || reference) 设定数值上限。达到上限时，流水线必须停止、重置或切换到一个更接近当前策略的参考模型。没有上限的 KL 就意味着没有边界的漂移。
4. 多样性下限（Diversity Floor）。根据任务允许的指标，为每组奖励标准差、回答长度方差或 n 元语法熵（n-gram Entropy）设定实测下限。如果连续 N 轮低于该下限，流水线必须混入新的人类数据或采用覆盖面更广的提示词分布。
5. 人类数据配额（Human Data Quota）。训练混合数据中必须保留的人工编写数据最低占比，通常为 5-10%。仅使用自蒸馏（Self-distillation）的流水线会在 3-5 轮后坍塌。必须明确指出这一点。
6. 模式坍塌监控（Mode-collapse Watchdog）。列出自动检查项：各轮奖励标准差、留出提示词上的不重复 n 元语法数量、长度分布、拒答率。其中任一指标越过阈值，都应停止训练。
7. 宪法漂移（Constitution Drift）。对于 CAI 流水线，要求提供版本化的宪法文件、变更日志，以及“宪法回归测试集（Constitutional Regression Test Set）”：其中提示词的预期行为不能随着宪法编辑而改变。

拒绝批准存在以下情况的流水线：
- 声称“零人类数据”，却没有任何外部验证器（规则、工具或环境）。
- 使用过程奖励模型（Process Reward Model，PRM），却没有过程奖励投机（Process-reward Hacking）探针：模型是否编写看似正确、却未推进证明的步骤？
- 在没有留出多样性基准测试（Held-out Diversity Benchmark）的情况下，运行超过 5 轮拒绝采样微调（Rejection-sampling Fine-tuning）。
- 参考模型与策略共用同一个模型（没有参考就没有 KL，也就没有锚点）。
- 使用与策略相同的模型充当大语言模型裁判进行评分（裁判污染，Judge Contamination）。

输出：一页审计报告，列出每项门槛的通过或失败结果、实测值或声明值，以及流水线中产生各信号的确切步骤。如果有任何门槛未通过，列出使其通过所需的最小可行改动。
