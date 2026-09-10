"""Pipecat 风格的简化语音流水线：VAD 语音活动检测 -> STT 语音转文字
-> LLM 语言模型 -> TTS 文字转语音 -> 传输层。

数据帧沿下游方向（downstream，从输入端到输出端）传递；取消和控制帧向上游
（upstream）传播。预设输入展示正常流程，以及向 TTS 和 LLM 传播取消信号。

译注：这是同步、纯文本模拟，不连接 Pipecat、LiveKit 或真实语音模型。
第二个场景在整段模拟语音已经交付后才发送取消帧，因此并未实际演示“说到一半被打断”。
英文对话按空白拆词，必须保留才能维持交付词数和轨迹。hello 表示问候，
refund please 表示请求退款；预设回复分别询问需要什么帮助，以及退款订单号。
cancelled 表示已取消，emitted 表示已输出，sent ... words 表示已发送相应数量的词。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Frame:
    kind: str
    payload: Any
    direction: str = "downstream"


class Processor:
    def __init__(self, name: str) -> None:
        self.name = name
        self.next: Processor | None = None
        self.prev: Processor | None = None
        self.trace: list[str] = []

    def process(self, frame: Frame) -> None:
        self.trace.append(f"{self.name} saw {frame.kind}")
        if self.next is not None and frame.direction == "downstream":
            self.next.process(frame)
        elif self.prev is not None and frame.direction == "upstream":
            self.prev.process(frame)


class VAD(Processor):
    def process(self, frame: Frame) -> None:
        if frame.kind == "audio_chunk":
            is_speech = bool(frame.payload)
            self.trace.append(f"VAD: speech={is_speech}")
            if is_speech:
                super().process(Frame("vad_speech", frame.payload))
        else:
            super().process(frame)


class STT(Processor):
    def process(self, frame: Frame) -> None:
        if frame.kind == "vad_speech":
            transcript = str(frame.payload)
            self.trace.append(f"STT: -> {transcript!r}")
            super().process(Frame("transcript", transcript))
        else:
            super().process(frame)


class LLM(Processor):
    def __init__(self, name: str, replies: dict[str, str]) -> None:
        super().__init__(name)
        self.replies = replies

    def process(self, frame: Frame) -> None:
        if frame.kind == "cancel":
            self.trace.append("LLM: cancelled")
            super().process(frame)
            return
        if frame.kind == "transcript":
            text = str(frame.payload)
            reply = self.replies.get(text, "[no canned reply]")
            self.trace.append(f"LLM: {text!r}  -> {reply!r}")
            super().process(Frame("text", reply))
        else:
            super().process(frame)


class TTS(Processor):
    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.cancelled = False

    def process(self, frame: Frame) -> None:
        if frame.kind == "cancel":
            self.cancelled = True
            self.trace.append("TTS: cancel received; drop pending audio")
            super().process(frame)
            return
        if frame.kind == "text":
            self.cancelled = False
            words = str(frame.payload).split()
            emitted: list[str] = []
            for w in words:
                if self.cancelled:
                    self.trace.append(f"TTS: cut mid-word after {emitted}")
                    break
                emitted.append(w)
            self.trace.append(f"TTS: emitted {emitted}")
            super().process(Frame("tts_audio", emitted))
        else:
            super().process(frame)


class Transport(Processor):
    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.delivered: list[list[str]] = []

    def process(self, frame: Frame) -> None:
        if frame.kind == "tts_audio":
            self.delivered.append(list(frame.payload))
            self.trace.append(f"transport: sent {len(frame.payload)} words")
        else:
            super().process(frame)


def link(*processors: Processor) -> None:
    for a, b in zip(processors, processors[1:]):
        a.next = b
        b.prev = a


def main() -> None:
    print("=" * 70)
    print("语音流水线（PIPECAT 风格）——阶段 14，第 22 课")
    print("=" * 70)

    vad = VAD("vad")
    stt = STT("stt")
    llm = LLM("llm", replies={
        "hello": "hi there, how can I help today?",
        "refund please": (
            "sure, I can help with a refund; what order number should I look up?"
        ),
    })
    tts = TTS("tts")
    transport = Transport("transport")
    link(vad, stt, llm, tts, transport)

    print("\n场景 1：正常流转")
    vad.process(Frame("audio_chunk", "hello"))
    print(f"  传输层已交付：{transport.delivered[-1]}")

    print("\n场景 2：插话取消信号（本同步模拟在交付完成后发送）")
    tts.cancelled = False
    vad.process(Frame("audio_chunk", "refund please"))
    transport.process(Frame("cancel", None, direction="upstream"))

    print("  流水线各阶段的轨迹")
    for proc in (vad, stt, llm, tts, transport):
        for line in proc.trace:
            print(f"    {proc.name}: {line}")

    print()
    print("插话打断需要向上游传播取消帧，让 TTS 与 LLM 都收到信号。")
    print("端到端延迟需累加各阶段耗时；原文给出的优选技术栈参考值为 450—600 ms，本例未测量。")


if __name__ == "__main__":
    main()
