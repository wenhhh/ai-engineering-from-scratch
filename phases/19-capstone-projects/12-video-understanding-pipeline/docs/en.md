# 综合实践 12：视频理解流水线（Video Understanding Pipeline，场景、问答与搜索）

> Twelve Labs 将 Marengo + Pegasus 产品化，VideoDB 交付了面向视频的增删改查（Create, Read, Update, Delete，CRUD）API。AI2 的 Molmo 2 发布了开放视觉语言模型（Vision-Language Model，VLM）检查点，Gemini 长上下文原生处理数小时视频，TimeLens-100K 定义了大规模时序定位（Temporal Grounding）。2026 年的流水线已经确定：场景分割（Scene Segmentation）、逐场景描述与嵌入（Embedding）、转录对齐、多向量索引（Multi-Vector Index），查询回答附 (start, end) 时间戳及帧预览。本综合实践要求摄取 100 小时视频，评测公共基准，并测量计数和动作问题上的幻觉（Hallucination）。

**Type:** Capstone
**Languages:** Python（流水线）, TypeScript（界面）
**Prerequisites:** 阶段 4（计算机视觉，CV）、阶段 6（语音）、阶段 7（Transformer）、阶段 11（大语言模型工程）、阶段 12（多模态）、阶段 17（基础设施）
**涉及阶段（Phases exercised）:** P4 · P6 · P7 · P11 · P12 · P17
**Time:** 30 小时

## 问题（Problem）

在 2026 年的规模下，长视频问答是最消耗带宽的多模态问题。Gemini 2.5 Pro 可以原生读取两小时视频，但要将 100 小时视频摄取成可查询语料，仍需场景级索引。生产形态结合场景分割（TransNetV2 或 PySceneDetect）、VLM 逐场景描述生成（Gemini 2.5、Qwen3-VL-Max 或 Molmo 2）、转录对齐（Whisper-v3-turbo，带词级时间戳），以及并排保存描述、帧嵌入与转录的多向量索引。查询流水线用 (start, end) 时间戳和帧预览作答。

评估采用公开基准（ActivityNet-QA、NeXT-GQA），再加自建 100 查询集合。计数和动作类问题上的幻觉是已知的棘手失败类别；本综合实践明确测量它。

## 概念（Concept）

摄取时三条流水线并行运行。**场景分割（Scene Segmentation）**将视频切成场景。**VLM 描述生成（VLM Captioning）**为每个场景生成描述，并从关键帧（Keyframe）得到帧嵌入。**自动语音识别对齐（Automatic Speech Recognition Alignment，ASR Alignment）**生成词级时间戳。三路数据按 (scene_id, 时间范围) 连接。每个场景在 Qdrant 多向量索引中获得三类向量：描述嵌入、关键帧嵌入、转录嵌入。

查询时，自然语言问题同时检索三类向量；结果用倒数排名融合（Reciprocal Rank Fusion，RRF）合并；TimeLens 风格的时序定位适配器（Adapter）在排名最高的场景内细化 (start, end) 窗口。VLM 综合生成器（Gemini 2.5 Pro 或 Qwen3-VL-Max）接收查询、排名靠前的场景和裁剪帧，输出带引用时间戳和帧预览的答案。

幻觉测量很重要。计数问题，如“有多少人进入房间？”，以及动作类问题，如“厨师是否先倒入再搅拌？”，向来不可靠。必须将其准确率与描述类问题分开报告。

## 架构（Architecture）

```
视频文件 / URL
      |
      v
PySceneDetect / TransNetV2（场景分割）
      |
      +--- 逐场景关键帧 --- VLM 描述 + 帧嵌入
      |                            (Gemini 2.5 Pro / Qwen3-VL-Max / Molmo 2)
      |
      +--- 音轨 --- Whisper-v3-turbo ASR + 词级时间戳
      |
      v
多向量 Qdrant：{caption_emb, keyframe_emb, transcript_emb}
      |
查询：
  同时对三类向量做稠密查询 -> RRF 合并 -> 前 k 个场景
      |
      v
TimeLens / VideoITG 时序定位（在场景内细化 start/end）
      |
      v
VLM 综合生成：查询 + 前列场景 + 帧预览
      |
      v
答案 + (start, end) 时间戳 + 帧缩略图 + 引用
```

## 技术栈（Stack）

- 场景分割：TransNetV2（2024–26 年最先进水平）或 PySceneDetect
- ASR：通过 faster-whisper 运行 Whisper-v3-turbo，带词级时间戳
- VLM 描述生成器与问答器：Gemini 2.5 Pro、Qwen3-VL-Max 或 Molmo 2
- 时序定位：在 TimeLens-100K 上训练的适配器，或 VideoITG
- 索引：Qdrant 多向量支持（描述 / 帧 / 转录）
- 界面：Next.js 15，带 HTML5 视频播放器和场景缩略图
- 评估：ActivityNet-QA、NeXT-GQA、自建 100 题人工标注集
- 幻觉基准：带人工标签的计数与动作类子集

```figure
cf-scene-index
```

## 动手实现（Build It）

1. **摄取遍历器（Ingest Walker）。** 接受 YouTube URL 或本地 MP4。必要时降采样到 720p。持久保存 `{video_id, file_path}`。

