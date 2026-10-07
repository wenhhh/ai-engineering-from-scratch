"""解码并校验 PCM WAV 采样。

课程： projects/voice-note-transcriber-pipeline/stages/01-pcm/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import io
import struct
import wave


def decode_wav(data):
    with wave.open(io.BytesIO(data), "rb") as audio:
        if (
            audio.getnchannels() != 1
            or audio.getsampwidth() != 2
            or audio.getcomptype() != "NONE"
        ):
            raise ValueError("16-bit mono PCM required")
        rate = audio.getframerate()
        frames = audio.getnframes()
        raw = audio.readframes(frames)
        if len(raw) != frames * 2:
            raise ValueError("truncated audio")
        return {
            "rate": rate,
            "samples": [x[0] / 32768 for x in struct.iter_unpack("<h", raw)],
        }


def encode_wav(samples, rate=16000):
    if rate <= 0:
        raise ValueError("positive sample rate required")
    out = io.BytesIO()
    with wave.open(out, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(
            b"".join(
                struct.pack("<h", max(-32768, min(32767, round(s * 32768))))
                for s in samples
            )
        )
    return out.getvalue()
