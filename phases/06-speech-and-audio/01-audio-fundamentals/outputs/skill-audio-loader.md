---
name: audio-loader
description: 对照目标模型的要求验证原始音频文件，并安全地重采样。
version: 1.0.0
phase: 6
lesson: 01
tags: [audio, speech, preprocessing]
---

给定音频文件（路径、声道数、采样率、位深、编解码器）和目标模型（具有采样率与声道数要求的自动语音识别（Automatic Speech Recognition，ASR）/ 文本转语音（Text-to-Speech，TTS）/ 分类器），输出：

1. 不匹配项。列出文件与目标不符的所有维度（采样率、声道数、最短时长、削波检查）。
2. 重采样方案。源采样率、目标采样率、重采样库（`torchaudio.transforms.Resample` 或 `librosa.resample`）、抗混叠滤波器类型。
3. 声道方案。单声道合并策略（取均值或仅左声道），或在模型支持时直接传递多声道。
4. 归一化。选择峰值归一化还是均方根（Root Mean Square，RMS）归一化、相对满量程分贝（Decibels Relative to Full Scale，dBFS）目标、削波保护。
5. 验证代码片段。提供加载文件、执行变换并断言最终数组符合 `(target_sr, dtype, channel_count, range)` 的 Python 代码。

拒绝不带抗混叠滤波器的降采样。拒绝不带重建滤波器的超过 2 倍升采样。标记削波峰值超过 ±0.999 或直流偏置超过 ±0.01 的任何输入文件。
