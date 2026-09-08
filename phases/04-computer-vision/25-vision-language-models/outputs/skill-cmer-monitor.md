---
name: skill-cmer-monitor
description: 为生产 VLM 端点接入跨模态错误率监控、仪表盘和告警
version: 1.0.0
phase: 4
lesson: 25
tags: [vlm, production, monitoring, hallucination]
---

# 跨模态错误率监控器（CMER Monitor）

将跨模态对齐作为首要生产关键绩效指标（Key Performance Indicator，KPI）。

## 适用场景（When to use）

- 部署任何依据图像生成文本的视觉语言模型（Vision-Language Model，VLM）端点。
- 调查关于幻觉响应的反馈。
- 跟踪输入分布变化是否削弱模型基于图像作答的能力。

## 输入（Inputs）

- `vlm_output`：生成文本。
- `text_confidence`：softmax 后各词元的平均概率，位于 `[0, 1]`，按 `exp(mean(log_probs))` 计算。不要传入原始逻辑值（Logits）；它们没有范围限制，而 `conf_threshold` 假定输入为概率。
- `image_embedding`：由 CLIP 家族编码器（DINOv3、SigLIP、CLIP）生成的图像嵌入。
- `text_embedding`：由 CLIP 家族编码器生成的输出文本嵌入。
- 可选 `prompt_type`：分组标签（vqa / ocr / captioning / agent）。

## 每请求计算（Per-request computation）

```python
import torch

def cmer_flag(image_emb, text_emb, text_conf, sim_thr=0.25, conf_thr=0.8):
    if image_emb.shape != text_emb.shape:
        raise ValueError(f"emb shape mismatch: {image_emb.shape} vs {text_emb.shape}")
    image_emb = image_emb / (image_emb.norm() + 1e-8)
    text_emb = text_emb / (text_emb.norm() + 1e-8)
    sim = float((image_emb * text_emb).sum())
    flagged = (text_conf > conf_thr) and (sim < sim_thr)
    return {"sim": sim, "flagged": flagged}
```

嵌入是独立 CLIP 家族编码器输出的一维 PyTorch 张量（`torch.float32`）。如果使用 NumPy 数组，将 `.norm()` 替换为 `np.linalg.norm(...)`，并相应转换输出类型。

将 `sim`、`text_conf`、`flagged`、`prompt_type`、`timestamp`、`model_version`、`request_id` 存入监控流水线，例如 Prometheus、DataDog、OpenTelemetry。

## 聚合指标（Aggregate metric）

```
CMER =（窗口内被标记的请求数）/（窗口内总请求数）
```

按端点、prompt_type 和模型版本分别报告。

## 告警阈值（Alert thresholds）

- 基线 CMER：通过 7 天正常流量建立。
- 警告：CMER >= 基线的 1.5 倍，持续 1 小时。
- 严重：CMER >= 基线的 2 倍，持续 30 分钟；或任意窗口内绝对值 > 15%。

## 仪表盘面板（Dashboard panels）

1. CMER 时间曲线：5 分钟分桶、7 天窗口。
2. 按 prompt_type 展示 CMER：堆叠条形图。
3. 每小时 `sim` 分布：直方图。
4. 典型幻觉输出：每天抽取 20 条被标记响应供人工复核。

## CMER 突增时的行动（Actions when CMER spikes）

1. 抽样检查被标记的请求。
2. 确认模型版本没有意外变化。
3. 检查输入分布：是否出现新文件格式、新图像来源或不同压缩方式？
4. 将受影响流量转交人工复核，直至突增消退。
5. 如果持续不退，微调或替换模型，不要屏蔽告警。

## 规则（Rules）

- 不要用 VLM 自身的嵌入计算 CMER；使用独立编码器（DINOv3、SigLIP 或 CLIP-L/14）。否则测到的是模型自洽性，而非对齐程度。
- 始终记录原始 `sim` 值，不仅记录 `flagged` 标志；在标记率变化之前，分布偏移就会体现在下四分位数上。
- 不要交付没有 CMER 监控的 VLM 端点；幻觉是主要生产失效模式，没有该指标就可能悄然发生。
- 对医疗、法律、金融等敏感领域，将 `sim_threshold` 提高到 0.35 或更高。标记条件为 `sim < sim_threshold`，因此更高阈值会将更多输出标记为可能缺乏图像依据，适合作为高风险用途的默认设置。
