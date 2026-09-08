# 视觉 Transformer（Vision Transformers，ViT）

> 将图像切成图像块，把每块视为一个词，运行标准 Transformer，然后继续向前。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 7 第 02 课（自注意力），阶段 4 第 04 课（图像分类）
**Time:** 约 45 分钟

## 学习目标（Learning Objectives）

- 从零实现图像块嵌入、可学习位置嵌入、类别词元和 Transformer 编码器模块，构建最小 ViT
- 解释为什么人们曾认为 ViT 需要海量预训练数据，直到 DeiT 与 MAE 证明并非如此
- 比较 ViT、Swin、ConvNeXt 的架构先验，分别为无先验、局部窗口注意力、卷积主干
- 使用 `timm` 与标准的线性探测 / 微调方案，在小数据集上微调预训练 ViT

## 问题（The Problem）

十年间，卷积几乎就是计算机视觉的代名词。卷积神经网络（Convolutional Neural Network，CNN）具有很强的归纳偏置（Inductive Bias），例如局部性、平移等变性，人们认为这些无法替代。随后 Dosovitskiy 等（2020）证明，将普通 Transformer 应用于展平的图像块，即使完全没有卷积机制，在大规模条件下也能匹配或超过最好的 CNN。

关键在于“大规模”。在 ImageNet-1k 上，ViT 输给 ResNet；先在 ImageNet-21k 或 JFT-300M 上预训练，再在 ImageNet-1k 上微调的 ViT 则超过了它。由此得出的结论是：Transformer 缺少有用的先验，却能从足够多的数据中学到它们。后续工作 DeiT、MAE、DINO 表明，只要使用合适的训练方案，包括强增强、自监督预训练、蒸馏，ViT 在小数据上也能训练好。

到 2026 年，纯 CNN 在边缘设备上仍有竞争力，ConvNeXt 最强；但其他领域由 Transformer 主导：分割（Mask2Former、SegFormer）、检测（DETR、RT-DETR）、多模态（CLIP、SigLIP）、视频（VideoMAE、VJEPA）。ViT 的模块结构是必须掌握的内容。

## 概念（The Concept）

### 流水线（The pipeline）

```mermaid
flowchart LR
    IMG["图像<br/>(3, 224, 224)"] --> PATCH["图像块嵌入<br/>卷积 16x16 s=16<br/>-> (768, 14, 14)"]
    PATCH --> FLAT["展平为<br/>(196, 768) 词元"]
    FLAT --> CAT["在开头添加<br/>[CLS] 词元"]
    CAT --> POS["添加可学习<br/>位置嵌入"]
    POS --> ENC["N 个 Transformer<br/>编码器模块"]
    ENC --> CLS["取 [CLS]<br/>词元输出"]
    CLS --> HEAD["MLP 分类器"]

    style PATCH fill:#dbeafe,stroke:#2563eb
    style ENC fill:#fef3c7,stroke:#d97706
    style HEAD fill:#dcfce7,stroke:#16a34a
```

共七步。图像块 -> 词元 -> 注意力 -> 分类器。每种变体，包括 DeiT、Swin、ConvNeXt、MAE 预训练，只改变七步中的一两步，其余保持不变。

### 图像块嵌入（Patch embedding）

关键在第一个卷积。卷积核大小为 16，步幅为 16，因此 224x224 图像变为由 16x16 图像块组成的 14x14 网格，每块投影为 768 维嵌入。单次卷积同时完成分块与线性投影。

```
输入： (3, 224, 224)
卷积（3 -> 768, k=16, s=16，无填充）：
输出： (768, 14, 14)
展平空间维度：(196, 768)
```

196 个图像块 = 196 个词元。每个词元的特征维度为 768（ViT-B）、1024（ViT-L）或 1280（ViT-H）。

### 类别词元（Class token）

在序列开头添加一个可学习向量：

```
tokens = [CLS; patch_1; patch_2; ...; patch_196]   形状 (197, 768)
```

经过 N 个 Transformer 模块后，`[CLS]` 的输出就是全局图像表示。分类头只读取这个向量。

### 位置嵌入（Positional embedding）

Transformer 没有内置空间位置概念。为每个词元添加一个可学习向量：

```
tokens = tokens + learned_pos_embedding   （形状同样为 (197, 768)）
```

嵌入是模型参数；基于梯度的训练使其适应二维图像结构。也存在二维正弦位置编码方案，但实践中很少使用。

### Transformer 编码器模块（Transformer encoder block）

标准结构：多头自注意力（Multi-Head Self-Attention）、多层感知机（Multilayer Perceptron，MLP）、残差连接、前置层归一化（Pre-LayerNorm）。

```
x = x + MSA(LN(x))
x = x + MLP(LN(x))

MLP 包含两层，使用 GELU： Linear(d -> 4d) -> GELU -> Linear(4d -> d)
```

ViT-B/16 堆叠 12 个这样的模块，每个模块有 12 个注意力头，总计 86M 参数。

### 为什么使用前置层归一化（Why pre-LN）

