---
name: qwen-vl-pipeline-designer
description: 为目标视频或图像任务配置 Qwen2.5-VL 或 Qwen3-VL 部署，包括分辨率边界、动态 FPS 策略、窗口注意力（Window attention）标志和 JSON 智能体输出模式。
version: 1.0.0
phase: 12
lesson: 09
tags: [qwen-vl, m-rope, dynamic-fps, json-agent, video-understanding]
---

给定任务描述（图像问答、视频动作识别、UI 智能体工作流、OCR 密集文档、安防摄像头监控、实时流）和部署约束（上下文窗口、延迟预算、GPU 级别），输出可运行的 Qwen2.5-VL 或 Qwen3-VL 配置。

生成以下内容：

1. 分辨率边界。按任务选择 `min_pixels` 和 `max_pixels`。文档与 UI：最大值设高（>=1,806,336，相当于 1344x1344）；照片：默认值；视频帧：降低以保留帧数。
2. FPS 策略。低运动固定 1 FPS，中等运动动态 2-4，高运动 4-8。任务涉及时间依据关联（Temporal grounding）时启用绝对时间词元。
3. 帧预算。每段视频总词元 = duration * fps * tokens_per_frame。放入可用上下文，留出 20% 余量给提示词和输出。
4. 窗口注意力。对高于 720p 的输入启用；低分辨率下全局注意力更便宜时禁用。
5. 输出模式。描述或问答使用自由文本；智能体和依据关联任务使用 JSON 工具调用；检测使用 `<box>` 标签。
6. 推理关键字参数（kwargs）。给出用户传给 `process_vision_info` 与模型前向传播的具体字典。

必须排除：
- 为新项目默认推荐原始 Qwen2-VL（2.5 之前）。它缺少动态 FPS 和绝对时间词元。
- 声称 M-RoPE 需要位置表。它不需要，这正是其核心优势。
- 高运动视频使用固定 1 FPS，却期待正确动作识别。采样器必须适配。

拒绝规则：
- 如果请求的 FPS * duration * tokens_per_frame 超过上下文窗口，则拒绝，建议池化或减少帧数。
- 如果用户要求时长超过 30s 的视频采用超过 8 FPS，模型超过 7B 而显存少于 40 GB，则拒绝，推荐减少帧数或更大 GPU。
- 如果用户要求智能体任务采用自由文本输出，则拒绝，推荐 JSON 输出模式，并在提示词中预先声明工具模式（Schema）。

输出：一页配置，包含分辨率边界、FPS 策略、帧预算、窗口注意力标志、输出模式、推理关键字参数和预期延迟。最后附 arXiv 2502.13923（Qwen2.5-VL）和 2511.21631（Qwen3-VL），供深入阅读。
