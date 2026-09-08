import time
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd


def timing_comparison():
    print("=== 计时：列表（List）与 NumPy 对比 ===\n")

    size = 1_000_000

    start = time.perf_counter()
    python_list = [x ** 2 for x in range(size)]
    list_time = time.perf_counter() - start
    print(f"列表推导式（List comprehension）：{list_time:.4f}s")

    start = time.perf_counter()
    numpy_array = np.arange(size) ** 2
    numpy_time = time.perf_counter() - start
    print(f"NumPy:              {numpy_time:.4f}s")
    print(f"加速比（Speedup）：  {list_time / numpy_time:.1f}x")


def inline_plotting():
    print("\n=== 内嵌绘图（Inline Plotting）===\n")

    np.random.seed(42)
    x = np.linspace(0, 10, 200)
    y_sin = np.sin(x)
    y_noisy = y_sin + np.random.normal(0, 0.2, 200)

    fig, axes = plt.subplots(1, 2, figsize=(12, 4))

    axes[0].plot(x, y_sin, label="sin(x)")
    axes[0].plot(x, y_noisy, alpha=0.5, label="含噪信号（Noisy）")
    axes[0].set_title("信号与噪声（Signal vs Noise）")
    axes[0].legend()

    axes[1].hist(y_noisy - y_sin, bins=30, edgecolor="black")
    axes[1].set_title("噪声分布（Noise Distribution）")

    plt.tight_layout()
    plt.savefig("notebook_plot.png", dpi=100)
    print("图像已保存到 notebook_plot.png")
    print("在笔记本（Notebook）中，plt.show() 会内嵌显示该图像。")


def dataframe_display():
    print("\n=== 数据框（DataFrame）显示 ===\n")

    df = pd.DataFrame({
        "model": ["Linear Regression", "Random Forest", "Neural Network", "XGBoost"],
        "accuracy": [0.72, 0.89, 0.94, 0.91],
        "train_time_sec": [0.1, 2.3, 45.6, 8.2],
        "parameters": [102, 50_000, 1_200_000, 25_000],
    })

    print("在笔记本中，只需输入 'df' 即可渲染格式丰富的 HTML 表格：\n")
    print(df.to_string(index=False))

    print(f"\n最佳模型（Model）：{df.loc[df['accuracy'].idxmax(), 'model']}")
    print(f"最快模型：{df.loc[df['train_time_sec'].idxmin(), 'model']}")


def memory_check():
    print("\n=== 内存用量（Memory Usage）===\n")

    small = np.random.randn(1000)
    medium = np.random.randn(100_000)
    large = np.random.randn(10_000_000)

    for name, arr in [("1K", small), ("100K", medium), ("10M", large)]:
        size_mb = arr.nbytes / 1e6
        print(f"数组（Array）{name:>4s} 个元素：{size_mb:>8.2f} MB")

    print(f"\nPython 进程内存：大数组约占 {sys.getsizeof(large) / 1e6:.1f} MB")
    print("笔记本中，内存占用会跨单元格（Cell）累积。重启内核（Kernel）即可释放。")


def magic_command_equivalents():
    print("\n=== 魔法命令（Magic Command）的等效操作 ===\n")
    print("在笔记本中，可以使用魔法命令：")
    print("  %timeit np.random.randn(10000)    -> 微基准测试（Micro-benchmark）")
    print("  %%time long_operation()            -> 实际耗时（Wall clock time）")
    print("  %matplotlib inline                 -> 在单元格中显示图像")
    print("  !pip install package               -> 在笔记本中安装软件包")
    print("  %env VAR                           -> 检查环境变量（Environment variable）")
    print()

    iterations = 1000
    start = time.perf_counter()
    for _ in range(iterations):
        np.random.randn(10000)
    elapsed = time.perf_counter() - start
    per_call = elapsed / iterations * 1e6

    print(f"手动计时（类似 %%timeit）：np.random.randn(10000)")
    print(f"  每次调用 {per_call:.1f} us（迭代 {iterations} 次）")


if __name__ == "__main__":
    print("笔记本技巧（Notebook Tips）：关键用法\n")
    print("在 Jupyter 笔记本中运行这些示例，可查看丰富的输出格式。\n")

    timing_comparison()
    inline_plotting()
    dataframe_display()
    memory_check()
    magic_command_equivalents()
