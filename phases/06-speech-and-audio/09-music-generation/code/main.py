"""音乐生成（Music generation）的简化示意：根据提示词生成符号化和弦与鼓点。

这是教学替身（Stand-in）。实际音乐生成使用神经编解码器语言模型（Neural codec LM）
（MusicGen / ACE-Step）或潜空间扩散（Latent diffusion，Stable Audio）。这里在符号层面
逐步演示“随时间排列词元（Tokens over time）”的想法，
以呈现其结构。

仅用标准库。运行：python3 code/main.py
"""

import random


MAJOR_KEYS = {
    "C": ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
    "G": ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
    "D": ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
    "A": ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
}

COMMON_PROGRESSIONS = {
    "pop":     [1, 5, 6, 4],
    "ballad":  [1, 6, 4, 5],
    "jazz":    [2, 5, 1, 6],
    "rock":    [1, 4, 5, 1],
    "lofi":    [6, 4, 1, 5],
}

DRUM_PATTERNS = {
    "pop":    "X.o.X.o.X.o.X.o.",
    "rock":   "X..oX..oX..oX..o",
    "lofi":   "X...o...X...o.o.",
    "jazz":   "X.oox.oxX.oox.ox",
    "trap":   "Xooox.oxXooox.ox",
}


def chord_progression(key, genre, bars=8):
    scale = MAJOR_KEYS[key]
    pat = COMMON_PROGRESSIONS.get(genre, COMMON_PROGRESSIONS["pop"])
    repeats = bars // len(pat) + 1
    seq = (pat * repeats)[:bars]
    return [scale[i - 1] for i in seq]


def drum_pattern(genre, bars=8):
    base = DRUM_PATTERNS.get(genre, DRUM_PATTERNS["pop"])
    return (base * bars)[: bars * 16]


def fake_generate(prompt, rng=None):
    rng = rng or random.Random(0)
    prompt_lower = prompt.lower()
    key = "C"
    for k in MAJOR_KEYS:
        if f" {k.lower()}" in " " + prompt_lower:
            key = k
            break
    genre = "pop"
    for g in COMMON_PROGRESSIONS:
        if g in prompt_lower:
            genre = g
            break
    bars = 8
    bpm = 120
    for token in prompt_lower.split():
        if token.endswith("bpm"):
            try:
                bpm = int(token[:-3])
            except ValueError:
                pass
    return {
        "key": key,
        "genre": genre,
        "bpm": bpm,
        "bars": bars,
        "chords": chord_progression(key, genre, bars),
        "drums": drum_pattern(genre, bars),
    }


def visualize(piece):
    print(f"  调性（Key）: {piece['key']}  流派（Genre）: {piece['genre']}  速度（Tempo）: {piece['bpm']} bpm  小节（Bars）: {piece['bars']}")
    print(f"  和弦（Chords）: {' | '.join(piece['chords'])}")
    drum = piece["drums"]
    print(f"  鼓点（Drums，底鼓 Kick=X，军鼓 Snare=o）: {drum}")


def main():
    prompts = [
        "upbeat pop in G major at 128 bpm",
        "slow lofi groove in C",
        "rock anthem in D at 140 bpm",
        "jazz swing in A",
    ]

    print("=== 步骤 1：提示词（Prompt）→ 符号化乐曲（Symbolic music，小型示例；英文输入及调性、流派枚举保留） ===")
    for p in prompts:
        print(f"提示词（Prompt）: {p!r}")
        piece = fake_generate(p)
        visualize(piece)
        print()

    print("=== 步骤 2：2026 音乐生成模型速查表 ===")
    models = [
        ("MusicGen-large",     3300, "30 s",  "无（No）",  "MIT"),
        ("Stable Audio Open",  1200, "47 s",  "无（No）",  "非商业（Non-commercial）"),
        ("ACE-Step XL （26 年 4 月）", 4000, "2 min+", "有（Yes）", "Apache-2.0"),
        ("YuE",                7000, "2 min+", "有（Yes）", "Apache-2.0"),
        ("Suno v5 （闭源）",      0, "4 min",  "有（Yes）", "商业（Commercial）"),
        ("Udio v4 （闭源）",      0, "4 min",  "有 + 分轨（Stems）", "商业（Commercial）"),
    ]
    print("  | 模型（Model）         | 参数（M） | 时长 | 人声（Vocals） | 许可证（License） |")
    for name, p, length, v, lic in models:
        print(f"  | {name:<20} | {p:>10} | {length:>6} | {v:<12} | {lic:<14} |")

    print()
    print("要点:")
    print("  - 开放模型：MusicGen（器乐 Instrumental）、ACE-Step / YuE（完整歌曲）")
    print("  - 商业产品：Suno v5 = 质量领先；Udio v4 = 制作人工具（分轨 Stems + 局部重绘 Inpaint）")
    print("  - 法律方面：Warner + UMG 的和解协议（2025-2026）划定安全范围")
    print("  - 始终用水印（Watermark）+ 元数据声明（Metadata disclosure）标注 AI 生成音乐")


if __name__ == "__main__":
    main()
