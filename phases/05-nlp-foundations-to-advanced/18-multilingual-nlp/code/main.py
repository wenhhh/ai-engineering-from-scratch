LANGUAGE_FEATURES = {
    "english":  {"word_order": "SVO", "script": "Latin",   "family": "Germanic"},
    "german":   {"word_order": "SVO", "script": "Latin",   "family": "Germanic"},
    "french":   {"word_order": "SVO", "script": "Latin",   "family": "Romance"},
    "spanish":  {"word_order": "SVO", "script": "Latin",   "family": "Romance"},
    "italian":  {"word_order": "SVO", "script": "Latin",   "family": "Romance"},
    "hindi":    {"word_order": "SOV", "script": "Devanagari", "family": "Indic"},
    "marathi":  {"word_order": "SOV", "script": "Devanagari", "family": "Indic"},
    "bengali":  {"word_order": "SOV", "script": "Bengali",    "family": "Indic"},
    "urdu":     {"word_order": "SOV", "script": "Arabic",     "family": "Indic"},
    "arabic":   {"word_order": "VSO", "script": "Arabic",     "family": "Semitic"},
    "japanese": {"word_order": "SOV", "script": "Kanji",      "family": "Japonic"},
}


def similarity(a, b):
    fa = LANGUAGE_FEATURES[a]
    fb = LANGUAGE_FEATURES[b]
    matches = sum(1 for k in fa if fa[k] == fb[k])
    return matches / len(fa)


def rank_source_languages(target, candidates):
    scored = [(cand, similarity(target, cand)) for cand in candidates if cand != target]
    scored.sort(key=lambda x: -x[1])
    return scored


def simulate_transfer_accuracy(target, source):
    sim = similarity(target, source)
    base_accuracy = 0.45
    max_boost = 0.45
    return min(0.95, base_accuracy + sim * max_boost)


def main():
    candidates = list(LANGUAGE_FEATURES)
    targets = ["marathi", "urdu", "arabic", "japanese"]

    print("=== 源语言选择（Source language selection，qWALS 风格相似度，语言枚举保留） ===")
    for target in targets:
        ranking = rank_source_languages(target, candidates)[:4]
        print(f"\n  目标语言（Target）: {target}")
        for source, sim in ranking:
            expected = simulate_transfer_accuracy(target, source)
            print(f"    源语言（Source）={source:10s}  相似度={sim:.2f}  模拟准确率={expected:.0%}")

    print()
    print("注意：实际相似度来自 qWALS / lang2vec，而非这个只含 3 个特征的小型示例。")
    print("关键结论：对马拉地语（Marathi），印地语（Hindi）比英语（English）更适合作为源语言。")


if __name__ == "__main__":
    main()
