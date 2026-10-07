# 语音备忘录转录流水线（Voice Note Transcriber Pipeline）

将选定 WAV 转为转录、WebVTT 字幕和音频审阅页。你将实现 PCM 解码、声学活动检测、真实 HTTP 识别适配器，以及带音频哈希的可移植导出。

需要 Python 3.10 或更新版本。必需核心仅使用标准库。先掌握字节和上下文管理器，再学习采样率、声道及注入的服务商可调用对象。

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 1 --path my-voice-pipeline --strict
python3 scripts/project_test.py voice-note-transcriber-pipeline --all --solution --strict
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

打开 voice-output/index.html，播放内嵌音频并跳到字幕片段。目录还包含 audio.wav、captions.vtt 和 transcript.json。将 VTT 与页面放在一起，保留下载链接。

原创维修备忘录用操作系统的通用语音在本地合成。配套转录是作者提供的文本，并绑定 WAV 的 SHA256。离线演示用此语音夹具检查流水线，不会执行或声称执行语音识别。

## 转录自己的音频

明确指定兼容 OpenAI、接受 multipart file 和 model 字段的 audio/transcriptions 端点：

```bash
python3 pipeline.py --input YOUR_NOTE.wav --endpoint http://127.0.0.1:8080/v1/audio/transcriptions --model YOUR_MODEL --out voice-output
```

只有端点模式才会上传选定音频。端点需要认证时，TRANSCRIPTION_API_KEY 提供凭据。远程识别器要求 HTTPS；HTTP 仅允许 localhost 和明确的回环 IP 地址。拒绝 URL 凭据及重定向。适配器发送实际 WAV 字节，检查返回文本，限制请求时间和响应大小，并向上传播非超时故障。测试用受控响应检查 multipart 请求，不测量在线识别器准确率。

核心接受单声道有符号 16 位 PCM WAV，CLI 上限为 20 MB。若你已使用 FFmpeg，可先明确转换手机录音：

```bash
ffmpeg -i YOUR_NOTE.m4a -ac 1 -ar 16000 -c:a pcm_s16le YOUR_NOTE.wav
```

FFmpeg 属于可选工具，本项目不会安装。默认识别整段音频。--segment 明确启用基于 RMS 的活动切分，可能遗漏轻声语音或纳入响亮背景噪声。这些时间戳描述选定片段，不是逐词对齐。

## 审阅并修正

编辑导出的 transcript.json 文本字段，保留音频哈希，然后在不联系识别器的情况下重新渲染：

```bash
python3 pipeline.py --input YOUR_NOTE.wav --review-file EDITED_TRANSCRIPT.json --out corrected-output
```

字幕时间必须有限、有序且位于音频时长内。不支持的编码、重叠区间、空文本和不匹配的音频哈希都应明确失败。

1. [解码音频时钟](stages/01-pcm/docs/en.md)
2. [测量声学活动](stages/02-activity/docs/en.md)
3. [向识别器发送 WAV](stages/03-transcribe/docs/en.md)
4. [导出并审阅字幕](stages/04-captions/docs/en.md)

[Python WAV API](https://docs.python.org/3/library/wave.html) 和 [WebVTT 规范](https://www.w3.org/TR/webvtt1/)。实现、口述句子和测试均为原创。

译注：音频、字幕文本、WAV／WebVTT／JSON 字段、哈希、服务商参数与方法标记保留原值。离线参考模式和人工审阅模式不执行语音识别；页面文案汉化不会改变录音或原字幕。

图表限制：WebVTT 示意使用 JavaScript Math.round，真实 Python stamp 使用 round；恰好半毫秒时，向上舍入与偶数舍入可能产生 1 毫秒差异。声学图、请求计数和手动开关不能证明语音识别已经执行。
