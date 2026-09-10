"""从零实现字节对编码（BPE）分词器。

在一小段内置语料上学习字节级 BPE 词表，再对未参与训练的完整句子进行编码、
解码并打印结果。只依赖标准库。在课程目录运行：python3 code/main.py

译注：训练语料、待编码句子与特殊词元保留原文，避免改变词表、合并顺序和词元 ID。
目标词表大小是上限目标；没有可继续合并的高频词元对时，训练会提前停止。
演示中的“训练”只指小规模词元合并，不涉及大语言模型参数训练。
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Iterable


BYTE_ALPHABET_SIZE = 256
DEFAULT_SPECIALS = ("<|endoftext|>", "<|pad|>")
WORD_SPLIT_RE = re.compile(r"\S+|\s+")


@dataclass
class BPETokenizer:
    """字节级 BPE 分词器。

    前 256 个 ID 对应原始字节；其后的一小段 ID 留给特殊词元。
    通过学习获得的合并词元填充词表的其余部分。
    """

    vocab: dict[int, bytes] = field(default_factory=dict)
    inv_vocab: dict[bytes, int] = field(default_factory=dict)
    merges: dict[tuple[int, int], int] = field(default_factory=dict)
    special_to_id: dict[str, int] = field(default_factory=dict)
    id_to_special: dict[int, str] = field(default_factory=dict)

    @property
    def vocab_size(self) -> int:
        return len(self.vocab)

    def _add_token(self, token_bytes: bytes) -> int:
        if token_bytes in self.inv_vocab:
            return self.inv_vocab[token_bytes]
        token_id = len(self.vocab)
        self.vocab[token_id] = token_bytes
        self.inv_vocab[token_bytes] = token_id
        return token_id

    def initialize(self, specials: Iterable[str] = DEFAULT_SPECIALS) -> None:
        """建立字节字母表，并预留特殊词元的 ID。"""
        self.vocab.clear()
        self.inv_vocab.clear()
        self.merges.clear()
        self.special_to_id.clear()
        self.id_to_special.clear()
        for i in range(BYTE_ALPHABET_SIZE):
            self._add_token(bytes([i]))
        for s in specials:
            token_id = len(self.vocab)
            self.vocab[token_id] = s.encode("utf-8")
            self.inv_vocab[s.encode("utf-8")] = token_id
            self.special_to_id[s] = token_id
            self.id_to_special[token_id] = s


def _pretokenize(text: str) -> list[str]:
    """按连续空白字符和连续非空白字符对文本分块。

    每块是一个 BPE 训练单元，合并不会跨越块边界。
    连续空白字符独立成块并保留，使解码器可以通过拼接重建原始字符串。
    """
    return WORD_SPLIT_RE.findall(text)


def _word_to_byte_ids(word: str) -> list[int]:
    return list(word.encode("utf-8"))


def _count_pairs(corpus_units: dict[tuple[int, ...], int]) -> Counter:
    pairs: Counter = Counter()
    for symbols, count in corpus_units.items():
        for i in range(len(symbols) - 1):
            pairs[(symbols[i], symbols[i + 1])] += count
    return pairs


def _apply_merge(symbols: tuple[int, ...], pair: tuple[int, int], new_id: int) -> tuple[int, ...]:
    if len(symbols) < 2:
        return symbols
    out: list[int] = []
    i = 0
    a, b = pair
    while i < len(symbols):
        if i < len(symbols) - 1 and symbols[i] == a and symbols[i + 1] == b:
            out.append(new_id)
            i += 2
        else:
            out.append(symbols[i])
            i += 1
    return tuple(out)


def train(
    tokenizer: BPETokenizer,
    corpus: str,
    target_vocab_size: int,
    specials: Iterable[str] = DEFAULT_SPECIALS,
) -> None:
    """在 `corpus` 上学习 BPE 合并，直到达到目标词表大小或没有足够频繁的可合并词元对。

    给定语料后，训练循环具有确定性。多个词元对计数相同时，按词元对本身排序
    决定优先级，确保相同输入重复运行得到相同合并表。
    """
    tokenizer.initialize(specials)
    units = _build_initial_units(corpus)
    while tokenizer.vocab_size < target_vocab_size:
        pairs = _count_pairs(units)
        if not pairs:
            break
        max_count = max(pairs.values())
        candidates = sorted(p for p, c in pairs.items() if c == max_count)
        best = candidates[0]
        if pairs[best] < 2:
            break
        new_id = tokenizer._add_token(
            tokenizer.vocab[best[0]] + tokenizer.vocab[best[1]]
        )
        tokenizer.merges[best] = new_id
        units = _apply_merge_to_corpus(units, best, new_id)


def _build_initial_units(corpus: str) -> dict[tuple[int, ...], int]:
    chunks = _pretokenize(corpus)
    units: dict[tuple[int, ...], int] = {}
    for chunk in chunks:
        symbols = tuple(_word_to_byte_ids(chunk))
        units[symbols] = units.get(symbols, 0) + 1
    return units


def _apply_merge_to_corpus(
    units: dict[tuple[int, ...], int],
    pair: tuple[int, int],
    new_id: int,
) -> dict[tuple[int, ...], int]:
    new_units: dict[tuple[int, ...], int] = {}
    for symbols, count in units.items():
        merged = _apply_merge(symbols, pair, new_id)
        new_units[merged] = new_units.get(merged, 0) + count
    return new_units


def _encode_chunk(tokenizer: BPETokenizer, chunk: str) -> list[int]:
    symbols: list[int] = _word_to_byte_ids(chunk)
    if len(symbols) < 2:
        return symbols

    ranked_merges = {pair: rank for rank, pair in enumerate(tokenizer.merges.keys())}

    while True:
        best_rank = None
        best_index = -1
        best_pair: tuple[int, int] | None = None
        for i in range(len(symbols) - 1):
            pair = (symbols[i], symbols[i + 1])
            rank = ranked_merges.get(pair)
            if rank is None:
                continue
            if best_rank is None or rank < best_rank:
                best_rank = rank
                best_index = i
                best_pair = pair
        if best_pair is None:
            break
        new_id = tokenizer.merges[best_pair]
        symbols = symbols[:best_index] + [new_id] + symbols[best_index + 2:]
    return symbols


def encode(
    tokenizer: BPETokenizer,
    text: str,
    allow_special: bool = False,
) -> list[int]:
    """将 `text` 编码为词元 ID 列表。

    当 `allow_special` 为 True 时，输入中出现的特殊词元字面文本直接映射到
    预留 ID，不经过合并循环。
    """
    if not allow_special:
        return _encode_pretokenized(tokenizer, text)

    if not tokenizer.special_to_id:
        return _encode_pretokenized(tokenizer, text)

    specials_sorted = sorted(tokenizer.special_to_id.keys(), key=len, reverse=True)
    pattern = "(" + "|".join(re.escape(s) for s in specials_sorted) + ")"
    parts = re.split(pattern, text)

    out: list[int] = []
    for part in parts:
        if part == "":
            continue
        if part in tokenizer.special_to_id:
            out.append(tokenizer.special_to_id[part])
        else:
            out.extend(_encode_pretokenized(tokenizer, part))
    return out


def _encode_pretokenized(tokenizer: BPETokenizer, text: str) -> list[int]:
    out: list[int] = []
    for chunk in _pretokenize(text):
        out.extend(_encode_chunk(tokenizer, chunk))
    return out


def decode(tokenizer: BPETokenizer, ids: list[int]) -> str:
    """将 `ids` 解码为字符串；对可无损往返的输入，它是 `encode` 的逆操作。"""
    pieces: list[bytes] = []
    for token_id in ids:
        if token_id in tokenizer.id_to_special:
            pieces.append(tokenizer.id_to_special[token_id].encode("utf-8"))
            continue
        if token_id not in tokenizer.vocab:
            raise KeyError(f"unknown token id: {token_id}")
        pieces.append(tokenizer.vocab[token_id])
    return b"".join(pieces).decode("utf-8", errors="replace")


def save(tokenizer: BPETokenizer, path: str) -> None:
    """将分词器序列化到 JSON 文件。"""
    payload = {
        "vocab": {
            str(token_id): list(token_bytes)
            for token_id, token_bytes in tokenizer.vocab.items()
        },
        "merges": [
            [list(pair), new_id]
            for pair, new_id in tokenizer.merges.items()
        ],
        "specials": tokenizer.special_to_id,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def load(path: str) -> BPETokenizer:
    """恢复此前通过 `save` 保存的分词器。"""
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    tokenizer = BPETokenizer()
    for token_id_str, byte_list in payload["vocab"].items():
        token_id = int(token_id_str)
        token_bytes = bytes(byte_list)
        tokenizer.vocab[token_id] = token_bytes
        tokenizer.inv_vocab[token_bytes] = token_id
    for pair, new_id in payload["merges"]:
        tokenizer.merges[(pair[0], pair[1])] = new_id
    for s, token_id in payload["specials"].items():
        tokenizer.special_to_id[s] = token_id
        tokenizer.id_to_special[token_id] = s
    return tokenizer


DEMO_CORPUS = """\
the quick brown fox jumps over the lazy dog
a journey of a thousand miles begins with a single step
the only way to do great work is to love what you do
the best time to plant a tree was twenty years ago
the second best time is now
practice is the bridge between intention and skill
small daily actions compound into large outcomes
read more than you write, write more than you talk
the map is not the territory and the menu is not the meal
what gets measured gets managed if the measurement is honest
the quick brown fox runs across the meadow at dawn
a small step today is better than a perfect plan tomorrow
courage is not the absence of fear it is action despite fear
the lazy dog sleeps under the old oak tree
every expert was once a beginner who refused to quit
focus is saying no to a hundred good ideas
the river that you cannot cross today will be easier tomorrow
practice the basics until the basics become invisible
""" * 6


def _print_section(title: str) -> None:
    bar = "-" * len(title)
    print(f"\n{title}\n{bar}")


def _format_byte_token(token_bytes: bytes) -> str:
    try:
        return token_bytes.decode("utf-8").replace("\n", "\\n").replace(" ", "·")
    except UnicodeDecodeError:
        return token_bytes.hex()


def main() -> int:
    target = 320
    tokenizer = BPETokenizer()
    train(tokenizer, DEMO_CORPUS, target_vocab_size=target)

    _print_section("词表概览")
    print(f"目标词表大小      ：{target}")
    print(f"最终词表大小      ：{tokenizer.vocab_size}")
    print(f"已学习的合并数    ：{len(tokenizer.merges)}")
    print(f"特殊词元          ：{list(tokenizer.special_to_id)}")

    held_out = "the fox is quick and the dog is lazy"
    ids = encode(tokenizer, held_out)
    roundtrip = decode(tokenizer, ids)

    _print_section("编码未参与训练的完整句子")
    print(f"输入              ：{held_out!r}")
    print(f"编码后的 ID       ：{ids}")
    print(f"ID 数量           ：{len(ids)}（原始文本为 {len(held_out.encode('utf-8'))} 字节）")
    print(f"解码结果          ：{roundtrip!r}")
    assert roundtrip == held_out, "round trip must be lossless"

    _print_section("优先级最高的一组合并规则")
    for rank, (pair, new_id) in enumerate(list(tokenizer.merges.items())[:8]):
        left = _format_byte_token(tokenizer.vocab[pair[0]])
        right = _format_byte_token(tokenizer.vocab[pair[1]])
        merged = _format_byte_token(tokenizer.vocab[new_id])
        print(f"  合并优先级 {rank:>2}: ({left!s:>8}, {right!s:>8}) -> {merged}")

    _print_section("特殊词元处理")
    with_specials = "doc one<|endoftext|>doc two"
    ids_special = encode(tokenizer, with_specials, allow_special=True)
    assert tokenizer.special_to_id["<|endoftext|>"] in ids_special
    print(f"输入              ：{with_specials!r}")
    print(f"编码后的 ID       ：{ids_special}")
    print(f"解码结果          ：{decode(tokenizer, ids_special)!r}")

    print("\n演示通过。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
