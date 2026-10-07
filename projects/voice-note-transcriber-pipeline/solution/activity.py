"""使用均方根能量划分候选活动片段。

课程： projects/voice-note-transcriber-pipeline/stages/02-activity/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import math


def activity(samples, rate, frame_ms=20, threshold=0.02, min_ms=40, gap_ms=40):
    if any(
        not isinstance(value, (int, float)) or not math.isfinite(value)
        for value in (rate, frame_ms, threshold, min_ms, gap_ms)
    ) or any(
        not isinstance(value, (int, float)) or not math.isfinite(value)
        for value in samples
    ):
        raise ValueError("finite audio and parameters required")
    if rate <= 0 or frame_ms <= 0 or threshold < 0 or min_ms < 0 or gap_ms < 0:
        raise ValueError("invalid activity parameters")
    width = max(1, round(rate * frame_ms / 1000))
    active = []
    for start in range(0, len(samples), width):
        frame = samples[start : start + width]
        if math.sqrt(sum(x * x for x in frame) / len(frame)) >= threshold:
            active.append((start, start + len(frame)))
    spans = []
    for start, end in active:
        if spans and start - spans[-1][1] <= rate * gap_ms / 1000:
            spans[-1] = (spans[-1][0], end)
        else:
            spans.append((start, end))
    return [(a, b) for a, b in spans if (b - a) * 1000 / rate >= min_ms]
