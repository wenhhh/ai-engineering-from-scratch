"""通过有界重试调用注入的转录器。

课程： projects/voice-note-transcriber-pipeline/stages/03-transcribe/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import hashlib
from pcm import encode_wav


def transcribe(samples, rate, spans, provider, retries=1):
    if type(retries) is not int or retries < 0 or retries > 5:
        raise ValueError("nonnegative retries required")
    if type(rate) is not int or rate <= 0:
        raise ValueError("positive integer sample rate required")
    rows = []
    previous = 0
    for start, end in spans:
        if (
            type(start) is not int
            or type(end) is not int
            or not previous <= start < end <= len(samples)
        ):
            raise ValueError("invalid sample span")
        previous = end
        audio = encode_wav(samples[start:end], rate)
        for attempt in range(retries + 1):
            try:
                text = provider(audio)
                if not isinstance(text, str) or not text.strip():
                    raise ValueError("transcriber returned empty text")
                break
            except TimeoutError:
                if attempt == retries:
                    raise
        rows.append(
            {
                "start": start / rate,
                "end": end / rate,
                "text": text.strip(),
                "audio_sha256": hashlib.sha256(audio).hexdigest(),
                "attempts": attempt + 1,
            }
        )
    return rows
