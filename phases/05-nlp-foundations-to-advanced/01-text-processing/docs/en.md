# 文本处理：分词、词干提取与词形还原（Text Processing — Tokenization, Stemming, Lemmatization）

> 语言是连续的，模型处理的是离散数据。预处理（Preprocessing）连接了两者。

**Type:** Build
**Languages:** Python
**Prerequisites:** 阶段 2 · 14（朴素贝叶斯，Naive Bayes）
**Time:** ~45 分钟

## 问题（The Problem）

模型不能直接读懂“The cats were running.”，它读取的是整数。

每个自然语言处理（Natural Language Processing，NLP）系统都要先回答三个问题：一个词从哪里开始？它的词根是什么？如何在合并有益时将“run”“running”“ran”视为同一事物，而在不宜合并时保留区别？

分词（Tokenization）出错，模型就会从垃圾数据中学习。如果分词器（Tokenizer）把 `don't` 作为一个词元，却把 `do n't` 作为两个，训练分布就会分裂。如果词干提取器（Stemmer）把 `organization` 和 `organ` 归并到同一词干，主题建模（Topic modeling）就会失效。如果词形还原器（Lemmatizer）需要词性上下文而你未传入，动词就会被当作名词处理。

本课从零实现这三个预处理步骤，再展示 NLTK 和 spaCy 如何完成相同工作，让你理解其中的取舍。

## 概念（The Concept）

三种操作各有职责，也各有失效方式。

**分词（Tokenization）**将字符串拆分为词元（Token）。“词元”刻意不限定具体单位，因为合适的粒度取决于任务：传统 NLP 使用词级单位，Transformer 使用子词（Subword），没有空格分隔的语言使用字符。

**词干提取（Stemming）**按规则截去后缀。速度快、处理激进，但不理解语义。例如 `running -> run`、`organization -> organ`，第二个例子就是它的失效方式。

**词形还原（Lemmatization）**利用语法知识将词还原为词典形式。速度较慢，但准确，需要查找表或形态分析器（Morphological analyzer）。`ran -> run` 需要知道“ran”是“run”的过去式；`better -> good` 需要知道比较级形式。

经验法则：当速度重要且能容忍噪声时，使用词干提取，例如搜索索引、粗粒度分类；当语义重要时，使用词形还原，例如问答、语义搜索，以及任何用户会阅读的内容。

```figure
edit-distance
```

## 动手实现（Build It）

### 步骤 1：正则表达式词级分词器（A regex word tokenizer）

最简单的实用分词器按非字母数字字符拆分，同时将标点保留为独立词元。它并不完美，也不是最终版本，但一行就能运行。

```python
import re

def tokenize(text):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]", text)
```

三个模式按优先级排列：内部可含撇号的单词（`don't`、`it's`）；纯数字；任意单个非空白、非字母数字字符，作为独立词元（标点）。

```python
>>> tokenize("The cats weren't running at 3pm.")
['The', 'cats', "weren't", 'running', 'at', '3', 'pm', '.']
```

注意这些失效情况：`3pm` 会拆成 `['3', 'pm']`，因为我们分别匹配连续字母和连续数字。这对多数任务已经够用，但 URL、电子邮箱和话题标签都会被拆坏。用于生产时，应在通用模式之前加入专用模式。

### 步骤 2：Porter 词干提取器，仅实现步骤 1a（A Porter stemmer）

完整的 Porter 算法包含五个阶段的规则。仅步骤 1a 就覆盖了最常见的英语后缀，也足以展示实现模式。

```python
def stem_step_1a(word):
    if word.endswith("sses"):
        return word[:-2]
    if word.endswith("ies"):
        return word[:-2]
    if word.endswith("ss"):
        return word
    if word.endswith("s") and len(word) > 1:
        return word[:-1]
    return word
```

```python
>>> [stem_step_1a(w) for w in ["caresses", "ponies", "caress", "cats"]]
['caress', 'poni', 'caress', 'cat']
```

从上到下阅读规则。`ies -> i` 规则解释了为什么是 `ponies -> poni`，而不是 `pony`。完整 Porter 的步骤 1b 会修正这一点。规则之间存在竞争，先出现的规则优先，规则顺序比任何单条规则都更重要。

