# 从零构建分词器（Building a Tokenizer from Scratch）

> 第 01 课给你的是玩具，本课要给你的是实战工具。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 10，第 01 课（分词器：BPE、WordPiece、SentencePiece）
**Time:** ~90 分钟

## 学习目标（Learning Objectives）

- 构建生产级字节对编码（Byte Pair Encoding，BPE）分词器，处理 Unicode、空白规范化和特殊词元
- 实现字节级回退（Byte-level fallback），让分词器能够编码任何输入，包括表情符号、中日韩文字和代码，而不产生未知词元
- 加入预分词（Pre-tokenization）正则表达式模式，在应用 BPE 合并前按词边界拆分文本
- 在语料上训练自定义分词器，并在多语言文本上对比它与 tiktoken 的压缩比

## 问题（The Problem）

第 01 课的 BPE 分词器能处理英文文本。现在试试日文、表情符号，或者混合制表符和空格的 Python 代码。

它会出问题。

不是 BPE 错了，而是实现不完整。生产级分词器要处理任意编码的原始字节，在拆分前规范化 Unicode，管理永不参与合并的特殊词元（Special tokens），串联预分词与子词拆分，并且速度必须足够快，不能成为处理 15 万亿词元的训练流水线的瓶颈。

GPT-2 的分词器有 50,257 个词元，Llama 3 有 128,256 个，GPT-4 约有 100,000 个。这些不是玩具级数字。词表背后的合并表是在数百 GB 文本上训练出来的；而周边机制，包括规范化、预分词、特殊词元注入、聊天模板格式化，决定了分词器是只能处理 "hello world"，还是能处理整个互联网。

你将亲手构建这些机制。

## 概念（The Concept）

### 完整流水线（The Full Pipeline）

生产级分词器并非单一算法，而是由五个阶段组成的流水线，每个阶段解决一个不同的问题。

```mermaid
graph LR
    A[原始文本] --> B[规范化]
    B --> C[预分词]
    C --> D[BPE 合并]
    D --> E[特殊词元]
    E --> F[词元 ID]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style B fill:#1a1a2e,stroke:#e94560,color:#fff
    style C fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#1a1a2e,stroke:#e94560,color:#fff
    style E fill:#1a1a2e,stroke:#e94560,color:#fff
    style F fill:#1a1a2e,stroke:#e94560,color:#fff
```

每个阶段都有明确任务：

| 阶段 | 功能 | 重要性 |
|-------|-------------|----------------|
| 规范化（Normalize） | Unicode NFKC 规范化，可选转小写、去除重音 | "fi" 连字（U+FB01）变成 "fi" 两个字符。否则，同一个词会得到不同词元。 |
| 预分词（Pre-Tokenize） | 在 BPE 前将文本拆成块 | 防止 BPE 跨词边界合并。"the cat" 绝不应产生 "e c" 词元。 |
| BPE 合并（BPE Merge） | 将学到的合并规则应用于字节序列 | 核心压缩步骤，将原始字节变成子词词元。 |
| 特殊词元（Special Tokens） | 注入 [BOS]、[EOS]、[PAD] 和聊天模板标记 | 这些词元有固定 ID，永不参与 BPE 合并。模型靠它们识别结构。 |
| ID 映射（ID Mapping） | 将词元字符串转换为整数 ID | 模型看到的是整数，而不是字符串。 |

### 字节级 BPE（Byte-Level BPE）

第 01 课的分词器处理 UTF-8 字节，这个选择是对的。但我们跳过了一个重要问题：这些字节不是有效 UTF-8 时会怎样？

字节级 BPE 将每种可能的字节值（0-255）都视为有效词元，从而解决这个问题。基础词表恰好包含 256 项。任何文件，无论文本、二进制还是损坏文件，都可以分词而不产生未知词元。

GPT-2 加了一个技巧：把每个字节映射为可打印的 Unicode 字符，使词表保持人类可读。在它的映射中，字节 0x20（空格）变成字符 "G"。这纯粹是显示层面的处理，算法并不在意。

