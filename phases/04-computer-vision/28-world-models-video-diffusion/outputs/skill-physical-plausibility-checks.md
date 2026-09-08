---
name: skill-physical-plausibility-checks
description: 在交付生成视频前，自动检查对象恒存性、重力和连续性
version: 1.0.0
phase: 4
lesson: 28
tags: [video-generation, quality, physics, evaluation]
---

# 物理合理性检查（Physical Plausibility Checks）

生成视频的生产部署需要自动化防护。人工复核难以扩展，物理检查可捕捉经典失效模式。

## 适用场景（When to use）

- 任何根据文本或图像提示生成视频的产品。
- 为视频生成 API 端点自动执行质量保证（Quality Assurance，QA）。
- 监控微调或基础模型更新后的视频质量漂移。

## 输入（Inputs）

- `video`：`(T, H, W, 3)` 张量，或 mp4 路径。
- 可选参考信息：预期对象数量、初始场景描述。

## 检查项（Checks）

### 1. 对象恒存性（Object permanence）
使用 SAM 3.1 Object Multiplex 跨帧跟踪每条检测。当稳定轨迹消失不超过 3 帧后重新出现时，标记异常，表示模型暂时丢失对象。对象在画面中心附近消失（而非边缘）时记为严重失败，在边缘消失则记为轻度失败。

### 2. 运动平滑性（Motion smoothness）
连续帧之间的光流（Optical Flow）应基本连续。逐像素光流突增可能表示瞬移。使用 RAFT 计算光流；当某帧第 99 百分位光流幅值超过中位数的 10 倍时，标记该帧。

### 3. 重力与支撑（Gravity / support）
对检测为固体的对象，例如食物、球、工具，检查没有抬升动作时其垂直位置是否非递增。除非对象附近检测到“抓握的手”，否则标记向上漂移。

### 4. 身份一致性（Identity consistency）
对人物或角色，跨帧使用人脸识别嵌入。持续身份在 5 帧窗口内的余弦相似度应保持 > 0.8；低于阈值表示角色发生形变。

### 5. 手与肢体（Hands and limbs）
运行姿态估计器（第 21 课）。标记以下帧：一只手可见手指数 > 5 或 < 4；手臂长度在帧间翻倍；肢体穿过身体表面。

### 6. 文字渲染：提示要求文字时（Text rendering (if prompt asked for text)）
如果用户提示包含带引号的字符串，对生成帧进行光学字符识别（Optical Character Recognition，OCR），并针对要求的字符串计算字符错误率（Character Error Rate，CER）。CER > 20% 时标记。

## 报告（Report）

```
[plausibility]
  video frames:           <T>
  permanence violations:  <N>
  smoothness violations:  <N>
  gravity violations:     <N>
  identity drift:         <N 个 5 帧窗口>
  limb anomalies:         <N>
  OCR CER vs requested:   <浮点数>

[verdict]
  ship | hold | reject

[samples for review]
  每种失败发生的帧范围
```

## 规则（Rules）

- 不要因单项检查而硬性拦截；汇总分数，总异常数超过阈值时暂缓交付，转交复核。
- 身份漂移与恒存性违规权重最高，用户最先注意到它们。
- 随时间记录各项检查的失败率；上升趋势通常表示基础模型更新或提示分布偏移。
- 不要删除被标记视频；保留用于模型调试与事后分析。
- 对人物、儿童、公众人物等敏感内容，无论分数如何，每段视频都要求人工复核。
