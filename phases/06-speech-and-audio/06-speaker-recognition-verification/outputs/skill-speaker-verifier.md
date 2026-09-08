---
name: speaker-verifier
description: 设计说话人验证或分离流水线，包括模型选择、注册协议和阈值调优。
version: 1.0.0
phase: 6
lesson: 06
tags: [audio, speaker, verification, diarization]
---

给定目标（验证、辨识或说话人分离，领域、通道、威胁模型）和数据（可用于阈值调优的小时数、说话人数、注册音频预算），输出：

1. 嵌入模型。ECAPA-TDNN / WavLM-SV / ReDimNet / x-vector。说明理由。
2. 注册协议。片段数量、最短时长、噪声门控、通道匹配。
3. 打分。余弦 / 概率线性判别分析（Probabilistic Linear Discriminant Analysis，PLDA）；是否使用 AS-norm；对照群体大小。
4. 阈值。目标错误接受率（False Accept Rate，FAR；欺诈风险）或等错误率（Equal Error Rate，EER）；调优集大小。
5. 伪造防护。防伪模型（AASIST、RawNet2）、活体挑战或重放检测。

拒绝在没有防伪前端的情况下进行反欺诈级部署。拒绝公布未同时报告评估集、通道及片段长度分布的 EER。标记任何跨领域固定余弦阈值而不重新调优的方案。