早期 Transformer 使用后置层归一化（Post-LN，`x = LN(x + sublayer(x))`），不预热时很难训练超过 6-8 层。前置层归一化（Pre-LN，`x = x + sublayer(LN(x))`）不需要预热也能稳定训练更深网络。每种 ViT 和现代大语言模型（Large Language Model，LLM）都使用前置层归一化。

### 图像块大小的权衡（Patch size trade-off）

- 16x16 图像块 -> 196 个词元，标准选择。
- 32x32 图像块 -> 49 个词元，更快，但分辨率更低。
- 8x8 图像块 -> 784 个词元，更精细，但 O(n^2) 的注意力成本难以扩展。

图像块越大，词元越少，速度越快，但空间细节越少。SwinV2 在分层窗口中使用 4x4 图像块。

### DeiT 在 ImageNet-1k 上训练 ViT 的方案（DeiT's recipe for training ViT on ImageNet-1k）

原始 ViT 需要 JFT-300M 才能超过 CNN。DeiT（Touvron 等，2020）仅用 ImageNet-1k 就将 ViT-B 训练到 81.8% 的 top-1 准确率，做了四项调整：

1. 强数据增强：RandAugment、Mixup、CutMix、随机擦除（Random Erasing）。
2. 随机深度（Stochastic Depth）：训练时随机丢弃整个模块。
3. 重复增强（Repeated Augmentation）：同一图像在每个批次中采样 3 次。
4. 从 CNN 教师模型蒸馏，可选，能进一步提高准确率。

所有现代 ViT 训练方案都源自 DeiT。

### Swin 与 ConvNeXt（Swin vs ConvNeXt）

- **Swin**（Liu 等，2021）：基于窗口的注意力。每个模块只在局部窗口内计算注意力；交替模块移动窗口，在不同窗口间交换信息。在保留注意力算子的同时，重新引入类似 CNN 的局部性先验。
- **ConvNeXt**（Liu 等，2022）：重新设计的 CNN，采用与 Swin 对应的架构选择，包括逐通道卷积、层归一化、高斯误差线性单元（Gaussian Error Linear Unit，GELU）、倒置瓶颈（Inverted Bottleneck）。它说明差距不在“注意力还是卷积”，而在“现代训练方案加架构”。

2026 年，ConvNeXt-V2 与 Swin-V2 都达到生产级水平；正确选择取决于推理技术栈，ConvNeXt 更适合编译到边缘端，以及预训练语料。

### MAE 预训练（MAE pretraining）

掩码自编码器（Masked Autoencoder，MAE；He 等，2022）：随机遮蔽 75% 的图像块，训练编码器只处理可见的 25%，再训练小型解码器根据编码器输出重建被遮蔽的图像块。预训练后丢弃解码器，微调编码器。

MAE 使 ViT 仅用 ImageNet-1k 就能训练并达到当前最优（State of the Art，SOTA）水平，是当前默认自监督方案。

```figure
batchnorm-inference
```

## 动手构建（Build It）

### 第 1 步：图像块嵌入（Step 1: Patch embedding）

```python
import torch
import torch.nn as nn

class PatchEmbedding(nn.Module):
    def __init__(self, in_channels=3, patch_size=16, dim=192, image_size=64):
        super().__init__()
        assert image_size % patch_size == 0
        self.proj = nn.Conv2d(in_channels, dim, kernel_size=patch_size, stride=patch_size)
        num_patches = (image_size // patch_size) ** 2
        self.num_patches = num_patches

    def forward(self, x):
        x = self.proj(x)
        return x.flatten(2).transpose(1, 2)
```

一次卷积、一次展平、一次转置，就是完整的图像转词元步骤。

### 第 2 步：Transformer 模块（Step 2: Transformer block）

前置层归一化、多头自注意力、带 GELU 的 MLP、残差连接。

```python
class Block(nn.Module):
    def __init__(self, dim, num_heads, mlp_ratio=4, dropout=0.0):
        super().__init__()
        self.ln1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, dropout=dropout, batch_first=True)
        self.ln2 = nn.LayerNorm(dim)
        self.mlp = nn.Sequential(
            nn.Linear(dim, dim * mlp_ratio),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim * mlp_ratio, dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        a, _ = self.attn(self.ln1(x), self.ln1(x), self.ln1(x), need_weights=False)
        x = x + a
        x = x + self.mlp(self.ln2(x))
        return x
```

`nn.MultiheadAttention` 负责拆分注意力头、缩放点积和输出投影。设置 `batch_first=True`，因此形状为 `(N, seq, dim)`。

### 第 3 步：ViT 模型（Step 3: The ViT）

