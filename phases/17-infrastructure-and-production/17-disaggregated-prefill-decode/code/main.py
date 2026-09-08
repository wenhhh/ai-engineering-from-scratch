"""共置（Colocated）与分离式（Disaggregated）推理服务模拟器，仅使用 Python 标准库。

模拟同一请求在共置方案（同一 GPU）与分离式方案（预填充池 + 解码池 + KV 传输）中的处理，
遍历提示词（Prompt）长度，寻找两种方案的交叉点。
"""

from __future__ import annotations


# H100 级 GPU 上 70B FP8 模型的 2026 年示意常量。
PREFILL_TOK_PER_MS = 40.0         # 单张 GPU 每毫秒的预填充（Prefill）词元吞吐量
DECODE_TOK_PER_MS_COLOCATED = 0.10
DECODE_TOK_PER_MS_DECODE_GPU = 0.18   # 内存优化资源池，类似 H200
KV_BYTES_PER_TOKEN_70B_FP8 = 125_000
NIXL_RDMA_GB_S = 100
NIXL_TCP_GB_S = 10


def ms_colocated(prompt: int, output: int) -> float:
    prefill_ms = prompt / PREFILL_TOK_PER_MS
    decode_ms = output / DECODE_TOK_PER_MS_COLOCATED
    return prefill_ms + decode_ms


def ms_disaggregated(prompt: int, output: int, use_rdma: bool = True) -> float:
    prefill_ms = prompt / PREFILL_TOK_PER_MS
    kv_bytes = prompt * KV_BYTES_PER_TOKEN_70B_FP8
    transport = NIXL_RDMA_GB_S if use_rdma else NIXL_TCP_GB_S
    transfer_ms = (kv_bytes / 1e9) / transport * 1000
    decode_ms = output / DECODE_TOK_PER_MS_DECODE_GPU
    return prefill_ms + transfer_ms + decode_ms


def main() -> None:
    print("=" * 95)
    print("分离式（Disaggregated）与共置（Colocated）：相同请求，不同 GPU 部署方式")
    print("=" * 95)
    header = f"{'提示词长度':>7}  {'输出长度':>7}  {'共置 ms':>15}  {'分离 RDMA ms':>17}  {'分离 TCP ms':>16}  更快的方案"
    print(header)
    print("-" * len(header))
    cases = [
        (256, 100), (512, 200), (1024, 300), (2048, 400),
        (4096, 500), (8192, 800), (16384, 1200), (32768, 2000),
    ]
    for prompt, output in cases:
        colo = ms_colocated(prompt, output)
        rdma = ms_disaggregated(prompt, output, use_rdma=True)
        tcp = ms_disaggregated(prompt, output, use_rdma=False)
        winner = "共置（Colocated）" if colo < rdma else "分离式（Disaggregated）"
        print(f"{prompt:>7}  {output:>7}  {colo:>14.1f}  {rdma:>17.1f}  {tcp:>16.1f}  {winner}")

    print()
    print("结果解读：提示词较长时，内存优化池的解码吞吐量收益超过键值缓存（KV Cache）传输开销，")
    print("分离式方案更快。TCP 传输会抬高盈亏平衡门槛；远程直接内存访问（RDMA）")
    print("让分离式方案更早获得收益。")


if __name__ == "__main__":
    main()
