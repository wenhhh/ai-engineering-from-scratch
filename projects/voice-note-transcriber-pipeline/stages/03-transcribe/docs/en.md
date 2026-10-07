# 通过识别器接口发送真实 WAV 字节

> 服务商先超时后成功时，记录 attempts=2。每行输出保留 start、end、text 及准确编码片段的 SHA256。第二个片段不能与前一个重叠，采样索引也不能是小数。

**Type:** Build
**Stage:** 第 3 阶段，共 4 阶段
**Time:** 约 2 小时

## 有用的边界

调用服务商之前，将每个选定区间编码为完整 WAV。真实 HTTP 适配器向明确配置的 audio/transcriptions 端点发送 multipart 表单，其中包含 model 和 file 字段。解析返回文本，拒绝空结果或格式损坏的结果。选择端点就是明确的上传边界。

```figure
pj-voice-note-transcriber-pipeline-3
```

## 示例推演

服务商先超时后成功时，记录 attempts=2。每行输出保留 start、end、text 及准确编码片段的 SHA256。第二个片段不能与前一个重叠，采样索引也不能是小数。

编码前写出返回字段及预期副作用次数。另保留一个应失败的输入，防止把成功示例写成硬编码答案。

## 实现契约

在学习者工作区实现 `transcribe(...) in transcribe.py; http_recognizer(endpoint, model, api_key, timeout) in provider.py`。保留导出名称，继续复用前面阶段，不要复制一套相同策略。

允许零至五次重试，仅重试 TimeoutError，并记录尝试次数。适配器要求远程端点使用 HTTPS；HTTP 仅允许 localhost 或明确的 IPv4／IPv6 回环地址。校验主机名及端口，拒绝 URL 内嵌凭据、片段和空白。通过专用 urllib opener 拒绝每次重定向，其 HTTPRedirectHandler.redirect_request 返回 None，使凭据和音频始终绑定所选端点。另检查 WAV 签名、20 MB 上传上限、1 MB 响应上限，以及最长 120 秒超时。TRANSCRIPTION_API_KEY 提供可选认证。受控传输测试验证真实 multipart 序列化，不测量识别准确率。

## 提示

在测试中捕获发出的请求，确认其中是 WAV 字节而非文件名字符串。让测试端点返回另一句留出文本。将来源哈希与文本放在一起，使经过审阅的转录能关联到真实音频。

## 验证你的实现

```bash
python3 scripts/project_test.py voice-note-transcriber-pipeline --init my-voice-note-transcriber-pipeline
python3 scripts/project_test.py voice-note-transcriber-pipeline --stage 3 --path my-voice-note-transcriber-pipeline --strict
```

只初始化一次。累计测试导入你的工作区，保留此前源码。参考实现运行用于验证教学实现，绝不授予学习者证书。可选 SDK 检查所需依赖与命令见项目 README。

## 检查结果

为什么认证错误应立即失败，而不是消耗超时重试预算？音频哈希能证明什么，又不能证明什么？

完成后的项目生成audio.wav、captions.vtt、transcript.json，以及内嵌播放和字幕片段跳转按钮的 HTML 页面。

```bash
cd projects/voice-note-transcriber-pipeline/solution
python3 pipeline.py --input fixtures/repair-note.wav --transcript-file fixtures/reference.json --out voice-output
```

用自己工作流中的少量输入替换夹具。将预期结果与观察到的证据放在一起，另保留一组用例用于评估。服务商请求测试验证序列化和控制流程，不能证明模型质量。

## 权威参考资料

[官方 API 文档](https://docs.python.org/3/library/wave.html)。实现、策略选择和示例均为原创。
