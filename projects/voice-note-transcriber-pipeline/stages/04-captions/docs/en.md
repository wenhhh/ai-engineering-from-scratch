# 导出可试听并修正的转录

> 夹具 CLI 将原创语音片段与提供的参考文本配对，并清楚标记方法。真实识别使用 --endpoint。检查播放内容后，编辑 transcript.json 中的行，再通过 --review-file 重新渲染；报告必须匹配原始音频哈希。

**Type:** Build
**Stage:** 第 4 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

在输出边界将片段时间渲染为 WebVTT。校验字幕时间有限、有序、不重叠且文本非空。保存原始 WAV 和 JSON 报告，再创建内嵌音频及片段跳转按钮的本地审阅页。字幕表示片段边界，不代表推断出的逐词对齐。

```figure
pj-voice-note-transcriber-pipeline-4
```

图表限制：WebVTT 示意使用 JavaScript Math.round，真实 Python stamp 使用 round；恰好半毫秒时，向上舍入与偶数舍入可能产生 1 毫秒差异。声学图、请求计数和手动开关不能证明语音识别已经执行。

## 示例推演

夹具 CLI 将原创语音片段与提供的参考文本配对，并清楚标记方法。真实识别使用 --endpoint。检查播放内容后，编辑 transcript.json 中的行，再通过 --review-file 重新渲染；报告必须匹配原始音频哈希。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `stamp, captions in captions.py; export_transcript and the CLI in pipeline.py`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

写入 audio.wav、captions.vtt、transcript.json 和 index.html。拒绝结束时间超出音频时长的字幕。在 HTML 中转义转录文本和方法标签。提供 transcript-file 表示哈希绑定的参考模式，不能与分段同时使用。参考模式和审阅模式都不调用服务商。

`export_transcript` 返回的对象与写入 transcript.json 的对象相同：包含 `schema_version=1`、给定的 `method`、原始 WAV 字节的 `audio_sha256`、`duration_seconds` 和保持不变的 `rows`。每行包含以秒计的 start、end 及 text；服务商结果行还可带有片段哈希和尝试次数。导出时保留这些附加字段。时长按解码采样数除以实际采样率计算。将 WAV 编码为 base64 音频源嵌入页面，保证本地打开 HTML 时仍可播放。

## 提示

打开导出的页面，播放真实音频并点击字幕。比较 JSON 行及对应 WebVTT 时间戳。在测试中将字幕改成类似 HTML 的字符串，确认它按文本渲染。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 4 --path my-voice-note-transcriber-pipeline --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

裁剪音频后需要更新哪些字段？为什么可编辑的参考转录是有用的集成测试，却不构成语音识别基准？

完成后的项目生成audio.wav、captions.vtt、transcript.json，以及内嵌播放和字幕片段跳转按钮的 HTML 页面。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、策略选择和示例均为原创。
