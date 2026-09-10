"""MIO 风格的四模态词表分配与流式解码延迟计算。

仅使用标准库。打印词表布局，以及一个语音对话请求的逐步延迟轨迹：
MIO 接收语音，再生成语音。

译注：路由器中的 kind、payload、path 为程序字段；模态枚举和分词器路径
标识保留原值。示例输入 Hello（你好）、cat.png、user.wav、loop.mp3
分别代表文本、图像、语音和音乐；特殊模态标签不翻译。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class VocabSlot:
    name: str
    start: int
    size: int

    @property
    def end(self) -> int:
        return self.start + self.size


def build_vocab() -> list[VocabSlot]:
    slots = []
    cursor = 0
    plan = [
        ("文本 BPE",      32000),
        ("图像 SEED",     4096),
        ("语音 L0",      4096),
        ("语音 L1..L7", 4096),
        ("音乐",          8192),
        ("<image>",           1),
        ("</image>",          1),
        ("<speech>",          1),
        ("</speech>",         1),
        ("<music>",           1),
        ("</music>",          1),
    ]
    for name, size in plan:
        slots.append(VocabSlot(name=name, start=cursor, size=size))
        cursor += size
    return slots


def print_vocab(slots: list[VocabSlot]) -> None:
    print("\n共享词表布局")
    print("-" * 60)
    print(f"  {'分区':<18}{'起始位置':>8}{'结束位置':>8}{'大小':>8}")
    for s in slots:
        print(f"  {s.name:<18}{s.start:>8}{s.end:>8}{s.size:>8}")
    total = slots[-1].end
    print(f"  {'合计':<18}{total:>8}{'（词表大小）':>16}")


def route_inputs(inputs: list[dict]) -> list[dict]:
    """对每个输入进行分类，并分配相应的分词器处理路径。"""
    routed = []
    for inp in inputs:
        kind = inp["kind"]
        if kind == "text":
            path = "BPE"
        elif kind == "image":
            path = "SEED-Tokenizer"
        elif kind in ("speech", "voice"):
            path = "SpeechTokenizer residual-VQ"
        elif kind == "music":
            path = "Encodec"
        else:
            path = "UNKNOWN"
        routed.append({**inp, "path": path})
    return routed


@dataclass
class LatencyTrace:
    label: str
    ms: float


def streaming_decode_latency(
    prompt_audio_seconds: float = 2.0,
    model_size_b: int = 8,
) -> list[LatencyTrace]:
    trace = []
    trace.append(LatencyTrace("麦克风音频 -> 语音词元",
                              prompt_audio_seconds * 20))
    trace.append(LatencyTrace("提示词元预填充",
                              80 * (model_size_b / 8.0)))
    trace.append(LatencyTrace("首个输出词元",
                              40 * (model_size_b / 8.0)))
    trace.append(LatencyTrace("残差向量量化（VQ）第 1..7 层",
                              30))
    trace.append(LatencyTrace("语音解码器（类似 Encodec）",
                              80))
    return trace


def print_trace(trace: list[LatencyTrace]) -> None:
    print("\n流式解码延迟（首个音频字节延迟）")
    print("-" * 60)
    total = 0.0
    for t in trace:
        total += t.ms
        print(f"  {t.label:<38}  +{t.ms:>5.0f} ms   （累计 {total:>6.0f}）")
    print("-" * 60)
    print(f"  首个音频字节总延迟（TTFAB）：{total:.0f} ms")
    if total < 500:
        print(f"  -> 对话感较自然（GPT-4o 级别）")
    elif total < 800:
        print(f"  -> 可以接受（第一代开源任意模态互转模型）")
    else:
        print(f"  -> 反应较慢，可考虑更小的模型或并行解码")


def demo_chain_of_visual_thought() -> None:
    print("\n视觉思维链（MIO）")
    print("-" * 60)
    prompt = "这张照片中的猫正在爬树吗？"
    steps = [
        "用户文本 -> 视觉词元",
        "模型绘制中间图像 <image> ... </image>",
        "模型输出对草图的文字分析",
        "模型给出是/否结论及理由",
    ]
    print(f"  提示词：{prompt}")
    for i, s in enumerate(steps, 1):
        print(f"    步骤 {i}: {s}")
    print("  在空间推理基准上表现更好，但会增加延迟。")


def main() -> None:
    print("=" * 60)
    print("MIO 任意模态互转与流式输出（阶段 12，第 16 课）")
    print("=" * 60)

    vocab = build_vocab()
    print_vocab(vocab)

    print("\n路由器：四种输入 -> 四种分词器")
    print("-" * 60)
    inputs = [
        {"kind": "text",   "payload": "Hello"},
        {"kind": "image",  "payload": "cat.png"},
        {"kind": "voice",  "payload": "user.wav"},
        {"kind": "music",  "payload": "loop.mp3"},
    ]
    for r in route_inputs(inputs):
        print(f"  {r['kind']:<8}  '{r['payload']}'  -> {r['path']}")

    trace = streaming_decode_latency(prompt_audio_seconds=2.0, model_size_b=8)
    print_trace(trace)

    demo_chain_of_visual_thought()


if __name__ == "__main__":
    main()