真正的优势在于，字节级 BPE 能处理世界上的每种语言。中文字符每个占 3 个 UTF-8 字节，日文可能占 3-4 个字节。阿拉伯文、天城文、表情符号都只是字节序列。BPE 在这些字节序列中发现模式的方式，与在英文 ASCII 字节中完全相同。

### 预分词（Pre-Tokenization）

在 BPE 处理文本前，需要先将文本拆成块，防止合并算法创建跨越词边界的词元。

GPT-2 使用正则表达式（Regular expression）模式拆分文本：

```
'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+
```

该模式拆分缩略形式（"don't" 变成 "don" + "'t"）、可带前导空格的单词、数字、标点和空白。前导空格保留在单词上，因此 "the cat" 变成 [" the", " cat"]，而不是 ["the", " ", "cat"]。

Llama 使用 SentencePiece，完全跳过正则表达式。它将原始字节流视为一个长序列，让 BPE 自己发现边界。这更简单，但也给了 BPE 更多创建跨词词元的自由。

这个选择很重要。GPT-2 的正则表达式会阻止分词器学到将一个词末尾的 "the" 与下一个词开头的 "the" 合并。SentencePiece 允许这种操作，有时压缩更高效，但词元更难解释。

### 特殊词元（Special Tokens）

所有生产级分词器都会为结构标记预留词元 ID：

| 词元 | 用途 | 使用模型 |
|-------|---------|---------|
| `[BOS]` / `<s>` | 序列起始 | Llama 3, GPT |
| `[EOS]` / `</s>` | 序列结束 | 所有模型 |
| `[PAD]` | 填充以对齐批次 | BERT, T5 |
| `[UNK]` | 未知词元，字节级 BPE 可消除它 | BERT, WordPiece |
| `<\|im_start\|>` | 聊天消息边界起始 | ChatGPT, Qwen |
| `<\|im_end\|>` | 聊天消息边界结束 | ChatGPT, Qwen |
| `<\|user\|>` | 用户轮次标记 | Llama 3 |
| `<\|assistant\|>` | 助手轮次标记 | Llama 3 |

特殊词元永远不会被 BPE 拆分。合并算法运行前，先精确匹配它们并替换成固定 ID，周围文本则正常分词。

### 聊天模板（Chat Templates）

这里是多数人感到困惑、多数实现出错的地方。

向聊天模型发送消息时，API 接收的是消息列表：

```
[
  {"role": "system", "content": "You are helpful."},
  {"role": "user", "content": "Hello"},
  {"role": "assistant", "content": "Hi there!"}
]
```

模型看到的不是 JSON，而是一个扁平词元序列。聊天模板（Chat template）使用特殊词元，将消息转换成这个扁平序列。每种模型的做法都不同：

```
Llama 3:
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are helpful.<|eot_id|><|start_header_id|>user<|end_header_id|>

Hello<|eot_id|><|start_header_id|>assistant<|end_header_id|>

Hi there!<|eot_id|>

ChatGPT:
<|im_start|>system
You are helpful.<|im_end|>
<|im_start|>user
Hello<|im_end|>
<|im_start|>assistant
Hi there!<|im_end|>
```

模板弄错，模型就会输出垃圾。它只在一种精确格式上训练过。任何偏差，少一个换行、换错一个词元、多一个空格，都会使输入偏离训练分布。

### 速度（Speed）

Python 对生产环境分词来说太慢。

OpenAI 的 tiktoken 用 Rust 编写并提供 Python 绑定，HuggingFace tokenizers 也使用 Rust，SentencePiece 使用 C++。相较纯 Python，它们可以提速 10-100 倍。

举例来说，为 Llama 3 预训练处理 15 万亿词元，若每秒处理 100 万词元，即较快的 Python 实现，需要 174 天；若每秒处理 1 亿词元，即 Rust 实现，则只需 1.7 天。

