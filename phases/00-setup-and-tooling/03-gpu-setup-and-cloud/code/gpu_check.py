import time


def check_gpu():
    try:
        import torch
    except ImportError:
        print("未安装 PyTorch。请运行：pip install torch")
        return

    print("=== GPU 检查 ===\n")
    print(f"PyTorch 版本：{torch.__version__}")
    print(f"CUDA 是否可用：{torch.cuda.is_available()}")

    if not torch.cuda.is_available():
        print("\n未检测到 GPU。这不影响大多数课程。")
        print("对于大量使用 GPU 的课程，可使用 Google Colab（免费）。")
        return

    print(f"CUDA 版本：{torch.version.cuda}")
    print(f"GPU: {torch.cuda.get_device_name(0)}")

    props = torch.cuda.get_device_properties(0)
    print(f"显存（Memory）：{props.total_memory / 1e9:.1f} GB")
    print(f"计算能力（Compute capability）：{props.major}.{props.minor}")

    print("\n=== CPU 与 GPU 基准测试（Benchmark）===\n")
    size = 4000

    a = torch.randn(size, size)
    b = torch.randn(size, size)

    start = time.time()
    _ = a @ b
    cpu_time = time.time() - start
    print(f"CPU 矩阵乘法（Matrix multiply，{size}x{size}）：{cpu_time:.3f}s")

    a_gpu = a.to("cuda")
    b_gpu = b.to("cuda")
    torch.cuda.synchronize()

    start = time.time()
    _ = a_gpu @ b_gpu
    torch.cuda.synchronize()
    gpu_time = time.time() - start
    print(f"GPU 矩阵乘法（Matrix multiply，{size}x{size}）：{gpu_time:.3f}s")
    print(f"加速比（Speedup）：{cpu_time / gpu_time:.0f}x")

    vram_gb = props.total_memory / 1e9
    params_fp16 = vram_gb * 1e9 / 2
    params_billions = params_fp16 / 1e9
    print(f"\n估算的模型最大规模（fp16）：约 {params_billions:.0f}B 个参数（Parameters）")


if __name__ == "__main__":
    check_gpu()
