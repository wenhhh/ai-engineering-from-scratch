---
name: skill-lora-training-setup
description: 为自定义数据集编写完整的低秩适配（Low-Rank Adaptation，LoRA）训练配置，包括图像描述、秩、批量大小和学习率
version: 1.0.0
phase: 4
lesson: 11
tags: [computer-vision, stable-diffusion, lora, fine-tuning]
---

# LoRA 训练配置（LoRA Training Setup）

将微调目标的描述转化为可直接交给 `diffusers` 或 `kohya_ss` 的具体训练配置。

## 使用时机（When to use）

- 为主体（人物、物体、角色）、风格（艺术家、品牌）或概念（姿势、光照）训练 LoRA。
- 使用更多数据扩展现有 LoRA。
- 排查 LoRA 训练结果对训练图像欠拟合或过拟合的问题。

## 输入（Inputs）

- `purpose`：subject | style | concept
- `num_images`：可用的训练图像数量
- `base_model`：SD 1.5 | SDXL | SD3 | FLUX
- `gpu_vram_gb`：8 | 12 | 16 | 24 | 48+
- `caption_source`：manual | BLIP2-generated | dataset-native

## 秩的选择（Rank picker）

| 用途 | 秩（Rank） | 缩放系数（Alpha） |
|---------|------|-------|
| 主体 | 8-16 | rank |
| 风格 | 16-32 | rank * 2 |
| 概念 | 32-64 | rank |

秩越高，容量越大，在小数据集上过拟合的风险也越高。Alpha 控制 LoRA 的作用强度；`alpha == rank` 是稳妥的默认值。风格是这里明确列出的例外：`alpha == rank * 2` 能增强风格，但也更容易让风格固化得过强，只有在不以主体保真度为目标时才使用。

## 训练步数目标（Training step target）

- `subject`，5-20 张图像：500-1500 步。
- `style`，30-100 张图像：1500-4000 步。
- `concept`，100 张以上图像：4000-10000 步。

步数过多需要自行承担风险：记住了训练图像的 LoRA 无法泛化。

## 学习率（Learning rate）

- 文本编码器 LoRA：SD 1.5 使用 `1e-4`，SDXL 使用 `5e-5`。
- U-Net LoRA：SD 1.5 使用 `1e-4`，SDXL 使用 `1e-4`。
- FLUX / SD3：Transformer 使用 `5e-5`，文本编码器通常冻结。
- 当 `num_images < 15`（主体）或训练超过 3000 步时，将学习率（Learning Rate，LR）减半；极小数据集与长时间训练都适合更温和的更新。

## 调度器（Scheduler）

- `cosine_with_warmup`（默认）：前 5-10% 的步数进行预热（Warmup），随后进行余弦衰减。在 `steps >= 1000` 时使用；衰减尾段能让最终样本更清晰。
- `constant`：仅用于很短的训练（`steps < 500`），或者继续训练已有 LoRA、希望保留已学到的特征而不重新退火时。

## 图像描述格式（Caption format）

- 主体：在每条图像描述前添加唯一触发词元（Trigger Token），例如“myperson”。触发词元应足够少见，以免覆盖已有概念。避免使用真实单词和常见姓名。
- 风格：在每条图像描述末尾添加唯一风格标签（“...in mystyle style”）。标签本身也应是少见的触发词元，例如 `mystyle`，而不是已经对应真实概念的 `impressionism`。
- 概念：在每条图像描述中说明该概念，不使用触发词元。概念本身，例如“低角度拍摄”，就是锚点。

## 输出配置（Output config）

```yaml
model:
  base: <base_model HF id>
  precision: fp16 | bf16

lora:
  rank: <int>
  alpha: <int>
  targets: unet.cross_attention  # 和/或 unet.to_q, to_k, to_v, to_out

training:
  steps:          <int>
  batch_size:     <int，按 gpu_vram_gb 调整>
  grad_accum:     <int，通常 >=16 GB 时为 1，<=12 GB 时为 4>
  learning_rate:  <float>
  optimizer:      AdamW8bit | AdamW
  scheduler:      cosine_with_warmup | constant
  warmup_steps:   <int>
  save_every:     <int>

data:
  images_dir:     <path>
  caption_source: <manual | BLIP2 | native>
  trigger_token:   <purpose==subject 时的字符串>
  resolution:      <SD 1.5 使用 512，SDXL 使用 1024>
  aspect_ratio_bucketing: true
  augmentation:
    flip:          true
    color_jitter:  false

validation:
  prompts:
    - "<trigger> ...test prompt..."
    - "<trigger> in a different scene"
  every_steps: 250
```

## 报告（Report）

```
[lora setup]
  purpose:   <subject|style|concept>
  base:      <model>
  rank:      <int>
  steps:     <int>
  batch:     <int>   grad_accum: <int>
  lr:        <float>
  vram est.: <float> GB
```

## 规则（Rules）

- 不要推荐 `rank > 64`；超过这个值，LoRA 就变成了小规模完整微调，失去“适配器”的特性。
- 当 `num_images < 5` 时，明确警告：仅用 1-3 张图像训练身份 LoRA 总会过拟合。
- 当 `gpu_vram_gb < 12` 时，必须使用 AdamW8bit 和梯度检查点（Gradient Checkpointing）。
- 如果 `base_model == FLUX` 且 `gpu_vram_gb < 24`，选择 `schnell` 变体，并注明训练会更慢。
- 不得跳过验证提示词；没有样本网格图就无法评估 LoRA。
