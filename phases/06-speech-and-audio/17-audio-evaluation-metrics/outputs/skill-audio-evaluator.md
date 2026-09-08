---
name: audio-evaluator
description: 为任意音频模型发布选择指标、基准、归一化规则和报告格式。
version: 1.0.0
phase: 6
lesson: 17
tags: [evaluation, wer, mos, utmos, eer, der, fad, mmau, leaderboard]
---

给定任务（自动语音识别、文本转语音、克隆、说话人验证、说话人分离、分类、音乐、大型音频语言模型、流式语音到语音），输出：

1. 主指标。词错误率 WER、平均意见分 MOS、UTMOS、说话人嵌入余弦相似度 SECS、等错误率 EER、说话人分离错误率 DER、平均精度均值 mAP、弗雷歇音频距离 FAD、MMAU-Pro 准确率、延迟 P95。选一个。
2. 次指标。额外 1–3 个维度，如速度、多样性、稳健性，并说明理由。
3. 归一化规则。转小写、去标点、数字展开、空白合并。使用 Whisper-normalizer 或自定义方案，并记录。
4. 公共基准。报告所依据的标准排行榜，如 Open ASR、TTS Arena、MMAU-Pro、VoxCeleb1-O、AudioSet、LongAudioBench。
5. 内部集合。N 个样本的领域留出数据，按人口特征与声学切片细分。
6. 报告格式。分布，延迟用 P50/P95/P99、分类用逐类召回率、MMAU 按类别。提供发布说明模板。

拒绝用单一数字评估延迟，须报告百分位。拒绝分类仅汇总，须逐类报告。拒绝 TTS 发布缺少 MOS/UTMOS，以及克隆时缺少 SECS。拒绝 ASR 发布没有 WER 归一化规格。拒绝音乐发布仅用 FAD，始终搭配人工 MOS 听评组。

示例输入：“发布新的英语–西班牙语对话 TTS，需要证明它优于现有 Cartesia-Sonic 基线。”

示例输出：
- 主指标：UTMOS，每语言 50 条提示词的配对音频；人工 MOS，每语言 20 名听者，与基线盲测 A/B。
- 次指标：首音频时间（Time to First Audio，TTFA）中位数与 P95，必须达到基线；对固定声音参考 SECS &gt; 0.80，确保说话人不退化；往返 ASR（Whisper-large-v3-turbo）的 CER &lt; 2%。
- 归一化：英语用 Whisper-normalizer，西班牙语用 Hugging Face multilingual-normalizer，计算往返 WER。
- 公共基准：TTS Arena（英语）与 Artificial Analysis Speech，用于相对 ELO 定位。目标是与最近竞争对手差距不超过 50 ELO。
- 内部数据：200 条留出提示词，每语言 100 条，覆盖金额、日期、产品名、两句旁白、情绪朗读、语码混合；10 种人口特征声音。
- 报告：发布说明突出 UTMOS 与 MOS，包含 P50/P95 TTFA 直方图、SECS 累积分布函数（CDF）、CER 逐类细分及失效模式说明，如语码混合提示词失败率 X%。
