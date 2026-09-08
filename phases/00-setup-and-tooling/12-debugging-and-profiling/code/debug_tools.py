import sys
import time
import tracemalloc
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


def debug_print(name, tensor):
    print(f"  {name}: shape={tensor.shape}, dtype={tensor.dtype}, "
          f"device={tensor.device}, "
          f"min={tensor.min().item():.4f}, max={tensor.max().item():.4f}, "
          f"mean={tensor.mean().item():.4f}, "
          f"has_nan={tensor.isnan().any().item()}")


class Timer:
    def __init__(self, name=""):
        self.name = name
        self.elapsed = 0.0

    def __enter__(self):
        self.start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.elapsed = time.perf_counter() - self.start
        print(f"  [{self.name}] {self.elapsed:.4f}s")


def check_shapes(model, sample_input):
    print(f"  输入（Input）：{sample_input.shape}")
    hooks = []

    def make_hook(name):
        def hook(module, inp, out):
            in_shape = inp[0].shape if isinstance(inp, tuple) else inp.shape
            out_shape = out.shape if hasattr(out, "shape") else type(out).__name__
            print(f"    {name}: {in_shape} -> {out_shape}")
        return hook

    for name, module in model.named_modules():
        if name:
            hooks.append(module.register_forward_hook(make_hook(name)))

    with torch.no_grad():
        model(sample_input)

    for h in hooks:
        h.remove()


def detect_nan(model, loss, step):
    if torch.isnan(loss):
        print(f"  在第 {step} 步检测到 NaN 损失（Loss）")
        for name, param in model.named_parameters():
            if param.grad is not None:
                if torch.isnan(param.grad).any():
                    print(f"    {name} 中存在 NaN 梯度（Gradient）")
                if torch.isinf(param.grad).any():
                    print(f"    {name} 中存在 Inf 梯度（Gradient）")
        return True
    return False


def check_devices(model, *tensors):
    model_device = next(model.parameters()).device
    print(f"  模型设备（Model device）：{model_device}")
    for i, t in enumerate(tensors):
        status = "OK" if t.device == model_device else "MISMATCH"
        print(f"    张量（Tensor）{i}：{t.device} [{status}]")


def check_gradient_health(model):
    total_norm = 0.0
    for name, param in model.named_parameters():
        if param.grad is not None:
            grad_norm = param.grad.data.norm(2).item()
            total_norm += grad_norm ** 2
            if grad_norm > 100:
                print(f"    警告：{name} 的梯度过大：{grad_norm:.2f}")
            if grad_norm == 0:
                print(f"    警告：{name} 的梯度为零")
    total_norm = total_norm ** 0.5
    print(f"  梯度总范数（Total gradient norm）：{total_norm:.4f}")
    return total_norm


def demo_print_debugging():
    print("\n--- 1. 张量打印调试（Print Debugging）---")
    x = torch.randn(32, 784)
    debug_print("输入批次（Input batch）", x)

    w = torch.randn(784, 128)
    out = x @ w
    debug_print("矩阵乘法后（After matmul）", out)

    with_nan = out.clone()
    with_nan[0, 0] = float("nan")
    debug_print("注入 NaN 后", with_nan)


def demo_timing():
    print("\n--- 2. 代码片段计时（Timing）---")

    with Timer("矩阵乘法（Matrix multiply）1000x1000"):
        a = torch.randn(1000, 1000)
        b = torch.randn(1000, 1000)
        _ = a @ b

    with Timer("矩阵乘法（Matrix multiply）5000x5000"):
        a = torch.randn(5000, 5000)
        b = torch.randn(5000, 5000)
        _ = a @ b


def demo_memory_tracking():
    print("\n--- 3. 内存跟踪（Memory Tracking，tracemalloc）---")
    tracemalloc.start()

    if HAS_TORCH:
        data = [torch.randn(100, 100) for _ in range(100)]
        more_data = torch.randn(1000, 1000)
    else:
        data = [bytearray(4 * 100 * 100) for _ in range(100)]
        more_data = bytearray(4 * 1000 * 1000)

    snapshot = tracemalloc.take_snapshot()
    top_stats = snapshot.statistics("lineno")
    print("  最大的 5 项内存分配（Memory allocations）：")
    for stat in top_stats[:5]:
        print(f"    {stat}")

    del data, more_data
    tracemalloc.stop()


def demo_shape_checking():
    print("\n--- 4. 检查数据经过模型时的形状（Shape）---")

    model = nn.Sequential(
        nn.Linear(784, 256),
        nn.ReLU(),
        nn.Linear(256, 64),
        nn.ReLU(),
        nn.Linear(64, 10),
    )

    sample = torch.randn(4, 784)
    check_shapes(model, sample)


