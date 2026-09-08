---
name: skill-noise-schedule-designer
description: 根据 T 和目标破坏程度生成线性、余弦或 sigmoid beta 调度，并给出信噪比图
version: 1.0.0
phase: 4
lesson: 10
tags: [computer-vision, diffusion, noise-schedule, training]
---

# 噪声调度设计器（Noise Schedule Designer）

Beta 调度控制每个扩散步骤保留多少信号。差的调度会限制后续所有选择的训练效率和样本质量。

## 使用时机（When to use）

- 开始新的扩散训练，选择 T 与 beta。
- 调试生成模糊样本的模型，可能是调度太激进；或无法学习结构的模型，可能是调度太温和。
- 比较不同论文中使用不同调度的设计。

## 输入（Inputs）

- `T`：时间步数，通常为 100–1000。
- `type`：linear | cosine | sigmoid。
- `target_alpha_bar_final`：t=T 时保留的信号比例，默认 0.001，即 99.9% 被破坏。
- 可选的 `image_resolution`：大图像更适合破坏较慢的调度，例如余弦或平移调度。

## 调度公式（Schedule formulas）

### 线性（Linear）
```
beta_t = beta_start + (beta_end - beta_start) * (t - 1) / (T - 1)
```
默认 beta_start=1e-4、beta_end=0.02，来自 DDPM 论文。

### 余弦（Cosine，Nichol 与 Dhariwal，2021）
```
alpha_bar_t = cos^2((t/T + s) / (1 + s) * pi/2)
beta_t = 1 - alpha_bar_t / alpha_bar_{t-1}
```
s = 0.008。保留信号更久，低步数时更好。

### S 形函数（Sigmoid）
```
alpha_bar_t = 1 / (1 + exp(k * (t/T - 0.5)))
```
k = 6 至 12。是合适的折中，一些 SDXL 变体采用它。

## 步骤（Steps）

1. 按公式计算 betas。
2. 预计算 `alphas`、`alphas_cumprod`、`sqrt_alphas_cumprod`、`sqrt_one_minus_alphas_cumprod`。
3. 计算信噪比（Signal-to-Noise Ratio，SNR）：SNR_t = alpha_bar_t / (1 - alpha_bar_t)，生成其随时间变化的摘要。
4. 验证 `alphas_cumprod[T-1]` 与 `target_alpha_bar_final` 的偏差在 10% 以内；否则调整线性的 beta_end、余弦的 s 或 sigmoid 的 k，重新尝试。
5. 报告三个检查点：
   - `t=T*0.25`：早期破坏
   - `t=T*0.5`：中点
   - `t=T*0.75`：接近末尾

## 报告（Report）

```
[schedule]
  type:   <名称>
  T:      <整数>
  beta_start: <浮点数>   beta_end: <浮点数>

[signal retention]
  t=0.25T:  alpha_bar=<X>  SNR=<X>
  t=0.5T:   alpha_bar=<X>  SNR=<X>
  t=0.75T:  alpha_bar=<X>  SNR=<X>
  t=T:      alpha_bar=<X>  SNR=<X>

[warnings]
  - <若 alpha_bar 在 0.75T 之前崩塌>
  - <若 beta_end 使 log-SNR 出现 NaN>
```

## 规则（Rules）

- 绝不生成包含任意 `alpha_bar_t <= 0` 的调度；将低于 1e-5 的值截到下限，并警告。
- 低步数采样（< 30 步）默认推荐余弦。
- 对 `quality_target == research` 默认线性，DDPM 基线采用线性调度报告。
- 当 `image_resolution > 256`，建议平移调度（Chen，2023），在高分辨率下保留更多信号。
