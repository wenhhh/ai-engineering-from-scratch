"""简化的量化（Quantization）显存与吞吐量计算器，仅使用 Python 标准库。

针对一组量化格式和模型规模，计算：
  - 权重显存
  - 键值缓存（KV Cache）显存，单独计算，随并发数和上下文长度增长
  - 激活值（Activation）显存的近似值
  - 相对解码吞吐量，展示受内存带宽限制时的趋势

量化格式由权重有效位数和 KV 位数表示。本例用于教学。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Format:
    name: str
    weight_bits: float
    kv_bits: float
    engine: str
    notes: str


FORMATS = [
    Format("BF16 基线（Baseline，vLLM）",       16, 16, "vLLM",     "参考方案"),
    Format("GGUF Q5_K_M (llama.cpp)",     5, 16, "llama.cpp", "CPU / 边缘设备（Edge）"),
    Format("GGUF Q4_K_M (llama.cpp)",     4, 16, "llama.cpp", "CPU / 边缘设备，默认方案"),
    Format("GPTQ-Int4 + Marlin (vLLM)",   4, 16, "vLLM",     "支持多低秩适配器（Multi-LoRA）"),
    Format("AWQ-Int4 + Marlin (vLLM)",    4, 16, "vLLM",     "INT4 下单次通过率（Pass@1）最佳"),
    Format("FP8 (vLLM / TRT-LLM)",        8,  8, "multi",    "推理任务的稳妥默认选择"),
    Format("NVFP4 + FP8 KV (TRT-LLM)",    4,  8, "TRT-LLM",  "面向 Blackwell 的激进方案"),
]


def memory_breakdown(params_b: float, fmt: Format,
                     concurrency: int = 128, ctx: int = 2048) -> dict:
    weight_gb = params_b * fmt.weight_bits / 8
    # KV 缓存近似公式：num_layers * 2 * kv_heads * head_dim * ctx * bytes/element。
    layers = 64 * (params_b / 70.0)**0.5
    kv_heads = 8
    head_dim = 128
    per_seq_kv_gb = layers * 2 * kv_heads * head_dim * ctx * (fmt.kv_bits / 8) / 1e9
    kv_total = per_seq_kv_gb * concurrency
    activations_gb = 0.05 * params_b       # 粗略估算系数
    return {
        "weight": weight_gb,
        "kv": kv_total,
        "act": activations_gb,
        "total": weight_gb + kv_total + activations_gb,
    }


def relative_throughput(fmt: Format) -> float:
    """解码受内存带宽限制，每词元读取的权重字节越少，吞吐量越高。
    以 BF16 = 1.0 进行归一化（Normalization）。"""
    return 16 / fmt.weight_bits


def gpu_check(total_gb: float) -> str:
    if total_gb <= 80:
        return "H100 80GB"
    if total_gb <= 141:
        return "H200 141GB"
    if total_gb <= 192:
        return "B200 192GB"
    return "多张 GPU"


def print_scenario(params_b: float, concurrency: int, ctx: int) -> None:
    print(f"模型：{params_b}B 参数  |  并发数 {concurrency}  |  上下文长度 {ctx}")
    print("-" * 98)
    print(f"{'格式':36} {'权重 GB':>7} {'KV GB':>7} {'激活值 GB':>7} "
          f"{'合计':>7} {'所需 GPU':>14} {'相对吞吐量':>10}")
    for f in FORMATS:
        m = memory_breakdown(params_b, f, concurrency, ctx)
        tput = relative_throughput(f)
        print(f"{f.name:36} {m['weight']:7.1f} {m['kv']:7.1f} {m['act']:7.1f} "
              f"{m['total']:7.1f} {gpu_check(m['total']):>14} {tput:10.2f}x")
    print()


def main() -> None:
    print("=" * 98)
    print("简化量化（Quantization）计算器：各格式的显存占用与相对吞吐量")
    print("=" * 98)
    print()

    print_scenario(params_b=7, concurrency=128, ctx=2048)
    print_scenario(params_b=70, concurrency=128, ctx=2048)
    print_scenario(params_b=70, concurrency=256, ctx=8192)
    print_scenario(params_b=405, concurrency=128, ctx=2048)

    print("=" * 98)
    print("关键发现")
    print("-" * 98)
    print("  1. KV 缓存随并发数与上下文长度的乘积线性增长。")
    print("     对 70B 模型，256 并发、8k 上下文时，仅 KV 占用就远超权重量化节省的显存。")
    print("  2. AWQ 与 GPTQ 的 4 位占用相同；选择取决于低秩适配（LoRA）支持和计算内核（Kernel）。")
    print("  3. NVFP4 + FP8 KV 同时压缩权重和 KV，仅适用于 Blackwell。")
    print("  4. 对推理工作负载，FP8 虽然占用更多显存，仍是稳妥的默认选择。")
    print("  5. GGUF 适合 CPU；在 vLLM 中仅约 93 词元/秒，原因是引擎选型不合适，并非程序缺陷。")


if __name__ == "__main__":
    main()
