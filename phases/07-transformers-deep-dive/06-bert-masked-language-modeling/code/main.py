"""BERT 风格的掩码语言建模（Masked language modeling）：解析掩码规则。

仅用标准库。展示 80/10/10 规则、全词掩码（Whole-word masking），以及
大批量词元（Tokens）的分布合理性检查。
"""

import random
from collections import Counter


MASK_ID = 0  # 在此玩具词表中为 [MASK] 保留 ID 0
CLS_ID = 1
SEP_ID = 2
SPECIAL_IDS = {MASK_ID, CLS_ID, SEP_ID}
IGNORE_INDEX = -100


def create_mlm_batch(tokens, vocab_size, mask_prob=0.15, rng=None):
    """应用 BERT 掩码（Masking）。

    返回 (input_ids, labels)。若某位置被选中用于预测，labels[i] = 原始词元，
    否则为 IGNORE_INDEX。
    """
    if rng is None:
        rng = random.Random()
    input_ids = list(tokens)
    labels = [IGNORE_INDEX] * len(tokens)
    for i, t in enumerate(tokens):
        if t in SPECIAL_IDS:
            continue
        if rng.random() >= mask_prob:
            continue
        labels[i] = t
        r = rng.random()
        if r < 0.8:
            input_ids[i] = MASK_ID
        elif r < 0.9:
            rand_id = t
            while rand_id in SPECIAL_IDS or rand_id == t:
                rand_id = rng.randrange(vocab_size)
            input_ids[i] = rand_id
    return input_ids, labels


def whole_word_mlm(tokens, word_spans, vocab_size, mask_prob=0.15, rng=None):
    """全词掩码：若片段（Span）中任一子词（Subword）被选中，则掩盖全部子词。

    word_spans：tokens 中 (start, end) 左闭右开区间的列表。
    """
    if rng is None:
        rng = random.Random()
    input_ids = list(tokens)
    labels = [IGNORE_INDEX] * len(tokens)
    for start, end in word_spans:
        if any(tokens[i] in SPECIAL_IDS for i in range(start, end)):
            continue
        if rng.random() >= mask_prob:
            continue
        r = rng.random()
        if r < 0.8:
            for i in range(start, end):
                labels[i] = tokens[i]
                input_ids[i] = MASK_ID
        elif r < 0.9:
            for i in range(start, end):
                labels[i] = tokens[i]
                rand_id = tokens[i]
                while rand_id in SPECIAL_IDS or rand_id == tokens[i]:
                    rand_id = rng.randrange(vocab_size)
                input_ids[i] = rand_id
        else:
            for i in range(start, end):
                labels[i] = tokens[i]
    return input_ids, labels


def distribution_check(n_tokens, vocab_size, mask_prob=0.15, seed=42):
    rng = random.Random(seed)
    tokens = [rng.randrange(3, vocab_size) for _ in range(n_tokens)]
    input_ids, labels = create_mlm_batch(tokens, vocab_size, mask_prob, rng)

    selected = sum(1 for l in labels if l != IGNORE_INDEX)
    masked = sum(1 for t, l in zip(input_ids, labels) if l != IGNORE_INDEX and t == MASK_ID)
    randomized = sum(1 for t, l in zip(input_ids, labels) if l != IGNORE_INDEX and t != MASK_ID and t != l)
    unchanged = sum(1 for t, l in zip(input_ids, labels) if l != IGNORE_INDEX and t == l)

    return {
        "tokens": n_tokens,
        "selected": selected,
        "selected_pct": 100 * selected / n_tokens,
        "masked_of_selected_pct": 100 * masked / selected if selected else 0.0,
        "random_of_selected_pct": 100 * randomized / selected if selected else 0.0,
        "unchanged_of_selected_pct": 100 * unchanged / selected if selected else 0.0,
    }


def toy_predict(masked_inputs, vocab):
    """模拟掩码语言模型头（MLM head）：返回词表上的均匀分布。
    真正的 BERT 将各位置的编码器输出投影到词表空间。
    """
    V = len(vocab)
    return [[1.0 / V for _ in range(V)] for _ in masked_inputs]


def main():
    vocab_words = [
        "[MASK]", "[CLS]", "[SEP]",
        "the", "quick", "brown", "fox", "jumps", "over",
        "lazy", "dog", "a", "stitch", "in", "time",
        "saves", "nine", "sat", "on", "mat",
    ]
    vocab_size = len(vocab_words)
    id_of = {w: i for i, w in enumerate(vocab_words)}

    sentence = ["[CLS]", "the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "[SEP]"]
    tokens = [id_of[w] for w in sentence]
    rng = random.Random(42)
    inp, labels = create_mlm_batch(tokens, vocab_size, mask_prob=0.5, rng=rng)

    print("=== 掩码语言建模（MLM）演示（prob=0.5 便于观察；英文数据保持原样）===")
    print(f"{'索引（Idx）':>4}  {'单词（Word）':>9}  {'输入 ID':>9}  {'输入词（Input word）':>11}  {'标签（Label）':>6}")
    for i, (t_in, t_orig, lab) in enumerate(zip(inp, tokens, labels)):
        print(f"{i:>4}  {vocab_words[t_orig]:>9}  {t_in:>9}  {vocab_words[t_in]:>11}  {lab:>6}")

    print()
    print("=== 100k 个随机词元的 80/10/10 分布 ===")
    stats = distribution_check(n_tokens=100_000, vocab_size=vocab_size, mask_prob=0.15)
    print(f"选中比例：                   {stats['selected_pct']:.2f}%   （目标 15.0%）")
    print(f"  -> 替换为 [MASK]：  {stats['masked_of_selected_pct']:.2f}%   （目标 80.0%）")
    print(f"  -> 替换为随机词元：  {stats['random_of_selected_pct']:.2f}%   （目标 10.0%）")
    print(f"  -> 保持不变：        {stats['unchanged_of_selected_pct']:.2f}%   （目标 10.0%）")

    print()
    print("=== 全词掩码（Whole-word masking）演示 ===")
    # 为演示，将 "quick brown" 和 "lazy dog" 各视为包含两个子词的单词
    tokens2 = [id_of[w] for w in sentence]
    spans = [(0, 1), (1, 2), (2, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 10), (10, 11)]
    rng2 = random.Random(7)
    inp2, labels2 = whole_word_mlm(tokens2, spans, vocab_size, mask_prob=0.5, rng=rng2)
    print("片段（Spans）：        " + " ".join(f"[{s}:{e}]" for s, e in spans))
    print("输入单词：  " + " ".join(vocab_words[t] for t in inp2))
    print("标签掩码（Label mask）：   " + " ".join(("P" if l != IGNORE_INDEX else ".") for l in labels2))
    print("P = 此位置有标签，. = 忽略")


if __name__ == "__main__":
    main()
