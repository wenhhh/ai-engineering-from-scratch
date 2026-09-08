---
name: skill-latency-profiler
description: 编写完整的延迟基准测试脚本，包含预热、同步、百分位数和内存跟踪
version: 1.0.0
phase: 4
lesson: 15
tags: [edge, deployment, profiling, benchmarking]
---

# 延迟性能分析器（Latency Profiler）

为任意 PyTorch 模型生成规范的延迟基准测试，让下游使用者能够信赖报告。

## 使用时机（When to use）

- 部署选型前比较多个候选主干网络。
- 量化或剪枝前后。
- 更换运行时后，例如即时执行、ONNX 与 TensorRT 之间切换。
- 生成部署就绪报告。

## 输入（Inputs）

- `model`：PyTorch `nn.Module`。
- `input_shape`：例如 `(1, 3, 224, 224)` 的元组。
- `device`：`cpu` | `cuda` | `mps`。
- `warmup`：默认 10。
- `iters`：默认 100。

## 检查项（Checks）

### 1. 预热（Warmup）
不计时运行模型 `warmup` 次，消除首次前向传播的即时编译（Just-in-Time Compilation，JIT）与冷缓存影响。

### 2. 同步（Synchronisation）
对于 `cuda`，在每次计时前向传播之前和之后调用 `torch.cuda.synchronize()`。
对于 `mps`，调用 `torch.mps.synchronize()`。

### 3. 计时器（Timer）
使用 `time.perf_counter()` 测量实际耗时，并转换为毫秒。

### 4. 百分位数（Percentiles）
对全部计时结果排序，报告 `p50, p90, p95, p99, mean, std`。

### 5. 内存（Memory）
对于 `cuda`，运行后调用 `torch.cuda.max_memory_allocated()` 并减去基线。
对于 `cpu`，在运行前后使用 `tracemalloc` 或 `psutil.Process().memory_info().rss`。

### 6. 批量大小扫描（Batch-size sweep）
可选：针对 `batch_size in [1, 4, 16, 32]` 重复基准测试，展示吞吐量与延迟的权衡。

## 输出模板（Output template）

```python
import time
import torch
import psutil, os

def profile(model, input_shape, device="cpu", warmup=10, iters=100):
    proc = psutil.Process(os.getpid())
    baseline_rss = proc.memory_info().rss / 1e6

    model = model.to(device).eval()
    x = torch.randn(input_shape, device=device)

    def sync():
        if device == "cuda":
            torch.cuda.synchronize()
        elif device == "mps":
            torch.mps.synchronize()

    with torch.no_grad():
        for _ in range(warmup):
            model(x)
        sync()
        if device == "cuda":
            torch.cuda.reset_peak_memory_stats()

        times = []
        for _ in range(iters):
            sync()
            t0 = time.perf_counter()
            model(x)
            sync()
            times.append((time.perf_counter() - t0) * 1000)

    times.sort()
    mean = sum(times) / len(times)
    std  = (sum((t - mean) ** 2 for t in times) / len(times)) ** 0.5

    def pct(p):
        idx = max(0, min(len(times) - 1, int(len(times) * p) - 1))
        return times[idx]

    report = {
        "p50_ms":  pct(0.50),
        "p90_ms":  pct(0.90),
        "p95_ms":  pct(0.95),
        "p99_ms":  pct(0.99),
        "mean_ms": mean,
        "std_ms":  std,
        "rss_mb":  proc.memory_info().rss / 1e6 - baseline_rss,
    }
    if device == "cuda":
        report["peak_cuda_mb"] = torch.cuda.max_memory_allocated() / 1e6

    return report
```

## 规则（Rules）

- 始终预热；不要信任首次前向传播的耗时。
- 使用百分位数，而不只是均值。单个异常值可能让均值翻倍，却几乎不影响 p50。
- 使用与生产一致的 input_shape；224x224 的延迟不是 384x384 的延迟。
- 对 CUDA，绝不省略 `torch.cuda.synchronize()`；没有同步的数字没有意义。
- 与测量数字一起记录 torch 版本、CUDA 版本和设备名称，否则无法比较。
