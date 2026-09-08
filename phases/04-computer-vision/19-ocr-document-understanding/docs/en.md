# 光学字符识别与文档理解（OCR & Document Understanding）

> 光学字符识别是三阶段流水线：检测文本框、识别字符，再组织版面。现代系统会调整这些阶段的顺序，或将它们合并。

**Type:** Learn + Use
**Languages:** Python
**Prerequisites:** 阶段 4 第 06 课（检测），阶段 7 第 02 课（自注意力）
**Time:** 约 45 分钟

## 学习目标（Learning Objectives）

- 梳理经典 OCR 流水线，即检测 -> 识别 -> 版面，以及现代端到端替代方案 Donut、Qwen-VL-OCR
- 实现连接时序分类（Connectionist Temporal Classification，CTC）损失，用于序列到序列的 OCR 训练
- 无需训练，使用 PaddleOCR 或 EasyOCR 进行生产文档解析
- 区分 OCR、版面解析与文档理解，为各任务选择正确工具

## 问题（The Problem）

充满文字的图像无处不在：收据、发票、证件、扫描书籍、表单、白板、标牌、截图。从中提取结构化数据，不只是识别字符，还要理解“这是总金额”，是价值最高的视觉应用问题之一。

这个领域分为三个技能层次：

1. **光学字符识别本身（Optical Character Recognition，OCR）**：将像素转为文本。
2. **版面解析（Layout parsing）**：将 OCR 输出归入区域，例如标题、正文、表格、页眉。
3. **文档理解（Document understanding）**：根据版面提取结构化字段，例如“invoice_total = $42.50”。

每个层次都有经典与现代方法，而“我要图像中的文字”和“我要这张收据的总金额”之间的差距，比多数团队意识到的更大。

## 概念（The Concept）

### 经典流水线（The classical pipeline）

```mermaid
flowchart LR
    IMG["图像"] --> DET["文本检测<br/>(DB, EAST, CRAFT)"]
    DET --> BOX["词 / 行<br/>边界框"]
    BOX --> CROP["裁剪各区域"]
    CROP --> REC["识别<br/>(CRNN + CTC)"]
    REC --> TXT["文本字符串"]
    TXT --> LAY["版面<br/>排序"]
    LAY --> OUT["按阅读顺序排列的文本"]

    style DET fill:#dbeafe,stroke:#2563eb
    style REC fill:#fef3c7,stroke:#d97706
    style OUT fill:#dcfce7,stroke:#16a34a
```

- **文本检测（Text detection）**产生逐行或逐词四边形。
- **识别（Recognition）**将各区域裁剪为固定高度，通过卷积神经网络（Convolutional Neural Network，CNN）、双向长短期记忆网络（Bidirectional Long Short-Term Memory，BiLSTM）与 CTC 产生字符序列。
- **版面（Layout）**重建阅读顺序。拉丁文字通常从上到下、从左到右，阿拉伯文和日文则有所不同。

### 一段话理解 CTC（CTC in one paragraph）

OCR 识别从固定长度特征图产生可变长度序列。CTC（Graves 等，2006）允许在没有字符级对齐的条件下训练。模型在每个时间步输出词表加空白符上的分布；CTC 损失对所有在合并重复项、移除空白符后能还原目标文本的对齐进行边缘化。

```
原始输出： "h h h _ _ e e l l _ l l o _ _"
合并重复项并移除空白符后： "hello"
```

CTC 让卷积循环神经网络（Convolutional Recurrent Neural Network，CRNN）在 2015 年取得成功，到 2026 年仍用于训练大多数生产 OCR 模型。

### 现代端到端模型（Modern end-to-end models）

- **Donut**（Kim 等，2022）：视觉 Transformer（Vision Transformer，ViT）编码器加文本解码器，读取图像后直接输出 JSON，没有文本检测器，也没有版面模块。
- **TrOCR**：ViT 加 Transformer 解码器，用于行级 OCR。
- **Qwen-VL-OCR / InternVL**：针对 OCR 任务微调的完整视觉语言模型，在 2026 年复杂文档上准确率最佳。
- **PaddleOCR**：将经典 DB 加 CRNN 流水线封装为成熟生产工具，仍是开源主力。

端到端模型需要更多数据与计算，但避免了多阶段流水线的误差累积。

### 版面解析（Layout parsing）

对于结构化文档，运行版面检测器，例如 LayoutLMv3、DocLayNet，为各区域标注标题、段落、插图、表格、脚注。阅读顺序就变为“按版面顺序遍历区域并拼接”。