### 步骤 3：基于查表的词形还原器（A lookup-based lemmatizer）

完整的词形还原需要形态学（Morphology）。便于教学的版本可以使用一张小型词元原形表和回退规则。

```python
LEMMA_TABLE = {
    ("running", "VERB"): "run",
    ("ran", "VERB"): "run",
    ("runs", "VERB"): "run",
    ("better", "ADJ"): "good",
    ("best", "ADJ"): "good",
    ("cats", "NOUN"): "cat",
    ("cat", "NOUN"): "cat",
    ("were", "VERB"): "be",
    ("was", "VERB"): "be",
    ("is", "VERB"): "be",
}

def lemmatize(word, pos):
    key = (word.lower(), pos)
    if key in LEMMA_TABLE:
        return LEMMA_TABLE[key]
    if pos == "VERB" and word.endswith("ing"):
        return word[:-3]
    if pos == "NOUN" and word.endswith("s"):
        return word[:-1]
    return word.lower()
```

```python
>>> lemmatize("running", "VERB")
'run'
>>> lemmatize("cats", "NOUN")
'cat'
>>> lemmatize("better", "ADJ")
'good'
>>> lemmatize("watched", "VERB")
'watched'
```

最后一个例子是关键：`watched` 不在表中，而回退规则只处理 `ing`。真正的词形还原还要覆盖 `ed`、不规则动词、形容词比较级，以及伴随语音变化的复数（`children -> child`）。这就是生产系统使用 WordNet、spaCy 的形态标注器或完整形态分析器的原因。

### 步骤 4：串成流水线（Pipe them together）

```python
def preprocess(text, pos_tagger=None):
    tokens = tokenize(text)
    stems = [stem_step_1a(t.lower()) for t in tokens]
    tags = pos_tagger(tokens) if pos_tagger else [(t, "NOUN") for t in tokens]
    lemmas = [lemmatize(word, pos) for word, pos in tags]
    return {"tokens": tokens, "stems": stems, "lemmas": lemmas}
```

还缺少一个词性标注器（Part-of-speech tagger，POS tagger）。阶段 5 · 07（词性标注，POS Tagging）会实现它。目前先默认全部为 `NOUN`，并明确这一限制。

## 实际应用（Use It）

NLTK 和 spaCy 提供生产级版本，各用几行代码即可调用。

### NLTK

```python
import nltk
nltk.download("punkt_tab")
nltk.download("wordnet")
nltk.download("averaged_perceptron_tagger_eng")

from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk import pos_tag

text = "The cats were running."
tokens = word_tokenize(text)
stems = [PorterStemmer().stem(t) for t in tokens]
lemmatizer = WordNetLemmatizer()
tagged = pos_tag(tokens)


def nltk_pos_to_wordnet(tag):
    if tag.startswith("V"):
        return "v"
    if tag.startswith("J"):
        return "a"
    if tag.startswith("R"):
        return "r"
    return "n"


lemmas = [lemmatizer.lemmatize(t, nltk_pos_to_wordnet(tag)) for t, tag in tagged]
```

`word_tokenize` 处理缩约词、Unicode 和正则表达式漏掉的边界情况。`PorterStemmer` 执行全部五个阶段。`WordNetLemmatizer` 要求把词性标签从 NLTK 的 Penn Treebank 体系转换为 WordNet 的缩写集合。上面的标签转换衔接正是多数教程略过的部分。

### spaCy

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running.")

for token in doc:
    print(token.text, token.lemma_, token.pos_)
