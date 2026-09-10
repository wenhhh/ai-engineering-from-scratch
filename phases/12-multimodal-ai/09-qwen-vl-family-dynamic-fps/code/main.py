"""Qwen-VL 系列：M-RoPE 位置编码、动态帧率采样器与 JSON 工具调用解析器。

三个简化实现：
  1. 跨文本、图像和视频词元的 M-RoPE 旋转表。
  2. 根据目标词元预算选择每秒采样帧数的动态帧率（dynamic FPS）采样器。
  3. 解析 Qwen2.5-VL 风格智能体工具调用的 JSON 输出。

仅使用标准库。目的是建立可实际操作的认知模型，而不是提供生产代码。

译注：运动等级 high、medium、low 分别表示高、中、低，参与采样分支判断。
解析器的四个英文夹具保留原值，依次演示鼠标左键点击、带“正在点击”说明
的 JSON、缺少右花括号的输入文本调用，以及向下滚动。第三个夹具中的
 hello 表示“你好”；缺失花括号是故意构造的错误，不能在翻译时修复。
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass


@dataclass
class MRoPEConfig:
    hidden: int
    temporal_dim: int
    height_dim: int
    width_dim: int
    base: float = 10000.0


def mrope_angles(cfg: MRoPEConfig, t: int, h: int, w: int) -> list[float]:
    """给定 (t, h, w) 位置，返回各维度分段中每一对分量的旋转角度。"""
    angles = []
    for dim, pos in [(cfg.temporal_dim, t), (cfg.height_dim, h), (cfg.width_dim, w)]:
        band = []
        pairs = dim // 2
        for i in range(pairs):
            theta = cfg.base ** (-2 * i / dim)
            band.append(pos * theta)
        angles.append(band)
    return angles


def mrope_rotate(cfg: MRoPEConfig, vec: list[float], t: int, h: int, w: int) -> list[float]:
    """对长度为 cfg.hidden 的向量应用 M-RoPE。"""
    out = list(vec)
    axes = [
        (cfg.temporal_dim, t, 0),
        (cfg.height_dim, h, cfg.temporal_dim),
        (cfg.width_dim, w, cfg.temporal_dim + cfg.height_dim),
    ]
    for dim, pos, start in axes:
        pairs = dim // 2
        for i in range(pairs):
            theta = cfg.base ** (-2 * i / dim)
            angle = pos * theta
            idx0 = start + 2 * i
            idx1 = start + 2 * i + 1
            c, s = math.cos(angle), math.sin(angle)
            v0, v1 = out[idx0], out[idx1]
            out[idx0] = v0 * c - v1 * s
            out[idx1] = v0 * s + v1 * c
    return out


@dataclass
class VideoPlan:
    duration_s: float
    tokens_per_frame: int
    budget: int
    motion: str

    def fps(self) -> float:
        fps_max = self.budget / (self.duration_s * self.tokens_per_frame)
        if self.motion == "high":
            candidates = [8, 4, 2, 1, 0.5, 0.25]
        elif self.motion == "medium":
            candidates = [4, 2, 1, 0.5, 0.25]
        else:
            candidates = [1, 0.5, 0.25, 0.1]
        for f in candidates:
            if f <= fps_max:
                return f
        return candidates[-1]

    def frame_times(self) -> list[float]:
        f = self.fps()
        n_frames = max(1, int(self.duration_s * f))
        step = 1.0 / f
        return [round(i * step, 3) for i in range(n_frames)]

    def total_tokens(self) -> int:
        return len(self.frame_times()) * self.tokens_per_frame


def parse_tool_call(raw: str) -> dict:
    """解析 Qwen2.5-VL 输出的 JSON 工具调用，并提供兜底解析。"""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                pass
        return {"tool": "PARSE_ERROR", "raw": raw}


def demo_mrope() -> None:
    print("\nM-RoPE 位置旋转，hidden=48（每个维度分段占 16 维）")
    print("-" * 60)
    cfg = MRoPEConfig(hidden=48, temporal_dim=16, height_dim=16, width_dim=16)
    positions = [
        ("文本词元 i=0",      0, 0, 0),
        ("文本词元 i=12",     12, 0, 0),
        ("图像图块（h=5, w=7）", 0, 5, 7),
        ("视频帧 t=3（h=5, w=7）", 3, 5, 7),
    ]
    for name, t, h, w in positions:
        angles = mrope_angles(cfg, t, h, w)
        first_pair = [round(a[0], 4) for a in angles]
        print(f"  {name:<30} 首对分量的角度 (t, h, w) = {first_pair}")


def demo_sampler() -> None:
    print("\n动态帧率采样器（3 倍池化后 tokens_per_frame=81）")
    print("-" * 60)
    videos = [
        ("30 秒网球多拍回合（高运动量）",   30.0, "high"),
        ("30 秒烹饪演示（中等运动量）",  30.0, "medium"),
        ("10 分钟循环安防视频（低运动量）", 600.0, "low"),
        ("1 分钟 UI 智能体回放（中等运动量）",    60.0, "medium"),
    ]
    budget = 32768
    print(f"每段视频的预算为 {budget} 个词元：")
    for name, dur, motion in videos:
        plan = VideoPlan(duration_s=dur, tokens_per_frame=81, budget=budget, motion=motion)
        n_frames = len(plan.frame_times())
        print(f"  {name:<38}  fps={plan.fps()}  帧数={n_frames:>4}  词元数={plan.total_tokens():>6}")


def demo_tool_parser() -> None:
    print("\nQwen2.5-VL 工具调用解析器")
    print("-" * 60)
    examples = [
        '{"tool": "mouse_click", "coords": [1024, 512], "button": "left"}',
        'Sure, clicking at {"tool": "mouse_click", "coords": [800, 400]} now.',
        '{"tool": "type_text", "text": "hello"',
        '{"tool": "scroll", "direction": "down", "amount": 300}',
    ]
    for raw in examples:
        parsed = parse_tool_call(raw)
        print(f"  原始输入：{raw}")
        print(f"  解析结果：{parsed}")
        print()


def main() -> None:
    print("=" * 60)
    print("Qwen-VL 系列（阶段 12，第 09 课）")
    print("=" * 60)

    demo_mrope()
    demo_sampler()
    demo_tool_parser()

    print("=" * 60)
    print("演进脉络")
    print("-" * 60)
    print("  Qwen-VL   (2023)：448 分辨率、视觉定位（grounding）、Q-Former")
    print("  Qwen2-VL  (2024)：M-RoPE、原生分辨率、MLP 投影器")
    print("  Qwen2.5-VL(2025)：动态帧率、绝对时间词元、JSON 智能体模式")
    print("  Qwen3-VL  (2025)：基于 Qwen3、思考模式、扩大 OCR 规模")


if __name__ == "__main__":
    main()