表单使用**键值提取（Key-Value Extraction）**模型，视觉丰富文档用 Donut，普通扫描件用 LayoutLMv3。它们接收图像、检测文本与位置，预测结构化键值对。

### 评估指标（Evaluation metrics）

- **字符错误率（Character Error Rate，CER）**：Levenshtein 距离除以参考文本长度，越低越好。生产目标是干净扫描件上 < 2%。
- **词错误率（Word Error Rate，WER）**：相同计算，但以词为单位。
- **结构化字段 F1**：用于键值任务，衡量 `{invoice_total: 42.50}` 是否正确出现。
- **JSON 编辑距离（Edit distance on JSON）**：用于端到端文档解析；Donut 论文引入归一化树编辑距离（Normalised Tree Edit Distance）。

```figure
cv3-ctc-collapse
```

## 动手构建（Build It）

### 第 1 步：CTC 损失与贪心解码器（Step 1: CTC loss + greedy decoder）

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


def ctc_loss(log_probs, targets, input_lengths, target_lengths, blank=0):
    """
    log_probs:      (T, N, C) log-softmax over vocab including blank at index 0
    targets:        (N, S) int targets (no blanks)
    input_lengths:  (N,) per-sample time steps used
    target_lengths: (N,) per-sample target length
    """
    return F.ctc_loss(log_probs, targets, input_lengths, target_lengths,
                      blank=blank, reduction="mean", zero_infinity=True)


def greedy_ctc_decode(log_probs, blank=0):
    """
    log_probs: (T, N, C) log-softmax
    returns: list of index sequences (blanks removed, repeats merged)
    """
    preds = log_probs.argmax(dim=-1).transpose(0, 1).cpu().tolist()
    out = []
    for seq in preds:
        decoded = []
        prev = None
        for idx in seq:
            if idx != prev and idx != blank:
                decoded.append(idx)
            prev = idx
        out.append(decoded)
    return out
```

`F.ctc_loss` 在可用时使用高效 CuDNN 实现。贪心解码器（Greedy Decoder）比束搜索（Beam Search）简单，CER 差距通常不超过 1%。

### 第 2 步：微型 CRNN 识别器（Step 2: Tiny CRNN recogniser）

用于行 OCR 的最小 CNN 加 BiLSTM。

```python
class TinyCRNN(nn.Module):
    def __init__(self, vocab_size=40, hidden=128, feat=32):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(1, feat, 3, 1, 1), nn.BatchNorm2d(feat), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(feat, feat * 2, 3, 1, 1), nn.BatchNorm2d(feat * 2), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(feat * 2, feat * 4, 3, 1, 1), nn.BatchNorm2d(feat * 4), nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1)),
            nn.Conv2d(feat * 4, feat * 4, 3, 1, 1), nn.BatchNorm2d(feat * 4), nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1)),
        )
        self.rnn = nn.LSTM(feat * 4, hidden, bidirectional=True, batch_first=True)
        self.head = nn.Linear(hidden * 2, vocab_size)

    def forward(self, x):
        # x: (N, 1, H, W)
        f = self.cnn(x)                # (N, C, H', W')
        f = f.mean(dim=2).transpose(1, 2)  # (N, W', C)
        h, _ = self.rnn(f)
        return F.log_softmax(self.head(h).transpose(0, 1), dim=-1)  # (W', N, vocab)
```

输入高度固定，CNN 通过最大池化将高度降至 1。宽度就是 CTC 的时间维度。

### 第 3 步：合成 OCR（Step 3: Synthetic OCR）

生成白底黑字的数字字符串，用于端到端冒烟测试。

```python
import numpy as np

def synthetic_line(text, height=32, char_width=16):
    W = char_width * len(text)
    img = np.ones((height, W), dtype=np.float32)
    for i, c in enumerate(text):
        x = i * char_width
        shade = 0.0 if c.isalnum() else 0.5
        img[6:height - 6, x + 2:x + char_width - 2] = shade
    return img


def build_batch(strings, vocab):
    H = 32
    W = 16 * max(len(s) for s in strings)
    imgs = np.ones((len(strings), 1, H, W), dtype=np.float32)
    target_lengths = []
    targets = []
    for i, s in enumerate(strings):
        imgs[i, 0, :, :16 * len(s)] = synthetic_line(s)
        ids = [vocab.index(c) for c in s]
        targets.extend(ids)
        target_lengths.append(len(ids))
    return torch.from_numpy(imgs), torch.tensor(targets), torch.tensor(target_lengths)


