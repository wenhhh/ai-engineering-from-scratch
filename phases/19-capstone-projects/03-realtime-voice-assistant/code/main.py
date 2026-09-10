"""实时语音流水线：语音活动检测（VAD）、轮次结束判断与插话调度。

此示例关注 ASR（语音识别）和 TTS（语音合成）之间的调度：协调 VAD 事件、
ASR 中间结果、轮次完成分数、LLM/TTS 输出与用户插话，并记录各阶段的延迟。
用模拟音频帧演示状态机、插话取消、工具旁路调用、等待填充语与延迟统计。

运行：python main.py

译注：帧是带时间戳的内存记录，不是真实音频；所谓流式调用、取消与填充语
都只是状态与日志变化，没有麦克风、ASR、LLM、TTS 或天气服务调用。
时间数字来自预设时间戳，不是实测延迟。轮次评分依赖空格分词和英文标点，
因此话语夹具保持英文。事件字符串也保留原值，旁注解释含义。
此 Python 版本在 TOOL 状态下不处理插话；跨轮次的首次词元与音频指标未重置，
不能当作完整的多轮实时会话实现。false_cutoffs 字段尚未参与更新。
"""

from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from enum import Enum, auto


# ---------------------------------------------------------------------------
# 帧流：每帧代表 20 毫秒的模拟音频。
# ---------------------------------------------------------------------------

@dataclass
class Frame:
    t_ms: int              # 自会话开始以来的毫秒时间戳。
    is_speech: bool        # 模拟 VAD 判定，代替原文所提的 Silero v5。
    partial: str = ""      # 模拟 ASR 累积中间结果，代替原文所提的 Deepgram Nova-3。


def synth_call(script: str, start_ms: int = 0, noise: float = 0.0) -> list[Frame]:
    """为一段模拟来电话语生成帧序列。"""
    words = script.split()
    frames: list[Frame] = []
    t = start_ms
    # 话语前有 120 毫秒静音。
    for _ in range(6):
        frames.append(Frame(t_ms=t, is_speech=random.random() < noise))
        t += 20
    partial = ""
    for w in words:
        partial = (partial + " " + w).strip()
        # 每个按空格切分的词占约 320 毫秒语音。
        for _ in range(16):
            frames.append(Frame(t_ms=t, is_speech=True, partial=partial))
            t += 20
    # 末尾追加 2200 毫秒静音，供预设工具、LLM 与 TTS 阶段推进。
    for _ in range(110):
        frames.append(Frame(t_ms=t, is_speech=False, partial=partial))
        t += 20
    return frames


# ---------------------------------------------------------------------------
# 轮次结束判断：结合 VAD 静音时长与完成分数。
# ---------------------------------------------------------------------------

def turn_completion_score(partial: str) -> float:
    """用简单规则代替原文所提的 LiveKit 轮次结束检测模型。"""
    if not partial:
        return 0.0
    if partial.rstrip().endswith(("?", ".", "!")):
        return 0.95
    # 启发式规则：词数越多，轮次完成分数越高。
    n = len(partial.split())
    if n < 3:
        return 0.2
    if n < 6:
        return 0.55
    return 0.75


# ---------------------------------------------------------------------------
# 状态机：空闲 → 倾听 → 思考 → 播报；插话后重新倾听。
# ---------------------------------------------------------------------------

class State(Enum):
    IDLE = auto()
    LISTENING = auto()   # 用户话语尚未结束。
    WAITING = auto()     # VAD 判定静音，检查轮次完成分数。
    THINKING = auto()    # 模拟 LLM 输出阶段，尚无 TTS 音频。
    SPEAKING = auto()    # 模拟 TTS 音频输出阶段。
    TOOL = auto()        # 工具旁路调用进行中。


@dataclass
class Metrics:
    events: list[str] = field(default_factory=list)
    turn_complete_ms: int = 0
    first_llm_token_ms: int = 0
    first_audio_out_ms: int = 0
    false_cutoffs: int = 0
    barge_ins: int = 0

    def log(self, msg: str) -> None:
        self.events.append(msg)

    def latency_ms(self) -> int:
        if self.turn_complete_ms and self.first_audio_out_ms:
            return self.first_audio_out_ms - self.turn_complete_ms
        return -1


# ---------------------------------------------------------------------------
# 工具旁路：用时间戳模拟天气调用与等待填充语；未调用真实异步服务。
# ---------------------------------------------------------------------------

@dataclass
class Tool:
    name: str
    latency_ms: int
    result: str


# 固定天气结果：68/52，局部多云；原值未注明温标，不擅自转换单位。
WEATHER = Tool("weather.tokyo_tomorrow", latency_ms=420, result="68/52 partly cloudy")


# ---------------------------------------------------------------------------
# 调度器：逐帧推进示例流水线。
# ---------------------------------------------------------------------------

