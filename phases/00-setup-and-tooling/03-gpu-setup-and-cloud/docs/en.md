# GPU 配置与云端使用（GPU Setup & Cloud）

> 学习时用 CPU 训练没问题。真正开展训练则需要 GPU。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 0，第 01 课
**Time:** ~45 分钟

## 学习目标（Learning Objectives）

- 使用 `nvidia-smi` 和 PyTorch 的 CUDA API 验证本地 GPU 是否可用
- 为 Google Colab 配置 T4 GPU，免费开展云端实验
- 对 CPU 和 GPU 上的矩阵乘法进行基准测试（Benchmark），测量加速比（Speedup）
- 根据 fp16 经验法则，估算显存（Video RAM，VRAM）能够容纳的最大模型

## 问题（The Problem）

阶段 1–3 的大多数课程用 CPU 就能顺利运行。但当你开始训练卷积神经网络（Convolutional Neural Network，CNN）、Transformer 或大语言模型（Large Language Model，LLM）时（阶段 4 及以后），就需要 GPU 加速。一次在 CPU 上耗时 8 小时的训练，在 GPU 上只需 10 分钟。

你有三种选择：本地 GPU、云端 GPU，或 Google Colab（免费）。

## 概念（The Concept）

```text
可选方案：

1. 本地 NVIDIA GPU
   费用：$0（你已经拥有它）
   配置：安装 CUDA + cuDNN
   最适合：日常使用、大型数据集

2. Google Colab（免费套餐）
   费用：$0
   配置：无
   最适合：快速实验、家中没有 GPU 的情况

3. 云端 GPU（Lambda、RunPod、Vast.ai）
   费用：$0.20-2.00/小时
   配置：SSH 连接 + 安装
   最适合：正式训练、大型模型
```

```figure
s0-gpu-dispatch
```

## 动手实现（Build It）

### 方案 1：本地 NVIDIA GPU（Option 1: Local NVIDIA GPU）

检查是否有可用的 GPU：

```bash
nvidia-smi
```

安装支持 CUDA 的 PyTorch：

```python
import torch

print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA version: {torch.version.cuda}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
```

### 方案 2：Google Colab（Option 2: Google Colab）

1. 访问 [colab.research.google.com](https://colab.research.google.com)
2. 选择“运行时（Runtime）> 更改运行时类型（Change runtime type）> T4 GPU”
3. 运行 `!nvidia-smi` 进行验证

将本课程的笔记本（Notebook）直接上传至 Colab。

### 方案 3：云端 GPU（Option 3: Cloud GPU）

对于 Lambda Labs、RunPod 或 Vast.ai：

```bash
ssh user@your-gpu-instance

pip install torch torchvision torchaudio
python -c "import torch; print(torch.cuda.get_device_name(0))"
```

### 没有 GPU 也没关系（No GPU? No problem.）

大多数课程可以在 CPU 上运行。需要 GPU 的课程会明确说明，并提供 Colab 链接。

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using: {device}")
```

## 动手实现：GPU 与 CPU 基准测试（Build It: GPU vs CPU benchmark）

```python
import torch
import time

size = 5000

a_cpu = torch.randn(size, size)
b_cpu = torch.randn(size, size)

start = time.time()
c_cpu = a_cpu @ b_cpu
cpu_time = time.time() - start
print(f"CPU: {cpu_time:.3f}s")

if torch.cuda.is_available():
    a_gpu = a_cpu.to("cuda")
    b_gpu = b_cpu.to("cuda")

    torch.cuda.synchronize()
    start = time.time()
    c_gpu = a_gpu @ b_gpu
    torch.cuda.synchronize()
    gpu_time = time.time() - start
    print(f"GPU: {gpu_time:.3f}s")
    print(f"Speedup: {cpu_time / gpu_time:.0f}x")
```

## 练习（Exercises）

1. 运行上述基准测试，比较 CPU 和 GPU 的耗时
2. 如果没有 GPU，就在 Google Colab 上运行并比较结果
3. 检查显存容量，估算能容纳的最大模型（经验法则：fp16 下每个参数占 2 字节）

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| CUDA | “GPU 编程” | NVIDIA 的并行计算平台，让你可以在 GPU 上运行代码 |
| 显存（Video RAM，VRAM） | “GPU 内存” | GPU 上的视频内存，独立于系统内存，其容量限制了模型大小。 |
| fp16 | “半精度（Half precision）” | 16 位浮点数，内存占用是 fp32 的一半，精度损失很小 |
| 张量核心（Tensor Core） | “高速矩阵硬件” | 专用于矩阵乘法的 GPU 核心，比普通核心快 4–8 倍 |
