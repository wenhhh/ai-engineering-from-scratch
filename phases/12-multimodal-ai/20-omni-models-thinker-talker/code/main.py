"""Thinker-Talker 流式流水线：首个音频字节延迟（TTFAB）计算器与 VAD 轮次交替。

仅使用标准库。不处理真实音频，重点是 Thinker（文本）与 Talker（语音）
之间并行流式处理的延迟预算和并发方式。

译注：本例的延迟数值是模拟预算，不是真实模型测量。demo_vad 的原始输出
把用户停说后的延迟写为约 400 ms，但事件时间线还包含 200 ms 静音检测，
从用户停说到首次音频输出实际为 600 ms；保留原算法和输出中的原始数值，
在此说明差异。VADEvent.kind 在本例中仅用于打印事件说明，不参与分支判断。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class StreamConfig:
    thinker_b: int
    talker_m: int
    mic_sr: int = 16000
    include_vision: bool = False


@dataclass
class LatencyComponent:
    name: str
    ms: float


def ttfab(cfg: StreamConfig) -> list[LatencyComponent]:
    components = []
    mic_ms = 40 + (cfg.mic_sr // 8000) * 5
    components.append(LatencyComponent("麦克风 -> 语音词元", mic_ms))

    prefill = 100 * (cfg.thinker_b / 7.0)
    if cfg.include_vision:
        prefill += 80
    components.append(LatencyComponent("Thinker 预填充（提示词 + 历史记录）", prefill))

    first_text = 40 * (cfg.thinker_b / 7.0)
    components.append(LatencyComponent("Thinker 首个文本词元", first_text))

    talker_first = max(15, 20 * (cfg.talker_m / 300.0))
    components.append(LatencyComponent("Talker 首批语音词元", talker_first))

    rvq_decode = 30
    components.append(LatencyComponent("残差向量量化解码（8 层并行）", rvq_decode))

    wave_decode = 70
    components.append(LatencyComponent("波形解码器（SNAC 级别）", wave_decode))
    return components


def print_ttfab(cfg: StreamConfig) -> float:
    print(f"\n配置：Thinker={cfg.thinker_b}B  Talker={cfg.talker_m}M  "
          f"麦克风采样率={cfg.mic_sr}Hz  启用视觉={cfg.include_vision}")
    print("-" * 60)
    total = 0.0
    for c in ttfab(cfg):
        total += c.ms
        print(f"  {c.name:<40}  +{c.ms:>5.0f} ms  ({total:>6.0f})")
    print(f"  首个音频字节延迟（TTFAB）= {total:.0f} ms", end=" ")
    if total < 250:
        print("  -> GPT-4o 级别")
    elif total < 400:
        print("  -> 适合自然对话")
    elif total < 700:
        print("  -> 能感到延迟，但仍可用")
    else:
        print("  -> 反应迟缓，用户容易分心")
    return total


@dataclass
class VADEvent:
    time_ms: float
    kind: str


def simulate_turn_taking(silence_threshold_ms: int = 200) -> list[VADEvent]:
    """模拟通过静音检测判断用户轮次结束。"""
    events = []
    events.append(VADEvent(0, "用户开始说话"))
    events.append(VADEvent(450, "用户音频词元正在流式输入"))
    events.append(VADEvent(3800, "用户停止说话"))
    events.append(VADEvent(3800 + silence_threshold_ms, "VAD 触发轮次结束"))
    events.append(VADEvent(3800 + silence_threshold_ms + 200, "Thinker 开始预填充"))
    events.append(VADEvent(3800 + silence_threshold_ms + 400, "Talker 首次输出音频"))
    return events


def demo_vad() -> None:
    print("\n半双工轮次交替（VAD 静音阈值为 200 ms）")
    print("-" * 60)
    for e in simulate_turn_taking(200):
        print(f"  t={e.time_ms:>6.0f} ms  {e.kind}")
    print("  用户停止说话后的净响应延迟：约 400 ms")


def duplex_modes() -> None:
    print("\n双工模式")
    print("-" * 60)
    modes = [
        ("半双工",  "用户说话，模型聆听；然后交换角色，轮次清晰"),
        ("轮次交替",  "VAD 通过静音检测轮次结束（200-400 ms）"),
        ("全双工",  "双方都能说话；需要相应训练和对话反馈数据"),
    ]
    for mode, note in modes:
        print(f"  {mode:<14}: {note}")


def main() -> None:
    print("=" * 60)
    print("全模态 Thinker-Talker 流式处理（阶段 12，第 20 课）")
    print("=" * 60)

    configs = [
        StreamConfig(thinker_b=7,  talker_m=200,  include_vision=False),
        StreamConfig(thinker_b=7,  talker_m=300,  include_vision=True),
        StreamConfig(thinker_b=72, talker_m=300,  include_vision=True),
        StreamConfig(thinker_b=70, talker_m=1000, include_vision=True),
    ]
    for c in configs:
        print_ttfab(c)

    demo_vad()
    duplex_modes()

    print("\n开放的流式架构设计")
    print("-" * 60)
    designs = [
        ("Mini-Omni (2024)",  "首个开放流式方案，文本与语音交错生成"),
        ("Moshi (2024)",      "单个 Transformer 的内心独白机制，TTFAB 为 160 ms"),
        ("Qwen2.5-Omni (3/25)", "Thinker-Talker 分离 + TMRoPE，TTFAB 约 350 ms"),
        ("Qwen3-Omni (11/25)", "扩展 Qwen3 基座，延迟接近 GPT-4o"),
    ]
    for name, note in designs:
        print(f"  {name:<22}: {note}")


if __name__ == "__main__":
    main()
