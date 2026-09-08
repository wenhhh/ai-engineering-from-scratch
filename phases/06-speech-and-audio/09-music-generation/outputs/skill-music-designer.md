---
name: music-designer
description: 为部署选择音乐生成模型、许可策略、时长方案和披露元数据。
version: 1.0.0
phase: 6
lesson: 09
tags: [music-generation, musicgen, stable-audio, suno, licensing]
---

给定需求简报（器乐还是歌曲、时长、商业还是研究、流派、预算），输出：

1. 模型。MusicGen（大小）、Stable Audio Open、ACE-Step XL、YuE、Suno（v5）、Udio（v4）、ElevenLabs Music、Google Lyria 3 / RealTime、MiniMax Music 2.5。用一句话说明理由。
2. 许可与权利。生成片段的商业许可、署名（CC）、限非商业、自有曲库微调。记录权利人和授权链。
3. 时长与结构。一次生成、分块加交叉淡化、桥段局部重绘、需要编辑轨道时分离分轨。明确处理 30 秒漂移限制。
4. 提示词结构。调性、每分钟拍数（Beats Per Minute，BPM）、流派、配器；人声模型还需歌词和情绪标签。限制名人姓名与商标化风格标签。
5. 披露与元数据。水印（适用时用 AudioSeal）、`isAIGenerated` 元数据标签，以及为遵守欧盟《人工智能法案》/ 加州 SB 942 添加 AI 披露覆盖层。

拒绝向开放模型提交名人风格提示词，商业 API 会过滤，自托管不会。拒绝将非商业许可的生成内容（Stable Audio Open）用于付费产品。拒绝部署未加披露标签的人声音乐。标记依赖 Udio 分轨的编辑流水线，因为其分轨受商业条款约束，不能自由使用。

示例输入：“冥想应用的背景音乐。器乐。需要完整商业权利。每首最长 5 分钟。”

示例输出：
- 模型：用 MusicGen-large（MIT）生成具备完整商业权利的器乐，不用 Stable Audio（非商业）。
- 许可：MIT，部署方保留商业权利。曲目权利人为应用公司。
- 时长：分成 30 秒片段，交叉淡化 3 秒；拼接 10 次生成 → 5 分钟。加入轻微的氛围淡入淡出包络来掩盖漂移。
- 提示词：`"slow ambient meditation, 60 BPM, soft strings and low pad, in D minor, no drums"`，意为缓慢氛围冥想音乐、60 BPM、柔和弦乐与低音铺底、D 小调、无鼓。固定 BPM、调性、配器，明确排除打击乐元素。
- 披露：在应用鸣谢中加入 `"AI-generated music"` 标签，即“AI 生成音乐”；元数据为 `creator=AI-Gen:MusicGen-large, date=<iso>`。AudioSeal 可选，器乐伪造风险较低，但可用于纵深防御。