2. **场景分割（Scene Segmentation）。** 运行 TransNetV2 或 PySceneDetect，生成 `[{scene_id, start_ms, end_ms, keyframe_path}]`。目标 100 小时，约 6000–8000 个场景。

3. **语音识别处理（ASR Pass）。** 对音频运行 Whisper-v3-turbo，导出词级时间戳，切成逐场景转录片段。

4. **VLM 描述生成（VLM Captioning）。** 对每个场景，以关键帧和简短描述模板调用 Gemini 2.5 Pro 或 Qwen3-VL-Max。生成描述与帧嵌入。

5. **多向量索引（Multi-Vector Index）。** Qdrant 集合含三个命名向量。载荷（Payload）：`{video_id, scene_id, start_ms, end_ms, keyframe_url}`。

6. **查询（Query）。** 自然语言问题发起三次稠密查询，用倒数排名融合合并，保留 top-k=5 个场景。

7. **时序定位（Temporal Grounding）。** 在排名最高场景上运行 TimeLens 风格适配器，在场景内细化 (start, end) 窗口。

8. **VLM 综合生成（VLM Synth）。** 以查询、前 3 个场景片段（图像或短片）、转录调用 Gemini 2.5 Pro。要求引用采用 `(video_id, start_ms, end_ms)`。

9. **评估（Eval）。** 运行 ActivityNet-QA 和 NeXT-GQA，构建 100 查询自定义集合。报告总体准确率与逐类别明细：计数、动作、描述。

## 实际应用（Use It）

```
$ video-qa ask --url=https://youtube.com/watch?v=X "how many cars pass the intersection in the first minute?"
[scene]    23 scenes detected
[asr]      transcript complete, 4m12s
[index]    69 vectors written (23 scenes x 3)
[query]    top scene: scene 3 [01:32-01:54], confidence 0.84
[ground]   refined window: [00:12-00:58]
[synth]    gemini 2.5 pro, 1.4s
answer:    5 cars pass the intersection between 00:12 and 00:58.
citations: [scene 3: 00:12-00:58]
          [frame preview at 00:14, 00:27, 00:44, 00:51, 00:57]
```

## 交付成果（Ship It）

`outputs/skill-video-qa.md` 是交付物。给定 YouTube URL 或上传视频，流水线索引场景，并用带时间戳的引用回答问题。

| 权重 | 标准 | 衡量方式 |
|:-:|---|---|
| 25 | 时序定位交并比（Intersection-over-Union，IoU） | 留出定位集上的交并比 |
| 20 | 问答准确率 | NeXT-GQA 与自建 100 查询集合 |
| 20 | 摄取吞吐量 | 每美元处理的视频小时数 |
| 20 | 界面与引用用户体验（UX） | 时间戳链接、缩略图条、跳转到帧 |
| 15 | 幻觉率 | 分别报告计数与动作类准确率 |
| **100** | | |

## 练习（Exercises）

1. 描述生成阶段将 Gemini 2.5 Pro 换为 Qwen3-VL-Max。在人工评分的 50 场景样本上报告描述质量差值。

2. 将逐场景帧嵌入简化为一个池化向量（Pooled Vector），而非多向量。测量检索退化。

3. 构建“严格计数”模式：综合生成器提取每个被计数实例及其时间戳，用户点击验证。测量用户验证是否减少幻觉。

4. 对摄取成本做基准测试：比较三种 VLM 的每美元视频小时数，选取最佳折中点。

5. 增加区分说话人的转录：对音频运行 pyannote 说话人分离（Speaker Diarization），嵌入逐说话人转录。演示“Alice 对 X 说了什么？”查询。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|------------------------|
| 场景分割（Scene Segmentation） | “镜头检测（Shot Detection）” | 在镜头边界将视频切成场景 |
| 多向量索引（Multi-Vector Index） | “描述 + 帧 + 转录” | Qdrant 集合为每种表示设置命名向量 |
| 时序定位（Temporal Grounding） | “究竟何时发生” | 细化查询答案对应的 (start, end) 窗口 |
| 帧嵌入（Frame Embedding） | “视觉表示” | 关键帧的向量嵌入，用于场景视觉相似度 |
| 倒数排名融合（Reciprocal Rank Fusion，RRF） | “倒数排名融合” | 合并多个排序列表的策略，经典混合检索技巧 |
| 计数幻觉（Counting Hallucination） | “数错” | VLM 回答“多少个 X”问题的已知失败模式 |
| ActivityNet-QA | “视频问答基准” | 长视频问答准确率基准 |

## 延伸阅读（Further Reading）

- [AI2 Molmo 2](https://allenai.org/blog/molmo2)：开放 VLM 检查点
- [TimeLens（CVPR 2026）](https://github.com/TencentARC/TimeLens)：大规模时序定位
- [Gemini 视频长上下文](https://deepmind.google/technologies/gemini)：托管参考
- [VideoDB](https://videodb.io)：视频增删改查 API 参考
- [Twelve Labs Marengo + Pegasus](https://www.twelvelabs.io)：商业参考
- [TransNetV2](https://github.com/soCzech/TransNetV2)：场景分割模型
- [PySceneDetect](https://github.com/Breakthrough/PySceneDetect)：经典开放替代方案
- [ActivityNet-QA](https://arxiv.org/abs/1906.02467)：参考评估基准
