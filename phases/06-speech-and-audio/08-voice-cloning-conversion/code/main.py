"""声音克隆（Voice cloning）演示：模拟（内容，说话人）的分解与交换。

从确定性音素哈希（Phoneme hash）构建小型“内容”向量，
并根据每个说话人的音调特征构建“说话人”向量。演示在替换说话人嵌入后，
重建音频保留内容，同时说话人嵌入（Speaker embedding）的
余弦相似度（Cosine similarity）反映其与目标的接近程度。

仅用标准库，没有实际神经网络；这是声音克隆流水线（Cloning pipeline）的积木式模型。
运行：python3 code/main.py
"""

import hashlib
import math
import random


def content_vector(text, dim=64):
    """文本的确定性“内容”表示，是音素后验图（PPG）的小型替身。"""
    h = hashlib.sha256(text.encode()).digest()
    expanded = (h * ((dim + len(h) - 1) // len(h)))[:dim]
    return [b / 255.0 - 0.5 for b in expanded]


def speaker_vector(seed, dim=64):
    """确定性“说话人嵌入（Speaker embedding）”，是 ECAPA-TDNN 的小型替身。"""
    rng = random.Random(seed)
    v = [rng.gauss(0, 1) for _ in range(dim)]
    norm = math.sqrt(sum(x * x for x in v)) or 1e-12
    return [x / norm for x in v]


def fake_tts(content, speaker, mix=0.5):
    """模拟文本转语音（TTS）：逐元素混合内容与说话人。"""
    return [(1 - mix) * c + mix * s for c, s in zip(content, speaker)]


def extract_speaker(wave, reference_speakers):
    """模拟说话人编码器（Speaker encoder）：返回余弦相似度最高的说话人。"""
    sims = [(name, cosine(wave, vec)) for name, vec in reference_speakers.items()]
    sims.sort(key=lambda x: -x[1])
    return sims[0]


def extract_content(wave, reference_contents):
    sims = [(text, cosine(wave, vec)) for text, vec in reference_contents.items()]
    sims.sort(key=lambda x: -x[1])
    return sims[0]


def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-12
    nb = math.sqrt(sum(x * x for x in b)) or 1e-12
    return dot / (na * nb)


def watermark(wave, payload_bits, strength=0.003):
    """小型不可听水印（Inaudible watermark）：按步幅分组，对每个比特施加直流偏移（DC shift）。

    实际系统（SilentCipher、PerTh）在感知域（Perceptual domain）嵌入水印，可耐受
    重新编码。本演示只证明编码/解码契约（Contract）成立。
    """
    n_bits = len(payload_bits)
    out = list(wave)
    for i in range(len(out)):
        bit_idx = i % n_bits
        sign = 1 if payload_bits[bit_idx] else -1
        out[i] += sign * strength
    return out


def detect_watermark(wave_original, wave_wm, n_bits=32):
    diff = [a - b for a, b in zip(wave_wm, wave_original)]
    bits = []
    for b in range(n_bits):
        chunk = diff[b::n_bits]
        avg = sum(chunk) / max(1, len(chunk))
        bits.append(1 if avg > 0 else 0)
    return bits


def bit_accuracy(a, b):
    return sum(1 for x, y in zip(a, b) if x == y) / len(a)


def main():
    DIM = 64

    alice = speaker_vector("alice_00001", DIM)
    bob = speaker_vector("bob_00002", DIM)
    carol = speaker_vector("carol_00003", DIM)
    speakers = {"alice": alice, "bob": bob, "carol": carol}

    text_greet = "hello this is a test"
    text_remind = "please remember to water plants"
    content_greet = content_vector(text_greet, DIM)
    content_remind = content_vector(text_remind, DIM)
    contents = {text_greet: content_greet, text_remind: content_remind}

    print("=== 步骤 1：合成 alice 说 'hello'（英文内容与说话人标识保留） ===")
    wav_alice_greet = fake_tts(content_greet, alice, mix=0.5)
    name, score = extract_speaker(wav_alice_greet, speakers)
    txt, tscore = extract_content(wav_alice_greet, contents)
    print(f"  说话人探测（Speaker probe）: {name} (cos={score:.3f})")
    print(f"  内容探测（Content probe）: {txt!r} (cos={tscore:.3f})")

    print()
    print("=== 步骤 2：零样本克隆（Zero-shot clone），用 alice 的声音说 bob 的目标文本 ===")
    # bob 的文本 + alice 的说话人嵌入（Speaker embedding）
    wav_cloned = fake_tts(content_remind, alice, mix=0.5)
    name, score = extract_speaker(wav_cloned, speakers)
    txt, tscore = extract_content(wav_cloned, contents)
    print(f"  说话人探测（Speaker probe）: {name} (cos={score:.3f})  -- 应保持为 alice")
    print(f"  内容探测（Content probe）: {txt!r} (cos={tscore:.3f})  -- 应为提醒文本")

    print()
    print("=== 步骤 3：声音转换（Voice conversion），将 bob 的语音转换为 alice 的声音 ===")
    wav_bob_orig = fake_tts(content_remind, bob, mix=0.5)
    # 提取内容，使用 alice 的嵌入重新合成
    matched_text, _ = extract_content(wav_bob_orig, contents)
    content_est = contents[matched_text]
    wav_converted = fake_tts(content_est, alice, mix=0.5)
    name, score = extract_speaker(wav_converted, speakers)
    print(f"  转换后的说话人: {name} (cos={score:.3f})  -- 应为 alice")
    print(f"  保留的内容:  {matched_text!r}")

    print()
    print("=== 步骤 4：克隆声音的说话人嵌入余弦相似度（SECS） ===")
    secs_same = cosine(alice, wav_cloned)
    secs_diff = cosine(bob, wav_cloned)
    print(f"  alice（目标）与克隆声音  SECS = {secs_same:.3f}  （应较高）")
    print(f"  bob（非目标）与克隆声音 SECS = {secs_diff:.3f}  （应较低）")
    print(f"  生产级 ECAPA-TDNN 在实际克隆声音上的 SECS 落在 0.65 - 0.78 范围内。")

    print()
    print("=== 步骤 5：水印（Watermark）嵌入与检测 ===")
    payload = [int(b) for b in bin(0xDEADBEEF)[2:].zfill(32)]
    wm = watermark(wav_cloned, payload)
    detected = detect_watermark(wav_cloned, wm, n_bits=32)
    acc = bit_accuracy(payload, detected)
    print(f"  载荷（Payload）:   {''.join(str(b) for b in payload)}")
    print(f"  检测结果（Detected）:  {''.join(str(b) for b in detected)}")
    print(f"  比特准确率（Bit accuracy）: {acc * 100:.1f}%   （实际 SilentCipher：经 MP3 重新编码后约 ~99%）")

    print()
    print("=== 步骤 6：2026 声音克隆排行榜（Cloning leaderboard） ===")
    table = [
        ("VoiceBox",       0.78, 2.1, "330M"),
        ("VALL-E 2",       0.77, 2.4, "370M"),
        ("F5-TTS",         0.72, 2.1, "335M"),
        ("OpenVoice v2",   0.70, 2.8, "220M"),
        ("XTTS v2",        0.65, 3.5, "470M"),
    ]
    print("  | 模型（Model）    | SECS  | CER%  | 规模（Size） |")
    for name, s, c, p in table:
        print(f"  | {name:<14} | {s:.2f}  | {c:.1f}   | {p:<4} |")


if __name__ == "__main__":
    main()
