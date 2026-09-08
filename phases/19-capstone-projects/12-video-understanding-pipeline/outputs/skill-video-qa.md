---
name: video-qa
description: 构建视频理解（Video Understanding）流水线，包含场景分割、多向量索引、时序定位与带时间戳引用。
version: 1.0.0
phase: 19
lesson: 12
tags: [capstone, video, multimodal, gemini, qwen-vl, molmo, transnet, qdrant]
---

给定 100 小时视频，构建摄取流水线和查询系统，以 (start, end) 时间戳与帧预览回答自然语言问题。

构建计划（Build Plan）：

1. 摄取视频（YouTube URL 或 MP4）；必要时降采样至 720p。
2. 用 TransNetV2 或 PySceneDetect 进行场景分割（Scene Segmentation）；输出 `[{scene_id, start_ms, end_ms, keyframe_path}]`。
3. 用 Whisper-v3-turbo（faster-whisper）进行自动语音识别（Automatic Speech Recognition，ASR），生成词级时间戳，按场景切片。
4. 用 Gemini 2.5 Pro、Qwen3-VL-Max 或 Molmo 2 进行 VLM 描述生成（Captioning）；输出描述与帧嵌入。
5. Qdrant 多向量索引（Multi-Vector Index），每场景有三个命名向量（caption_emb、frame_emb、transcript_emb），载荷为 {video_id, scene_id, start_ms, end_ms, keyframe_url}。
6. 查询：三次并行稠密查询，以倒数排名融合（Reciprocal Rank Fusion）合并，保留 top-k=5 个场景。
7. 时序定位（Temporal Grounding，TimeLens 适配器或 VideoITG）在排名最高场景内细化 (start, end)。
8. VLM 综合生成（Synthesis，Gemini 2.5 Pro）接收查询、前 3 个场景片段与转录；要求 `(video_id, start_ms, end_ms)` 引用。
9. 在 ActivityNet-QA、NeXT-GQA 和 100 查询人工标注自定义集上评估。报告总体准确率及逐问题类别准确率：描述、计数、动作。

评估标准（Assessment Rubric）：

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 时序定位交并比（Intersection-over-Union，IoU） | 留出定位集上的 IoU |
| 20 | 问答准确率 | NeXT-GQA 与 100 查询自定义集 |
| 20 | 摄取吞吐量 | 每美元索引的视频小时数 |
| 20 | 界面与引用用户体验（UX） | 时间戳链接、缩略图条、跳转到帧 |
| 15 | 幻觉率 | 分别报告计数与动作类准确率 |

直接判定不合格的情况（Hard Rejects）：

- 流水线将每个场景池化为单个向量。必须使用多向量，才能体现类别区别。
- 答案没有 (start, end) 引用。
- 仅报告总体准确率，没有计数／动作子集明细。
- VLM 综合生成不直接接收场景帧：纯文本输入会丢失视觉依据关联（Visual Grounding）。

拒绝规则（Refusal Rules）：

- 拒绝提供许可来源不明的视频；每个 video_id 必须有许可标签。
- 当摄取速率超过实测吞吐量时，拒绝声称“实时”响应。
- 拒绝将计数／动作幻觉数值隐藏在总体准确率中。

输出：一个仓库，包含场景分割、ASR 与描述生成流水线，多向量 Qdrant 集合，时序定位适配器，带时间戳深层链接（Deep-Link）的 Next.js 15 查看器，三个基准结果（ActivityNet-QA、NeXT-GQA、自定义集），以及说明观察到的三种计数或动作类失败和分别减少这些失败的检索或生成改动的报告。
