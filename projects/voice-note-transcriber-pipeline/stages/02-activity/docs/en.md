# 测量声学活动，不将其等同于语音检测

> 在 1000 Hz 下，四十个振幅为 0.5 的采样、二十个静音采样和四十个活动采样，在 gap_ms=40 时合并为 [0,100]，持续 100 ms。min_ms=40 时，单独的 20 ms 短脉冲被丢弃。

**Type:** Build
**Stage:** 第 2 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

逐帧计算均方根能量。标记超过阈值的帧，将间隔足够短的相邻活动区间合并，再丢弃短于最小时长的区间。返回半开采样区间，使切片与时间戳共用一套坐标。

```figure
pj-voice-note-transcriber-pipeline-2
```

## 示例推演

在 1000 Hz 下，四十个振幅为 0.5 的采样、二十个静音采样和四十个活动采样，在 gap_ms=40 时合并为 [0,100]，持续 100 ms。min_ms=40 时，单独的 20 ms 短脉冲被丢弃。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `activity(samples, rate, frame_ms=20, threshold=0.02, min_ms=40, gap_ms=40) in activity.py`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

拒绝非有限采样或参数，以及无效的负边界。声学能量不能识别词语、语言或说话人：风扇可能通过，轻声说话可能被遗漏。CLI 默认发送整个片段；--segment 明确选择这种可能丢失信息的能量切分。

## 提示

合并前画出活动帧索引。将间隔条件与最小时长过滤分开。将阈值分别设为略高于和略低于某帧 RMS，解释输出为何变化。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 2 --path my-voice-note-transcriber-pipeline --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

移除安静区域可能丢失哪些信息？如何在自己的录音条件下评估这个检测器？

完成后的项目生成audio.wav、captions.vtt、transcript.json，以及内嵌播放和字幕片段跳转按钮的 HTML 页面。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、策略选择和示例均为原创。
