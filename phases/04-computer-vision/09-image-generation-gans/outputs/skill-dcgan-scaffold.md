---
name: skill-dcgan-scaffold
description: 根据 z_dim、image_size 和 num_channels 编写完整 DCGAN 项目骨架，包含训练循环和样本保存器
version: 1.0.0
phase: 4
lesson: 9
tags: [computer-vision, gan, dcgan, scaffolding]
---

# DCGAN 项目骨架（DCGAN Scaffold）

给定三个参数，生成可运行的 DCGAN 项目骨架，使架构尺寸正确匹配目标图像分辨率。

## 使用时机（When to use）

- 在小数据集上开始新的生成实验。
- 用可运行的最小示例教授 DCGAN 基础。
- 制作条件 GAN 原型，标签注入也在同一骨架内完成。

## 输入（Inputs）

- `image_size`：32、64、128 之一，必须为 2 的幂。
- `num_channels`：1（灰度）或 3（RGB）。
- `z_dim`：通常为 64 或 128。
- `with_spectral_norm`：yes | no，默认 yes。

## 架构尺寸（Architecture sizing）

G 中转置卷积模块与 D 中带步幅卷积模块的数量取决于 `image_size`：

| image_size | G 模块数 | D 模块数 |
|------------|----------|----------|
| 32         | 4        | 4        |
| 64         | 5        | 5        |
| 128        | 6        | 6        |

每增加一个模块，空间维度在 G 中翻倍，在 D 中减半。特征数从 32 开始，按 `feat_base * 2^block_index` 扩展。

## 输出文件（Output files）

- `model.py`：生成器与判别器类
- `train.py`：训练循环、损失与优化器设置
- `sample.py`：样本网格保存器
- `config.json`：超参数
- `README.md`：十行快速入门

## 报告（Report）

```
[scaffold]
  image_size:       <整数>
  num_channels:     <整数>
  z_dim:            <整数>
  spectral_norm:    yes | no

[arch]
  G blocks:         <N>, channels: [列表]
  D blocks:         <N>, channels: [列表]
  G params (est):   <N>
  D params (est):   <N>

[training defaults]
  optimizer:   Adam(lr=2e-4, betas=(0.5, 0.999))
  batch_size:  64
  epochs:      50
  sample_every: 1 个轮次

[files written]
  - model.py
  - train.py
  - sample.py
  - config.json
  - README.md
```

## 规则（Rules）

- G 输出始终使用 `nn.Tanh()`，训练数据缩放至 [-1, 1]。
- D 始终使用 `LeakyReLU(0.2)`。
- 当 `with_spectral_norm == yes` 时，用 `spectral_norm()` 包裹 D 的每个卷积，并移除 D 中的 BatchNorm；G 中保留 BatchNorm。
- 绝不为 image_size > 128 生成骨架，DCGAN 在更高分辨率下会不稳定；引导用户使用 StyleGAN 或扩散模型。
