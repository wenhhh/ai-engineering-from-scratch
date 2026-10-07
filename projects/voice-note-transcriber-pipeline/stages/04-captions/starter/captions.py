"""导出经过校验的 WebVTT 字幕。

课程： projects/voice-note-transcriber-pipeline/stages/04-captions/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import html


def stamp(seconds):
    raise NotImplementedError("Stage 4: implement stamp")


def captions(rows):
    raise NotImplementedError("Stage 4: implement captions")
