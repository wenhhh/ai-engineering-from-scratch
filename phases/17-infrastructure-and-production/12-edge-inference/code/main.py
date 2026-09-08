"""边缘推理（Edge Inference）带宽受限解码模拟器，仅使用 Python 标准库。

对多种边缘设备，以 (weights_bytes / bandwidth_bytes_per_sec) 计算理论解码吞吐量，
并与实测基准对比，展示边缘设备上的解码主要受内存限制（Memory-bound），
而非计算能力限制（Compute-bound）。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Target:
    name: str
    bandwidth_gb_s: float
    observed_toks_per_s_llama8b_q4: float | None
    notes: str


TARGETS = [
    Target("数据中心 H100 HBM3",  3350, 170,  "参考上限"),
    Target("Jetson AGX Orin",        205,  45,  "连接边缘设备与数据中心"),
    Target("Apple M3 Max",           400,  55,  "统一内存（Unified Memory），MPS"),
    Target("Apple M4 (MacBook Air)", 120,  25,  "消费级笔记本电脑"),
    Target("Apple A18 (iPhone 16)",   60,   8,  "配备 Apple 神经网络引擎（ANE）的手机"),
    Target("Snapdragon 8 Gen 3",      77,   7,  "中高端 Android 设备"),
    Target("Snapdragon X Elite",     135,  22,  "Windows ARM 笔记本电脑"),
    Target("M3 Max 上的 WebGPU",       400,  41,  "浏览器带来的性能损失约 25%"),
    Target("Pixel 9 上的 WebGPU",       77,   6,  "移动浏览器 Chrome 121 及以上版本"),
]


def ceiling(target: Target, model_gb: float) -> float:
    seconds_per_token = model_gb / target.bandwidth_gb_s
    return 1 / seconds_per_token


def efficiency(observed: float | None, ceiling_val: float) -> str:
    if observed is None:
        return "    -"
    return f"{observed / ceiling_val * 100:4.0f}%"


def main() -> None:
    model_name = "Llama 3.1 8B Q4"
    model_gb = 4.7
    print("=" * 95)
    print(f"边缘解码吞吐上限：{model_name}，占用 HBM/DRAM {model_gb:.1f} GB")
    print("=" * 95)
    header = f"{'目标设备':26}  {'带宽 GB/s':>9}  {'上限（词元/秒）':>16}  {'实测值':>10}  {'效率':>11}  备注"
    print(header)
    print("-" * len(header))
    for t in TARGETS:
        c = ceiling(t, model_gb)
        obs = t.observed_toks_per_s_llama8b_q4
        eff = efficiency(obs, c)
        obs_display = f"{obs:>8.0f}  " if obs is not None else f"{'-':>10}  "
        print(f"{t.name:26}  {t.bandwidth_gb_s:8.0f}   {c:15.1f}   {obs_display}{eff:>11}  {t.notes}")

    print()
    print("结果解读：带宽决定吞吐上限；只有运行时（Runtime）效率不高时，计算能力才成为关键因素。")
    print()
    print("=" * 95)
    print("量化（Quantization）的影响：相同设备，不同格式")
    print("=" * 95)
    iphone_bw = 60.0
    for name, size in [("BF16", 18.8), ("INT8", 9.4), ("Q4 GGUF", 4.7), ("Q3 GGUF", 3.6)]:
        c = 1 / (size / iphone_bw)
        print(f"iPhone 16 + {name:8}  模型大小={size:5.1f} GB  上限={c:6.1f} 词元/秒")


if __name__ == "__main__":
    main()
