---
name: skill-linear-probe-runner
description: 为任意冻结编码器和有标签数据集编写完整线性探测评估
version: 1.0.0
phase: 4
lesson: 17
tags: [self-supervised, evaluation, linear-probe, pytorch]
---

# 线性探测运行器（Linear Probe Runner）

在冻结编码器特征之上训练单个线性分类器，以评估特征。这是各类自监督论文的标准评估方法。

## 使用时机（When to use）

- 比较自监督检查点。
- 跟踪预训练各轮次的特征质量。
- 判断预训练编码器不经微调是否足以胜任下游任务。

## 输入（Inputs）

- `encoder`：冻结的 `nn.Module`，为每张图像返回固定维度特征。
- `feature_dim`：编码器输出维数。
- `train_dataset`：有标签数据集，格式为 (image, class_id)。
- `val_dataset`：留出集。
- `num_classes`：任务类别数。
- `epochs`：ImageNet 规模通常为 100，小数据集通常为 50。

## 步骤（Steps）

1. 将编码器设为评估模式，并为每个参数设置 `requires_grad=False`。
2. 分别对训练集与验证集提取一次特征，保存为 numpy 数组或内存映射文件。
3. 在缓存特征上用随机梯度下降（Stochastic Gradient Descent，SGD）与余弦调度训练 `nn.Linear(feature_dim, num_classes)`。
4. 标准超参数：`lr=0.1`、`momentum=0.9`、`weight_decay=0`、`batch_size=1024`。线性探测对 `lr` 的敏感程度可能超出预期，准确率差时应扫描多个值。
5. 训练结束时报告验证集 top-1 准确率。

## 输出模板（Output template）

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torch.optim import SGD
from torch.optim.lr_scheduler import CosineAnnealingLR

def extract(encoder, loader, device="cpu"):
    encoder.eval()
    feats, labels = [], []
    with torch.no_grad():
        for x, y in loader:
            f = encoder(x.to(device)).cpu()
            feats.append(f)
            labels.append(y)
    return torch.cat(feats), torch.cat(labels)


def linear_probe(encoder, feature_dim, train_loader, val_loader,
                 num_classes, epochs=50, lr=0.1, device="cpu"):
    for p in encoder.parameters():
        p.requires_grad = False

    f_train, y_train = extract(encoder, train_loader, device)
    f_val, y_val = extract(encoder, val_loader, device)

    head = nn.Linear(feature_dim, num_classes).to(device)
    opt = SGD(head.parameters(), lr=lr, momentum=0.9, weight_decay=0)
    sched = CosineAnnealingLR(opt, T_max=epochs)

    ds = torch.utils.data.TensorDataset(f_train, y_train)
    train_iter = DataLoader(ds, batch_size=1024, shuffle=True)

    best_val = 0.0
    for ep in range(epochs):
        head.train()
        for x, y in train_iter:
            x, y = x.to(device), y.to(device)
            loss = F.cross_entropy(head(x), y)
            opt.zero_grad(); loss.backward(); opt.step()
        sched.step()

        head.eval()
        with torch.no_grad():
            acc = (head(f_val.to(device)).argmax(-1).cpu() == y_val).float().mean().item()
        best_val = max(best_val, acc)
    return best_val
```

## 报告（Report）

```
[linear probe]
  encoder:     <名称与预训练检查点>
  feature_dim: <int>
  epochs:      <int>
  best_val_top1: <float>
```

## 规则（Rules）

- 线性探测期间不得更新编码器权重，否则就是微调，而不是探测。
- 只预计算一次特征；每轮重新训练编码器会浪费 100 倍计算。
- 使用 SGD、余弦调度且不使用权重衰减；Adam 在这里有时表现较差。
- 每类编码器至少扫描一次学习率；不同自监督学习（Self-Supervised Learning，SSL）方法的最优值不同。
