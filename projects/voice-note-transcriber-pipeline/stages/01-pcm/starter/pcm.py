"""解码并校验 PCM WAV 采样。

课程： projects/voice-note-transcriber-pipeline/stages/01-pcm/docs/en.md
实现为原创，使用明确的本地数据契约。
通过 scripts/project_test.py 运行测试。
"""

import io

import struct

import wave


def decode_wav(data):
    raise NotImplementedError("Stage 1: implement decode_wav")


def encode_wav(samples, rate=16000):
    raise NotImplementedError("Stage 1: implement encode_wav")
