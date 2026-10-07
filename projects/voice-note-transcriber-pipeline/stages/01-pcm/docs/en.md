# 处理前先解码音频时钟

> 整数采样 0、16384 和 -16384 分别变为 0、0.5 和 -0.5。在 16000 Hz 下，采样索引 800 表示 0.05 秒。若按 8000 Hz 解释同一个索引，即使字节完全未变，时间戳也会翻倍。

**Type:** Build
**Stage:** 第 1 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

解释字节前，先读取 WAV 头部。核心接受未压缩的单声道有符号 16 位 PCM，以 32768 归一化采样。保留真实采样率：后续每个时间戳均由采样索引除以该采样率得到。遇到不支持的立体声或压缩输入时，必须明确失败。

```figure
pj-voice-note-transcriber-pipeline-1
```

## 示例推演

整数采样 0、16384 和 -16384 分别变为 0、0.5 和 -0.5。在 16000 Hz 下，采样索引 800 表示 0.05 秒。若按 8000 Hz 解释同一个索引，即使字节完全未变，时间戳也会翻倍。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `decode_wav(data), encode_wav(samples, rate=16000) in pcm.py`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

原创 repair-note.wav 是用本地操作系统语音合成的 5.685 秒句子。配套 reference.json 包含作者提供的文本和原始 WAV 哈希。这是语音测试夹具，不证明项目完成了语音识别。运行已提交夹具不需要原生成工具。

## 提示

解包前检查声道数、采样字节宽度和压缩类型。确认字节数等于声明帧数乘以二。测试负采样和最大正有符号数处的截断。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 1 --path my-voice-note-transcriber-pipeline --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

为什么采样值正确，猜测采样率仍会导致字幕错误？处理手机语音备忘录前应先做哪种转换？

完成后的项目生成audio.wav、captions.vtt、transcript.json，以及内嵌播放和字幕片段跳转按钮的 HTML 页面。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、策略选择和示例均为原创。