def run_session(frames: list[Frame], use_tool: bool = True,
                barge_in_at_ms: int | None = None) -> Metrics:
    m = Metrics()
    state = State.IDLE
    silence_run_ms = 0
    final_partial = ""
    llm_stream_started_at = -1
    tts_stream_started_at = -1
    tool_started_at = -1
    tool_done_at = -1
    filler_emitted = False

    for f in frames:
        # 插话：在 SPEAKING 或 THINKING 状态下检测到用户重新说话。
        if (barge_in_at_ms is not None and f.t_ms >= barge_in_at_ms
                and state in (State.SPEAKING, State.THINKING)
                and f.is_speech):
            m.barge_ins += 1
            # 事件：用户插话，取消模拟 TTS 并重新准备 ASR。
            m.log(f"{f.t_ms}ms BARGE-IN: cancel TTS, re-arm ASR")
            state = State.LISTENING
            tts_stream_started_at = -1
            llm_stream_started_at = -1
            continue

        if state == State.IDLE:
            if f.is_speech:
                state = State.LISTENING
                # 事件：开始倾听。
                m.log(f"{f.t_ms}ms LISTENING")

        elif state == State.LISTENING:
            if f.is_speech:
                silence_run_ms = 0
                final_partial = f.partial or final_partial
            else:
                silence_run_ms += 20
                if silence_run_ms >= 500:
                    score = turn_completion_score(final_partial)
                    if score >= 0.6:
                        state = State.WAITING
                        m.turn_complete_ms = f.t_ms
                        # 事件：轮次完成；记录评分与中间识别结果。
                        m.log(f"{f.t_ms}ms TURN COMPLETE (score={score:.2f})"
                              f" partial='{final_partial}'")
                    else:
                        # 事件：已静音，但完成分数不足，继续等待。
                        m.log(f"{f.t_ms}ms SILENCE but score={score:.2f}, waiting")

        if state == State.WAITING:
            # 启动模拟 LLM 阶段。
            llm_stream_started_at = f.t_ms + 140  # 预设首词元延迟。
            state = State.THINKING
            # 事件：触发模拟 LLM 调用。
            m.log(f"{f.t_ms}ms LLM call fired")
            if use_tool:
                tool_started_at = f.t_ms
                state = State.TOOL

        elif state == State.TOOL:
            if tool_started_at >= 0 and not filler_emitted:
                if f.t_ms - tool_started_at >= 300:
                    filler_emitted = True
                    # 事件：插入等待填充语“稍等，我查一下”。
                    m.log(f"{f.t_ms}ms filler 'one second, let me check'")
            if tool_started_at >= 0 and f.t_ms - tool_started_at >= WEATHER.latency_ms:
                tool_done_at = f.t_ms
                # 事件：工具返回结果。
                m.log(f"{f.t_ms}ms tool result: {WEATHER.result}")
                llm_stream_started_at = f.t_ms + 140
                state = State.THINKING

        elif state == State.THINKING:
            if llm_stream_started_at > 0 and f.t_ms >= llm_stream_started_at:
                if m.first_llm_token_ms == 0:
                    m.first_llm_token_ms = f.t_ms
                    # 事件：得到首个 LLM 词元。
                    m.log(f"{f.t_ms}ms LLM first token")
                tts_stream_started_at = f.t_ms + 180
                state = State.SPEAKING

        elif state == State.SPEAKING:
            if tts_stream_started_at > 0 and f.t_ms >= tts_stream_started_at:
                if m.first_audio_out_ms == 0:
                    m.first_audio_out_ms = f.t_ms
                    # 事件：TTS 首次输出音频。
                    m.log(f"{f.t_ms}ms TTS first audio-out")

    return m


# ---------------------------------------------------------------------------
# 演示：先运行无插话会话，再运行插话会话。
# ---------------------------------------------------------------------------

def main() -> None:
    random.seed(0)
    print("=== 会话 1：无插话，使用天气工具 ===")
    # 话语夹具：东京明天天气怎么样？原文词数影响模拟时长，保留英文。
    frames = synth_call("what is the weather in tokyo tomorrow", start_ms=0)
    m = run_session(frames, use_tool=True, barge_in_at_ms=None)
    for line in m.events:
        print(" ", line)
    print(f"  轮次完成时间：{m.turn_complete_ms}ms")
    print(f"  首个 LLM 词元：{m.first_llm_token_ms}ms")
    print(f"  首次音频输出：{m.first_audio_out_ms}ms")
    print(f"  轮次延迟：{m.latency_ms()}ms")

    print()
    print("=== 会话 2：用户在回答过程中插话 ===")
    # 话语夹具：给我讲一个关于……的长故事。保留英文词数与轮次评分。
    frames = synth_call("tell me a long story about", start_ms=0)
    # 在末尾静音的后段插入若干模拟语音帧。
    for i in range(8):
        idx = len(frames) - 20 + i
        if 0 <= idx < len(frames):
            frames[idx] = Frame(t_ms=frames[idx].t_ms, is_speech=True,
                                partial=frames[idx].partial)
    m = run_session(frames, use_tool=False,
                    barge_in_at_ms=frames[-20].t_ms - 60)
    for line in m.events:
        print(" ", line)
    print(f"  插话次数：{m.barge_ins}")


if __name__ == "__main__":
    main()