使用 Python 实现是为了理解算法。在生产环境中，应采用编译型实现，只操作其 Python 包装层。

```figure
weight-tying
```

## 动手实现（Build It）

### 步骤 1：字节级编码（Step 1: Byte-Level Encoding）

先打基础：把任意字符串转换为字节序列，将每个字节映射为可打印字符用于显示，再反向还原。

```python
def bytes_to_tokens(text):
    return list(text.encode("utf-8"))

def tokens_to_text(token_bytes):
    return bytes(token_bytes).decode("utf-8", errors="replace")
```

用多语言文本测试，查看字节数：

```python
texts = [
    ("English", "hello"),
    ("Chinese", "你好"),
    ("Emoji", "🔥"),
    ("Mixed", "hello你好🔥"),
]

for label, text in texts:
    b = bytes_to_tokens(text)
    print(f"{label}: {len(text)} chars -> {len(b)} bytes -> {b}")
```

"hello" 是 5 字节，"你好" 是 6 字节，每个字符 3 字节。火焰表情符号是 4 字节。字节级分词器不关心语言种类，字节就是字节。

### 步骤 2：正则表达式预分词器（Step 2: Pre-Tokenizer with Regex）

使用 GPT-2 的正则表达式模式把文本拆成块，每个块独立执行 BPE 分词。

```python
import re

try:
    import regex
    GPT2_PATTERN = regex.compile(
        r"""'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
    )
except ImportError:
    GPT2_PATTERN = re.compile(
        r"""'(?:[sdmt]|ll|ve|re)| ?[a-zA-Z]+| ?[0-9]+| ?[^\s\w]+|\s+(?!\S)|\s+"""
    )

def pre_tokenize(text):
    return [match.group() for match in GPT2_PATTERN.finditer(text)]
```

`regex` 模块支持 Unicode 属性转义，`\p{L}` 表示字母，`\p{N}` 表示数字。标准库 `re` 不支持，所以这里回退到 ASCII 字符类。生产级多语言分词器应安装 `regex`。

试一下：

```python
print(pre_tokenize("Hello, world! Don't stop."))
# [' Hello', ',', ' world', '!', " Don", "'t", ' stop', '.']
```

前导空格仍附在单词上，缩略形式在撇号处拆开，标点单独成块。BPE 永远不会跨越这些边界合并词元。

### 步骤 3：在字节序列上执行 BPE（Step 3: BPE on Byte Sequences）

核心算法来自第 01 课，但现在分别处理各个预分词块。

```python
from collections import Counter

def get_byte_pairs(chunks):
    pairs = Counter()
    for chunk in chunks:
        byte_seq = list(chunk.encode("utf-8"))
        for i in range(len(byte_seq) - 1):
            pairs[(byte_seq[i], byte_seq[i + 1])] += 1
    return pairs

def apply_merge(byte_seq, pair, new_id):
    merged = []
    i = 0
    while i < len(byte_seq):
        if i < len(byte_seq) - 1 and byte_seq[i] == pair[0] and byte_seq[i + 1] == pair[1]:
            merged.append(new_id)
            i += 2
        else:
            merged.append(byte_seq[i])
            i += 1
    return merged
```

### 步骤 4：处理特殊词元（Step 4: Special Token Handling）

特殊词元需要精确匹配和固定 ID，它们完全绕过 BPE。

```python
class SpecialTokenHandler:
    def __init__(self):
        self.special_tokens = {}
        self.pattern = None

    def add_token(self, token_str, token_id):
        self.special_tokens[token_str] = token_id
        escaped = [re.escape(t) for t in sorted(self.special_tokens.keys(), key=len, reverse=True)]
        self.pattern = re.compile("|".join(escaped))

    def split_with_specials(self, text):
        if not self.pattern:
            return [(text, False)]
        parts = []
        last_end = 0
        for match in self.pattern.finditer(text):
            if match.start() > last_end:
                parts.append((text[last_end:match.start()], False))
            parts.append((match.group(), True))
            last_end = match.end()
        if last_end < len(text):
            parts.append((text[last_end:], False))
        return parts
```