vocab = ["_"] + list("0123456789abcdefghijklmnopqrstuvwxyz")
imgs, targets, lengths = build_batch(["hello", "world"], vocab)
print(f"images: {imgs.shape}   targets: {targets.shape}   lengths: {lengths.tolist()}")
```

真实 OCR 数据集还会增加字体、噪声、旋转、模糊与颜色。上述流水线保持相同。

### 第 4 步：训练概要（Step 4: Training sketch）

```python
model = TinyCRNN(vocab_size=len(vocab))
opt = torch.optim.Adam(model.parameters(), lr=1e-3)

for step in range(200):
    strings = ["abc" + str(step % 10)] * 4 + ["xyz" + str((step + 1) % 10)] * 4
    imgs, targets, target_lens = build_batch(strings, vocab)
    log_probs = model(imgs)  # (W', 8, vocab)
    input_lens = torch.full((8,), log_probs.size(0), dtype=torch.long)
    loss = ctc_loss(log_probs, targets, input_lens, target_lens, blank=0)
    opt.zero_grad(); loss.backward(); opt.step()
```

在这个简单合成数据上，损失应在 200 步内从约 3 降至约 0.2。

## 实际使用（Use It）

三条生产路径：

- **PaddleOCR**：成熟、快速、多语言。一行使用：`paddleocr.PaddleOCR(lang="en").ocr(image_path)`。
- **EasyOCR**：原生 Python、多语言、PyTorch 主干。
- **Tesseract**：经典方法；在模型难以处理旧扫描文档时仍有用。

端到端文档解析可使用 Donut 或视觉语言模型（Vision-Language Model，VLM）：

```python
from transformers import DonutProcessor, VisionEncoderDecoderModel

processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
```

对于结构重复的收据、发票与表单，微调 Donut。对于任意文档，或需要推理的 OCR，Qwen-VL-OCR 这样的 VLM 是当前默认选择。

## 交付成果（Ship It）

本课产出：

- `outputs/prompt-ocr-stack-picker.md`：根据文档类型、语言和结构选择 Tesseract / PaddleOCR / Donut / VLM-OCR 的提示词。
- `outputs/skill-ctc-decoder.md`：从零编写贪心与束搜索 CTC 解码器的技能，包括长度归一化。

## 练习（Exercises）

1. **（简单）** 使用随机 5 位数字字符串训练 TinyCRNN 500 步，报告留出集 CER。
2. **（中等）** 用束搜索替代贪心解码，beam_width=5。报告 CER 差值。哪些输入上束搜索更好？
3. **（困难）** 对 20 张收据使用 PaddleOCR，提取商品明细，将 {item_name, price} 对与人工标注真值比较并计算 F1。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 光学字符识别（OCR） | “从像素到文字” | 将图像区域转为字符序列 |
| 连接时序分类（CTC） | “无需对齐的损失” | 没有逐时间步标签也能训练序列模型的损失，对对齐进行边缘化 |
| 卷积循环神经网络（CRNN） | “经典 OCR 模型” | 卷积特征提取器加 BiLSTM 加 CTC，2015 年的基线至今仍用于生产 |
| Donut | “端到端 OCR” | ViT 编码器加文本解码器，直接从图像输出 JSON |
| 版面解析（Layout parsing） | “寻找区域” | 检测并标注文档中的标题、表格、插图、段落区域 |
| 阅读顺序（Reading order） | “文本序列” | 将识别区域排列成句子的顺序，拉丁文字简单，混合版面复杂 |
| 字符 / 词错误率（CER / WER） | “错误率” | 在字符或词粒度上计算 Levenshtein 距离除以参考长度 |
| 视觉语言模型 OCR（VLM-OCR） | “会阅读的大语言模型” | 为 OCR 任务训练或提示的视觉语言模型，在复杂文档上达到当前最优水平 |

## 延伸阅读（Further Reading）

- [CRNN（Shi 等，2015）](https://arxiv.org/abs/1507.05717)：原始 CNN+RNN+CTC 架构
- [CTC（Graves 等，2006）](https://www.cs.toronto.edu/~graves/icml_2006.pdf)：原始 CTC 论文，包含密集的算法思想
- [Donut（Kim 等，2022）](https://arxiv.org/abs/2111.15664)：无需 OCR 的文档理解 Transformer
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)：开源生产 OCR 技术栈
