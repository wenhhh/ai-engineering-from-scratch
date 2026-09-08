"""使用标准库演示 Whisper 提示词格式（Prompt format）、分块（Chunking）与预算计算。

展示要传入的解码器提示词、长音频片段的分块调度，
以及具有 Large-v3-turbo 结构的模型采用 LoRA 后的参数数量差异。

运行：python3 code/main.py
"""

import math


# Whisper 特殊词元（Special tokens）的子集；实际词表约有 ~50 个特殊词元
SPECIAL = {
    "SOT":            "<|startoftranscript|>",
    "EOT":            "<|endoftext|>",
    "TRANSCRIBE":     "<|transcribe|>",
    "TRANSLATE":      "<|translate|>",
    "NO_TIMESTAMPS":  "<|notimestamps|>",
    "NO_SPEECH":      "<|nospeech|>",
}

# Whisper 支持约 ~99 种语言；此处选三种用于演示
LANG = {"en": "<|en|>", "fr": "<|fr|>", "ja": "<|ja|>"}


def build_prompt(language, task="transcribe", timestamps=False):
    toks = [SPECIAL["SOT"], LANG[language]]
    toks.append(SPECIAL["TRANSCRIBE"] if task == "transcribe" else SPECIAL["TRANSLATE"])
    if not timestamps:
        toks.append(SPECIAL["NO_TIMESTAMPS"])
    return toks


def chunk_schedule(total_seconds, chunk_s=30.0, stride_s=5.0):
    if total_seconds <= chunk_s:
        return [(0.0, total_seconds)]
    out = []
    start = 0.0
    step = chunk_s - stride_s
    while start < total_seconds:
        end = min(total_seconds, start + chunk_s)
        out.append((round(start, 2), round(end, 2)))
        if end == total_seconds:
            break
        start += step
    return out


def encoder_frames(seconds, sr=16000, hop=160):
    samples = int(seconds * sr)
    return 1 + (samples - 400) // hop


def transformer_params(n_layers, d_model, d_ff, n_heads, vocab):
    # 每层：4 * d_model^2 (q,k,v,o) + 2 * d_model * d_ff + 层归一化（Layer norms）
    per_block = 4 * d_model * d_model + 2 * d_model * d_ff + 4 * d_model
    enc = n_layers * per_block
    dec = n_layers * (per_block + 4 * d_model * d_model + 4 * d_model)  # 加上交叉注意力（Cross-attention）
    embed = vocab * d_model + 3000 * d_model  # 词元嵌入（Token embedding）+ 位置嵌入（Positional embedding，音频侧 3000）
    return enc, dec, embed


def lora_params(n_layers, d_model, rank=16, modules=("q_proj", "v_proj")):
    per_module = 2 * d_model * rank
    per_block = len(modules) * per_module
    return n_layers * 2 * per_block  # 编码器（Encoder）+ 解码器（Decoder）


def main():
    print("=== 步骤 1：构建 Whisper 解码器提示词（Decoder prompt） ===")
    p_en = build_prompt("en", task="transcribe", timestamps=False)
    p_fr = build_prompt("fr", task="translate", timestamps=False)
    p_ja = build_prompt("ja", task="transcribe", timestamps=True)
    print(f"  英语转录（Transcribe），无时间戳: {' '.join(p_en)}")
    print(f"  法语->英语翻译:    {' '.join(p_fr)}")
    print(f"  日语，含时间戳（Timestamps）:  {' '.join(p_ja)}")

    print()
    print("=== 步骤 2：编码器帧预算（Encoder frame budget） ===")
    for secs in [1.0, 10.0, 30.0]:
        n = encoder_frames(secs)
        print(f"  {secs:4.1f}s @16 kHz, 10 ms 帧移（Hop）-> {n} 帧")
    print("  Whisper 将所有输入补零（Zero-padding）至 30 s -> 3000 帧，经步幅为 2 的卷积 -> 1500 个编码器词元")

    print()
    print("=== 步骤 3：10 分钟音频片段的分块调度（Chunk schedule） ===")
    schedule = chunk_schedule(600.0, chunk_s=30.0, stride_s=5.0)
    print(f"  分块数（30 s 窗口，5 s 步幅 Stride）: {len(schedule)}")
    for start, end in schedule[:6]:
        print(f"    {start:6.1f} s -> {end:6.1f} s")
    print(f"    ...（其余 {len(schedule) - 6} 个）")

    print()
    print("=== 步骤 4：比较 Large-v3-turbo 与 Large-v3 的参数量（Parameter counts） ===")
    configs = [
        ("Tiny",        4,   384,  1536,  6,  51865),
        ("Base",        6,   512,  2048,  8,  51865),
        ("Small",      12,   768,  3072, 12,  51865),
        ("Medium",     24,  1024,  4096, 16,  51865),
        ("Large-v3",   32,  1280,  5120, 20,  51865),
        ("Turbo",       4,  1280,  5120, 20,  51865),  # 4 层解码器（Decoder）
    ]
    print("  变体（Variant） 编码器  解码器  嵌入  总计（近似值，百万参数 M）")
    for name, layers, d, d_ff, heads, vocab in configs:
        enc, dec, embed = transformer_params(layers, d, d_ff, heads, vocab)
        if name == "Turbo":
            enc_big, _, embed_big = transformer_params(32, d, d_ff, heads, vocab)
            dec = enc  # 4 层解码器对应 4 层小型模型
            enc = enc_big
            embed = embed_big
        total = enc + dec + embed
        print(f"  {name:<10}  {enc/1e6:6.1f}  {dec/1e6:6.1f}  {embed/1e6:6.1f}  {total/1e6:7.1f}")

    print()
    print("=== 步骤 5：在 q_proj,v_proj 上使用 LoRA-r=16，将可训练参数量减少 100x+ ===")
    for name, layers, d, *_ in configs[3:6]:
        lp = lora_params(layers, d, rank=16)
        print(f"  {name:<10}  LoRA 可训练参数: {lp/1e6:.3f} M")

    print()
    print("=== 步骤 6：2026 推理方案（Inference recipes） ===")
    recipes = [
        ("离线英语，最佳词错误率（WER）",    "通过 whisperx + Silero VAD 使用 large-v3-turbo"),
        ("长音频 + 词级时间戳（Word timestamps）",  "whisperx（通过 wav2vec 2.0 强制对齐 Forced alignment）"),
        ("流式（Streaming，2 s 延迟）",      "whisper-streaming 或 Parakeet-TDT"),
        ("移动端 / 边缘端（Edge）",                "whisper-tiny int8 或 moonshine"),
        ("低资源语言（Low-resource language）",        "在 2-20 h 领域音频上进行 LoRA 微调（Fine-tuning）"),
    ]
    for s, r in recipes:
        print(f"  {s:<30} -> {r}")


if __name__ == "__main__":
    main()
