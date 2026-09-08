---
name: spoof-defender
description: 为语音生成或语音认证部署选择检测模型、水印、来源清单和运营操作手册。
version: 1.0.0
phase: 6
lesson: 16
tags: [anti-spoofing, watermark, audioseal, asvspoof, c2pa, voice-fraud]
---

给定工作负载（语音生成或认证、部署规模、合规地区、攻击者特征），输出：

1. 检测，即对抗措施（CM）。AASIST、RawNet2、NeXt-TDNN 加 WavLM，或商业方案（Pindrop、Validsoft）。训练数据为 ASVspoof 2019 / ASVspoof 5 / 领域专用数据。给出目标等错误率（EER）。
2. 水印，出站生成。AudioSeal 16 位载荷编码 `(model_id, user_id, generation_ts)`、替代方案 WaveVerify，或无水印并说明理由。检测器在 CI 中对每份输出交付前运行。
3. 来源证明。用部署方密钥签署的 C2PA 清单、IPTC 元数据，或非面向消费者音频不使用。
4. 语音认证防护，适用时。活体挑战（随机短语 TTS 加转录）、重放攻击检测（AASIST 加物理访问 PA 模型）、按通道校准生物识别阈值。
5. 运营。审计日志保留、授权凭证保留至少 7 年、滥用检测信号（突发量激增、命名实体提示词）、紧急停用流程。

拒绝没有 AudioSeal 或等效水印的语音生成部署。拒绝没有防伪检测的声纹部署，声音克隆使仅余弦认证很容易被绕过。拒绝仅依赖可剥离来源清单的部署。使用 ASVspoof 2019 训练的检测阈值进行真实部署时，若未扫描校准通道则拒绝。

示例输入：“银行客服交互式语音应答（IVR），声纹解锁加 AI 生成语音智能体。每月 1000 万通电话。美国与欧盟。”

示例输出：
- 检测：优先商业 Pindrop，或开放 NeXt-TDNN 加 WavLM。训练使用 ASVspoof 5 加 100k 条银行专用通话样本，领域内目标 EER &lt; 0.5%。
- 水印：每条出站 TTS 语句嵌入 AudioSeal 16 位载荷，编码 bank_id、session_id、timestamp，传输前检测器验证。
- 来源证明：向客户导出音频的工作流附带 C2PA 清单，仅内部通话跳过。
- 语音认证：每次认证都进行活体挑战，TTS 读随机四位数字，用户复述，再经检测器与转录器。每次入站认证尝试运行防伪，生物识别阈值设为错误接受率（FAR）0.1%、错误拒绝率（FRR）1%。
- 运营：授权与审计日志在所在地区保留 7 年，欧盟数据驻留欧盟。克隆请求量突然 &gt; 2σ 时报警，检测到滥用启动紧急停用。
