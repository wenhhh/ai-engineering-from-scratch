"""自托管（Self-hosted）LLM 引擎决策树（Decision Tree）遍历器，仅使用 Python 标准库。

根据硬件、规模和工作负载选择引擎，并给出原因。
"""

from __future__ import annotations


def pick_engine(hardware: str, scale: str, workload: str) -> dict:
    reasons = []
    engine = None

    if hardware == "CPU":
        engine = "llama.cpp"
        reasons.append("硬件为 CPU，只有 llama.cpp 具备竞争力")
        if scale == "single_user":
            reasons.append("单用户开发场景：Ollama 封装 llama.cpp，提供一条命令即可使用的体验")
            engine = "Ollama（底层为 llama.cpp）"
    elif hardware == "Apple Silicon":
        engine = "Ollama" if scale == "single_user" else "llama.cpp"
        reasons.append("Apple Silicon 通过 llama.cpp 使用 Metal，Ollama 在其上提供封装")
    elif hardware == "AMD":
        engine = "vLLM"
        reasons.append("AMD 可使用 vLLM 的 ROCm 支持；TRT-LLM 仅支持 NVIDIA")
        if "agentic" in workload.lower() or "prefix" in workload.lower():
            engine = "SGLang"
            reasons.append("智能体（Agentic）或大量复用前缀的工作负载：选择 SGLang 基数注意力（RadixAttention）")
    elif hardware == "NVIDIA Hopper":
        if "agentic" in workload.lower() or "prefix" in workload.lower():
            engine = "SGLang"
            reasons.append("Hopper 上的智能体或前缀复用场景：SGLang 专门针对这类负载优化")
        elif scale == "single_user":
            engine = "Ollama"
            reasons.append("Hopper 上的单用户需求属于开发场景，Ollama 已经够用")
        else:
            engine = "vLLM"
            reasons.append("Hopper 生产环境：vLLM 是通用的默认选择")
    elif hardware == "NVIDIA Blackwell":
        engine = "TRT-LLM"
        reasons.append("Blackwell 且优先考虑吞吐量：TRT-LLM 在 B200/GB200 上领先")
        if scale in ("small_team", "production") and "agentic" not in workload.lower():
            reasons.append("vLLM Blackwell SM120 紧随其后，参考 2026 年 2 月的 v0.15.1")

    if scale == "enterprise":
        reasons.append("用户超过 1 万时，叠加生产部署栈（Production Stack，阶段 17 · 18）"
                      "、分离式部署（Disaggregated，阶段 17 · 17）和缓存感知路由（Cache-aware Router，阶段 17 · 11）")

    reasons.append("TGI 自 2025 年 12 月 11 日起进入维护模式，新项目默认不选 TGI")

    return {
        "hardware": hardware,
        "scale": scale,
        "workload": workload,
        "engine": engine,
        "reasons": reasons,
    }


# 保留英文匹配样本；agentic、prefix 等词参与决策树分支判断。
SCENARIOS = [
    ("CPU",              "single_user",   "chat"),
    ("Apple Silicon",    "single_user",   "coding assistant"),
    ("NVIDIA Hopper",    "production",    "general chat"),
    ("NVIDIA Hopper",    "production",    "agentic multi-turn"),
    ("NVIDIA Blackwell", "enterprise",    "MoE frontier serving"),
    ("AMD",              "production",    "RAG with heavy prefix reuse"),
    ("NVIDIA Hopper",    "small_team",    "long-context 128K"),
]


def main() -> None:
    print("=" * 80)
    print("自托管引擎决策树：硬件、规模与工作负载")
    print("=" * 80)
    for hw, sc, wl in SCENARIOS:
        d = pick_engine(hw, sc, wl)
        print(f"\n[{hw}] [{sc}] [{wl}]")
        print(f"  → 引擎：{d['engine']}")
        for r in d["reasons"]:
            print(f"    · {r}")


if __name__ == "__main__":
    main()