### 步骤 5：完整分词器类（Step 5: Full Tokenizer Class）

把所有步骤串起来：规范化、按特殊词元拆分、预分词、BPE 合并、映射为 ID。

```python
import unicodedata

class ProductionTokenizer:
    def __init__(self):
        self.merges = {}
        self.vocab = {i: bytes([i]) for i in range(256)}
        self.special_handler = SpecialTokenHandler()
        self.next_id = 256

    def normalize(self, text):
        return unicodedata.normalize("NFKC", text)

    def train(self, text, num_merges):
        text = self.normalize(text)
        chunks = pre_tokenize(text)
        chunk_bytes = [list(chunk.encode("utf-8")) for chunk in chunks]

        for i in range(num_merges):
            pairs = Counter()
            for seq in chunk_bytes:
                for j in range(len(seq) - 1):
                    pairs[(seq[j], seq[j + 1])] += 1
            if not pairs:
                break
            best = max(pairs, key=pairs.get)
            new_id = self.next_id
            self.next_id += 1
            self.merges[best] = new_id
            self.vocab[new_id] = self.vocab[best[0]] + self.vocab[best[1]]
            chunk_bytes = [apply_merge(seq, best, new_id) for seq in chunk_bytes]

    def add_special_token(self, token_str):
        token_id = self.next_id
        self.next_id += 1
        self.special_handler.add_token(token_str, token_id)
        self.vocab[token_id] = token_str.encode("utf-8")
        return token_id

    def encode(self, text):
        text = self.normalize(text)
        parts = self.special_handler.split_with_specials(text)
        all_ids = []
        for part_text, is_special in parts:
            if is_special:
                all_ids.append(self.special_handler.special_tokens[part_text])
            else:
                for chunk in pre_tokenize(part_text):
                    byte_seq = list(chunk.encode("utf-8"))
                    for pair, new_id in self.merges.items():
                        byte_seq = apply_merge(byte_seq, pair, new_id)
                    all_ids.extend(byte_seq)
        return all_ids

    def decode(self, ids):
        byte_parts = []
        for token_id in ids:
            if token_id in self.vocab:
                byte_parts.append(self.vocab[token_id])
        return b"".join(byte_parts).decode("utf-8", errors="replace")

    def vocab_size(self):
        return len(self.vocab)
```

### 步骤 6：多语言测试（Step 6: Multilingual Test）

真正的测试来了：让它处理英文、中文、表情符号和代码。

```python
corpus = (
    "The quick brown fox jumps over the lazy dog. "
    "The quick brown fox runs through the forest. "
    "Machine learning models process natural language. "
    "Deep learning transforms how we build software. "
    "def train(model, data): return model.fit(data) "
    "def predict(model, x): return model(x) "
)

tok = ProductionTokenizer()
tok.train(corpus, num_merges=50)

bos = tok.add_special_token("<|begin|>")
eos = tok.add_special_token("<|end|>")

test_texts = [
    "The quick brown fox.",
    "你好世界",
    "Hello 🌍 World",
    "def foo(x): return x + 1",
    f"<|begin|>Hello<|end|>",
]

for text in test_texts:
    ids = tok.encode(text)
    decoded = tok.decode(ids)
    print(f"Input:   {text}")
    print(f"Tokens:  {len(ids)} ids")
    print(f"Decoded: {decoded}")
    print()
```

中文字符每个产生 3 字节，表情符号产生 4 字节。它们都不会使分词器崩溃，也不会产生未知词元。这就是字节级 BPE 的能力。

## 实际应用（Use It）

### 比较真实分词器（Comparing Real Tokenizers）

加载 Llama 3、GPT-4 和 Mistral 的实际分词器，看看它们如何处理同一段多语言文本。