```

```
The      the     DET
cats     cat     NOUN
were     be      AUX
running  run     VERB
.        .       PUNCT
```

spaCy 将整条流水线封装在 `nlp(text)` 后面，分词、词性标注和词形还原都会执行。在大规模处理时比 NLTK 更快，开箱即用的准确性也更好，代价是单独替换组件不那么方便。

### 何时选择哪种工具（When to pick which）

| 场景 | 选择 |
|-----------|------|
| 教学、研究、替换组件 | NLTK |
| 生产、多语言、重视速度 | spaCy |
| Transformer 流水线（本来就会使用模型配套分词器） | 使用 `tokenizers` / `transformers`，跳过传统预处理 |

### 很少有人提醒的两种失效方式（The two failure modes nobody warns you about）

多数教程讲完算法就结束了。真实预处理流水线会遇到下面两个问题，但教程几乎不涉及。

**可复现性漂移（Reproducibility drift）。** NLTK 和 spaCy 不同版本的分词与词形还原行为会变化。在 spaCy 2.x 中产生 `['do', "n't"]` 的输入，到了 3.x 可能产生 `["don't"]`。模型在一种分布上训练，推理时却面对另一种分布，准确率悄然下降而原因不明。在 `requirements.txt` 中固定库版本；编写预处理回归测试，固定 20 个示例句子的预期分词结果，每次升级都运行。

**训练与推理不一致（Training / inference mismatch）。** 训练时采用激进预处理（转小写、移除停用词、词干提取），部署时却直接输入用户原始文本，性能就会骤降。这是生产 NLP 最常见的失效原因。训练时若做了预处理，推理时就必须执行同一个函数。应把预处理函数放进模型包一起交付，而不是留在笔记本单元格中，让服务团队重新实现。

## 交付成果（Ship It）

交付一个可复用提示词（Prompt），帮助工程师选择预处理策略，无须先读完三本教材。

保存为 `outputs/prompt-preprocessing-advisor.md`：

```markdown
---
name: preprocessing-advisor
description: 为 NLP 任务推荐分词（Tokenization）、词干提取（Stemming）和词形还原（Lemmatization）方案。
phase: 5
lesson: 01
---

你为传统 NLP 预处理提供建议。根据任务描述，输出：

1. 分词方案（正则表达式、NLTK word_tokenize、spaCy 或 Transformer 分词器），并解释原因。
2. 使用词干提取、词形还原、两者都用还是都不用，并解释原因。
3. 具体库调用，给出函数名。若涉及 NLTK，列出词性标签（POS tag）的转换方式。
4. 用户应测试的一种失效情况。

拒绝为用户可见文本推荐词干提取。拒绝推荐不带词性标签的词形还原。指出非英语输入需要另一条流水线。
```

## 练习（Exercises）

1. **简单。** 扩展 `tokenize`，使 URL 保留为单个词元。测试：`tokenize("Visit https://example.com today.")` 应产生一个 URL 词元。
2. **中等。** 实现 Porter 步骤 1b。若单词包含元音且以 `ed` 或 `ing` 结尾，移除该后缀。处理双辅音规则（`hopping -> hop`，而不是 `hopp`）。
3. **困难。** 构建词形还原器，使用 WordNet 查表，无对应词条时回退到你的 Porter 词干提取器。在带标注的语料库上测量准确率，并与单独使用 WordNet、单独使用 Porter 比较。

## 关键术语（Key Terms）

| 术语 | 常见说法 | 实际含义 |
|------|-----------------|-----------------------|
| 词元（Token） | 一个词 | 模型消耗的任意单位，可以是词、子词、字符或字节。 |
| 词干（Stem） | 词根 | 按规则剥离后缀得到的结果，不一定是真实单词。 |
| 词元原形（Lemma） | 词典形式 | 查词典时使用的形式，需要语法上下文才能正确计算。 |
| 词性标签（POS tag） | 词性 | NOUN、VERB、ADJ 等类别，准确还原词形所必需。 |
| 形态学（Morphology） | 单词形式规则 | 单词如何随时态、数和格改变形式；词形还原依赖它。 |

## 延伸阅读（Further Reading）

- [Porter, M. F.（1980）：后缀剥离算法（An algorithm for suffix stripping）](https://tartarus.org/martin/PorterStemmer/def.txt)：五页的原始论文，至今仍是最清楚的解释。
- [spaCy 入门：语言特征（Linguistic features）](https://spacy.io/usage/linguistic-features)：真实流水线如何衔接。
- [NLTK 教材第 3 章](https://www.nltk.org/book/ch03.html)：你还未想到的分词边界情况。