def demo_nan_detection():
    print("\n--- 5. NaN 检测（Detection）---")

    model = nn.Sequential(
        nn.Linear(784, 256),
        nn.ReLU(),
        nn.Linear(256, 10),
    )

    x = torch.randn(4, 784)
    target = torch.randint(0, 10, (4,))
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=0.01)

    optimizer.zero_grad()
    output = model(x)
    loss = criterion(output, target)
    loss.backward()
    print(f"  正常损失（Loss）：{loss.item():.4f}")
    nan_found = detect_nan(model, loss, step=0)
    print(f"  是否检测到 NaN：{nan_found}")

    fake_nan_loss = torch.tensor(float("nan"))
    print(f"  模拟的 NaN 损失：{fake_nan_loss.item()}")
    nan_found = detect_nan(model, fake_nan_loss, step=99)
    print(f"  是否检测到 NaN：{nan_found}")


def demo_device_checking():
    print("\n--- 6. 设备检查（Device Checking）---")

    model = nn.Linear(10, 5)
    t1 = torch.randn(4, 10)
    t2 = torch.randn(4, 10)

    check_devices(model, t1, t2)

    if torch.cuda.is_available():
        model_gpu = model.cuda()
        t_cpu = torch.randn(4, 10)
        t_gpu = torch.randn(4, 10).cuda()
        print("  混用设备时：")
        check_devices(model_gpu, t_cpu, t_gpu)


def demo_gradient_health():
    print("\n--- 7. 梯度健康检查（Gradient Health Check）---")

    model = nn.Sequential(
        nn.Linear(784, 256),
        nn.ReLU(),
        nn.Linear(256, 10),
    )

    x = torch.randn(4, 784)
    target = torch.randint(0, 10, (4,))
    criterion = nn.CrossEntropyLoss()

    output = model(x)
    loss = criterion(output, target)
    loss.backward()
    check_gradient_health(model)


def demo_gpu_memory():
    print("\n--- 8. GPU 显存汇总（Memory Summary）---")

    if not torch.cuda.is_available():
        print("  没有可用 GPU。跳过 GPU 显存演示。")
        print("  在配备 GPU 的机器上，torch.cuda.memory_summary() 会显示：")
        print("    - 各块大小对应的已分配显存（Allocated memory）")
        print("    - 已缓存（预留）的显存（Cached/reserved memory）")
        print("    - 显存用量峰值（Peak memory usage）")
        return

    print(f"  GPU: {torch.cuda.get_device_name(0)}")
    print(f"  已分配（Allocated）：{torch.cuda.memory_allocated() / 1e6:.1f} MB")
    print(f"  已缓存（Cached）：{torch.cuda.memory_reserved() / 1e6:.1f} MB")

    large_tensor = torch.randn(10000, 10000, device="cuda")
    print(f"  创建 10k x 10k 张量后：")
    print(f"    已分配：{torch.cuda.memory_allocated() / 1e6:.1f} MB")

    del large_tensor
    torch.cuda.empty_cache()
    print(f"  清理后：")
    print(f"    已分配：{torch.cuda.memory_allocated() / 1e6:.1f} MB")


def demo_logging():
    print("\n--- 9. 结构化日志（Structured Logging）---")

    logger.info("训练开始：lr=0.001, batch_size=32, epochs=10")
    logger.info("第 100 步：loss=2.3026, accuracy=0.10")
    logger.warning("检测到损失突增（Loss spike）：第 450 步为 15.7")
    logger.info("第 1000 步：loss=0.4512, accuracy=0.87")
    logger.info("训练完成：best_loss=0.3201")


def demo_conditional_breakpoint():
    print("\n--- 10. 条件断点模式（Conditional Breakpoint Pattern）---")
    print("  在实际代码中使用以下模式：")
    print()
    print("    for step in range(num_steps):")
    print("        loss = train_step(model, batch)")
    print("        if loss.item() > 10 or torch.isnan(loss):")
    print("            breakpoint()  # 进入 pdb")
    print()
    print("  进入后可使用这些 pdb 命令：")
    print("    p tensor.shape       # 打印形状（Shape）")
    print("    p tensor.device      # 检查设备（Device）")
    print("    p tensor.grad        # 检查梯度（Gradients）")
    print("    p tensor.isnan().sum()  # 统计 NaN 数量")
    print("    c                    # 继续执行")
    print("    q                    # 退出调试器（Debugger）")


def main():
    print("=" * 60)
    print("  AI 调试与性能分析工具包（Debugging and Profiling Toolkit）")
    print("  阶段 0，第 12 课")
    print("=" * 60)

    if not HAS_TORCH:
        print("\n未安装 PyTorch。安装命令：")
        print("  uv pip install torch")
        print("\n仅运行不依赖 PyTorch 的演示……\n")
        demo_memory_tracking()
        demo_logging()
        return 1

    demo_print_debugging()
    demo_timing()
    demo_memory_tracking()
    demo_shape_checking()
    demo_nan_detection()
    demo_device_checking()
    demo_gradient_health()
    demo_gpu_memory()
    demo_logging()
    demo_conditional_breakpoint()

    print("\n" + "=" * 60)
    print("  所有演示已完成。")
    print("  下一步：主动引入错误，练习发现它们。")
    print("=" * 60 + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