```python
import tiktoken

gpt4_enc = tiktoken.get_encoding("cl100k_base")

test_paragraph = "Machine learning is powerful. 机器学习很强大。 L'apprentissage automatique est puissant. 🤖💪"

tokens = gpt4_enc.encode(test_paragraph)
pieces = [gpt4_enc.decode([t]) for t in tokens]
print(f"GPT-4 ({len(tokens)} tokens): {pieces}")
```

```python
from transformers import AutoTokenizer

llama_tok = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")
mistral_tok = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-v0.1")

for name, tok in [("Llama 3", llama_tok), ("Mistral", mistral_tok)]:
    tokens = tok.encode(test_paragraph)
    pieces = tok.convert_ids_to_tokens(tokens)
    print(f"{name} ({len(tokens)} tokens): {pieces[:20]}...")
```

同一文本会得到不同词元数。拥有 128K 词表的 Llama 3 更充分地合并常见模式；100K 词表的 GPT-4 居中；32K 词表的 Mistral 会产生更多词元，但嵌入层更小。

权衡始终相同：更大的词表意味着更短的序列，但参数更多。

## 交付成果（Ship It）

本课产出一份用于构建和调试生产级分词器的提示词（Prompt），见 `outputs/prompt-tokenizer-builder.md`。

## 练习（Exercises）

1. **简单：** 添加 `get_token_bytes(id)` 方法，显示任意词元 ID 的原始字节。用它检查最常见的合并词元实际表示什么。
2. **中等：** 实现 Llama 风格的预分词器，按空白和数字拆分，但保留前导空格。在同一语料上，将其词表与 GPT-2 正则表达式方案比较。
3. **困难：** 添加聊天模板方法，接收 `{"role": ..., "content": ...}` 消息列表，生成符合 Llama 3 聊天格式的正确词元序列。与 HuggingFace 实现进行对照测试。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 字节级 BPE（Byte-level BPE） | “处理字节的分词器” | 基础词表包含 256 个字节值的 BPE，可处理任意输入而不产生未知词元 |
| 预分词（Pre-tokenization） | “在 BPE 前拆分” | 基于正则表达式或规则的拆分，防止 BPE 跨词边界合并 |
| NFKC 规范化（NFKC normalization） | “清理 Unicode” | 先规范分解再兼容合成，将 "fi" 连字变成 "fi"，将全角 "A" 变成 "A" |
| 聊天模板（Chat template） | “消息如何变成词元” | 将角色与内容消息列表转换为扁平词元序列的精确格式，各模型不同，且必须匹配训练格式 |
| 特殊词元（Special tokens） | “控制词元” | 绕过 BPE 的保留词元 ID，包括 [BOS]、[EOS]、[PAD] 和聊天标记，在合并前精确匹配 |
| 词元繁殖率（Fertility） | “每词词元数” | 输出词元数与输入词数之比；GPT-4 的英文为 1.3，韩文为 2-3，越高越浪费上下文 |
| tiktoken | “OpenAI 分词器” | 提供 Python 绑定的 Rust BPE 实现，比纯 Python 快 10-100 倍 |
| 合并表（Merge table） | “词表” | 训练学到的字节对合并有序列表，这就是分词器学到的知识 |

## 延伸阅读（Further Reading）

- [OpenAI tiktoken 源码](https://github.com/openai/tiktoken) -- GPT-3.5/4 使用的 Rust BPE 实现
- [HuggingFace tokenizers 分词器库](https://github.com/huggingface/tokenizers) -- 支持 BPE、WordPiece、Unigram 的 Rust 分词器库
- [Llama 3 论文（Meta，2024）](https://arxiv.org/abs/2407.21783) -- 128K 词表及分词器训练细节
- [SentencePiece 论文（Kudo 与 Richardson，2018）](https://arxiv.org/abs/1808.06226) -- 独立于语言的分词
- [GPT-2 分词器源码](https://github.com/openai/gpt-2/blob/master/src/encoder.py) -- 最初的字节到 Unicode 映射
