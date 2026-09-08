---
name: feature-extractor
description: 选择与下游音频模型匹配的特征类型、梅尔维数、帧长与帧移以及归一化方式。
version: 1.0.0
phase: 6
lesson: 02
tags: [audio, features, spectrogram, mel]
---

给定目标模型（自动语音识别（Automatic Speech Recognition，ASR）/ 文本转语音（Text-to-Speech，TTS）/ 分类器 / 说话人 / 音乐）和输入音频（采样率、领域），输出：

1. 特征类型。对数梅尔特征、梅尔特征、梅尔频率倒谱系数（Mel-Frequency Cepstral Coefficients，MFCC）、原始波形或离散编解码表示（EnCodec、SoundStream）。用一句话说明原因。
2. 梅尔维数与频率范围。`n_mels`、`fmin`、`fmax`。结合领域（语音或音乐）与目标模型说明理由。
3. 帧长与帧移。`frame_len`、`hop_len`、窗类型。结合所需时间分辨率说明理由。
4. 归一化。逐语句均值/方差、全局统计量，或使用固定参考值的分贝；在特征提取前还是之后执行。
5. 验证代码片段。提供 Python 代码，在 1 秒参考音频上打印结果形状、最小值/最大值、均值/标准差，并断言它们与训练一致。

拒绝交付帧长、帧移或梅尔维数偏离目标模型已公布训练配置的特征流水线。将任何为 Whisper 或 Parakeet 使用 MFCC 的配置标记为错误，因为这些模型接收对数梅尔特征。标记任何缺少归一化断言的特征提取器。
