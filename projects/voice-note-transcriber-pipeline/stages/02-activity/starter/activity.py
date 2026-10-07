"""使用均方根能量划分候选活动片段。

课程： projects/voice-note-transcriber-pipeline/stages/02-activity/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import math


def activity(samples, rate, frame_ms=20, threshold=0.02, min_ms=40, gap_ms=40):
    raise NotImplementedError("Stage 2: implement activity")
