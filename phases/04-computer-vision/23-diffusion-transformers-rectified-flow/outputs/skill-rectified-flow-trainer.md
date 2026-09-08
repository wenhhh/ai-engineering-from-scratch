---
name: skill-rectified-flow-trainer
description: 编写完整的整流流训练循环，使用 AdaLN DiT 和欧拉采样
version: 1.0.0
phase: 4
lesson: 23
tags: [diffusion, rectified-flow, DiT, training]
---

# 整流流训练器（Rectified Flow Trainer）

编写清晰、精简的训练循环，在任意图像张量数据集上用整流流（Rectified Flow）训练一个小型扩散 Transformer（Diffusion Transformer，DiT）。

## 适用场景（When to use）

- 小规模复现 SD3 / FLUX 的训练目标。
- 在相同数据上比较整流流与去噪扩散概率模型（Denoising Diffusion Probabilistic Model，DDPM）。
- 为医疗、卫星等非标准领域构建自定义整流流模型。

## 输入（Inputs）

- `model`：接收 `(x, t)` 并返回预测速度的 `nn.Module`。
- `dataset`：模型目标领域的干净图像可迭代集合。
- `optimizer`：AdamW，参数为 `lr=1e-4`、`weight_decay=0.01`、`betas=(0.9, 0.99)`。
- `scheduler`：带预热（Warmup）的余弦调度，默认预热 1000 步。

## 训练步骤（Training step）

```python
def rectified_flow_train_step(model, x0, optimizer, device):
    model.train()
    x0 = x0.to(device)
    n = x0.size(0)
    t = torch.rand(n, device=device)                     # uniform in [0, 1]
    epsilon = torch.randn_like(x0)
    x_t = (1 - t[:, None, None, None]) * x0 + t[:, None, None, None] * epsilon
    target_v = epsilon - x0                              # velocity target
    pred_v = model(x_t, t)
    loss = F.mse_loss(pred_v, target_v)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
    return loss.item()
```

## 采样：欧拉法（Sampling (Euler)）

```python
@torch.no_grad()
def sample(model, shape, steps=20, device="cpu"):
    model.eval()
    x = torch.randn(shape, device=device)
    dt = 1.0 / steps
    t = torch.ones(shape[0], device=device)
    for _ in range(steps):
        v = model(x, t)
        x = x - dt * v
        t = t - dt
    return x
```

## 提示（Tips）

- 使用 `torch.rand` 均匀采样 `t`；对 `t` 使用逻辑正态分布（Logit-normal）或 SD3 风格的加权采样略有帮助，但入门时并非必需。
- 对模型权重使用指数移动平均（Exponential Moving Average，EMA）是标准做法；维护衰减率为 0.9999 的 `ema_model`。
- 条件模型使用无分类器引导（Classifier-free Guidance，CFG）：训练时以 10% 的概率将条件替换为空嵌入；推理时按 `v_uncond + w * (v_cond - v_uncond)` 混合，`w` 取 3–5 左右。
- 对潜在扩散模型（Latent Diffusion Model，LDM）式训练（FLUX、SD3），整个循环在变分自编码器（Variational Autoencoder，VAE）的潜空间中运行；上面的干净 `x0` 实际是 `VAE.encode(image)`。
- 在 32x32 玩具数据集上通常需要 2000–5000 步收敛；真实 SD3 潜空间训练需要数十万步。

## 报告（Report）

```
[rectified flow training]
  steps:        <整数>
  final loss:   <浮点数>
  ema decay:    <浮点数>
  vae?:         yes | no
  cfg dropout:  <比例>

[sampling]
  default steps: 20
  schnell / turbo target: 4
  full quality reference: 50+（仅供比较）
```

## 规则（Rules）

- 不要直接在 RGB `uint8` 数据上用图像空间速度目标训练整流流；先归一化为零均值、单位方差。
- 始终按时间步分桶记录训练损失；如果早期时间步（接近 0）的损失高于后期（接近 1），速度参数化可能连接有误。
- 不要在同一个训练循环中混用整流流速度目标与 DDPM 噪声目标；选定其中一种。
- 在 Ampere 及更新的 GPU 上使用 bfloat16 训练；由于速度幅值的影响，float16 有时会在整流流中产生非数（Not a Number，NaN）梯度。
