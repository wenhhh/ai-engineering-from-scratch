"""通过有界重试调用注入的转录器。

课程： projects/voice-note-transcriber-pipeline/stages/03-transcribe/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import hashlib

from pcm import encode_wav


def transcribe(samples, rate, spans, provider, retries=1):
    raise NotImplementedError("Stage 3: implement transcribe")
