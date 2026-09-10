"""模拟实验脚本：读取 JSON 配置，输出中间指标与最终指标。

支持的配置项：
    k          : int    稀疏性参数；在合成公式中，增大 k 会降低困惑度，效果在 32 处封顶
    steps      : int    要模拟的内部训练步数
    sleep_s    : float  每步等待秒数；测试用它触发超时
    allocate_mb: int    额外持有的内存，按 1024² 字节计；可用于触发内存轮询器
    __seed     : int    NumPy 随机数的固定种子

依赖标准库和 NumPy。脚本刻意保持简单，本课重点是运行器，不执行真实模型训练。
"""

from __future__ import annotations

import json
import os
import sys
import time

import numpy as np


def main() -> int:
    if len(sys.argv) < 2:
        # 缺少配置路径；JSON 错误值保留。
        print(json.dumps({"error": "missing config path"}), file=sys.stderr)
        return 2
    cfg_path = sys.argv[1]
    try:
        with open(cfg_path, "rt", encoding="utf-8") as fh:
            cfg = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        # 配置无法读取或解析。
        print(json.dumps({"error": f"bad config: {exc}"}), file=sys.stderr)
        return 2

    seed = int(cfg.get("__seed", 0))
    k = int(cfg.get("k", 8))
    steps = max(1, int(cfg.get("steps", 4)))
    sleep_s = float(cfg.get("sleep_s", 0.0))
    allocate_mb = int(cfg.get("allocate_mb", 0))

    rng = np.random.default_rng(seed)
    held = None
    if allocate_mb > 0:
        held = bytearray(allocate_mb * 1024 * 1024)

    base_loss = 5.0
    losses: list[float] = []
    for step in range(steps):
        noise = float(rng.normal(0, 0.02))
        loss_step = base_loss * (0.9 ** step) - 0.05 * min(k, 32) / 32.0 + noise
        losses.append(round(loss_step, 6))
        intermediate = {
            "step": step,
            "loss": losses[-1],
            "perplexity": round(float(np.exp(losses[-1])), 6),
            "final_loss": losses[-1],
        }
        print(json.dumps(intermediate), flush=True)
        if sleep_s > 0:
            time.sleep(sleep_s)

    final = {
        "perplexity": round(float(np.exp(losses[-1])), 6),
        "final_loss": losses[-1],
        "steps_completed": steps,
        "k": k,
        "seed": seed,
    }
    print(json.dumps(final), flush=True)
    if held is not None:
        held[0] = 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