```python
class ViT(nn.Module):
    def __init__(self, image_size=64, patch_size=16, in_channels=3,
                 num_classes=10, dim=192, depth=6, num_heads=3, mlp_ratio=4):
        super().__init__()
        self.patch = PatchEmbedding(in_channels, patch_size, dim, image_size)
        num_patches = self.patch.num_patches
        self.cls_token = nn.Parameter(torch.zeros(1, 1, dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, dim))
        self.blocks = nn.ModuleList([
            Block(dim, num_heads, mlp_ratio) for _ in range(depth)
        ])
        self.ln = nn.LayerNorm(dim)
        self.head = nn.Linear(dim, num_classes)
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        nn.init.trunc_normal_(self.cls_token, std=0.02)

    def forward(self, x):
        x = self.patch(x)
        cls = self.cls_token.expand(x.size(0), -1, -1)
        x = torch.cat([cls, x], dim=1)
        x = x + self.pos_embed
        for blk in self.blocks:
            x = blk(x)
        x = self.ln(x[:, 0])
        return self.head(x)

vit = ViT(image_size=64, patch_size=16, num_classes=10, dim=192, depth=6, num_heads=3)
x = torch.randn(2, 3, 64, 64)
print(f"output: {vit(x).shape}")
print(f"params: {sum(p.numel() for p in vit.parameters()):,}")
```

约 2.8M 参数，是 CPU 可以处理的微型 ViT。真正的 ViT-B 有 86M 参数，使用同一类定义，只需设置 `dim=768, depth=12, num_heads=12`。

### 第 4 步：基本检查，单图推理（Step 4: Sanity check — single image inference）

```python
logits = vit(torch.randn(1, 3, 64, 64))
print(f"logits: {logits}")
print(f"probs:  {logits.softmax(-1)}")
```

应能无错误运行，概率之和为 1。

## 实际使用（Use It）

`timm` 提供所有 ViT 变体及其 ImageNet 预训练权重。一行即可：

```python
import timm

model = timm.create_model("vit_base_patch16_224", pretrained=True, num_classes=10)
```

`timm` 是 2026 年视觉 Transformer 的生产默认库。在统一 API 下支持 ViT、DeiT、Swin、Swin-V2、ConvNeXt、ConvNeXt-V2、MaxViT、MViT、EfficientFormer 及数十种其他模型。

对于图像加文本的多模态工作，`transformers` 提供 CLIP、SigLIP、BLIP-2、LLaVA。这些模型的图像编码器都是 ViT 变体。

## 交付成果（Ship It）

本课产出：

- `outputs/prompt-vit-vs-cnn-picker.md`：根据数据集规模、计算资源与推理技术栈，在 ViT、ConvNeXt 和 Swin 之间选择的提示词。
- `outputs/skill-vit-patch-and-pos-embed-inspector.md`：验证 ViT 图像块嵌入和位置嵌入形状是否匹配模型预期序列长度的技能，用于发现最常见的移植错误。

## 练习（Exercises）

1. **（简单）** 打印上述微型 ViT 一次前向传播中每个中间张量的形状。确认：输入 `(N, 3, 64, 64)` -> 图像块 `(N, 16, 192)` -> 加 CLS 后 `(N, 17, 192)` -> 分类器输入 `(N, 192)` -> 输出 `(N, num_classes)`。
2. **（中等）** 在第 4 课的合成 CIFAR 数据集上微调预训练的 `timm` ViT-S/16。与相同数据上的 ResNet-18 微调比较，报告训练时间和最终准确率。
3. **（困难）** 为微型 ViT 实现 MAE 预训练：遮蔽 75% 的图像块，训练编码器与小型解码器重建遮蔽块。评估预训练前后在合成数据上的线性探测（Linear Probe）准确率。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 图像块嵌入（Patch embedding） | “第一个卷积” | 卷积核大小 = 步幅 = 图像块大小的卷积，将图像转为词元嵌入网格 |
| 类别词元（Class token） | “[CLS]” | 添加在词元序列开头的可学习向量，最终输出是全局图像表示 |
| 位置嵌入（Positional embedding） | “学习出来的位置” | 加到每个词元上的可学习向量，让 Transformer 知道每块来自哪里 |
| 前置层归一化（Pre-LN） | “子层之前做 LayerNorm” | 稳定的 Transformer 变体：使用 `x + sublayer(LN(x))`，而不是 `LN(x + sublayer(x))` |
| 多头注意力（Multi-head attention） | “并行注意力” | 将标准 Transformer 注意力拆到 num_heads 个独立子空间中，之后拼接 |
| ViT-B/16 | “基础规模，图像块 16” | 标准规模：dim=768、depth=12、heads=12、patch_size=16、image=224，约 86M 参数 |
| 数据高效图像 Transformer（Data-efficient Image Transformers，DeiT） | “数据高效的 ViT” | 仅在 ImageNet-1k 上使用强增强训练的 ViT，证明大型预训练数据集并非严格必需 |
| 掩码自编码器（Masked Autoencoder，MAE） | “遮蔽后重建” | 自监督预训练：遮蔽 75% 图像块并重建，是主流 ViT 预训练方案 |

## 延伸阅读（Further Reading）

- [一张图像相当于 16x16 个词（Dosovitskiy 等，2020）](https://arxiv.org/abs/2010.11929)：ViT 论文
- [DeiT：数据高效的图像 Transformer（Touvron 等，2020）](https://arxiv.org/abs/2012.12877)：如何仅在 ImageNet-1k 上训练 ViT
- [掩码自编码器是可扩展的视觉学习器（He 等，2022）](https://arxiv.org/abs/2111.06377)：MAE 预训练
- [timm 文档](https://huggingface.co/docs/timm)：生产中使用各种视觉 Transformer 的参考资料
